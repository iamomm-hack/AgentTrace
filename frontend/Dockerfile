FROM node:24.22.0-bookworm-slim

WORKDIR /app
COPY . .

EXPOSE 3000

CMD ["node", "-e", "const fs=require('fs');const path=require('path');const http=require('http');const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.webp':'image/webp','.woff2':'font/woff2'};http.createServer((req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname;const file=pathname==='/'?'/index.html':pathname;if(file.includes('..')){res.statusCode=400;return res.end('Bad request');}const target=path.join(process.cwd(),file);try{res.setHeader('Content-Type',mime[path.extname(target)]||'application/octet-stream');res.end(fs.readFileSync(target));}catch{res.statusCode=404;res.end('Not found');}}).listen(3000,'0.0.0.0')"]
