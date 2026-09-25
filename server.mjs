import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

// Local development only. A fixed upstream avoids browser CORS configuration.
export function makeServer(backend = 'http://127.0.0.1:8080') {
  const upstream = new URL(backend);
  if (!['http:', 'https:'].includes(upstream.protocol) || upstream.username || upstream.password) throw Error('Invalid BACKEND_URL');
  const files = {'/':'index.html', '/src/app.js':'src/app.js', '/src/api.js':'src/api.js', '/style.css':'style.css'};
  return createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const path = new URL(req.url, 'http://localhost').pathname;
    try {
      if (path.startsWith('/api/')) {
        if (!['GET','POST','PUT'].includes(req.method)) {res.writeHead(405).end(); return;}
        const chunks = []; let size = 0;
        for await (const chunk of req) {
          size += chunk.length;
          if (size > 65536) {res.writeHead(413).end(); return;}
          chunks.push(chunk);
        }
        const target = new URL(upstream.origin);
        target.pathname = path;
        target.search = new URL(req.url, 'http://localhost').search;
        const headers = {'Content-Type':'application/json'};
        const idempotencyKey = req.headers['idempotency-key'];
        if (typeof idempotencyKey === 'string') headers['Idempotency-Key'] = idempotencyKey;
        const result = await fetch(target, {method:req.method, redirect:'manual',
          headers,
          ...(chunks.length ? {body:Buffer.concat(chunks)} : {}), signal:AbortSignal.timeout(15000)});
        if (result.status >= 300 && result.status < 400) throw Error('Unexpected redirect');
        const body = Buffer.from(await result.arrayBuffer());
        res.writeHead(result.status, {'Content-Type':result.headers.get('content-type') || 'application/json'});
        res.end(body);
      } else if (files[path] && req.method === 'GET') {
        const type = path.endsWith('.js') ? 'text/javascript' : path.endsWith('.css') ? 'text/css' : 'text/html';
        const body = await readFile(new URL(files[path], import.meta.url));
        res.writeHead(200, {'Content-Type':type+'; charset=utf-8'});
        res.end(body);
      } else {res.writeHead(404).end();}
    } catch {
      if (!res.headersSent) res.writeHead(502, {'Content-Type':'application/json'});
      res.end(JSON.stringify({code:'BACKEND_UNAVAILABLE',message:'백엔드 서버 연결을 확인해 주세요.'}));
    }
  });
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 5173);
  makeServer(process.env.BACKEND_URL).listen(port, '127.0.0.1', () => console.log(`Frontend: http://127.0.0.1:${port}`));
}
