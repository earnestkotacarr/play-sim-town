// play-sim-town: a small gate in front of the local Ollama, so it can be tunnelled for the
// cloud deployment without opening the whole Ollama API to anyone who finds the URL.
//   - listens on 127.0.0.1 only (the tunnel connects to it locally)
//   - requires the header x-playsim-key = $PLAYSIM_GATE_KEY
//   - allows only POST to the three endpoints AI Town uses; no model pulls, deletes or listing
//   - caps request bodies at 1 MB and keeps a one-line log per request
// Run: PLAYSIM_GATE_KEY=... node tools/ollama-gate.mjs   (port 11435 -> Ollama 127.0.0.1:11434)
import http from 'node:http';
import { timingSafeEqual } from 'node:crypto';

const KEY = process.env.PLAYSIM_GATE_KEY ?? '';
const PORT = Number(process.env.PLAYSIM_GATE_PORT ?? 11435);
const UPSTREAM = { host: '127.0.0.1', port: 11434 };
const ALLOWED = new Set(['/v1/chat/completions', '/v1/embeddings', '/api/embeddings']);
const MAX_BODY = 1 << 20;
if (KEY.length < 24) {
  console.error('Set PLAYSIM_GATE_KEY (24+ characters).');
  process.exit(1);
}
const keyBuf = Buffer.from(KEY);
const okKey = (k) => {
  const b = Buffer.from(String(k ?? ''));
  return b.length === keyBuf.length && timingSafeEqual(b, keyBuf);
};

http
  .createServer((req, res) => {
    const path = (req.url ?? '').split('?')[0];
    const deny = (code, msg) => {
      console.log(new Date().toISOString(), code, req.method, path);
      res.writeHead(code, { 'content-type': 'text/plain' }).end(msg);
    };
    if (req.method !== 'POST' || !ALLOWED.has(path)) return deny(404, 'not found');
    if (!okKey(req.headers['x-playsim-key'])) return deny(401, 'unauthorized');
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        deny(413, 'too large');
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => {
      if (size > MAX_BODY) return;
      const up = http.request(
        { ...UPSTREAM, method: 'POST', path, headers: { 'content-type': 'application/json' } },
        (r) => {
          console.log(new Date().toISOString(), r.statusCode, 'POST', path);
          res.writeHead(r.statusCode ?? 502, { 'content-type': r.headers['content-type'] ?? 'application/json' });
          r.pipe(res);
        },
      );
      up.on('error', () => deny(502, 'ollama unavailable'));
      up.end(Buffer.concat(chunks));
    });
  })
  .listen(PORT, '127.0.0.1', () => console.log(`ollama-gate on 127.0.0.1:${PORT} -> 11434`));
