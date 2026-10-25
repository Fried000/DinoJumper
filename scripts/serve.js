const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assets=['index.html','play.html','instructions.html','achievements.html','museum.html','museum.js','discovery.js','style.css','game.js','achievements-data.js','achievement-engine.js','achievements.js','home.js','rules.js'];
const files=Object.fromEntries(assets.map(file=>['/'+file,file]));
Object.assign(files,{'/':'index.html','/play':'play.html','/instructions':'instructions.html','/achievements':'achievements.html'});
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript' };
const port = Number(process.env.PORT) || 3000;
http.createServer((req, res) => {
  const file = files[new URL(req.url, 'http://localhost').pathname];
  if (!file) { res.writeHead(404); res.end('Not found'); return; }
  fs.readFile(path.join(__dirname, '..', file), (error, data) => {
    if (error) { res.writeHead(500); res.end('Unable to load game'); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)], 'Cache-Control': 'no-cache' });
    res.end(data);
  });
}).listen(port, '127.0.0.1', () => console.log(`Dino Jumper: http://localhost:${port}`));
