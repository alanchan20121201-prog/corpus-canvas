'use strict';

/**
 * OpenAI-compatible chat client, extracted so it can be tested without Electron.
 * fetchFn defaults to global fetch (Node 20+ / Electron main can pass net.fetch).
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

async function chat(opts) {
  const {
    baseUrl, apiKey, model, messages, temperature, maxTokens, timeoutMs, fetchFn
  } = opts || {};
  const started = Date.now();
  const base = normalizeBase(baseUrl);
  if (!base) return { ok: false, code: 'config', error: 'missing endpoint', ms: 0 };
  if (!model) return { ok: false, code: 'config', error: 'missing model', ms: 0 };

  const doFetch = fetchFn || globalThis.fetch;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs || 120000);
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers.Authorization = 'Bearer ' + apiKey;
    const body = {
      model,
      messages,
      temperature: typeof temperature === 'number' ? temperature : 0.2,
      stream: false
    };
    if (maxTokens) body.max_tokens = maxTokens;

    const resp = await doFetch(base + '/chat/completions', {
      method: 'POST', headers, body: JSON.stringify(body), signal: ctrl.signal
    });
    const text = await resp.text();
    let json = null;
    try { json = JSON.parse(text); } catch (e) { /* keep raw */ }

    if (!resp.ok) {
      return {
        ok: false, status: resp.status, code: classify(resp.status, text),
        error: errorText(json, text), ms: Date.now() - started
      };
    }
    const content = pickContent(json);
    if (!content) {
      return { ok: false, status: resp.status, code: 'empty', error: 'empty response', raw: text.slice(0, 600), ms: Date.now() - started };
    }
    return {
      ok: true, status: resp.status, content,
      usage: (json && json.usage) || null, model: (json && json.model) || model,
      ms: Date.now() - started
    };
  } catch (e) {
    const aborted = ctrl.signal.aborted;
    return {
      ok: false, code: aborted ? 'timeout' : 'network',
      error: aborted ? 'timeout after ' + (timeoutMs || 120000) + 'ms' : String((e && e.message) || e),
      ms: Date.now() - started
    };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { chat, normalizeBase, pickContent, classify };
