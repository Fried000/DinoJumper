(() => {
  'use strict';
  const canvas = document.querySelector('#game');
  const ctx = canvas.getContext('2d');
  const $ = id => document.getElementById(id);
  const discovery=window.DinoDiscovery;
  const trials=window.DinoTrials;
  let randomState=0;
  const entropy=()=>discovery?.random?discovery.random():Math.random();
  const random=()=>{
    if(!randomState)return entropy();
    randomState=(randomState+0x6D2B79F5)>>>0;let value=Math.imul(randomState^(randomState>>>15),1|randomState);
    value^=value+Math.imul(value^(value>>>7),61|value);return ((value^(value>>>14))>>>0)/4294967296;
  };
  const shuffled=values=>{const result=[...values];for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;};
  const achievementSource=window.DinoAchievements||{record(){},subscribe(){}};
  const achievement={record:(...args)=>{if(!game.assisted)achievementSource.record(...args);},subscribe:fn=>achievementSource.subscribe(fn)};
  let achievementNoticeTimer;
  achievement.subscribe(items=>{
    const notice=$('achievement-toast');if(!notice)return;
    notice.textContent=`Achievement unlocked: ${items[0].name}${items.length>1?` +${items.length-1}`:''}`;
    notice.hidden=false;clearTimeout(achievementNoticeTimer);
    achievementNoticeTimer=setTimeout(()=>{notice.hidden=true;},3500);
  });
  const W = window.innerWidth < 650 ? 600 : 1000, H = 360, GROUND = 292;
  canvas.width = W;
  const celebrationCanvas=$('boss-confetti'),celebrationCtx=celebrationCanvas?.getContext('2d');
  if(celebrationCanvas){celebrationCanvas.width=W;celebrationCanvas.height=H;}
  const GRAVITY = 1850, JUMP = -660;
  const BASE_SPEED = 500, MAX_SPEED = 920;
  const BIOME_POINTS=3000,BORDER_APPROACH=400;
  const BIOMES = [
    { name: 'DESERT', bg: '#ffffff', ink: '#53534e', faint: '#e4e4dc', scenery: 'dune', obstacles: ['cactus','dry-bush','cactus-cluster'], subtitle: 'DUNES · CACTI · OPEN SKIES' },
    { name: 'SNOWFIELD', bg: '#f0f6fa', ink: '#4e6573', faint: '#cddde7', scenery: 'snow', obstacles: ['ice','snow-rock','frozen-stump'], subtitle: 'SNOW · ICE · FROZEN PINES' },
    { name: 'VOLCANIC', bg: '#faf0e9', ink: '#755044', faint: '#e5cfc0', scenery: 'volcano', obstacles: ['basalt','lava-rock','vents'], subtitle: 'ASH · BASALT · SMOKING PEAKS' },
  ];
  const REGIONS = [
    ['PINE FOREST','forest','log,thorn,stump',132], ['JUNGLE','jungle','vine,log,thorn',155],
    ['MANGROVE SWAMP','swamp','reed,stump,log',170], ['CORAL COAST','coast','coral,shell,driftwood',190],
    ['RED CANYON','canyon','basalt,ruin,thorn',20], ['CRYSTAL CAVERN','cave','crystal,ice,basalt',270],
    ['ANCIENT RUINS','ruins','ruin,pillar,urn',45], ['ABANDONED CITY','city','crate,barrier,gear',215],
    ['LUNAR PLAINS','space','meteor,crystal,crater',235], ['BAMBOO GROVE','jungle','bamboo,log,thorn',100],
    ['MUSHROOM WOODS','fungus','mushroom,log,spore',290], ['GOLDEN SAVANNA','meadow','thorn,stump,basalt',50],
    ['GLACIER','snow','ice,snow-rock,frozen-stump',200], ['ASHLANDS','volcano','vents,basalt,lava-rock',15],
    ['CHERRY GROVE','forest','stump,log,thorn',335], ['SALT FLATS','dune','crystal,basalt,dry-bush',65],
    ['EMERALD VALLEY','meadow','thorn,log,stump',140], ['DEEP OCEAN','coast','coral,shell,crystal',210],
    ['OBSIDIAN RIDGE','volcano','basalt,vents,crystal',260], ['PETRIFIED FOREST','forest','stump,basalt,log',30],
    ['SUNKEN TEMPLE','ruins','pillar,urn,coral',175], ['CLOCKWORK CITY','city','gear,crate,barrier',40],
    ['METEOR FIELDS','space','meteor,crater,crystal',250], ['LAVENDER HILLS','meadow','thorn,spore,stump',280],
    ['COPPER MESA','canyon','basalt,pillar,dry-bush',25], ['FROZEN LAKE','snow','ice,frozen-stump,snow-rock',195],
    ['GLOWING GROTTO','cave','crystal,mushroom,spore',185], ['STORM MARSH','swamp','reed,log,stump',220],
    ['SHELL ISLAND','coast','shell,coral,driftwood',40], ['THORN WILDS','jungle','thorn,vine,bamboo',120],
    ['MARBLE GARDENS','ruins','pillar,urn,ruin',300], ['NEON DISTRICT','city','barrier,gear,crate',310],
    ['RUST WASTES','canyon','gear,basalt,barrier',5], ['AURORA TUNDRA','snow','ice,snow-rock,crystal',165],
    ['FUNGAL DEPTHS','fungus','mushroom,spore,log',325], ['SAPPHIRE MINES','cave','crystal,basalt,crate',225],
    ['CLOUD HIGHLANDS','meadow','basalt,thorn,stump',205], ['BLACK SAND SHORE','coast','basalt,shell,coral',230],
    ['BONE DESERT','dune','dry-bush,pillar,basalt',35], ['ORCHID RAINFOREST','jungle','vine,bamboo,spore',320],
    ['SILVER BIRCHES','forest','stump,log,thorn',180], ['GEYSER BASIN','volcano','vents,basalt,lava-rock',55],
    ['COSMIC GARDEN','space','crystal,spore,meteor',285], ['LOST KINGDOM','ruins','pillar,ruin,urn',75],
    ['STARFALL FRONTIER','space','meteor,crystal,crater',255],
    ['IRON RAILYARD','city','gear,barrier,crate',32],['TIDAL ARCHIPELAGO','coast','shell,coral,driftwood',185],
    ['SCARLET BADLANDS','canyon','basalt,thorn,pillar',12],['HOLLOW ROOTS','forest','log,stump,thorn',110],
    ['GLASS STEPPE','cave','crystal,ice,basalt',195],['HONEYCOMB HIGHLANDS','meadow','pillar,stump,thorn',48],
    ['MIDNIGHT ORCHARD','fungus','spore,mushroom,log',275],
  ];
  BIOMES.push(...REGIONS.map(([name,scenery,types,hue])=>({name,scenery,obstacles:types.split(','),
    bg:`hsl(${hue} 35% 96%)`,ink:`hsl(${hue} 20% 31%)`,faint:`hsl(${hue} 25% 82%)`,
    subtitle:types.replaceAll('-', ' ').replaceAll(',', ' · ').toUpperCase()})));
  const FRONTIER_NAMES=['MOONLIT','VERDANT','SILVER','SCARLET','MISTY','PRISMATIC','ANCIENT','DUSK','FROSTED','GLOWING','STORMY','GOLDEN'];
  let cachedBiomeIndex=-1,cachedBiome=null;
  function getBiome(index) {
    if(index<BIOMES.length)return BIOMES[index];
    if(index===cachedBiomeIndex)return cachedBiome;
    const base=BIOMES[(index*17)%BIOMES.length],hue=(index*137.508)%360;
    cachedBiomeIndex=index;
    cachedBiome={...base,name:`${FRONTIER_NAMES[Math.floor(index/BIOMES.length)%FRONTIER_NAMES.length]} ${base.name} ${index+1}`,
      bg:`hsl(${hue} 38% 96%)`,ink:`hsl(${hue} 25% 29%)`,faint:`hsl(${hue} 30% 80%)`,
      subtitle:`UNCHARTED REGION ${index+1} · ${base.scenery.toUpperCase()}`,variant:index};
    return cachedBiome;
  }
  const worldBiome=index=>getBiome(game.biomeOrder?.[index]??index);
  const activeTheme=()=>{
    const base=worldBiome(game.biome),variant=game.challenge?.variant??game.mutations?.[game.biome];
    const mutationObstacles=[['meteor','crater','crystal'],['pillar','urn','ruin'],['log','thorn','stump'],['crystal','basalt','ice'],['meteor','crater','crystal'],['basalt','lava-rock','vents'],['gear','barrier','crate'],['ruin','pillar','basalt'],['meteor','crystal','crater']];
    return variant===undefined?base:{...base,...discovery.mutations[variant],obstacles:mutationObstacles[variant],name:`${discovery.mutations[variant].name} · ${game.challenge?'SECRET GROTTO':base.name}`,mutation:variant};
  };
  const BOSSES = [
    { name: 'BALL-SPITTING BIRD', duration: 11, interval: [.92,1.23], hint: 'RANDOM BALL TRAINS · LOW: JUMP / HIGH: DUCK' },
    { name: 'PRISM TRICERATOPS', duration: 12, interval: [1.5,1.78], hint: 'SCANNER → LOCKED BEAM · READ THE FINAL LINE' },
    { name: 'QUARRY T. REX', duration: 13, interval: [1.7,1.95], hint: 'TWIN ROCKS + MAGNET RECALL · JUMP THEN DUCK / TOWER: DOUBLE' },
    { name: 'VOLCANIC DRAGON', duration: 14, interval: [2.85,3.15], hint: 'RIFT CAGE: SINGLE JUMP · HIGH TIDE: DOUBLE · ASH: DUCK' },
    { name: 'SHADOW DINO', duration: 15, interval: [1.8,2.05], hint: 'MIRROR SHOTS FROM BOTH SIDES · JUMP / DUCK / DOUBLE CURTAINS' },
  ];
  const BOSS_MILESTONES=[1000,2000,3000,4000,5000,8000,12000,16000,20000,25000];
  if(trials)BOSSES.push(...trials.bosses.map((boss,index)=>({...boss,level:index+6,interval:[1,1],hint:boss.concept})));
  const UPGRADES = [
    {id:'shell',name:'Longer Shield',max:4,describe:n=>`Shield pickups last ${10+(n-1)*2} → ${10+n*2} seconds. A shield still blocks one hit.`,summary:n=>`${10+n*2}s shields`},
    {id:'magnet',name:'Pickup Magnet',max:4,describe:n=>`Automatically pull in nearby fossils, fragments, and power-ups. Reach: ${(n-1)*35} → ${n*35} pixels.`,summary:n=>`${n*35}px reach`},
    {id:'fall',name:'Fast Fall',max:1,describe:()=>`Hold ↓ while falling to land faster. Your jump height and normal running speed stay the same.`,summary:()=>`hold ↓ to fall faster`},
    {id:'fortune',name:'Valuable Fossils',max:3,describe:n=>`Each fossil gives ${25+(n-1)*10} → ${25+n*10} points, on either route.`,summary:n=>`${25+n*10} pts per fossil`},
    {id:'clock',name:'Longer Slow Motion',max:3,describe:n=>`Clock pickups slow the world for ${7+(n-1)*2} → ${7+n*2} seconds. Your jumps stay responsive.`,summary:n=>`${7+n*2}s slow motion`},
    {id:'recovery',name:'Safer Revival',max:2,describe:n=>`After hatching again, ignore hits for ${2+n-1} → ${2+n} seconds. You still get only two revivals per run.`,summary:n=>`${2+n}s revive protection`},
    {id:'ward',name:'Boss Shield',max:1,describe:()=>`Start each future boss fight with a shield that blocks one hit. It lasts for the fight.`,summary:()=>`one-hit shield at boss entry`},
    {id:'finder',name:'Easy Shell Repair',max:1,describe:()=>`Collect only 2 egg fragments instead of 3 to earn a shield. This does not add revivals.`,summary:()=>`2 fragments make a shield`},
    {id:'route',name:'High Road Treasure',max:3,describe:n=>`Fossils collected on upper routes give ${((n-1)*15)} → ${n*15} extra points each. Stacks with Valuable Fossils.`,summary:n=>`+${n*15} pts on upper routes`},
  ];
  const newPerks=()=>Object.fromEntries(UPGRADES.map(p=>[p.id,0]));
  const DINO = [
    '000000001111111100',
    '000000011111111110',
    '000000011101111110',
    '000000011111111110',
    '000000011111111110',
    '000000011111000000',
    '000000011111111000',
    '100000111110000000',
    '110001111110000000',
    '111011111111100000',
    '111111111110100000',
    '011111111110000000',
    '001111111100000000',
    '000111111000000000',
    '000011011000000000',
    '000011001100000000',
    '000011001100000000',
    '000011101110000000',
  ];
  // A dedicated horizontal silhouette, drawn on the same square pixel grid.
  const DUCK_DINO = [
    '000000000000001111111111',
    '100000000000011110111111',
    '110001111111111111111111',
    '111111111111111111111111',
    '011111111111111111000000',
    '001111111111111111111000',
    '000011111111111000000000',
    '000001110001110000000000',
    '000001100000110000000000',
    '000001110000111000000000',
  ];
  let high = 0;
  let preferredAssist='normal';
  try{const stored=localStorage.getItem('dino-jumper-training-mode');if(['normal','noclip','practice'].includes(stored))preferredAssist=stored;}catch{}
  try { high = Number(localStorage.getItem('dino-jumper-best')) || 0; } catch {}
  const journal={biomes:[],bosses:[],secrets:[],runs:0,revives:0,fossils:0,best:0};
  try {
    const saved=JSON.parse(localStorage.getItem('dino-jumper-journal')||'{}');
    for(const key of ['biomes','bosses','secrets'])if(Array.isArray(saved[key]))
      journal[key]=[...new Set(saved[key].filter(v=>typeof v==='string').map(v=>v.slice(0,100)))].slice(0,5000);
    for(const key of ['runs','revives','fossils','best'])if(Number.isFinite(saved[key]))journal[key]=Math.max(0,Math.floor(saved[key]));
  } catch {}
  const game = { mode: 'ready', distance: 0, bonus: 0, speed: BASE_SPEED, time: 0, biome: 0,
    obstacles: [], pickups: [], platforms: [], particles: [], boss: null,
    nextObstacle: 1.7, nextPickup: 7, nextRoute: 12, nextBoss: 1000, routeActive: false,
    shield: 0, slow: 0, invincible: 0, message: '', messageTimer: 0,
    biomeSign: 0, bossesDefeated: 0, warnings: [], lastObstacle: '', completed: false,
    revivesUsed:0,fragments:0,runFossils:0,perks:newPerks(),upgradeOffers:[],wardActive:false,
    lastUpgradeBossCount:0,event:null,nextEvent:15,routeId:0,visitedRoute:-1,lastPattern:'',
    borderAnnounced:-1,previousBiome:0,biomeFade:0,phaseCooldown:0,phaseTrail:0,
    mutations:{},nextTraveler:18,travelerWaiting:false,portalSource:null,challenge:null,nextTrail:6,trail:null,trailId:0,
    terrain:[],nextTerrain:5,terrainWaiting:false,terrainRun:null,assistMode:preferredAssist,assisted:preferredAssist!=='normal',trainingDeaths:0,deathFlash:0,assistGrace:0 };
  const dino = { x: 105, y: GROUND - 45, w: 45, h: 45, vy: 0, jumps: 0, grounded: true, duck: false };
  let last = null;
  let duckKey = false;
  let jumpHeld = false;
  let checkpoint=null,checkpointClock=0,practiceHit=null;
  let reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rand = (a, b) => a + random() * (b - a);
  const score = () => Math.floor(game.distance/10+game.bonus+(game.challenge?.earned||0));
  const activeStage=()=>game.challenge?.engine||game.boss?.engine||game.mutationStage;
  const multiplier=()=>activeTheme().mutation===undefined?1:2;
  const pad = n => String(Math.floor(n)).padStart(5, '0');
  const intersects = (a,b) => a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;

  function announce(text) { $('announcer').textContent = text; }
  function toast(text) { game.message = text; game.messageTimer = 2.8; announce(text); }
  function cloneData(value,omitEngines=false){
    return JSON.parse(JSON.stringify(value,(key,item)=>{
      if(typeof item==='function'||(omitEngines&&(key==='engine'||key==='mutationStage')))return undefined;
      return typeof item==='number'&&!Number.isFinite(item)?{$nonFinite:String(item)}:item;
    }),(key,item)=>item&&typeof item==='object'&&item.$nonFinite?Number(item.$nonFinite):item);
  }
  function captureCheckpoint(force=false,manual=false){
    if(game.assistMode!=='practice'||game.mode!=='running')return false;
    const stage=activeStage();
    const safe=stage?stage.checkpointSafe():(dino.grounded&&!game.voidFalling&&!game.warnings.length&&!game.obstacles.some(o=>o.x<dino.x+game.speed*.4&&o.x+o.w>dino.x-20));
    if(!force&&!safe)return false;
    const engines={challenge:game.challenge?.engine,boss:game.boss?.engine,mutation:game.mutationStage};
    const data=cloneData(game,true);
    checkpoint={data,dino:{...dino},randomState,manual,engines:Object.fromEntries(Object.entries(engines).filter(([,engine])=>engine).map(([key,engine])=>[key,{engine,state:engine.snapshot()}]))};
    checkpointClock=0;if(manual)toast('PRACTICE CHECKPOINT SAVED');return true;
  }
  function registerTrainingDeath(source,reason='hazard'){
    if(game.assistMode==='noclip'&&source?.assistTouched)return false;
    if(game.assistMode==='noclip'&&source)source.assistTouched=true;
    game.trainingDeaths++;game.deathFlash=.5;
    announce(`${game.assistMode==='noclip'?'No clip':'Practice'} death ${game.trainingDeaths}: ${reason}.`);return true;
  }
  function practiceDeath(source,reason='hazard'){
    if(game.mode!=='running')return;
    registerTrainingDeath(source,reason);practiceHit=source;game.mode='practice-death';duckKey=false;jumpHeld=false;
    showOverlay('PRACTICE · UNLIMITED CONTINUES','Try that section again.',`Death ${game.trainingDeaths}. Continue just past the trap, or retry your saved checkpoint with the same layout.`,'CONTINUE HERE');
    $('practice-retry').hidden=!checkpoint;$('end-run').hidden=false;
    $('overlay-help').textContent='SPACE / TAP: CONTINUE HERE · RETRY CHECKPOINT TO REPLAY';
    updateHUD();
  }
  function resumePractice(retry=false){
    if(game.mode!=='practice-death')return;
    const deaths=game.trainingDeaths,mode=game.assistMode;
    if(retry&&checkpoint){
      Object.assign(game,cloneData(checkpoint.data));Object.assign(dino,checkpoint.dino);randomState=checkpoint.randomState;
      for(const [key,saved]of Object.entries(checkpoint.engines)){
        saved.engine.restore(saved.state);
        if(key==='challenge')game.challenge.engine=saved.engine;
        else if(key==='boss')game.boss.engine=saved.engine;
        else game.mutationStage=saved.engine;
      }
      if(!checkpoint.engines.mutation)game.mutationStage=null;
    }else{
      const stage=activeStage();
      if(stage){stage.recover();syncStagePlayer(stage);if(game.challenge)game.challenge.failed=false;}
      else{if(practiceHit){if(practiceHit.kind==='gap')practiceHit.practiceBridge=true;else practiceHit.hit=true;}Object.assign(dino,{y:GROUND-45,vy:0,jumps:0,grounded:true,duck:false});game.voidFalling=false;}
      checkpoint=null;
    }
    game.assistMode=mode;game.assisted=true;game.trainingDeaths=deaths;game.mode='running';game.assistGrace=retry?0:.7;game.invincible=retry?game.invincible:Math.max(.7,game.invincible);
    game.deathFlash=0;practiceHit=null;duckKey=false;jumpHeld=false;last=null;
    $('overlay').hidden=true;$('practice-retry').hidden=true;$('end-run').hidden=true;checkpointClock=0;
    if(!retry)captureCheckpoint(true);updateHUD();
  }
  function setAssistMode(mode){
    if(!['normal','noclip','practice'].includes(mode))return;
    preferredAssist=mode;game.assistMode=mode;game.assisted=game.assisted||mode!=='normal';checkpoint=null;checkpointClock=0;
    try{localStorage.setItem('dino-jumper-training-mode',mode);}catch{}
    if(game.mode==='practice-death')resumePractice(false);
    if(mode==='practice')captureCheckpoint(true);updateHUD();
  }
  function stageInput(){return {held:jumpHeld,duck:duckKey,noclip:game.assistMode==='noclip',grace:game.assistGrace>0};}
  function stepStage(stage,dt){
    const before=stage.collisions;stage.step(dt,stageInput());
    for(let i=before;i<stage.collisions;i++)registerTrainingDeath(null,stage.reason);
  }
  function updateTraining(dt){
    game.deathFlash=Math.max(0,game.deathFlash-dt);game.assistGrace=Math.max(0,game.assistGrace-dt);
    checkpointClock+=dt;
    if(game.assistMode==='practice'&&(!checkpoint||(!checkpoint.manual&&checkpointClock>=1.2)))captureCheckpoint();
  }
  function saveJournal() {
    if(game.assisted)return;
    journal.best=Math.max(journal.best,score(),high);
    try {localStorage.setItem('dino-jumper-journal',JSON.stringify(journal));}catch{}
    renderJournal();
  }
  function discover(category,name) {
    if(game.assisted)return;
    if(!journal[category].includes(name)) {journal[category].push(name);saveJournal();}
  }
  function renderJournal() {
    if(!$('journal-count'))return;
    $('journal-count').textContent=`${journal.biomes.length} WORLDS · ${journal.bosses.length}/${BOSSES.length} BOSSES`;
    $('journal-biomes').textContent=journal.biomes.slice(-12).join('\n')||'Your first horizon is waiting.';
    $('journal-bosses').textContent=journal.bosses.join('\n')||'No bosses defeated yet.';
    $('journal-secrets').textContent=journal.secrets.join('\n')||'Take a detour. Find something new.';
    $('journal-stats').textContent=`${journal.runs} runs · ${journal.revives} revivals · ${journal.fossils} fossils · best ${Math.max(high,journal.best)}`;
  }
  function showOverlay(kicker, title, text, button) {
    $('overlay-kicker').textContent = kicker;
    $('overlay-title').textContent = title;
    $('overlay-text').textContent = text;
    $('start').innerHTML = `${button} <span>↗</span>`;
    $('overlay').hidden = false;
    $('upgrade-choices').hidden=true;
    $('end-run').hidden=true;
    $('practice-retry').hidden=true;
    $('overlay-help').textContent='SPACE / ↑ / TAP TO JUMP · AGAIN TO DOUBLE JUMP';
  }
  function reset() {
    randomState=(Math.floor(entropy()*4294967296)>>>0)||1;
    checkpoint=null;checkpointClock=0;practiceHit=null;
    Object.assign(game, { mode: 'running', distance: 0, bonus: 0, speed: BASE_SPEED, time: 0, biome: 0,
      obstacles: [], pickups: [], platforms: [], particles: [], boss: null,
      nextObstacle: rand(.9,1.7), nextPickup: rand(5,8), nextRoute: rand(2.8,3.6), nextBoss: 1000, routeActive: false,
      shield: 0, slow: 0, invincible: 1, message: '', messageTimer: 0,
      biomeSign: 3.5, bossesDefeated: 0, warnings: [], lastObstacle: '', completed: false,
      revivesUsed:0,fragments:0,runFossils:0,perks:newPerks(),upgradeOffers:[],wardActive:false,
      lastUpgradeBossCount:0,event:null,nextEvent:rand(5,8),routeId:0,visitedRoute:-1,lastPattern:'',
      borderAnnounced:-1,previousBiome:0,biomeFade:0,phaseCooldown:0,phaseTrail:0,
      mutations:{},nextTraveler:18,travelerWaiting:false,portalSource:null,challenge:null,nextTrail:6,trail:null,trailId:0,
      terrain:[],nextTerrain:5,terrainWaiting:false,terrainRun:null,bossRest:0,mutationStage:null,mutationSpeed:0,
      assistMode:preferredAssist,assisted:preferredAssist!=='normal',trainingDeaths:0,deathFlash:0,assistGrace:0 });
    game.biomeOrder=discovery?[0,...shuffled(Array.from({length:BIOMES.length-1},(_,i)=>i+1))]:null;
    game.mutationBag=[];game.portalOffers=[];game.selectedPortal=0;game.voidFalling=false;
    Object.assign(dino, { y: GROUND - 45, vy: 0, jumps: 0, grounded: true, duck: false });
    duckKey = false;
    jumpHeld=false;
    achievement.record('start');achievement.record('biome',{index:0,name:activeTheme().name,worldName:worldBiome(0).name});
    if(!game.assisted)journal.runs++;discover('biomes',activeTheme().name);saveJournal();
    $('upgrade-choices').hidden=true;$('end-run').hidden=true;
    $('portal-offer').hidden=true;
    $('overlay').hidden = true;
    $('pause').textContent = 'Ⅱ';
    $('pause').setAttribute('aria-label', 'Pause game');
    announce('Run started. Double jump to reach the upper route.');
    last = null;
    captureCheckpoint(true);
    updateHUD();
  }
  function jump() {
    if(game.mode==='portal-offer')return;
    if(game.mode==='practice-death'){resumePractice(false);return;}
    if(game.voidFalling&&game.mode==='running')return;
    if(game.mode==='upgrade')return;
    if(game.mode==='revive'){useRevive();return;}
    if(game.mode==='won'){continueExploring();return;}
    if (game.mode === 'ready' || game.mode === 'over') { reset(); return; }
    if (game.mode === 'paused') { togglePause(); return; }
    if(activeStage()){
      const stage=activeStage(),before=stage.player.jumps;stage.jump();
      if(stage.mode==='ufo'||stage.player.jumps>before)achievement.record('jump',{double:stage.player.jumps===2});
      discovery?.sound();return;
    }
    if (dino.jumps >= 2) return;
    dino.duck = false;
    dino.vy = dino.jumps === 0 ? JUMP : -610;
    dino.jumps++;
    discovery?.sound(dino.jumps===2);
    achievement.record('jump',{double:dino.jumps===2});
    dino.grounded = false;
    if(game.boss?.level===5){game.boss.reaction='YOUR SHADOW REMEMBERS';game.boss.reactionTime=.65;}
    if (dino.jumps === 2) burst(dino.x + 20, dino.y + 40, 8);
  }
  function phaseDash() {
    if(game.mode!=='running'||activeStage()||game.phaseCooldown>0)return false;
    game.phaseCooldown=5;game.phaseTrail=.34;
    game.invincible=Math.max(game.invincible,.34);
    burst(dino.x+18,dino.y+24,9);announce('Phase dash. Ready again in five seconds.');return true;
  }
  function borderDistance(){return (Math.floor(score()/BIOME_POINTS)+1)*BIOME_POINTS-score();}
  function synchronizeBiome(){
    const biome=Math.floor(score()/BIOME_POINTS);
    if(biome!==game.biome){
      if(game.mutationStage&&!game.mutationStage.canExit())return;
      game.mutationStage=null;game.mutationSpeed=game.speed;
      game.previousBiome=game.biome;game.biome=biome;game.biomeFade=1;game.biomeSign=3.5;
      if(discovery&&game.mutations[biome]===undefined&&random()<.45)game.mutations[biome]=nextMutation();
      game.nextObstacle=Math.max(game.nextObstacle,1);game.nextRoute=Math.max(game.nextRoute,3.8);game.nextEvent=Math.max(game.nextEvent,4);
      achievement.record('biome',{index:biome,name:activeTheme().name,worldName:worldBiome(biome).name});discover('biomes',activeTheme().name);toast(`NEW BIOME · ${activeTheme().name}`);
    }
    if(borderDistance()<=BORDER_APPROACH&&game.borderAnnounced!==game.biome){
      game.borderAnnounced=game.biome;toast(`BORDER AHEAD · ${worldBiome(game.biome+1).name} · CLEAR STRETCH`);
    }
  }
  function togglePause() {
    if (game.mode !== 'running' && game.mode !== 'paused') return;
    if (game.mode === 'running') {
      game.mode = 'paused';
      duckKey = false;
      showOverlay('TAKE A BREATHER', 'Horizon on hold.', 'Your adventure will be right here.', 'KEEP RUNNING');
    } else { game.mode = 'running'; $('overlay').hidden = true; last = null; }
    $('pause').textContent = game.mode === 'paused' ? '▶' : 'Ⅱ';
    $('pause').setAttribute('aria-label', game.mode === 'paused' ? 'Resume game' : 'Pause game');
    updateHUD();
  }
  function endRun() {
    achievement.record('end',{score:score()});
    game.mode = 'over';
    if(!game.assisted){high=Math.max(high,score());try{localStorage.setItem('dino-jumper-best',String(high));}catch{}}
    showOverlay('THERE’S ALWAYS ANOTHER HORIZON', 'One more try?', `You ran ${score()} points. Best run: ${high}.`, 'RUN AGAIN');
    if(game.assisted)$('overlay-text').textContent=`Training score: ${score()} · ${game.trainingDeaths} deaths. Normal best: ${high}.` ;
    announce(`Game over. Score ${score()}. Best ${high}.`);
    updateHUD();
    saveJournal();
  }
  function offerRevive() {
    if(game.assistMode==='practice'){practiceDeath(null,activeStage()?.reason||'fall');return;}
    if(game.assistMode==='noclip'){
      const gap=gapUnderfoot();registerTrainingDeath(gap,'fall');if(gap)gap.assistTouched=true;
      Object.assign(dino,{y:GROUND-45,vy:0,jumps:0,grounded:true,duck:false});game.voidFalling=false;return;
    }
    if(game.challenge){game.challenge.failed=true;finishPortal();return;}
    if(game.revivesUsed>=2){endRun();return;}
    const remaining=2-game.revivesUsed;
    game.mode='revive';duckKey=false;jumpHeld=false;
    showOverlay('YOUR EGG STILL HAS A LITTLE LIFE IN IT', 'Another chance?',
      `Keep your score, perks, and boss progress. ${remaining} revival${remaining===1?'':'s'} left this run.`, 'HATCH AGAIN');
    $('end-run').hidden=false;
    $('overlay-help').textContent='REVIVE WITH SPACE / ↑ / TAP · OR END YOUR RUN';
    announce(`Hit! ${2-game.revivesUsed} revivals available.`);updateHUD();
  }
  function useRevive() {
    if(game.mode!=='revive'||game.revivesUsed>=2)return;
    game.revivesUsed++;if(!game.assisted)journal.revives++;
    achievement.record('revive',{score:score(),boss:game.boss?.level,fraction:game.boss?game.boss.age/game.boss.duration:0});
    game.obstacles=[];game.platforms=[];game.warnings=[];game.routeActive=false;
    game.terrain=[];game.terrainWaiting=false;game.nextTerrain=3;game.terrainRun=null;game.voidFalling=false;
    game.invincible=2+game.perks.recovery;
    game.nextObstacle=1.3;
    if(game.boss){game.boss.shot=1.4;game.boss.echoes=[];}
    if(game.boss?.engine){const b=game.boss;game.boss.engine=trials.create({variant:b.variant,rank:b.level-5,speed:b.engine.speed,width:W,height:H,random});}
    game.mutationStage=null;
    Object.assign(dino,{y:GROUND-45,vy:0,jumps:0,grounded:true,duck:false});
    game.mode='running';$('overlay').hidden=true;$('end-run').hidden=true;
    last=null;duckKey=false;jumpHeld=false;
    discover('secrets','DINO EGG · HATCHED AGAIN');saveJournal();
    toast(`HATCHED AGAIN · ${2-game.revivesUsed} REVIVALS LEFT`);updateHUD();
  }
  function openUpgrade() {
    const pool=UPGRADES.filter(p=>game.perks[p.id]<p.max);
    for(let i=pool.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
    game.upgradeOffers=pool.slice(0,3).map(p=>p.id);
    if(!game.upgradeOffers.length)return;
    game.lastUpgradeBossCount=game.bossesDefeated;game.mode='upgrade';duckKey=false;
    showOverlay('TWO BOSSES DOWN. ONE UPGRADE TO CHOOSE.', 'Pick one upgrade.',
      'These three choices are random. Your pick lasts until this run ends. The game is paused.', 'SKIP THIS PICK');
    for(let i=0;i<3;i++) {
      const perk=UPGRADES.find(p=>p.id===game.upgradeOffers[i]);
      $('perk-option-'+(i+1)).hidden=!perk;
      if(!perk)continue;
      const next=game.perks[perk.id]+1;
      $('perk-name-'+(i+1)).textContent=`${i+1} · ${perk.name}`;
      $('perk-desc-'+(i+1)).textContent=perk.describe(next);
      $('perk-level-'+(i+1)).textContent=game.perks[perk.id]?`UPGRADE TO LEVEL ${next} / ${perk.max}`:perk.max===1?'NEW ABILITY · ONE PICK TO UNLOCK':`NEW UPGRADE · LEVEL 1 / ${perk.max}`;
    }
    $('upgrade-choices').hidden=false;
    $('overlay-help').textContent='CHOOSE 1 / 2 / 3 · OR SKIP';
    updateHUD();
  }
  function chooseUpgrade(kind) {
    if(game.mode!=='upgrade')return;
    if(kind!=='skip') {
      const perk=UPGRADES.find(p=>p.id===kind);
      if(!perk||!game.upgradeOffers.includes(kind)||game.perks[kind]>=perk.max)return;
      game.perks[kind]++;
      achievement.record('upgrade',{id:kind});
      if(kind==='finder'&&game.fragments>=2) {game.fragments-=2;game.shield=10+game.perks.shell*2;achievement.record('repair');}
    }
    game.mode='running';$('overlay').hidden=true;$('upgrade-choices').hidden=true;
    game.invincible=Math.max(game.invincible,.6);last=null;
    if(kind!=='skip') {discover('secrets',`PERK · ${UPGRADES.find(p=>p.id===kind).name}`);toast('UPGRADE EQUIPPED · SEE YOUR UPGRADES ABOVE THE GAME');}
    updateHUD();
  }
  function burst(x, y, count) {
    if (reducedMotion) return;
    for (let i=0;i<count;i++) game.particles.push({x,y,vx:rand(-90,90),vy:rand(-100,40),life:.45});
  }
  function bossBurst(boss){
    if(reducedMotion)return;
    const count=Math.floor(rand(45,66));
    for(let i=0;i<count;i++){
      const life=rand(1.2,2.1),angle=rand(0,Math.PI*2),speed=rand(70,245);
      game.particles.push({x:boss.x+rand(0,70),y:(boss.level===1?boss.y+25:GROUND-60)+rand(-25,25),vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-100,life,maxLife:life,size:rand(2,5),color:['#95836a','#b6a88a','#777960','#c39760'][Math.floor(random()*4)]});
    }
  }
  function hurt(obstacle) {
    if(game.assistMode==='noclip'){registerTrainingDeath(obstacle,'hazard');return;}
    if (game.invincible > 0) return;
    if(game.boss){game.boss.reaction='A WORTHY RUNNER';game.boss.reactionTime=1;}
    achievement.record('hit',{shield:game.shield>0,ward:game.wardActive&&Boolean(game.boss)});
    if (game.shield > 0) {
      game.shield = 0; game.wardActive=false; game.invincible = 1.4;
      obstacle.hit = true;
      burst(dino.x+20, dino.y+20, 14);
      toast('SHIELD SAVED YOU');
    } else if(game.assistMode==='practice')practiceDeath(obstacle,'hazard');
    else offerRevive();
  }
  function spawnObstacle() {
    const theme = activeTheme();
    let pool = theme.obstacles.filter(type => type !== game.lastObstacle);
    if (game.distance > 800 && random() < .25) pool = ['bird'];
    const type = game.event?.kind==='stampede'?'runner':game.event?.kind==='meteor'?'meteor':pool[Math.floor(random()*pool.length)];
    const bird = type === 'bird';
    const w = bird ? 44 : Math.round(rand(24,60));
    const h = bird ? 28 : Math.round(rand(30,56));
    const y = bird ? GROUND - (random() < .5 ? 56 : 38) : GROUND-h;
    const obstacle={x:W+rand(20,95),y,w:type==='runner'?52:w,h:type==='runner'?32:h,type,hit:false,biome:game.biome};
    if(type==='runner')obstacle.y=GROUND-32;
    if(game.event?.kind==='meteor') {obstacle.targetY=y;obstacle.startY=-40;obstacle.y=-40;}
    game.obstacles.push(obstacle);
    game.lastObstacle = type;
  }
  function spawnRoute() {
    // The entrance is visible well before it reaches the player. A double jump
    // reaches the first ledge; the ground underneath always stays traversable.
    game.routeId++;
    if(discovery&&(game.routeId===1||random()<.65)){
      const destination=nextMutation(),width=Math.round(rand(145,175)),stride=width-rand(20,30),start=W+rand(50,85),rise=rand(24,28),base=rand(38,43);
      for(let i=0;i<5;i++){
        const y=GROUND-base-i*rise;
        game.platforms.push({x:start+i*stride,y,w:rand(145,175),h:10,stairs:true,step:i,routeId:game.routeId,biome:game.biome,destination});
        if(i>0)game.pickups.push({x:start+i*stride+width*.35,y:y-29,w:19,h:19,type:'fossil'});
      }
      const top=game.platforms.at(-1);
      game.pickups.push({x:top.x+top.w-55,y:top.y-38,w:30,h:38,type:'portal',destination});
      toast(`HIDDEN STAIRCASE ↑ · ${discovery.mutations[destination].name} · DOUBLE JUMP TO ENTER`);return;
    }
    const risky=random()<.5;
    let routeX=W+rand(60,95);
    for (let i=0;i<4;i++) {
      const x=routeX,width=risky?rand(150,170):rand(180,205);
      const y = GROUND-rand(108,118)-(i===1||i===2?rand(12,risky?30:20):0);
      game.platforms.push({x,y,w:width,h:8,routeId:game.routeId,biome:game.biome});routeX+=width+rand(25,40);
      game.pickups.push({x:x+55,y:y-34,w:19,h:19,type:i===3?'fragment':'fossil'});
      if(risky && i===2)game.obstacles.push({x:x+100,y:y-28,w:32,h:28,type:'bird',hit:false,biome:game.biome});
    }
    if(discovery&&random()<.4){const top=game.platforms.at(-1);game.pickups.push({x:top.x+top.w-50,y:top.y-38,w:30,h:38,type:'portal'});}
    toast(`${risky?'DARING':'SCENIC'} HIGH ROAD · FOSSILS + EGG FRAGMENT · GROUND IS OPTIONAL`);
  }
  function nextMutation(){
    if(!game.mutationBag?.length)game.mutationBag=shuffled(discovery.mutations.map((_,i)=>i));
    return game.mutationBag.pop();
  }
  function selectPortal(index){
    if(game.mode!=='portal-offer'||!game.portalOffers.includes(index))return;
    game.selectedPortal=index;
    for(let i=0;i<3;i++)$('portal-choice-'+i).setAttribute('aria-pressed',String(game.portalOffers[i]===index));
    $('portal-enter').textContent=`ENTER ${discovery.mutations[index].name} · E`;
  }
  function spawnFossilTrail(){
    const id=++game.trailId;game.trail={id,collected:0,total:5};
    // One optional jump arc, with its middle fossil reachable near the apex.
    for(let i=0;i<5;i++){
      const t=.08+i*.14;
      game.pickups.push({x:W+80+i*game.speed*.14,y:GROUND-45+JUMP*t+.5*GRAVITY*t*t+20,w:20,h:20,type:'fossil',trailId:id});
    }
    toast('FOSSIL TRAIL · ALL 5 = +100 BONUS');
  }
  function offerPortal(source,destination){
    if(game.boss||game.challenge||game.mode!=='running')return false;
    game.mode='portal-offer';game.portalSource=source;game.travelerWaiting=false;game.nextTraveler=rand(35,50);
    duckKey=false;jumpHeld=false;
    $('portal-title').textContent=source==='hidden'?'You found a hidden gate.':'A traveler has an invitation.';
    game.portalPrize=450+50*Math.floor(random()*5);
    $('portal-prize').textContent=`2× POINTS · +${game.portalPrize} COMPLETION · +${(25+game.perks.fortune*10)*2} PER FOSSIL · SHIELD · MUSEUM PIECE`;
    const destinations=discovery.mutations.map((_,i)=>i);
    game.portalOffers=destination===undefined?shuffled(destinations).slice(0,3):[destination,...shuffled(destinations.filter(i=>i!==destination)).slice(0,2)];
    for(let i=0;i<3;i++){
      const variant=discovery.mutations[game.portalOffers[i]];
      $('portal-choice-'+i).textContent=`${variant.name} · ${variant.subtitle}`;
    }
    selectPortal(game.portalOffers[0]);
    $('portal-offer').hidden=false;$('portal-enter').focus();announce('Optional portal. Enter the challenge or keep running. Your run is paused.');return true;
  }
  function choosePortal(enter){
    if(game.mode!=='portal-offer')return false;
    $('portal-offer').hidden=true;game.mode='running';last=null;
    if(!enter){game.nextObstacle=Math.max(game.nextObstacle,1);return true;}
    const saved={};
    for(const key of ['obstacles','pickups','platforms','particles','event','trail','routeActive','message','messageTimer','biomeSign','phaseCooldown','phaseTrail','terrain','nextTerrain','terrainWaiting','terrainRun','voidFalling'])saved[key]=game[key];
    saved.dino={...dino};
    const entrySpeed=game.speed*(game.slow>0?.58:1),duration=rand(15,18);
    game.challenge={age:0,duration,collected:0,spawned:0,variant:game.selectedPortal,saved,chapter:0,lastKind:'',prize:game.portalPrize,fossilValue:(25+game.perks.fortune*10)*2,earned:0,engine:trials?.create({variant:game.selectedPortal,speed:entrySpeed,width:W,height:H,random})};
    game.voidFalling=false;
    game.obstacles=[];game.pickups=[];game.platforms=[];game.particles=[];game.terrain=[];game.event=null;game.trail=null;game.routeActive=false;game.biomeSign=2.4;game.phaseTrail=0;game.nextTerrain=.25;
    Object.assign(dino,{y:GROUND-45,vy:0,jumps:0,grounded:true,duck:false});
    discover('secrets',`PORTAL · ${discovery.mutations[game.challenge.variant].name}`);
    captureCheckpoint(true);toast(`SECRET TRIAL · ${Math.ceil(duration)}s · 2× POINTS · ENTRY SPEED ${Math.round(entrySpeed)}`);return true;
  }
  function finishPortal(){
    const challenge=game.challenge;if(!challenge)return;
    if(challenge.failed&&game.assistMode==='practice'){practiceDeath(challenge.engine.lastHazard,challenge.engine.reason);return;}
    if(challenge.failed&&game.assistMode==='noclip'){registerTrainingDeath(null,challenge.engine.reason);challenge.engine.recover();challenge.failed=false;return;}
    const success=!challenge.failed&&challenge.age>=challenge.duration,saved=challenge.saved;
    Object.assign(dino,saved.dino);delete saved.dino;Object.assign(game,saved);game.challenge=null;
    game.bonus+=Math.floor(challenge.earned||0);
    if(!success){
      achievement.record('hit',{shield:false,ward:false});endRun();
      $('overlay-kicker').textContent='LOST BEYOND THE HIDDEN DOOR';$('overlay-text').textContent=`The trial claimed this run at ${score()} points. Hidden-door deaths bypass eggs and shields.`;
      announce('You died in the secret trial. Run over.');return;
    }
    game.invincible=Math.max(game.invincible,1);game.nextObstacle=Math.max(game.nextObstacle,1);
    if(success){
      game.bonus+=challenge.prize+challenge.collected*challenge.fossilValue;game.shield=Math.max(game.shield,10+game.perks.shell*2);
      game.runFossils+=challenge.collected;if(!game.assisted)journal.fossils+=challenge.collected;
      for(let i=0;i<challenge.collected;i++)achievement.record('pickup',{type:'fossil',points:challenge.fossilValue,score:score()});
      const piece=game.assisted?null:discovery.uncover();
      discover('secrets','PORTAL CHALLENGE · COMPLETED');
      toast(`TRIAL COMPLETE · +${challenge.prize+challenge.collected*challenge.fossilValue} · SHIELD${game.assisted?' · TRAINING ONLY':piece?' · '+piece:' · MUSEUM COMPLETE'}`);
    }
    synchronizeBiome();saveJournal();
  }
  function terrainKind(theme=activeTheme()){
    return theme.terrain||({volcano:'lava',space:'void',cave:'crystal',ruins:'crystal',city:'crystal',forest:'thorns',jungle:'thorns',swamp:'thorns',fungus:'geyser',snow:'geyser',canyon:'meteor',coast:'void',dune:'void',meadow:'thorns'})[theme.scenery]||'void';
  }
  function spawnTerrain(kind=terrainKind(),hard=activeTheme().mutation!==undefined,speed=game.speed){
    game.terrainRun={clean:true,reward:hard?60:25};
    const theme=activeTheme(),start=game.challenge?dino.x+speed*1.45:W+speed*.65;
    const add=(kind,x,w,h=0)=>game.terrain.push({kind,x,w,h,y:GROUND-h,stage:'waiting',timer:0,biome:game.biome,bg:theme.bg,ink:theme.ink,faint:theme.faint});
    const gap=(x,width,lava=false)=>{add('gap',x,width);game.terrain.at(-1).lava=lava;};
    if(kind==='void'){
      const count=hard?Math.floor(rand(2,5)):1;let x=start;
      for(let i=0;i<count;i++){const width=speed*(hard?rand(.29,.37):rand(.23,.29));gap(x,width);x+=width+speed*rand(.53,.66);}
      toast(hard?`BLOCK VOID · ${count} GAPS · LAND ON EACH ISLAND`:'BROKEN GROUND · JUMP THE GAP');
    }else if(kind==='lava'){
      gap(start,speed*(hard?rand(.39,.48):rand(.27,.33)),true);
      add('volcano',start+speed*rand(1.12,1.3),speed*rand(.1,.13),hard?rand(72,84):rand(48,64));
      if(hard&&random()<.5)gap(start+speed*rand(2.5,2.75),speed*rand(.33,.43),true);
      toast('LAVA LAKE → VOLCANO · JUMP AFTER THE WARNING');
    }else if(kind==='thorns'){
      const firstVine=random()<.5,count=hard?3:2;let x=start;
      for(let i=0;i<count;i++){
        const vine=(i%2===0)===firstVine;
        add(vine?'vine':'root',x,speed*(vine?rand(.2,.29):rand(.1,.14)),vine?rand(29,35):hard?rand(42,53):rand(30,40));
        if(vine)game.terrain.at(-1).y=GROUND-64;
        x+=speed*rand(1.14,1.32);
      }
      toast('LIVING WOODS · DUCK VINES, THEN JUMP ROOTS');
    }else if(kind==='crystal'){
      add('crystal',start,speed*rand(.1,.13),hard?rand(128,142):rand(48,65));
      if(hard)add('crystal',start+speed*rand(1.5,1.8),speed*rand(.1,.13),rand(126,140));
      toast(hard?'CRYSTAL GATES · DOUBLE JUMP EACH TOWER':'RUINED GATE · JUMP');
    }else{
      const count=hard?Math.floor(rand(2,5)):1;let x=start;
      for(let i=0;i<count;i++){add(kind,x,speed*rand(.1,.15),kind==='meteor'?rand(29,40):hard?rand(78,97):rand(45,65));x+=speed*rand(1.08,1.28);}
      toast(kind==='meteor'?'STARFALL · MARKED IMPACTS · JUMP THE ROCKS':'GEYSERS · WATCH THE GROUND WARNING, THEN JUMP');
    }
    game.nextObstacle=Math.max(game.nextObstacle,1.2);game.nextRoute=Math.max(game.nextRoute,4);game.nextEvent=Math.max(game.nextEvent,4);
  }
  function moveTerrain(dt,speed){
    for(const t of game.terrain){
      t.x-=speed*dt;
      if(['volcano','geyser','meteor'].includes(t.kind)){
        if(t.stage==='waiting'&&t.x-dino.x<speed*1.1){t.stage='warning';t.timer=t.kind==='meteor'?.45:.6;}
        else if(t.stage==='warning'){
          t.timer-=dt;
          if(t.timer<=0){t.stage='active';if(t.kind==='meteor')t.y=GROUND-190;}
        }else if(t.stage==='active'&&t.kind==='meteor')t.y=Math.min(GROUND-t.h,t.y+440*dt);
      }
    }
    game.terrain=game.terrain.filter(t=>t.x+t.w>0);
    if(!game.terrain.length&&game.terrainRun){
      if(game.terrainRun.clean&&!game.challenge){game.bonus+=game.terrainRun.reward*multiplier();toast(`CLEAN PASSAGE · +${game.terrainRun.reward}`);}
      game.terrainRun=null;
    }
  }
  function gapUnderfoot(){return game.terrain.find(t=>t.kind==='gap'&&!(game.assistMode==='noclip'&&t.assistTouched)&&!(game.assistMode==='practice'&&t.practiceBridge)&&dino.x+23>t.x&&dino.x+23<t.x+t.w);}
  function terrainHit(){
    if(game.assistMode==='practice'){practiceDeath(gapUnderfoot(),'fall');return true;}
    if(game.assistMode==='noclip'){offerRevive();return true;}
    if(game.challenge){game.challenge.failed=true;finishPortal();return true;}
    achievement.record('hit',{shield:false,ward:false});
    offerRevive();return true;
  }
  function checkTerrain(){
    const gap=gapUnderfoot();
    if(gap&&!gap.lava&&dino.y+dino.h>GROUND+18)game.voidFalling=true;
    if((gap?.lava&&dino.y+dino.h>GROUND+5)||(game.voidFalling&&dino.y>H-20)||dino.y>H+20)return terrainHit();
    const box=playerBox();
    for(const t of game.terrain){
      if(t.kind==='gap'||t.hit)continue;
      if(t.kind==='meteor'&&t.stage!=='active')continue;
      if(t.kind==='geyser'&&t.stage!=='active')continue;
      const height=t.kind==='volcano'&&t.stage!=='active'?28:t.h;
      const y=t.kind==='volcano'?GROUND-height:t.y;
      if(intersects(box,{x:t.x+3,y:y+3,w:t.w-6,h:height-5})){
        if(game.challenge){game.challenge.failed=true;finishPortal();return true;}
        if(game.invincible<=0&&game.terrainRun)game.terrainRun.clean=false;
        hurt(t);if(game.mode!=='running')return true;
      }
    }
    return false;
  }
  function updateChallenge(dt){
    const c=game.challenge;c.age+=dt;game.time+=dt;c.earned+=c.engine.speed*dt/10*2;
    stepStage(c.engine,dt);c.collected=c.engine.collected;syncStagePlayer(c.engine);
    if(c.engine.dead){c.failed=true;finishPortal();return;}
    if(c.age>=c.duration)finishPortal();
  }
  function spawnBoss(level = Math.min(BOSSES.length,game.bossesDefeated+1)) {
    const spec = BOSSES[level-1];
    game.boss = { ...spec,duration:rand(spec.duration-.3,spec.duration+.3),level,age:0,shot:rand(.75,1),x:W-145,y:68,w:88,h:60,echoes:[],feints:0,volley:0,lastPattern:'',lastHigh:null,laneStreak:0,laserBag:[] };
    game.mutationStage=null;
    if(level>5){const rank=level-5;game.boss.engine=trials.create({variant:spec.variant,rank,speed:Math.max(game.speed+100+rank*40,700+rank*100),width:W,height:H,random});jumpHeld=false;}
    // Clear the runway so boss projectiles do not create unfair combinations.
    game.obstacles = [];
    game.terrain=[];game.terrainWaiting=false;game.nextTerrain=4;game.terrainRun=null;
    game.platforms = [];
    game.pickups = [];
    game.warnings = [];
    game.event=null;game.nextEvent=rand(3,5);
    if(game.perks.ward) {game.shield=Math.max(game.shield,spec.duration+1);game.wardActive=true;}
    achievement.record('bossStart',{level,ward:Boolean(game.perks.ward)});
    game.routeActive = false;
    toast(`BOSS ${level} · ${spec.name} · SURVIVE TO WIN`);captureCheckpoint(true);
  }
  function warnAttack(type, high = false, offset = 0, options = {}) {
    game.warnings.push({ type, high, delay: .45+offset, ...options, label:
      type==='charge'?'CHARGE · JUMP':type==='rain'?'LAVA FALL':type==='boulder'?'BOULDER · JUMP':
      type==='echo'?'SHADOW ECHO':high?'HIGH SHOT · DUCK':'LOW SHOT · JUMP' });
  }
  function launchAttack(warning) {
    const boss = game.boss;
    if(!boss) return;
    const {type,high} = warning;
    if(type==='laser') {
      game.obstacles.push({x:0,y:warning.laneY,w:W,h:warning.height,type:'laser',ttl:.18,age:0,hit:false,biome:game.biome});return;
    }
    if(type==='siege-rock') {
      const height=warning.height;
      const speed=Math.min(game.speed,(boss.x-dino.x)/1.05);
      game.obstacles.push({x:boss.x+(warning.spacing||0)*speed,y:warning.laneY??GROUND-height,w:warning.width||34,h:height,
        vx:Math.min(game.speed,(boss.x-dino.x)/1.05),recall:warning.recall,stage:'out',type:'siege-rock',hit:false,age:0,biome:game.biome});return;
    }
    if(type==='terrain') {
      const ash=warning.kind==='ash',y=warning.ledgeY??GROUND-86;
      const slab=(top,height,kind,ttl)=>game.obstacles.push({x:0,y:top,w:W,h:height,type:'terrain',kind,ttl,age:0,hit:false,biome:game.biome,wave:boss.volley});
      if(ash)slab(0,GROUND-26,'ash',.45);
      else{
        slab(y+12,H-y-12,'rift-floor',warning.kind==='vault'?.85:.95);
        if(warning.kind==='cage')slab(0,y-100,'rift-ceiling',.95);
        game.platforms.push({x:warning.ledgeX??dino.x-26,y,w:warning.ledgeW??140,h:8,fixed:true,expires:warning.expires??1.5,crumble:null,crumbleLife:warning.crumbleLife??1.1});
      }
      return;
    }
    if(type==='mirror'){
      const left=warning.side==='left',speed=left?(dino.x-20)/.45:(boss.x-dino.x)/.8;
      game.obstacles.push({x:left?20:boss.x,y:GROUND-(warning.high?53:22),w:18,h:22,type:'mirror',vx:left?-speed:speed,fromLeft:left,age:0,hit:false,biome:game.biome});return;
    }
    const size = type==='charge'?48:type==='boulder'?Math.round(rand(25,34)):22;
    const y = warning.laneY ?? GROUND-(high?53:size);
    // Keep the same travel time inside each volley, including on narrow screens.
    // Horizontal offsets create a train of balls launched in the same frame.
    const speed=Math.min(game.speed*1.12,(boss.x-dino.x)/.8);
    const hazard = {x:boss.x+(warning.spacing||0)*speed,y,w:type==='charge'?70:size,h:size,type,hit:false,
      vx:speed,age:0};
    if(type==='ball'||type==='fireball') {
      hazard.targetY=y;hazard.startY=boss.y+28;hazard.y=hazard.startY;
    }
    if(type==='boulder') { hazard.bounce=warning.bounce ?? rand(12,27);hazard.frequency=rand(5,7); }
    if(type==='rain') {
      hazard.y=-30;hazard.vy=300;
    }
    if(type==='echo') {hazard.y=warning.y;hazard.w=42;hazard.h=38;}
    game.obstacles.push(hazard);
  }
  function bossAttack(boss) {
    boss.volley++;
    // Randomized encounter bags preserve varied, readable escape actions.
    const ceiling=()=>warnAttack('ball',false,0,{laneY:GROUND-195});
    if(boss.level===1) {
      const patterns=[
        {name:'LOW RUSH',high:false,count:3,gap:.1,sky:true},
        {name:'HIGH RUSH',high:true,count:3,gap:.12,sky:true},
        {name:'LOW PAIR',high:false,count:2,gap:.24,sky:false},
        {name:'HIGH PAIR',high:true,count:2,gap:.22,sky:true},
        {name:'LOW SCATTER',high:false,count:3,gap:.14,sky:false},
        {name:'HIGH SCATTER',high:true,count:2,gap:.17,sky:false},
      ];
      const choices=patterns.filter(p=>p.name!==boss.lastPattern && (boss.laneStreak<2||p.high!==boss.lastHigh));
      const pattern=choices[Math.floor(random()*choices.length)];
      boss.laneStreak=pattern.high===boss.lastHigh?boss.laneStreak+1:1;
      boss.lastHigh=pattern.high;boss.lastPattern=pattern.name;
      const gap=pattern.gap*rand(.92,1.08),delay=rand(.45,.53);
      for(let i=0;i<pattern.count;i++)warnAttack('ball',pattern.high,0,{spacing:i*gap,delay});
      if(pattern.sky)ceiling();
    } else if(boss.level===2) {
      if(!boss.laserBag.length)boss.laserBag=shuffled(['duck','jump','double','scatter']);
      const action=boss.laserBag.pop();
      const y=action==='duck'?rand(GROUND-39,GROUND-28):action==='jump'?rand(GROUND-80,GROUND-45):action==='double'?rand(GROUND-190,GROUND-145):rand(20,GROUND-16);
      const height=action==='jump'||action==='double'?GROUND-y:8;
      game.warnings.push({type:'laser',action,laneY:y,height,delay:rand(.98,1.1),scanning:true,label:action==='double'?'LASER CURTAIN · DOUBLE JUMP':action==='jump'?'LOW LASER CURTAIN · JUMP':action==='duck'?'HEAD-HEIGHT LASER · DUCK':'SCATTER LASER · READ THE LINE'});
    } else if(boss.level===3) {
      const choices=['ground','tower','twins'].filter(p=>p!==boss.lastPattern);
      const pattern=choices[Math.floor(random()*choices.length)];boss.lastPattern=pattern;
      const height=pattern==='tower'?rand(132,146):pattern==='twins'?rand(30,36):rand(35,50);
      const delay=rand(.7,.82),width=pattern==='tower'?rand(30,35):rand(30,39);
      for(let i=0;i<(pattern==='twins'?2:1);i++)game.warnings.push({type:'siege-rock',action:pattern,height,laneY:GROUND-height,width,spacing:i*rand(.12,.16),recall:pattern!=='tower',delay,label:pattern==='tower'?'ROCK TOWER · DOUBLE JUMP':pattern==='twins'?'TWIN MAGNETS · JUMP BOTH, THEN DUCK RETURN':'MAGNET ROCK · JUMP, THEN DUCK RETURN'});
    } else if(boss.level===4) {
      if(!boss.arenaBag?.length)boss.arenaBag=shuffled(['cage','vault','ash']);
      const kind=boss.arenaBag.pop(),ledgeY=GROUND-(kind==='vault'?rand(142,155):rand(77,91));
      game.warnings.push({type:'terrain',kind,ledgeY,ledgeX:dino.x-rand(20,31),ledgeW:rand(110,145),expires:rand(1.5,1.65),crumbleLife:rand(1.05,1.18),delay:rand(1.02,1.15),label:kind==='ash'?'ASH SEAL · LAND AND CROUCH':kind==='vault'?'HIGH TIDE · DOUBLE JUMP TO THE HIGH STONE':'RIFT CAGE · SINGLE JUMP · WATCH THE CEILING'});
    } else {
      if(!boss.mirrorBag?.length)boss.mirrorBag=shuffled(['jump','duck','double']);
      const action=boss.mirrorBag.pop();boss.lastHigh=action==='duck';
      if(action==='double'){
        const height=rand(145,175);game.warnings.push({type:'laser',action,laneY:GROUND-height,height,delay:rand(1,1.1),label:'MIRROR CURTAIN · DOUBLE JUMP'});
      }
      else{
        const side=random()<.5?'left':'right',delay=rand(.7,.82);
        const firstTravel=side==='left'?.45:.8,secondTravel=side==='left'?.8:.45;
        game.warnings.push({type:'mirror',high:action==='duck',side,delay,label:`MIRROR ${side.toUpperCase()} · ${action.toUpperCase()}`});
        game.warnings.push({type:'mirror',high:action==='duck',side:side==='left'?'right':'left',delay:delay+firstTravel-secondTravel+rand(.14,.19),label:`RETURNING MIRROR · ${action.toUpperCase()}`});
      }
    }
  }
  function continueExploring() {
    game.mode='running';game.invincible=1;
    $('overlay').hidden=true;last=null;
    toast('ALL FIVE DEFEATED · THE FRONTIER IS YOURS');
  }
  function startEvent(kind) {
    const scenery=activeTheme().scenery;
    kind=kind||(scenery==='snow'?'blizzard':['volcano','space','canyon'].includes(scenery)?'meteor':random()<.5?'stampede':'fireflies');
    const names={blizzard:'SNOW SQUALL',meteor:'METEOR SHOWER',stampede:'MINI STAMPEDE',fireflies:'FIREFLY TRAIL'};
    game.event={kind,name:names[kind],left:6};
    discover('secrets',`EVENT · ${names[kind]}`);toast(`${names[kind]} · WATCH THE HORIZON`);
    if(kind==='fireflies')for(let i=0;i<5;i++)game.pickups.push({x:W+60+i*115,y:GROUND-50-i%2*25,w:19,h:19,type:'fossil'});
  }
  function collectPickup(pickup) {
    if(pickup.collected)return;
    if(pickup.type==='portal'){pickup.collected=true;offerPortal('hidden',pickup.destination);return;}
    if(pickup.type==='portal-token'){pickup.collected=true;game.challenge.collected++;burst(pickup.x,pickup.y,5);return;}
    const points=(25+(pickup.type==='fossil'?game.perks.fortune*10+(game.routeActive?game.perks.route*15:0):0))*multiplier();
    achievement.record('pickup',{type:pickup.type,points,score:score()+(['fossil','bonus'].includes(pickup.type)?points:0),upper:game.routeActive,fireflies:game.event?.kind==='fireflies'});
    pickup.collected=true;burst(pickup.x,pickup.y,8);
    if(pickup.type==='shield') {game.shield=Math.min(18,10+game.perks.shell*2);toast('SHIELD · ONE FREE HIT');}
    else if(pickup.type==='slow') {game.slow=7+game.perks.clock*2;toast(`SLOW TIME · ${game.slow} SECONDS`);}
    else if(pickup.type==='fragment') {
      game.fragments++;
      const needed=game.perks.finder?2:3;
      if(game.fragments>=needed) {
        game.fragments=0;game.shield=Math.min(18,10+game.perks.shell*2);
        achievement.record('repair');
        discover('secrets','EGG FRAGMENTS · REBUILT SHELL');toast(`${needed} FRAGMENTS · BONUS SHIELD`);
      }else toast(`EGG FRAGMENT ${game.fragments}/${needed} · ${needed} MAKE A SHIELD`);
    } else {
      game.bonus+=points;
      if(pickup.type==='fossil') {
        game.runFossils++;if(!game.assisted)journal.fossils++;saveJournal();
        if(discovery&&!game.assisted&&random()<.08){const piece=discovery.uncover();if(piece)toast(`MUSEUM DISCOVERY · ${piece}`);}
        if(game.trail&&pickup.trailId===game.trail.id){
          game.trail.collected++;
          if(game.trail.collected===game.trail.total){game.bonus+=100*multiplier();toast('FOSSIL TRAIL COMPLETE · +100 BONUS');game.trail=null;}
        }
      }
    }
  }
  function winRun() {
    achievement.record('win',{score:score()});
    game.completed=true;game.nextBoss=Infinity;game.mode='won';
    if(!game.assisted){high=Math.max(high,score());try{localStorage.setItem('dino-jumper-best',String(high));}catch{}}
    showOverlay('TEN BOSSES. ONE VERY STUBBORN DINO.', '25,000-point frontier conquered.',
      `${score()} points. Keep exploring new biomes, or restart for another challenge.`, 'EXPLORE ON');
    announce('Victory! All ten bosses defeated. Continue into the endless frontier.');
    discover('secrets','TEN BOSSES · GAUNTLET COMPLETE');saveJournal();
  }
  function completeBoss(boss){
    const reward=boss.level*50*multiplier();bossBurst(boss);game.bossRest=2.5;
    achievement.record('bossWin',{level:boss.level,score:score()+reward});
    game.boss=null;game.bonus+=reward;game.bossesDefeated++;
    if(game.wardActive){game.shield=0;game.wardActive=false;}
    discover('bosses',boss.name);game.obstacles=[];game.warnings=[];game.platforms=[];game.nextObstacle=rand(2.2,2.8);game.nextRoute=Math.max(3,game.nextRoute);
    toast(`BOSS ${boss.level} OUTRUN · +${reward}`);
    if(game.bossesDefeated===BOSSES.length)winRun();
    else if(game.bossesDefeated%2===0&&game.lastUpgradeBossCount<game.bossesDefeated)openUpgrade();
  }
  function syncStagePlayer(stage){Object.assign(dino,{y:stage.player.y,vy:stage.player.vy,grounded:stage.player.grounded,jumps:stage.player.jumps});}
  function tickStageDeath(stage){
    if(game.assistMode==='practice'){practiceDeath(stage.lastHazard,stage.reason);return;}
    if(game.assistMode==='noclip'){registerTrainingDeath(null,stage.reason);stage.recover();return;}
    if(['void fall','lava lake'].includes(stage.reason)){offerRevive();return;}
    hurt({});
    if(game.mode==='running'){stage.dead=false;Object.assign(stage.player,{y:['ship','ufo','jetpack'].includes(stage.mode)?145:252,vy:0,falling:false});}
  }
  function updateMutationWorld(dt){
    const stage=game.mutationStage;game.time+=dt;game.distance+=stage.speed*dt;game.bonus+=stage.speed*dt/10;
    const value=(25+game.perks.fortune*10)*2,old=stage.collected;stepStage(stage,dt);game.bonus+=(stage.collected-old)*value;
    const collected=stage.collected-old;
    if(collected){game.runFossils+=collected;if(!game.assisted)journal.fossils+=collected;for(let i=0;i<collected;i++)achievement.record('pickup',{type:'fossil',points:value,score:score()});saveJournal();}
    for(const key of ['invincible','shield','slow','messageTimer','bossRest'])game[key]=Math.max(0,(game[key]||0)-dt);
    syncStagePlayer(stage);
    if(stage.dead){tickStageDeath(stage);return;}
    synchronizeBiome();
    if(game.mutationStage&&!(game.bossRest>0)&&!game.completed&&score()>=game.nextBoss&&stage.canExit()){
      game.nextBoss=BOSS_MILESTONES[game.bossesDefeated+1]??Infinity;spawnBoss();
    }
  }
  function updateMechanicalBoss(dt){
    const b=game.boss,factor=game.slow>0?.58:1,worldDt=dt*factor;game.time+=dt;
    game.distance+=b.engine.speed*worldDt;game.bonus+=(multiplier()-1)*b.engine.speed*worldDt/10;
    for(const key of ['shield','slow','invincible','messageTimer'])game[key]=Math.max(0,game[key]-dt);
    if(game.wardActive&&game.shield>0)game.shield=Math.max(game.shield,b.duration-b.age+1);
    b.age+=worldDt;stepStage(b.engine,worldDt);syncStagePlayer(b.engine);
    if(b.engine.dead){tickStageDeath(b.engine);return;}
    synchronizeBiome();if(b.age>=b.duration)completeBoss(b);
  }
  function playerBox() {
    return {x:dino.x+6,y:dino.y+(dino.duck?25:10),w:dino.duck?44:30,h:dino.duck?19:34};
  }
  function update(dt) {
    updateTraining(dt);
    if(game.challenge){updateChallenge(dt);return;}
    if(game.boss?.engine){updateMechanicalBoss(dt);return;}
    if(trials&&discovery&&!game.boss&&activeTheme().mutation!==undefined&&!game.terrain.length&&!game.obstacles.length&&!game.platforms.length){
      if(!game.mutationStage){game.pickups=[];game.routeActive=false;game.mutationStage=trials.create({variant:activeTheme().mutation,speed:(game.mutationSpeed||game.speed)*(game.slow>0?.58:1),width:W,height:H,random});captureCheckpoint(true);}
      updateMutationWorld(dt);return;
    }
    // Slow motion affects world movement, not the responsiveness of the jump.
    const worldDt = dt * (game.slow > 0 ? .58 : 1);
    game.time += dt;
    game.bossRest=Math.max(0,(game.bossRest||0)-dt);
    game.distance += game.speed * worldDt;
    game.bonus+=(multiplier()-1)*game.speed*worldDt/10;
    game.speed = activeTheme().mutation===undefined?Math.min(MAX_SPEED,BASE_SPEED+game.distance/32):(game.mutationSpeed||game.speed);
    for (const key of ['shield','slow','invincible','messageTimer','biomeSign']) game[key] = Math.max(0,game[key]-dt);
    if(game.wardActive&&game.boss&&game.shield>0)game.shield=Math.max(game.shield,game.boss.duration-game.boss.age+1);
    for(const key of ['biomeFade','phaseCooldown','phaseTrail'])game[key]=Math.max(0,game[key]-dt);
    synchronizeBiome();
    const nearBorder=borderDistance()<=BORDER_APPROACH;
    const bossApproach=!game.completed&&score()>=game.nextBoss-170;
    dino.duck = duckKey && dino.grounded;
    const oldBottom = dino.y+dino.h;
    dino.vy += GRAVITY*dt*(duckKey && !dino.grounded && game.perks.fall>0 && dino.vy>0?2.4:1);
    dino.y += dino.vy*dt;
    dino.grounded = false;
    const dx = game.speed*worldDt;
    moveTerrain(worldDt,game.speed);
    for (const platform of game.platforms) {
      if(!platform.fixed)platform.x -= dx;
      if(platform.expires!==undefined){platform.expires-=worldDt;if(platform.expires<=0)continue;}
      if(platform.crumble!==undefined && platform.crumble!==null) {
        platform.crumble-=platform.fixed?worldDt:dt;if(platform.crumble<=0)continue;
      }
      if (!game.voidFalling && dino.vy >= 0 && oldBottom <= platform.y+3 && dino.y+dino.h >= platform.y &&
        dino.x+dino.w-8 > platform.x && dino.x+8 < platform.x+platform.w) {
        dino.y = platform.y-dino.h; dino.vy = 0; dino.grounded = true; dino.jumps = 0;
        if(platform.crumble===null)platform.crumble=platform.crumbleLife||.85;
        if(platform.routeId!==undefined && game.visitedRoute!==platform.routeId) {
          game.visitedRoute=platform.routeId;discover('secrets','SECRET ROUTE · THE HIGH ROAD');
          achievement.record('route');
        }
        if (!platform.fixed&&!game.routeActive) { game.routeActive = true; toast('UPPER ROUTE'); }
      }
    }
    if (dino.y+dino.h >= GROUND && !game.voidFalling && oldBottom<=GROUND+3 && !gapUnderfoot()) {
      dino.y = GROUND-dino.h; dino.vy = 0; dino.grounded = true; dino.jumps = 0;
      game.routeActive = false;
    }
    if (dino.grounded) dino.duck = duckKey;
    if(checkTerrain())return;
    game.platforms = game.platforms.filter(p=>p.x+p.w>0 && (p.expires===undefined||p.expires>0) && (p.crumble===undefined||p.crumble===null||p.crumble>0));

    if (!game.boss && !(game.bossRest>0) && !game.completed && score() >= game.nextBoss && !game.terrain.length && !game.obstacles.some(o=>!o.hit&&o.x+o.w>0)) {
      game.nextBoss=BOSS_MILESTONES[game.bossesDefeated+1]??Infinity;
      spawnBoss();
    }
    if (game.boss) {
      const boss = game.boss;
      boss.reactionTime=Math.max(0,(boss.reactionTime||0)-dt);
      boss.age += worldDt;
      boss.shot -= worldDt;
      for(const echo of boss.echoes) {
        echo.delay-=worldDt;
        if(echo.delay<=0 && !echo.sent) {
          // Echoes occupy the upper lane; ground volleys still leave a jump gap.
          game.warnings.push({type:'echo',y:GROUND-190,delay:.45,label:'YOUR JUMP · SHADOW ECHO'});
          echo.sent=true;
        }
      }
      boss.echoes=boss.echoes.filter(e=>!e.sent);
      const recallBusy=boss.level===3&&game.obstacles.some(o=>o.recall&&(o.stage!=='return'||o.x<dino.x+90));
      if (boss.shot <= 0 && !recallBusy && boss.age < boss.duration-(boss.level===2?1.05:2)) {
        bossAttack(boss);
        const rage=boss.level===5 && boss.age>boss.duration/2;
        boss.shot=rand(...boss.interval)*(rage?.9:1);
      }
      for(const warning of game.warnings) {
        warning.delay-=worldDt;
        if(warning.delay<=0)launchAttack(warning);
      }
      game.warnings=game.warnings.filter(w=>w.delay>0);
      if (boss.age >= boss.duration) {
        completeBoss(boss);if(game.mode!=='running')return;
      }
    } else {
      const mutationPending=Boolean(trials&&activeTheme().mutation!==undefined);
      const terrainBorderClear=borderDistance()>750;
      if(!terrainBorderClear||bossApproach||mutationPending)game.terrainWaiting=false;
      if(discovery&&!mutationPending&&terrainBorderClear&&!bossApproach&&!game.travelerWaiting){
        game.nextTerrain-=worldDt;
        if(game.nextTerrain<=0&&!game.event&&!game.trail&&!game.platforms.length)game.terrainWaiting=true;
        if(game.terrainWaiting&&!game.obstacles.length&&!game.terrain.length&&!game.platforms.length){
          spawnTerrain();game.terrainWaiting=false;game.nextTerrain=activeTheme().mutation===undefined?rand(9,13):rand(5,7);
        }
      }
      const terrainBusy=mutationPending||game.terrainWaiting||game.terrain.length>0;
      const stairsActive=game.platforms.some(p=>p.stairs);
      game.nextEvent-=worldDt;
      if(game.event) {game.event.left-=worldDt;if(game.event.left<=0){achievement.record('eventWin',{kind:game.event.kind});game.event=null;}}
      if(game.nextEvent<=0&&!game.event&&!nearBorder&&!bossApproach&&!terrainBusy&&!stairsActive){startEvent();game.nextEvent=rand(16,24);}
      game.nextObstacle -= worldDt;
      if (game.nextObstacle<=0&&!nearBorder&&!bossApproach&&!game.travelerWaiting&&!terrainBusy&&!stairsActive) { spawnObstacle(); game.nextObstacle=rand(.78,1.35); }
      if(discovery&&!nearBorder&&!bossApproach){
        game.nextTraveler-=worldDt;game.nextTrail-=worldDt;
        if(game.nextTraveler<=0)game.travelerWaiting=true;
        if(game.travelerWaiting&&!game.terrain.length)game.terrainWaiting=false;
        if(game.travelerWaiting&&!game.obstacles.length&&!game.platforms.length&&!terrainBusy){offerPortal('traveler');return;}
        if(game.nextTrail<=0&&!game.trail&&!game.travelerWaiting&&!terrainBusy){spawnFossilTrail();game.nextTrail=rand(18,25);}
      }
      game.nextPickup -= worldDt;
      if (game.nextPickup<=0) {
        const roll=random();
        game.pickups.push({x:W+rand(40,90),y:GROUND-rand(65,115),w:23,h:23,type:roll<.3?'shield':roll<.6?'slow':roll<.8?'fragment':'fossil'});
        game.nextPickup=rand(11,15);
      }
      game.nextRoute -= worldDt;
      if (game.nextRoute<=0 && !game.travelerWaiting && !terrainBusy && !game.platforms.length && borderDistance()>650 && (game.completed||score()<game.nextBoss-400)) { spawnRoute(); game.nextRoute=rand(22,28); }
    }
    const box = playerBox();
    for (const obstacle of game.obstacles) {
      if(obstacle.type==='laser'||obstacle.type==='terrain'){obstacle.ttl-=worldDt;if(obstacle.ttl<=0)continue;}
      else if(obstacle.recall&&obstacle.stage==='windup'){
        obstacle.windup-=worldDt;
        if(obstacle.windup<=0)obstacle.stage='return';
      } else obstacle.x += (obstacle.stage==='return'?1:-1)*(obstacle.vx||game.speed)*worldDt;
      if(obstacle.recall&&obstacle.stage==='out'&&obstacle.x+obstacle.w<dino.x-35){
        obstacle.stage='windup';obstacle.windup=.65;obstacle.y=GROUND-53;obstacle.h=22;
        toast('MAGNET RECALL · DUCK THE RETURN');
      }
      obstacle.age=(obstacle.age||0)+worldDt;
      if(obstacle.targetY!==undefined)obstacle.y=obstacle.startY+(obstacle.targetY-obstacle.startY)*Math.min(1,obstacle.age/.3);
      if(obstacle.bounce)obstacle.y=GROUND-obstacle.h-Math.abs(Math.sin(obstacle.age*obstacle.frequency))*obstacle.bounce;
      if(obstacle.vy)obstacle.y+=obstacle.vy*worldDt;
      if(!obstacle.counted&&!obstacle.hit&&!obstacle.touched&&(obstacle.fromLeft?obstacle.x>dino.x+45:obstacle.x+obstacle.w<dino.x)){
        obstacle.counted=true;achievement.record('dodge');
        if(game.boss){game.boss.dodges=(game.boss.dodges||0)+1;if(game.boss.dodges%3===0){game.boss.reaction=['NICE FOOTWORK!','HOW DID YOU DODGE THAT?','GRR… TOO QUICK!'][Math.floor(random()*3)];game.boss.reactionTime=1.2;}}
      }
      const hitbox = {x:obstacle.x+3,y:obstacle.y+3,w:obstacle.w-6,h:obstacle.h-5};
      if (!obstacle.hit && intersects(box,hitbox)) {
        obstacle.touched=true;
        hurt(obstacle);
        if (game.mode !== 'running') return;
      }
    }
    game.obstacles = game.obstacles.filter(o=>(o.recall||o.x+o.w>0) && (!o.fromLeft||o.x<W+50) && (o.stage!=='return'||o.x<W) && o.y<H+50 && !o.hit && (o.ttl===undefined||o.ttl>0));
    for (const pickup of game.pickups) {
      pickup.x -= dx;
      const radius=Math.min(140,game.perks.magnet*35);
      if(radius>0 && Math.hypot(pickup.x-box.x,pickup.y-box.y)<radius) {
        pickup.x+=(box.x-pickup.x)*Math.min(1,dt*14);pickup.y+=(box.y-pickup.y)*Math.min(1,dt*14);
      }
      if (intersects(box,pickup)) {
        collectPickup(pickup);
        if(game.mode!=='running')return;
      }
    }
    game.pickups=game.pickups.filter(p=>p.x+p.w>0&&!p.collected);
    if(game.trail&&!game.pickups.some(p=>p.trailId===game.trail.id)){toast('TRAIL ENDED · KEEP THE FOSSILS YOU FOUND');game.trail=null;}
    for (const p of game.particles) { p.x+=p.vx*dt-dx/2; p.y+=p.vy*dt; p.vy+=300*dt; p.life-=dt; }
    game.particles=game.particles.filter(p=>p.life>0);
    synchronizeBiome();
    achievement.record('tick',{dt,score:score(),speed:game.speed,fastFall:duckKey&&!dino.grounded&&dino.vy>0&&game.perks.fall>0});
  }
  function updateHUD() {
    const theme = activeTheme();
    $('biome').textContent = `${String(game.biome+1).padStart(2,'0')} / ${theme.name}`;
    $('score').textContent = game.assisted?`TRAINING   ${pad(score())}`:`HI ${pad(Math.max(high,score()))}   ${pad(score())}`;
    $('status').textContent = {ready:'READY TO RUN',running:game.challenge?`SURVIVE · ${game.challenge.collected} FOSSILS · ${Math.max(0,Math.ceil(game.challenge.duration-game.challenge.age))}s`:game.boss?`BOSS ${game.boss.level} / ${BOSSES.length}`:game.completed?'ENDLESS FRONTIER':'ON THE MOVE',paused:'TAKING A BREATHER',over:'UNTIL NEXT TIME',won:'GAUNTLET COMPLETE',revive:'AN EGG CAN BRING YOU BACK',upgrade:'CHOOSE A PERK','practice-death':'PRACTICE CHECKPOINT','portal-offer':'AN OPTIONAL DETOUR'}[game.mode];
    const effects = [];
    if (game.shield>0) effects.push(`SHIELD ${Math.ceil(game.shield)}s`);
    if(multiplier()===2)effects.push('2× MUTATION POINTS');
    if (game.slow>0) effects.push(`SLOW ${Math.ceil(game.slow)}s`);
    if(game.trail)effects.push(`TRAIL ${game.trail.collected}/${game.trail.total} · +100`);
    if(game.challenge)effects.push(`SURVIVE · LOOT ${game.challenge.collected} · ${Math.max(0,Math.ceil(game.challenge.duration-game.challenge.age))}s`);
    const terrainWarning=game.terrain.find(t=>t.stage==='warning'&&t.x<W);
    if(terrainWarning)effects.push(`${terrainWarning.kind==='meteor'?'IMPACT':'ERUPTION'} IN ${terrainWarning.timer.toFixed(1)}s`);
    $('effect').textContent = effects.join(' / ') || (borderDistance()<=BORDER_APPROACH?`NEXT: ${getBiome(game.biome+1).name}`:game.event?.name||'');
    $('route-status').textContent = game.routeActive?'UPPER ROUTE':'';
    $('eggs').textContent=`${2-game.revivesUsed} / 2 revives left`;
    $('fragments').textContent=`${game.fragments} / ${game.perks.finder?2:3} pieces`;
    $('fragment-meter').max=game.perks.finder?2:3;$('fragment-meter').value=game.fragments;
    $('fossils').textContent=`${game.runFossils} collected`;
    $('fossil-value').textContent=`+${(25+game.perks.fortune*10+(game.routeActive?game.perks.route*15:0))*multiplier()} points each`;
    $('shield-timer').textContent=game.shield>0?`${game.wardActive?'Boss fight':game.shield.toFixed(1)+'s'} · 1 hit`:'No shield';
    $('slow-timer').textContent=game.slow>0?`${game.slow.toFixed(1)}s left`:'Not active';
    $('next-boss').textContent=game.completed?'ALL TEN BOSSES BEATEN':`NEXT BOSS ${game.nextBoss.toLocaleString('en-US')}`;
    const owned=UPGRADES.filter(p=>game.perks[p.id]).map(p=>`${p.name}${p.max>1?' Lv '+game.perks[p.id]:''}: ${p.summary(game.perks[p.id])}`).join('  •  ');
    const label=owned||'None yet — choose an upgrade after bosses 2, 4, 6, and 8.';
    if($('active-upgrades').textContent!==label)$('active-upgrades').textContent=label;
    const upgradeBar=document.querySelector('.equipped-upgrades');if(upgradeBar)upgradeBar.hidden=!owned;
    const stage=activeStage();$('boost').hidden=!stage||!['ship','jetpack'].includes(stage.mode);$('stage-info').textContent=stage?`${stage.mode.toUpperCase()} · ${Math.round(stage.speed)} PX/S · ${game.boss?'BOSS ARENA':'2× POINTS'}`:'';
    if($('phase')){$('phase').textContent=game.phaseCooldown>0?`X · PHASE ${Math.ceil(game.phaseCooldown)}s`:'X · PHASE READY';$('phase').disabled=game.mode!=='running'||Boolean(activeStage())||game.phaseCooldown>0;}
    document.querySelector('.game-shell').style.setProperty('--game-bg',theme.bg);
    $('run-mode').value=game.assistMode;
    $('training-status').textContent=game.assistMode==='normal'?(game.assisted?'ASSISTED RUN':'NORMAL RUN'):`${game.assistMode==='noclip'?'NO CLIP':'PRACTICE'} · ${game.trainingDeaths} ${game.trainingDeaths===1?'DEATH':'DEATHS'}`;
    $('mode-help').textContent=game.assistMode==='noclip'?'Pass through danger. Red tint counts each would-be death.':game.assistMode==='practice'?'Unlimited continues. C saves a manual checkpoint; retry preserves the map.':game.assisted?'Restart in Normal for saved scores and achievements.':'Normal runs save scores, museum finds, and achievements.';
    $('checkpoint').hidden=game.assistMode!=='practice';$('checkpoint').disabled=game.mode!=='running';
    $('death-flash').style.opacity=String(Math.min(.28,game.deathFlash*.56));
    $('portal-risk').textContent=game.assistMode==='noclip'?'No clip active: hazards count and flash red; this trial cannot end your run.':game.assistMode==='practice'?'Practice active: continue here or retry a checkpoint after any death.':'Death here ends your entire run. Eggs and shields cannot save you.';
  }
  function pixelDino(x,y,scale=2,duck=false,animate=true) {
    const pixel=Math.max(1,Math.floor(scale));
    const sprite=duck?DUCK_DINO:DINO;
    ctx.save();ctx.translate(Math.round(x)+(duck?2:4),Math.round(y)+45-sprite.length*pixel);
    const step = Math.floor(game.time*11)%2;
    sprite.forEach((row,r)=> {
      for (let c=0;c<row.length;c++) {
        if (row[c]!=='1') continue;
        if (r>=(duck?8:15) && animate && dino.grounded && game.mode==='running' &&
          ((step===0 && c>=(duck?11:9))||(step===1 && c<(duck?10:8)))) continue;
        ctx.fillRect(c*pixel,r*pixel,pixel,pixel);
      }
    });ctx.restore();
  }
  function cloud(x,y) {
    ctx.beginPath();ctx.moveTo(x,y+10);ctx.lineTo(x+8,y+10);ctx.lineTo(x+8,y+5);
    ctx.lineTo(x+20,y+5);ctx.lineTo(x+20,y);ctx.lineTo(x+35,y);ctx.lineTo(x+35,y+7);
    ctx.lineTo(x+45,y+7);ctx.lineTo(x+45,y+12);ctx.lineTo(x+58,y+12);ctx.lineTo(x+58,y+17);ctx.lineTo(x,y+17);ctx.stroke();
  }
  function scenery(theme) {
    ctx.strokeStyle=theme.faint;ctx.lineWidth=1;
    if(!['dune','snow','volcano'].includes(theme.scenery)) {
      regionScenery(theme);
      return;
    }
    for (let i=0;i<5;i++) {
      const x=((i*270-game.distance*.12)%1350+1350)%1350-150;
      const height=35+i%3*12;
      ctx.beginPath();ctx.moveTo(x,GROUND);
      if(theme.scenery==='dune') {
        ctx.quadraticCurveTo(x+65,GROUND-height*1.5,x+145,GROUND);
      } else if(theme.scenery==='snow') {
        ctx.lineTo(x+70,GROUND-height-45);ctx.lineTo(x+155,GROUND);
      } else {
        ctx.lineTo(x+45,GROUND-height-35);ctx.lineTo(x+75,GROUND-height-35);ctx.lineTo(x+125,GROUND);
      }ctx.stroke();
      if(theme.scenery==='snow') {
        ctx.beginPath();ctx.moveTo(x+49,GROUND-height-18);ctx.lineTo(x+63,GROUND-height-12);
        ctx.lineTo(x+70,GROUND-height-23);ctx.lineTo(x+84,GROUND-height-13);ctx.stroke();
        ctx.fillStyle=theme.faint;
        for(let j=0;j<3;j++) {
          const tx=x+155+j*28,ty=GROUND-20-j%2*13;
          ctx.beginPath();ctx.moveTo(tx,ty-28);ctx.lineTo(tx-12,ty);ctx.lineTo(tx+12,ty);ctx.closePath();ctx.fill();ctx.fillRect(tx-2,ty,4,20);
        }
      } else if(theme.scenery==='volcano') {
        ctx.beginPath();ctx.moveTo(x+52,GROUND-height-30);ctx.lineTo(x+60,GROUND-height-13);ctx.lineTo(x+68,GROUND-height-28);ctx.stroke();
        ctx.fillStyle=theme.faint;
        for(let j=0;j<4;j++)ctx.fillRect(x+56+j%2*8,GROUND-height-48-j*12,10+j*3,5);
      }
    }
    for (let i=0;i<4;i++) cloud(((i*300+180-game.distance*.07)%1250+1250)%1250-80,48+(i%3)*24);
    if (theme.scenery==='snow' && !reducedMotion) {
      ctx.fillStyle=theme.faint;
      for(let i=0;i<28;i++) ctx.fillRect((i*97+game.time*14)%W,(i*53+game.time*23)%GROUND,2,2);
    } else if(theme.scenery==='volcano' && !reducedMotion) {
      ctx.fillStyle=theme.faint;
      for(let i=0;i<18;i++)ctx.fillRect((i*89-game.time*13+W*20)%W,GROUND-(i*43+game.time*20)%GROUND,2,3);
    }
  }
  function regionScenery(theme) {
    const kind=theme.scenery;
    ctx.fillStyle=theme.faint;ctx.strokeStyle=theme.faint;
    for(let i=0;i<9;i++) {
      const x=((i*173-game.distance*.17+(theme.variant||0)*23)%1557+1557)%1557-120;
      const h=50+(i*31)%80,y=GROUND-h;
      if(['forest','jungle','swamp','meadow'].includes(kind)) {
        ctx.fillRect(x+19,y+15,5,h-15);
        if(kind==='jungle') {
          ctx.beginPath();ctx.ellipse(x+22,y+8,40,20,0,0,Math.PI*2);ctx.fill();
          ctx.beginPath();ctx.moveTo(x+49,y+16);ctx.quadraticCurveTo(x+68,y+70,x+38,y+82);ctx.stroke();
        } else if(kind==='swamp') {
          ctx.fillRect(x-10,y,65,12);ctx.fillRect(x-5,y+10,3,50);ctx.fillRect(x+42,y+10,3,40);
          ctx.beginPath();ctx.moveTo(x-15,GROUND-5);ctx.lineTo(x+65,GROUND-5);ctx.stroke();
        } else if(kind==='meadow') {
          ctx.beginPath();ctx.moveTo(x-70,GROUND);ctx.quadraticCurveTo(x+30,y+25,x+150,GROUND);ctx.stroke();
          ctx.fillRect(x+15,y+2,12,12);
        } else {
          ctx.beginPath();ctx.moveTo(x+22,y-15);ctx.lineTo(x-12,y+48);ctx.lineTo(x+56,y+48);ctx.closePath();ctx.fill();
        }
      } else if(kind==='coast') {
        for(let j=0;j<3;j++) {
          ctx.beginPath();ctx.moveTo(x-30,GROUND-12-j*15);ctx.quadraticCurveTo(x+20,GROUND-28-j*15,x+85,GROUND-12-j*15);ctx.stroke();
        }
        ctx.beginPath();ctx.moveTo(x+20,GROUND);ctx.quadraticCurveTo(x+50,y,x+28,y-10);ctx.moveTo(x+28,y-10);ctx.lineTo(x-5,y-3);ctx.moveTo(x+28,y-10);ctx.lineTo(x+62,y-8);ctx.stroke();
      } else if(kind==='canyon'||kind==='ruins'||kind==='city') {
        const width=kind==='city'?64:kind==='ruins'?25:95;
        ctx.fillRect(x,y,width,h);
        ctx.fillStyle=theme.bg;
        if(kind==='city')for(let r=0;r<4;r++)for(let c=0;c<3;c++)ctx.fillRect(x+9+c*17,y+10+r*22,7,9);
        else if(kind==='ruins')ctx.fillRect(x+9,y+7,4,h-7);
        else for(let r=0;r<3;r++)ctx.fillRect(x,y+20+r*20,width,2);
        ctx.fillStyle=theme.faint;
        if(kind==='ruins') {ctx.fillRect(x-8,y-6,41,9);ctx.fillRect(x-6,GROUND-8,38,8);}
      } else if(kind==='cave') {
        ctx.beginPath();ctx.moveTo(x-15,0);ctx.lineTo(x+16,h);ctx.lineTo(x+42,0);ctx.closePath();ctx.fill();
        ctx.beginPath();ctx.moveTo(x,GROUND);ctx.lineTo(x+18,GROUND-h*.6);ctx.lineTo(x+35,GROUND);ctx.closePath();ctx.fill();
      } else if(kind==='fungus') {
        ctx.fillRect(x+15,y+20,12,h-20);
        ctx.beginPath();ctx.ellipse(x+21,y+20,42,22,0,Math.PI,Math.PI*2);ctx.fill();
        ctx.fillStyle=theme.bg;ctx.fillRect(x+4,y+9,7,5);ctx.fillRect(x+29,y+7,5,5);ctx.fillStyle=theme.faint;
      } else if(kind==='space') {
        ctx.fillRect((x+W)%W,25+i*17,2+i%2,2+i%2);
        ctx.beginPath();ctx.ellipse(x+28,GROUND-10,30,8,0,0,Math.PI*2);ctx.stroke();
      }
    }
    if(kind==='space') {
      ctx.beginPath();ctx.arc(W*.7,80,29,0,Math.PI*2);ctx.stroke();
      ctx.beginPath();ctx.ellipse(W*.7,80,52,9,-.35,0,Math.PI*2);ctx.stroke();
    } else for(let i=0;i<3;i++)cloud(((i*350-game.distance*.06)%1200+1200)%1200,32+i*17);
    if(!reducedMotion && ['swamp','jungle','fungus','cave'].includes(kind)) {
      for(let i=0;i<16;i++)ctx.fillRect((i*97+game.time*7)%W,50+(i*43+Math.sin(game.time+i)*8)%220,2,2);
    }
  }
  function themedObstacle(o,theme) {
    const x=Math.round(o.x),y=Math.round(o.y);
    if(['thorn','vine','bamboo','reed'].includes(o.type)) {
      for(let i=0;i<3;i++) {
        const tx=x+4+i*(o.w-8)/3,top=y+i%2*8;
        ctx.fillRect(tx,top,4,o.h-(top-y));
        ctx.beginPath();ctx.moveTo(tx,top+15);ctx.lineTo(tx-7,top+8);ctx.moveTo(tx+4,top+23);ctx.lineTo(tx+10,top+13);ctx.stroke();
      }return;
    }
    if(['mushroom','spore','coral','shell','urn','crater'].includes(o.type)) {
      ctx.beginPath();ctx.ellipse(x+o.w/2,y+o.h*.4,o.w/2,o.h*.4,0,Math.PI,Math.PI*2);ctx.fill();
      ctx.fillRect(x+o.w*.25,y+o.h*.4,o.w*.5,o.h*.6);
      ctx.fillStyle=theme.bg;ctx.fillRect(x+o.w*.35,y+5,4,4);ctx.fillStyle=theme.ink;return;
    }
    if(['log','driftwood','gear','meteor'].includes(o.type)) {
      ctx.beginPath();ctx.ellipse(x+o.w/2,y+o.h/2,o.w/2,o.h/2,0,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle=theme.bg;ctx.strokeRect(x+8,y+8,Math.max(3,o.w-16),Math.max(3,o.h-16));ctx.strokeStyle=theme.ink;
      if(o.type==='gear')for(let i=0;i<3;i++)ctx.fillRect(x+i*(o.w-5)/2,y-3,5,8);
      return;
    }
    if(['stump','pillar','ruin','crate','barrier'].includes(o.type)) {
      ctx.fillRect(x+3,y+4,o.w-6,o.h-4);ctx.fillRect(x,y,o.w,6);
      ctx.strokeStyle=theme.bg;ctx.beginPath();ctx.moveTo(x+9,y+9);ctx.lineTo(x+o.w-9,y+o.h-4);ctx.stroke();ctx.strokeStyle=theme.ink;return;
    }
    if(o.type==='cactus') {cactus(o);return;}
    if(o.type==='cactus-cluster') {
      cactus({...o,w:o.w*.5,h:o.h*.8,y:o.y+o.h*.2});cactus({...o,x:o.x+o.w*.48,w:o.w*.5});return;
    }
    if(o.type==='dry-bush') {
      ctx.fillRect(x+o.w/2-2,y+o.h*.4,4,o.h*.6);
      ctx.beginPath();ctx.moveTo(x,y+o.h*.2);ctx.lineTo(x+o.w/2,y+o.h*.75);ctx.lineTo(x+o.w,y);ctx.moveTo(x+o.w*.2,y);ctx.lineTo(x+o.w*.7,y+o.h);ctx.stroke();return;
    }
    if(o.type==='frozen-stump') {
      ctx.fillRect(x+4,y+4,o.w-8,o.h-4);ctx.fillStyle=theme.bg;
      ctx.fillRect(x+10,y+10,3,o.h-17);ctx.fillStyle=theme.ink;ctx.fillRect(x,y,o.w,5);return;
    }
    if(o.type==='ice'||o.type==='basalt'||o.type==='crystal') {
      ctx.beginPath();ctx.moveTo(x,y+o.h);ctx.lineTo(x+o.w*.23,y+5);ctx.lineTo(x+o.w*.5,y);
      ctx.lineTo(x+o.w*.73,y+8);ctx.lineTo(x+o.w,y+o.h);ctx.closePath();ctx.fill();
      ctx.strokeStyle=theme.bg;ctx.beginPath();ctx.moveTo(x+o.w*.5,y+8);ctx.lineTo(x+o.w*.35,y+o.h-7);ctx.stroke();ctx.strokeStyle=theme.ink;return;
    }
    ctx.fillRect(x+5,y,o.w-10,o.h);ctx.fillRect(x,y+7,o.w,o.h-7);
    ctx.fillStyle=theme.bg;
    if(o.type==='lava-rock'||o.type==='vents') {
      ctx.beginPath();ctx.moveTo(x+o.w*.5,y);ctx.lineTo(x+o.w*.4,y+o.h*.4);ctx.lineTo(x+o.w*.65,y+o.h*.7);ctx.lineTo(x+o.w*.5,y+o.h);ctx.strokeStyle=theme.bg;ctx.stroke();ctx.strokeStyle=theme.ink;
      if(o.type==='vents') {ctx.fillStyle=theme.faint;ctx.fillRect(x+8,y-9,5,5);ctx.fillRect(x+13,y-20,8,4);}
    } else {ctx.fillRect(x+4,y,o.w-8,5);ctx.fillRect(x+9,y+12,4,4);}
    ctx.fillStyle=theme.ink;
  }
  function triceratops(x,y,w=88,h=55) {
    ctx.save();ctx.translate(Math.round(x),Math.round(y));
    ctx.fillRect(w*.28,h*.2,w*.65,h*.55);ctx.fillRect(w*.08,0,w*.28,h*.7);
    ctx.fillRect(0,h*.25,w*.35,h*.35);ctx.fillRect(w*.3,h*.6,w*.14,h*.4);ctx.fillRect(w*.76,h*.6,w*.14,h*.4);
    ctx.beginPath();ctx.moveTo(w*.1,h*.1);ctx.lineTo(-12,-8);ctx.lineTo(w*.2,h*.3);ctx.closePath();ctx.fill();
    ctx.fillStyle=activeTheme().bg;ctx.fillRect(w*.12,h*.3,3,3);ctx.restore();
  }
  function drawBoss(boss) {
    const x=boss.x+(1-Math.min(1,boss.age/1.4))*180;
    ctx.save();
    if(boss.level===1)bird({x,y:boss.y+Math.sin(game.time*2)*10},true);
    else if(boss.level===2){triceratops(x,GROUND-65,95,65);ctx.fillRect(x-8,GROUND-57,23,10);ctx.strokeRect(x-13,GROUND-61,13,18);}
    else if(boss.level===3) {
      ctx.translate(x+70,GROUND);ctx.scale(-1,1);pixelDino(0,-45,4,false,false);
    } else if(boss.level===4) {
      // A coiled stone dragon channels its attacks into the arena.
      const y=GROUND-105;
      ctx.fillRect(x+25,y+30,65,60);ctx.fillRect(x+65,y-8,23,65);
      ctx.fillRect(x-8,y,80,25);ctx.fillRect(x-17,y+10,20,10);
      ctx.fillRect(x+13,y-17,8,22);ctx.fillRect(x+40,y-23,8,28);
      ctx.fillRect(x+10,y+80,70,12);ctx.fillRect(x+85,y+60,22,9);
      ctx.fillStyle=activeTheme().bg;ctx.fillRect(x+7,y+6,5,5);ctx.fillRect(x+39,y+48,31,27);
    } else {
      ctx.globalAlpha=.7;ctx.translate(x+70,GROUND);ctx.scale(-1,1);pixelDino(0,-45,3,false,false);
      ctx.globalAlpha=.2;pixelDino(12,-43,3,false,false);
    }ctx.restore();
  }
  function drawHazard(o,theme) {
    if(o.type==='mirror'){
      ctx.save();ctx.globalAlpha=.75;ctx.strokeRect(o.x,o.y,o.w,o.h);ctx.fillRect(o.x+5,o.y+5,8,12);
      ctx.globalAlpha=.25;ctx.fillRect(o.x+(o.fromLeft?-16:o.w+3),o.y+5,13,12);ctx.restore();return;
    }
    if(o.type==='terrain'){
      const floor=o.kind==='lava'||o.kind==='rift-floor';
      ctx.save();ctx.fillStyle=floor?'#b7663d':'#66616c';ctx.globalAlpha=.22;
      ctx.fillRect(o.x,o.y,o.w,o.h);ctx.globalAlpha=.8;
      const edge=floor?o.y:o.h;
      for(let x=0;x<W;x+=24)ctx.fillRect(x,edge+(floor?0:-6),16,6);
      ctx.restore();return;
    }
    if(o.type==='laser'){drawLaser(o,false);return;}
    if(o.type==='siege-rock'){
      if(o.recall){ctx.save();ctx.strokeStyle='#a5754f';ctx.setLineDash([4,7]);ctx.beginPath();ctx.moveTo(o.x+o.w/2,o.y+o.h/2);ctx.lineTo(game.boss?.x??W,GROUND-65);ctx.stroke();ctx.restore();}
      for(let row=0;row<o.h;row+=22){ctx.fillRect(Math.round(o.x)+(Math.floor(row/22)%2)*3,Math.round(o.y+row),o.w-3,Math.min(20,o.h-row));}
      ctx.strokeStyle=theme.bg;ctx.beginPath();ctx.moveTo(o.x+12,o.y+8);ctx.lineTo(o.x+o.w-8,o.y+o.h-8);ctx.stroke();ctx.strokeStyle=theme.ink;return;
    }
    if(o.type==='runner') {pixelDino(o.x,o.y-13,2,false,false);return;}
    if(o.type==='bird') {bird(o);return;}
    if(o.type==='charge') {triceratops(o.x,o.y,o.w,o.h);return;}
    if(o.type==='echo') {
      ctx.save();ctx.globalAlpha=.65;pixelDino(o.x,o.y-7,2,false,false);ctx.restore();return;
    }
    if(['ball','fireball','rain','boulder'].includes(o.type)) {
      ctx.beginPath();ctx.arc(o.x+o.w/2,o.y+o.h/2,o.w/2-1,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=theme.bg;ctx.fillRect(o.x+o.w*.3,o.y+o.h*.25,4,4);ctx.fillStyle=theme.ink;
      if(o.type==='fireball') {ctx.fillRect(o.x+o.w-2,o.y+5,12,4);ctx.fillRect(o.x+o.w-2,o.y+15,18,3);}
      if(o.type==='rain')ctx.fillRect(o.x+9,o.y-12,5,18);
      return;
    }
    themedObstacle(o,theme);
  }
  function drawLaser(laser,warning) {
    ctx.save();
    const y=laser.laneY??laser.y,h=laser.height??laser.h;
    ctx.fillStyle=warning?'#ad785a':'#c95e48';ctx.globalAlpha=warning ? .06 : .18;ctx.fillRect(0,y,W,h);
    ctx.globalAlpha=warning ? .6 : .9;ctx.strokeStyle=warning?'#a87555':'#c95e48';ctx.lineWidth=warning?1:2;
    ctx.setLineDash(warning?[7,7]:[]);ctx.beginPath();ctx.moveTo(0,y+.5);ctx.lineTo(W,y+.5);ctx.stroke();
    if(!warning){ctx.globalAlpha=.6;for(let line=y+7;line<y+h;line+=12){ctx.fillRect(0,line,W,2);}}
    ctx.setLineDash([]);ctx.restore();
  }
  function cactus(o) {
    const s=o.h/48;
    ctx.save();ctx.translate(Math.round(o.x),Math.round(o.y));ctx.scale(o.w/24,s);
    ctx.fillRect(9,0,7,48);ctx.fillRect(1,13,5,18);ctx.fillRect(1,27,11,5);
    ctx.fillRect(19,7,5,18);ctx.fillRect(14,21,10,5);ctx.restore();
  }
  function bird(o,big=false) {
    const flap=Math.floor(game.time*6)%2;
    ctx.save();ctx.translate(Math.round(o.x),Math.round(o.y));
    if(big)ctx.scale(2.1,2.1);
    ctx.fillRect(12,10,20,11);ctx.fillRect(29,7,8,11);ctx.fillRect(35,12,10,4);ctx.fillRect(2,14,13,4);
    if(flap){ctx.fillRect(17,-5,6,19);ctx.fillRect(13,-10,6,10);}else{ctx.fillRect(17,17,6,15);ctx.fillRect(13,26,6,10);}
    ctx.restore();
  }
  function drawPickup(p) {
    ctx.save();ctx.translate(Math.round(p.x+p.w/2),Math.round(p.y+p.h/2));
    ctx.strokeStyle=activeTheme().ink;ctx.lineWidth=2;
    if(p.type==='portal'){
      ctx.strokeStyle='#937caa';ctx.strokeRect(-13,-18,26,36);ctx.strokeRect(-8,-12,16,25);ctx.fillRect(-2,-3,4,6);
    } else if(p.type==='fragment') {
      ctx.beginPath();ctx.moveTo(-8,9);ctx.lineTo(-10,-2);ctx.lineTo(-5,-8);ctx.lineTo(0,-3);ctx.lineTo(5,-8);ctx.lineTo(10,-2);ctx.lineTo(8,9);ctx.closePath();ctx.stroke();
      ctx.fillRect(-2,1,4,4);
    } else if(p.type==='fossil'||p.type==='portal-token') {
      ctx.beginPath();ctx.arc(-7,-4,4,0,Math.PI*2);ctx.arc(7,4,4,0,Math.PI*2);ctx.moveTo(-5,-2);ctx.lineTo(5,2);ctx.stroke();
    } else if(p.type==='bonus') {
      ctx.beginPath();ctx.moveTo(0,-9);ctx.lineTo(8,0);ctx.lineTo(0,9);ctx.lineTo(-8,0);ctx.closePath();ctx.stroke();
      ctx.fillRect(-2,-2,4,4);
    } else {
      ctx.strokeRect(-13,-13,26,26);
      if(p.type==='shield') {
        ctx.beginPath();ctx.moveTo(-6,-7);ctx.lineTo(6,-7);ctx.lineTo(6,2);ctx.lineTo(0,8);ctx.lineTo(-6,2);ctx.closePath();ctx.stroke();
      } else {
        ctx.beginPath();ctx.arc(0,0,8,0,Math.PI*2);ctx.moveTo(0,-5);ctx.lineTo(0,0);ctx.lineTo(4,2);ctx.stroke();
      }
    }ctx.restore();
  }
  function draw() {
    const theme=activeTheme();
    const stage=activeStage();
    if(stage){
      stage.draw(ctx,theme,(...args)=>pixelDino(...args));
      ctx.fillStyle=theme.ink;ctx.textAlign='right';ctx.font='bold 11px Consolas,monospace';
      const b=game.boss;
      ctx.fillText(b?`${b.level}/10 · ${b.name}`:`2× POINTS · ${Math.round(stage.speed)} PX/S`,W-18,47);
      if(!b&&stage.age<1.1){ctx.font='bold 12px Consolas,monospace';ctx.fillText(theme.name,W-18,83,W-45);}
      const fraction=b?1-b.age/b.duration:game.challenge?1-game.challenge.age/game.challenge.duration:1-(score()%BIOME_POINTS)/BIOME_POINTS;
      ctx.fillStyle=theme.faint;ctx.fillRect(W-175,58,155,4);ctx.fillStyle=theme.ink;ctx.fillRect(W-175,58,155*Math.max(0,fraction),4);
      if(b?.engine){
        ctx.save();ctx.translate(W-78,95);ctx.strokeStyle=theme.ink;ctx.lineWidth=3;
        const rank=b.level-5;
        if(rank===1){ctx.rotate(game.time*.7);ctx.strokeRect(-19,-19,38,38);ctx.strokeRect(-12,-12,24,24);}
        if(rank===2){ctx.fillRect(-25,-19,50,14);ctx.fillRect(-20,13,40,8);ctx.fillRect(-25,-5,7,25);ctx.fillRect(18,-5,7,25);}
        if(rank===3){ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-35,-20);ctx.lineTo(-25,18);ctx.lineTo(0,5);ctx.lineTo(25,18);ctx.lineTo(35,-20);ctx.closePath();ctx.stroke();}
        if(rank===4){ctx.strokeRect(-27,-12,54,24);ctx.fillRect(-40,-6,12,12);ctx.fillRect(27,-3,19,6);}
        if(rank===5){ctx.strokeRect(-24,-24,48,48);ctx.rotate(game.time*.5);ctx.strokeRect(-15,-15,30,30);}
        ctx.restore();
      }
      if(celebrationCtx)celebrationCtx.clearRect(0,0,W,H);
      return;
    }
    if(game.biomeFade>0){
      const previous=worldBiome(game.previousBiome);ctx.fillStyle=previous.bg;ctx.fillRect(0,0,W,H);scenery(previous);
      ctx.save();ctx.globalAlpha=1-game.biomeFade;ctx.fillStyle=theme.bg;ctx.fillRect(0,0,W,H);scenery(theme);ctx.restore();
    }else{ctx.fillStyle=theme.bg;ctx.fillRect(0,0,W,H);scenery(theme);}
    if(theme.mutation!==undefined)drawMutation(theme);
    if(game.event&&!reducedMotion) {
      ctx.fillStyle=theme.faint;ctx.strokeStyle=theme.faint;
      for(let i=0;i<28;i++) {
        const x=((i*97-game.time*(game.event.kind==='blizzard'?160:35))%W+W)%W;
        const y=(i*43+game.time*40)%GROUND;
        if(game.event.kind==='meteor') {ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+10,y-16);ctx.stroke();}
        else ctx.fillRect(x,y,game.event.kind==='fireflies'?3:2,2);
      }
    }
    ctx.fillStyle=theme.ink;ctx.strokeStyle=theme.ink;ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(0,GROUND+.5);ctx.lineTo(W,GROUND+.5);ctx.stroke();
    for(let i=0;i<50;i++) {
      const x=((i*73-game.distance)%1100+1100)%1100;
      ctx.fillRect(x,GROUND+7+(i*13)%23,2+i%5,1);
    }
    drawTerrain(theme);
    for(const p of game.platforms) {
      ctx.globalAlpha=p.crumble!==undefined && p.crumble!==null?Math.max(.2,p.crumble/.85):1;
      ctx.setLineDash([5,4]);ctx.strokeRect(Math.round(p.x),p.y,p.w,5);ctx.setLineDash([]);
      ctx.fillStyle=theme.faint;ctx.fillRect(p.x,p.y+6,p.w,3);ctx.fillStyle=theme.ink;
      if(p.stairs){
        ctx.fillStyle=theme.faint;ctx.fillRect(p.x,p.y+8,p.w,GROUND-p.y-8);ctx.fillStyle=theme.ink;ctx.fillRect(p.x,p.y,p.w,5);
        ctx.strokeStyle=theme.bg;for(let y=p.y+17;y<GROUND;y+=18){ctx.beginPath();ctx.moveTo(p.x,y);ctx.lineTo(p.x+p.w,y);ctx.stroke();}ctx.strokeStyle=theme.ink;
        ctx.font='10px Consolas,monospace';ctx.textAlign='left';
        if(p.step===0)ctx.fillText('HIDDEN STAIRS ↑',p.x,p.y-16);
        if(p.step===4)ctx.fillText(discovery.mutations[p.destination].name,p.x,p.y-48);
      }
      if(p.fixed){ctx.fillRect(p.x,p.y,p.w,8);for(let x=p.x+12;x<p.x+p.w;x+=25)ctx.clearRect(x,p.y+2,2,4);}
    }ctx.globalAlpha=1;
    for(const o of game.obstacles){const ownTheme=worldBiome(o.biome??game.biome);ctx.fillStyle=ownTheme.ink;ctx.strokeStyle=ownTheme.ink;drawHazard(o,ownTheme);}
    ctx.fillStyle=theme.ink;ctx.strokeStyle=theme.ink;
    for(const p of game.pickups) drawPickup(p);
    if(game.boss) {
      const boss=game.boss;
      drawBoss(boss);
      if(boss.reactionTime>0){ctx.save();ctx.textAlign='right';ctx.font='10px Consolas,monospace';ctx.fillStyle=theme.ink;ctx.fillText(boss.reaction,W-24,85);ctx.restore();}
      if(boss.level===4){ctx.save();ctx.globalAlpha=Math.min(.8,boss.age/boss.duration);ctx.strokeStyle=theme.bg;for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(boss.x+30+i*12,GROUND-65);ctx.lineTo(boss.x+24+i*12,GROUND-48);ctx.stroke();}ctx.restore();}
      ctx.font='10px Consolas,monospace';ctx.textAlign='right';
      ctx.fillText(`${boss.level}/${BOSSES.length} · ${boss.name}`,W-20,22);
      ctx.font='9px Consolas,monospace';ctx.fillText(boss.hint,W-20,54);
      ctx.fillStyle=theme.faint;ctx.fillRect(W-170,38,140,3);
      ctx.fillStyle=theme.ink;ctx.fillRect(W-170,38,140*(1-boss.age/boss.duration),3);
      const warning=game.warnings[0];
      if(warning) {
        if(warning.type==='laser'){
          if(warning.scanning&&warning.delay>.7)drawLaser({...warning,laneY:Math.max(12,Math.min(GROUND-15,warning.laneY+Math.sin(game.time*9)*22)),height:5},true);
          else drawLaser(warning,true);
        }
        if(warning.type==='terrain'){
          ctx.save();ctx.fillStyle=warning.kind==='ash'?'#66616c':'#b7663d';ctx.globalAlpha=.08;
          if(warning.kind==='ash')ctx.fillRect(0,0,W,GROUND-26);
          else{
            ctx.fillRect(0,warning.ledgeY+12,W,H-warning.ledgeY-12);
            if(warning.kind==='cage')ctx.fillRect(0,0,W,warning.ledgeY-100);
          }ctx.restore();
          if(warning.kind!=='ash'){ctx.strokeRect(warning.ledgeX,warning.ledgeY,warning.ledgeW,8);ctx.font='9px Consolas,monospace';ctx.textAlign='left';ctx.fillText(warning.kind==='vault'?'DOUBLE ↑ ↑':'SINGLE ↑',warning.ledgeX,warning.ledgeY-10);}
        }
        ctx.textAlign='center';ctx.font='bold 12px Consolas,monospace';
        ctx.fillText(`! ${warning.label} !`,W/2,145);
        const lane=warning.laneY??(warning.high?GROUND-42:GROUND-12);
        ctx.setLineDash([5,8]);ctx.beginPath();ctx.moveTo(W-190,lane);ctx.lineTo(W,lane);ctx.stroke();ctx.setLineDash([]);
      }
    }
    if(game.travelerWaiting||game.mode==='portal-offer'){
      ctx.save();ctx.fillStyle=theme.ink;pixelDino(dino.x+150,GROUND-45,2,false,false);
      ctx.fillStyle='#a07b59';ctx.fillRect(dino.x+159,GROUND-28,32,5);ctx.fillRect(dino.x+180,GROUND-26,5,13);
      ctx.strokeStyle='#937caa';ctx.lineWidth=3;ctx.strokeRect(dino.x+215,GROUND-70,35,70);
      ctx.font='10px Consolas,monospace';ctx.fillStyle=theme.ink;ctx.textAlign='left';ctx.fillText('A DETOUR?',dino.x+138,GROUND-65);ctx.restore();
    }
    if(game.time<1||game.invincible<=0||Math.floor(game.time*14)%2===0||game.mode!=='running')pixelDino(dino.x,dino.y,2,dino.duck);
    if(game.phaseTrail>0){ctx.save();ctx.globalAlpha=.22;pixelDino(dino.x-22,dino.y,2,dino.duck,false);ctx.globalAlpha=.1;pixelDino(dino.x-43,dino.y,2,dino.duck,false);ctx.restore();}
    if(game.shield>0) {
      ctx.setLineDash([4,3]);ctx.strokeRect(dino.x-7,dino.y-6,59,58);ctx.setLineDash([]);
    }
    if(!dino.grounded && dino.jumps===1) {ctx.fillStyle=theme.faint;ctx.fillRect(dino.x+17,dino.y-12,5,5);}
    if(game.slow>0) {ctx.fillStyle=theme.faint;ctx.fillRect(dino.x-20,dino.y+14,12,2);ctx.fillRect(dino.x-32,dino.y+22,16,2);}
    ctx.fillStyle=theme.ink;
    if(celebrationCtx){celebrationCtx.clearRect(0,0,W,H);celebrationCanvas.style.top=canvas.offsetTop+'px';}
    for(const p of game.particles){
      const target=p.maxLife&&celebrationCtx?celebrationCtx:ctx;
      target.globalAlpha=Math.min(1,Math.max(0,p.life/(p.maxLife||.45)));target.fillStyle=p.color||theme.ink;target.fillRect(p.x,p.y,p.size||3,p.size||3);
    }ctx.globalAlpha=1;if(celebrationCtx)celebrationCtx.globalAlpha=1;
    if(game.messageTimer>0) {
      ctx.font='11px Consolas,monospace';ctx.textAlign='center';ctx.fillText(game.message,W/2, H-21);
    }
    if(game.biomeSign>0) {
      const x=Math.round(W/2-145),y=67;
      ctx.fillStyle=theme.bg;ctx.fillRect(x,y,290,62);ctx.strokeStyle=theme.ink;ctx.strokeRect(x+.5,y+.5,290,62);
      ctx.fillStyle=theme.ink;ctx.textAlign='center';ctx.font='9px Consolas,monospace';ctx.fillText('NEW BIOME',W/2,y+15);
      ctx.font='bold 19px Consolas,monospace';ctx.fillText(theme.name,W/2,y+36,270);
      ctx.font='8px Consolas,monospace';ctx.fillText(theme.subtitle,W/2,y+51);
      ctx.fillRect(x+12,y+62,4,18);ctx.fillRect(x+274,y+62,4,18);
    }
  }
  function drawMutation(theme){
    ctx.save();ctx.strokeStyle=theme.ink;ctx.fillStyle=theme.ink;ctx.globalAlpha=.25;
    for(let i=0;i<7;i++){
      const x=((i*171-game.distance*.12)%W+W)%W,y=80+(i*31)%110;
      if(theme.mutation===0){ctx.beginPath();ctx.arc(W-110,95,35,0,Math.PI*2);ctx.stroke();ctx.fillRect(W-125,83,6,6);ctx.fillRect(W-98,99,5,5);break;}
      if(theme.mutation===1){ctx.beginPath();ctx.arc(x,GROUND-8,16,0,Math.PI);ctx.stroke();ctx.fillRect(x-3,GROUND-26,6,18);}
      if(theme.mutation===2){ctx.fillRect(x,y,12,5);ctx.fillRect(x+24,y,12,5);}
      if(theme.mutation===3){ctx.beginPath();ctx.moveTo(x,GROUND);ctx.lineTo(x+12,GROUND-60-i*4);ctx.lineTo(x+26,GROUND);ctx.closePath();ctx.stroke();}
      if(theme.mutation===4){ctx.fillRect(x,y,3,3);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+24,y-14);ctx.stroke();}
      if(theme.mutation===5){ctx.fillRect(x,y,4,4);ctx.fillRect(x+5,y+7,2,2);}
    }
    ctx.restore();
  }
  function drawTerrain(theme){
    ctx.save();
    if(terrainKind(theme)==='void'||terrainKind(theme)==='crystal'){
      ctx.strokeStyle=theme.faint;
      for(let x=-game.distance%32;x<W;x+=32){ctx.strokeRect(x,GROUND+1,32,30);ctx.strokeRect(x+16,GROUND+31,32,32);}
    }
    for(const t of game.terrain){
      const x=Math.round(t.x);ctx.fillStyle=t.ink;ctx.strokeStyle=t.ink;
      if(t.kind==='gap'){
        ctx.fillStyle=t.bg;ctx.fillRect(x,GROUND-1,t.w,H-GROUND+2);
        ctx.fillStyle=t.lava?'#c36e3d':'#292c40';ctx.fillRect(x,GROUND+6,t.w,H-GROUND);
        ctx.fillStyle=t.lava?'#e8a452':'#72738b';
        for(let i=0;i<t.w;i+=28)ctx.fillRect(x+i,GROUND+7+(t.lava?Math.sin(i+game.time*3)*3:12),18,t.lava?4:2);
        ctx.fillStyle=t.ink;ctx.fillRect(x-10,GROUND,10,H-GROUND);ctx.fillRect(x+t.w,GROUND,10,H-GROUND);
        ctx.font='9px Consolas,monospace';ctx.textAlign='center';ctx.fillText(t.lava?'LAVA':'VOID',x+t.w/2,GROUND+48);
        continue;
      }
      if(t.kind==='vine'){
        ctx.fillRect(x,t.y,t.w,t.h-8);for(let i=0;i<t.w;i+=17)ctx.fillRect(x+i,t.y+t.h-8,6,8);
        ctx.globalAlpha=.3;ctx.fillRect(x+10,100,3,t.y-100);ctx.globalAlpha=1;
      }else if(t.kind==='root'){
        ctx.fillRect(x,t.y,t.w,t.h);ctx.fillStyle=t.bg;ctx.fillRect(x+5,t.y+8,t.w-10,3);
      }else if(t.kind==='crystal'){
        ctx.fillRect(x,t.y,t.w,t.h);ctx.fillStyle=t.bg;ctx.fillRect(x+t.w*.45,t.y+6,3,t.h-12);
        ctx.strokeStyle=t.faint;for(let y=t.y+24;y<GROUND;y+=24)ctx.strokeRect(x,y,t.w,1);
      }else if(t.kind==='volcano'){
        ctx.beginPath();ctx.moveTo(x,GROUND);ctx.lineTo(x+t.w*.3,GROUND-28);ctx.lineTo(x+t.w*.7,GROUND-28);ctx.lineTo(x+t.w,GROUND);ctx.closePath();ctx.fill();
        if(t.stage==='active'){ctx.fillStyle='#c36e3d';ctx.fillRect(x,GROUND-t.h,t.w,t.h-23);ctx.fillStyle='#efb768';for(let i=0;i<3;i++)ctx.fillRect(x+4+i*t.w/3,GROUND-t.h-5+(i%2)*10,5,10);}
      }else if(t.kind==='geyser'){
        ctx.fillRect(x,GROUND-5,t.w,5);
        if(t.stage==='active'){for(let y=GROUND-t.h;y<GROUND;y+=15)ctx.fillRect(x+(Math.floor(y/15)%2)*3,y,t.w-3,12);}
      }else if(t.kind==='meteor'){
        if(t.stage==='active'){ctx.fillRect(x,t.y,t.w,t.h);ctx.globalAlpha=.25;ctx.fillRect(x+7,t.y-25,t.w-14,23);ctx.globalAlpha=1;}
        else {ctx.globalAlpha=.35;ctx.fillRect(x,GROUND-3,t.w,3);ctx.globalAlpha=1;}
      }
      if(t.stage==='warning'){
        ctx.strokeStyle='#ad785a';ctx.setLineDash([4,4]);ctx.strokeRect(x,GROUND-t.h,t.w,t.h);ctx.setLineDash([]);
        ctx.fillStyle='#98613e';ctx.font='bold 16px Consolas,monospace';ctx.textAlign='center';ctx.fillText('!',x+t.w/2,GROUND-t.h-10);
      }
    }
    ctx.restore();
  }
  function frame(now) {
    const dt=last===null?0:Math.min((now-last)/1000,.05);last=now;
    // Substeps prevent tunneling through thin platforms on slower displays.
    if(game.mode==='running') {
      let remaining=dt;
      while(remaining>0 && game.mode==='running'){const step=Math.min(remaining,1/120);update(step);remaining-=step;}
    }
    else if(['won','upgrade'].includes(game.mode)){
      for(const p of game.particles){if(!p.maxLife)continue;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=300*dt;p.life=Math.max(0,p.life-dt);}
      game.particles=game.particles.filter(p=>p.life>0);
    }
    if(game.mode!=='running')game.deathFlash=Math.max(0,game.deathFlash-dt);
    updateHUD();draw();requestAnimationFrame(frame);
  }
  $('start').addEventListener('click',()=>{if(game.mode==='paused')togglePause();else if(game.mode==='won')continueExploring();else if(game.mode==='revive')useRevive();else if(game.mode==='upgrade')chooseUpgrade('skip');else if(game.mode==='practice-death')resumePractice(false);else reset();canvas.focus({preventScroll:true});});
  $('end-run').addEventListener('click',endRun);
  $('practice-retry').addEventListener('click',()=>{resumePractice(true);canvas.focus({preventScroll:true});});
  $('run-mode').addEventListener('change',e=>setAssistMode(e.target.value));
  $('checkpoint').addEventListener('click',()=>captureCheckpoint(true,true));
  for(let i=0;i<3;i++)$('perk-option-'+(i+1)).addEventListener('click',()=>{chooseUpgrade(game.upgradeOffers[i]);canvas.focus({preventScroll:true});});
  $('journal')?.addEventListener('toggle',()=>{if($('journal').open&&game.mode==='running')togglePause();});
  $('restart').addEventListener('click',()=>{reset();canvas.focus({preventScroll:true});});
  $('pause').addEventListener('click',togglePause);
  $('portal-enter').addEventListener('click',()=>{choosePortal(true);canvas.focus({preventScroll:true});});
  $('portal-skip').addEventListener('click',()=>{choosePortal(false);canvas.focus({preventScroll:true});});
  for(let i=0;i<3;i++)$('portal-choice-'+i).addEventListener('click',()=>selectPortal(game.portalOffers[i]));
  function soundLabel(){if(!discovery)return;$('sound').textContent=discovery.muted?'SOUND OFF':'SOUND ON';$('sound').setAttribute('aria-pressed',String(!discovery.muted));}
  $('sound').addEventListener('click',()=>{discovery?.toggleSound();soundLabel();});soundLabel();
  $('phase')?.addEventListener('click',()=>{phaseDash();canvas.focus({preventScroll:true});});
  document.addEventListener('keydown',e=>{
    if(e.target===$('run-mode'))return;
    if(game.mode==='portal-offer'&&e.code==='Tab'){
      e.preventDefault();const controls=[$('portal-choice-0'),$('portal-choice-1'),$('portal-choice-2'),$('portal-enter'),$('portal-skip')];
      const current=controls.indexOf(e.target),next=(current+(e.shiftKey?-1:1)+controls.length)%controls.length;controls[next].focus();return;
    }
    if(game.mode==='portal-offer'&&['KeyE','Escape'].includes(e.code)){e.preventDefault();choosePortal(e.code==='KeyE');return;}
    if(game.mode==='upgrade'&&['Digit1','Digit2','Digit3'].includes(e.code)) {
      e.preventDefault();chooseUpgrade(game.upgradeOffers[Number(e.code.slice(-1))-1]);return;
    }
    if(e.code==='KeyC'&&game.assistMode==='practice'){e.preventDefault();if(!e.repeat)captureCheckpoint(true,true);return;}
    if(e.code==='KeyX'){e.preventDefault();if(!e.repeat)phaseDash();return;}
    if(e.code==='Space'||e.code==='ArrowUp'||e.code==='KeyW') {
      if(e.target instanceof HTMLButtonElement || e.target instanceof HTMLAnchorElement)return;
      e.preventDefault();if(!e.repeat&&!jumpHeld){jumpHeld=true;jump();}
    } else if(e.code==='ArrowDown'||e.code==='KeyS'){e.preventDefault();duckKey=true;}
    else if(e.code==='KeyP'||e.code==='Escape'){if(!e.repeat)togglePause();}
  });
  document.addEventListener('keyup',e=>{
    if(['Space','ArrowUp','KeyW'].includes(e.code))jumpHeld=false;
    if(['ArrowDown','KeyS'].includes(e.code))duckKey=false;
  });
  canvas.addEventListener('pointerdown',e=>{e.preventDefault();canvas.focus({preventScroll:true});jumpHeld=true;canvas.setPointerCapture?.(e.pointerId);jump();});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>{jumpHeld=false;});
  $('boost').addEventListener('pointerdown',e=>{e.preventDefault();jumpHeld=true;$('boost').setPointerCapture(e.pointerId);canvas.focus({preventScroll:true});});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])$('boost').addEventListener(event,()=>{jumpHeld=false;});
  $('duck').addEventListener('pointerdown',e=>{e.preventDefault();duckKey=true;$('duck').setPointerCapture(e.pointerId);});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])$('duck').addEventListener(event,()=>{duckKey=false;});
  function autoPause(){jumpHeld=false;duckKey=false;if(game.mode==='running')togglePause();}
  window.addEventListener('blur',autoPause);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)autoPause();});
  renderJournal();updateHUD();requestAnimationFrame(frame);
})();
