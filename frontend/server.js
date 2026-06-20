const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const PUBLIC_DIR = __dirname;

const mime = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

function send404(res) {
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('404 Not Found');
}

const server = http.createServer((req, res) => {
  try {
    let reqPath = decodeURIComponent(req.url.split('?')[0]);
    if (reqPath === '/') reqPath = '/index.html';

    const filePath = path.join(PUBLIC_DIR, reqPath);
    if (!filePath.startsWith(PUBLIC_DIR)) return send404(res);

    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        // fallback to index.html for client-side routing
        const indexPath = path.join(PUBLIC_DIR, 'index.html');
        fs.readFile(indexPath, (err2, data) => {
          if (err2) return send404(res);
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(data);
        });
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const ct = mime[ext] || 'application/octet-stream';
      fs.createReadStream(filePath).pipe(res);
      res.setHeader('Content-Type', ct);
    });
  } catch (e) {
    send404(res);
  }
});

server.listen(PORT, () => {
  console.log(`Frontend server running at http://localhost:${PORT}`);
});
