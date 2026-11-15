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
function blocked(x,z,r=.55){
 for(const b of solidBoxes)if(Math.abs(x-b.x)<b.w+r&&Math.abs(z-b.z)<b.d+r)return true;
 for(const c of solidCircles)if(Math.hypot(x-c.x,z-c.z)<c.r+r)return true;
 for(const c of rocks)if(Math.hypot(x-c.x,z-c.z)<c.r+r)return true;
 return false;
}
function resolveMove(x,z,dx,dz,r=.55){
 const nx=clamp(x+dx,-53,53),nz=clamp(z+dz,-48,42);
 if(!blocked(nx,nz,r))return {x:nx,z:nz};
 // Separar los ejes permite deslizarse junto a una pared o una roca.
 const sx=blocked(nx,z,r)?x:nx;
 const sz=blocked(sx,nz,r)?z:nz;
 return {x:sx,z:sz};
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
function astronaut(b){
 // Adult scale ~2.3 m; original chunky suit silhouette.
 box(b,0,1.06,.35,1.1,1.32,.57,'#575954',0,0,0,.35);
 box(b,0,1.14,.76,.89,.98,.34,'#777367');
 sphere(b,[0,1.53,0],.66,.77,.44,'#bbb8ab',9,12,0,.3);
 sphere(b,[0,2.19,-.04],.44,.48,.43,'#d4d1c2',10,12,0,.3);
 sphere(b,[0,2.22,-.36],.34,.3,.18,'#1a3c45',8,12,.23,.6);
 box(b,0,2.14,.51,.68,.18,.2,'#a49c84');
 for(let s of [-1,1]){
  beam(b,[s*.7,1.7,0],[s*.9,.85,-.02],.26,'#bcb4a3',9);
  sphere(b,[s*.87,.84,-.07],.27,.22,.27,'#8f8981',8,9);
  beam(b,[s*.29,.8,0],[s*.33,.21,0],.29,'#b9b5a8',10);
  box(b,s*.33,.18,-.11,.55,.35,.92,'#504e4b');
 }
 box(b,0,1.42,-.47,.6,.18,.1,'#87c2c0',0,0,.95);
}
 function compileWorld(gl){rocks.length=0;const b=new Builder(),g=new Builder();environment(b);habitat(b);greenhouse(b,g);solarField(b);regulator(b);distribution(b);tower(b);serviceBuildings(b);smallDetails(b);
 const avatar=new Builder();astronaut(avatar);
 return {world:b.build(gl),glass:g.build(gl),astronaut:avatar.build(gl)};
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
in vec3 vPos;in vec3 vNormal;in vec3 vColor;in vec3 vExtra;in float vDist;uniform vec3 uEye;uniform float uStorm;uniform float uGlass;uniform float uTime;out vec4 frag;
float hash31(vec3 p){return fract(sin(dot(p,vec3(27.12,93.43,11.52)))*43758.5453);}
vec3 tone(vec3 x){x=max(vec3(0.),x);return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
void main(){vec3 n=normalize(vNormal);float mott=hash31(floor(vPos*7.5));n=normalize(n+(mott-.5)*.09*vExtra.z);vec3 L=normalize(vec3(-.47,.78,.43));float diff=max(dot(n,L),0.);float sky=max(n.y*.55+.45,.16);
vec3 ambient=vec3(.37,.39,.43)*(.54+.5*sky);vec3 sun=vec3(1.44,1.07,.78)*diff;
float variation=(mott-.5)*.13*vExtra.z;
vec3 base=vColor*(1.+variation);
vec3 viewDir=normalize(uEye-vPos);vec3 H=normalize(L+viewDir);
float spec=pow(max(dot(n,H),0.),mix(10.,90.,vExtra.y))*(.07+.5*vExtra.y)*diff;
vec3 col=base*(ambient+sun*.74)+vec3(1.,.83,.66)*spec+base*vExtra.x*2.;
float distFog=1.-exp(-max(vDist-9.,0.)*mix(.009,.021,uStorm));
vec3 fog= mix(vec3(.61,.40,.30),vec3(.36,.30,.31),uStorm*.67);
col=mix(col,fog,distFog*.84);
col=tone(col);col=pow(col,vec3(.83));
float alpha=mix(1.,.27,uGlass);
frag=vec4(col,alpha);}`;
function makeProgram(gl){const p=gl.createProgram();gl.attachShader(p,shader(gl,VS,gl.VERTEX_SHADER));gl.attachShader(p,shader(gl,FS,gl.FRAGMENT_SHADER));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));return p}
const dustVS=`#version 300 es
precision highp float;layout(location=0) in vec3 aPos;uniform mat4 uVP;uniform float uTime;uniform vec3 uEye;out float vA;void main(){vec3 p=aPos;p.x+=sin(uTime*.3+aPos.z*.17)*.65;p.z+=cos(uTime*.42+aPos.x*.17)*.75;p.y=mod(p.y+uTime*.18,13.);gl_Position=uVP*vec4(p,1.);float d=distance(uEye,p);gl_PointSize=clamp(85./(d+7.),1.,3.8);vA=clamp(1.-d/55.,0.,.32);}`;
const dustFS=`#version 300 es
precision highp float;in float vA;out vec4 frag;void main(){float d=distance(gl_PointCoord,vec2(.5));if(d>.5)discard;frag=vec4(.98,.72,.52,(1.-smoothstep(.1,.5,d))*vA);}`;
function particles(gl){const r=rng(4101),v=[];for(let i=0;i<610;i++){v.push((r()-.5)*90,r()*13,(r()-.5)*85)}const vao=gl.createVertexArray();gl.bindVertexArray(vao);const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(v),gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,12,0);gl.bindVertexArray(null);const p=gl.createProgram();gl.attachShader(p,shader(gl,dustVS,gl.VERTEX_SHADER));gl.attachShader(p,shader(gl,dustFS,gl.FRAGMENT_SHADER));gl.linkProgram(p);return {vao,count:v.length/3,program:p,vp:gl.getUniformLocation(p,'uVP'),time:gl.getUniformLocation(p,'uTime'),eye:gl.getUniformLocation(p,'uEye')}}
const stations=[{id:'solar',x:-18,z:9,name:'Paneles solares',label:'Inspeccionar los paneles',y:3.7},{id:'regulator',x:-6,z:-10.3,name:'Regulador de energía',label:'Reparar el regulador',y:3.9},{id:'energy',x:5,z:-10,name:'Centro de energía',label:'Reasignar la energía',y:3.5}];
function createDemo(canvas,handlers={}){
 const gl=canvas.getContext('webgl2',{alpha:true,antialias:true,powerPreference:'high-performance'});if(!gl)throw Error('Este navegador no dispone de WebGL 2.');
 const scene=compileWorld(gl),shaderProgram=makeProgram(gl),dust=particles(gl);
 const loc={vp:gl.getUniformLocation(shaderProgram,'uVP'),model:gl.getUniformLocation(shaderProgram,'uModel'),eye:gl.getUniformLocation(shaderProgram,'uEye'),storm:gl.getUniformLocation(shaderProgram,'uStorm'),glass:gl.getUniformLocation(shaderProgram,'uGlass'),time:gl.getUniformLocation(shaderProgram,'uTime')};
  const state={pos:[0,0,19],yaw:0,pitch:0,camera:'third',storm:0,stormTarget:0,walk:0,moving:false,active:false,keys:new Set(),zoom:9.5,paused:false};
 const eye=[5,6,35],target=[0,2,0],projection=mat4(),view=mat4(),vp=mat4(),model=mat4(),id=identity(mat4());let frame=0,old=performance.now(),raf=0,lastEmit=0,lastPerf=performance.now(),fps=60,frames=0;
 function rescale(){const dpr=Math.min(window.devicePixelRatio||1,1.5),w=Math.max(1,Math.floor(canvas.clientWidth*dpr)),h=Math.max(1,Math.floor(canvas.clientHeight*dpr));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}gl.viewport(0,0,w,h);return [canvas.clientWidth,canvas.clientHeight];}
 function renderMesh(mesh,mat,glass=0){gl.uniformMatrix4fv(loc.model,false,mat);gl.uniform1f(loc.glass,glass);gl.bindVertexArray(mesh.vao);gl.drawArrays(gl.TRIANGLES,0,mesh.count)}
 function nearest(){let out=null,dist=1e5;for(const s of stations){const d=Math.hypot(s.x-state.pos[0],s.z-state.pos[2]);if(d<dist){dist=d;out=s}}return {station:out,dist}}
 function update(now){if(!state.active){old=now;raf=requestAnimationFrame(update);return;}const dt=Math.min((now-old)/1000,.045);old=now;frame+=dt;rescale();
   state.moving=false;
   if(!state.paused){
   const f=[Math.sin(state.yaw),-Math.cos(state.yaw)],r=[Math.cos(state.yaw),Math.sin(state.yaw)];let forward=(state.keys.has('KeyW')||state.keys.has('ArrowUp')?1:0)-(state.keys.has('KeyS')||state.keys.has('ArrowDown')?1:0),strafe=(state.keys.has('KeyD')||state.keys.has('ArrowRight')?1:0)-(state.keys.has('KeyA')||state.keys.has('ArrowLeft')?1:0);
    if(forward||strafe){const l=Math.hypot(forward,strafe),speed=state.keys.has('ShiftLeft')?7.8:5.1;const dx=(f[0]*forward+r[0]*strafe)/l*speed*dt,dz=(f[1]*forward+r[1]*strafe)/l*speed*dt;
     const next=resolveMove(state.pos[0],state.pos[2],dx,dz);
     if(next.x!==state.pos[0]||next.z!==state.pos[2]){state.pos[0]=next.x;state.pos[2]=next.z;state.walk+=dt*9;state.moving=true;}
   }
   state.storm=mix(state.storm,state.stormTarget,Math.min(1,dt*.65));
  }
  const y=height(state.pos[0],state.pos[2]);state.pos[1]=y;
  const fx=Math.sin(state.yaw),fz=-Math.cos(state.yaw);const fp=state.camera==='first';
  const eyeWant=fp?[state.pos[0],y+1.9,state.pos[2]]:[state.pos[0]-fx*state.zoom+2.0,y+4.2+state.zoom*.13,state.pos[2]-fz*state.zoom+1.2];
  const targetWant=fp?[state.pos[0]+fx*10,y+1.9+state.pitch*9,state.pos[2]+fz*10]:[state.pos[0]+fx*9,y+2.1+state.pitch*5,state.pos[2]+fz*9];
  for(let i=0;i<3;i++){eye[i]=mix(eye[i],eyeWant[i],clamp(dt*5.8,0,1));target[i]=mix(target[i],targetWant[i],clamp(dt*6.7,0,1));}
  perspective(projection,Math.PI/3.2,canvas.width/canvas.height,.08,410);lookAt(view,eye,target);multiply(vp,projection,view);
  gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);
  gl.useProgram(shaderProgram);gl.uniformMatrix4fv(loc.vp,false,vp);gl.uniform3f(loc.eye,...eye);gl.uniform1f(loc.storm,state.storm);gl.uniform1f(loc.time,frame);renderMesh(scene.world,id);
   if(!fp){const wobble=state.moving?Math.abs(Math.sin(state.walk))*.065:0;modelAt(model,state.pos[0],y,state.pos[2],state.yaw,wobble);renderMesh(scene.astronaut,model)}
  gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);gl.disable(gl.CULL_FACE);renderMesh(scene.glass,id,1);
  gl.useProgram(dust.program);gl.uniformMatrix4fv(dust.vp,false,vp);gl.uniform1f(dust.time,frame);gl.uniform3f(dust.eye,...eye);gl.bindVertexArray(dust.vao);gl.drawArrays(gl.POINTS,0,dust.count);gl.depthMask(true);gl.disable(gl.BLEND);
  frames++;if(now-lastPerf>850){fps=Math.round(frames*1000/(now-lastPerf));frames=0;lastPerf=now;}
  if(now-lastEmit>120){const near=nearest(),projected={};for(const s of stations)projected[s.id]=project([s.x,s.y,s.z],vp,[canvas.clientWidth,canvas.clientHeight]);handlers.onTick?.({nearest:near,markers:projected,pos:[...state.pos],view:state.camera,storm:state.storm,fps});lastEmit=now;}
  raf=requestAnimationFrame(update);
 }
 const movementKeys=['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft'];
 function keydown(e){if(!state.active)return;if(state.paused&&e.code!=='Escape')return;if([...movementKeys,'Space','KeyV','KeyE','Tab','Escape'].includes(e.code))e.preventDefault();if(e.code==='KeyV'&&!e.repeat){state.camera=state.camera==='third'?'first':'third';handlers.onCamera?.(state.camera)}if(e.code==='KeyE'&&!e.repeat)handlers.onInteract?.(nearest());if(e.code==='Escape'&&!e.repeat)handlers.onEscape?.();if(e.code==='Tab'&&!e.repeat)handlers.onPanel?.();if(movementKeys.includes(e.code))state.keys.add(e.code)}
 function keyup(e){state.keys.delete(e.code)}
 function stopInput(){state.keys.clear();state.moving=false}
 function onVisibilityChange(){if(document.hidden)stopInput()}
 window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);window.addEventListener('blur',stopInput);document.addEventListener('visibilitychange',onVisibilityChange);
 let dragging=false,lastX=0,lastY=0;canvas.addEventListener('pointerdown',e=>{dragging=true;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture(e.pointerId)});canvas.addEventListener('pointermove',e=>{if(!dragging||state.paused)return;state.yaw-=(e.clientX-lastX)*.005;state.pitch=clamp(state.pitch+(e.clientY-lastY)*.003,-.32,.43);lastX=e.clientX;lastY=e.clientY});canvas.addEventListener('pointerup',()=>dragging=false);canvas.addEventListener('pointercancel',()=>dragging=false);canvas.addEventListener('wheel',e=>{e.preventDefault();state.zoom=clamp(state.zoom+e.deltaY*.012,5.8,17)},{passive:false});
 raf=requestAnimationFrame(update);
  return {start(){stopInput();state.active=true;state.paused=false;old=performance.now()},pause(v){state.paused=v;if(v)stopInput()},getState(){return state},toggleCamera(){state.camera=state.camera==='third'?'first':'third';handlers.onCamera?.(state.camera)},getNearest:nearest,goTo(id){const s=stations.find(s=>s.id===id);if(s)state.yaw=Math.atan2(s.x-state.pos[0],state.pos[2]-(s.z+2))},setStorm(v){state.stormTarget=v?1:0},press(code,on){if(on&&movementKeys.includes(code))state.keys.add(code);else state.keys.delete(code)},destroy(){cancelAnimationFrame(raf);stopInput();window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);window.removeEventListener('blur',stopInput);document.removeEventListener('visibilitychange',onVisibilityChange)} };
}
 window.MarsGfx={createDemo,stations,resolveMove,blocked};
})();
