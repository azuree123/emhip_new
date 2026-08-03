// Host-agnostic preview server for the built EMHIP Angular app.
//
// Mirrors client/nginx.conf so the SPA can be previewed on a single origin behind any
// hostname (e.g. a cloud port-preview URL) without CORS and without the Angular dev server's
// Host-header allowlist getting in the way:
//   - serves client/dist/client/browser with SPA fallback to index.html
//   - proxies /api/*  -> API  (the /api prefix is stripped, like nginx `proxy_pass .../`)
//   - proxies /hubs/* -> API  (prefix kept; WebSocket upgrade forwarded for SignalR)
//
// Uses only Node built-ins. Configure via env:
//   PORT        (default 8080)   port to listen on
//   API_HOST    (default 127.0.0.1)
//   API_PORT    (default 5299)
//   WWW_ROOT    (default ../client/dist/client/browser relative to this file)
const http = require('http');
const net = require('net');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = Number(process.env.PORT || 8080);
const API = { host: process.env.API_HOST || '127.0.0.1', port: Number(process.env.API_PORT || 5299) };
const ROOT = process.env.WWW_ROOT || path.resolve(__dirname, '..', 'client', 'dist', 'client', 'browser');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8', '.webp': 'image/webp',
};

function proxyHttp(clientReq, clientRes, targetPath) {
  const opts = {
    host: API.host, port: API.port, method: clientReq.method, path: targetPath,
    headers: { ...clientReq.headers, host: `${API.host}:${API.port}` },
  };
  const proxyReq = http.request(opts, (proxyRes) => {
    clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(clientRes);
  });
  proxyReq.on('error', (e) => {
    clientRes.writeHead(502, { 'Content-Type': 'text/plain' });
    clientRes.end('Bad gateway (API not reachable): ' + e.message);
  });
  clientReq.pipe(proxyReq);
}

function sendFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
}

function serveStatic(req, res) {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const filePath = path.join(ROOT, urlPath.replace(/^\/+/, ''));
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.stat(filePath, (err, st) => {
    if (!err && st.isFile()) return sendFile(res, filePath);
    return sendFile(res, path.join(ROOT, 'index.html')); // SPA fallback
  });
}

const server = http.createServer((req, res) => {
  if (req.url === '/api' || req.url.startsWith('/api/')) {
    return proxyHttp(req, res, req.url.replace(/^\/api/, '') || '/');
  }
  if (req.url.startsWith('/hubs/')) {
    return proxyHttp(req, res, req.url);
  }
  return serveStatic(req, res);
});

// WebSocket upgrade passthrough for SignalR (/hubs/*)
server.on('upgrade', (req, socket, head) => {
  if (!req.url.startsWith('/hubs/')) { socket.destroy(); return; }
  const upstream = net.connect(API.port, API.host, () => {
    const lines = [`${req.method} ${req.url} HTTP/1.1`];
    for (let i = 0; i < req.rawHeaders.length; i += 2) {
      let k = req.rawHeaders[i], v = req.rawHeaders[i + 1];
      if (k.toLowerCase() === 'host') v = `${API.host}:${API.port}`;
      lines.push(`${k}: ${v}`);
    }
    upstream.write(lines.join('\r\n') + '\r\n\r\n');
    if (head && head.length) upstream.write(head);
    socket.pipe(upstream);
    upstream.pipe(socket);
  });
  upstream.on('error', () => socket.destroy());
  socket.on('error', () => upstream.destroy());
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`EMHIP preview server on http://0.0.0.0:${PORT}  (root=${ROOT}, api->${API.host}:${API.port})`);
});
