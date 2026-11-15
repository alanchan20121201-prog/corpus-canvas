/* AI client contract test against a local OpenAI-compatible mock server */
const http = require('http');
const assert = require('assert');
const ai = require('../electron/ai-client');

const requests = [];
const server = http.createServer((req, res) => {
  let raw = '';
  req.on('data', (c) => { raw += c; });
  req.on('end', () => {
    let body = {};
    try { body = JSON.parse(raw); } catch (e) { /* ignore */ }
    requests.push({ url: req.url, headers: req.headers, body });
    const mode = (body.messages && body.messages[0] && body.messages[0].content) || '';

    if (mode === 'auth') {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: { message: 'Incorrect API key provided' } }));
    }
    if (mode === 'rate') {
      res.writeHead(429, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: { message: 'Rate limit reached' } }));
    }
    if (mode === 'server') {
      res.writeHead(500, { 'Content-Type': 'text/html' });
      return res.end('<html><body>upstream exploded</body></html>');
    }
    if (mode === 'empty') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ choices: [{ message: { content: '' } }] }));
    }
    if (mode === 'slow') {
      setTimeout(() => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ choices: [{ message: { content: 'late' } }] }));
      }, 500);
      return;
    }
    if (mode === 'parts') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ choices: [{ message: { content: [{ type: 'text', text: 'a' }, { type: 'text', text: 'b' }] } }] }));
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      model: body.model,
      choices: [{ message: { role: 'assistant', content: '{"ok":true}' } }],
      usage: { prompt_tokens: 3, completion_tokens: 5, total_tokens: 8 }
    }));
  });
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const base = 'http://127.0.0.1:' + port + '/v1';
  const results = [];
  const run = async (name, fn) => {
    try { await fn(); results.push({ name, ok: true }); }
    catch (e) { results.push({ name, ok: false, error: String(e.message || e) }); }
  };

  await run('success', async () => {
    const r = await ai.chat({ baseUrl: base, apiKey: 'sk-test', model: 'm1', messages: [{ role: 'user', content: 'hi' }] });
    assert.strictEqual(r.ok, true);
    assert.strictEqual(r.content, '{"ok":true}');
    assert.strictEqual(r.usage.total_tokens, 8);
    const last = requests[requests.length - 1];
    assert.strictEqual(last.url, '/v1/chat/completions');
    assert.strictEqual(last.headers.authorization, 'Bearer sk-test');
    assert.strictEqual(last.body.stream, false);
    assert.strictEqual(last.body.model, 'm1');
  });

  await run('content-parts', async () => {
    const r = await ai.chat({ baseUrl: base, model: 'm1', messages: [{ role: 'user', content: 'parts' }] });
    assert.strictEqual(r.ok, true);
    assert.strictEqual(r.content, 'ab');
    const last = requests[requests.length - 1];
    assert.strictEqual(last.headers.authorization, undefined, 'no key must omit Authorization');
  });

  await run('auth-401', async () => {
    const r = await ai.chat({ baseUrl: base, apiKey: 'bad', model: 'm1', messages: [{ role: 'user', content: 'auth' }] });
    assert.strictEqual(r.ok, false);
    assert.strictEqual(r.code, 'auth');
    assert.match(r.error, /Incorrect API key/);
  });

  await run('rate-429', async () => {
    const r = await ai.chat({ baseUrl: base, apiKey: 'k', model: 'm1', messages: [{ role: 'user', content: 'rate' }] });
    assert.strictEqual(r.code, 'rate');
  });

  await run('server-500-html', async () => {
    const r = await ai.chat({ baseUrl: base, apiKey: 'k', model: 'm1', messages: [{ role: 'user', content: 'server' }] });
    assert.strictEqual(r.code, 'server');
    assert.ok(!/[<>]/.test(r.error), 'html should be stripped: ' + r.error);
  });

  await run('empty', async () => {
    const r = await ai.chat({ baseUrl: base, model: 'm1', messages: [{ role: 'user', content: 'empty' }] });
    assert.strictEqual(r.code, 'empty');
  });

  await run('timeout', async () => {
    const r = await ai.chat({ baseUrl: base, model: 'm1', messages: [{ role: 'user', content: 'slow' }], timeoutMs: 120 });
    assert.strictEqual(r.code, 'timeout');
    assert.ok(r.ms < 400);
  });

  await run('url-normalise', async () => {
    assert.strictEqual(ai.normalizeBase('https://api.openai.com/v1/'), 'https://api.openai.com/v1');
    assert.strictEqual(ai.normalizeBase('https://api.openai.com/v1/chat/completions'), 'https://api.openai.com/v1');
    assert.strictEqual(ai.normalizeBase('127.0.0.1:11434/v1'), 'http://127.0.0.1:11434/v1');
    const r = await ai.chat({ baseUrl: base + '/chat/completions', model: 'm1', messages: [{ role: 'user', content: 'hi' }] });
    assert.strictEqual(r.ok, true);
    assert.strictEqual(requests[requests.length - 1].url, '/v1/chat/completions');
  });

  await run('network-down', async () => {
    const r = await ai.chat({ baseUrl: 'http://127.0.0.1:1/v1', model: 'm1', messages: [{ role: 'user', content: 'hi' }] });
    assert.strictEqual(r.ok, false);
    assert.ok(['network', 'timeout'].includes(r.code), 'code=' + r.code);
  });

  await run('config', async () => {
    const r = await ai.chat({ baseUrl: '', model: '', messages: [] });
    assert.strictEqual(r.code, 'config');
  });

  server.close();
  const ok = results.every((r) => r.ok);
  console.log(JSON.stringify({ ok, results }, null, 2));
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
