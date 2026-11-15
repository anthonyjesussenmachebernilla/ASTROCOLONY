/* Code and educational presentation assisted by ChatGPT/Codex.
 * NASA photographs are fetched from the verified source; none are generated. */
(() => {
 'use strict';
 // Kept aligned with the server's reviewed records by the catalog contract test.
 const locations={
  solar:{topic:'solar-dust',nasaId:'PIA25286',targetId:'array',label:'Matriz de paneles'},
  greenhouse:{topic:'space-garden',nasaId:'iss055e000821',targetId:'crops',label:'Cultivos del invernadero'},
  habitat:{topic:'mars-oxygen',nasaId:'PIA24203',targetId:'medical',label:'Oxígeno y soporte vital'},
  regulator:{topic:'thermal-testing',nasaId:'PIA13805',targetId:'cooling',label:'Refrigeración de los equipos'},
  energy:{topic:'rover-power',nasaId:'KSC-2011-6694',targetId:'reserve',label:'Fuentes de energía'},
 };
 let version=0,controller=null,timer=null;
 function cancel(){version++;controller?.abort();controller=null;clearTimeout(timer);timer=null}
 function element(tag,text,className){const node=document.createElement(tag);if(text)node.textContent=text;if(className)node.className=className;return node}
 function open({showModal,onBack,mode,backLabel='Volver al hallazgo',topic='solar-dust'}){
  const entry=Object.values(locations).find(entry=>entry.topic===topic);if(!entry)return;
  showModal('Ciencia NASA',entry.label,
   '<div id="marsDiscovery" class="mars-discovery" aria-busy="true"><p role="status">Buscando una fotografía en NASA…</p></div>',
   [{label:backLabel,action:onBack}]);
  const ticket=version,root=document.getElementById('marsDiscovery');let failedState=false;
  controller=new AbortController();
  const active=()=>ticket===version&&root.isConnected&&!failedState;
  const failed=()=>{
   if(!active())return;
   failedState=true;
   controller?.abort();clearTimeout(timer);
   root.setAttribute('aria-busy','false');
   root.replaceChildren(element('p','La foto no pudo cargarse. Puedes volver al hallazgo y continuar tu misión.','mars-unavailable'));
   const retry=element('button','Intentar otra vez','smallbtn mars-retry');retry.type='button';
   retry.addEventListener('click',()=>open({showModal,onBack,mode,backLabel,topic}));root.appendChild(retry);
  };
  // Includes the API call and the image download, so a slow connection never traps the player.
  timer=setTimeout(failed,12000);
  fetch(`/api/nasa/discovery?topic=${encodeURIComponent(topic)}`,{signal:controller.signal})
   .then(response=>{if(!response.ok)throw Error('NASA unavailable');return response.json()})
   .then(({discovery:data})=>{
    if(!active())return;
    if(!data||data.nasaId!==entry.nasaId||data.topic!==topic)throw Error('Unexpected photograph');
    const url=new URL(data.imageUrl);
    if(url.protocol!=='https:'||url.hostname!=='images-assets.nasa.gov')throw Error('Unexpected image host');
    document.getElementById('modalTitle').textContent=data.title;
    document.getElementById('modalTag').textContent=data.tag;
    const status=element('p','Cargando la fotografía…');status.setAttribute('role','status');
    const figure=element('figure',null,'mars-photo');
    const photo=element('img');photo.alt=data.alt;photo.hidden=true;photo.decoding='async';
    const caption=element('figcaption',`${data.photoPlace} · ${data.credit}`);caption.hidden=true;
    photo.onload=()=>{if(!active())return;clearTimeout(timer);photo.hidden=false;caption.hidden=false;status.remove();root.setAttribute('aria-busy','false')};
    photo.onerror=failed;
    figure.append(photo,caption);
    const explanation=element('p',data.explanation,'mars-explanation');
    const connection=element('p',data.missionConnection,'mars-connection');
    const details=element('details',null,'mars-details');
    const summary=element('summary',mode==='comandante'?'La ciencia detrás de tu misión':'Quiero saber más');
    details.append(summary,element('p',data.more));
    const source=element('a','Consultar la fuente de NASA');
    // Keep source navigation outside the game, with a descriptive name for assistive technology.
    source.href=`https://images.nasa.gov/details/${encodeURIComponent(entry.nasaId)}`;source.target='_blank';source.rel='noopener noreferrer';
    source.setAttribute('aria-label','Consultar la fuente de NASA (abre otra pestaña)');
    details.appendChild(source);
    const original=element('details',null,'mars-original');
    original.append(element('summary','Descripción original de NASA (inglés)'),element('p',data.originalDescription));
    details.appendChild(original);
    root.replaceChildren(status,figure,explanation,connection,details,
     element('p',data.contextNote,'mars-note'));
    photo.src=url.href;
   }).catch(failed);
 }
 window.MarsDiscovery={open,cancel,locations};
})();
