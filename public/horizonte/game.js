(() => {
'use strict';
const $=x=>document.getElementById(x);
const canvas=$('scene'),menu=$('menu'),ui=$('gameUI'),shade=$('modalShade');
let playerMode=localStorage.getItem('astrocolony-mode')==='comandante'?'comandante':'explorador';
const LANG_KEY='astrocolony-lang';
const SOL_CHAPTER_KEY='astrocolony-sol-chapter';
let lang=(()=>{try{return localStorage.getItem(LANG_KEY)==='en'?'en':'es'}catch{return 'es'}})();
let solChapter=(()=>{try{const c=localStorage.getItem(SOL_CHAPTER_KEY);return c==='survival'||c==='final'?c:'tutorial'}catch{return 'tutorial'}})();
let currentSol=solChapter==='final'?10:solChapter==='survival'?4:1;
const cluesFound=new Set();
const UI_TEXT={
 es:{
  overline:'Una misión de entrenamiento espacial · Demo web 3D',
  chapter:'CAPÍTULO 01 · MARTE',
  lead:'El futuro de la colonia depende de tus decisiones.',
  summary:'Un fallo amenaza el suministro eléctrico de Aurora-1. Explora la base, examina sus sistemas y restablece la energía antes de que los recursos se agoten.',
  start:'▶ \u00a0 COMENZAR DEMO',
  instructions:'CONTROLES E HISTORIA',
  energy:'Energía',oxygen:'Oxígeno',food:'Alimentos',shield:'Blindaje',health:'Vida',
  missionCurrent:'◉ \u00a0 MISIÓN ACTUAL',
  missionTitle:{
   tutorial:'Tutorial (Soles 1–3):<br>Restablece la energía.',
   survival:'Supervivencia (Soles 4–9):<br>Energía y pistas del misterio.',
   final:'Sol 10 · Misión final:<br>Protege Aurora-1.'
  },
  guide:'⌖ \u00a0 IR AL OBJETIVO',view:'◎ \u00a0 CÁMARA',wardrobe:'◈ \u00a0 ARMARIO · APARIENCIAS',
  foodShop:'🍽️ \u00a0 SUMINISTROS · COMIDA',backpack:'🎒 \u00a0 MOCHILA · M / CTRL+R',
  pause:'☰ \u00a0 MENÚ · ESC',
  tasks:['Inspecciona los paneles solares.','Repara el regulador.','Reasigna la energía.'],
  chapters:{tutorial:'Soles 1–3: Tutorial',survival:'Soles 4–9: Supervivencia y pistas',final:'Sol 10: Misión final'},
  phaseShort:{tutorial:'Tutorial',survival:'Supervivencia',final:'Misión final'}
 },
 en:{
  overline:'A space training mission · 3D web demo',
  chapter:'CHAPTER 01 · MARS',
  lead:'The future of the colony depends on your decisions.',
  summary:'A fault threatens Aurora-1 power supply. Explore the base, inspect its systems, and restore power before resources run out.',
  start:'▶ \u00a0 START DEMO',
  instructions:'CONTROLS & STORY',
  energy:'Energy',oxygen:'Oxygen',food:'Food',shield:'Shield',health:'Health',
  missionCurrent:'◉ \u00a0 CURRENT MISSION',
  missionTitle:{
   tutorial:'Tutorial (Sols 1–3):<br>Restore base power.',
   survival:'Survival (Sols 4–9):<br>Power & mystery clues.',
   final:'Sol 10 · Final Mission:<br>Protect Aurora-1.'
  },
  guide:'⌖ \u00a0 GO TO TARGET',view:'◎ \u00a0 CAMERA',wardrobe:'◈ \u00a0 WARDROBE · SKINS',
  foodShop:'🍽️ \u00a0 SUPPLIES · FOOD',backpack:'🎒 \u00a0 BACKPACK · M / CTRL+R',
  pause:'☰ \u00a0 MENU · ESC',
  tasks:['Inspect the solar panels.','Repair the regulator.','Reassign power.'],
  chapters:{tutorial:'Sols 1–3: Tutorial',survival:'Sols 4–9: Survival & Clues',final:'Sol 10: Final Mission'},
  phaseShort:{tutorial:'Tutorial',survival:'Survival',final:'Final Mission'}
 }
};
const SAVE_KEY='astrocolony-horizonte-save-v1';
const MISSION_PANEL_KEY='astrocolony-mission-panel-collapsed';
const WARDROBE_KEY='astrocolony-wardrobe-v1';
let engine=null,step=0,storm=false,started=false,paused=false,energy=62,oxygen=78,food=54,shield=68,health=100,lastTick=null,toastTimer=0,nasaWeather=null,lowHealthWarned=false,lastMoveHealthAt=0,heldFood=null,eatTimer=0;
const inspected=new Set();
let coins=0,equipped='explorer',owned=new Set(['explorer']),backpack={};
let lastSaveAt=-Infinity,activeEvent=null,eventCountdownTimer=0,nextEventTimer=0,eventIndex=0;
const colonyEvents=[
 {id:'solar',icon:'☀',fx:'solar',visualStorm:true,title:'Tormenta solar intensa',warning:'Sin acción en 30s: -15% Energía, -12% Blindaje, -6% Vida.',desc:'Una eyección de masa coronal se dirige hacia Aurora-1. Decide cómo proteger la base antes de que impacte.',timeoutPenalty:{energy:-15,shield:-12,health:-6},options:[
  {label:'01 · Activar escudo deflector',detail:'Usa -12% Energía para reforzar +10% Blindaje y evitar daños (+15 monedas).',delta:{energy:-12,shield:10,coins:15}},
  {label:'02 · Aislar paneles y usar reservas',detail:'Consume -8% Oxígeno y -5% Alimentos, pero mantiene el blindaje (+10 monedas).',delta:{oxygen:-8,food:-5,coins:10}},
  {label:'03 · Mantener producción máxima',detail:'Arriesga la red: +8% Energía, pero pierdes -18% Blindaje y -8% Vida.',delta:{energy:8,shield:-18,health:-8}}
 ]},
 {id:'dust',icon:'🌪',fx:'dust',visualStorm:true,title:'Tormenta de polvo marciano',warning:'Sin acción en 30s: -14% Energía, -10% Alimentos.',desc:'Fuertes vientos cubren los paneles solares y amenazan los conductos del invernadero.',timeoutPenalty:{energy:-14,food:-10},options:[
  {label:'01 · Sellar compuertas y filtros',detail:'Protege los cultivos: -9% Oxígeno y -5% Energía (+12 monedas).',delta:{oxygen:-9,energy:-5,coins:12}},
  {label:'02 · Purgar conductos con reserva eléctrica',detail:'Consume -11% Energía, pero estabiliza +5% Alimentos (+12 monedas).',delta:{energy:-11,food:5,coins:12}}
 ]},
 {id:'meteor',icon:'☄',fx:'meteor',visualStorm:true,title:'Lluvia de micrometeoritos',warning:'Sin acción en 30s: -16% Blindaje, -8% Oxígeno, -6% Vida.',desc:'Fragmentos orbitales están por impactar el perímetro de la colonia.',timeoutPenalty:{shield:-16,oxygen:-8,health:-6},options:[
  {label:'01 · Reforzar cúpula del invernadero',detail:'Usa -10% Energía y -4% Blindaje, pero asegura +6% Alimentos (+15 monedas).',delta:{energy:-10,shield:-4,food:6,coins:15}},
  {label:'02 · Desviar energía a barrera magnética',detail:'Consume -15% Energía y -5% Alimentos para ganar +8% Blindaje (+15 monedas).',delta:{energy:-15,food:-5,shield:8,coins:15}}
 ]},
 {id:'thermal',icon:'❄',fx:'thermal',visualStorm:false,title:'Caída térmica nocturna',warning:'Sin acción en 30s: -12% Alimentos, -10% Oxígeno, -5% Vida.',desc:'La temperatura exterior cayó drásticamente y exige más potencia térmica.',timeoutPenalty:{food:-12,oxygen:-10,health:-5},options:[
  {label:'01 · Encender calefactores de emergencia',detail:'Gasta -13% Energía para estabilizar +6% Oxígeno (+12 monedas).',delta:{energy:-13,oxygen:6,coins:12}},
  {label:'02 · Racionar suministros térmicos',detail:'Ahorra +5% Energía, pero pierdes -8% Alimentos y -5% Vida.',delta:{energy:5,food:-8,health:-5}}
 ]}
];
const tasks=['Inspecciona los paneles solares.','Repara el regulador.','Reasigna la energía.'];
const notes=[
 'La energía disminuye y puede afectar el oxígeno y los cultivos. Primero debemos revisar los paneles solares.',
 '¡Bien hecho! Los paneles están cubiertos de polvo marciano. Ya identificamos la causa, pero falta reparar el regulador.',
 'El regulador vuelve a funcionar. Ahora elige cómo distribuir la energía entre los sistemas de supervivencia.',
 '¡Misión completada! Restableciste la energía equilibrando los sistemas de Aurora-1.'
];
const robotGuides=[
 {name:'Luma',role:'energía',fact:'La electricidad de los paneles solares alimenta otros sistemas de la colonia. Si falla, revisa primero su superficie y luego el regulador.',encouragement:'¡Vas bien! Observar antes de reparar evita gastar recursos a ciegas.'},
 {name:'Nova',role:'soporte vital',fact:'El oxígeno y el cultivo de alimentos necesitan energía. Una decisión que mejora un recurso puede reducir otro.',encouragement:'Cada intento enseña algo. Mira los indicadores y decide con calma.'},
 {name:'Atlas',role:'protección',fact:'Marte tiene una atmósfera mucho más delgada que la Tierra. En esta simulación, el blindaje ayuda a proteger a la tripulación de la radiación.',encouragement:'La tripulación cuenta contigo. No tienes que resolverlo todo de una vez: sigue el siguiente objetivo.'}
];
const robotQuestions=[
 {question:'La energía está bajando. ¿Qué conviene revisar primero?',answers:['Paneles solares','Cambiar el traje'],correct:0,explanation:'Los paneles pueden perder rendimiento por el polvo. Inspecciónalos antes de reparar el regulador.'},
 {question:'¿Qué sistema también puede sufrir si gastas toda la energía?',answers:['El color del traje','El invernadero'],correct:1,explanation:'El invernadero necesita electricidad para mantener sus cultivos.'},
 {question:'Si una tormenta solar amenaza la base, ¿qué recurso debes vigilar?',answers:['Monedas','Blindaje'],correct:1,explanation:'El blindaje representa la protección de la tripulación frente a la radiación.'}
];
function missionHint(){return [
 'Busca los paneles solares marcados en el exterior. Entra con E y usa la consola para inspeccionarlos.',
 'Ya encontraste el problema. Ve al regulador de energía, entra con E y repáralo en la consola.',
 'Queda repartir la energía. Entra al centro de energía y compara el efecto de cada elección.',
 '¡Misión completada! Puedes seguir explorando los módulos y revisar cómo quedaron tus recursos.'
][step]}
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
function stats(){for(const [name,num] of Object.entries({energy,oxygen,food,shield,health})){const el=$(name);if(el)el.textContent=`${Math.round(num)} %`}$('healthVital')?.classList.toggle('low',health<=35)}
const spaceFoods=[
 {id:'apricots',icon:'🍑',name:'Albaricoques secos',desc:'Frutas deshidratadas que sirven como refrigerio.',price:8,heal:10},
 {id:'juice',icon:'🧃',name:'Jugos',desc:'Bebidas que se preparan agregando agua y se toman con una pajilla especial.',price:9,heal:11},
 {id:'carrots',icon:'🥕',name:'Zanahorias',desc:'Verduras frescas que pueden comer durante los primeros días.',price:10,heal:12},
 {id:'tortillas',icon:'🌮',name:'Tortillas',desc:'Son fáciles de comer y no producen migajas.',price:12,heal:15},
 {id:'pudding',icon:'🍫',name:'Pudín de chocolate',desc:'Postre que se puede comer con cuchara.',price:14,heal:16},
 {id:'eggs',icon:'🍳',name:'Huevos revueltos',desc:'Vienen precocinados y deshidratados. Se les agrega agua.',price:15,heal:18},
 {id:'shrimp',icon:'🍤',name:'Cóctel de camarones',desc:'Comida preparada que puede tener un sabor picante.',price:22,heal:25},
 {id:'steak',icon:'🥩',name:'Bistec de res',desc:'Carne tratada con irradiación para conservarse durante más tiempo.',price:30,heal:35},
];
function loseHealth(amount,floor=10){health=Math.max(floor,health-amount);stats();if(health<=35&&!lowHealthWarned){lowHealthWarned=true;toast('¡Tu vida está baja por el esfuerzo! Usa tus monedas en Suministros · Comida.')}else if(health>45){lowHealthWarned=false}}
function foodStore(){
 showModal('SUMINISTROS ESPACIALES',`Comida · ${coins} monedas · Vida ${Math.round(health)}%`,`<p>Compra alimentos con tus monedas para guardarlos en tu mochila (<b>Ctrl + R</b>). Usa <b>Ctrl + E</b> para comer el alimento de tu mano.</p><div class="food-grid">${spaceFoods.map(f=>`<article class="food-card"><div><div class="food-head"><span class="food-icon">${f.icon}</span><div><strong>${f.name}</strong><span class="food-meta">+${f.heal}% vida · ${f.price} monedas${backpack[f.id]?` · Mochila: x${backpack[f.id]}`:''}</span></div></div><small>${f.desc}</small></div><button type="button" data-food="${f.id}" ${coins<f.price?'disabled':''}>${coins>=f.price?`COMPRAR (${f.price} monedas)`:`FALTAN ${f.price-coins} monedas`}</button></article>`).join('')}</div>`,[{label:'ABRIR MOCHILA (CTRL+R)',secondary:true,action:backpackModal},{label:'VOLVER AL JUEGO',action:hideModal}]);
 for(const button of $('modalBody').querySelectorAll('[data-food]'))button.addEventListener('click',()=>{
  const item=spaceFoods.find(f=>f.id===button.dataset.food);
  if(!item||coins<item.price)return;
  coins-=item.price;
  backpack[item.id]=(backpack[item.id]||0)+1;
  heldFood=item;
  clearTimeout(eatTimer);eatTimer=0;
  engine?.setHeldFood?.(item.id);
  saveWardrobe();stats();
  toast(`Guardaste ${item.icon} ${item.name} en tu mochila (x${backpack[item.id]}). Pulsa Ctrl + E para comer.`);
  foodStore();
 });
}
function backpackModal(){
 if(paused&&$('modalTag').textContent==='MOCHILA DEL ASTRONAUTA'){hideModal();return}
 const items=spaceFoods.filter(f=>(backpack[f.id]||0)>0);
 const renderSlot=(item,isActive=false)=>item
  ?`<button type="button" class="mc-slot has-item${isActive?' active':''}" data-bp="${item.id}" title="${item.name} (+${item.heal}% vida)"><span>${item.icon}</span><span class="mc-count">${backpack[item.id]}</span></button>`
  :`<div class="mc-slot" aria-hidden="true"></div>`;
 const mainSlots=Array.from({length:27},(_,i)=>renderSlot(items[i]||null,items[i]&&heldFood?.id===items[i].id)).join('');
 const hotbarSlots=Array.from({length:9},(_,i)=>renderSlot(i===0?heldFood:null,i===0&&Boolean(heldFood))).join('');
 showModal('MOCHILA DEL ASTRONAUTA','Inventario',`<div class="mc-inv"><div class="mc-title"><span>Inventario</span><span>${items.reduce((s,f)=>s+backpack[f.id],0)} objetos</span></div><div class="mc-grid">${mainSlots}</div><div class="mc-hotbar">${hotbarSlots}</div></div><p class="mc-tip">Haz clic en un alimento para tomarlo en tu mano. Luego pulsa <b>Ctrl + E</b> para comerlo.</p>`,[{label:'IR A SUMINISTROS',secondary:true,action:foodStore},{label:'CERRAR (CTRL+R)',action:hideModal}]);
 for(const btn of $('modalBody').querySelectorAll('[data-bp]'))btn.addEventListener('click',()=>{
  const item=spaceFoods.find(f=>f.id===btn.dataset.bp);
  if(!item||!(backpack[item.id]>0))return;
  heldFood=item;
  clearTimeout(eatTimer);eatTimer=0;
  engine?.setHeldFood?.(item.id);
  hideModal();
  toast(`Tomaste ${item.icon} ${item.name} en tu mano (x${backpack[item.id]}). Pulsa Ctrl + E para comer.`);
 });
}
function eatHeldFood(){
 if(!heldFood){toast('No tienes comida en la mano. Abre tu mochila con Ctrl + R.');return}
 if(!engine?.triggerEat?.())return;
 const item=heldFood,stepHeal=item.heal/10;
 clearTimeout(eatTimer);
 toast(`Comiendo ${item.icon} ${item.name}…`);
 let steps=0;
 const tick=()=>{
  if(steps>=10||!heldFood)return;
  steps++;
  health=Math.min(100,health+stepHeal);
  if(health>35)lowHealthWarned=false;
  stats();
  if(steps<10)eatTimer=setTimeout(tick,180);
 };
 eatTimer=setTimeout(tick,180);
}
function finishEating(){
 clearTimeout(eatTimer);eatTimer=0;
 if(!heldFood)return;
 const item=heldFood;
 if(backpack[item.id]>1)backpack[item.id]--;else delete backpack[item.id];
 heldFood=null;
 saveWardrobe();
 toast(`¡Comiste ${item.icon} ${item.name}! Vida: ${Math.round(health)}%.`);
}
const MISSION_COIN_TOTAL=110;
function coinPercent(amount){return Math.round((amount/MISSION_COIN_TOTAL)*100)}
function updateWallet(){$('coinCount').textContent=String(coins);const pct=$('coinPct');if(pct)pct.textContent=`(${Math.min(100,coinPercent(coins))}%)`}
function saveWardrobe(){try{localStorage.setItem(WARDROBE_KEY,JSON.stringify({coins,owned:[...owned],equipped,backpack}))}catch{}updateWallet();saveGame(true)}
function loadWardrobe(){try{const saved=JSON.parse(localStorage.getItem(WARDROBE_KEY)||'null'),ids=new Set(window.MarsGfx.skins.map(s=>s.id)),foodIds=new Set(spaceFoods.map(f=>f.id));if(saved&&Number.isInteger(saved.coins)&&saved.coins>=0&&saved.coins<=100000){coins=saved.coins;owned=new Set(['explorer',...(Array.isArray(saved.owned)?saved.owned.filter(id=>ids.has(id)):[])]);equipped=owned.has(saved.equipped)?saved.equipped:'explorer';backpack={};if(saved.backpack&&typeof saved.backpack==='object')for(const [k,v] of Object.entries(saved.backpack))if(foodIds.has(k)&&Number.isInteger(v)&&v>0&&v<=999)backpack[k]=v}else{const oldStep=JSON.parse(localStorage.getItem(SAVE_KEY)||'null')?.step;coins=[0,25,60,110][oldStep]||0;backpack={};localStorage.setItem(WARDROBE_KEY,JSON.stringify({coins,owned:['explorer'],equipped,backpack}))}}catch{}updateWallet()}
function earnCoins(amount){coins+=amount;saveWardrobe()}
function wardrobe(){const skins=window.MarsGfx.skins;showModal('COLECCIÓN DE TRAJES',`Armario · ${coins} monedas`,`<p>Completa objetivos de la misión para ganar monedas. Compra una apariencia una vez y úsala cuando quieras.</p><div class="skin-grid">${skins.map(s=>`<article class="skin-card"><div class="skin-preview" style="--suit:${s.suit};--helmet:${s.helmet};--pack:${s.pack};--accent:${s.accent}"><i class="skin-head"></i><i class="skin-body"></i><i class="skin-pack"></i></div><div><strong>${s.name}</strong><small>${s.price===0?'Incluido':`${s.price} monedas`}</small></div><button type="button" data-skin="${s.id}" ${!owned.has(s.id)&&coins<s.price?'disabled':''}>${equipped===s.id?'EN USO':owned.has(s.id)?'EQUIPAR':coins>=s.price?'COMPRAR':`FALTAN ${s.price-coins}`}</button></article>`).join('')}</div>`,[{label:'VOLVER AL JUEGO',action:hideModal}]);for(const button of $('modalBody').querySelectorAll('[data-skin]'))button.addEventListener('click',()=>{const skin=skins.find(s=>s.id===button.dataset.skin);if(!skin||equipped===skin.id)return;if(!owned.has(skin.id)){if(coins<skin.price)return;coins-=skin.price;owned.add(skin.id)}equipped=skin.id;engine.setSkin(equipped);saveWardrobe();hideModal();toast(`${skin.name} equipada. Tu colección tiene ${owned.size} apariencias.`)})}
function saveGame(force=false){if(!started||!engine)return;const now=performance.now();if(!force&&now-lastSaveAt<900)return;lastSaveAt=now;try{localStorage.setItem(SAVE_KEY,JSON.stringify({version:1,world:engine.snapshot(),mode:playerMode,step,energy,oxygen,food,shield,health,inspected:[...inspected],botText:$('botText').textContent}))}catch{}}
function loadGame(){try{const saved=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');if(saved?.version!==1||!Number.isInteger(saved.step)||saved.step<0||saved.step>3||!['energy','oxygen','food','shield'].every(key=>Number.isFinite(saved[key])&&saved[key]>=0&&saved[key]<=100)||!engine.restore(saved.world))return false;if(saved.mode==='explorador'||saved.mode==='comandante')playerMode=saved.mode;updateMode();step=saved.step;energy=saved.energy;oxygen=saved.oxygen;food=saved.food;shield=saved.shield;health=Number.isFinite(saved.health)&&saved.health>=0&&saved.health<=100?saved.health:100;inspected.clear();for(const item of Array.isArray(saved.inspected)?saved.inspected:[])if(typeof item==='string'&&item.length<80)inspected.add(item);storm=Boolean(saved.world.stormTarget);stats();checklist();message(typeof saved.botText==='string'?saved.botText.slice(0,350):notes[Math.min(step,3)]);updateInterior();$('world').classList.toggle('storm',storm);$('alertLabel').textContent=weatherLabel();return true}catch{return false}}
function applyLanguage(){
 const t=UI_TEXT[lang]||UI_TEXT.es;
 if($('menuOverline'))$('menuOverline').textContent=t.overline;
 if($('menuChapter'))$('menuChapter').textContent=t.chapter;
 if($('menuLead'))$('menuLead').textContent=t.lead;
 if($('menuSummary'))$('menuSummary').textContent=t.summary;
 if($('start')&&!$('start').disabled)$('start').textContent=t.start;
 if($('instructions'))$('instructions').textContent=t.instructions;
 if($('lblEnergy'))$('lblEnergy').textContent=t.energy;
 if($('lblOxygen'))$('lblOxygen').textContent=t.oxygen;
 if($('lblFood'))$('lblFood').textContent=t.food;
 if($('lblShield'))$('lblShield').textContent=t.shield;
 if($('lblHealth'))$('lblHealth').textContent=t.health;
 if($('lblMissionCurrent'))$('lblMissionCurrent').textContent=t.missionCurrent;
 if($('missionTitle'))$('missionTitle').innerHTML=t.missionTitle[solChapter]||t.missionTitle.tutorial;
 if($('guide'))$('guide').textContent=t.guide;
 if($('view'))$('view').textContent=t.view;
 if($('wardrobe'))$('wardrobe').textContent=t.wardrobe;
 if($('foodShop'))$('foodShop').textContent=t.foodShop;
 if($('backpackBtn'))$('backpackBtn').textContent=t.backpack;
 if($('pause'))$('pause').textContent=t.pause;
 for(const btn of document.querySelectorAll('[data-lang]'))btn.classList.toggle('active',btn.dataset.lang===lang);
 for(const btn of document.querySelectorAll('[data-chapter]')){
  btn.textContent=t.chapters[btn.dataset.chapter]||btn.textContent;
  btn.classList.toggle('active',btn.dataset.chapter===solChapter);
 }
 if($('solNum'))$('solNum').textContent=`Sol ${currentSol}`;
 if($('solPhaseLabel'))$('solPhaseLabel').textContent=t.phaseShort[solChapter];
 checklist();
 updateAlertUI();
}
function setLanguage(next){
 lang=next==='en'?'en':'es';
 try{localStorage.setItem(LANG_KEY,lang)}catch{}
 applyLanguage();
 toast(lang==='en'?'Language switched to English.':'Idioma cambiado a Español.');
}
function setSolChapter(next,resetRun=false){
 solChapter=next==='survival'||next==='final'?next:'tutorial';
 currentSol=solChapter==='final'?10:solChapter==='survival'?4:1;
 try{localStorage.setItem(SOL_CHAPTER_KEY,solChapter)}catch{}
 applyLanguage();
 if(resetRun&&started){restart()}
}
function openChapterModal(){
 const t=UI_TEXT[lang]||UI_TEXT.es;
 showModal(
  lang==='en'?'GAME MODE · SOLS':'MODO DE JUEGO · SOLES',
  lang==='en'?'Choose colony stage':'Elige la etapa de la colonia',
  `<div class="choices">
   <button class="choice" data-pick-ch="tutorial"><strong>${t.chapters.tutorial}</strong><small>${lang==='en'?'Learn the base systems with gentle alerts.':'Aprende los sistemas básicos con alertas suaves.'}</small></button>
   <button class="choice" data-pick-ch="survival"><strong>${t.chapters.survival}</strong><small>${lang==='en'?'Faster survival events and hidden mystery clues in modules.':'Desafíos de supervivencia más frecuentes y pistas del misterio en los módulos.'}</small></button>
   <button class="choice" data-pick-ch="final"><strong>${t.chapters.final}</strong><small>${lang==='en'?'Apply everything you learned to protect Aurora-1 and solve the mystery.':'Aplica lo aprendido para proteger Aurora-1 y resolver el misterio.'}</small></button>
  </div>`,
  [{label:lang==='en'?'CLOSE':'CERRAR',secondary:true,action:hideModal}]
 );
 for(const btn of $('modalBody').querySelectorAll('[data-pick-ch]'))btn.addEventListener('click',()=>{
  const chosen=btn.dataset.pickCh;
  hideModal();
  setSolChapter(chosen,true);
  toast(t.chapters[chosen]);
 });
}
function checklist(){const list=(UI_TEXT[lang]||UI_TEXT.es).tasks;$('checks').innerHTML=list.map((text,i)=>`<div class="check ${i<step?'done':''}"><div class="square">${i<step?'✓':''}</div><span>${text}</span></div>`).join('');$('guide').disabled=step>=3}
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
function showModal(tag,title,html,actions){$('modalTag').textContent=tag;$('modalTitle').textContent=title;$('modalBody').innerHTML=html;const btns=$('modalButtons');btns.innerHTML='';btns.className=`dlgbuttons actions-${Math.min(actions.length,3)}`;for(const a of actions){const b=document.createElement('button');b.type='button';b.className=a.secondary?'ghostbtn':'mainbtn';b.textContent=a.label;b.addEventListener('click',a.action);btns.appendChild(b)}shade.classList.remove('hidden');if(engine)engine.pause(true);paused=true}
function hideModal(){shade.classList.add('hidden');engine?.pause(false);paused=false}
function instructional(){showModal('INSTRUCCIONES DE LA MISIÓN','Bienvenido a Aurora-1',`<p>Has llegado a una colonia de investigación en Marte. Una avería amenaza el suministro energético, y ASTROBOT necesita tu ayuda para proteger a la tripulación.</p><p><b style="color:#ffdc9b">Controles:</b> usa <b>W A S D</b> para caminar, <b>Espacio</b> para saltar, arrastra el ratón para mirar y <b>V</b> para cambiar de cámara. Acércate a un módulo y pulsa <b>E</b> para entrar; dentro, pulsa <b>E</b> junto a la consola para usarla o junto a la puerta para salir. <b>P</b> o <b>Tab</b> abre el panel de la base.</p><p><b>Ir al objetivo</b> orienta la cámara hacia el siguiente equipo; tú controlas el movimiento.</p><p style="font-size:12px;color:#b9ced1">El clima espacial consulta NASA DONKI. Los recursos y decisiones del juego son una simulación educativa.</p>`,[{label:'ENTENDIDO',action:hideModal}])}
function missionPanel(){showModal('ESTADO DE LA COLONIA','Sistema de soporte vital',`<p><b>Modo de juego: ${modeLabel()}.</b></p><p>Esta pantalla muestra cómo tus decisiones afectan a cuatro recursos de la colonia. Una acción puede beneficiar un sistema y comprometer otro.</p><div class="statline"><b>ϟ Energía: ${energy}%</b><b>💧 Oxígeno: ${oxygen}%</b><b>🌿 Alimentos: ${food}%</b><b>⬡ Blindaje: ${shield}%</b></div><p><b style="color:#ffdc9b">Objetivo actual:</b> ${tasks[Math.min(step,2)]}</p><p style="font-size:12px">Inspiración científica: NASA Mars Trek (terreno), DONKI (actividad solar), RadLab (radiación) y CSA (producción de alimentos). Los porcentajes y el comportamiento de la colonia son simulaciones didácticas; el clima espacial proviene de NASA DONKI.</p>`,[{label:'VOLVER A LA MISIÓN',action:hideModal}])}
function pauseGame(){if(!started)return;showModal('PAUSA','Exploración detenida',`<p><b>Modo de juego: ${modeLabel()}.</b></p><p>Estás en Aurora-1, Sol 12. Puedes continuar la exploración, consultar los controles o regresar al menú inicial.</p><p>Progreso actual: <b>${step}/3 objetivos completados.</b></p><p>Tu exploración se guarda automáticamente.</p>`,[{label:'CONTINUAR',action:hideModal},{label:'ABRIR AVENTURA COMPLETA',secondary:true,action:()=>window.parent.location.assign('/game/legacy')},{label:'INSTRUCCIONES',secondary:true,action:instructional},{label:'SALIR AL MENÚ',secondary:true,action:()=>{hideModal();window.parent.location.assign('/');}}])}
function choices(){showModal('CONSOLA DE ENERGÍA','¿Cómo repartirías la energía?',`<p>El regulador vuelve a funcionar, pero los módulos de la colonia compiten por la electricidad disponible. ASTROBOT necesita que tomes la decisión final.</p><div class="choices"><button class="choice" id="balance"><strong>01 · Distribución equilibrada</strong><small>Dar prioridad al soporte vital, mantener iluminación de cultivos y reservar energía de protección.</small></button><button class="choice" id="allpower"><strong>02 · Concentrar toda la energía en el hábitat</strong><small>Mejora la reserva inmediata de oxígeno, pero sacrifica la producción del invernadero.</small></button></div>`,[{label:'CANCELAR',secondary:true,action:hideModal}]);
 $('balance').addEventListener('click',()=>finalize(true));$('allpower').addEventListener('click',()=>finalize(false));}
function finalize(balanced){if(step!==2)return;step=3;energy=balanced?95:100;oxygen=balanced?84:96;food=balanced?63:38;shield=balanced?74:61;if(solChapter==='tutorial')currentSol=3;else if(solChapter==='survival')currentSol=9;const reward=solChapter==='final'?100:50;loseHealth(15,5);earnCoins(reward);stats();applyLanguage();const finTitle=solChapter==='final'?(lang==='en'?'SOL 10 · FINAL MISSION COMPLETED':'SOL 10 · MISIÓN FINAL COMPLETADA'):(lang==='en'?'MISSION 01 COMPLETED':'MISIÓN 01 COMPLETADA');const finBody=solChapter==='final'?(lang==='en'?'You applied everything learned across Aurora-1, stabilized the power grid against the storm, and traced the subsurface signal to a geothermal pocket that can sustain the colony!':'Aplicaste todo lo aprendido en Aurora-1, estabilizaste la red frente a la tormenta y confirmaste que la señal subterránea era una bolsa geotérmica capaz de sostener la colonia.'):(balanced?notes[3]:'La tripulación está a salvo por ahora, pero el invernadero perdió energía. En una misión real, cada decisión tiene consecuencias.');message(finBody);
 showModal(finTitle,balanced?(lang==='en'?'Aurora-1 is stable':'Aurora-1 vuelve a estar estable'):(lang==='en'?'Decision made: resources under tension':'Decisión tomada: recursos en tensión'),`<p class="coin-reward">+${reward} ${lang==='en'?'coins':'monedas'} (+${coinPercent(reward)}%) ${lang==='en'?'for completing the mission':'por completar la misión'}</p><p>${finBody}</p><div class="statline"><b>ϟ ${lang==='en'?'Energy':'Energía'} ${energy}%</b><b>💧 ${lang==='en'?'Oxygen':'Oxígeno'} ${oxygen}%</b><b>🌿 ${lang==='en'?'Food':'Alimentos'} ${food}%</b><b>⬡ ${lang==='en'?'Shield':'Blindaje'} ${shield}%</b></div><p><b>${lang==='en'?'Key takeaway:':'Aprendizaje:'}</b> ${lang==='en'?'A space colony requires connected decisions: energy, life support, shielding, and food depend on one another.':'una colonia espacial necesita tomar decisiones conectadas: energía, soporte vital, blindaje y alimentación dependen unos de otros.'}</p>`,[{label:lang==='en'?'VIEW SKINS':'VER APARIENCIAS',action:wardrobe},{label:lang==='en'?'KEEP EXPLORING':'VOLVER A EXPLORAR',secondary:true,action:hideModal},{label:lang==='en'?'RESTART MISSION':'REINICIAR LA MISIÓN',secondary:true,action:()=>{hideModal();restart()}}]);}
const MAINT_SPEC={
 solar:{
  title:'Servicio del campo solar',
  sub:'Panel eléctrico SA-04. Aísla, inspecciona, limpia y verifica el campo solar.',
  steps:['Aislar circuito','Diagnosticar rendimiento','Limpiar las celdas','Ajustar orientación','Verificar producción'],
  hints:['Acciona el aislador amarillo en la zona inferior izquierda.','Presiona el botón de diagnóstico en el panel central.','Desliza el cursor por las celdas azules o utiliza el cepillo accesible.','Ajusta la orientación hasta 45° con el control de inclinación.','Pulsa el botón de prueba para comprobar el resultado.'],
  targets:['AISLADOR PRINCIPAL','DIAGNÓSTICO SCAN','SUPERFICIE SOLAR','AJUSTE DE ÁNGULO','BOTÓN DE PRUEBA']
 },
 regulator:{
  title:'Reparación del regulador',
  sub:'Regulador RG-02. Identifica el fusible F2, retíralo, instala el repuesto y verifica.',
  steps:['Aislar circuito','Realizar diagnóstico','Identificar y extraer F2','Instalar repuesto','Verificar regulador'],
  hints:['Acciona el aislador amarillo en la zona inferior izquierda.','Ejecuta el diagnóstico en el botón SCAN.','Selecciona el fusible averiado: F2. Una elección incorrecta no avanza.','Toma el fusible de repuesto de la bandeja inferior.','Activa la prueba final para confirmar la reparación.'],
  targets:['AISLADOR PRINCIPAL','DIAGNÓSTICO SCAN','FUSIBLE F2','REPUESTO F2','BOTÓN DE PRUEBA']
 }
};
let maintStation=null,maintStep=0,maintCleanProgress=0,maintTilt=10;
function maintDescText(){
 if(maintStep===0)return 'Selecciona el aislador amarillo; este ejercicio no habilita trabajo eléctrico real.';
 if(maintStep===1)return 'Usa el botón SCAN del panel físico.';
 if(maintStep===2)return maintStation==='solar'?`Retira el polvo: ${Math.round(maintCleanProgress)}% completado. Arrastra sobre las celdas azules o usa el cepillo.`:'Elige cuál de las tres celdas presenta el fallo.';
 if(maintStep===3)return maintStation==='solar'?`Orienta la maqueta a 45°. Valor actual: ${maintTilt}°`:'Instala el repuesto desde la bandeja inferior.';
 return 'Pulsa TEST y verifica la restauración de la potencia.';
}
function renderMaint(){
 const overlay=$('maintOverlay');
 if(!overlay||!maintStation)return;
 const spec=MAINT_SPEC[maintStation]||MAINT_SPEC.regulator;
 const statusList=['AVERÍA','AISLADO','DIAGNÓSTICO','SERVICIO','PRUEBA'];
 const desc=maintDescText();
 const readout=maintStation==='solar'?`${Math.min(94,42+Math.round(maintCleanProgress*.32)+Math.round(maintTilt*.28))} %`:`${Math.round(energy)} %`;
 $('maintTitle').textContent=spec.title;
 $('maintSub').textContent=spec.sub;
 $('maintEnergy').textContent=`${Math.round(energy)}%`;
 $('maintPct').textContent=readout;
 $('maintBar').style.width=`${Math.round(maintStep/5*100)}%`;
 $('maintStatus').textContent=statusList[Math.min(maintStep,4)];
 $('maintDiag').textContent=desc;
 $('maintBot').textContent=spec.hints[Math.min(maintStep,4)];
 $('maintSteps').innerHTML=spec.steps.map((s,i)=>`<div class="maint-step ${i<maintStep?'done':i===maintStep?'active':''}"><span class="maint-num">0${i+1}</span><span>${s}</span></div>`).join('');
 const targetLabel=spec.targets[Math.min(maintStep,4)];
 if($('maintIntTitle'))$('maintIntTitle').textContent=targetLabel;
 if($('maintIntDesc'))$('maintIntDesc').textContent=desc;
 const actionBtn=$('maintAction');
 if(actionBtn)actionBtn.textContent=maintStep===2&&maintStation==='regulator'?'E · ELEGIR FUSIBLE':maintStep===2&&maintStation==='solar'?'E · LIMPIAR CELDAS':maintStep===3&&maintStation==='solar'?'E · AJUSTAR ÁNGULO':'E · MANIPULAR';
 const specific=$('maintSpecific');
 if(specific){
  specific.replaceChildren();
  if(maintStep===2&&maintStation==='solar'){
   const b=document.createElement('button');b.type='button';b.id='maintBrush';b.textContent=`CEPILLO · ${Math.round(maintCleanProgress)}%`;b.onclick=()=>maintClean(25);specific.appendChild(b);
   const p=document.createElement('span');p.style.cssText='color:#aad4d0;font-size:10px';p.textContent='También puedes arrastrar sobre el panel azul.';specific.appendChild(p);
  }else if(maintStep===2&&maintStation==='regulator'){
   for(let i=0;i<3;i++){const b=document.createElement('button');b.type='button';b.dataset.fuse=String(i);b.textContent=`F${i+1}`;b.onclick=()=>maintChooseFuse(i);specific.appendChild(b)}
  }else if(maintStep===3&&maintStation==='solar'){
   const label=document.createElement('label');label.textContent=`INCLINACIÓN ${maintTilt}°`;
   const slider=document.createElement('input');slider.id='maintAngle';slider.type='range';slider.min='0';slider.max='90';slider.step='1';slider.value=String(maintTilt);
   slider.oninput=e=>maintSetTilt(e.target.value);
   label.appendChild(slider);specific.appendChild(label);
  }else{
   const p=document.createElement('span');p.style.cssText='font-size:11px;color:#b0d3d7';p.textContent='Pulsa el control resaltado o utiliza E.';specific.appendChild(p);
  }
 }
 window.HorizonteMaint3D?.setState({step:maintStep,cleanProgress:maintCleanProgress,tilt:maintTilt});
}
function maintClean(amount){
 if(!maintStation||maintStation!=='solar'||maintStep!==2)return;
 maintCleanProgress=Math.min(100,maintCleanProgress+amount);
 if(maintCleanProgress>=90){maintStep=3;toast('Celdas limpias. Ajusta la inclinación del panel a 45°.')}
 renderMaint();
}
function maintSetTilt(v){
 maintTilt=+v;
 if(!maintStation||maintStation!=='solar'||maintStep!==3)return;
 if(maintTilt>=43&&maintTilt<=47){maintStep=4;toast('Orientación adecuada: 45°. Comprueba el circuito.');renderMaint();return}
 renderMaint();
}
function maintChooseFuse(index){
 if(!maintStation||maintStation!=='regulator'||maintStep!==2)return;
 if(index!==1){toast(`F${index+1} no es el fusible defectuoso. Busca la celda indicada en el diagnóstico.`);return}
 maintStep=3;toast('F2 extraído con la herramienta. Instala el repuesto.');renderMaint();
}
function openMaintenance(stationId){
 maintStation=stationId;maintStep=0;maintCleanProgress=0;maintTilt=10;
 const overlay=$('maintOverlay');
 if(!overlay)return;
 renderMaint();
 overlay.classList.remove('hidden');
 window.HorizonteMaint3D?.start(stationId,0,{onAct:contextualMaintAction,onClean:maintClean,onChooseFuse:maintChooseFuse});
 engine?.pause(true);paused=true;
}
function closeMaintenance(){
 maintStation=null;
 window.HorizonteMaint3D?.stop();
 $('maintOverlay')?.classList.add('hidden');
 engine?.pause(false);paused=false;
}
function contextualMaintAction(){
 if(!maintStation)return;
 if(maintStep===2&&maintStation==='solar'){maintClean(25);return}
 if(maintStep===2&&maintStation==='regulator'){toast('Elige F1, F2 o F3 en el panel o haz clic sobre F2.');return}
 if(maintStep===3&&maintStation==='solar'){maintSetTilt(45);return}
 advanceMaintenance();
}
function advanceMaintenance(){
 if(!maintStation)return;
 if(maintStep<4){
  maintStep++;
  renderMaint();
  return;
 }
 const id=maintStation;
 closeMaintenance();
 if(id==='solar'&&step===0){step=1;energy=67;if(solChapter==='tutorial')currentSol=2;else if(solChapter==='survival')currentSol=6;loseHealth(15,5);earnCoins(25);message(notes[1]);toast(`Paneles inspeccionados: +25 monedas (+${coinPercent(25)}%) y +5% energía.`);}
 else if(id==='regulator'&&step===1){step=2;energy=85;if(solChapter==='tutorial')currentSol=3;else if(solChapter==='survival')currentSol=8;loseHealth(18,5);earnCoins(35);message(notes[2]);toast(`Regulador reparado: +35 monedas (+${coinPercent(35)}%) y +18% energía.`);}
 applyLanguage();stats();saveGame(true);
}
function interact(nearest){if(maintStation){contextualMaintAction();return}if(nearest?.robot&&!nearest.inside){talkToRobot(nearest.robot);return}if(!nearest||!nearest.station){toast('Acércate a un módulo o a un robot para interactuar.');return}const {station,dist}=nearest;
 if(!nearest.inside){if(dist>5.7){toast(`Acércate a ${station.name}. Estás a ${Math.round(dist)} m.`);return}if(engine.enter(station.id)){updateInterior();toast(`Entraste a ${station.name}. Explora con WASD; usa E junto a la puerta para salir.`)}return}
 if(nearest.atExit){engine.leave();updateInterior();toast('Regresaste al exterior de Aurora-1.');return}
 if(dist>2.5){toast(`Acércate a ${nearest.target.name}.`);return}
 if(nearest.target.id!=='console'){
  const target=nearest.target,key=`${station.id}:${target.id}`;
  if(inspected.has(key)){toast('Ya registraste este hallazgo. Busca otro equipo.');return}
  showModal('HALLAZGO EN EL MÓDULO',target.name,`<p>${target.detail}</p><p>Registra lo que observaste para ayudar a la colonia.</p>`,[{label:'REGISTRAR HALLAZGO',action:()=>{inspected.add(key);if(station.id==='greenhouse')food=Math.min(100,food+2);else if(station.id==='habitat')oxygen=Math.min(100,oxygen+1);else energy=Math.min(100,energy+1);loseHealth(6,5);hideModal();toast('Hallazgo registrado. ¡Sigue explorando!')}},{label:'SEGUIR EXPLORANDO',secondary:true,action:hideModal}]);return;
 }
 if(step===3){toast('Puedes seguir explorando los módulos de Aurora-1.');return}const needed=['solar','regulator','energy'][step];if(station.id!==needed){toast('Explora este lugar. El objetivo de la misión está marcado en el exterior.');return}
 if(step===0||step===1){openMaintenance(station.id);return}else {choices();return}checklist();stats();saveGame(true);}
function guide(){if(step>=3)return;if(engine?.getState().interior){toast('Sal por la puerta del módulo para seguir el marcador del exterior.');return}engine?.goTo(['solar','regulator','energy'][step]);toast(playerMode==='explorador'?'Mira el marcador dorado y camina con WASD hasta el equipo.':'Modo Comandante: sigue el marcador dorado y usa WASD para llegar al objetivo.')}
function updateInterior(){const id=engine?.getState().interior,station=window.MarsGfx.stations.find(s=>s.id===id);$('interiorHud').classList.toggle('hidden',!id);ui.classList.toggle('interior-mode',!!id);$('interiorName').textContent=station?.name||'';$('mobileInteract').textContent=id?'E · USAR / SALIR':'E · ENTRAR / USAR';$('world').classList.toggle('interior',!!id)}
function hudRects(includeWaypoint=false){const selectors=['.topbar','.mission-card','.alert','.menu-pause','.controls','.astrobot','.interior-hud','.sky-note'];if(includeWaypoint)selectors.push('.waypoint');return selectors.map(selector=>document.querySelector(selector)).filter(el=>el&&getComputedStyle(el).display!=='none').map(el=>el.getBoundingClientRect())}
function overlaps(a,b,pad=10){return a.left<b.right+pad&&a.right>b.left-pad&&a.top<b.bottom+pad&&a.bottom>b.top-pad}
function markerFits(x,y,width,height,placed=[],includeWaypoint=false){const rect={left:x-width/2,right:x+width/2,top:y-height,bottom:y};return x>width/2+12&&x<canvas.clientWidth-width/2-12&&y>height+10&&y<canvas.clientHeight-20&&!hudRects(includeWaypoint).some(ui=>overlaps(rect,ui))&&!placed.some(other=>overlaps(rect,other,5))?rect:null}
function updateSky(markers){const layer=$('skyLabels');layer.classList.toggle('hidden',!markers.length);$('skyNote').classList.toggle('hidden',!markers.length);while(layer.children.length<markers.length){const el=document.createElement('span');el.className='sky-label';layer.appendChild(el)}const placed=[];for(let i=0;i<layer.children.length;i++){const el=layer.children[i],p=markers[i];el.style.display='none';if(!p?.inView)continue;const rect=markerFits(p.x,p.y,Math.max(42,p.name.length*7+16),25,placed,true);if(!rect)continue;placed.push(rect);el.textContent=p.name;el.classList.toggle('fiction',p.name.startsWith('Platillo'));el.style.left=p.x+'px';el.style.top=p.y+'px';el.style.display='block'}}
function updateTick(d){lastTick=d;const now=performance.now();if(d.moving){if(lastMoveHealthAt){const elapsed=Math.min(now-lastMoveHealthAt,5000);loseHealth(elapsed/180000,10)}lastMoveHealthAt=now}else{lastMoveHealthAt=0}saveGame();const wp=$('waypoint'),hud=$('interiorHud');if(d.interior){updateSky([]);wp.style.display='none';$('interiorHint').textContent=d.nearest.dist<2.5?`E · ${d.nearest.target.name}`:`Acércate a ${d.nearest.target.name}`;$('botStatus').textContent='● EXPLORANDO EL INTERIOR';$('fps').textContent=d.fps+' FPS';return}const robot=d.nearest.robot;const near=d.nearest.station&&d.nearest.dist<5.7;hud.classList.toggle('hidden',!robot&&!near);if(robot){const guide=robotGuides[robot.id];$('interiorName').textContent=guide.name+' / ROBOT';$('interiorHint').textContent='\u00a1Hola! Pulsa E para conversar';$('mobileInteract').textContent='E \u00b7 HABLAR'}else{$('mobileInteract').textContent='E \u00b7 ENTRAR / USAR'}if(!robot&&near){$('interiorName').textContent=d.nearest.station.name;$('interiorHint').textContent='E · Entrar al módulo'}const needed=window.MarsGfx.stations[Math.min(step,2)],p=d.markers[needed.id];const dist=Math.hypot(needed.x-d.pos[0],needed.z-d.pos[2]);if(step>=3||!p||!p.inView||!markerFits(p.x,p.y,145,90)){wp.style.display='none'}else{wp.style.display='flex';wp.style.left=p.x+'px';wp.style.top=p.y+'px';$('waypointTitle').textContent=needed.name;$('distance').textContent=dist<5.8?'Presiona E para entrar':`${Math.round(dist)} m`;}updateSky(d.skyMarkers||[]);if(robot){$('botStatus').textContent='ROBOT CERCANO / PULSA E'}else if(step<3&&dist<5.8&&d.nearest.station.id===needed.id&&Math.round(performance.now()/1100)%2===0){$('botStatus').textContent='● ENTRADA ALCANZADA · PULSA E'}else $('botStatus').textContent='● CANAL DE ASISTENCIA ACTIVO';$('fps').textContent=d.fps+' FPS';}
function applyResourceDelta(delta){
 const parts=[];
 if(delta.energy){energy=Math.max(0,Math.min(100,energy+delta.energy));parts.push(`${delta.energy>0?'+':''}${delta.energy}% Energía`)}
 if(delta.oxygen){oxygen=Math.max(0,Math.min(100,oxygen+delta.oxygen));parts.push(`${delta.oxygen>0?'+':''}${delta.oxygen}% Oxígeno`)}
 if(delta.food){food=Math.max(0,Math.min(100,food+delta.food));parts.push(`${delta.food>0?'+':''}${delta.food}% Alimentos`)}
 if(delta.shield){shield=Math.max(0,Math.min(100,shield+delta.shield));parts.push(`${delta.shield>0?'+':''}${delta.shield}% Blindaje`)}
 if(delta.health){health=Math.max(0,Math.min(100,health+delta.health));parts.push(`${delta.health>0?'+':''}${delta.health}% Vida`)}
 if(delta.coins){earnCoins(delta.coins);parts.push(`+${delta.coins} monedas`)}
 stats();saveGame(true);
 return parts.join(' · ');
}
function updateAlertUI(){
 const btn=$('alert'),title=$('alertTitle'),timer=$('alertTimer'),icon=$('alertIcon'),label=$('alertLabel');
 if(activeEvent){
  btn?.classList.add('urgent');
  if(icon)icon.textContent=activeEvent.icon;
  if(title)title.textContent=activeEvent.title;
  if(timer){timer.textContent=`${activeEvent.timeLeft}s`;timer.classList.remove('hidden')}
  if(label)label.textContent=`Clic para responder · ${activeEvent.warning}`;
  return;
 }
 btn?.classList.remove('urgent');
 if(icon)icon.textContent='☀';
 if(title)title.textContent='Alerta de clima espacial';
 timer?.classList.add('hidden');
 if(label)label.textContent=weatherLabel();
}
function clearEventVisuals(){
 storm=false;
 engine?.setStorm?.(false);
 $('world')?.classList.remove('storm');
 const fx=$('eventFx');
 if(fx)fx.className='event-fx';
 updateAlertUI();
}
function scheduleNextEvent(delayMs=45000){
 clearTimeout(nextEventTimer);
 nextEventTimer=setTimeout(()=>{
  if(started&&!activeEvent)startColonyEvent();
  else if(started)scheduleNextEvent(20000);
 },delayMs);
}
function tickEventTimer(){
 clearTimeout(eventCountdownTimer);
 if(!activeEvent)return;
 eventCountdownTimer=setTimeout(()=>{
  if(!activeEvent)return;
  if(!paused&&!maintStation&&shade.classList.contains('hidden')){
   activeEvent.timeLeft--;
   updateAlertUI();
   if(activeEvent.timeLeft<=0){
    const ev=activeEvent;
    activeEvent=null;
    const summary=applyResourceDelta(ev.timeoutPenalty);
    updateAlertUI();
    message(`IMPACTO: ${ev.title} golpeó Aurora-1 (${summary}).`);
    toast(`💥 ${ev.title}: ${summary}`);
    setTimeout(()=>{if(!activeEvent)clearEventVisuals()},4000);
    scheduleNextEvent(45000);
    return;
   }
  }
  tickEventTimer();
 },1000);
}
function startColonyEvent(ev=null){
 if(activeEvent)return;
 const chosen=ev||colonyEvents[eventIndex%colonyEvents.length];
 eventIndex++;
 activeEvent={...chosen,timeLeft:30};
 storm=!!chosen.visualStorm;
 engine?.setStorm?.(storm);
 $('world')?.classList.toggle('storm',storm);
 const fx=$('eventFx');
 if(fx)fx.className=`event-fx active ${chosen.fx}`;
 updateAlertUI();
 message(`ALERTA (${activeEvent.timeLeft}s): ${chosen.title}. ${chosen.warning}`);
 toast(`⚠ ${chosen.icon} ${chosen.title} (30s) — Haz clic en la alerta para actuar`);
 tickEventTimer();
}
function resolveColonyEvent(optionIndex){
 if(!activeEvent)return;
 const ev=activeEvent,opt=ev.options[optionIndex];
 clearTimeout(eventCountdownTimer);
 activeEvent=null;
 hideModal();
 const summary=opt?applyResourceDelta(opt.delta):'';
 clearEventVisuals();
 message(`Evento resuelto (${ev.title}): ${summary}`);
 toast(`✓ ${ev.title} controlada: ${summary}`);
 scheduleNextEvent(45000);
}
function openEventDecision(){
 if(!activeEvent){
  startColonyEvent();
  return;
 }
 const ev=activeEvent;
 showModal(`ALERTA DE CLIMA ESPACIAL · ⏱ ${ev.timeLeft}s`,`${ev.icon} ${ev.title}`,`<p>${ev.desc}</p><p style="color:#ffba94;font-size:13px"><b>Si no actúas a tiempo:</b> ${ev.warning}</p><div class="choices">${ev.options.map((o,i)=>`<button class="choice" data-ev-opt="${i}"><strong>${o.label}</strong><small>${o.detail}</small></button>`).join('')}</div>`,[{label:'DECIDIR DESPUÉS',secondary:true,action:hideModal}]);
 for(const btn of $('modalBody').querySelectorAll('[data-ev-opt]'))btn.addEventListener('click',()=>resolveColonyEvent(Number(btn.dataset.evOpt)));
}
function restart(){engine.leave();updateInterior();inspected.clear();cluesFound.clear();step=0;currentSol=solChapter==='final'?10:solChapter==='survival'?4:1;energy=62;oxygen=78;food=54;shield=68;health=100;lowHealthWarned=false;lastMoveHealthAt=0;heldFood=null;clearTimeout(eatTimer);eatTimer=0;engine?.setHeldFood?.(null);clearTimeout(eventCountdownTimer);activeEvent=null;clearEventVisuals();stats();applyLanguage();message(notes[0]);const s=engine.getState();s.pos=[0,0,19];s.yaw=0;s.avatarYaw=0;s.camera='third';s.jumpHeight=0;s.jumpVelocity=0;s.storm=0;s.stormTarget=0;saveGame(true);scheduleNextEvent(solChapter==='tutorial'?60000:solChapter==='survival'?35000:28000);toast(lang==='en'?'New mission started!':'¡Nueva misión iniciada!')}
function toggleStorm(){openEventDecision();}
function initialize(){if(!engine){try{engine=window.MarsGfx.createDemo(canvas,{onTick:updateTick,onInteract:interact,onEat:eatHeldFood,onEatDone:finishEating,onBackpack:backpackModal,onEscape:()=>{if(maintStation)closeMaintenance();else if(!shade.classList.contains('hidden'))hideModal();else pauseGame();},onPanel:missionPanel,onCamera:(v)=>toast(v==='first'?'Cámara en primera persona.':'Cámara en tercera persona.')});}catch(e){console.error(e);menu.classList.remove('hidden');showModal('ERROR GRÁFICO','No se pudo cargar el escenario',`<p>${e.message}</p><p>La demo necesita un navegador moderno con WebGL 2 habilitado.</p>`,[{label:'VOLVER AL MENÚ',action:hideModal},{label:'ABRIR AVENTURA COMPLETA',secondary:true,action:()=>window.parent.location.assign('/game/legacy')}]);$('start').disabled=false;$('start').textContent='▶ COMENZAR DEMO';return false}}
 return true}
function startGame(){const startBtn=$('start');startBtn.disabled=true;startBtn.textContent='PREPARANDO COLONIA…';setTimeout(()=>{if(!initialize())return;menu.classList.add('hidden');ui.classList.remove('hidden');started=true;engine.start();engine.pause(false);loadWardrobe();startBtn.textContent='▶ COMENZAR DEMO';startBtn.disabled=false;if(loadGame()){engine.setSkin(equipped);scheduleNextEvent(28000);toast(`Partida recuperada · Modo ${modeLabel()}.`)}else{updateMode();engine.setSkin(equipped);restart();toast(`Sol 12 · Modo ${modeLabel()}. Comienza la exploración.`)}},60)}
$('start').addEventListener('click',startGame);$('instructions').addEventListener('click',instructional);$('pause').addEventListener('click',pauseGame);$('wardrobe').addEventListener('click',wardrobe);$('foodShop')?.addEventListener('click',foodStore);$('backpackBtn')?.addEventListener('click',backpackModal);$('guide').addEventListener('click',guide);$('view').addEventListener('click',()=>engine?.toggleCamera());$('alert').addEventListener('click',toggleStorm);$('mobileInteract').addEventListener('click',()=>interact(engine?.getNearest()));$('mobileCamera').addEventListener('click',()=>engine?.toggleCamera());
$('missionToggle').addEventListener('click',()=>setMissionCollapsed($('missionToggle').getAttribute('aria-expanded')==='true'));
try{setMissionCollapsed(localStorage.getItem(MISSION_PANEL_KEY)==='true')}catch{setMissionCollapsed(false)}
for(const btn of document.querySelectorAll('[data-key]')){const key=btn.dataset.key;btn.addEventListener('pointerdown',e=>{e.preventDefault();btn.setPointerCapture(e.pointerId);engine?.press(key,true)});for(const evt of ['pointerup','pointercancel','lostpointercapture'])btn.addEventListener(evt,()=>engine?.press(key,false));}
checklist();stats();updateWallet();applyLanguage();void loadSpaceWeather();setInterval(loadSpaceWeather,15*60*1000);
for(const btn of document.querySelectorAll('[data-lang]'))btn.addEventListener('click',()=>setLanguage(btn.dataset.lang));
for(const btn of document.querySelectorAll('[data-chapter]'))btn.addEventListener('click',()=>setSolChapter(btn.dataset.chapter,false));
$('solBtn')?.addEventListener('click',openChapterModal);
$('maintAction')?.addEventListener('click',contextualMaintAction);$('maintTarget')?.addEventListener('click',()=>{if(maintStation==='regulator'&&maintStep===2)maintChooseFuse(1);else contextualMaintAction()});$('maintClose')?.addEventListener('click',closeMaintenance);$('maintFocus')?.addEventListener('click',()=>window.HorizonteMaint3D?.toggleFocus());$('maintHint')?.addEventListener('click',()=>{if(maintStation)toast(MAINT_SPEC[maintStation].hints[Math.min(maintStep,4)])});
window.addEventListener('keydown',e=>{if(maintStation&&!e.repeat){if(e.code==='KeyE'&&!e.ctrlKey&&!e.metaKey){e.preventDefault();contextualMaintAction();return}if(e.code==='Escape'){e.preventDefault();closeMaintenance();return}}if(started&&((e.ctrlKey||e.metaKey)&&e.code==='KeyR'||e.code==='KeyM')){e.preventDefault();if(!e.repeat)backpackModal()}},true);
window.addEventListener('message',e=>{if(started&&e.data?.type==='toggle-backpack')backpackModal()});
window.addEventListener('pagehide',()=>saveGame(true));document.addEventListener('visibilitychange',()=>{if(document.hidden)saveGame(true)});
if(new URLSearchParams(window.location.search).has('autostart'))startGame();
})();
