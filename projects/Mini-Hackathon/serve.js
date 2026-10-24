/* ShiftSwap demo server — serves this folder and proxies /paiflow/* to the
   Paiflow API. No dependencies. Run:  node serve.js  →  http://localhost:8787 */
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 8787;
const ROOT = __dirname;
const PAIFLOW_ORIGIN = 'https://beta.app.paiflow.xyz';
const DEPLOYMENT_ID = '134fa50b-3fa7-4108-94ca-472de041bce3';
const API_PREFIX = `/api/deployments/${DEPLOYMENT_ID}`;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type,accept');
}

function proxyToPaiflow(req, res, subPath) {
  const bodyChunks = [];
  req.on('data', c => bodyChunks.push(c));
  req.on('end', () => {
    const options = {
      method: req.method,
      headers: { 'Accept': 'application/json' },
    };
    const body = Buffer.concat(bodyChunks);
    if (body.length) options.headers['Content-Type'] = 'application/json';
    const upstream = https.request(
      PAIFLOW_ORIGIN + API_PREFIX + subPath + (req.url.split('?')[1] ? '?' + req.url.split('?')[1] : ''),
      options,
      up => {
        const chunks = [];
        up.on('data', c => chunks.push(c));
        up.on('end', () => {
          setCors(res);
          res.writeHead(up.statusCode, { 'Content-Type': up.headers['content-type'] || 'application/json' });
          res.end(Buffer.concat(chunks));
        });
      }
    );
    upstream.on('error', err => {
      setCors(res);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Paiflow upstream error: ' + err.message }));
    });
    if (body.length) upstream.write(body);
    upstream.end();
  });
}

http.createServer((req, res) => {
  // CORS preflight for the proxied API
  if (req.method === 'OPTIONS' && req.url.startsWith('/paiflow')) {
    setCors(res);
    res.writeHead(204);
    return res.end();
  }

  // Paiflow API proxy: /paiflow/trigger, /paiflow/submit-trigger, /paiflow/tx-status?...
  if (req.url.startsWith('/paiflow')) {
    const subPath = req.url.slice('/paiflow'.length).split('?')[0];
    return proxyToPaiflow(req, res, subPath);
  }

  // Static files
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/shiftswap-testnet.html';
  const filePath = path.join(ROOT, path.normalize(urlPath));
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, () => {
  console.log(`ShiftSwap demo → http://localhost:${PORT}/shiftswap-testnet.html`);
  console.log(`Paiflow proxy  → ${PAIFLOW_ORIGIN}${API_PREFIX}/*`);
});
