(() => {
  const data=window.DinoDiscovery,found=data.found;
  document.getElementById('museum-count').textContent=`${found.length} / 16 pieces discovered · ${data.specimens.filter(([id])=>data.parts.every(p=>found.includes(id+':'+p))).length} / 4 skeletons assembled`;
  const shapes=['M24 36h26v20H24z M26 42h6 M45 42h5','M50 48h58 M58 48v15 M72 48v17 M86 48v15 M100 48v12','M62 62v22h-12 M94 62v22h14','M108 48l28-10 17-14'];
  data.specimens.forEach(([id,name,story],index)=>{
    const article=document.createElement('article');article.className='museum-exhibit';
    const owned=data.parts.filter(p=>found.includes(id+':'+p)),complete=owned.length===4;
    const title=document.createElement('h2');title.textContent=name;article.append(title);
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 180 105');svg.setAttribute('role','img');svg.setAttribute('aria-label',`${name}, ${owned.length} of 4 fossil parts discovered`);
    shapes.forEach((shape,i)=>{const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',shape);path.setAttribute('class',owned.includes(data.parts[i])?'bone-found':'bone-missing');svg.append(path);});
    if(index===1){const wing=document.createElementNS(svg.namespaceURI,'path');wing.setAttribute('d','M72 48 45 5 105 30 120 5 95 48');wing.setAttribute('class',owned.includes('limbs')?'bone-found':'bone-missing');svg.append(wing);}
    if(index===2||index===3){const crest=document.createElementNS(svg.namespaceURI,'path');crest.setAttribute('d',index===2?'M52 47 60 24 72 45 84 22 96 45':'M24 36 20 20 38 36 45 18 50 36');crest.setAttribute('class',complete?'bone-found':'bone-missing');svg.append(crest);}
    article.append(svg);
    const pieces=document.createElement('p');pieces.className='museum-parts';pieces.textContent=data.parts.map(p=>(owned.includes(p)?'✓ ':'○ ')+p).join(' · ');article.append(pieces);
    const caption=document.createElement('p');caption.textContent=complete?story:`${owned.length} / 4 parts · More of its story is still underground.`;article.append(caption);document.getElementById('museum-exhibits').append(article);
  });
})();
