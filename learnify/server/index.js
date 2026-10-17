import './env.js';
import express from 'express';
import { providers, chat } from './llm.js';
import { run, runnerFor, toolchains } from './runner.js';
import { generateCourse, regenerateSlide, fixCode, assistant } from './pipeline.js';
import * as kb from './knowledge.js';
import { build } from './exports.js';

const app = express();
app.use(express.json({ limit: '4mb' }));
// Code execution is only offered to the local machine unless ALLOW_REMOTE=1.
app.use((req, res, next) => {
  const ip = req.socket.remoteAddress ?? '';
  if (process.env.ALLOW_REMOTE !== '1' && !/^(::1|127\.|::ffff:127\.)/.test(ip)) return res.status(403).json({ error: 'Local access only (set ALLOW_REMOTE=1 to change).' });
  next();
});
const wrap = fn => (req, res) => Promise.resolve(fn(req, res)).catch(e => { console.error(e.message); res.status(500).json({ error: e.message }); });

app.get('/api/health', wrap(async (req, res) => {
  const out = { ok: true, providers: providers(), runners: toolchains(), knowledge: kb.stats() };
  if (req.query.probe) { try { const r = await chat({ messages: [{ role: 'user', content: 'Reply with the single word: ok' }], maxTokens: 8, timeoutMs: 20000 }); out.probe = { ok: true, provider: r.provider }; } catch (e) { out.probe = { ok: false, error: e.message.slice(0, 300) }; } }
  res.json(out);
}));

app.post('/api/run', wrap(async (req, res) => {
  const { language, code } = req.body ?? {};
  const r = runnerFor(language);
  if (!r) return res.json({ ok: false, unsupported: true, stderr: `No local runner for ${language}`, stdout: '', exitCode: -1, ms: 0 });
  res.json(await run(r, String(code ?? '')));
}));
app.post('/api/fix', wrap(async (req, res) => res.json(await fixCode(req.body))));
app.post('/api/slide/regenerate', wrap(async (req, res) => res.json(await regenerateSlide(req.body))));
app.post('/api/chat', wrap(async (req, res) => res.json(await assistant(req.body))));

// Server-sent events so the UI can show real progress while the model writes and the sandbox runs.
app.post('/api/generate', async (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  const ping = setInterval(() => res.write(': keep-alive\n\n'), 15000);
  try {
    const content = await generateCourse(req.body, p => send('progress', p));
    send('done', content);
  } catch (e) { console.error(e.message); send('error', { error: e.message }); }
  clearInterval(ping); res.end();
});

app.post('/api/export/:format', wrap(async (req, res) => {
  const { course, content, brand } = req.body ?? {};
  if (!content?.slides) return res.status(400).json({ error: 'No generated content for this course.' });
  const f = await build(req.params.format, course, content, brand);
  res.set({ 'Content-Type': f.type, 'Content-Disposition': `attachment; filename="${f.name}"`, 'Access-Control-Expose-Headers': 'Content-Disposition' }).send(f.data);
}));

app.get('/api/dataset', (req, res) => {
  res.set({ 'Content-Type': 'application/x-ndjson', 'Content-Disposition': `attachment; filename="learnify-${req.query.format ?? 'chat'}.jsonl"` }).send(kb.dataset({ format: req.query.format, onlyVerified: req.query.verified === '1' }));
});
app.get('/api/knowledge/stats', (req, res) => res.json(kb.stats()));
app.post('/api/ingest', wrap(async (req, res) => {
  const { title = 'Pasted material', language = '', text = '' } = req.body ?? {};
  if (String(text).trim().length < 40) return res.status(400).json({ error: 'Paste at least a few sentences or a code sample.' });
  const chunks = String(text).split(/\n{2,}/).reduce((a, p) => { const l = a[a.length - 1]; if (l && l.length + p.length < 1400) a[a.length - 1] = l + '\n\n' + p; else a.push(p); return a; }, []);
  const n = kb.add(chunks.map((c, i) => ({ kind: 'corpus', language, topic: title, title: `${title} (${i + 1}/${chunks.length})`, prompt: `Explain or reproduce the following material from "${title}".`, completion: c, verified: false, source: 'ingest' })), 'corpus');
  res.json({ added: n, stats: kb.stats() });
}));

const port = +process.env.PORT || 8787;
app.listen(port, '127.0.0.1', () => {
  console.log(`LearnifyAI API on http://127.0.0.1:${port}`);
  console.log(`  providers: ${providers().join(', ') || 'NONE (add keys to server/.env)'}`);
  console.log(`  runners:   ${Object.entries(toolchains()).map(([k, v]) => `${k}:${v ? 'yes' : 'no'}`).join(' ')}`);
  console.log(`  knowledge: ${JSON.stringify(kb.stats())}`);
});
