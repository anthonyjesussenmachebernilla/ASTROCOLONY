(() => {
'use strict';
const $=x=>document.getElementById(x);
const canvas=$('scene'),menu=$('menu'),ui=$('gameUI'),shade=$('modalShade');
let playerMode=localStorage.getItem('astrocolony-mode')==='comandante'?'comandante':'explorador';
const SAVE_KEY='astrocolony-horizonte-save-v1';
const MISSION_PANEL_KEY='astrocolony-mission-panel-collapsed';
let engine=null,storm=false,started=false,paused=false,energy=62,oxygen=78,food=54,shield=68,lastTick=null,toastTimer=0,nasaWeather=null;
const campaignApi=window.MarsCampaign;
let campaign=campaignApi.initial();
const inspected=new Set();
let lastSaveAt=-Infinity;
let modalReturnFocus=null;
const day=()=>campaignApi.days[campaign.sol-1];
const resources=()=>({energy,oxygen,food,shield});
function setResources(next){({energy,oxygen,food,shield}=next);stats()}
function campaignNote(){return campaign.finished?'¡Historia completada! La señal era una baliza científica. Puedes explorar o consultar tu resultado.':campaign.completed?'Objetivo completado. Pulsa P para revisar el balance y terminar el sol cuando quieras.':day().story}
const robotGuides=[
 {name:'Luma',role:'energía',fact:'La electricidad de los paneles solares alimenta otros sistemas de la colonia. Si falla, revisa primero su superficie y luego el regulador.',encouragement:'¡Vas bien! Observar antes de reparar evita gastar recursos a ciegas.'},
 {name:'Nova',role:'soporte vital',fact:'El oxígeno y el cultivo de alimentos necesitan energía. Una decisión que mejora un recurso puede reducir otro.',encouragement:'Cada intento enseña algo. Mira los indicadores y decide con calma.'},
 {name:'Atlas',role:'protección',fact:'Marte tiene una atmósfera mucho más delgada que la Tierra. En esta simulación, el blindaje ayuda a proteger a la tripulación de la radiación.',encouragement:'La tripulación cuenta contigo. No tienes que resolverlo todo de una vez: sigue el siguiente objetivo.'}
];
const robotQuestions=[
 {question:'La energía está bajando. ¿Qué conviene revisar primero?',answers:['Paneles solares','Cambiar el traje'],correct:0,explanation:'Los paneles pueden perder rendimiento por el polvo. Inspecciónalos antes de reparar el regulador.'},
 {question:'¿Qué sistema también puede sufrir si gastas toda la energía?',answers:['El color del traje','El invernadero'],correct:1,explanation:'El invernadero necesita electricidad para mantener sus cultivos.'},
 {question:'Si una tormenta solar amenaza la base, ¿qué recurso debes vigilar?',answers:['Iluminación','Blindaje'],correct:1,explanation:'El blindaje representa la protección de la tripulación frente a la radiación.'}
];
function missionHint(){return campaign.finished?'Ya resolviste el misterio. Puedes seguir explorando o ver el resultado desde el panel de la base.':campaign.completed?'Terminaste el objetivo de hoy. Pulsa Terminar el sol para revisar el balance y continuar.':day().hint}
function talkToRobot(robot){
 const guide=robotGuides[robot.id];if(!guide)return;
 showModal('ROBOT DE AURORA-1',`${guide.name} · ${guide.role}`,`<p class="robot-greeting">${guide.name}: ¡Hola, ${playerMode}! ¿En qué puedo ayudarte?</p><p id="robotReply" class="robot-reply" aria-live="polite">Elige un tema y conversemos.</p><div class="robot-topics"><button type="button" data-robot-topic="hint">Dame una pista</button><button type="button" data-robot-topic="question">Hazme una pregunta</button><button type="button" data-robot-topic="fact">Dato importante</button><button type="button" data-robot-topic="encouragement">Necesito ánimo</button></div><div id="robotAnswers" class="robot-answers"></div>`,[{label:'SEGUIR EXPLORANDO',action:hideModal}]);
 const reply=$('robotReply'),answers=$('robotAnswers'),question=robotQuestions[robot.id];
 for(const button of $('modalBody').querySelectorAll('[data-robot-topic]'))button.addEventListener('click',()=>{
  answers.replaceChildren();
  if(button.dataset.robotTopic==='hint')reply.textContent=missionHint();
  if(button.dataset.robotTopic==='fact')reply.textContent=guide.fact;
  if(button.dataset.robotTopic==='encouragement')reply.textContent=guide.encouragement;
  if(button.dataset.robotTopic==='question'){
   reply.textContent=question.question;
   for(const [index,answer] of question.answers.entries()){
    const option=document.createElement('button');option.type='button';option.textContent=answer;
    option.addEventListener('click',()=>{reply.textContent=`${index===question.correct?'¡Correcto!':'Casi. Piensa en los recursos de la base.'} ${question.explanation}`;answers.replaceChildren()});
    answers.appendChild(option);
   }
  }
 });
}
function message(text){$('botText').textContent=text}
function modeLabel(){return playerMode==='comandante'?'Comandante · 10–12':'Explorador · 7–9'}
function updateMode(){$('modeBadge').textContent=modeLabel();localStorage.setItem('astrocolony-mode',playerMode)}
function stats(){for(const [name,num] of Object.entries(resources())){const element=$(name),before=parseFloat(element.textContent);element.textContent=`${Math.round(num)} %`;if(Number.isFinite(before)&&before!==Math.round(num)){element.classList.remove('resource-rise','resource-fall');void element.offsetWidth;element.classList.add(num>before?'resource-rise':'resource-fall')}}}
function saveGame(force=false){if(!started||!engine)return;const now=performance.now();if(!force&&now-lastSaveAt<900)return;lastSaveAt=now;try{localStorage.setItem(SAVE_KEY,JSON.stringify({version:2,world:engine.snapshot(),mode:playerMode,campaign,...resources(),inspected:[...inspected]}))}catch{}}
function loadGame(){try{const saved=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');if(!saved||![1,2].includes(saved.version)||!['energy','oxygen','food','shield'].every(key=>Number.isFinite(saved[key])&&saved[key]>=0&&saved[key]<=100))return false;const restored=saved.version===2?campaignApi.restore(saved.campaign):campaignApi.migrate(saved.step,saved);if(!restored||!engine.restore(saved.world))return false;campaign=restored;if(saved.mode==='explorador'||saved.mode==='comandante')playerMode=saved.mode;updateMode();setResources(saved);inspected.clear();for(const item of Array.isArray(saved.inspected)?saved.inspected:[])if(typeof item==='string'&&item.length<80)inspected.add(item);storm=Boolean(saved.world.stormTarget);checklist();message(campaignNote());updateInterior();$('world').classList.toggle('storm',storm);$('alertLabel').textContent=weatherLabel();saveGame(true);return true}catch{return false}}
function checklist(){
 $('missionSol').textContent=`Sol ${campaign.sol} de 10`;
 $('missionPhase').textContent=campaign.finished?'Historia completada':campaign.sol<=3?`Tutorial ${campaign.sol} de 3`:'Tu misión';
 $('missionTitle').textContent=campaign.finished?'El misterio de Aurora-1, resuelto':day().title;
 $('checks').innerHTML=`<div class="check ${campaign.completed||campaign.finished?'done':''}"><div class="square">${campaign.completed||campaign.finished?'✓':''}</div><span>${campaign.finished?'Explora libremente o consulta tu resultado.':day().task}</span></div>`;
 $('guide').disabled=campaign.completed||campaign.finished;
 $('endSol').classList.toggle('hidden',!campaign.completed&&!campaign.finished);
 $('endSol').textContent=campaign.finished?'Ver resultado':campaign.sol===10?'Terminar la misión':'Terminar el sol';
}
function setMissionCollapsed(collapsed){$('missionCard').classList.toggle('is-collapsed',collapsed);$('missionDetails').hidden=collapsed;const button=$('missionToggle');button.setAttribute('aria-expanded',String(!collapsed));button.setAttribute('aria-label',collapsed?'Mostrar misión':'Ocultar misión');button.title=collapsed?'Mostrar misión':'Ocultar misión';try{localStorage.setItem(MISSION_PANEL_KEY,String(collapsed))}catch{}}
function toast(s){const el=$('toast');el.textContent=s;el.classList.add('shown');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('shown'),3600)}
function weatherLabel(){
 if(storm)return 'Tormenta solar simulada ACTIVADA';
 if(!nasaWeather)return 'Consultando NASA DONKI…';
 const level={CALM:'Sol tranquilo',ACTIVE:'Actividad solar elevada',STORMY:'Actividad solar intensa'}[nasaWeather.level]||'Clima espacial';
 return `${level} · NASA DONKI${nasaWeather.isHistorical?' (dato histórico)':''}${nasaWeather.strongestFlare?' · '+nasaWeather.strongestFlare:''}`;
}
async function loadSpaceWeather(){
 try{const response=await fetch('/api/nasa/space-weather');if(!response.ok)throw new Error('NASA no disponible');const data=await response.json();nasaWeather=data.snapshot||null;}
 catch{nasaWeather=null;}
 $('alertLabel').textContent=nasaWeather?weatherLabel():'Clima NASA no disponible · simulación';
}
function showModal(tag,title,html,actions){
 window.MarsDiscovery?.cancel();
 if(shade.classList.contains('hidden'))modalReturnFocus=document.activeElement;
 $('modalTag').textContent=tag;const heading=$('modalTitle');heading.textContent=title;heading.tabIndex=-1;
 $('modalBody').innerHTML=html;const btns=$('modalButtons');btns.innerHTML='';btns.className=`dlgbuttons actions-${Math.min(actions.length,3)}`;
 for(const action of actions){const button=document.createElement('button');button.type='button';button.className=action.secondary?'ghostbtn':'mainbtn';button.textContent=action.label;button.addEventListener('click',action.action);btns.appendChild(button)}
 shade.classList.remove('hidden');if(engine)engine.pause(true);paused=true;
 heading.focus({preventScroll:true});shade.querySelector('.dialog').scrollTop=0;
}
function hideModal(){window.MarsDiscovery?.cancel();shade.classList.add('hidden');engine?.pause(false);paused=false;if(modalReturnFocus?.isConnected)modalReturnFocus.focus();modalReturnFocus=null}
shade.addEventListener('keydown',event=>{
 if(event.key==='Escape'){event.preventDefault();event.stopPropagation();hideModal();return}
 if(event.key!=='Tab')return;
 const controls=[...shade.querySelectorAll('button:not(:disabled),a[href],summary')].filter(node=>{for(let parent=node.parentElement;parent&&parent!==shade;parent=parent.parentElement)if(parent.tagName==='DETAILS'&&!parent.open&&parent.querySelector('summary')!==node)return false;return true});
 const first=controls[0],last=controls[controls.length-1];
 if(!controls.includes(document.activeElement)){event.preventDefault();(event.shiftKey?last:first)?.focus();return}
 if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}
 else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}
});
function instructional(){showModal('INSTRUCCIONES DE LA MISIÓN','Bienvenido a Aurora-1',`<p>Has llegado a una colonia de investigación en Marte. Tu expedición dura diez soles. Los tres primeros son de entrenamiento. ASTROBOT te ayudará a cuidar la base y resolver una señal misteriosa.</p><p><b style="color:#ffdc9b">Controles:</b> usa <b>W A S D</b> para caminar, <b>Espacio</b> para saltar, arrastra el ratón para mirar y <b>V</b> para cambiar de cámara. Acércate a un módulo y pulsa <b>E</b> para entrar; dentro, pulsa <b>E</b> junto a la consola para usarla o junto a la puerta para salir. <b>P</b> o <b>Tab</b> abre el panel de la base.</p><p><b>Ir al objetivo</b> orienta la cámara hacia el siguiente equipo; tú controlas el movimiento.</p><p style="font-size:12px;color:#b9ced1">El clima espacial consulta NASA DONKI. Los recursos y decisiones del juego son una simulación educativa.</p>`,[{label:'ENTENDIDO',action:hideModal}])}
const resourceNames={energy:'Energía',oxygen:'Oxígeno',food:'Alimentos',shield:'Blindaje'};
function resourceHtml(values=resources()){return `<div class="statline">${Object.entries(resourceNames).map(([key,label])=>`<b>${label}: ${Math.round(values[key])}%</b>`).join('')}</div>`}
function comparisonHtml(before,after,onlyChanged=false){return `<span class="resource-comparison" role="list" aria-label="Cambios en los porcentajes">${Object.entries(resourceNames).filter(([key])=>!onlyChanged||after[key]!==before[key]).map(([key,label])=>{const change=after[key]-before[key];return `<span class="resource-change" role="listitem" data-resource="${key}"><span>${label}</span><strong>${Math.round(before[key])}% → ${Math.round(after[key])}%</strong><small class="${change>0?'gain':change<0?'loss':'neutral'}">${change>0?'Sube':change<0?'Baja':'Sin cambio'}${change?` ${Math.abs(change)} puntos`:''}</small></span>`}).join('')||'<span>Las reservas ya están al máximo para este plan.</span>'}</span>`}
function journalHtml(){return `<details class="campaign-journal"><summary>Mi bitácora · ${campaign.history.length} soles completados</summary>${campaign.assistedSols.length?`<p>Ayuda de práctica de Astrobot en los soles ${campaign.assistedSols.join(', ')}: repuso las reservas para ensayar otra decisión.</p>`:''}${campaign.history.map(entry=>{const config=campaignApi.days[entry.sol-1],option=config.choices.find(option=>option.id===entry.choice);return `<article><strong>Sol ${entry.sol}: ${config.title}</strong><p>${option.title}. ${option.lesson}</p>${config.clue?`<p class="campaign-clue">Pista: ${config.clue}</p>`:''}</article>`}).join('')||'<p>Aquí aparecerán tus decisiones al terminar cada sol.</p>'}</details>`}
function missionPanel(){
 const actions=[{label:'VOLVER A LA MISIÓN',action:hideModal}];
 if(campaign.finished)actions.unshift({label:'Ver resultado',action:showEnding});
 else if(campaign.completed)actions.unshift({label:'Terminar el sol',action:reviewSol});
 showModal(`Sol ${campaign.sol} de 10`,campaign.finished?'Tu expedición':day().title,`<p>${campaign.finished?'Completaste la historia. La exploración sigue disponible.':day().task}</p>${resourceHtml()}<p>${missionHint()}</p>${journalHtml()}<p class="campaign-note">Historia y recursos simulados. La foto de InSight y los registros de NASA DONKI son fuentes reales; no predicen la supervivencia de esta base.</p>`,actions);
}
function pauseGame(){if(!started)return;showModal('PAUSA','Exploración detenida',`<p><b>Modo de juego: ${modeLabel()}.</b></p><p>Estás en Aurora-1, Sol ${campaign.sol} de 10. ${campaign.finished?'La historia está completada.':'Los primeros tres soles son tu entrenamiento.'}</p><p>El tiempo avanza cuando terminas el objetivo y eliges Terminar el sol.</p><p>Tu progreso se guarda automáticamente.</p>`,[{label:'CONTINUAR',action:hideModal},{label:'ABRIR SIMULACIÓN ANTERIOR',secondary:true,action:()=>window.parent.location.assign('/game/legacy')},{label:'INSTRUCCIONES',secondary:true,action:instructional},{label:'SALIR AL MENÚ',secondary:true,action:()=>{saveGame(true);hideModal();window.parent.location.assign('/');}}])}
function openConsole(){
 if(campaign.finished){showEnding();return}
 if(campaign.completed){reviewSol();return}
 if(campaign.sol===1&&!inspected.has('solar:array')){message('Primero acércate a la matriz de paneles y registra lo que observas. La foto de InSight es opcional.');toast('Examina la matriz de paneles antes de usar la consola.');return}
 if(campaign.sol<=2){resolveDay(day().choices[0].id);return}
 const options=day().choices;
 showModal(`Sol ${campaign.sol} · Tu decisión`,day().title,`<p>${day().story}</p>${playerMode==='explorador'?'<p class="campaign-tip">Compara los porcentajes: ayudar a un sistema puede gastar las reservas de otro.</p>':''}<div class="choices">${options.map(option=>`<button type="button" class="choice" data-campaign-choice="${option.id}"><strong>${option.title}</strong><small>${option.text}</small>${comparisonHtml(resources(),campaignApi.apply(resources(),option.deltas),true)}</button>`).join('')}</div><p class="campaign-note">Así cambiarían las reservas con tu decisión.${campaign.sol>=4?' Al terminar el sol también se consumen recursos para mantener la base.':''}</p>`,[{label:'VOLVER A EXPLORAR',secondary:true,action:hideModal}]);
 for(const button of $('modalBody').querySelectorAll('[data-campaign-choice]'))button.addEventListener('click',()=>resolveDay(button.dataset.campaignChoice));
}
function resolveDay(id){const result=campaignApi.resolve(campaign,id,resources());if(!result)return;campaign=result.state;setResources(result.resources);checklist();message(campaignNote());saveGame(true);reviewSol()}
function retryDay(){const result=campaignApi.retry(campaign);if(!result)return;campaign=result.state;setResources(result.resources);checklist();message(day().hint);saveGame(true);hideModal();toast('Recuperaste los porcentajes anteriores. Puedes probar otro plan en la consola.')}
function assistDay(){const result=campaignApi.assist(campaign,resources());if(!result)return;campaign=result.state;setResources(result.resources);checklist();message('Astrobot repuso las reservas para practicar otra decisión. La ayuda queda en tu bitácora.');saveGame(true);hideModal();toast('Ayuda de práctica: cada reserva tiene al menos 35%. Vuelve a la consola.')}
function reviewSol(){
 if(campaign.finished){showEnding();return}
 if(!campaign.completed){toast('Completa primero el objetivo de hoy.');return}
 const option=day().choices.find(option=>option.id===campaign.pending.choice),projection=campaignApi.apply(resources(),campaignApi.upkeep(campaign.sol));
 const critical=Object.values(projection).some(value=>value===0);
 showModal(`Balance del Sol ${campaign.sol}`,critical?'Revisemos tu plan':campaign.sol===3?'¡Entrenamiento completado!':'Así cambió tu base',`<p>${option.lesson}</p>${comparisonHtml(campaign.pending.before,resources())}${day().clue?`<p class="campaign-clue">Nueva pista: ${day().clue}</p>`:''}${campaign.sol>=4?`<details class="campaign-journal"><summary>Reservas al terminar el sol</summary><p>La base consume 4 puntos de energía, 4 de oxígeno, 3 de alimentos y 1 de blindaje.</p>${resourceHtml(projection)}</details>`:'<p>Durante el tutorial no hay consumo entre soles. Aprende y prueba con calma.</p>'}<p>${critical?'Un sistema se quedaría sin reservas. Vuelve al estado anterior y prueba una decisión diferente.':'Puedes probar otra decisión o terminar el sol cuando quieras.'}</p>`,[
 ...(critical?campaign.assistedSols.includes(campaign.sol)?[]:[{label:'Pedir ayuda a Astrobot',action:assistDay}]:[{label:campaign.sol===10?'Terminar la misión':'Terminar el sol',action:advanceSol}]),
 {label:campaign.sol<=2?'Repetir el ejercicio':'Probar otra decisión',secondary:true,action:retryDay},
 {label:'SEGUIR EXPLORANDO',secondary:true,action:hideModal}]);
}
function advanceSol(){
 const result=campaignApi.advance(campaign,resources());if(!result)return;if(result.blocked){reviewSol();return}
 campaign=result.state;setResources(result.resources);checklist();message(campaignNote());
 storm=!campaign.finished&&campaign.sol===6;engine?.setStorm(storm);$('world').classList.toggle('storm',storm);$('alertLabel').textContent=weatherLabel();saveGame(true);
 if(campaign.finished){showEnding();return}
 showModal(campaign.sol<=3?`Tutorial ${campaign.sol} de 3`:`Sol ${campaign.sol} de 10`,day().title,`<p>${day().story}</p><p>${day().task}</p>${playerMode==='explorador'?`<p class="campaign-tip">${day().hint}</p>`:''}`, [{label:`Comenzar el Sol ${campaign.sol}`,action:hideModal}]);
}
function confirmRestart(){showModal('Nueva expedición','¿Volver al Sol 1?', '<p>Empezarás de nuevo el tutorial y la historia. Volverás a las reservas iniciales de la colonia.</p>',[{label:'Empezar otra misión',action:()=>{hideModal();restart()}},{label:'Conservar mi expedición',secondary:true,action:showEnding}])}
function showEnding(){
 if(!campaign.finished)return;
 const final=campaign.history[9].after,stable=Object.values(final).every(value=>value>=25);
 showModal('Expedición completada',stable?'Aurora-1 mira al futuro':'La colonia está a salvo; las reservas necesitan atención',`<p>Completaste los diez soles y preparaste Aurora-1 para la siguiente tripulación.</p><p><b>El misterio resuelto:</b> los pulsos provenían de una baliza científica de la propia expedición. Los reinicios eléctricos interrumpían sus mensajes. Mediste la señal, comparaste registros y comprobaste su identificador.</p><p class="campaign-note">Este misterio es ficción educativa. No es un descubrimiento de NASA ni evidencia de vida en Marte.</p><h3>Así dejaste la base al cerrar la misión</h3>${resourceHtml(final)}<p>${stable?'Conservaste reservas en los cuatro sistemas. Tu planificación ayudó a la tripulación.':'La misión terminó, pero algunos sistemas quedaron con pocas reservas. En otra expedición puedes comparar planes que consuman menos.'}</p>${journalHtml()}<p>Aprendiste a observar, reparar, comparar costos y comprobar una hipótesis. Tu resultado queda guardado.</p>`,[{label:'Seguir explorando',action:hideModal},{label:'Iniciar otra misión',secondary:true,action:confirmRestart}]);
}
function interact(nearest){if(nearest?.robot&&!nearest.inside){talkToRobot(nearest.robot);return}if(!nearest||!nearest.station){toast('Acércate a un módulo o a un robot para interactuar.');return}const {station,dist}=nearest;
 if(!nearest.inside){if(dist>5.7){toast(`Acércate a ${station.name}. Estás a ${Math.round(dist)} m.`);return}if(engine.enter(station.id)){updateInterior();toast(`Entraste a ${station.name}. Explora con WASD; usa E junto a la puerta para salir.`)}return}
 if(nearest.atExit){engine.leave();updateInterior();toast('Regresaste al exterior de Aurora-1.');return}
 if(dist>2.5){toast(`Acércate a ${nearest.target.name}.`);return}
 if(nearest.target.id!=='console'){
  const target=nearest.target,key=`${station.id}:${target.id}`;
  const recorded=inspected.has(key),actions=[];
  if(window.MarsDiscovery.locations[station.id]?.targetId===target.id)actions.push({label:'ⓘ Información con imagen',action:()=>openDiscovery(()=>interact(nearest),station.id)});
  if(!recorded)actions.push({label:'REGISTRAR HALLAZGO',secondary:actions.length>0,action:()=>{if(inspected.has(key))return;inspected.add(key);hideModal();saveGame(true);toast('Hallazgo registrado. ¡Sigue explorando!')}});
  actions.push({label:'SEGUIR EXPLORANDO',secondary:true,action:hideModal});
  showModal('HALLAZGO EN EL MÓDULO',target.name,`<p>${target.detail}</p><p>${recorded?'Ya registraste este hallazgo. Puedes volver a consultarlo.':'Registra lo que observaste para ayudar a la colonia.'}</p>`,actions);return;
 }
 if(campaign.finished){showEnding();return}if(station.id!==day().station){toast('Puedes explorar este módulo. El objetivo de hoy está marcado en el exterior.');return}openConsole();}
function guide(){if(campaign.finished||campaign.completed)return;if(engine?.getState().interior){toast('Sal por la puerta del módulo para seguir el marcador del exterior.');return}engine?.goTo(day().station);toast(playerMode==='explorador'?'Mira el marcador dorado y camina con WASD hasta el equipo.':'Modo Comandante: sigue el marcador dorado y usa WASD para llegar al objetivo.')}
function openDiscovery(onBack=hideModal,stationId=engine?.getState().interior){const location=window.MarsDiscovery.locations[stationId];if(!location)return;window.MarsDiscovery.open({showModal,onBack,mode:playerMode,topic:location.topic,backLabel:onBack===hideModal?'Volver a explorar':'Volver al hallazgo'})}
function updateDiscoveryMarker(data){
 const marker=$('discoveryMarker'),location=window.MarsDiscovery.locations[data.interior];marker.classList.toggle('hidden',!location);
 if(!location)return;
 marker.dataset.station=data.interior;marker.querySelector('small').textContent=`${location.label} · NASA`;
 marker.setAttribute('aria-label',`Información con imagen de NASA: ${location.label}`);
 const point=data.discoveryMarker,place=point?.inView&&markerFits(point.x,point.y,220,72);
 marker.classList.toggle('is-docked',!place);
 marker.style.left=place?`${point.x}px`:'';marker.style.top=place?`${point.y}px`:'';
}
function updateInterior(){const id=engine?.getState().interior,station=window.MarsGfx.stations.find(s=>s.id===id);$('interiorHud').classList.toggle('hidden',!id);ui.classList.toggle('interior-mode',!!id);$('interiorName').textContent=station?.name||'';$('mobileInteract').textContent=id?'E · USAR / SALIR':'E · ENTRAR / USAR';$('world').classList.toggle('interior',!!id)}
function hudRects(includeWaypoint=false){const selectors=['.topbar','.mission-card','.alert','.menu-pause','.controls','.astrobot','.interior-hud','.sky-note'];if(includeWaypoint)selectors.push('.waypoint');return selectors.map(selector=>document.querySelector(selector)).filter(el=>el&&getComputedStyle(el).display!=='none').map(el=>el.getBoundingClientRect())}
function overlaps(a,b,pad=10){return a.left<b.right+pad&&a.right>b.left-pad&&a.top<b.bottom+pad&&a.bottom>b.top-pad}
function markerFits(x,y,width,height,placed=[],includeWaypoint=false){const rect={left:x-width/2,right:x+width/2,top:y-height,bottom:y};return x>width/2+12&&x<canvas.clientWidth-width/2-12&&y>height+10&&y<canvas.clientHeight-20&&!hudRects(includeWaypoint).some(ui=>overlaps(rect,ui))&&!placed.some(other=>overlaps(rect,other,5))?rect:null}
function updateSky(markers){const layer=$('skyLabels');layer.classList.toggle('hidden',!markers.length);$('skyNote').classList.toggle('hidden',!markers.length);while(layer.children.length<markers.length){const el=document.createElement('span');el.className='sky-label';layer.appendChild(el)}const placed=[];for(let i=0;i<layer.children.length;i++){const el=layer.children[i],p=markers[i];el.style.display='none';if(!p?.inView)continue;const rect=markerFits(p.x,p.y,Math.max(42,p.name.length*7+16),25,placed,true);if(!rect)continue;placed.push(rect);el.textContent=p.name;el.classList.toggle('fiction',p.name.startsWith('Platillo'));el.style.left=p.x+'px';el.style.top=p.y+'px';el.style.display='block'}}
function updateTick(d){lastTick=d;saveGame();updateDiscoveryMarker(d);const wp=$('waypoint'),hud=$('interiorHud');if(d.interior){updateSky([]);wp.style.display='none';$('interiorHint').textContent=d.nearest.dist<2.5?`E · ${d.nearest.target.name}`:`Acércate a ${d.nearest.target.name}`;$('botStatus').textContent='● EXPLORANDO EL INTERIOR';$('fps').textContent=d.fps+' FPS';return}const robot=d.nearest.robot;const near=d.nearest.station&&d.nearest.dist<5.7;hud.classList.toggle('hidden',!robot&&!near);if(robot){const guide=robotGuides[robot.id];$('interiorName').textContent=guide.name+' / ROBOT';$('interiorHint').textContent='\u00a1Hola! Pulsa E para conversar';$('mobileInteract').textContent='E \u00b7 HABLAR'}else{$('mobileInteract').textContent='E \u00b7 ENTRAR / USAR'}if(!robot&&near){$('interiorName').textContent=d.nearest.station.name;$('interiorHint').textContent=window.MarsDiscovery.locations[d.nearest.station.id]?'E · Entrar · ⓘ Foto NASA dentro':'E · Entrar al módulo'}const needed=window.MarsGfx.stations.find(station=>station.id===day().station);if(!needed){wp.style.display="none";return}const p=d.markers[needed.id];const dist=Math.hypot(needed.x-d.pos[0],needed.z-d.pos[2]);if(campaign.finished||campaign.completed||!p||!p.inView||!markerFits(p.x,p.y,145,90)){wp.style.display='none'}else{wp.style.display='flex';wp.style.left=p.x+'px';wp.style.top=p.y+'px';$('waypointTitle').textContent=needed.name;$('distance').textContent=dist<5.8?'Presiona E para entrar':`${Math.round(dist)} m`;}updateSky(d.skyMarkers||[]);if(robot){$('botStatus').textContent='ROBOT CERCANO / PULSA E'}else if(!campaign.finished&&!campaign.completed&&dist<5.8&&d.nearest.station?.id===needed.id&&Math.round(performance.now()/1100)%2===0){$('botStatus').textContent='● ENTRADA ALCANZADA · PULSA E'}else $('botStatus').textContent='● CANAL DE ASISTENCIA ACTIVO';$('fps').textContent=d.fps+' FPS';}
function restart(){engine.leave();updateInterior();inspected.clear();campaign=campaignApi.initial();energy=62;oxygen=78;food=54;shield=68;storm=false;stats();checklist();message(day().hint);const s=engine.getState();s.pos=[0,0,19];s.yaw=0;s.avatarYaw=0;s.camera='third';s.jumpHeight=0;s.jumpVelocity=0;s.storm=0;s.stormTarget=0;engine.setStorm(false);$('world').classList.remove('storm');$('alertLabel').textContent=weatherLabel();saveGame(true);toast('Sol 1 · Tu entrenamiento comienza. Explora con calma.')}
function toggleStorm(){storm=!storm;engine?.setStorm(storm);$('world').classList.toggle('storm',storm);$('alertLabel').textContent=weatherLabel();message(storm?'ALERTA: se ha simulado una tormenta solar. Revisa el blindaje: el evento no representa datos de la NASA en tiempo real.':campaignNote());toast(storm?'Simulación de tormenta solar activada.':'Condiciones solares simuladas normales.');}
function initialize(){if(!engine){try{engine=window.MarsGfx.createDemo(canvas,{onTick:updateTick,onInteract:interact,onEscape:()=>{if(!shade.classList.contains('hidden'))hideModal();else pauseGame();},onPanel:missionPanel,onCamera:(v)=>toast(v==='first'?'Cámara en primera persona.':'Cámara en tercera persona.')});}catch(e){console.error(e);menu.classList.remove('hidden');showModal('ERROR GRÁFICO','No se pudo cargar el escenario',`<p>${e.message}</p><p>La demo necesita un navegador moderno con WebGL 2 habilitado.</p>`,[{label:'VOLVER AL MENÚ',action:hideModal},{label:'ABRIR SIMULACIÓN ANTERIOR',secondary:true,action:()=>window.parent.location.assign('/game/legacy')}]);$('start').disabled=false;$('start').textContent='▶ COMENZAR DEMO';return false}}
 return true}
function startGame(){const startBtn=$('start');startBtn.disabled=true;startBtn.textContent='PREPARANDO COLONIA…';setTimeout(()=>{if(!initialize())return;menu.classList.add('hidden');ui.classList.remove('hidden');started=true;engine.start();engine.pause(false);startBtn.textContent='▶ COMENZAR DEMO';startBtn.disabled=false;if(loadGame()){toast(`Partida recuperada · Sol ${campaign.sol} de 10 · ${modeLabel()}.`)}else{updateMode();restart()}},60)}
$('endSol').addEventListener('click',reviewSol);$('start').addEventListener('click',startGame);$('instructions').addEventListener('click',instructional);$('pause').addEventListener('click',pauseGame);$('guide').addEventListener('click',guide);$('view').addEventListener('click',()=>engine?.toggleCamera());$('alert').addEventListener('click',toggleStorm);$('mobileInteract').addEventListener('click',()=>interact(engine?.getNearest()));$('mobileCamera').addEventListener('click',()=>engine?.toggleCamera());$('discoveryMarker').addEventListener('click',()=>openDiscovery(hideModal,$('discoveryMarker').dataset.station));
$('missionToggle').addEventListener('click',()=>setMissionCollapsed($('missionToggle').getAttribute('aria-expanded')==='true'));
try{setMissionCollapsed(localStorage.getItem(MISSION_PANEL_KEY)==='true')}catch{setMissionCollapsed(false)}
for(const btn of document.querySelectorAll('[data-key]')){const key=btn.dataset.key;btn.addEventListener('pointerdown',e=>{e.preventDefault();btn.setPointerCapture(e.pointerId);engine?.press(key,true)});for(const evt of ['pointerup','pointercancel','lostpointercapture'])btn.addEventListener(evt,()=>engine?.press(key,false));}
checklist();stats();void loadSpaceWeather();setInterval(loadSpaceWeather,15*60*1000);
window.addEventListener('pagehide',()=>saveGame(true));document.addEventListener('visibilitychange',()=>{if(document.hidden)saveGame(true)});
if(new URLSearchParams(window.location.search).has('autostart'))startGame();
})();
