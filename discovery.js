(() => {
  'use strict';
  const specimens=[['suncrest','Suncrest Raptor','A swift little hunter with a crown of feathers.'],['moonwing','Moonwing Pterosaur','Its wings once crossed the moonlit sea.'],['mossback','Mossback Giant','A gentle giant that carried a forest on its back.'],['emberjaw','Emberjaw Dragon','An ancient cousin of the volcano guardian.']];
  const parts=['skull','spine','limbs','tail'];
  const key='dino-jumper-museum-v1';
  let found=[];
  try{const saved=JSON.parse(localStorage.getItem(key)||'[]');if(Array.isArray(saved))found=[...new Set(saved.filter(x=>specimens.some(([id])=>parts.some(p=>x===id+':'+p))))];}catch{}
  function uncover(){
    const pool=specimens.flatMap(([id])=>parts.map(p=>id+':'+p)).filter(p=>!found.includes(p));
    if(!pool.length)return null;
    const piece=pool[Math.floor(Math.random()*pool.length)];found.push(piece);
    try{localStorage.setItem(key,JSON.stringify(found));}catch{}
    const [id,part]=piece.split(':');return specimens.find(s=>s[0]===id)[1]+' · '+part;
  }
  const mutations=[
    {name:'MOON MIRAGE',bg:'#edf0fa',ink:'#555973',faint:'#cdd2e5'},
    {name:'FOSSIL BLOOM',bg:'#faf6e9',ink:'#79684e',faint:'#e2d7b9'},
    {name:'WATCHFUL WOODS',bg:'#edf4ed',ink:'#4c6755',faint:'#cbdccc'},
    {name:'CRYSTAL ECHO',bg:'#f4edfa',ink:'#70567d',faint:'#dfcfe8'},
    {name:'STARFALL',bg:'#eaf2f8',ink:'#506677',faint:'#c8dce7'},
    {name:'EMBER GARDEN',bg:'#fcf0ea',ink:'#825f52',faint:'#ead3c5'},
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
  window.DinoDiscovery={specimens,parts,mutations,uncover,sound,toggleSound,get muted(){return muted;},get found(){return [...found];}};
})();
