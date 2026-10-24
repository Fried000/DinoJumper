(() => {
  'use strict';
  const {items,branches,progress,value}=globalThis.DinoAchievementData;
  const state=globalThis.DinoAchievements.state;
  const $=id=>document.getElementById(id);
  const sprites={
    foot:['00011000','00111000','00111000','00011000','00111000','01111000','01111000','00110000'],
    boot:['00111000','00111000','00111000','00111000','00111110','00111110','01111110','00000000'],
    sword:['00000011','00000110','00001100','00011000','10110000','01100000','11100000','10010000'],
    map:['11101110','10101010','10101010','10101010','10101010','10101010','11101110','00000000'],
    bone:['11000000','11100000','01110000','00111000','00011100','00001110','00000111','00000011'],
    egg:['00011000','00111100','01111110','01101110','01010110','11111111','01111110','00111100'],
    wing:['00000001','00000011','10000111','11001111','11111110','01111100','00111000','00010000'],
    bolt:['00011100','00111000','01110000','11111110','00011100','00111000','01110000','01000000'],
    flag:['01111110','01111110','01111100','01000000','01000000','01000000','11100000','00000000'],
    star:['00011000','00011000','11111111','01111110','00111100','01111110','01100110','11000011'],
    trophy:['01111110','11111111','10111101','10111101','01111110','00011000','00111100','01111110'],
    crystal:['00011000','00111100','01111110','11111111','01111110','00111100','00011000','00000000'],
    shield:['11111111','11111111','11011011','11011011','11011011','01111110','00111100','00011000'],
    flame:['00010000','00011000','00111100','01111100','11101110','11000111','01111110','00111100'],
    clock:['00111100','01000010','10011001','10011001','10011101','10000001','01000010','00111100'],
  };
  function icon(type){return `<svg viewBox="0 0 8 8" aria-hidden="true" shape-rendering="crispEdges">${(sprites[type]||sprites.star).flatMap((row,y)=>[...row].map((c,x)=>c==='1'?`<rect x="${x}" y="${y}" width="1" height="1"/>`:'')).join('')}</svg>`;}
  let branch=branches[0].id,selected=null,zoom=1;
  const unlocked=id=>Boolean(state.unlocked[id]);
  function inspect(item){
    selected=item.id;
    document.querySelectorAll('.achievement-node').forEach(node=>node.setAttribute('aria-pressed',String(node.dataset.id===item.id)));
    $('detail-icon').innerHTML=icon(item.icon);$('detail-icon').classList.toggle('earned',unlocked(item.id));
    $('detail-name').textContent=item.name;$('detail-flavor').textContent=item.flavor;$('detail-goal').textContent=item.goal;
    $('detail-rarity').textContent=`${item.points===100?'CHALLENGE':item.points===50?'RARE':'ADVANCEMENT'} · ${item.points} POINTS`;
    const amount=progress(item,state);$('detail-progress-bar').style.width=`${amount*100}%`;
    $('detail-progress').textContent=unlocked(item.id)?'COMPLETED':item.criteria.map(([path,target])=>`${Math.min(value(state,path),target).toLocaleString()} / ${target.toLocaleString()}`).join(' · ');
    $('detail-prerequisites').replaceChildren();
    if(!item.parents.length){const li=document.createElement('li');li.textContent='Start here — no prerequisites.';$('detail-prerequisites').append(li);}
    for(const id of item.parents){const parent=items.find(p=>p.id===id),li=document.createElement('li'),button=document.createElement('button');button.type='button';button.textContent=`${unlocked(id)?'✓':'□'} ${parent.name}`;button.addEventListener('click',()=>{if(parent.branch!==branch){branch=parent.branch;render();}inspect(parent);document.querySelector(`[data-id="${parent.id}"]`)?.scrollIntoView({block:'nearest',inline:'nearest'});});li.append(button);$('detail-prerequisites').append(li);}
    $('detail-earned').textContent=unlocked(item.id)?`Earned ${new Date(state.unlocked[item.id]).toLocaleDateString()}`:item.parents.every(unlocked)?'Available — complete the goal to unlock.':'Complete the prerequisite nodes first. Goal progress is still tracked.';
  }
  function render(){
    const group=items.filter(p=>p.branch===branch),info=branches.find(p=>p.id===branch);
    $('branch-name').textContent=info.name;$('branch-progress').textContent=`${group.filter(p=>unlocked(p.id)).length} / ${group.length} · ${info.description}`;
    document.querySelectorAll('[role="tab"]').forEach(tab=>tab.setAttribute('aria-selected',String(tab.dataset.branch===branch)));
    const board=$('map-board');board.replaceChildren();
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 1450 540');svg.setAttribute('class','achievement-wires');svg.setAttribute('aria-hidden','true');
    for(const item of group)for(const id of item.parents){const parent=group.find(p=>p.id===id);if(!parent)continue;const path=document.createElementNS(svg.namespaceURI,'path');const x1=parent.x+28,y1=parent.y+28,x2=item.x+28,y2=item.y+28,mid=(x1+x2)/2;path.setAttribute('d',`M${x1} ${y1}H${mid}V${y2}H${x2}`);path.setAttribute('class',unlocked(item.id)?'wire-earned':unlocked(id)?'wire-ready':'wire-locked');svg.append(path);}
    board.append(svg);
    for(const item of group){const node=document.createElement('button'),status=unlocked(item.id)?'earned':item.parents.every(unlocked)?'available':'locked';node.type='button';node.className=`achievement-node ${status} ${item.points===100?'challenge':''}`;node.dataset.id=item.id;node.style.left=`${item.x}px`;node.style.top=`${item.y}px`;node.setAttribute('aria-label',`${item.name}. ${status}. ${Math.round(progress(item,state)*100)} percent.`);node.setAttribute('aria-pressed','false');node.innerHTML=`<span class="node-frame">${icon(item.icon)}</span>`;const name=document.createElement('span');name.className='node-name';name.textContent=item.name;node.append(name);node.addEventListener('click',()=>inspect(item));node.addEventListener('focus',()=>inspect(item));board.append(node);}
    inspect(group.find(p=>p.id===selected)||group.find(p=>!unlocked(p.id)&&p.parents.every(unlocked))||group[0]);
  }
  for(const info of branches){const tab=document.createElement('button');tab.type='button';tab.role='tab';tab.dataset.branch=info.id;tab.innerHTML=icon(info.icon);const text=document.createElement('span');text.textContent=info.name;tab.append(text);tab.addEventListener('click',()=>{branch=info.id;selected=null;render();$('map-viewport').scrollTo(0,0);});$('branch-tabs').append(tab);}
  const points=items.filter(p=>unlocked(p.id)).reduce((sum,p)=>sum+p.points,0);
  $('achievement-total').textContent=`${Object.keys(state.unlocked).length} / ${items.length}`;$('achievement-points').textContent=`${points} POINTS`;
  function setZoom(next){zoom=Math.max(.6,Math.min(1.4,next));$('map-board').style.transform=`scale(${zoom})`;$('map-space').style.width=`${1450*zoom}px`;$('map-space').style.height=`${540*zoom}px`;$('zoom-level').textContent=`${Math.round(zoom*100)}%`;}
  $('zoom-in').addEventListener('click',()=>setZoom(zoom+.2));$('zoom-out').addEventListener('click',()=>setZoom(zoom-.2));$('map-reset').addEventListener('click',()=>{setZoom(1);$('map-viewport').scrollTo(0,0);});
  let drag=null;const viewport=$('map-viewport');
  viewport.addEventListener('pointerdown',event=>{if(event.target.closest('button')||event.pointerType==='touch')return;drag={x:event.clientX,y:event.clientY,left:viewport.scrollLeft,top:viewport.scrollTop};viewport.setPointerCapture(event.pointerId);viewport.classList.add('dragging');});
  viewport.addEventListener('pointermove',event=>{if(drag){viewport.scrollLeft=drag.left+drag.x-event.clientX;viewport.scrollTop=drag.top+drag.y-event.clientY;}});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])viewport.addEventListener(event,()=>{drag=null;viewport.classList.remove('dragging');});
  viewport.addEventListener('keydown',event=>{if(event.target!==viewport)return;const moves={ArrowLeft:[-100,0],ArrowRight:[100,0],ArrowUp:[0,-100],ArrowDown:[0,100]};if(moves[event.key]){event.preventDefault();viewport.scrollBy(...moves[event.key]);}});
  window.addEventListener('storage',event=>{if(event.key==='dino-jumper-achievements-v1')location.reload();});
  setZoom(1);render();
})();
