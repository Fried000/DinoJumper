(() => {
  'use strict';
  const canvas = document.querySelector('#game');
  const ctx = canvas.getContext('2d');
  const $ = id => document.getElementById(id);
  const achievement=window.DinoAchievements||{record(){},subscribe(){}};
  let achievementNoticeTimer;
  achievement.subscribe(items=>{
    const notice=$('achievement-toast');if(!notice)return;
    notice.textContent=`Achievement unlocked: ${items[0].name}${items.length>1?` +${items.length-1}`:''}`;
    notice.hidden=false;clearTimeout(achievementNoticeTimer);
    achievementNoticeTimer=setTimeout(()=>{notice.hidden=true;},3500);
  });
  const W = window.innerWidth < 650 ? 600 : 1000, H = 360, GROUND = 292;
  canvas.width = W;
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
  const activeTheme=()=>getBiome(game.biome);
  const BOSSES = [
    { name: 'BALL-SPITTING BIRD', duration: 7, interval: [.95,1.25], hint: 'MULTI-BALL VOLLEYS · LOW: JUMP / HIGH: DUCK' },
    { name: 'PRISM TRICERATOPS', duration: 7.5, interval: [1.5,1.75], hint: 'LASER WARNING → DUCK / JUMP / DOUBLE JUMP · X TO PHASE' },
    { name: 'QUARRY T. REX', duration: 8, interval: [1.65,1.9], hint: 'READ THE ROCKS · LOW: JUMP / HIGH: DUCK / TALL: DOUBLE JUMP' },
    { name: 'VOLCANIC DRAGON', duration: 8.5, interval: [.8,1.1], hint: 'FIRE STREAMS + LAVA RAIN · KEEP MOVING' },
    { name: 'SHADOW DINO', duration: 9, interval: [.8,1.05], hint: 'STACKED VOLLEYS · DELAYED ECHOES · FINAL RAGE' },
  ];
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
    borderAnnounced:-1,previousBiome:0,biomeFade:0,phaseCooldown:0,phaseTrail:0 };
  const dino = { x: 105, y: GROUND - 45, w: 45, h: 45, vy: 0, jumps: 0, grounded: true, duck: false };
  let last = null;
  let duckKey = false;
  let jumpHeld = false;
  let reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rand = (a, b) => a + Math.random() * (b - a);
  const score = () => Math.floor(game.distance / 10) + game.bonus;
  const pad = n => String(Math.floor(n)).padStart(5, '0');
  const intersects = (a,b) => a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;

  function announce(text) { $('announcer').textContent = text; }
  function toast(text) { game.message = text; game.messageTimer = 2.8; announce(text); }
  function saveJournal() {
    journal.best=Math.max(journal.best,score(),high);
    try {localStorage.setItem('dino-jumper-journal',JSON.stringify(journal));}catch{}
    renderJournal();
  }
  function discover(category,name) {
    if(!journal[category].includes(name)) {journal[category].push(name);saveJournal();}
  }
  function renderJournal() {
    if(!$('journal-count'))return;
    $('journal-count').textContent=`${journal.biomes.length} WORLDS · ${journal.bosses.length}/5 BOSSES`;
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
    $('overlay-help').textContent='SPACE / ↑ / TAP TO JUMP · AGAIN TO DOUBLE JUMP';
  }
  function reset() {
    Object.assign(game, { mode: 'running', distance: 0, bonus: 0, speed: BASE_SPEED, time: 0, biome: 0,
      obstacles: [], pickups: [], platforms: [], particles: [], boss: null,
      nextObstacle: rand(.9,1.7), nextPickup: rand(5,8), nextRoute: rand(5,8), nextBoss: 1000, routeActive: false,
      shield: 0, slow: 0, invincible: 1, message: '', messageTimer: 0,
      biomeSign: 3.5, bossesDefeated: 0, warnings: [], lastObstacle: '', completed: false,
      revivesUsed:0,fragments:0,runFossils:0,perks:newPerks(),upgradeOffers:[],wardActive:false,
      lastUpgradeBossCount:0,event:null,nextEvent:rand(5,8),routeId:0,visitedRoute:-1,lastPattern:'',
      borderAnnounced:-1,previousBiome:0,biomeFade:0,phaseCooldown:0,phaseTrail:0 });
    Object.assign(dino, { y: GROUND - 45, vy: 0, jumps: 0, grounded: true, duck: false });
    duckKey = false;
    jumpHeld=false;
    achievement.record('start');achievement.record('biome',{index:0,name:activeTheme().name});
    journal.runs++;discover('biomes',activeTheme().name);saveJournal();
    $('upgrade-choices').hidden=true;$('end-run').hidden=true;
    $('overlay').hidden = true;
    $('pause').textContent = 'Ⅱ';
    $('pause').setAttribute('aria-label', 'Pause game');
    announce('Run started. Double jump to reach the upper route.');
    last = null;
    updateHUD();
  }
  function jump() {
    if(game.mode==='upgrade')return;
    if(game.mode==='revive'){useRevive();return;}
    if(game.mode==='won'){continueExploring();return;}
    if (game.mode === 'ready' || game.mode === 'over') { reset(); return; }
    if (game.mode === 'paused') { togglePause(); return; }
    if (dino.jumps >= 2) return;
    dino.duck = false;
    dino.vy = dino.jumps === 0 ? JUMP : -610;
    dino.jumps++;
    achievement.record('jump',{double:dino.jumps===2});
    dino.grounded = false;
    if (game.boss?.level === 5) {
      game.boss.echoes.push({ delay: game.boss.age > game.boss.duration/2 ? .45 : .8, y: dino.y });
    }
    if (dino.jumps === 2) burst(dino.x + 20, dino.y + 40, 8);
  }
  function phaseDash() {
    if(game.mode!=='running'||game.phaseCooldown>0)return false;
    game.phaseCooldown=5;game.phaseTrail=.34;
    game.invincible=Math.max(game.invincible,.34);
    burst(dino.x+18,dino.y+24,9);announce('Phase dash. Ready again in five seconds.');return true;
  }
  function borderDistance(){return (Math.floor(score()/BIOME_POINTS)+1)*BIOME_POINTS-score();}
  function synchronizeBiome(){
    const biome=Math.floor(score()/BIOME_POINTS);
    if(biome!==game.biome){
      game.previousBiome=game.biome;game.biome=biome;game.biomeFade=1;game.biomeSign=3.5;
      game.nextObstacle=Math.max(game.nextObstacle,1);game.nextRoute=Math.max(game.nextRoute,3.8);game.nextEvent=Math.max(game.nextEvent,4);
      achievement.record('biome',{index:biome,name:activeTheme().name});discover('biomes',activeTheme().name);toast(`NEW BIOME · ${activeTheme().name}`);
    }
    if(borderDistance()<=BORDER_APPROACH&&game.borderAnnounced!==game.biome){
      game.borderAnnounced=game.biome;toast(`BORDER AHEAD · ${getBiome(game.biome+1).name} · CLEAR STRETCH`);
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
    high = Math.max(high, score());
    try { localStorage.setItem('dino-jumper-best', String(high)); } catch {}
    showOverlay('THERE’S ALWAYS ANOTHER HORIZON', 'One more try?', `You ran ${score()} points. Best run: ${high}.`, 'RUN AGAIN');
    announce(`Game over. Score ${score()}. Best ${high}.`);
    updateHUD();
    saveJournal();
  }
  function offerRevive() {
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
    game.revivesUsed++;journal.revives++;
    achievement.record('revive',{score:score(),boss:game.boss?.level,fraction:game.boss?game.boss.age/game.boss.duration:0});
    game.obstacles=[];game.platforms=[];game.warnings=[];game.routeActive=false;
    game.invincible=2+game.perks.recovery;
    game.nextObstacle=1.3;
    if(game.boss){game.boss.shot=1.4;game.boss.echoes=[];}
    Object.assign(dino,{y:GROUND-45,vy:0,jumps:0,grounded:true,duck:false});
    game.mode='running';$('overlay').hidden=true;$('end-run').hidden=true;
    last=null;duckKey=false;jumpHeld=false;
    discover('secrets','DINO EGG · HATCHED AGAIN');saveJournal();
    toast(`HATCHED AGAIN · ${2-game.revivesUsed} REVIVALS LEFT`);updateHUD();
  }
  function openUpgrade() {
    const pool=UPGRADES.filter(p=>game.perks[p.id]<p.max);
    for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
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
  function hurt(obstacle) {
    if (game.invincible > 0) return;
    achievement.record('hit',{shield:game.shield>0,ward:game.wardActive&&Boolean(game.boss)});
    if (game.shield > 0) {
      game.shield = 0; game.wardActive=false; game.invincible = 1.4;
      obstacle.hit = true;
      burst(dino.x+20, dino.y+20, 14);
      toast('SHIELD SAVED YOU');
    } else offerRevive();
  }
  function spawnObstacle() {
    const theme = activeTheme();
    let pool = theme.obstacles.filter(type => type !== game.lastObstacle);
    if (game.distance > 800 && Math.random() < .25) pool = ['bird'];
    const type = game.event?.kind==='stampede'?'runner':game.event?.kind==='meteor'?'meteor':pool[Math.floor(Math.random()*pool.length)];
    const bird = type === 'bird';
    const w = bird ? 44 : Math.round(rand(24,60));
    const h = bird ? 28 : Math.round(rand(30,56));
    const y = bird ? GROUND - (Math.random() < .5 ? 56 : 38) : GROUND-h;
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
    const risky=Math.random()<.5;
    for (let i=0;i<4;i++) {
      const x = W+80+i*(risky?195:220);
      const y = GROUND-115-(i===1||i===2?(risky?30:15):0);
      game.platforms.push({x,y,w:risky?155:190,h:8,routeId:game.routeId,biome:game.biome});
      game.pickups.push({x:x+55,y:y-34,w:19,h:19,type:i===3?'fragment':'fossil'});
      if(risky && i===2)game.obstacles.push({x:x+100,y:y-28,w:32,h:28,type:'bird',hit:false,biome:game.biome});
    }
    toast(`${risky?'DARING':'SCENIC'} HIGH ROAD · FOSSILS + EGG FRAGMENT · GROUND IS OPTIONAL`);
  }
  function spawnBoss(level = Math.min(5,game.bossesDefeated+1)) {
    const spec = BOSSES[level-1];
    game.boss = { ...spec, level, age: 0, shot: .8, x: W-145, y: 68, w: 88, h: 60, echoes: [], feints: 0, volley: 0, lastPattern:'',lastHigh:null,laneStreak:0,laserBag:[] };
    // Clear the runway so boss projectiles do not create unfair combinations.
    game.obstacles = [];
    game.platforms = [];
    game.pickups = [];
    game.warnings = [];
    game.event=null;game.nextEvent=rand(3,5);
    if(game.perks.ward) {game.shield=Math.max(game.shield,spec.duration+1);game.wardActive=true;}
    achievement.record('bossStart',{level,ward:Boolean(game.perks.ward)});
    game.routeActive = false;
    toast(`BOSS ${level} · ${spec.name} · SURVIVE TO WIN`);
    if(level===4) {
      for(let i=0;i<6;i++) game.platforms.push({x:W+120+i*260,y:GROUND-105,w:155,h:8,crumble:null});
    }
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
      game.obstacles.push({x:boss.x,y:warning.laneY??GROUND-height,w:warning.width||34,h:height,
        vx:Math.min(game.speed,(boss.x-dino.x)/1.05),type:'siege-rock',hit:false,age:0,biome:game.biome});return;
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
    // Alternate the required response, with random-length trains in each wave.
    // A ceiling ball punishes careless double jumps without sealing the gap.
    const high=boss.volley%2===0;
    const train=(type,count,lane=false,options={})=>{
      for(let i=0;i<count;i++)warnAttack(type,lane,0,{spacing:i*.14,...options});
    };
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
      const pattern=choices[Math.floor(Math.random()*choices.length)];
      boss.laneStreak=pattern.high===boss.lastHigh?boss.laneStreak+1:1;
      boss.lastHigh=pattern.high;boss.lastPattern=pattern.name;
      for(let i=0;i<pattern.count;i++)warnAttack('ball',pattern.high,0,{spacing:i*pattern.gap});
      if(pattern.sky)ceiling();
    } else if(boss.level===2) {
      let action;
      if(boss.volley%4===0)action='scatter';
      else {
        if(!boss.laserBag.length){boss.laserBag=['duck','jump','double'];for(let i=2;i>0;i--){const j=Math.floor(Math.random()*(i+1));[boss.laserBag[i],boss.laserBag[j]]=[boss.laserBag[j],boss.laserBag[i]];}}
        action=boss.laserBag.pop();
      }
      const y=action==='duck'?rand(GROUND-39,GROUND-28):action==='jump'?rand(GROUND-80,GROUND-45):action==='double'?rand(GROUND-190,GROUND-145):rand(20,GROUND-16);
      const height=action==='jump'||action==='double'?GROUND-y:8;
      game.warnings.push({type:'laser',action,laneY:y,height,delay:.95,label:action==='double'?'LASER CURTAIN · DOUBLE JUMP':action==='jump'?'LOW LASER CURTAIN · JUMP':action==='duck'?'HEAD-HEIGHT LASER · DUCK':'SCATTER LASER · READ THE LINE'});
    } else if(boss.level===3) {
      const choices=['ground','high','tower'].filter(p=>p!==boss.lastPattern);
      const pattern=choices[Math.floor(Math.random()*choices.length)];boss.lastPattern=pattern;
      const height=pattern==='tower'?rand(132,146):pattern==='high'?20:rand(35,52);
      game.warnings.push({type:'siege-rock',action:pattern,height,laneY:pattern==='high'?rand(GROUND-52,GROUND-46):GROUND-height,width:pattern==='tower'?34:40,
        delay:.7,label:pattern==='tower'?'ROCK TOWER · DOUBLE JUMP':pattern==='high'?'HIGH ROCK · DUCK':'GROUND ROCK · JUMP'});
    } else if(boss.level===4) {
      if(high)train('fireball',3,true);
      else {train('fireball',3);warnAttack('rain');}
      ceiling();
    } else {
      if(high) {train('ball',3,true);ceiling();}
      else {
        train(boss.volley%4===1?'boulder':'fireball',3,false,{bounce:10});
        warnAttack('ball',true); // Jump over the stacked front of the volley.
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
    kind=kind||(scenery==='snow'?'blizzard':['volcano','space','canyon'].includes(scenery)?'meteor':Math.random()<.5?'stampede':'fireflies');
    const names={blizzard:'SNOW SQUALL',meteor:'METEOR SHOWER',stampede:'MINI STAMPEDE',fireflies:'FIREFLY TRAIL'};
    game.event={kind,name:names[kind],left:6};
    discover('secrets',`EVENT · ${names[kind]}`);toast(`${names[kind]} · WATCH THE HORIZON`);
    if(kind==='fireflies')for(let i=0;i<5;i++)game.pickups.push({x:W+60+i*115,y:GROUND-50-i%2*25,w:19,h:19,type:'fossil'});
  }
  function collectPickup(pickup) {
    const points=25+(pickup.type==='fossil'?game.perks.fortune*10+(game.routeActive?game.perks.route*15:0):0);
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
      game.bonus+=25+(pickup.type==='fossil'?game.perks.fortune*10+(game.routeActive?game.perks.route*15:0):0);
      if(pickup.type==='fossil') {game.runFossils++;journal.fossils++;saveJournal();}
    }
  }
  function winRun() {
    achievement.record('win',{score:score()});
    game.completed=true;game.nextBoss=Infinity;game.mode='won';
    high=Math.max(high,score());
    try {localStorage.setItem('dino-jumper-best',String(high));}catch{}
    showOverlay('FIVE BOSSES. ONE VERY STUBBORN DINO.', 'You beat the gauntlet.',
      `${score()} points. Keep exploring new biomes, or restart for another challenge.`, 'EXPLORE ON');
    announce('Victory! All five bosses defeated. Continue into the endless frontier.');
    discover('secrets','FIVE BOSSES · GAUNTLET COMPLETE');saveJournal();
  }
  function playerBox() {
    return {x:dino.x+6,y:dino.y+(dino.duck?25:10),w:dino.duck?44:30,h:dino.duck?19:34};
  }
  function update(dt) {
    // Slow motion affects world movement, not the responsiveness of the jump.
    const worldDt = dt * (game.slow > 0 ? .58 : 1);
    game.time += dt;
    game.distance += game.speed * worldDt;
    game.speed = Math.min(MAX_SPEED,BASE_SPEED+game.distance/32);
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
    for (const platform of game.platforms) {
      platform.x -= dx;
      if(platform.crumble!==undefined && platform.crumble!==null) {
        platform.crumble-=dt;if(platform.crumble<=0)continue;
      }
      if (dino.vy >= 0 && oldBottom <= platform.y+3 && dino.y+dino.h >= platform.y &&
        dino.x+dino.w-8 > platform.x && dino.x+8 < platform.x+platform.w) {
        dino.y = platform.y-dino.h; dino.vy = 0; dino.grounded = true; dino.jumps = 0;
        if(platform.crumble===null)platform.crumble=.85;
        if(platform.routeId!==undefined && game.visitedRoute!==platform.routeId) {
          game.visitedRoute=platform.routeId;discover('secrets','SECRET ROUTE · THE HIGH ROAD');
          achievement.record('route');
        }
        if (!game.routeActive) { game.routeActive = true; toast('UPPER ROUTE'); }
      }
    }
    if (dino.y+dino.h >= GROUND) {
      dino.y = GROUND-dino.h; dino.vy = 0; dino.grounded = true; dino.jumps = 0;
      game.routeActive = false;
    }
    if (dino.grounded) dino.duck = duckKey;
    game.platforms = game.platforms.filter(p=>p.x+p.w>0 && (p.crumble===undefined||p.crumble===null||p.crumble>0));

    if (!game.boss && !game.completed && score() >= game.nextBoss && !game.obstacles.some(o=>!o.hit&&o.x+o.w>0)) {
      game.nextBoss += 1000;
      spawnBoss();
    }
    if (game.boss) {
      const boss = game.boss;
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
      if (boss.shot <= 0 && boss.age < boss.duration-(boss.level===2?1.05:2)) {
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
        const reward=boss.level*50;
        achievement.record('bossWin',{level:boss.level,score:score()+reward});
        game.boss = null; game.bonus += reward;game.bossesDefeated++;
        if(game.wardActive){game.shield=0;game.wardActive=false;}
        discover('bosses',boss.name);
        game.obstacles = []; game.warnings=[]; game.platforms=[];game.nextObstacle = rand(1.4,2);
        game.nextRoute = Math.max(3, game.nextRoute);
        toast(`BOSS ${boss.level} OUTRUN · +${reward}`);
        if(game.bossesDefeated===5)winRun();
        else if(game.bossesDefeated%2===0&&game.lastUpgradeBossCount<game.bossesDefeated) {openUpgrade();return;}
      }
    } else {
      game.nextEvent-=worldDt;
      if(game.event) {game.event.left-=worldDt;if(game.event.left<=0){achievement.record('eventWin',{kind:game.event.kind});game.event=null;}}
      if(game.nextEvent<=0&&!game.event&&!nearBorder&&!bossApproach){startEvent();game.nextEvent=rand(16,24);}
      game.nextObstacle -= worldDt;
      if (game.nextObstacle<=0&&!nearBorder&&!bossApproach) { spawnObstacle(); game.nextObstacle=rand(.78,1.35); }
      game.nextPickup -= worldDt;
      if (game.nextPickup<=0) {
        const roll=Math.random();
        game.pickups.push({x:W+60,y:GROUND-95,w:23,h:23,type:roll<.3?'shield':roll<.6?'slow':roll<.8?'fragment':'fossil'});
        game.nextPickup=rand(11,15);
      }
      game.nextRoute -= worldDt;
      if (game.nextRoute<=0 && !game.platforms.length && borderDistance()>650 && (game.completed||score()<game.nextBoss-400)) { spawnRoute(); game.nextRoute=rand(22,28); }
    }
    const box = playerBox();
    for (const obstacle of game.obstacles) {
      if(obstacle.type==='laser'){obstacle.ttl-=worldDt;if(obstacle.ttl<=0)continue;}
      else obstacle.x -= (obstacle.vx||game.speed)*worldDt;
      obstacle.age=(obstacle.age||0)+worldDt;
      if(obstacle.targetY!==undefined)obstacle.y=obstacle.startY+(obstacle.targetY-obstacle.startY)*Math.min(1,obstacle.age/.3);
      if(obstacle.bounce)obstacle.y=GROUND-obstacle.h-Math.abs(Math.sin(obstacle.age*obstacle.frequency))*obstacle.bounce;
      if(obstacle.vy)obstacle.y+=obstacle.vy*worldDt;
      if(!obstacle.counted&&!obstacle.hit&&!obstacle.touched&&obstacle.x+obstacle.w<dino.x){obstacle.counted=true;achievement.record('dodge');}
      const hitbox = {x:obstacle.x+3,y:obstacle.y+3,w:obstacle.w-6,h:obstacle.h-5};
      if (!obstacle.hit && intersects(box,hitbox)) {
        obstacle.touched=true;
        hurt(obstacle);
        if (game.mode !== 'running') return;
      }
    }
    game.obstacles = game.obstacles.filter(o=>o.x+o.w>0 && o.y<H+50 && !o.hit && (o.ttl===undefined||o.ttl>0));
    for (const pickup of game.pickups) {
      pickup.x -= dx;
      const radius=Math.min(140,game.perks.magnet*35);
      if(radius>0 && Math.hypot(pickup.x-box.x,pickup.y-box.y)<radius) {
        pickup.x+=(box.x-pickup.x)*Math.min(1,dt*14);pickup.y+=(box.y-pickup.y)*Math.min(1,dt*14);
      }
      if (intersects(box,pickup)) {
        collectPickup(pickup);
      }
    }
    game.pickups=game.pickups.filter(p=>p.x+p.w>0&&!p.collected);
    for (const p of game.particles) { p.x+=p.vx*dt-dx/2; p.y+=p.vy*dt; p.vy+=300*dt; p.life-=dt; }
    game.particles=game.particles.filter(p=>p.life>0);
    synchronizeBiome();
    achievement.record('tick',{dt,score:score(),speed:game.speed,fastFall:duckKey&&!dino.grounded&&dino.vy>0&&game.perks.fall>0});
  }
  function updateHUD() {
    const theme = activeTheme();
    $('biome').textContent = `${String(game.biome+1).padStart(2,'0')} / ${theme.name}`;
    $('score').textContent = `HI ${pad(Math.max(high,score()))}   ${pad(score())}`;
    $('status').textContent = {ready:'READY TO RUN',running:game.boss?`BOSS ${game.boss.level} / 5`:game.completed?'ENDLESS FRONTIER':'ON THE MOVE',paused:'TAKING A BREATHER',over:'UNTIL NEXT TIME',won:'GAUNTLET COMPLETE',revive:'AN EGG CAN BRING YOU BACK',upgrade:'CHOOSE A PERK'}[game.mode];
    const effects = [];
    if (game.shield>0) effects.push(`SHIELD ${Math.ceil(game.shield)}s`);
    if (game.slow>0) effects.push(`SLOW ${Math.ceil(game.slow)}s`);
    $('effect').textContent = effects.join(' / ') || (borderDistance()<=BORDER_APPROACH?`NEXT: ${getBiome(game.biome+1).name}`:game.event?.name||'');
    $('route-status').textContent = game.routeActive?'UPPER ROUTE':'';
    $('eggs').textContent=`EGGS ${2-game.revivesUsed} / 2`;
    $('fragments').textContent=`FRAGMENTS ${game.fragments} / ${game.perks.finder?2:3}`;
    $('fossils').textContent=`FOSSILS ${game.runFossils}`;
    $('next-boss').textContent=game.completed?'ALL BOSSES BEATEN':`NEXT BOSS ${game.nextBoss.toLocaleString('en-US')}`;
    const owned=UPGRADES.filter(p=>game.perks[p.id]).map(p=>`${p.name}${p.max>1?' Lv '+game.perks[p.id]:''}: ${p.summary(game.perks[p.id])}`).join('  •  ');
    const label=owned||'None yet — choose an upgrade after bosses 2 and 4.';
    if($('active-upgrades').textContent!==label)$('active-upgrades').textContent=label;
    const upgradeBar=document.querySelector('.equipped-upgrades');if(upgradeBar)upgradeBar.hidden=!owned;
    if($('phase')){$('phase').textContent=game.phaseCooldown>0?`X · PHASE ${Math.ceil(game.phaseCooldown)}s`:'X · PHASE READY';$('phase').disabled=game.mode!=='running'||game.phaseCooldown>0;}
    document.querySelector('.game-shell').style.setProperty('--game-bg',theme.bg);
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
      bird({x,y:boss.y+Math.sin(game.time*3)*12},true);
      ctx.fillRect(x+60,boss.y-12,6,18);ctx.fillRect(x+72,boss.y-6,6,15);
      ctx.fillRect(x-20,boss.y+30,35,7);
    } else {
      ctx.globalAlpha=.7;ctx.translate(x+70,GROUND);ctx.scale(-1,1);pixelDino(0,-45,3,false,false);
      ctx.globalAlpha=.2;pixelDino(12,-43,3,false,false);
    }ctx.restore();
  }
  function drawHazard(o,theme) {
    if(o.type==='laser'){drawLaser(o,false);return;}
    if(o.type==='siege-rock'){
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
    if(p.type==='fragment') {
      ctx.beginPath();ctx.moveTo(-8,9);ctx.lineTo(-10,-2);ctx.lineTo(-5,-8);ctx.lineTo(0,-3);ctx.lineTo(5,-8);ctx.lineTo(10,-2);ctx.lineTo(8,9);ctx.closePath();ctx.stroke();
      ctx.fillRect(-2,1,4,4);
    } else if(p.type==='fossil') {
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
    if(game.biomeFade>0){
      const previous=getBiome(game.previousBiome);ctx.fillStyle=previous.bg;ctx.fillRect(0,0,W,H);scenery(previous);
      ctx.save();ctx.globalAlpha=1-game.biomeFade;ctx.fillStyle=theme.bg;ctx.fillRect(0,0,W,H);scenery(theme);ctx.restore();
    }else{ctx.fillStyle=theme.bg;ctx.fillRect(0,0,W,H);scenery(theme);}
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
    for(const p of game.platforms) {
      ctx.globalAlpha=p.crumble!==undefined && p.crumble!==null?Math.max(.2,p.crumble/.85):1;
      ctx.setLineDash([5,4]);ctx.strokeRect(Math.round(p.x),p.y,p.w,5);ctx.setLineDash([]);
      ctx.fillStyle=theme.faint;ctx.fillRect(p.x,p.y+6,p.w,3);ctx.fillStyle=theme.ink;
    }ctx.globalAlpha=1;
    for(const o of game.obstacles){const ownTheme=getBiome(o.biome??game.biome);ctx.fillStyle=ownTheme.ink;ctx.strokeStyle=ownTheme.ink;drawHazard(o,ownTheme);}
    ctx.fillStyle=theme.ink;ctx.strokeStyle=theme.ink;
    for(const p of game.pickups) drawPickup(p);
    if(game.boss) {
      const boss=game.boss;
      drawBoss(boss);
      ctx.font='10px Consolas,monospace';ctx.textAlign='right';
      ctx.fillText(`${boss.level}/5 · ${boss.name}`,W-20,22);
      ctx.font='9px Consolas,monospace';ctx.fillText(boss.hint,W-20,54);
      ctx.fillStyle=theme.faint;ctx.fillRect(W-170,38,140,3);
      ctx.fillStyle=theme.ink;ctx.fillRect(W-170,38,140*(1-boss.age/boss.duration),3);
      const warning=game.warnings[0];
      if(warning) {
        if(warning.type==='laser')drawLaser(warning,true);
        ctx.textAlign='center';ctx.font='bold 12px Consolas,monospace';
        ctx.fillText(`! ${warning.label} !`,W/2,145);
        const lane=warning.laneY??(warning.high?GROUND-42:GROUND-12);
        ctx.setLineDash([5,8]);ctx.beginPath();ctx.moveTo(W-190,lane);ctx.lineTo(W,lane);ctx.stroke();ctx.setLineDash([]);
      }
    }
    if(game.time<1||game.invincible<=0||Math.floor(game.time*14)%2===0||game.mode!=='running')pixelDino(dino.x,dino.y,2,dino.duck);
    if(game.phaseTrail>0){ctx.save();ctx.globalAlpha=.22;pixelDino(dino.x-22,dino.y,2,dino.duck,false);ctx.globalAlpha=.1;pixelDino(dino.x-43,dino.y,2,dino.duck,false);ctx.restore();}
    if(game.shield>0) {
      ctx.setLineDash([4,3]);ctx.strokeRect(dino.x-7,dino.y-6,59,58);ctx.setLineDash([]);
    }
    if(!dino.grounded && dino.jumps===1) {ctx.fillStyle=theme.faint;ctx.fillRect(dino.x+17,dino.y-12,5,5);}
    if(game.slow>0) {ctx.fillStyle=theme.faint;ctx.fillRect(dino.x-20,dino.y+14,12,2);ctx.fillRect(dino.x-32,dino.y+22,16,2);}
    ctx.fillStyle=theme.ink;
    for(const p of game.particles) {ctx.globalAlpha=Math.max(0,p.life/.45);ctx.fillRect(p.x,p.y,3,3);}ctx.globalAlpha=1;
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
  function frame(now) {
    const dt=last===null?0:Math.min((now-last)/1000,.05);last=now;
    // Substeps prevent tunneling through thin platforms on slower displays.
    if(game.mode==='running') {
      let remaining=dt;
      while(remaining>0 && game.mode==='running'){const step=Math.min(remaining,1/120);update(step);remaining-=step;}
    }
    updateHUD();draw();requestAnimationFrame(frame);
  }
  $('start').addEventListener('click',()=>{if(game.mode==='paused')togglePause();else if(game.mode==='won')continueExploring();else if(game.mode==='revive')useRevive();else if(game.mode==='upgrade')chooseUpgrade('skip');else reset();canvas.focus({preventScroll:true});});
  $('end-run').addEventListener('click',endRun);
  for(let i=0;i<3;i++)$('perk-option-'+(i+1)).addEventListener('click',()=>{chooseUpgrade(game.upgradeOffers[i]);canvas.focus({preventScroll:true});});
  $('journal')?.addEventListener('toggle',()=>{if($('journal').open&&game.mode==='running')togglePause();});
  $('restart').addEventListener('click',()=>{reset();canvas.focus({preventScroll:true});});
  $('pause').addEventListener('click',togglePause);
  $('phase')?.addEventListener('click',()=>{phaseDash();canvas.focus({preventScroll:true});});
  document.addEventListener('keydown',e=>{
    if(game.mode==='upgrade'&&['Digit1','Digit2','Digit3'].includes(e.code)) {
      e.preventDefault();chooseUpgrade(game.upgradeOffers[Number(e.code.slice(-1))-1]);return;
    }
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
  canvas.addEventListener('pointerdown',e=>{e.preventDefault();canvas.focus({preventScroll:true});jump();});
  $('duck').addEventListener('pointerdown',e=>{e.preventDefault();duckKey=true;$('duck').setPointerCapture(e.pointerId);});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])$('duck').addEventListener(event,()=>{duckKey=false;});
  function autoPause(){jumpHeld=false;duckKey=false;if(game.mode==='running')togglePause();}
  window.addEventListener('blur',autoPause);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)autoPause();});
  renderJournal();updateHUD();requestAnimationFrame(frame);
})();
