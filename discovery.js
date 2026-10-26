(() => {
  'use strict';
  function random(){
    try{if(window.crypto?.getRandomValues){const values=new Uint32Array(1);window.crypto.getRandomValues(values);return values[0]/4294967296;}}catch{}
    return Math.random();
  }
  const specimens=[['suncrest','Suncrest Raptor','A swift little hunter with a crown of feathers.'],['moonwing','Moonwing Pterosaur','Its wings once crossed the moonlit sea.'],['mossback','Mossback Giant','A gentle giant that carried a forest on its back.'],['emberjaw','Emberjaw Dragon','An ancient cousin of the volcano guardian.']];
  const parts=['skull','spine','limbs','tail'];
  const key='dino-jumper-museum-v1';
  let found=[];
  try{const saved=JSON.parse(localStorage.getItem(key)||'[]');if(Array.isArray(saved))found=[...new Set(saved.filter(x=>specimens.some(([id])=>parts.some(p=>x===id+':'+p))))];}catch{}
  function uncover(){
    const pool=specimens.flatMap(([id])=>parts.map(p=>id+':'+p)).filter(p=>!found.includes(p));
    if(!pool.length)return null;
    const piece=pool[Math.floor(random()*pool.length)];found.push(piece);
    try{localStorage.setItem(key,JSON.stringify(found));}catch{}
    const [id,part]=piece.split(':');return specimens.find(s=>s[0]===id)[1]+' · '+part;
  }
  const mutations=[
    {name:'BLOCK VOID',bg:'#edf0fa',ink:'#555973',faint:'#cdd2e5',scenery:'space',terrain:'void',subtitle:'CRUMBLING ISLANDS · FATAL VOIDS'},
    {name:'BONEWORKS',bg:'#faf6e9',ink:'#79684e',faint:'#e2d7b9',scenery:'ruins',terrain:'geyser',subtitle:'CRUSHING BONE PRESSES · MOVING SPIKES'},
    {name:'WATCHFUL WOODS',bg:'#edf4ed',ink:'#4c6755',faint:'#cbdccc',scenery:'forest',terrain:'thorns',subtitle:'CONCEALED THORNS · MOVING VINES'},
    {name:'CRYSTAL ECHO',bg:'#f4edfa',ink:'#70567d',faint:'#dfcfe8',scenery:'cave',terrain:'crystal',subtitle:'UFO MODE · TAP THROUGH SHIFTING CRYSTAL WINDOWS'},
    {name:'STARFALL',bg:'#eaf2f8',ink:'#506677',faint:'#c8dce7',scenery:'space',terrain:'meteor',subtitle:'SHIP MODE · HOLD TO RISE · RELEASE TO DROP'},
    {name:'LAVA CALDERA',bg:'#fcf0ea',ink:'#825f52',faint:'#ead3c5',scenery:'volcano',terrain:'lava',subtitle:'SPRING LAUNCHERS · WIDE LAVA RIVERS'},
    {name:'CLOCKWORK CIRCUIT',bg:'#f7f1de',ink:'#78603d',faint:'#e3d5ad',scenery:'city',terrain:'rhythm',subtitle:'RHYTHM MODE · SYNC JUMPS WITH THE BEAT'},
    {name:'PHANTOM FOUNDRY',bg:'#efedf6',ink:'#5e586e',faint:'#d7d2e3',scenery:'ruins',terrain:'phantom',subtitle:'GHOST WALLS · SUDDEN CRUSHERS · TRUST NO EMPTY SPACE'},
    {name:'GRAVITY RIFT',bg:'#e9f3ef',ink:'#496c63',faint:'#c8ded6',scenery:'space',terrain:'jetpack',subtitle:'JETPACK MODE · HOLD FOR HEIGHT · RELEASE TO REFUEL'},
  ];
  let muted=false,audio;
  try{muted=localStorage.getItem('dino-jumper-muted')==='true';}catch{}
  function sound(double=false){
    if(muted)return;
    try{
      const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
      audio||=new Audio();if(audio.state==='suspended')audio.resume().catch(()=>{});
      const oscillator=audio.createOscillator(),volume=audio.createGain(),t=audio.currentTime;
      oscillator.type='square';oscillator.frequency.setValueAtTime(double?660:340,t);
      oscillator.frequency.exponentialRampToValueAtTime(double?1020:590,t+.09);
      volume.gain.setValueAtTime(.035,t);volume.gain.exponentialRampToValueAtTime(.001,t+.12);
      oscillator.connect(volume);volume.connect(audio.destination);oscillator.start(t);oscillator.stop(t+.13);
    }catch{}
  }
  function toggleSound(){muted=!muted;try{localStorage.setItem('dino-jumper-muted',String(muted));}catch{}return muted;}
  window.DinoDiscovery={random,specimens,parts,mutations,uncover,sound,toggleSound,get muted(){return muted;},get found(){return [...found];}};
})();
