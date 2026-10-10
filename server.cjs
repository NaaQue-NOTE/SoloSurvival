// 이 컴퓨터에서만 접속할 수 있는 정적 파일 서버. 외부 API는 사용하지 않습니다.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const {spawn}=require('node:child_process');
const url='http://127.0.0.1:8791/';
function openBrowser(){if(process.argv.includes('--open'))spawn('cmd.exe',['/c','start','',url],{windowsHide:true,stdio:'ignore'}).on('error',()=>console.log('브라우저에서 다음 주소를 열어 주세요: '+url));}
const allowed = {'/':'index.html','/index.html':'index.html','/style.css':'style.css','/events.js':'events.js','/engine.js':'engine.js','/app.js':'app.js'};
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript'};
const server=http.createServer((req,res)=>{
  const filename=allowed[new URL(req.url,'http://127.0.0.1').pathname];
  if(!filename){res.writeHead(404);res.end();return;}
  res.writeHead(200,{'Content-Type':`${mime[path.extname(filename)]}; charset=utf-8`,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Solo-Survival':'local-v1'});
  fs.createReadStream(path.join(__dirname,filename)).pipe(res);
});
server.on('error',error=>{
  if(error.code!=='EADDRINUSE'){console.error('게임을 시작하지 못했습니다: '+error.message);process.exitCode=1;return;}
  const req=http.get(url,res=>{res.resume();if(res.headers['x-solo-survival']==='local-v1'){console.log('이미 실행 중인 솔로 서바이벌을 엽니다.');openBrowser();}else{console.error('8791번 주소를 다른 프로그램에서 사용 중입니다. 해당 프로그램을 종료한 후 다시 실행해 주세요.');process.exitCode=1;}});
  req.setTimeout(3000,()=>req.destroy());req.on('error',()=>{console.error('실행 중인 프로그램을 확인하지 못했습니다. 잠시 후 다시 실행해 주세요.');process.exitCode=1;});
});
server.listen(8791,'127.0.0.1',()=>{console.log('솔로 서바이벌이 준비되었습니다. '+url);console.log('게임을 마친 뒤 이 창을 닫으면 로컬 서버가 종료됩니다.');openBrowser();});
