/* Campaign code and educational fiction prepared with ChatGPT/Codex assistance.
 * Resource values are teaching models, not NASA mission predictions. */
(() => {
 'use strict';
 const keys=['energy','oxygen','food','shield'];
 const choice=(id,title,text,deltas,lesson)=>({id,title,text,deltas,lesson});
 const days=[
  {station:'solar',title:'Conoce la base',task:'Examina la matriz de paneles y usa su consola.',hint:'Camina con WASD, cambia la cámara con V y entra a los paneles solares con E. Dentro, registra la matriz de paneles y luego usa la consola.',story:'Hoy aprenderás a explorar. El polvo cubre los paneles: observa primero y decide después. Puedes consultar una foto real de InSight.',reward:25,choices:[choice('inspect','Inspeccionar los paneles','Identifica el polvo antes de reparar.',{energy:5},'Observar te ayuda a encontrar la causa de un problema.')]},
  {station:'regulator',title:'Recupera la energía',task:'Entra al regulador y repara desde su consola.',hint:'Busca el regulador de energía. Entra con E, recorre el pasillo y usa la consola principal.',story:'Ya sabes explorar. Ahora repara el regulador: la electricidad alimenta también el oxígeno y los cultivos.',reward:35,choices:[choice('repair','Reparar el regulador','Recupera el suministro de la colonia.',{energy:18},'Una reparación puede ayudar a varios sistemas conectados.')]},
  {station:'energy',title:'Tu primera decisión',task:'Compara dos planes en el centro de energía.',hint:'Entra al centro de energía y usa la consola. Compara qué gana y qué pierde cada recurso.',story:'Elige cómo repartir la energía. Cada plan tiene ventajas y costos. Puedes revisar el resultado antes de terminar el sol.',reward:50,choices:[choice('balanced','Repartir entre los módulos','Mantén soporte vital, cultivos y protección.',{energy:10,oxygen:6,food:9,shield:6},'Repartir la energía permite atender necesidades diferentes.'),choice('habitat','Dar prioridad al hábitat','Gana oxígeno ahora, reduciendo cultivos y protección.',{energy:15,oxygen:18,food:-16,shield:-7},'Mejorar un recurso puede reducir los demás.')]},
  {station:'greenhouse',title:'Alimenta a la tripulación',task:'Decide cómo iluminar los cultivos.',hint:'En el invernadero, compara la reserva de alimentos con la energía que gastarán las luces.',story:'El tutorial terminó. Las plantas necesitan luz y la colonia tiene una reserva limitada de energía.',reward:30,choices:[choice('grow','Aumentar la iluminación','Produce más alimentos y gasta electricidad.',{food:18,oxygen:3,energy:-14},'Las luces de cultivo consumen energía para producir alimentos.'),choice('ration','Usar ciclos de luz cortos','Ahorra electricidad y produce menos alimentos.',{food:7,energy:-4},'Ahorrar energía puede reducir la producción de alimentos.')]},
  {station:'habitat',title:'Cuida el aire',task:'Elige un plan de soporte vital en el hábitat.',hint:'Mira el oxígeno y la energía antes de usar la consola del hábitat.',story:'El sistema de aire necesita atención. ¿Dedicarás más electricidad a producir oxígeno o repararás el circuito?',reward:30,choices:[choice('recycle','Reparar el circuito de aire','Recupera oxígeno con un gasto moderado.',{oxygen:14,energy:-7},'Mantener los equipos ayuda a aprovechar los recursos.'),choice('boost','Aumentar la producción','Produce más oxígeno y consume más energía.',{oxygen:25,energy:-18},'Una producción mayor también tiene un costo energético.')]},
  {station:'habitat',title:'Prepárate para la tormenta',task:'Protege a la tripulación desde el hábitat.',hint:'Esta tormenta es simulada. Compara la protección del refugio con el costo de reforzarlo.',story:'Ensayaremos una emergencia solar. Este evento está guionizado; no es una predicción de NASA para Marte.',reward:35,choices:[choice('shelter','Usar el refugio protegido','Prioriza el refugio y reduce el trabajo de cultivos.',{shield:15,food:-5,energy:-4},'Un refugio permite priorizar la protección durante una emergencia.'),choice('reinforce','Reforzar la protección','Gana más blindaje, usando más energía.',{shield:24,energy:-17},'La protección adicional también requiere recursos.')]},
  {station:'energy',title:'Una señal desconocida',task:'Investiga la señal en el centro de energía.',hint:'Una señal extraña es una observación, no una prueba de vida. Empieza por medir y comparar.',story:'La antena recibe pulsos misteriosos. La tripulación necesita una explicación basada en pistas.',clue:'Los pulsos se repiten a intervalos regulares.',reward:35,choices:[choice('listen','Escuchar y registrar','Mide los intervalos sin gastar demasiada energía.',{energy:-6,shield:-2},'Primero registra lo observado; después propone explicaciones.'),choice('transmit','Enviar una prueba de comunicación','Busca una respuesta usando más electricidad.',{energy:-15,oxygen:-2},'Una prueba activa consume más recursos que observar.')]},
  {station:'regulator',title:'Sigue las pistas',task:'Compara los registros desde el regulador.',hint:'La señal coincide con cambios eléctricos. Compara registros antes de aceptar una hipótesis.',story:'Los pulsos aparecen cuando cambia el suministro. Podría tratarse de un equipo de la expedición.',clue:'La señal coincide con los reinicios de un circuito de la base.',reward:40,choices:[choice('compare','Comparar los registros','Cruza los horarios de los pulsos y los reinicios.',{energy:-5},'Una coincidencia orienta la investigación, pero hace falta comprobarla.'),choice('scan','Probar todo el circuito','Realiza un barrido con mayor consumo.',{energy:-13,oxygen:3},'Puedes investigar con pruebas de distinto costo.')]},
  {station:'solar',title:'Comprueba tu hipótesis',task:'Calibra el suministro de la baliza desde los paneles.',hint:'La baliza responde al suministro. Prueba si estabilizarlo cambia la señal.',story:'El código de los pulsos coincide con una baliza científica antigua. Una prueba controlada ayudará a confirmar su origen.',clue:'Al estabilizar la energía, la baliza transmite su identificador de expedición.',reward:40,choices:[choice('calibrate','Estabilizar y medir','Comprueba la hipótesis con una prueba controlada.',{energy:-7,shield:4},'Una hipótesis gana apoyo cuando una prueba produce el resultado esperado.'),choice('fullscan','Hacer un barrido de la baliza','Recupera su identificación con mayor consumo.',{energy:-16,shield:6},'La evidencia de la prueba permite revisar la explicación inicial.')]},
  {station:'energy',title:'El futuro de Aurora-1',task:'Elige el plan final en el centro de energía.',hint:'Reúne las tres pistas y protege las reservas. Una colonia necesita aire, comida, energía y protección a la vez.',story:'La señal viene de una baliza de la propia expedición, no de seres extraterrestres. Recupera su registro y prepara la base para la siguiente tripulación.',reward:60,choices:[choice('protect','Proteger la base y recuperar el registro','Transmite en modo de bajo consumo y conserva soporte vital.',{energy:-8,oxygen:4,food:2,shield:4},'Puedes completar la investigación y conservar recursos para el futuro.'),choice('signal','Transmitir el registro a máxima potencia','Completa el envío rápido, con mayor gasto de energía y protección.',{energy:-23,oxygen:-4,shield:-8},'Lograr un objetivo no elimina los costos para el resto de la misión.')]},
 ];
 const initial=()=>({sol:1,completed:false,finished:false,pending:null,history:[],assistedSols:[]});
 const validResources=r=>r&&keys.every(key=>Number.isFinite(r[key])&&r[key]>=0&&r[key]<=100);
 const apply=(resources,deltas)=>Object.fromEntries(keys.map(key=>[key,Math.max(0,Math.min(100,resources[key]+(deltas[key]||0)))]));
 const upkeep=sol=>sol<=3?{}:{energy:-4,oxygen:-4,food:-3,shield:-1};
 function resolve(state,id,resources){
  if(state.finished||state.completed||!validResources(resources))return null;
  const option=days[state.sol-1]?.choices.find(option=>option.id===id);if(!option)return null;
  const after=apply(resources,option.deltas);
  return {state:{...state,completed:true,pending:{choice:id,before:{...resources},after}},resources:after};
 }
 function advance(state,resources){
  if(!state.completed||state.finished||!state.pending||!validResources(resources))return null;
  const after=apply(resources,upkeep(state.sol));
  if(keys.some(key=>after[key]===0))return {blocked:true};
  const history=[...state.history,{sol:state.sol,choice:state.pending.choice,before:state.pending.before,after}];
  return {blocked:false,reward:days[state.sol-1].reward,resources:after,state:{...state,sol:Math.min(10,state.sol+1),completed:false,finished:state.sol===10,pending:null,history}};
 }
 function retry(state){if(!state.completed||state.finished||!state.pending)return null;return {state:{...state,completed:false,pending:null},resources:{...state.pending.before}}}
 function assist(state,resources){
  if(state.finished||state.assistedSols.includes(state.sol))return null;
  const before=state.pending?.before||resources;if(!validResources(before))return null;
  return {state:{...state,completed:false,pending:null,assistedSols:[...state.assistedSols,state.sol]},resources:Object.fromEntries(keys.map(key=>[key,Math.max(35,before[key])]))};
 }
 function restore(raw){
  if(!raw||!Number.isInteger(raw.sol)||raw.sol<1||raw.sol>10||typeof raw.completed!=='boolean'||typeof raw.finished!=='boolean'||!Array.isArray(raw.history)||!Array.isArray(raw.assistedSols))return null;
  if(new Set(raw.assistedSols).size!==raw.assistedSols.length||!raw.assistedSols.every(sol=>Number.isInteger(sol)&&sol>=1&&sol<=raw.sol))return null;
  if(raw.finished&&(raw.sol!==10||raw.completed))return null;
  if(raw.history.length!==(raw.finished?10:raw.sol-1))return null;
  const validEntry=(entry,index)=>entry&&entry.sol===index+1&&days[index].choices.some(option=>option.id===entry.choice)&&((entry.migrated===true&&index<3&&entry.before===null&&entry.after===null)||(validResources(entry.before)&&validResources(entry.after)));
  if(!raw.history.every(validEntry))return null;
  if(raw.completed){if(!raw.pending||!days[raw.sol-1].choices.some(option=>option.id===raw.pending.choice)||!validResources(raw.pending.before)||!validResources(raw.pending.after))return null}
  else if(raw.pending!==null)return null;
  return {sol:raw.sol,completed:raw.completed,finished:raw.finished,pending:raw.pending,history:raw.history,assistedSols:raw.assistedSols};
 }
 function migrate(step,resources){
  if(!Number.isInteger(step)||step<0||step>3)return null;
  const state=initial();state.sol=step+1;
  state.history=days.slice(0,step).map((day,index)=>({sol:index+1,choice:index===2&&resources.food<50?'habitat':day.choices[0].id,migrated:true,before:null,after:null}));
  return state;
 }
 window.MarsCampaign={days,initial,resolve,advance,retry,assist,restore,migrate,apply,upkeep,coinTotal:days.reduce((sum,day)=>sum+day.reward,0)};
})();
