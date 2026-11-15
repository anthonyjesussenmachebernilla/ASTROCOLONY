(()=>{'use strict';
const TARGETS={
 solar:[
  {x:-2.52,y:1.65,z:-2.52,label:'AISLADOR PRINCIPAL'},
  {x:-.87,y:1.67,z:-2.54,label:'DIAGNÓSTICO SCAN'},
  {x:-1.99,y:3.20,z:-2.61,label:'SUPERFICIE SOLAR'},
  {x:-.15,y:.87,z:-2.54,label:'AJUSTE DE ÁNGULO'},
  {x:-.89,y:.95,z:-2.60,label:'BOTÓN DE PRUEBA'}
 ],
 regulator:[
  {x:-2.52,y:1.65,z:-2.52,label:'AISLADOR PRINCIPAL'},
  {x:-.87,y:1.67,z:-2.54,label:'DIAGNÓSTICO SCAN'},
  {x:-1.30,y:3.12,z:-2.64,label:'FUSIBLE F2'},
  {x:-2.50,y:.83,z:-2.60,label:'REPUESTO F2'},
  {x:-.89,y:.95,z:-2.60,label:'BOTÓN DE PRUEBA'}
 ]
};
const fusePoints=[[-2.43,3.12,-2.64],[-1.30,3.12,-2.64],[-.17,3.12,-2.64]];

let initialized=false,gl=null,canvas=null,prog=null,staticGeo=null,dynamicGeo=null;
let uVP=null,uEye=null,uTime=null,uRepair=null;
let rafId=0,running=false,mode='solar',step=0,cleanProgress=0,tilt=10,callbacks={};
let yaw=0,pitch=0,focus=0,focusTarget=.65,mouseDrag=false,cleaningDown=false,lastX=0,lastY=0,totalMove=0,brushDistance=0,lastFrame=0,animT=0;

const PI=Math.PI,TAU=2*PI;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),mix=(a,b,t)=>a+(b-a)*t;
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>{const n=Math.hypot(...a)||1;return a.map(v=>v/n)};
function rgb(s){s=s.replace('#','');return[parseInt(s.slice(0,2),16)/255,parseInt(s.slice(2,4),16)/255,parseInt(s.slice(4,6),16)/255]}

class Model{
 constructor(){this.v=[]}
 tri(a,b,c,color,em=0,metal=.4,rough=.5,na=null,nb=null,nc=null){
  const n=norm(cross(sub(b,a),sub(c,a)));
  this.vertex(a,na||n,color,em,metal,rough);
  this.vertex(b,nb||n,color,em,metal,rough);
  this.vertex(c,nc||n,color,em,metal,rough);
 }
 vertex(p,n,color,em,metal,rough){this.v.push(...p,...n,...rgb(color),em,metal,rough)}
 quad(a,b,c,d,col,em=0,met=.4,rou=.5){this.tri(a,b,c,col,em,met,rou);this.tri(a,c,d,col,em,met,rou)}
 box(cx,cy,cz,w,h,d,c='#647b7e',met=.6,rou=.5,em=0,ry=0){
  const a=[];
  for(const p of [[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]]){
   const x=p[0]*w/2,z=p[2]*d/2;
   a.push([cx+x*Math.cos(ry)+z*Math.sin(ry),cy+p[1]*h/2,cz-x*Math.sin(ry)+z*Math.cos(ry)]);
  }
  const face=[[0,1,2,3],[5,4,7,6],[4,0,3,7],[1,5,6,2],[3,2,6,7],[4,5,1,0]];
  face.forEach(f=>this.quad(a[f[0]],a[f[1]],a[f[2]],a[f[3]],c,em,met,rou));
 }
 cyl(a,b,r,color='#899ba0',side=14,metal=.5,rough=.4,em=0,r2=r){
  const v=norm(sub(b,a)),sideaxis=Math.abs(v[1])<.95?[0,1,0]:[1,0,0],u=norm(cross(v,sideaxis)),w=cross(v,u);
  const dir=t=>[u[0]*Math.cos(t)+w[0]*Math.sin(t),u[1]*Math.cos(t)+w[1]*Math.sin(t),u[2]*Math.cos(t)+w[2]*Math.sin(t)];
  for(let i=0;i<side;i++){
   const t=i*TAU/side,t2=(i+1)*TAU/side,d0=dir(t),d1=dir(t2);
   const p0=a.map((q,j)=>q+d0[j]*r),p1=a.map((q,j)=>q+d1[j]*r),p2=b.map((q,j)=>q+d1[j]*r2),p3=b.map((q,j)=>q+d0[j]*r2);
   this.tri(p0,p1,p2,color,em,metal,rough,d0,d1,d1);
   this.tri(p0,p2,p3,color,em,metal,rough,d0,d1,d0);
   this.tri(a,p1,p0,color,em,metal,rough);
   this.tri(b,p3,p2,color,em,metal,rough);
  }
 }
 sphere(x,y,z,rx,ry,rz,c='#727e81',met=.3,rou=.5,em=0,segs=12,rings=8){
  const pt=(t,a)=>[x+rx*Math.sin(t)*Math.cos(a),y+ry*Math.cos(t),z+rz*Math.sin(t)*Math.sin(a)];
  const nn=p=>norm([(p[0]-x)/rx,(p[1]-y)/ry,(p[2]-z)/rz]);
  for(let j=0;j<rings;j++){
   const t=j*PI/rings,t2=(j+1)*PI/rings;
   for(let i=0;i<segs;i++){
    const a=i*TAU/segs,a2=(i+1)*TAU/segs,p=pt(t,a),q=pt(t2,a),r=pt(t2,a2),s=pt(t,a2);
    this.tri(p,q,r,c,em,met,rou,nn(p),nn(q),nn(r));
    this.tri(p,r,s,c,em,met,rou,nn(p),nn(r),nn(s));
   }
  }
 }
 torus(cx,cy,cz,R,r,c='#97a0a0',met=.6,rou=.32,em=0,segs=32,sides=8){
  const pt=(a,t)=>[cx+(R+r*Math.cos(t))*Math.cos(a),cy+(R+r*Math.cos(t))*Math.sin(a),cz+r*Math.sin(t)];
  for(let i=0;i<segs;i++){
   const a=TAU*i/segs,aa=TAU*(i+1)/segs;
   for(let j=0;j<sides;j++){
    const t=TAU*j/sides,tt=TAU*(j+1)/sides;
    this.quad(pt(a,t),pt(aa,t),pt(aa,tt),pt(a,tt),c,em,met,rou);
   }
  }
 }
 upload(){
  const a=new Float32Array(this.v),vao=gl.createVertexArray(),buf=gl.createBuffer();
  gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,a,gl.STATIC_DRAW);
  for(let i=0;i<4;i++){gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,3,gl.FLOAT,false,48,i*12)}
  gl.bindVertexArray(null);
  return{vao,buf,count:a.length/12};
 }
}

function bolt(b,x,y,z,s=.055){b.cyl([x,y,z],[x,y,z+.04],s,'#a3acac',12,.8,.25);b.box(x,y,z+.047,s*.9,s*.16,.014,'#24323a',.9,.3)}
function panelFrame(b,x,y,z,w,h,c='#3e7278'){
 b.box(x,y,z,w,h,.29,'#0b252b',.68,.56);b.box(x,y,z+.145,w-.09,h-.09,.075,c,.5,.4);b.box(x,y,z+.193,w-.19,h-.19,.029,'#365b5f',.62,.47);
 for(const dx of [-w/2+.11,w/2-.11])for(const dy of [-h/2+.11,h/2-.11])bolt(b,x+dx,y+dy,z+.22,.039);
}

function buildStatic(){
 const world=new Model();let rseed=1;const rand=()=>((rseed=Math.imul(rseed,1664525)+1013904223|0)>>>0)/4294967296;
 world.box(0,1,-7.1,16,10,.3,'#263b41',.7,.6);world.box(-4.6,2.6,-4.9,2.8,7,.48,'#26373c',.65,.5);world.box(-1.18,-.6,-2.9,8,.95,4.9,'#2a383c',.75,.5);world.box(0,-.03,-5.9,12,.19,10,'#1a2b33',.61,.65);world.box(4.4,0,-4.9,1.6,4,1.4,'#35484d',.7,.56);world.box(-4.7,3,-3.5,.34,6,.55,'#9ba9a4',.7,.42);
 for(const zz of [-6,-4,-2,0])world.box(0,-.1,zz,11,.036,.05,'#557a7a',.53,.5);
 for(const xx of [-4,-2,0,2,4])world.box(xx,-.1,-4,.035,.03,9,'#547073',.4,.6);
 world.box(2.45,3.43,-6.95,5.9,3.5,.15,'#071015',.5,.7);
 world.sphere(5.55,4.15,-25,6.7,6.7,6.7,'#b66a4a',.12,.93,0,44,24);
 world.sphere(4.85,4.4,-19,.95,.95,.95,'#e0aa81',.2,.93,.01,24,14);
 for(let i=0;i<200;i++){const x=(rand()-.5)*85,y=rand()*30,z=-17-rand()*90;if(x>1&&x<8&&y>2&&y<6)world.sphere(x,y,z,.02+rand()*.035,.02,.02,'#d9edff',.01,.6,1.8,5,4)}
 for(const y of [1.7,5.15])world.box(2.4,y,-5.4,6.2,.22,.4,'#9ca5a3',.76,.37);
 for(const x of [-.6,2.3,5.35])world.box(x,3.43,-5.38,.20,3.75,.40,'#b4b5af',.72,.39);
 world.cyl([-.6,5.15,-5.1],[2.3,3.3,-5.15],.11,'#546e74',14,.79,.38);world.cyl([2.3,3.3,-5.15],[5.35,5.1,-5.13],.095,'#657d80',14,.79,.38);
 for(let i=0;i<8;i++)world.box(-.5+i*.88,5.39,-5.2,.24,.1,.12,i%3===0?'#d3ad69':'#51666c',.7,.46);
 panelFrame(world,-1.33,2.72,-3.24,4.0,3.5,'#35686e');world.box(-1.33,4.23,-2.976,3.83,.33,.05,'#75a3a3',.68,.35);world.box(-1.33,4.07,-2.94,3.58,.025,.028,'#162c34',.6,.43);
 world.box(-1.33,3.72,-2.92,3.52,.17,.065,'#172e34',.6,.45);world.box(-1.33,3.57,-2.93,3.42,.11,.055,'#9dafab',.64,.38);
 for(let i=0;i<7;i++)world.box(-2.85+i*.51,3.78,-2.9,.31,.055,.016,'#c6d0be',.5,.42);
 for(let i=0;i<3;i++){const x=-2.43+i*1.13;world.box(x,3.12,-2.95,.94,.89,.09,'#0b2930',.65,.5);world.box(x,3.12,-2.89,.82,.76,.035,'#315d65',.65,.41);world.box(x,3.44,-2.853,.55,.19,.03,'#e0b456',.3,.5,.08);world.cyl([x,2.92,-2.78],[x,3.26,-2.78],.115,i===1?'#b13b2a':'#b8c7b5',16,.55,.31);world.box(x,2.78,-2.839,.72,.075,.025,'#8c9b9a',.7,.34);for(const dx of [-.38,.38])bolt(world,x+dx,3.05,-2.825,.04)}
 world.box(-1.37,2.46,-2.955,3.52,.19,.04,'#102d35',.65,.38);world.box(-1.37,2.28,-2.92,3.52,.08,.022,'#86abad',.65,.36);
 panelFrame(world,-2.51,1.83,-2.925,1.37,1.13,'#3d5b61');panelFrame(world,-.93,1.83,-2.925,1.68,1.13,'#466e71');
 world.box(-2.51,1.98,-2.64,1.08,.22,.028,'#113139',.4,.4);world.box(-.92,1.98,-2.64,1.27,.23,.027,'#0d3036',.4,.4);
 for(const x of [-1.53,-1.28,-1.03,-.78,-.53]){world.box(x,1.75,-2.633,.15,.38,.07,'#193f45',.72,.36);world.box(x,1.85,-2.58,.1,.12,.03,'#55bec1',.2,.48,.7)}
 world.box(-2.50,.84,-2.93,1.44,.73,.15,'#253f44',.67,.47);world.box(-2.49,.85,-2.84,1.2,.55,.04,'#19313a',.5,.45);
 for(let i=0;i<5;i++)world.box(-2.93+i*.23,.85,-2.802,.14,.27,.06,'#526f70',.7,.35);
 world.box(-.9,.93,-2.92,1.7,.81,.15,'#253b41',.62,.4);world.box(-.9,.96,-2.82,1.48,.59,.05,'#142c32',.6,.34);
 for(let i=0;i<11;i++)world.box(-1.53+i*.11,.95,-2.773,.045,.09+(i%5)*.07,.03,i===4?'#df9e62':'#41a8a2',.34,.4,.6);
 panelFrame(world,2.19,1.94,-4.8,3,2.46,'#366b6d');world.box(2.12,2.37,-4.62,2.53,.84,.12,'#153941',.3,.49);world.box(2.12,2.37,-4.53,2.35,.65,.03,'#071a24',.5,.42,.11);
 for(let i=0;i<20;i++)world.box(1.03+(i%10)*.23,2.13+Math.floor(i/10)*.28,-4.485,.10,.035,.01,i%4===0?'#d0a265':'#4fc3b9',.3,.65,.75);
 for(let i=0;i<3;i++){const x=1.23+i*.98;world.box(x,1.34,-4.58,.76,.46,.04,'#1b4149',.61,.4);world.torus(x,1.34,-4.53,.17,.033,'#c1c6b4',.75,.32);world.box(x,1.3,-4.48,.18,.035,.03,'#ddbe8c',.52,.33)}
 for(const xx of [-3.1,-2.7,-.4,.7])world.cyl([xx,4.38,-3.26],[xx,5.32,-3.85],.065,'#a6b2a9',12,.7,.38);
 for(const [x,y] of [[-3.2,1.27],[-1.95,2.42],[-.3,2.35],[.56,1.1]]){world.cyl([x,y,-2.87],[x+.3,y-.28,-2.72],.08,'#213b43',12,.65,.55);world.cyl([x+.3,y-.28,-2.72],[x+.48,y-.34,-2.67],.075,'#6a8b90',12,.7,.34)}
 world.box(-1.35,.10,-1.8,5.2,.20,2.7,'#35484c',.78,.55);world.box(-1.35,.21,-1.04,5.4,.16,.12,'#9ba09b',.78,.41);
 for(let i=0;i<7;i++)world.box(-3.5+i*.68,.22,-1.8,.56,.02,.38,'#28383c',.67,.6);
 world.box(2.52,.28,-3.5,1.7,.56,1.0,'#405b64',.71,.47);world.box(2.52,.57,-3.48,1.25,.06,.54,'#88aaa4',.69,.39);
 for(let i=0;i<3;i++)world.sphere(1.94+i*.45,.65,-3.44,.10,.10,.10,i===0?'#e4b56c':'#4eb4b0',.5,.3,.55);
 for(let j=0;j<8;j++){world.box(-3.26+j*.12,2.49,-2.83,.055,.022,.014,'#799798',.75,.54);world.box(1.07+j*.20,2.87,-4.57,.085,.02,.025,'#607e80',.75,.47)}
 // Photovoltaic sample tiles & retaining rails (V2)
 for(let row=0;row<3;row++)for(let col=0;col<5;col++){
  const x=-2.87+col*.41,y=3.18+row*.19;
  world.box(x,y,-2.68,.38,.16,.025,'#0c3042',.34,.28);
  world.box(x,y,-2.651,.33,.12,.009,'#1b718a',.3,.22,.12);
  world.box(x,y,-2.636,.32,.013,.006,'#70bbd0',.2,.28,.6);
 }
 for(let i=0;i<6;i++)world.box(-2.91+i*.41,3.17,-2.62,.025,.79,.032,'#99a5a4',.7,.3);
 return world.upload();
}

function dynamicModel(t){
 const b=new Model();
 for(let i=0;i<9;i++)b.sphere(-2.82+i*.36,3.62,-2.82,.043,.043,.018,i<step*2?'#48ffc5':'#2b7183',.15,.3,i<step*2?2.8:.2,8,5);
 for(let i=0;i<3;i++)b.box(-2.43+i*1.13,3.44,-2.835,.30,.09,.019,i===1&&step>=2&&step<4?'#e86653':i===1&&step>=4?'#8afbd1':'#e2d582',.2,.36,1.0);
 const sw=step>0?-.32:.25;
 b.cyl([-2.51,1.58,-2.47],[-2.51+sw,1.92,-2.24],.105,'#a0a9a3',15,.8,.3);b.sphere(-2.51+sw,1.92,-2.22,.175,.15,.14,'#e1af52',.4,.3,0,18,12);b.sphere(-2.13,1.60,-2.51,.05,.05,.04,step>0?'#52ffd1':'#e25e3f',.1,.3,2,12,8);
 b.cyl([-.87,1.62,-2.44],[-.87,1.62,-2.36],.15,step>1?'#5fbdae':'#b7a366',18,.6,.3,step>1?1.3:.1);b.sphere(-.88,1.62,-2.33,.09,.09,.03,step>1?'#77e4d1':'#a6a694',.3,.3,step>1?.9:.1);
 if(step>=3){b.box(-1.30,3.08,-2.77,.32,.39,.03,'#09171e',.54,.6);b.box(-1.3,3.11,-2.70,.18,.15,.025,step>=4?'#70e6ca':'#d5774a',.3,.35,.8)}
 else{b.cyl([-1.30,2.93,-2.67],[-1.30,3.24,-2.67],.15,'#b74a36',16,.52,.31,.1);b.cyl([-1.30,3.06,-2.5],[-1.30,3.11,-2.48],.10,'#dba66d',14,.6,.33)}
 if(step>=4){b.cyl([-1.30,2.91,-2.51],[-1.30,3.24,-2.51],.148,'#bfd6bb',18,.55,.35);b.box(-1.30,3.43,-2.51,.35,.05,.06,'#4bffb7',.4,.3,1.3)}
 if(step<4){b.cyl([-2.66,.83,-2.63],[-2.36,.83,-2.62],.092,'#ced1bd',18,.6,.3);b.cyl([-2.67,.83,-2.60],[-2.60,.83,-2.6],.1,'#dba864',16,.72,.3);b.cyl([-2.40,.83,-2.60],[-2.34,.83,-2.6],.1,'#dba864',16,.72,.3)}
 b.cyl([-.92,.92,-2.62],[-.92,.92,-2.50],.17,step>=5?'#79ffbd':'#e8b36b',22,.55,.3,step>=5?2:.15);
 for(let i=0;i<8;i++)b.box(-1.57+i*.19,.52,-2.7,.10,.035,.045,step===5?'#54e3aa':i%2?'#356b70':'#b4825b',.65,.41,step===5?1:.15);
 b.box(2.12,2.42,-4.48,1.96,.06,.013,step===5?'#61dfb6':'#4cb5bb',.1,.38,1.3);
 for(let i=0;i<9;i++)b.box(1.32+i*.21,2.26,-4.475,.095,.06+(.035*Math.sin(t*1.5+i*1.14)+.035),.012,step===5?'#63e0b8':'#72bdb9',.15,.43,.8);
 for(let i=0;i<3;i++)b.sphere(1.1+i*.30,2.95,-4.44,.045,.045,.03,step>i*2?'#68f0bb':'#f1bc71',.2,.25,1.5,10,6);
 const angle=-.6+step*.25;b.cyl([3.05,1.33,-4.43],[3.05+Math.sin(angle)*.18,1.33+Math.cos(angle)*.18,-4.43],.028,'#e9aa72',12,.55,.4);
 const sh=Math.sin(t*1.1)*.018;
 b.cyl([2.15,-1.21,2.05],[1.25,-.56,1.14],.40,'#d26828',16,.22,.61);b.cyl([1.29,-.57,1.13],[.96,-.17,.62],.30,'#e97b32',16,.22,.55);b.cyl([1.69,-.92,1.53],[1.43,-.69,1.32],.42,'#879198',16,.68,.44);b.cyl([1.58,-.84,1.46],[1.52,-.79,1.38],.42,'#d5d1b6',16,.42,.53);b.sphere(.92,-.17,.60,.37,.32,.3,'#ef822f',.32,.5,0,18,12);
 for(let i=0;i<4;i++){const xx=.71+i*.14;b.cyl([xx,-.16,.56],[xx-.015,.08,.24],.07,'#e98b41',9,.26,.54);b.cyl([xx-.01,.04,.27],[xx-.02,.08,.18],.069,'#a8b4b7',9,.7,.38)}
 b.cyl([.75,-.23,.50],[.45,-.07,.24],.10,'#e58b44',12,.26,.54);
 for(let i=0;i<3;i++)b.box(1.20,-.4+i*.15,.83,.48,.048,.2,'#adb9b2',.68,.4);
 const toolShift=step===2?-.24:step===3?-.20:0;
 b.cyl([.98,-.11,.5],[.11+toolShift,.85+sh,-1.05],.105,'#b82832',20,.38,.35);
 b.cyl([.74,.12,.08],[.25+toolShift,.71,-.79],.14,'#ea3541',14,.48,.35);
 b.cyl([.11+toolShift,.85+sh,-1.05],[-.02+toolShift,1.14+sh,-1.44],.098,'#9baab1',16,.78,.25);
 b.cyl([-.02+toolShift,1.14+sh,-1.44],[-.30+toolShift,1.38+sh,-1.6],.13,'#9aa7b0',18,.83,.3);
 b.cyl([-.32+toolShift,1.4+sh,-1.63],[-.55+toolShift,1.43+sh,-1.66],.09,'#c3c8bc',14,.83,.25);
 b.cyl([-.31+toolShift,1.4+sh,-1.63],[-.39+toolShift,1.67+sh,-1.66],.12,'#b5c4c1',13,.76,.29);
 b.cyl([-2.63,-1.22,2.33],[-1.73,-.49,1.37],.40,'#c9662b',16,.22,.60);b.cyl([-1.73,-.48,1.38],[-1.60,-.09,.80],.26,'#ec7e33',16,.24,.54);b.sphere(-1.55,-.12,.67,.31,.28,.23,'#f08737',.23,.52,0,14,10);b.cyl([-1.62,-.04,.68],[-1.45,.49,-.10],.12,'#e97a31',12,.28,.54);
 for(let i=0;i<3;i++)b.cyl([-1.53+i*.13,-.11,.56],[-1.37+i*.13,.13,.27],.078,'#e98532',10,.25,.52);
 if(mode==='solar'){
  const remain=1-cleanProgress/100;
  for(let i=0;i<18;i++){
   const p=(i*7+3)%15,rr=Math.floor(p/5),cc=p%5;
   if(i/18<remain){
    const cx=-2.87+cc*.41,cy=3.18+rr*.19;
    b.box(cx,cy,-2.614,.22,.08,.009,'#a88761',.04,.91,.02);
   }
  }
  const x=-.15,y=.87,z=-2.54;
  b.cyl([x,y,z],[x+Math.sin(tilt*PI/180)*.30,y+Math.cos(tilt*PI/180)*.30,z+.04],.028,'#f4cb83',12,.7,.3);
 }
 return b.upload();
}

const mat=()=>new Float32Array(16);
const projection=mat(),view=mat(),vp=mat();
function perspective(out,fov,aspect,near,far){out.fill(0);const f=1/Math.tan(fov/2);out[0]=f/aspect;out[5]=f;out[10]=(far+near)/(near-far);out[11]=-1;out[14]=2*far*near/(near-far);return out}
function lookAt(out,eye,target){const z=norm(sub(eye,target)),x=norm(cross([0,1,0],z)),y=cross(z,x);out.set([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-x.reduce((a,b,i)=>a+b*eye[i],0),-y.reduce((a,b,i)=>a+b*eye[i],0),-z.reduce((a,b,i)=>a+b*eye[i],0),1]);return out}
function mul(o,a,b){const m=new Float32Array(16);for(let j=0;j<4;j++)for(let i=0;i<4;i++)m[j*4+i]=a[i]*b[j*4]+a[4+i]*b[j*4+1]+a[8+i]*b[j*4+2]+a[12+i]*b[j*4+3];o.set(m);return o}
function project(p){
 if(!canvas)return null;
 const x=p[0],y=p[1],z=p[2],w=vp[3]*x+vp[7]*y+vp[11]*z+vp[15];
 if(w<0.0001)return null;
 const sx=(vp[0]*x+vp[4]*y+vp[8]*z+vp[12])/w,sy=(vp[1]*x+vp[5]*y+vp[9]*z+vp[13])/w;
 return{x:(sx*.5+.5)*canvas.clientWidth,y:(.5-sy*.5)*canvas.clientHeight,visible:Math.abs(sx)<1.15&&Math.abs(sy)<1.15};
}
function del(g){if(g&&gl){gl.deleteBuffer(g.buf);gl.deleteVertexArray(g.vao)}}
function currentTarget(){return TARGETS[mode][Math.min(step,4)]}
function pointerDist(e){const t=currentTarget(),p=project([t.x,t.y,t.z]);return p?Math.hypot(p.x-e.clientX,p.y-e.clientY):999}

function ensureInit(){
 if(initialized)return !!gl;
 initialized=true;
 canvas=document.getElementById('maintGl');
 if(!canvas)return false;
 try{gl=canvas.getContext('webgl2',{antialias:true,alpha:false,powerPreference:'high-performance'})}catch{gl=null}
 if(!gl)return false;
 const vs=`#version 300 es
 precision highp float;layout(location=0)in vec3 aPos;layout(location=1)in vec3 aNormal;layout(location=2)in vec3 aColor;layout(location=3)in vec3 aExtra;uniform mat4 uVP;out vec3 vPos;out vec3 vNormal;out vec3 vColor;out vec3 vExtra;void main(){vPos=aPos;vNormal=aNormal;vColor=aColor;vExtra=aExtra;gl_Position=uVP*vec4(aPos,1.);}`;
 const fs=`#version 300 es
 precision highp float;in vec3 vPos;in vec3 vNormal;in vec3 vColor;in vec3 vExtra;uniform vec3 uEye;uniform float uTime;uniform float uRepair;out vec4 frag;
 float hash(vec3 p){return fract(sin(dot(p,vec3(12.9898,78.233,42.592)))*43758.5453);}
 float noise(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
 void main(){vec3 N=normalize(vNormal);if(!gl_FrontFacing)N=-N;vec3 V=normalize(uEye-vPos),l1=normalize(vec3(-.42,.76,.85)),l2=normalize(vec3(.91,.34,.27));float n1=max(dot(N,l1),0.),n2=max(dot(N,l2),0.);float amb=.22+max(N.y,0.)*.11;float m=clamp(vExtra.y,0.,1.),r=clamp(vExtra.z,.03,1.);float grain=noise(vPos*28.)*.13+noise(vPos*120.)*.06;float brush=sin(vPos.x*430.+sin(vPos.y*8.)*4.)*.018;float patina=noise(vPos*3.4)*.16;vec3 base=vColor*(.9+grain+brush-patina*(.1+m*.35));vec3 light=vec3(.58,.75,.82)*(amb+n1*.38)+vec3(1.12,.67,.39)*(n2*.53)+vec3(.27,.89,.98)*max(dot(N,normalize(vec3(-.7,.05,1.))),0.)*.30;vec3 H1=normalize(l1+V),H2=normalize(l2+V);float gloss=pow(max(dot(N,H1),0.),mix(9.,100.,1.-r))+pow(max(dot(N,H2),0.),mix(7.,70.,1.-r))*.7;vec3 spec=mix(vec3(.16),base*.62+.3,m)*gloss*(.4+m*1.8);float fres=pow(1.-max(dot(N,V),0.),3.);vec3 col=base*light+spec+vec3(.12,.36,.40)*fres*m*.38+base*vExtra.x*1.75;col=col/(col+vec3(.78));col=pow(col,vec3(.91));frag=vec4(col,1.);}`;
 const sh=(src,type)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s};
 prog=gl.createProgram();gl.attachShader(prog,sh(vs,gl.VERTEX_SHADER));gl.attachShader(prog,sh(fs,gl.FRAGMENT_SHADER));gl.linkProgram(prog);
 uVP=gl.getUniformLocation(prog,'uVP');uEye=gl.getUniformLocation(prog,'uEye');uTime=gl.getUniformLocation(prog,'uTime');uRepair=gl.getUniformLocation(prog,'uRepair');
 gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.clearColor(.015,.028,.045,1);
 staticGeo=buildStatic();
 canvas.addEventListener('pointerdown',e=>{
  mouseDrag=true;lastX=e.clientX;lastY=e.clientY;totalMove=0;
  cleaningDown=running&&mode==='solar'&&step===2&&pointerDist(e)<125;
  try{canvas.setPointerCapture?.(e.pointerId)}catch{}
 });
 canvas.addEventListener('pointermove',e=>{
  if(!mouseDrag)return;
  const dx=e.clientX-lastX,dy=e.clientY-lastY;totalMove+=Math.hypot(dx,dy);
  if(cleaningDown&&step===2){
   brushDistance+=Math.hypot(dx,dy);
   if(brushDistance>34){callbacks.onClean?.(Math.floor(brushDistance/34)*9);brushDistance%=34}
  }else{
   yaw=clamp(yaw+dx*.0025,-.27,.27);pitch=clamp(pitch+dy*.0019,-.16,.16);
  }
  lastX=e.clientX;lastY=e.clientY;
 });
 canvas.addEventListener('pointerup',e=>{
  mouseDrag=false;
  if(cleaningDown){cleaningDown=false;return}
  if(totalMove>14||!running||step>=5)return;
  if(mode==='regulator'&&step===2){
   let best=-1,dist=90;
   for(let i=0;i<3;i++){const p=project(fusePoints[i]);if(p){const d=Math.hypot(p.x-e.clientX,p.y-e.clientY);if(d<dist){dist=d;best=i}}}
   if(best>=0){callbacks.onChooseFuse?.(best);return}
  }
  if(pointerDist(e)<82)callbacks.onAct?.();
 });
 canvas.addEventListener('pointercancel',()=>{mouseDrag=false;cleaningDown=false});
 return true;
}

function resize(){
 if(!canvas||!gl)return;
 const dpr=Math.min(window.devicePixelRatio||1,1.35);
 const w=Math.max(1,Math.floor(canvas.clientWidth*dpr)),h=Math.max(1,Math.floor(canvas.clientHeight*dpr));
 if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h)}
}

function frame(now){
 if(!running)return;
 resize();
 const dt=Math.min(Math.max(0,(now-lastFrame)/1000),.05);lastFrame=now;animT+=dt;
 focus=mix(focus,focusTarget,Math.min(1,dt*3.5));
 const eye=[.30+yaw*3.4,1.83+pitch*2.8,5.75-focus*1.95],tar=[-.58+yaw*2.7,1.9+pitch*2.7,-3.1];
 perspective(projection,58*PI/180,(canvas.clientWidth||1)/(canvas.clientHeight||1),.1,180);
 lookAt(view,eye,tar);mul(vp,projection,view);
 gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
 gl.useProgram(prog);
 gl.uniformMatrix4fv(uVP,false,vp);gl.uniform3fv(uEye,eye);gl.uniform1f(uTime,animT);gl.uniform1f(uRepair,step/5);
 gl.bindVertexArray(staticGeo.vao);gl.drawArrays(gl.TRIANGLES,0,staticGeo.count);
 del(dynamicGeo);dynamicGeo=dynamicModel(animT);
 gl.bindVertexArray(dynamicGeo.vao);gl.drawArrays(gl.TRIANGLES,0,dynamicGeo.count);
 gl.bindVertexArray(null);
 const marker=document.getElementById('maintTarget'),txt=document.getElementById('maintTargetText');
 if(marker&&step<5){
  const t=currentTarget(),p=project([t.x,t.y,t.z]);
  if(txt)txt.textContent=t.label;
  marker.style.display=p&&p.visible?'block':'none';
  if(p){marker.style.left=p.x+'px';marker.style.top=p.y+'px'}
 }else if(marker)marker.style.display='none';
 rafId=requestAnimationFrame(frame);
}

window.HorizonteMaint3D={
 start(stationMode,initialStep,cbs){
  mode=stationMode==='regulator'?'regulator':'solar';
  step=initialStep||0;cleanProgress=0;tilt=10;brushDistance=0;callbacks=cbs||{};
  yaw=0;pitch=0;focus=0;focusTarget=.8;
  if(!ensureInit())return;
  running=true;lastFrame=performance.now();
  cancelAnimationFrame(rafId);rafId=requestAnimationFrame(frame);
 },
 setState(next){
  if(next.step!==undefined){step=next.step;focusTarget=step>=5?0:.85}
  if(next.cleanProgress!==undefined)cleanProgress=next.cleanProgress;
  if(next.tilt!==undefined)tilt=next.tilt;
  const txt=document.getElementById('maintTargetText');
  if(txt&&step<5)txt.textContent=currentTarget().label;
 },
 toggleFocus(){focusTarget=focusTarget>.65?0:1.2},
 stop(){
  running=false;cancelAnimationFrame(rafId);mouseDrag=false;cleaningDown=false;
  const marker=document.getElementById('maintTarget');
  if(marker)marker.style.display='none';
 }
};
})();
