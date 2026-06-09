const http=require('http'),fs=require('fs'),path=require('path');
const ROOT='/Users/Ruben/Documents/GitHub/idiomas/ingles';
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css'};
http.createServer((req,res)=>{
  let p=decodeURIComponent(req.url.split('?')[0]);
  if(p==='/')p='/vocabulario.html';
  const fp=path.join(ROOT,p);
  fs.readFile(fp,(e,d)=>{
    if(e){res.writeHead(404);res.end('not found');return;}
    res.writeHead(200,{'Content-Type':types[path.extname(fp)]||'application/octet-stream'});
    res.end(d);
  });
}).listen(8765,()=>console.log('listening 8765'));
