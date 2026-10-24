(() => {
  'use strict';
  const key='dino-jumper-achievements-v1';
  const data=globalThis.DinoAchievementData;
  const state={version:1,stats:{},best:{},flags:{},sets:{biomes:[],namedBiomes:[],events:[],upgrades:[]},unlocked:{}};
  const numeric=(v)=>typeof v==='number'&&Number.isFinite(v)&&v>=0?v:0;
  try {
    const saved=JSON.parse(localStorage.getItem(key)||'null');
    if(saved&&saved.version===1) {
      for(const group of ['stats','best','flags'])for(const [k,v]of Object.entries(saved[group]||{}))if(/^[a-zA-Z0-9]+$/.test(k))state[group][k]=numeric(v);
      for(const k of Object.keys(state.sets))if(Array.isArray(saved.sets?.[k]))state.sets[k]=[...new Set(saved.sets[k].filter(v=>typeof v==='string').map(v=>v.slice(0,100)))].slice(0,10000);
      for(const item of data.items)if(numeric(saved.unlocked?.[item.id]))state.unlocked[item.id]=saved.unlocked[item.id];
    } else {
      const legacy=JSON.parse(localStorage.getItem('dino-jumper-journal')||'{}')||{};
      for(const k of ['runs','revives','fossils'])state.stats[k]=numeric(legacy[k]);
      state.best.score=Math.max(numeric(legacy.best),numeric(Number(localStorage.getItem('dino-jumper-best'))));
      if(Array.isArray(legacy.biomes))state.sets.biomes=[...new Set(legacy.biomes.filter(v=>typeof v==='string'))].slice(0,5000);
      state.sets.namedBiomes=state.sets.biomes.filter(name=>!/[0-9]+$/.test(name));
      const bosses=['BALL-SPITTING BIRD','CHARGING TRICERATOPS','BOULDER T. REX','VOLCANIC DRAGON','SHADOW DINO'];
      bosses.forEach((name,i)=>{if(Array.isArray(legacy.bosses)&&legacy.bosses.includes(name))state.stats['boss'+(i+1)]=1;});
    }
  } catch {}
  let run=null,elapsed=0,check=0,listener=null;
  const inc=(obj,k,n=1)=>obj[k]=(obj[k]||0)+n;
  const best=(k,n)=>state.best[k]=Math.max(state.best[k]||0,n);
  const unique=(k,v)=>{if(!state.sets[k].includes(v))state.sets[k].push(v);};
  function refreshCounts(){
    for(const k of ['biomes','namedBiomes'])state.stats[k]=state.sets[k].length;
    state.stats.eventTypes=state.sets.events.length;state.stats.upgradeTypes=state.sets.upgrades.length;
    state.stats.utilityTypes=['magnet','fall','recovery'].filter(id=>state.sets.upgrades.includes(id)).length;
  }
  function save(){try{localStorage.setItem(key,JSON.stringify(state));}catch{}}
  function evaluate(silent=false){
    refreshCounts();let changed=true,newly=[];
    while(changed){changed=false;for(const item of data.items)if(!state.unlocked[item.id]&&item.parents.every(id=>state.unlocked[id])&&data.progress(item,state)>=1){state.unlocked[item.id]=Date.now();newly.push(item);changed=true;}}
    if(newly.length){save();if(!silent&&listener)listener(newly);}
    return newly;
  }
  function record(event,p={}) {
    if(event==='start') {run={score:0,jumps:0,doubleJumps:0,revives:0,hits:0,fossils:0,upperFossils:0,routes:0,powers:0,biomes:[],upgrades:[],hadMagnet:false,bossHits:0,bossRevives:0,firstRevive:null,clutchLevel:0,lastFastFall:-99,time:0};inc(state.stats,'runs');}
    if(!run&&event!=='biome')return;
    if(run&&typeof p.score==='number'&&Number.isFinite(p.score)) {
      run.score=p.score;best('score',p.score);
      if(run.firstRevive!==null)best('afterRevive',Math.max(0,p.score-run.firstRevive));
    }
    if(event==='tick') {
      run.time+=p.dt;run.score=p.score;best('score',p.score);best('speed',p.speed);
      if(run.firstRevive!==null)best('afterRevive',Math.max(0,p.score-run.firstRevive));
      if(p.fastFall)run.lastFastFall=run.time;
      elapsed+=p.dt;check+=p.dt;
      if(check>=.25){check=0;evaluate();}if(elapsed>=1){elapsed=0;save();}return;
    }
    if(event==='jump'){inc(state.stats,'jumps');run.jumps++;if(p.double){inc(state.stats,'doubleJumps');run.doubleJumps++;}}
    if(event==='biome') {
      unique('biomes',p.name);if(p.index<48)unique('namedBiomes',p.name);else state.flags.frontier=1;
      if(run&&!run.biomes.includes(p.name)){run.biomes.push(p.name);best('biomes',run.biomes.length);}
    }
    if(event==='route'){inc(state.stats,'routes');run.routes++;best('routes',run.routes);if(run.routes>=3&&run.upperFossils>=10)state.flags.skyline=1;}
    if(event==='pickup') {
      if(p.type==='fossil') {
        inc(state.stats,'fossils');run.fossils++;best('fossilValue',p.points||25);
        if(p.upper)run.upperFossils++;if(p.fireflies)inc(state.stats,'fireflyFossils');
        if(run.fossils>=20&&!run.hadMagnet)state.flags.noMagnetRun=1;
        if(run.routes>=3&&run.upperFossils>=10)state.flags.skyline=1;
      }
      if(p.type==='fragment')inc(state.stats,'fragments');
      if(p.type==='shield'||p.type==='slow')run.powers++;
    }
    if(event==='repair'){inc(state.stats,'repairs');run.powers++;}
    if(event==='hit'){run.hits++;if(p.shield){inc(state.stats,'shieldSaves');if(p.ward)state.flags.wardSave=1;}}
    if(event==='revive'){
      inc(state.stats,'revives');run.revives++;if(run.firstRevive===null)run.firstRevive=p.score;
      if(run.revives===2)state.flags.usedBoth=1;if(p.boss&&p.fraction>=.7)run.clutchLevel=p.boss;
    }
    if(event==='bossStart'){run.bossHits=run.hits;run.bossRevives=run.revives;if(p.ward)run.powers++;}
    if(event==='bossWin'){
      inc(state.stats,'boss'+p.level);if(run.hits===run.bossHits&&run.revives===run.bossRevives)state.flags.perfectBoss=1;
      if(run.clutchLevel===p.level)state.flags.clutchBoss=1;
    }
    if(event==='upgrade'){
      inc(state.stats,'upgrades');unique('upgrades',p.id);
      if(run.upgrades.includes(p.id))state.flags.doubleDown=1;run.upgrades.push(p.id);
      if(new Set(run.upgrades).size>=2)state.flags.balancedBuild=1;if(p.id==='magnet')run.hadMagnet=true;
    }
    if(event==='eventWin'){inc(state.stats,'events');unique('events',p.kind);}
    if(event==='dodge'&&run.time-run.lastFastFall<=1)inc(state.stats,'fastFallDodges');
    if(event==='win'){
      if(run.hits===0&&run.revives===0)state.flags.cleanWin=1;
      if(run.revives===0)state.flags.noReviveWin=1;if(run.revives===2)state.flags.comebackWin=1;
      if(run.powers===0)state.flags.noPowerWin=1;if(run.doubleJumps===0)state.flags.singleJumpWin=1;
    }
    evaluate();save();
  }
  evaluate(true);
  globalThis.DinoAchievements={state,record,save,evaluate,subscribe:fn=>{listener=fn;},getRun:()=>run};
  if(typeof addEventListener==='function')addEventListener('pagehide',save);
})();
