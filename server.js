const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || '127.0.0.1';
const mimeTypes = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon'
};

const publicFiles = new Set(['index.html', 'manifest.json', 'sw.js']);
const publicDirectories = ['css', 'js', 'imagens', 'vendor'];
const developerToken = process.env.DEVELOPER_ACCESS_TOKEN || '';
const developerCookieName = 'mca_developer_session';

function isDeveloperRequest(req) {
  const authorization = req.headers.authorization || '';
  if (developerToken && authorization === `Bearer ${developerToken}`) return true;
  const cookie = req.headers.cookie || '';
  return developerToken && cookie.split(';').map(v => v.trim()).includes(`${developerCookieName}=1`);
}

function isPublicPath(requested) {
  if (publicFiles.has(requested)) return true;
  return publicDirectories.some(directory =>
    requested === directory || requested.startsWith(directory + '/')
  );
}

http.createServer((req, res) => {
  const pathnameInicial = req.url ? req.url.split('?')[0] : '';
  if (req.method === 'POST' && pathnameInicial === '/api/dev-session') {
    const authorization = req.headers.authorization || '';
    if (!developerToken || authorization !== `Bearer ${developerToken}`) {
      res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Forbidden' }));
      return;
    }
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Set-Cookie': `${developerCookieName}=1; Path=/; HttpOnly; SameSite=Strict`,
      'Cache-Control': 'no-store'
    });
    res.end(JSON.stringify({ role: 'developer' }));
    return;
  }
  if (req.url && req.url.split('?')[0] === '/api/curadoria' ||
      req.url && req.url.split('?')[0] === '/curadoria') {
    if (!isDeveloperRequest(req)) {
      res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(req.method === 'HEAD' ? '' : JSON.stringify({ error: 'Forbidden' }));
      return;
    }
    if (req.url.split('?')[0] === '/api/curadoria') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ role: 'developer', metrics: { authorized: true } }));
      return;
    }
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD', 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Method not allowed');
    return;
  }

  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, `http://${req.headers.host || host}`).pathname); }
  catch { res.writeHead(400); res.end('Bad request'); return; }
  if (pathname === '/curadoria' && isDeveloperRequest(req)) pathname = '/index.html';

  const requested = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '').replace(/\/+/g, '/');
  if (!isPublicPath(requested)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }

  const filePath = path.resolve(root, requested);
  if (!filePath.startsWith(root + path.sep)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  const normalizedPublicPath = path.relative(root, filePath).replace(/\\/g, '/');
  if (!isPublicPath(normalizedPublicPath)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  fs.stat(filePath, (statError, stat) => {
    if (statError || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'same-origin',
      'X-Frame-Options': 'DENY'
    });
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    fs.createReadStream(filePath).pipe(res);
  });
}).listen(port, host, () => {
  console.log(`Recife MCA disponível em http://${host}:${port}/`);
});
