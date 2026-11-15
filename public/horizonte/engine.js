/* HORIZONTE: lightweight original WebGL 3D engine, no external libraries. */
(() => {
'use strict';
const TAU = Math.PI * 2;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const mix=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,t)=>{t=clamp((t-a)/(b-a),0,1);return t*t*(3-2*t)};
const c3=(hex)=>{const v=parseInt(hex.replace('#',''),16);return [(v>>16&255)/255,(v>>8&255)/255,(v&255)/255]};
const rng=(seed)=>()=>((seed=Math.imul(seed,1664525)+1013904223|0)>>>0)/4294967296;
const rand=rng(470122);
const rocks=[];
const patrols=[
 {x:-10,z:14,route:[[-10,14],[-13,11],[-12,8],[-8,10]],target:1,speed:1.15,yaw:0,walk:0,moving:false,cargo:'plant'},
 {x:7,z:17,route:[[7,17],[9,14],[8,10],[5,13]],target:1,speed:1.35,yaw:0,walk:0,moving:false,cargo:'crate'},
 {x:3,z:9,route:[[3,9],[6,9],[6,15],[3,15]],target:1,speed:1.05,yaw:0,walk:0,moving:false,cargo:'lamp'},
];
const solidBoxes=[
 // Hábitat, anexo y compresor de oxígeno.
 {x:0,z:-28,w:6.5,d:10.5},{x:-7,z:-29,w:2.5,d:4},{x:-16,z:-28,w:3.5,d:2.5},
 // Consolas y equipo de la misión; se puede interactuar desde el exterior.
 {x:-18,z:9,w:1.25,d:.8},{x:-6,z:-10.3,w:1.8,d:1.05},{x:5,z:-10,w:1.6,d:1.1},
 // Paneles solares, cajas de servicio y antena.
 ...Array.from({length:3},(_,row)=>Array.from({length:4},(_,col)=>({x:-35+col*5.3,z:-17+row*5.9,w:2.35,d:1.5}))).flat(),
 ...[-11,10,14].flatMap(x=>[-33,-7,1].map(z=>({x,z,w:.9,d:.95}))),
 {x:11,z:-36,w:2,d:2},{x:-29,z:-34,w:.55,d:.55},
];
const solidCircles=[{x:22,z:-25,r:8.2}];
function staticBlocked(x,z,r=.55){
 for(const b of solidBoxes)if(Math.abs(x-b.x)<b.w+r&&Math.abs(z-b.z)<b.d+r)return true;
 for(const c of solidCircles)if(Math.hypot(x-c.x,z-c.z)<c.r+r)return true;
 for(const c of rocks)if(Math.hypot(x-c.x,z-c.z)<c.r+r)return true;
 return false;
}
function blocked(x,z,r=.55,ignorePatrol=-1){
 if(staticBlocked(x,z,r))return true;
 for(let i=0;i<patrols.length;i++)if(i!==ignorePatrol&&Math.hypot(x-patrols[i].x,z-patrols[i].z)<.48+r)return true;
 return false;
}
function resolveMove(x,z,dx,dz,r=.55,ignorePatrol=-1){
 const nx=clamp(x+dx,-53,53),nz=clamp(z+dz,-48,42);
 const canStep=(fromX,fromZ,toX,toZ)=>{
  if(staticBlocked(toX,toZ,r))return false;
  for(let i=0;i<patrols.length;i++){
   if(i===ignorePatrol)continue;
   const robot=patrols[i],before=Math.hypot(fromX-robot.x,fromZ-robot.z),after=Math.hypot(toX-robot.x,toZ-robot.z),limit=r+.48;
   if(after<limit&&(before>=limit||after<before-.0001))return false;
  }
  return true;
 };
 if(canStep(x,z,nx,nz))return {x:nx,z:nz};
 // Separar los ejes permite deslizarse junto a una pared o una roca.
 const sx=canStep(x,z,nx,z)?nx:x;
 const sz=canStep(sx,z,sx,nz)?nz:z;
 return {x:sx,z:sz};
}
function updatePatrols(dt,playerX,playerZ){
 for(let i=0;i<patrols.length;i++){
  const robot=patrols[i];robot.moving=false;
  let [tx,tz]=robot.route[robot.target];
  let dx=tx-robot.x,dz=tz-robot.z,dist=Math.hypot(dx,dz);
  if(dist<.18){robot.target=(robot.target+1)%robot.route.length;[tx,tz]=robot.route[robot.target];dx=tx-robot.x;dz=tz-robot.z;dist=Math.hypot(dx,dz)}
  if(dist<.001)continue;
  const step=Math.min(robot.speed*dt,dist),nx=robot.x+dx/dist*step,nz=robot.z+dz/dist*step;
  if(blocked(nx,nz,.36,i)||Math.hypot(nx-playerX,nz-playerZ)<1.2)continue;
  robot.x=nx;robot.z=nz;robot.yaw=Math.atan2(dx,-dz);robot.walk+=dt*7;robot.moving=true;
 }
}
function nearbyRobot(x,z,range=2.8){
 let nearest=null,dist=range;
 for(let i=0;i<patrols.length;i++){
  const d=Math.hypot(x-patrols[i].x,z-patrols[i].z);
  if(d<dist){nearest={id:i,x:patrols[i].x,z:patrols[i].z};dist=d}
 }
 return nearest?{...nearest,dist}:null;
}
const hash=(x,z)=>{let v=Math.sin(x*127.1+z*311.7)*43758.5453123;return v-Math.floor(v)};
const noise=(x,z)=>{let i=Math.floor(x),k=Math.floor(z),a=x-i,b=z-k; a=a*a*(3-2*a);b=b*b*(3-2*b);return mix(mix(hash(i,k),hash(i+1,k),a),mix(hash(i,k+1),hash(i+1,k+1),a),b)};
const fbm=(x,z)=>.56*noise(x,z)+.27*noise(x*2.12,z*2.12)+.13*noise(x*4.3,z*4.3)+.04*noise(x*8.7,z*8.7);
function height(x,z){const r=Math.hypot(x*.92,z*.8); const d=smooth(25,57,r);return ((fbm(x*.063,z*.063)-.42)*10 + Math.sin(x*.075+z*.09)*1.3)*d + (fbm(x*.2,z*.2)-.5)*.3;}
class Builder {
 constructor(){this.v=[];this.i=[];}
 tri(a,b,c,color='#867060',em=0,metal=0,grain=0.5){
  if(typeof color==='string')color=c3(color);
  const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];
  let nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;const len=Math.hypot(nx,ny,nz)||1;nx/=len;ny/=len;nz/=len;
  for(const p of [a,b,c]){this.v.push(p[0],p[1],p[2],nx,ny,nz,color[0],color[1],color[2],em,metal,grain);}
 }
 quad(a,b,c,d,color,em=0,metal=0,grain=.5){this.tri(a,b,c,color,em,metal,grain);this.tri(a,c,d,color,em,metal,grain)}
 build(gl){const data=new Float32Array(this.v);const vao=gl.createVertexArray();gl.bindVertexArray(vao);const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
 const stride=12*4;for(let i=0;i<4;i++){const sizes=[3,3,3,3];gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,sizes[i],gl.FLOAT,false,stride,[0,3,6,9][i]*4)}gl.bindVertexArray(null);return {vao,count:data.length/12};}
}
function box(b,cx,cy,cz,w,h,d,col='#9a8876',ry=0,rx=0,em=0,metal=.45,grain=.3){
 const sx=w/2,sy=h/2,sz=d/2;
 const p=[[-sx,-sy,-sz],[sx,-sy,-sz],[sx,sy,-sz],[-sx,sy,-sz],[-sx,-sy,sz],[sx,-sy,sz],[sx,sy,sz],[-sx,sy,sz]];
 const cyy=Math.cos(ry),syy=Math.sin(ry),cxx=Math.cos(rx),sxx=Math.sin(rx);
 for(let i=0;i<8;i++){
  let x=p[i][0],y=p[i][1],z=p[i][2]; const ax=x*cyy+z*syy,az=-x*syy+z*cyy; const ay=y*cxx-az*sxx, zz=y*sxx+az*cxx;p[i]=[ax+cx,ay+cy,zz+cz];
 }
 const faces=[[0,1,2,3],[5,4,7,6],[4,0,3,7],[1,5,6,2],[3,2,6,7],[4,5,1,0]];
 faces.forEach((f,i)=>{let c=typeof col==='string'?c3(col):col;const shade=[.9,.9,.8,1.05,1.12,.68][i];b.quad(p[f[0]],p[f[1]],p[f[2]],p[f[3]],c.map(v=>clamp(v*shade,0,1)),em,metal,grain)})
}
function beam(b,a,c,rad,col='#888276',sides=7,em=0,metal=.6){
 const axis=[c[0]-a[0],c[1]-a[1],c[2]-a[2]],ll=Math.hypot(...axis);if(ll<.0001)return;const d=axis.map(v=>v/ll);
 const side=Math.abs(d[1])<.91?[0,1,0]:[0,0,1];let u=[d[1]*side[2]-d[2]*side[1],d[2]*side[0]-d[0]*side[2],d[0]*side[1]-d[1]*side[0]];const l=Math.hypot(...u);u=u.map(v=>v/l);
 const v=[d[1]*u[2]-d[2]*u[1],d[2]*u[0]-d[0]*u[2],d[0]*u[1]-d[1]*u[0]];
 const pos=(p,ang)=>[p[0]+rad*(u[0]*Math.cos(ang)+v[0]*Math.sin(ang)),p[1]+rad*(u[1]*Math.cos(ang)+v[1]*Math.sin(ang)),p[2]+rad*(u[2]*Math.cos(ang)+v[2]*Math.sin(ang))];
 for(let i=0;i<sides;i++){const t=TAU*i/sides,t2=TAU*(i+1)/sides;const q0=pos(a,t),q1=pos(a,t2),q2=pos(c,t2),q3=pos(c,t);b.quad(q0,q1,q2,q3,col,em,metal,.28);b.tri(a,q1,q0,col,em,metal,.28);b.tri(c,q3,q2,col,em,metal,.28)}
}
function sphere(b,center,rx,ry,rz,col='#ded6c5',rings=9,segs=14,em=0,metal=.35,topOnly=false){
 const max=topOnly?Math.PI/2:Math.PI;
 const pt=(t,p)=>[center[0]+Math.sin(t)*Math.cos(p)*rx,center[1]+Math.cos(t)*ry,center[2]+Math.sin(t)*Math.sin(p)*rz];
 for(let j=0;j<rings;j++){const t0=max*j/rings,t1=max*(j+1)/rings;for(let i=0;i<segs;i++){const p0=TAU*i/segs,p1=TAU*(i+1)/segs;const a=pt(t0,p0),bb=pt(t1,p0),c=pt(t1,p1),d=pt(t0,p1);b.quad(a,bb,c,d,col,em,metal,.24)}}
}
 function rock(b,x,z,r,color){const y=height(x,z)-.05,rr=r*(.85+rand()*.5);rocks.push({x,z,r:rr*.95});const ang=rand()*TAU;let top=[x+(rand()-.5)*r*.25,y+r*(.58+rand()*.8),z+(rand()-.5)*r*.25];const n=6+Math.floor(rand()*3);const lower=[],upper=[];
 for(let i=0;i<n;i++){const a=TAU*i/n+ang,k=.7+rand()*.5;lower.push([x+rr*k*Math.cos(a),y-.14,z+rr*k*Math.sin(a)]);upper.push([x+rr*k*.78*Math.cos(a+.2),y+r*(.4+rand()*.2),z+rr*k*.78*Math.sin(a+.2)])}
 for(let i=0;i<n;i++){let j=(i+1)%n;b.quad(lower[i],lower[j],upper[j],upper[i],color,0,.12,.85);b.tri(upper[i],upper[j],top,color,0,.12,.85)}
}
function terrain(b){let N=128,L=96,step=2*L/N;for(let zi=0;zi<N;zi++)for(let xi=0;xi<N;xi++){
 const x=-L+xi*step,z=-L+zi*step;const f=(xx,zz)=>[xx,height(xx,zz)-.27,zz];const p0=f(x,z),p1=f(x+step,z),p2=f(x+step,z+step),p3=f(x,z+step);
 const v=fbm(x*.23,z*.23),n=fbm(x*.67,z*.67);const col=[.26+.21*v+.06*n,.115+.13*v+.04*n,.075+.085*v+.025*n];if(v>.69){col[0]*=1.16;col[1]*=1.15;col[2]*=1.11}b.quad(p0,p3,p2,p1,col,0,.02,1);
 }}
function environment(b){
 terrain(b);
 const r=rng(9081);
 for(let i=0;i<240;i++){const x=(r()-.5)*162,z=(r()-.5)*158;if((Math.abs(x)<11&&z>-43&&z<20)||(x>-34&&x<-9&&z>-27&&z<19)||(x>10&&x<36&&z>-36&&z<8))continue;const s=.19+Math.pow(r(),1.4)*2.4;const color=['#51372d','#684535','#76513f','#89644c','#49352e'][Math.floor(r()*5)];rock(b,x,z,s,color);}
 // Atmospheric mountain ridges, dark rock formations near the horizon.
 for(let row=0;row<3;row++){let prev=[-140,0,-99-row*17];for(let i=0;i<55;i++){
  let x=-140+i*5.3,z=-99-row*17,y=-1.6+(noise(x*.035,row)*16+noise(x*.13,row*2)*9)*(1-row*.13),k=[x,y,z];let base=[x,-2.2,z];let old=[prev[0],-2.2,prev[2]];if(i>0)b.quad(old,base,k,prev,row===0?'#5f443c':row===1?'#694a42':'#735044',0,0,.92);prev=k;
 }}
 // Walkway ground grates toward central module.
 for(let z=21;z>-17;z-=2){box(b,0,.035,z,4.15,.09,1.86,'#564c45',0,0,0,.55);for(let x=-1.8;x<=1.8;x+=.44)box(b,x,.096,z, .044,.018,1.78,'#312f30',0,0,0,.8)}
 // Buried service pipes to energy bay.
 for(let s of [-1,1]){for(let z=-16;z<13;z+=5)beam(b,[s*3.5,.12,z],[s*3.5,.12,z+5],.085,'#9a7662',7)}
}
function habitat(b){
 const z=-28;box(b,0,.25,z,13,.5,21,'#3d3734',0,0,0,.62);
 beam(b,[0,5.2,-36.2],[0,5.2,-18.8],4.7,'#92938c',32,0,.67);
 // rings reinforce main module
 for(const zz of [-35,-31,-27,-23,-19.5])for(let i=0;i<24;i++){const aa=TAU*i/24,bb=TAU*(i+1)/24;const pa=[5.06*Math.cos(aa),5.2+5.06*Math.sin(aa),zz],pb=[5.06*Math.cos(bb),5.2+5.06*Math.sin(bb),zz];beam(b,pa,pb,.115,'#494640',5)}
 // panel seams & side markings
 for(const x of [-4.86,4.86]){for(let i=0;i<6;i++){const zz=-35+i*2.6;box(b,x,4.3,zz,.13,3.4,.055,'#514842',0,0,0,.8)}}
 for(const zz of [-34,-28,-22]){box(b,0,9.78,zz,5.5,.14,.2,'#676766',0,0,0,.7)}
 // Southern door airlock facing player
 box(b,0,3.1,-17.75,4.3,6.1,1.3,'#655c53');box(b,0,3.1,-17.04,3.05,4.65,.19,'#1b252d',0,0,0,.67);
 box(b,0,5.15,-16.93,2.55,.1,.09,'#edbb73',0,0,2.5,.3);box(b,-1.4,3.1,-16.95,.09,4.3,.09,'#db8750',0,0,1.6,.2);box(b,1.4,3.1,-16.95,.09,4.3,.09,'#db8750',0,0,1.6,.2);
 box(b,0,1.7,-16.88,1.95,1.7,.12,'#283d43',0,0,.36,.5);
 box(b,-1.5,6.35,-17.1,1.2,.28,.5,'#e3b875',0,0,2.1);box(b,1.5,6.35,-17.1,1.2,.28,.5,'#e3b875',0,0,2.1);
 for(let z2=-15;z2<=-11;z2+=1){box(b,0,.18+(z2+15)*.12,z2,4.1,.24,.82,'#55504a')}
 box(b,0,7.7,-17.8,2.45,.9,.26,'#6b6c69');
 // exterior bays and lights
 for(const x of [-5.35,5.35]){for(const zz of [-33,-27,-21]){box(b,x,4.65,zz,.25,1.1,1.65,'#33434d');box(b,x*1.04,4.8,zz,.14,.6,1.1,'#53adc6',0,0,1.0,.5)}}
 // roof exhaust + pipes
 for(const xx of [-2.5,2.5]){beam(b,[xx,9.4,-26],[xx,11.7,-26],.24,'#767a78');box(b,xx,11.8,-26,.9,.25,.95,'#4a4846')}
 // weathered small attached module
 box(b,-7,2.5,-29,5,5,8,'#75736b');box(b,-7,4,-24.9,3.7,.8,.12,'#38434a');box(b,-7,4,-24.8,2.4,.42,.09,'#e8a45d',0,0,1.6);
}
function greenhouse(opaque,glass){const cx=22,cz=-25,r=8.2;
 box(opaque,cx,.27,cz,16.7,.55,16.7,'#3c3c35');
 for(let i=0;i<28;i++){const a=TAU*i/28,bb=TAU*(i+1)/28;const pa=[cx+r*Math.cos(a),.85,cz+r*Math.sin(a)],pb=[cx+r*Math.cos(bb),.85,cz+r*Math.sin(bb)];beam(opaque,pa,pb,.14,'#7c7a6f',7)}
 const thetaN=9,phiN=20,pt=(t,p)=>[cx+r*Math.sin(t)*Math.cos(p),.8+r*.74*Math.cos(t),cz+r*Math.sin(t)*Math.sin(p)];
 for(let j=0;j<thetaN;j++)for(let i=0;i<phiN;i++){const t0=Math.PI*.5*j/thetaN,t1=Math.PI*.5*(j+1)/thetaN,a=TAU*i/phiN,d=TAU*(i+1)/phiN;const p0=pt(t0,a),p1=pt(t1,a),p2=pt(t1,d),p3=pt(t0,d);glass.quad(p0,p1,p2,p3,[.22,.46,.45],.18,.65,.1)}
 for(let m=0;m<12;m++){const a=TAU*m/12;for(let k=0;k<9;k++){const p0=pt(Math.PI*.5*k/9,a),p1=pt(Math.PI*.5*(k+1)/9,a);beam(opaque,p0,p1,.09,'#a2a18b',5)}}
 for(const t of [.42,.83,1.22,1.55])for(let i=0;i<28;i++){const a=TAU*i/28,d=TAU*(i+1)/28;beam(opaque,pt(t,a),pt(t,d),.075,'#8e9080',5)}
 // hydroponic racks and plants, lit from inside
 for(let z=-31;z<=-20;z+=3.2){for(let x=16;x<=28;x+=2.3){if(Math.hypot(x-cx,z-cz)>6.1)continue;box(opaque,x,.62,z,1.4,.3,1.9,'#414841');for(let j=0;j<5;j++){const dx=(j%3-1)*.39,dz=(Math.floor(j/3)-.5)*.59;beam(opaque,[x+dx,.78,z+dz],[x+dx,1.42+rand()*.6,z+dz],.058,'#3c744b',5);sphere(opaque,[x+dx,1.48+rand()*.43,z+dz],.42,.48,.36, ['#4c8c42','#648e3b','#3f8444'][j%3],4,7,.1,0)}}}
 for(const zz of [-32,-25,-18]){box(opaque,cx,5.3,zz,4,.16,.3,'#d6b06c',0,0,1.6)}
}
function solarField(b){for(let row=0;row<3;row++)for(let col=0;col<4;col++){
 const x=-35+col*5.3,z=-17+row*5.9;beam(b,[x,0,z],[x,1.4,z],.15,'#74716b');beam(b,[x,1.1,z-.5],[x,2.1,z+.7],.13,'#a5a399');
 box(b,x,2.24,z,4.7,.09,3.0,'#202933',.04,-.31,0,.82);box(b,x,2.30,z,4.38,.015,2.73,'#203853',.04,-.31,.08,.68);
 for(let a=-1.8;a<=1.81;a+=.9)box(b,x+a,2.325,z,.045,.018,2.65,'#90b8c2',.04,-.31,.25,.67);
 for(let a=-1.1;a<=1.1;a+=.74)box(b,x,2.34,z+a,4.34,.018,.042,'#6b9db2',.04,-.31,.2,.65);
 }box(b,-18,1.25,9,2.5,2.4,1.6,'#605c54');box(b,-18,2.05,9.85,1.75,.72,.08,'#5cb7d0',0,0,1.2);
}
function regulator(b){box(b,-6,1.28,-10.3,3.6,2.5,2.1,'#77766b');box(b,-6,2.06,-9.21,2.65,.86,.09,'#1b262d');box(b,-6,2.06,-9.15,2.2,.51,.08,'#cf7d3d',0,0,1.7);for(let i=0;i<4;i++)box(b,-7.16+i*.8,1.04,-9.14,.27,.31,.1,i===2?'#e5c363':'#67b1ae',0,0,i===2?1.7:.8)}
function distribution(b){box(b,5,1.08,-10,3.2,2.15,2.1,'#5c676a');box(b,5,1.78,-8.93,2.35,1.05,.1,'#18303d');box(b,5,1.82,-8.88,1.9,.62,.12,'#5bb5c9',0,0,1.2);for(let i=0;i<3;i++)beam(b,[3.8+i*1.2,.1,-10],[3.8+i*1.2,2.4,-10],.11,'#9c9c90')}
function tower(b){const x=11,z=-36;
 for(let y=0;y<23;y+=4){const radius=2*(1-y/33);for(const s of [-1,1])for(const v of [-1,1]){beam(b,[x+s*radius,y,z+v*radius],[x+s*radius*.91,y+4,z+v*radius*.91],.1,'#696863',6)}
 if(y<20)for(const s of [-1,1])for(const v of [-1,1])beam(b,[x+s*radius,y,z+v*radius],[x-s*radius*.91,y+4,z+v*radius*.91],.065,'#8a8178',6);
 }box(b,x,23.2,z,4,.3,4,'#8f897b');beam(b,[x,23,z],[x+1,27,z+.3],.21,'#a1a099');sphere(b,[x+1,27,z+.3],2.7,.42,2.7,'#797f7f',6,18,0,.65);box(b,x,28,z,.42,1.1,.42,'#f28551',0,0,2.5)
}
function serviceBuildings(b){
 // oxygen compressor
 box(b,-16,1.8,-28,7,3.6,5,'#777d79');for(let i=-1;i<=1;i++){beam(b,[-16+i*1.8,3.5,-28],[-16+i*1.8,5.5,-28],.48,'#a2ada8',13)}box(b,-16,2.6,-25.45,3,.68,.14,'#518fa0',0,0,.65);
 // habitat pipes and auxiliary crates
 for(const x of [-11,10,14])for(const z of [-33,-7,1]){box(b,x,.75,z,1.7,1.48,1.8,'#4c4843');box(b,x,1.47,z,1.8,.1,1.9,'#746f65');}
 // solar communication mast
 beam(b,[-29,0,-34],[-29,17,-34],.35,'#747976');for(let y=4;y<17;y+=4){beam(b,[-29,y,-34],[-27.4,y-2,-33.4],.1,'#858580');beam(b,[-29,y,-34],[-30.6,y-2,-33.4],.1,'#858580')}box(b,-29,17.5,-34,1,1.4,1,'#e79b5b',0,0,1.9);
}
function smallDetails(b){
 for(let i=0;i<54;i++){let x=(rand()-.5)*100,z=(rand()-.5)*90;if(Math.abs(x)<9&&z>-39&&z<20)continue;if(x>11&&x<34&&z>-37&&z<-12)continue;const r=.08+rand()*.22;beam(b,[x,height(x,z),z],[x,height(x,z)+r*1.8,z],r*.7,'#786052',6)}
 // Weathered lane rails near buildings
 for(let z=-15;z<5;z+=5){for(let x of [-4.2,4.2]){beam(b,[x,0,z],[x,1,z],.075,'#817166');beam(b,[x,1,z],[x,1,z+5],.06,'#817166')}}
 // Signal landing pads
 for(const xx of [-8,9]){box(b,xx,.08,8,4,.1,4,'#373636');for(let i=0;i<4;i++){box(b,xx-1.6+i, .15,8,.12,.02,3.8,'#6f5e4f')}}
}
const skinCatalog=[
 {id:'explorer',name:'Explorador',price:0,suit:'#bbb8ab',helmet:'#d4d1c2',pack:'#575954',visor:'#1a3c45',accent:'#87c2c0',boots:'#504e4b'},
 {id:'solar',name:'Ingeniero solar',price:25,suit:'#d9a65b',helmet:'#f0d49c',pack:'#4d4233',visor:'#1c3542',accent:'#ffd275',boots:'#453a2e'},
 {id:'botanic',name:'Guardiana verde',price:55,suit:'#6fae86',helmet:'#cbe8d4',pack:'#385243',visor:'#173832',accent:'#8ff0b0',boots:'#34473b'},
 {id:'crimson',name:'Piloto de Marte',price:80,suit:'#c9624c',helmet:'#edd5cc',pack:'#573630',visor:'#1b2c3b',accent:'#ff9b7a',boots:'#472d29'},
 {id:'cobalt',name:'Comandante orbital',price:110,suit:'#527eb8',helmet:'#d4e5f7',pack:'#30425c',visor:'#122940',accent:'#7ad4ff',boots:'#2c3a4f'},
 {id:'obsidian',name:'Sombra lunar',price:150,suit:'#3a404a',helmet:'#8fa0b3',pack:'#20252c',visor:'#0f2838',accent:'#7df9ff',boots:'#1b1f26'},
];
function astronaut(body,leftArm,rightArm,leftLeg,rightLeg,skin){
 // Adult scale ~2.3 m; original chunky suit silhouette with articulated limbs.
 box(body,0,1.06,.35,1.1,1.32,.57,skin.pack,0,0,0,.35);
 box(body,0,1.14,.76,.89,.98,.34,skin.pack);
 sphere(body,[0,1.53,0],.66,.77,.44,skin.suit,9,12,0,.3);
 sphere(body,[0,2.19,-.04],.44,.48,.43,skin.helmet,10,12,0,.3);
 sphere(body,[0,2.22,-.36],.34,.3,.18,skin.visor,8,12,.23,.6);
 box(body,0,2.14,.51,.68,.18,.2,skin.accent);
 for(let s of [-1,1]){
  const arm=s<0?leftArm:rightArm,leg=s<0?leftLeg:rightLeg;
  beam(arm,[s*.7,0,0],[s*.9,-.85,-.02],.26,skin.suit,9);
  sphere(arm,[s*.87,-.86,-.07],.27,.22,.27,skin.helmet,8,9);
  beam(leg,[s*.29,0,0],[s*.33,-.59,0],.29,skin.suit,10);
  box(leg,s*.33,-.62,-.11,.55,.35,.92,skin.boots);
 }
 box(body,0,1.42,-.47,.6,.18,.1,skin.accent,0,0,.95);
 box(body,0,1.18,.96,.63,.12,.06,skin.accent,0,0,1.15);
}
function patrolRobot(body,leftArm,rightArm,leftLeg,rightLeg){
 box(body,0,1.34,0,.86,1.05,.6,'#d4d4c8',0,0,0,.56);
 box(body,0,1.38,-.32,.62,.48,.08,'#263d45',0,0,.35,.75);
 box(body,0,1.32,-.38,.18,.13,.04,'#7de6f1',0,0,2.2);
 sphere(body,[0,2.05,0],.42,.39,.38,'#dddccf',8,12,0,.45);
 box(body,0,2.08,-.36,.64,.23,.08,'#153540',0,0,.22,.75);
 for(const x of [-.17,.17])sphere(body,[x,2.09,-.41],.065,.07,.03,'#8ff1fc',5,7,2.5);
 beam(body,[0,2.38,.02],[0,2.65,.02],.045,'#a7b3b0',6);
 sphere(body,[0,2.68,.02],.08,.08,.08,'#f0a761',5,7,1.5);
 for(const side of [-1,1]){
  const arm=side<0?leftArm:rightArm,leg=side<0?leftLeg:rightLeg;
  beam(arm,[side*.53,0,0],[side*.58,-.77,-.05],.17,'#a8ada7',8);
  sphere(arm,[side*.58,-.82,-.05],.18,.17,.17,'#707b7a',6,8);
  beam(leg,[side*.22,0,0],[side*.22,-.68,0],.19,'#bbc1b6',8);
  box(leg,side*.22,-.77,-.13,.39,.25,.61,'#4e6264');
 }
 box(body,0,1.42,.4,.66,.83,.27,'#626b66');
}
function robotCargos(gl){
 const plant=new Builder(),crate=new Builder(),lamp=new Builder();
 box(plant,0,1.02,-.58,.46,.38,.46,'#b36d4b');
 box(plant,0,1.22,-.58,.52,.07,.52,'#c9855e');
 beam(plant,[0,1.22,-.58],[0,1.52,-.58],.06,'#5c8459',6);
 sphere(plant,[0,1.58,-.58],.32,.28,.32,'#69b568',7,9);
 sphere(plant,[.12,1.72,-.52],.09,.09,.09,'#ffd482',5,7,1.2);
 box(crate,0,1.05,-.58,.64,.46,.46,'#5a6e75');
 box(crate,0,1.05,-.58,.68,.12,.5,'#e5b363',0,0,1.1);
 box(crate,0,1.3,-.58,.48,.06,.34,'#7de6f1',0,0,1.3);
 box(lamp,0,.95,-.58,.36,.16,.36,'#4d5c61');
 beam(lamp,[0,1.02,-.58],[0,1.52,-.58],.06,'#92a1a3',6);
 sphere(lamp,[0,1.62,-.58],.19,.2,.19,'#ffe194',7,9,2.1);
 return {plant:plant.build(gl),crate:crate.build(gl),lamp:lamp.build(gl)};
}
const skyBodies=[
 {name:'Sol',x:-77,y:43,z:-132,r:8.5,color:'#ffd495'},
 {name:'Mercurio',x:-49,y:37,z:-135,r:1.5,color:'#9a958e'},
 {name:'Venus',x:-32,y:44,z:-135,r:2.5,color:'#e7c18e'},
 {name:'Tierra',x:-13,y:37,z:-135,r:3,color:'#5893b0'},
 {name:'Júpiter',x:18,y:48,z:-137,r:5.8,color:'#c99b78'},
 {name:'Saturno',x:47,y:39,z:-138,r:4.7,color:'#d4c39e'},
 {name:'Urano',x:70,y:48,z:-139,r:3.2,color:'#9ac8cb'},
 {name:'Neptuno',x:91,y:37,z:-140,r:3.1,color:'#5279bd'},
];
function skyGeometry(gl){const b=new Builder();for(const p of skyBodies){sphere(b,[p.x,p.y,p.z],p.r,p.r,p.r,p.color,10,16,2.2,0);if(p.name==='Saturno')for(let i=0;i<28;i++){const a=TAU*i/28,c=TAU*(i+1)/28;for(const radius of [7.2,8.1])beam(b,[p.x+Math.cos(a)*radius,p.y+Math.sin(a)*radius*.22,p.z+Math.sin(a)*radius*.22],[p.x+Math.cos(c)*radius,p.y+Math.sin(c)*radius*.22,p.z+Math.sin(c)*radius*.22],.24,'#d4b78b',5,2.2,0)}}return b.build(gl)}
function saucerGeometry(gl){const b=new Builder(),g=new Builder();
 sphere(b,[0,0,0],2.5,.36,2.5,'#9aaba9',8,20,.2,.82);sphere(b,[0,.31,0],1.55,.55,1.55,'#4e6668',7,18,.1,.75);
 for(let i=0;i<12;i++){const a=TAU*i/12;sphere(b,[Math.cos(a)*2.12,.06,Math.sin(a)*2.12],.13,.12,.13,i%2?'#9be7dd':'#edba75',5,7,1.7)}
 sphere(b,[0,1.07,0],.55,.65,.52,'#7ba66a',8,12);sphere(b,[0,1.87,0],.74,.59,.65,'#80b870',8,12);
 for(const x of [-.27,.27])sphere(b,[x,1.88,-.56],.15,.21,.07,'#172d2c',6,8,.4);
 for(const x of [-.6,.6])beam(b,[x*.7,1.1,0],[x,.52,-.3],.12,'#89bb77',6);
 beam(b,[-.3,2.35,.02],[-.39,2.65,.02],.05,'#75a66b');beam(b,[.3,2.35,.02],[.39,2.65,.02],.05,'#75a66b');
 sphere(g,[0,1.14,0],1.12,1.5,1.12,'#92cbd0',9,18,.15,.25,true);
 return {body:b.build(gl),glass:g.build(gl)}}
const saucers=[{x:-15,z:-32,y:19,phase:0,speed:.43},{x:21,z:-19,y:15,phase:2.2,speed:-.35}];
function foodMeshes(gl){
 const make=fn=>{const m=new Builder();fn(m);return m.build(gl)};
 const hx=.92,hy=-.76,hz=-.44;
 return {
  carrots:make(m=>{beam(m,[hx,hy,hz],[hx,hy+.32,hz-.12],.11,'#ff8a2b',7);sphere(m,[hx,hy+.36,hz-.12],.12,.10,.12,'#5ec454',5,6,.2);}),
  eggs:make(m=>{box(m,hx,hy,hz,.34,.12,.30,'#d4dfe3');sphere(m,[hx,hy+.09,hz],.15,.08,.13,'#ffe066',6,8,.25);}),
  tortillas:make(m=>{box(m,hx,hy+.02,hz,.32,.14,.26,'#efc677');box(m,hx,hy+.07,hz,.28,.07,.15,'#64c45e',0,0,.15);box(m,hx,hy+.10,hz,.24,.05,.10,'#e85a45',0,0,.15);}),
  shrimp:make(m=>{box(m,hx,hy,hz,.32,.16,.32,'#edf3f5');sphere(m,[hx,hy+.12,hz],.13,.09,.13,'#ff8c78',6,7,.2);sphere(m,[hx+.06,hy+.15,hz-.04],.08,.07,.08,'#e6483e',5,6,.2);}),
  steak:make(m=>{box(m,hx,hy,hz,.36,.13,.28,'#8f422e',0,0,.1);box(m,hx,hy+.07,hz,.30,.03,.05,'#421d14');box(m,hx,hy+.07,hz-.07,.30,.03,.05,'#421d14');}),
  apricots:make(m=>{sphere(m,[hx-.08,hy+.04,hz],.14,.12,.14,'#ff9a42',7,8,.25);sphere(m,[hx+.09,hy+.05,hz-.05],.12,.11,.12,'#ffb866',7,8,.25);}),
  pudding:make(m=>{box(m,hx,hy,hz,.28,.22,.28,'#e2ecef');box(m,hx,hy+.11,hz,.24,.06,.24,'#593020',0,0,.15);beam(m,[hx+.05,hy+.12,hz],[hx+.15,hy+.28,hz+.05],.03,'#c5d2d6',5);}),
  juice:make(m=>{box(m,hx,hy+.05,hz,.26,.34,.18,'#4ab4e0',0,0,.18);box(m,hx,hy+.08,hz-.09,.20,.14,.03,'#ffd56b',0,0,.25);beam(m,[hx+.05,hy+.22,hz],[hx+.10,hy+.36,hz-.10],.028,'#ffffff',5);}),
 };
}
function compileWorld(gl){rocks.length=0;const b=new Builder(),g=new Builder();environment(b);habitat(b);greenhouse(b,g);solarField(b);regulator(b);distribution(b);tower(b);serviceBuildings(b);smallDetails(b);
 const avatars={};
 const getAvatar=id=>{if(!avatars[id]){const skin=skinCatalog.find(s=>s.id===id)||skinCatalog[0],body=new Builder(),leftArm=new Builder(),rightArm=new Builder(),leftLeg=new Builder(),rightLeg=new Builder();astronaut(body,leftArm,rightArm,leftLeg,rightLeg,skin);avatars[id]={body:body.build(gl),leftArm:leftArm.build(gl),rightArm:rightArm.build(gl),leftLeg:leftLeg.build(gl),rightLeg:rightLeg.build(gl)}}return avatars[id]};
  const robotBody=new Builder(),robotLeftArm=new Builder(),robotRightArm=new Builder(),robotLeftLeg=new Builder(),robotRightLeg=new Builder();patrolRobot(robotBody,robotLeftArm,robotRightArm,robotLeftLeg,robotRightLeg);
  return {world:b.build(gl),glass:g.build(gl),sky:skyGeometry(gl),saucer:saucerGeometry(gl),getAvatar,robotBody:robotBody.build(gl),robotLeftArm:robotLeftArm.build(gl),robotRightArm:robotRightArm.build(gl),robotLeftLeg:robotLeftLeg.build(gl),robotRightLeg:robotRightLeg.build(gl),robotCargos:robotCargos(gl),foodMeshes:foodMeshes(gl)};
}
function mat4(){return new Float32Array(16)}
function identity(out){out.fill(0);out[0]=out[5]=out[10]=out[15]=1;return out}
function multiply(out,a,b){const o=new Float32Array(16);for(let j=0;j<4;j++)for(let i=0;i<4;i++)o[j*4+i]=a[i]*b[j*4]+a[4+i]*b[j*4+1]+a[8+i]*b[j*4+2]+a[12+i]*b[j*4+3];out.set(o);return out}
function perspective(out,fovy,aspect,near,far){identity(out);const f=1/Math.tan(fovy/2);out[0]=f/aspect;out[5]=f;out[10]=(far+near)/(near-far);out[11]=-1;out[14]=2*far*near/(near-far);out[15]=0;return out}
function lookAt(out,eye,target){const up=[0,1,0];let z=eye.map((n,i)=>n-target[i]);let k=Math.hypot(...z)||1;z=z.map(v=>v/k);let x=[up[1]*z[2]-up[2]*z[1],up[2]*z[0]-up[0]*z[2],up[0]*z[1]-up[1]*z[0]];k=Math.hypot(...x)||1;x=x.map(v=>v/k);const y=[z[1]*x[2]-z[2]*x[1],z[2]*x[0]-z[0]*x[2],z[0]*x[1]-z[1]*x[0]];
 identity(out);out[0]=x[0];out[1]=y[0];out[2]=z[0];out[4]=x[1];out[5]=y[1];out[6]=z[1];out[8]=x[2];out[9]=y[2];out[10]=z[2];out[12]=-(x[0]*eye[0]+x[1]*eye[1]+x[2]*eye[2]);out[13]=-(y[0]*eye[0]+y[1]*eye[1]+y[2]*eye[2]);out[14]=-(z[0]*eye[0]+z[1]*eye[1]+z[2]*eye[2]);return out}
function modelAt(out,x,y,z,yaw,bob){identity(out);const c=Math.cos(yaw),s=Math.sin(yaw);out[0]=c;out[2]=s;out[8]=-s;out[10]=c;out[12]=x;out[13]=y+bob;out[14]=z;return out}
function project(p,m,sz){const [x,y,z]=p;const w=m[3]*x+m[7]*y+m[11]*z+m[15];if(w<.05)return null;let sx=(m[0]*x+m[4]*y+m[8]*z+m[12])/w,sy=(m[1]*x+m[5]*y+m[9]*z+m[13])/w;return {x:(sx*.5+.5)*sz[0],y:(.5-sy*.5)*sz[1],inView:Math.abs(sx)<.89&&Math.abs(sy)<.85};}
function shader(gl,t,kind){const sh=gl.createShader(kind);gl.shaderSource(sh,t);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS)){console.error('Shader',gl.getShaderInfoLog(sh));throw new Error('No se pudo crear el shader WebGL.')}return sh}
const VS=`#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNormal;
layout(location=2) in vec3 aColor;
layout(location=3) in vec3 aExtra;
uniform mat4 uVP;uniform mat4 uModel;uniform vec3 uEye;
out vec3 vPos;out vec3 vNormal;out vec3 vColor;out vec3 vExtra;out float vDist;
void main(){vec4 wp=uModel*vec4(aPos,1.);vPos=wp.xyz;vNormal=normalize(mat3(uModel)*aNormal);vColor=aColor;vExtra=aExtra;vDist=distance(wp.xyz,uEye);gl_Position=uVP*wp;}`;
const FS=`#version 300 es
precision highp float;
in vec3 vPos;in vec3 vNormal;in vec3 vColor;in vec3 vExtra;in float vDist;uniform vec3 uEye;uniform float uStorm;uniform float uGlass;uniform float uInterior;uniform float uTime;out vec4 frag;
float hash31(vec3 p){return fract(sin(dot(p,vec3(27.12,93.43,11.52)))*43758.5453);}
vec3 tone(vec3 x){x=max(vec3(0.),x);return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
void main(){vec3 n=normalize(vNormal);float mott=hash31(floor(vPos*7.5));n=normalize(n+(mott-.5)*.09*vExtra.z);vec3 L=normalize(vec3(-.47,.78,.43));float diff=max(dot(n,L),0.);float sky=max(n.y*.55+.45,.16);
vec3 ambient=mix(vec3(.37,.39,.43)*(.54+.5*sky),vec3(.53,.62,.63),uInterior);vec3 sun=mix(vec3(1.44,1.07,.78),vec3(.75,.95,1.02),uInterior)*diff;
float variation=(mott-.5)*.13*vExtra.z;
vec3 base=vColor*(1.+variation);
vec3 viewDir=normalize(uEye-vPos);vec3 H=normalize(L+viewDir);
float spec=pow(max(dot(n,H),0.),mix(10.,90.,vExtra.y))*(.07+.5*vExtra.y)*diff;
vec3 col=base*(ambient+sun*.74)+vec3(1.,.83,.66)*spec+base*vExtra.x*2.;
float distFog=1.-exp(-max(vDist-9.,0.)*mix(.009,.021,uStorm));
vec3 fog= mix(vec3(.61,.40,.30),vec3(.36,.30,.31),uStorm*.67);
col=mix(col,fog,distFog*.84*(vExtra.x>1.9?0.:1.)*(1.-uInterior));
col=tone(col);col=pow(col,vec3(.83));
float alpha=mix(1.,.27,uGlass);
frag=vec4(col,alpha);}`;
function makeProgram(gl){const p=gl.createProgram();gl.attachShader(p,shader(gl,VS,gl.VERTEX_SHADER));gl.attachShader(p,shader(gl,FS,gl.FRAGMENT_SHADER));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));return p}
const dustVS=`#version 300 es
precision highp float;layout(location=0) in vec3 aPos;uniform mat4 uVP;uniform float uTime;uniform vec3 uEye;out float vA;void main(){vec3 p=aPos;p.x+=sin(uTime*.3+aPos.z*.17)*.65;p.z+=cos(uTime*.42+aPos.x*.17)*.75;p.y=mod(p.y+uTime*.18,13.);gl_Position=uVP*vec4(p,1.);float d=distance(uEye,p);gl_PointSize=clamp(85./(d+7.),1.,3.8);vA=clamp(1.-d/55.,0.,.32);}`;
const dustFS=`#version 300 es
precision highp float;in float vA;out vec4 frag;void main(){float d=distance(gl_PointCoord,vec2(.5));if(d>.5)discard;frag=vec4(.98,.72,.52,(1.-smoothstep(.1,.5,d))*vA);}`;
function particles(gl){const r=rng(4101),v=[];for(let i=0;i<610;i++){v.push((r()-.5)*90,r()*13,(r()-.5)*85)}const vao=gl.createVertexArray();gl.bindVertexArray(vao);const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(v),gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,12,0);gl.bindVertexArray(null);const p=gl.createProgram();gl.attachShader(p,shader(gl,dustVS,gl.VERTEX_SHADER));gl.attachShader(p,shader(gl,dustFS,gl.FRAGMENT_SHADER));gl.linkProgram(p);return {vao,count:v.length/3,program:p,vp:gl.getUniformLocation(p,'uVP'),time:gl.getUniformLocation(p,'uTime'),eye:gl.getUniformLocation(p,'uEye')}}
const stations=[{id:'solar',x:-18,z:9,name:'Paneles solares',label:'Inspeccionar los paneles',y:3.7},{id:'regulator',x:-6,z:-10.3,name:'Regulador de energía',label:'Reparar el regulador',y:3.9},{id:'energy',x:5,z:-10,name:'Centro de energía',label:'Reasignar la energía',y:3.5},{id:'greenhouse',x:22,z:-15,name:'Invernadero',label:'Explorar los cultivos',y:3.5},{id:'habitat',x:0,z:-17,name:'Hábitat',label:'Explorar el hábitat',y:3.5}];
const interiorHotspots={
 habitat:[{id:'bunk',name:'Camas de la tripulación',x:-6.2,z:-2,detail:'Las literas permiten descansar tras una jornada de trabajo en Marte.'},{id:'medical',name:'Botiquín y soporte vital',x:6.2,z:-4.5,detail:'El equipo médico vigila la salud y la reserva de oxígeno.'}],
 greenhouse:[{id:'crops',name:'Cultivos hidropónicos',x:-6.2,z:0,detail:'Las plantas crecen con agua reciclada y luz controlada.'},{id:'water',name:'Circuito de agua',x:6.2,z:0,detail:'El agua se recupera y vuelve a circular por los cultivos.'}],
 solar:[{id:'array',name:'Matriz de paneles',x:-6.2,z:0,detail:'El polvo reduce la luz que llega a las celdas solares.'},{id:'battery',name:'Banco de baterías',x:6.2,z:0,detail:'Las baterías guardan energía para la noche marciana.'}],
 regulator:[{id:'cooling',name:'Refrigeración',x:-6.2,z:0,detail:'Los reguladores necesitan disipar calor para operar con seguridad.'},{id:'cables',name:'Cableado principal',x:6.2,z:0,detail:'El cableado lleva electricidad a los módulos habitables.'}],
 energy:[{id:'reserve',name:'Reserva de energía',x:-6.2,z:0,detail:'Una reserva estable protege el oxígeno durante una avería.'},{id:'distribution',name:'Distribución eléctrica',x:6.2,z:0,detail:'Cada sistema recibe una parte de la energía disponible.'}],
};
const interiorThemes={
 greenhouse:{floor:'#24342a',walk:'#18291e',seam:'#41634c',ceil:'#2c4234',wallZ:'#3e5746',wallX:'#344b3c',rib:'#5a7863',beam:'#4f6b58',light:'#d6ffd6',accent:'#7fe393',sky:'#386b58',camY:3.8,camX:1.4,zoom:6.8},
 habitat:{floor:'#35302d',walk:'#26211f',seam:'#61534c',ceil:'#453d38',wallZ:'#63564f',wallX:'#554943',rib:'#82736b',beam:'#70625a',light:'#ffebd2',accent:'#f0b97a',sky:'#8a523c',camY:2.85,camX:-1.1,zoom:5.4},
 solar:{floor:'#2d2a24',walk:'#211d17',seam:'#5e513b',ceil:'#3c3325',wallZ:'#574b38',wallX:'#4a3f2e',rib:'#7d6a4c',beam:'#6b5a40',light:'#ffe6a8',accent:'#ffc966',sky:'#9e6338',camY:3.4,camX:1.6,zoom:6.2},
 regulator:{floor:'#222e36',walk:'#162028',seam:'#3d5666',ceil:'#263844',wallZ:'#394f5c',wallX:'#2f434f',rib:'#587687',beam:'#496473',light:'#c7f3ff',accent:'#66e0f5',sky:'#5b3f44',camY:2.7,camX:1.0,zoom:5.8},
 energy:{floor:'#282636',walk:'#1c1a28',seam:'#4c4766',ceil:'#2f2b42',wallZ:'#433e59',wallX:'#38344c',rib:'#686185',beam:'#585173',light:'#e4d9ff',accent:'#a78bfa',sky:'#4b3b63',camY:3.5,camX:0.0,zoom:6.4},
};
function interiorWorld(gl,id){
 const b=new Builder(),t=interiorThemes[id]||interiorThemes.regulator,accent=t.accent;
 if(id==='greenhouse'){
  // Invernadero cinematográfico: pasillo central, cúpula de arcos naranjas y racks hidropónicos de 4 niveles.
  const ghRand=rng(55283);
  const lettuce=(x,y,z,size,tint)=>{
   beam(b,[x,y,z],[x,y+size*.6,z],.025*size,'#589a59',5,0,.1);
   const base=size*.23;
   for(let i=0;i<6;i++){
    const a=i*TAU/6,p0=[x,y+size*.08,z],mid=[x+Math.cos(a)*size*.34,y+size*(.48+.13*Math.sin(i*8.5)),z+Math.sin(a)*size*.34],tip=[x+Math.cos(a)*size*.57,y+size*.65,z+Math.sin(a)*size*.57];
    b.tri(p0,mid,tip,i%2?tint:'#56b86a',.04,.05,.68);
    b.tri(p0,tip,mid,i%2?'#2f854c':tint,.04,.05,.7);
   }
   sphere(b,[x,y+size*.4,z],base,size*.4,base,'#4eaa59',6,7,0,.25);
  };
  // Piso metálico amplio (26x24 m), pasillo central y tiras luminosas
  box(b,0,-.18,0,26,.35,24,'#3f4745',0,0,0,.65,.55);
  box(b,0,.02,0,6.2,.05,23.2,'#77705e',0,0,0,.6,.52);
  for(let x=-11;x<=11;x+=2.2)box(b,x,-.004,0,.05,.02,23.2,Math.abs(x)%4<1?'#a1957a':'#586160');
  for(let z=-10;z<=10;z+=2)box(b,0,.035,z,25.2,.022,.07,'#a5a18b',0,0,0,.4,.6);
  for(const x of [-3.2,3.2]){
   box(b,x,.05,0,.14,.04,22.4,'#e9ab57',0,0,.65,.5);
   box(b,x,.08,0,.045,.025,22.4,'#61d9d7',0,0,2.2,.2);
  }
  for(let z=-10;z<=10;z+=2.4){
   box(b,-3.55,.06,z,.22,.035,.8,'#edb04f',0,0,.35,.4);
   box(b,3.55,.06,z,.22,.035,.8,'#edb04f',0,0,.35,.4);
  }
  // Cúpula con arcos estructurales naranjas, largueros y luminarias superiores
  for(let z=-11;z<=11;z+=4.4){
   let prev=null;
   for(let i=0;i<=18;i++){
    const ang=-Math.PI/2+i*Math.PI/18,p=[Math.sin(ang)*12.4,2.4+Math.cos(ang)*5.8,z];
    if(prev)beam(b,prev,p,.17,Math.round(z)%2?'#e38443':'#b85b35',8);
    prev=p;
   }
   for(const sx of [-12.2,12.2])box(b,sx,1.5,z,.34,3.1,.34,'#9a5d43');
   box(b,0,8.05,z,2.5,.18,.48,'#f1c06b',0,0,0,.4);
   box(b,0,7.92,z,2.3,.07,.36,'#fff0c3',0,0,2.1,.1);
  }
  for(let i=-6;i<=6;i++){
   const ang=i*Math.PI/14,x=12.35*Math.sin(ang),y=2.4+5.8*Math.cos(ang);
   beam(b,[x,y,-12],[x,y,12],.10,'#8c9d96',7);
  }
  // Muros de fondo/frente y paisaje marciano visible tras las costillas
  box(b,0,4.2,-12.1,26,8.6,.4,'#2d4239');
  box(b,0,4.2,12.1,26,8.6,.4,'#2d4239');
  for(const sx of [-12.75,12.75]){
   box(b,sx,4.3,0,.15,8.4,24.4,'#4f6b5a',0,0,.15);
   box(b,sx*.98,.65,0,.38,1.3,24,'#3e4c45');
  }
  for(let x of [-12.2,12.2])for(let z=-10;z<=10;z+=3.2){
   box(b,x,1.35,z,.42,.18,2.4,'#eeb44e',0,0,.22,.48);
   box(b,x,2.25,z,.12,2.0,.15,'#a7754d');
  }
  // Esclusa de salida (z = 11.7)
  box(b,0,1.55,11.72,3.6,3.1,.25,'#253235');
  box(b,0,3.35,11.55,3.5,.24,.2,accent,0,0,1.2);
  for(const x of [-1.55,1.55])box(b,x,1.5,11.56,.16,2.7,.16,'#b8cbc6');
  box(b,0,1.4,11.62,2.6,2.4,.12,'#192326');
  // Consola principal de comando (z = -8.8)
  box(b,0,1.25,-8.8,5.2,2.3,1.5,'#354346');
  box(b,0,2.2,-7.98,4.4,1.15,.12,'#113744',0,0,.5);
  box(b,0,2.24,-7.9,3.5,.68,.06,accent,0,0,1.8);
  for(const x of [-1.7,-.9,.9,1.7])box(b,x,1.08,-7.98,.38,.12,.14,'#e1b676',0,0,1.2);
  for(const side of [-1,1])box(b,side*3.3,1.8,-9.2,1.1,3.4,1.2,'#3c4749');
  // Racks hidropónicos de 4 niveles con luces LED de cultivo, tubería de riego y lechugas 3D
  for(const side of [-1,1]){
   const rx=side*8.9;
   for(const rz of [-6.0,-1.5,3.0,7.5]){
    for(let level=0;level<4;level++){
     const y=.62+level*1.22;
     box(b,rx,y,rz,3.9,.13,3.5,'#aaa995',0,0,0,.7);
     box(b,rx,y+.15,rz,3.65,.28,3.2,'#4d6663',0,0,0,.34);
     box(b,rx,y+.31,rz,3.4,.1,3.0,'#30483a',0,0,0,.12);
     box(b,rx,y+1.0,rz,3.5,.08,3.1,'#e9d7b0',0,0,1.55,.28);
     box(b,rx,y+.95,rz,3.3,.04,3.0,'#e6c581',0,0,1.8,.22);
     for(const dx of [-1.68,1.68])for(const dz of [-1.45,1.45])box(b,rx+dx,y+.42,rz+dz,.09,1.05,.09,'#e1a44d');
     beam(b,[rx-side*1.55,y+.32,rz-1.45],[rx-side*1.55,y+.32,rz+1.45],.042,'#36a9ae',6);
     for(let ix=0;ix<3;ix++)for(let iz=0;iz<3;iz++){
      const lx=rx-1.05+ix*1.05,lz=rz-1.0+iz*1.0;
      const size=.48+ghRand()*.2;
      lettuce(lx,y+.37,lz,size,iz%2?'#56c15b':'#79dc6b');
     }
    }
   }
  }
  // Tanques de agua reciclada y frascos de nutrientes junto a la cabecera
  for(const x of [-6.5,-5.5]){
   beam(b,[x,0,-9.6],[x,2.9,-9.6],.34,'#719d9f',12);
   beam(b,[x,2.3,-9.6],[x,2.65,-9.6],.38,'#95c5c1',12);
   sphere(b,[x,2.95,-9.6],.44,.15,.44,'#bcc9bd',7,12);
  }
  for(let i=0;i<6;i++){
   const nx=5.4+(i%3)*.48,nz=-9.8+Math.floor(i/3)*.55;
   beam(b,[nx,1.2,-9.6+Math.floor(i/3)*.55],[nx,2.0,-9.6+Math.floor(i/3)*.55],.13,i%2?'#b2c86d':'#73dada',10,0,.3);
   box(b,nx,1.98,nz,.28,.08,.28,'#dcd8b4',0,0,0,.6);
  }
  return b.build(gl);
 }
 // Piso metálico amplio (26x24 m) con paleta propia del módulo
 box(b,0,-.18,0,26,.35,24,t.floor);
 box(b,0,.01,0,6.4,.04,22.2,t.walk);
 for(const side of [-1,1])box(b,side*3.25,.02,0,.1,.04,21.6,accent,0,0,1.05);
 for(const z of [-9,-6,-3,0,3,6,9])box(b,0,.015,z,25.2,.025,.06,t.seam);
 // Techo alto (7.2 m), vigas estructurales y luminarias propias
 box(b,0,7.35,0,26,.35,24,t.ceil);
 for(const z of [-12,12])box(b,0,3.6,z,26,7.2,.4,t.wallZ);
 for(const x of [-13,13])box(b,x,3.6,0,.4,7.2,24,t.wallX);
 for(const z of [-8,-4,0,4,8]){
  for(const side of [-1,1]){
   box(b,side*12.6,3.6,z,.45,7.1,.55,t.rib);
   beam(b,[side*12.5,5.8,z],[side*8.5,7.05,z],.22,t.beam);
   box(b,side*12.48,4.6,z,.14,.14,2.8,accent,0,0,1.25);
  }
  box(b,0,7.08,z,22,.22,.32,t.beam);
  for(const lx of [-5.5,0,5.5])box(b,lx,6.92,z,2.8,.1,.52,t.light,0,0,1.75);
 }
 // Conductos superiores y ventanales panorámicos hacia Marte
 for(const x of [-4.2,4.2])beam(b,[x,6.65,-11.4],[x,6.65,11.4],.16,t.rib);
 for(const side of [-1,1]){
  box(b,side*12.74,3.3,2,.12,2.6,6.8,t.walk);
  box(b,side*12.68,3.65,2,.08,1.9,6.2,t.sky,0,0,.45);
  box(b,side*12.66,2.65,2,.08,.75,6.2,t.floor,0,0,.35);
  for(const mz of [-.2,2,4.2])box(b,side*12.62,3.3,mz,.12,2.55,.14,t.rib);
  box(b,side*12.65,.6,-6.2,.24,.8,4.8,t.ceil);
 }
 // Esclusa de salida (z = 11.7)
 box(b,0,1.55,11.72,3.6,3.1,.25,'#253235');
 box(b,0,3.35,11.55,3.5,.24,.2,accent,0,0,1.2);
 for(const x of [-1.55,1.55])box(b,x,1.5,11.56,.16,2.7,.16,'#b8cbc6');
 box(b,0,1.4,11.62,2.6,2.4,.12,'#192326');
 // Consola principal de comando (z = -8.5)
 box(b,0,1.25,-8.8,5.2,2.3,1.5,'#354346');
 box(b,0,2.2,-7.98,4.4,1.15,.12,'#113744',0,0,.5);
 box(b,0,2.24,-7.9,3.5,.68,.06,accent,0,0,1.8);
 for(const x of [-1.7,-.9,.9,1.7])box(b,x,1.08,-7.98,.38,.12,.14,'#e1b676',0,0,1.2);
 for(const side of [-1,1])box(b,side*3.3,1.8,-9.2,1.1,3.4,1.2,'#3c4749');
 if(id==='greenhouse'){
  for(const x of [-9.1,9.1]){
   box(b,x,.68,-1,3.8,1.2,13.5,'#455649');
   for(const z of [-6,-3,0,3,6]){
    beam(b,[x,.95,z],[x,2.35,z],.11,'#618065');
    sphere(b,[x,2.55,z],1.05,.95,1.05,'#5fa35a',7,9);
    box(b,x,3.8,z,2.4,.08,.45,'#c7f3c1',0,0,1.45);
   }
  }
  for(const x of [-9.1,9.1])box(b,x,3.8,-11.7,4.2,1.8,.15,'#578386',0,0,.3);
 }else if(id==='habitat'){
  for(const x of [-9.3,9.3]){
   box(b,x,.55,-2.5,3.4,.85,4.2,'#9ba49f');box(b,x,1.04,-2.5,3.1,.14,3.8,'#dcd9ca');
   box(b,x,1.15,-3.7,1.6,.2,.72,'#cde0d6');box(b,x,1.6,-2.1,2.8,.5,2.1,'#5d7677');
   box(b,x,2.15,-6.4,3.2,2.4,.9,'#435353');box(b,x,3.15,-5.92,2.4,.22,.08,accent,0,0,1.3);
   box(b,x,2.6,4.2,3.1,4.6,1.6,'#616c6a');for(let j=0;j<3;j++)box(b,x,3.6-j*1.1,3.38,2.3,.16,.08,'#b5c8c4',0,0,.85);
  }
  box(b,0,.78,1,3.6,1.25,1.8,'#5e6865');box(b,0,1.45,1,3.8,.1,2.0,'#c6d0c4');
  for(const x of [-2.7,2.7]){box(b,x,.68,1,1.2,.95,1.3,'#4a5655');box(b,x,1.22,1,1.35,.14,1.45,'#8ea1a0')}
  for(const x of [-9.5,9.5]){box(b,x,.6,-8.2,1.2,1.2,1.2,'#758379');beam(b,[x,1.2,-8.2],[x,2.3,-8.2],.09,'#74986d');sphere(b,[x,2.6,-8.2],.62,.68,.62,'#6e9969',7,9)}
 }else if(id==='solar'){
  for(const x of [-9.1,9.1])for(const z of [-5.2,-.4,4.4]){
   box(b,x,1.4,z,3.1,2.7,2.5,'#4e5659');
   box(b,x,1.9,z-1.3,2.5,1.1,.1,'#204452',0,0,.35);
   box(b,x,2.72,z-1.3,2.3,.14,.1,accent,0,0,1.45);
   for(let j=0;j<3;j++)box(b,x-.7+j*.7,.75,z-1.3,.38,.55,.08,'#f2c572',0,0,1.1);
  }
 }else{
  for(const x of [-9.1,9.1])for(const z of [-5.4,-.2,5]){
   box(b,x,1.85,z,2.9,3.6,2.3,'#5a6362');
   box(b,x,2.5,z-1.2,2.1,1.2,.12,'#21414b',0,0,.4);
   box(b,x,.55,z-1.22,1.8,.16,.1,accent,0,0,1.5);
   beam(b,[x-1.5,3.5,z],[x-1.5,6.5,z],.14,'#7a8789');
  }
  for(const x of [-5.8,5.8])beam(b,[x,6.35,-10],[x,6.35,10],.14,'#9da59b');
 }
 return b.build(gl);
}
function createDemo(canvas,handlers={}){
 const gl=canvas.getContext('webgl2',{alpha:true,antialias:true,powerPreference:'high-performance'});if(!gl)throw Error('Este navegador no dispone de WebGL 2.');
 const scene=compileWorld(gl),interiors=Object.fromEntries(stations.map(s=>[s.id,interiorWorld(gl,s.id)])),shaderProgram=makeProgram(gl),dust=particles(gl);
 const loc={vp:gl.getUniformLocation(shaderProgram,'uVP'),model:gl.getUniformLocation(shaderProgram,'uModel'),eye:gl.getUniformLocation(shaderProgram,'uEye'),storm:gl.getUniformLocation(shaderProgram,'uStorm'),glass:gl.getUniformLocation(shaderProgram,'uGlass'),interior:gl.getUniformLocation(shaderProgram,'uInterior'),time:gl.getUniformLocation(shaderProgram,'uTime')};
   const state={pos:[0,0,19],yaw:0,avatarYaw:0,pitch:0,camera:'third',skin:'explorer',storm:0,stormTarget:0,walk:0,walkAmp:0,moving:false,jumpHeight:0,jumpVelocity:0,active:false,keys:new Set(),zoom:9.5,paused:false,interior:null,outside:null};
 const eye=[5,6,35],target=[0,2,0],projection=mat4(),view=mat4(),vp=mat4(),model=mat4(),legModel=mat4(),legSwing=mat4(),id=identity(mat4());let frame=0,old=performance.now(),raf=0,lastEmit=0,lastPerf=performance.now(),fps=60,frames=0;
 function rescale(){const dpr=Math.min(window.devicePixelRatio||1,1.5),w=Math.max(1,Math.floor(canvas.clientWidth*dpr)),h=Math.max(1,Math.floor(canvas.clientHeight*dpr));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}gl.viewport(0,0,w,h);return [canvas.clientWidth,canvas.clientHeight];}
 function renderMesh(mesh,mat,glass=0){gl.uniformMatrix4fv(loc.model,false,mat);gl.uniform1f(loc.glass,glass);gl.bindVertexArray(mesh.vao);gl.drawArrays(gl.TRIANGLES,0,mesh.count)}
 function nearest(){if(state.interior){const station=stations.find(s=>s.id===state.interior),targets=[{id:'exit',name:'Salir a la colonia',x:0,z:9.5},{id:'console',name:'Consola principal',x:0,z:-7.2},...interiorHotspots[state.interior]];let target=null,dist=1e5;for(const item of targets){const d=Math.hypot(item.x-state.pos[0],item.z-state.pos[2]);if(d<dist){dist=d;target=item}}return {station,target,dist,inside:true,atExit:target.id==='exit'&&dist<2.5}}let out=null,dist=1e5;for(const s of stations){const d=Math.hypot(s.x-state.pos[0],s.z-state.pos[2]);if(d<dist){dist=d;out=s}}return {station:out,dist,robot:nearbyRobot(state.pos[0],state.pos[2]),inside:false}}
 function enter(id){const s=stations.find(item=>item.id===id);if(!s||state.interior||Math.hypot(s.x-state.pos[0],s.z-state.pos[2])>5.7)return false;state.outside={pos:[...state.pos],yaw:state.yaw,avatarYaw:state.avatarYaw,camera:state.camera};state.interior=id;state.pos=[0,0,8.2];state.yaw=0;state.avatarYaw=0;state.pitch=0;state.jumpHeight=state.jumpVelocity=0;stopInput();const t=interiorThemes[id]||interiorThemes.regulator;if(state.camera==='first'){eye[0]=0;eye[1]=1.9;eye[2]=8.2;target[0]=0;target[1]=1.9;target[2]=-2}else{eye[0]=t.camX;eye[1]=t.camY;eye[2]=10.8;target[0]=0;target[1]=1.85;target[2]=3.2}return true}
 function leave(){if(!state.interior)return false;state.interior=null;state.pos=[...state.outside.pos];state.yaw=state.outside.yaw;state.avatarYaw=state.outside.avatarYaw;state.camera=state.outside.camera;state.outside=null;state.jumpHeight=state.jumpVelocity=0;stopInput();return true}
 function snapshot(){return {pos:[...state.pos],yaw:state.yaw,avatarYaw:state.avatarYaw,pitch:state.pitch,camera:state.camera,skin:state.skin,zoom:state.zoom,storm:state.storm,stormTarget:state.stormTarget,interior:state.interior,outside:state.outside?{...state.outside,pos:[...state.outside.pos]}:null}}
 function restore(saved){
  if(!saved||!Array.isArray(saved.pos)||saved.pos.length!==3||!saved.pos.every(Number.isFinite)||!Number.isFinite(saved.yaw)||!Number.isFinite(saved.avatarYaw)||!Number.isFinite(saved.pitch))return false;
  const interior=stations.some(s=>s.id===saved.interior)?saved.interior:null;
  if(interior&&(!saved.outside||!Array.isArray(saved.outside.pos)||saved.outside.pos.length!==3||!saved.outside.pos.every(Number.isFinite)))return false;
  state.interior=interior;state.outside=interior?{pos:[clamp(saved.outside.pos[0],-53,53),0,clamp(saved.outside.pos[2],-48,42)],yaw:Number.isFinite(saved.outside.yaw)?saved.outside.yaw:0,avatarYaw:Number.isFinite(saved.outside.avatarYaw)?saved.outside.avatarYaw:0,camera:saved.outside.camera==='first'?'first':'third'}:null;
  state.pos=[clamp(saved.pos[0],interior?-11.8:-53,interior?11.8:53),0,clamp(saved.pos[2],interior?-10.8:-48,interior?10.8:42)];
  state.yaw=saved.yaw;state.avatarYaw=saved.avatarYaw;state.pitch=clamp(saved.pitch,-.32,.43);state.camera=saved.camera==='first'?'first':'third';state.skin='explorer';state.zoom=clamp(Number.isFinite(saved.zoom)?saved.zoom:9.5,5.8,17);
  state.storm=clamp(Number.isFinite(saved.storm)?saved.storm:0,0,1);state.stormTarget=saved.stormTarget?1:0;state.jumpHeight=state.jumpVelocity=0;state.pos[1]=interior?0:height(state.pos[0],state.pos[2]);stopInput();
  const fx=Math.sin(state.yaw),fz=-Math.cos(state.yaw),y=state.pos[1],fp=state.camera==='first';
  const restoredEye=fp?[state.pos[0],y+1.9,state.pos[2]]:[state.pos[0]-fx*state.zoom+2,y+4.2+state.zoom*.13,state.pos[2]-fz*state.zoom+1.2];
  const restoredTarget=fp?[state.pos[0]+fx*10,y+1.9+state.pitch*9,state.pos[2]+fz*10]:[state.pos[0]+fx*9,y+2.1+state.pitch*5,state.pos[2]+fz*9];
  for(let i=0;i<3;i++){eye[i]=restoredEye[i];target[i]=restoredTarget[i]}old=performance.now();return true;
 }
 function interiorBlocked(x,z,r=.55){if(Math.abs(x)>12.6-r||Math.abs(z)>11.5-r)return true;if(Math.abs(x)<2.6+r&&z<-6.8+r)return true;if(state.interior==='habitat'&&Math.abs(x)<2.3+r&&Math.abs(z-1)<1.1+r)return true;if(Math.abs(x)>6.2-r&&z>-8.5-r&&z<7.5+r)return true;return false}
 function update(now){if(!state.active){old=now;raf=requestAnimationFrame(update);return;}const dt=Math.min((now-old)/1000,.045);old=now;frame+=dt;rescale();
   state.moving=false;
   if(!state.paused){
   if(!state.interior)updatePatrols(dt,state.pos[0],state.pos[2]);
   const f=[Math.sin(state.yaw),-Math.cos(state.yaw)],r=[Math.cos(state.yaw),Math.sin(state.yaw)];let forward=(state.keys.has('KeyW')||state.keys.has('ArrowUp')?1:0)-(state.keys.has('KeyS')||state.keys.has('ArrowDown')?1:0),strafe=(state.keys.has('KeyD')||state.keys.has('ArrowRight')?1:0)-(state.keys.has('KeyA')||state.keys.has('ArrowLeft')?1:0);
    if(forward||strafe){const l=Math.hypot(forward,strafe),speed=state.keys.has('ShiftLeft')?7.8:5.1;const dx=(f[0]*forward+r[0]*strafe)/l*speed*dt,dz=(f[1]*forward+r[1]*strafe)/l*speed*dt;
     const next=state.interior?(()=>{const nx=state.pos[0]+dx,nz=state.pos[2]+dz;return {x:interiorBlocked(nx,state.pos[2])?state.pos[0]:nx,z:interiorBlocked(interiorBlocked(nx,state.pos[2])?state.pos[0]:nx,nz)?state.pos[2]:nz}})():resolveMove(state.pos[0],state.pos[2],dx,dz);
     const movedX=next.x-state.pos[0],movedZ=next.z-state.pos[2];
     if(movedX||movedZ){state.pos[0]=next.x;state.pos[2]=next.z;state.walk+=dt*9;state.moving=true;const desired=Math.atan2(movedX,-movedZ),turn=Math.atan2(Math.sin(desired-state.avatarYaw),Math.cos(desired-state.avatarYaw));state.avatarYaw+=clamp(turn,-dt*11,dt*11);}
   }
    if(state.jumpHeight>0||state.jumpVelocity>0){
     state.jumpVelocity-=17*dt;
     state.jumpHeight=Math.max(0,state.jumpHeight+state.jumpVelocity*dt);
     if(state.jumpHeight===0)state.jumpVelocity=0;
    }
   state.walkAmp=mix(state.walkAmp,state.moving?1:0,clamp(dt*12,0,1));
   state.storm=mix(state.storm,state.stormTarget,Math.min(1,dt*.65));
   if(state.eatTimer>0){state.eatTimer=Math.max(0,state.eatTimer-dt);if(state.eatTimer===0){state.heldFood=null;handlers.onEatDone?.()}}
  }
   const y=(state.interior?0:height(state.pos[0],state.pos[2]))+state.jumpHeight;state.pos[1]=y;
  const fx=Math.sin(state.yaw),fz=-Math.cos(state.yaw);const fp=state.camera==='first',theme=state.interior?(interiorThemes[state.interior]||interiorThemes.regulator):null;
  const zoom=theme?Math.min(state.zoom,theme.zoom):state.zoom;
  const eyeWant=fp?[state.pos[0],y+1.9,state.pos[2]]:theme?[clamp(state.pos[0]-fx*zoom+theme.camX,-11.8,11.8),Math.min(5.9,y+theme.camY),clamp(state.pos[2]-fz*zoom,-10.8,10.8)]:[state.pos[0]-fx*zoom+2.0,y+4.2+zoom*.13,state.pos[2]-fz*zoom+1.2];
  const targetWant=fp?[state.pos[0]+fx*10,y+1.9+state.pitch*9,state.pos[2]+fz*10]:theme?[state.pos[0]+fx*5.0,y+1.85+state.pitch*4,state.pos[2]+fz*5.0]:[state.pos[0]+fx*9,y+2.1+state.pitch*5,state.pos[2]+fz*9];
  for(let i=0;i<3;i++){eye[i]=mix(eye[i],eyeWant[i],clamp(dt*5.8,0,1));target[i]=mix(target[i],targetWant[i],clamp(dt*6.7,0,1));}
  perspective(projection,Math.PI/3.2,canvas.width/canvas.height,.08,410);lookAt(view,eye,target);multiply(vp,projection,view);
  gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);
  gl.useProgram(shaderProgram);gl.uniformMatrix4fv(loc.vp,false,vp);gl.uniform3f(loc.eye,...eye);gl.uniform1f(loc.storm,state.storm);gl.uniform1f(loc.interior,state.interior?1:0);gl.uniform1f(loc.time,frame);
  if(!state.interior){modelAt(model,state.pos[0],0,state.pos[2],0,0);renderMesh(scene.sky,model)}
  renderMesh(state.interior?interiors[state.interior]:scene.world,id);
  if(!state.interior)for(const craft of saucers){const t=frame*craft.speed+craft.phase;modelAt(model,craft.x+Math.sin(t)*5,craft.y+Math.sin(frame*1.2+craft.phase)*.5,craft.z+Math.cos(t)*3,t*.45,0);renderMesh(scene.saucer.body,model)}
  if(state.interior==='greenhouse')for(const [rx,rz,ryaw,rcargo,rphase] of [[2.1,-4.2,2.65,'plant',0],[-2.1,-0.8,0.85,'crate',1.8]]){
   const bob=Math.sin(frame*1.8+rphase)*.015;
   modelAt(model,rx,0,rz,ryaw,bob);renderMesh(scene.robotBody,model);
   if(scene.robotCargos[rcargo]){modelAt(model,rx,0,rz,ryaw,bob);renderMesh(scene.robotCargos[rcargo],model);}
   for(const [mesh,pivotY,angle] of [[scene.robotLeftLeg,.95,0],[scene.robotRightLeg,.95,0],[scene.robotLeftArm,1.72,.52],[scene.robotRightArm,1.72,.52]]){
    modelAt(model,rx,pivotY,rz,ryaw,bob);
    identity(legSwing);legSwing[5]=Math.cos(angle);legSwing[6]=Math.sin(angle);legSwing[9]=-Math.sin(angle);legSwing[10]=Math.cos(angle);
    multiply(legModel,model,legSwing);renderMesh(mesh,legModel);
   }
  }
  if(!state.interior)for(const robot of patrols){
   const ground=height(robot.x,robot.z),bob=robot.moving?Math.abs(Math.sin(robot.walk))*.035:0;
   modelAt(model,robot.x,ground,robot.z,robot.yaw,bob);renderMesh(scene.robotBody,model);
   if(robot.cargo){
    const carryBob=bob+(robot.moving?Math.sin(robot.walk*2)*.02:0);
    modelAt(model,robot.x,ground,robot.z,robot.yaw,carryBob);renderMesh(scene.robotCargos[robot.cargo],model);
   }
   for(const [mesh,pivotY,angle] of [
    [scene.robotLeftLeg,.95,robot.moving?Math.sin(robot.walk)*.42:0],
    [scene.robotRightLeg,.95,robot.moving?-Math.sin(robot.walk)*.42:0],
    [scene.robotLeftArm,1.72,robot.moving?.55+Math.sin(robot.walk)*.22:.45],
    [scene.robotRightArm,1.72,robot.moving?.55-Math.sin(robot.walk)*.22:.45],
   ]){
    modelAt(model,robot.x,ground+pivotY,robot.z,robot.yaw,bob);
    identity(legSwing);legSwing[5]=Math.cos(angle);legSwing[6]=Math.sin(angle);legSwing[9]=-Math.sin(angle);legSwing[10]=Math.cos(angle);
    multiply(legModel,model,legSwing);renderMesh(mesh,legModel);
   }
  }
   const pEat=state.eatTimer>0?1-state.eatTimer/1.8:0;
   const biteScale=state.eatTimer>0?(pEat<.2?1.2:Math.max(.02,1.2*(1-(pEat-.2)/.78))):1.2;
   const foodLocal=mat4(),foodModel=mat4();
   identity(foodLocal);
   foodLocal[0]=biteScale;foodLocal[5]=biteScale;foodLocal[10]=biteScale;
   foodLocal[12]=.92*(1-biteScale);foodLocal[13]=-.76*(1-biteScale);foodLocal[14]=-.44*(1-biteScale);
   if(!fp){
    const av=scene.getAvatar(state.skin),wobble=Math.abs(Math.sin(state.walk))*.065*state.walkAmp,swing=Math.sin(state.walk)*.52*state.walkAmp;
    let rightArmAngle=swing*.85;
    if(state.eatTimer>0){const lift=Math.min(1,pEat*4,(1-pEat)*4);rightArmAngle=mix(rightArmAngle,1.88+Math.sin(pEat*Math.PI*6)*.16,lift)}else if(state.heldFood){rightArmAngle=.48+swing*.35}
    modelAt(model,state.pos[0],y,state.pos[2],state.avatarYaw,wobble);renderMesh(av.body,model);
    for(const [mesh,pivotY,angle,isRightArm] of [[av.leftLeg,.8,swing,false],[av.rightLeg,.8,-swing,false],[av.leftArm,1.7,-swing*.85,false],[av.rightArm,1.7,rightArmAngle,true]]){
     modelAt(model,state.pos[0],y+pivotY,state.pos[2],state.avatarYaw,wobble);
     identity(legSwing);legSwing[5]=Math.cos(angle);legSwing[6]=Math.sin(angle);legSwing[9]=-Math.sin(angle);legSwing[10]=Math.cos(angle);
     multiply(legModel,model,legSwing);renderMesh(mesh,legModel);
     if(isRightArm&&state.heldFood&&scene.foodMeshes[state.heldFood]&&biteScale>.04){multiply(foodModel,legModel,foodLocal);renderMesh(scene.foodMeshes[state.heldFood],foodModel)}
    }
   }else if(state.heldFood&&scene.foodMeshes[state.heldFood]&&biteScale>.04){
    const av=scene.getAvatar(state.skin),lift=state.eatTimer>0?Math.min(1,pEat*4,(1-pEat)*4):0;
    const chew=state.eatTimer>0?Math.sin(pEat*Math.PI*6)*.06:0;
    const armYaw=-state.yaw;
    const fwdDist=.95-lift*.42,sideOff=.18-lift*.22,upOff=-.05+lift*.32+chew;
    const rx=Math.cos(state.yaw),rz=Math.sin(state.yaw);
    modelAt(model,eye[0]+fx*fwdDist+rx*sideOff,eye[1]+upOff,eye[2]+fz*fwdDist+rz*sideOff,armYaw,0);
    const armAngle=1.18+lift*.62+chew*1.5;
    identity(legSwing);legSwing[5]=Math.cos(armAngle);legSwing[6]=Math.sin(armAngle);legSwing[9]=-Math.sin(armAngle);legSwing[10]=Math.cos(armAngle);
    multiply(legModel,model,legSwing);renderMesh(av.rightArm,legModel);
    multiply(foodModel,legModel,foodLocal);renderMesh(scene.foodMeshes[state.heldFood],foodModel);
   }
  if(!state.interior){gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);gl.disable(gl.CULL_FACE);renderMesh(scene.glass,id,1);
  for(const craft of saucers){const t=frame*craft.speed+craft.phase;modelAt(model,craft.x+Math.sin(t)*5,craft.y+Math.sin(frame*1.2+craft.phase)*.5,craft.z+Math.cos(t)*3,t*.45,0);renderMesh(scene.saucer.glass,model,1)}
  gl.useProgram(dust.program);gl.uniformMatrix4fv(dust.vp,false,vp);gl.uniform1f(dust.time,frame);gl.uniform3f(dust.eye,...eye);gl.bindVertexArray(dust.vao);gl.drawArrays(gl.POINTS,0,dust.count);gl.depthMask(true);gl.disable(gl.BLEND);}
  frames++;if(now-lastPerf>850){fps=Math.round(frames*1000/(now-lastPerf));frames=0;lastPerf=now;}
  if(now-lastEmit>120){const near=nearest(),projected={},skyMarkers=[];if(!state.interior){for(const s of stations)projected[s.id]=project([s.x,s.y,s.z],vp,[canvas.clientWidth,canvas.clientHeight]);for(const body of skyBodies)skyMarkers.push({name:body.name,...project([state.pos[0]+body.x,body.y+body.r+2,state.pos[2]+body.z],vp,[canvas.clientWidth,canvas.clientHeight])});for(const craft of saucers){const t=frame*craft.speed+craft.phase;skyMarkers.push({name:'Platillo · ficción',...project([craft.x+Math.sin(t)*5,craft.y+3,craft.z+Math.cos(t)*3],vp,[canvas.clientWidth,canvas.clientHeight])})}}handlers.onTick?.({nearest:near,markers:projected,skyMarkers,pos:[...state.pos],view:state.camera,storm:state.storm,fps,interior:state.interior,discoveryMarker:(()=>{const location=window.MarsDiscovery?.locations[state.interior],target=interiorHotspots[state.interior]?.find(target=>target.id===location?.targetId);return target?project([target.x,2.9,target.z],vp,[canvas.clientWidth,canvas.clientHeight]):null})()});lastEmit=now;}
  raf=requestAnimationFrame(update);
 }
 const movementKeys=['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft'];
 function keydown(e){if(!state.active||e.ctrlKey||e.metaKey||e.altKey)return;if(state.paused&&e.code!=='Escape')return;if([...movementKeys,'Space','KeyV','KeyE','KeyP','Tab','Escape'].includes(e.code))e.preventDefault();if(e.code==='KeyV'&&!e.repeat){state.camera=state.camera==='third'?'first':'third';handlers.onCamera?.(state.camera)}if(e.code==='KeyE'&&!e.repeat)handlers.onInteract?.(nearest());if(e.code==='Escape'&&!e.repeat)handlers.onEscape?.();if((e.code==='KeyP'||e.code==='Tab')&&!e.repeat)handlers.onPanel?.();if(e.code==='Space'&&!e.repeat&&state.jumpHeight===0&&state.jumpVelocity===0)state.jumpVelocity=6.8;if(movementKeys.includes(e.code))state.keys.add(e.code)}
 function keyup(e){state.keys.delete(e.code)}
 function stopInput(){state.keys.clear();state.moving=false}
 function onVisibilityChange(){if(document.hidden)stopInput()}
 window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);window.addEventListener('blur',stopInput);document.addEventListener('visibilitychange',onVisibilityChange);
 let dragging=false,lastX=0,lastY=0;canvas.addEventListener('pointerdown',e=>{dragging=true;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture(e.pointerId)});canvas.addEventListener('pointermove',e=>{if(!dragging||state.paused)return;state.yaw+=(e.clientX-lastX)*.005;state.pitch=clamp(state.pitch+(e.clientY-lastY)*.003,-.32,.43);lastX=e.clientX;lastY=e.clientY});canvas.addEventListener('pointerup',()=>dragging=false);canvas.addEventListener('pointercancel',()=>dragging=false);canvas.addEventListener('wheel',e=>{e.preventDefault();state.zoom=clamp(state.zoom+e.deltaY*.012,5.8,17)},{passive:false});
 raf=requestAnimationFrame(update);
  return {start(){stopInput();state.active=true;state.paused=false;old=performance.now()},pause(v){state.paused=v;if(v)stopInput()},getState(){return state},snapshot,restore,setSkin(id){if(!skinCatalog.some(s=>s.id===id))return false;state.skin=id;return true},setHeldFood(id){state.heldFood=id||null;state.eatTimer=0},triggerEat(){if(!state.heldFood||state.eatTimer>0)return false;state.eatTimer=1.8;return true},enter,leave,toggleCamera(){state.camera=state.camera==='third'?'first':'third';handlers.onCamera?.(state.camera)},getNearest:nearest,goTo(id){const s=stations.find(s=>s.id===id);if(s&&!state.interior)state.yaw=Math.atan2(s.x-state.pos[0],state.pos[2]-(s.z+2))},setStorm(v){state.stormTarget=v?1:0},press(code,on){if(on&&movementKeys.includes(code))state.keys.add(code);else state.keys.delete(code)},destroy(){cancelAnimationFrame(raf);stopInput();window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);window.removeEventListener('blur',stopInput);document.removeEventListener('visibilitychange',onVisibilityChange)} };
}
 window.MarsGfx={createDemo,stations,skins:skinCatalog,resolveMove,blocked,patrols,nearbyRobot};
})();
