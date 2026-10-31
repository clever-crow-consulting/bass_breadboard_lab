import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

export function createStaticServer(siteDir) {
  const resolvedRoot = path.resolve(siteDir);

  return http.createServer((req, res) => {
    const rawUrl = req.url || '/';
    let pathname;
    try {
      pathname = decodeURIComponent(rawUrl.split('?')[0]);
    } catch {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Bad Request');
      return;
    }

    if (pathname.includes('\0')) {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Bad Request');
      return;
    }

    const relTarget = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const candidate = path.resolve(resolvedRoot, relTarget);

    if (candidate !== resolvedRoot && !candidate.startsWith(resolvedRoot + path.sep)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Forbidden');
      return;
    }

    let finalPath = candidate;
    if (fs.existsSync(finalPath) && fs.statSync(finalPath).isDirectory()) {
      finalPath = path.join(finalPath, 'index.html');
    }

    if (fs.existsSync(finalPath) && fs.statSync(finalPath).isFile()) {
      const ext = path.extname(finalPath).toLowerCase();
      const mime = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, {
        'Content-Type': mime,
        'Cache-Control': 'no-cache'
      });
      fs.createReadStream(finalPath).pipe(res);
      return;
    }

    const notFoundPage = path.join(resolvedRoot, '404.html');
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    if (fs.existsSync(notFoundPage)) {
      fs.createReadStream(notFoundPage).pipe(res);
    } else {
      res.end('<!doctype html><title>404 Not Found</title><p>Not Found</p>');
    }
  });
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const port = Number(process.env.PORT || 8765);
  const host = process.env.HOST || '0.0.0.0';
  const siteDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'site');
  const server = createStaticServer(siteDir);
  server.listen(port, host, () => {
    console.log(`Bass Breadboard Lab listening on http://localhost:${port} (bound ${host}:${port})`);
  });
}
