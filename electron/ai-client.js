'use strict';

/**
 * OpenAI-compatible chat client, extracted so it can be tested without Electron.
 * fetchFn defaults to global fetch (Node 20+ / Electron main can pass net.fetch).
 *
 * Two modes:
 *   - buffered (default): one JSON response, tested by ai-test.js
 *   - stream: true: SSE deltas are handed to onDelta as they arrive, and the
 *     final concatenated content is returned with the same shape as buffered.
 * An external AbortSignal (opts.signal) cancels both modes.
 */

function normalizeBase(base) {
  let b = String(base || '').trim();
  if (!b) return '';
  if (!/^https?:\/\//i.test(b)) b = /^(localhost|127\.0\.0\.1|\[::1\])/i.test(b) ? 'http://' + b : 'https://' + b;
  b = b.replace(/\/+$/, '');
  b = b.replace(/\/chat\/completions$/i, '');
  return b;
}

function pickContent(json) {
  const msg = json && json.choices && json.choices[0] && json.choices[0].message;
  if (!msg) return '';
  const c = msg.content;
  if (Array.isArray(c)) {
    return c.map((p) => (typeof p === 'string' ? p : (p && (p.text || p.content)) || '')).join('');
  }
  return c == null ? '' : String(c);
}

function classify(status, text) {
  if (status === 401 || status === 403) return 'auth';
  if (status === 404) return 'endpoint';
  if (status === 429) return 'rate';
  if (status >= 500) return 'server';
  if (status === 400 || status === 422) return 'request';
  if (!status && /abort|timeout|timed out/i.test(text || '')) return 'timeout';
  if (!status) return 'network';
  return 'http';
}

function errorText(json, text) {
  let msg = '';
  if (json && json.error) {
    msg = typeof json.error === 'string' ? json.error : (json.error.message || JSON.stringify(json.error));
  }
  if (!msg) msg = String(text || '').slice(0, 600);
  return msg.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/* Yield text chunks from either a WHATWG ReadableStream (Electron net.fetch)
   or a Node Readable (Node global fetch / test servers). */
async function* bodyChunks(resp) {
  const b = resp.body;
  if (!b) return;
  if (typeof b.getReader === 'function') {
    const reader = b.getReader();
    const dec = new TextDecoder();
    try {
      for (;;) {
        const r = await reader.read();
        if (r.done) break;
        if (!r.value) continue;
        yield typeof r.value === 'string' ? r.value : dec.decode(r.value, { stream: true });
      }
    } finally {
      try { reader.releaseLock(); } catch (e) { /* ignore */ }
    }
    return;
  }
  if (typeof b[Symbol.asyncIterator] === 'function') {
    for await (const chunk of b) {
      yield typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8');
    }
    return;
  }
  yield await resp.text();
}

/* Parse an SSE chat-completions stream. Returns {content, usage}. */
async function readSSE(resp, onDelta) {
  let content = '';
  let usage = null;
  let buf = '';
  let finished = false;
  for await (const chunk of bodyChunks(resp)) {
    buf += chunk;
    let nl;
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).replace(/\r$/, '');
      buf = buf.slice(nl + 1);
      if (!line || line.charAt(0) === ':') continue;
      if (line.slice(0, 5) !== 'data:') continue;
      const data = line.slice(5).trim();
      if (data === '[DONE]') { finished = true; break; }
      let json;
      try { json = JSON.parse(data); } catch (e) { continue; }
      if (json && json.usage) usage = json.usage;
      const choice = json && json.choices && json.choices[0];
      const delta = choice && choice.delta && choice.delta.content;
      if (delta) {
        const piece = Array.isArray(delta)
          ? delta.map((p) => (typeof p === 'string' ? p : (p && (p.text || p.content)) || '')).join('')
          : String(delta);
        if (piece) {
          content += piece;
          if (onDelta) onDelta(piece);
        }
      }
    }
    if (finished) break;
  }
  return { content, usage };
}

async function chat(opts) {
  const {
    baseUrl, apiKey, model, messages, temperature, maxTokens, timeoutMs, fetchFn,
    stream, onDelta, signal
  } = opts || {};
  const started = Date.now();
  const base = normalizeBase(baseUrl);
  if (!base) return { ok: false, code: 'config', error: 'missing endpoint', ms: 0 };
  if (!model) return { ok: false, code: 'config', error: 'missing model', ms: 0 };

  const doFetch = fetchFn || globalThis.fetch;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs || 120000);
  let externalAbort = false;
  const onExternalAbort = () => { externalAbort = true; ctrl.abort(); };
  if (signal) {
    if (signal.aborted) { externalAbort = true; ctrl.abort(); }
    else signal.addEventListener('abort', onExternalAbort, { once: true });
  }

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers.Authorization = 'Bearer ' + apiKey;
    if (stream) headers.Accept = 'text/event-stream';
    const body = {
      model,
      messages,
      temperature: typeof temperature === 'number' ? temperature : 0.2,
      stream: !!stream
    };
    if (stream) body.stream_options = { include_usage: true };
    if (maxTokens) body.max_tokens = maxTokens;

    const resp = await doFetch(base + '/chat/completions', {
      method: 'POST', headers, body: JSON.stringify(body), signal: ctrl.signal
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      let json = null;
      try { json = JSON.parse(text); } catch (e) { /* keep raw */ }
      return {
        ok: false, status: resp.status, code: classify(resp.status, text),
        error: errorText(json, text), ms: Date.now() - started
      };
    }

    if (!stream) {
      const text = await resp.text();
      let json = null;
      try { json = JSON.parse(text); } catch (e) { /* keep raw */ }
      const content = pickContent(json);
      if (!content) {
        return { ok: false, status: resp.status, code: 'empty', error: 'empty response', raw: text.slice(0, 600), ms: Date.now() - started };
      }
      return {
        ok: true, status: resp.status, content,
        usage: (json && json.usage) || null, model: (json && json.model) || model,
        ms: Date.now() - started
      };
    }

    const out = await readSSE(resp, onDelta);
    if (!out.content) {
      return { ok: false, status: resp.status, code: 'empty', error: 'empty stream', ms: Date.now() - started };
    }
    return {
      ok: true, status: resp.status, content: out.content,
      usage: out.usage, model: model, streamed: true,
      ms: Date.now() - started
    };
  } catch (e) {
    const code = externalAbort ? 'aborted' : (ctrl.signal.aborted ? 'timeout' : 'network');
    const error = code === 'aborted' ? 'cancelled by user'
      : code === 'timeout' ? 'timeout after ' + (timeoutMs || 120000) + 'ms'
        : String((e && e.message) || e);
    return { ok: false, code, error, ms: Date.now() - started };
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener('abort', onExternalAbort);
  }
}

module.exports = { chat, normalizeBase, pickContent, classify, readSSE };
