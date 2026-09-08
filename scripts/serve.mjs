import http from 'node:http';
import {readFile, stat, mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '../site');
const port = Number(process.env.PORT || 4192);
const types = {'.html':'text/html', '.js':'text/javascript', '.mjs':'text/javascript', '.css':'text/css', '.json':'application/json', '.glb':'model/gltf-binary', '.png':'image/png', '.svg':'image/svg+xml'};
http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/__responsive') { res.writeHead(200, {'Content-Type':'text/html'});res.end(await readFile(path.resolve(import.meta.dirname,'responsive-check.html')));return; }
    if (url.pathname === '/__checks.js') { res.writeHead(200, {'Content-Type':'text/javascript'});res.end(await readFile(path.resolve(import.meta.dirname,'publication-check.js')));return; }
    if (req.method === 'POST' && url.pathname === '/__report') {
      let text = ''; for await (const chunk of req) { text += chunk; if (text.length > 1000000) throw new Error('Report too large'); }
      await mkdir(path.resolve(import.meta.dirname, '../.local-reports'), {recursive:true});
      await writeFile(path.resolve(import.meta.dirname, '../.local-reports/latest.json'), text);
      res.writeHead(204); res.end(); return;
    }
    if (!['GET','HEAD'].includes(req.method)) {res.writeHead(405);res.end();return;}
    if (url.pathname === '/') {res.writeHead(302, {Location:'/fantasy-studio/' + url.search});res.end();return;}
    let file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
    if (!file.startsWith(root + path.sep)) throw new Error('Invalid path');
    if ((await stat(file)).isDirectory()) file = path.join(file,'index.html');
    const body = await readFile(file);res.writeHead(200, {'Content-Type': types[path.extname(file)] || 'text/plain','Cache-Control':'no-cache'});res.end(req.method === 'HEAD' ? undefined : body);
  } catch {res.writeHead(404);res.end('Not found');}
}).listen(port, '127.0.0.1', () => console.log(`Game assets: http://127.0.0.1:${port}/`));
