/* Code and educational presentation assisted by ChatGPT/Codex.
 * NASA photographs are fetched from the verified source; none are generated. */
(() => {
 'use strict';
 let version=0,controller=null,timer=null;
 function cancel(){version++;controller?.abort();controller=null;clearTimeout(timer);timer=null}
 function element(tag,text,className){const node=document.createElement(tag);if(text)node.textContent=text;if(className)node.className=className;return node}
 function open({showModal,onBack,mode,backLabel='Volver al hallazgo'}){
  showModal('Marte real','El polvo también llega a los paneles',
   '<div id="marsDiscovery" class="mars-discovery" aria-busy="true"><p role="status">Buscando una fotografía de InSight en NASA…</p></div>',
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
   retry.addEventListener('click',()=>open({showModal,onBack,mode,backLabel}));root.appendChild(retry);
  };
  // Includes the API call and the image download, so a slow connection never traps the player.
  timer=setTimeout(failed,12000);
  fetch('/api/nasa/discovery?topic=solar-dust',{signal:controller.signal})
   .then(response=>{if(!response.ok)throw Error('NASA unavailable');return response.json()})
   .then(({discovery:data})=>{
    if(!active())return;
    if(!data||data.nasaId!=='PIA25286')throw Error('Unexpected photograph');
    const url=new URL(data.imageUrl);
    if(url.protocol!=='https:'||url.hostname!=='images-assets.nasa.gov')throw Error('Unexpected image host');
    document.getElementById('modalTitle').textContent=data.title;
    const status=element('p','Cargando la fotografía…');status.setAttribute('role','status');
    const figure=element('figure',null,'mars-photo');
    const photo=element('img');photo.alt=data.alt;photo.hidden=true;photo.decoding='async';
    const caption=element('figcaption',`Fotografía de Marte · ${data.credit}`);caption.hidden=true;
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
    source.href='https://images.nasa.gov/details/PIA25286';source.target='_blank';source.rel='noopener noreferrer';
    source.setAttribute('aria-label','Consultar la fuente de NASA (abre otra pestaña)');
    details.appendChild(source);
    const original=element('details',null,'mars-original');
    original.append(element('summary','Descripción original de NASA (inglés)'),element('p',data.originalDescription));
    details.appendChild(original);
    root.replaceChildren(status,figure,explanation,connection,details,
     element('p','Aurora-1 es una simulación educativa. Esta foto muestra una misión real.','mars-note'));
    photo.src=url.href;
   }).catch(failed);
 }
 window.MarsDiscovery={open,cancel};
})();
