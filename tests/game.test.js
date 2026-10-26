const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const driveTrial=require('./trial-controls');

// Exercise the actual game loop in a minimal DOM. The test hook is injected into
// the VM copy only, so the game does not expose mutable state in the browser.
function setup(width = 1000, seed = 12345, storage = new Map(), withAchievements = false, withDiscovery = false) {
  const elements = new Map();
  const draws = [];
  const context = new Proxy({}, { get: (_,name) => (...args) => { draws.push([name,...args]); } });
  const element = id => {
    if (!elements.has(id)) elements.set(id, {
      textContent: '', hidden: false, style: { setProperty() {} },
      events: {}, addEventListener(name, fn) { this.events[name] = fn; },
      getContext: () => context, setAttribute() {}, focus() {},
    });
    return elements.get(id);
  };
  const events = {};
  const document = { getElementById: element, querySelector: element,
    addEventListener(name, fn) { events[name] = fn; } };
  const sandbox = { document, window: { innerWidth: width, addEventListener() {} },
    localStorage: { getItem:key=>storage.get(key), setItem:(key,value)=>storage.set(key,value) }, matchMedia: () => ({ matches: false }),
    requestAnimationFrame() {}, setTimeout(){return 0;},clearTimeout(){}, HTMLButtonElement: class {}, HTMLAnchorElement: class {} };
  const randomMath=Object.create(Math);
  randomMath.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  sandbox.Math=randomMath;
  const source = fs.readFileSync(require.resolve('../game.js'), 'utf8')
    .replace('  renderJournal();updateHUD();requestAnimationFrame(frame);',
      '  globalThis.api = {game,dino,reset,jump,update,togglePause,spawnRoute,spawnBoss,playerBox,draw,score,frame,spawnObstacle,bossAttack,launchAttack,pixelDino,DUCK_DINO,BIOMES,BOSSES,UPGRADES,getBiome,continueExploring,journal,offerRevive,useRevive,chooseUpgrade,openUpgrade,startEvent,collectPickup,endRun,discover,updateHUD,phaseDash,synchronizeBiome,borderDistance,spawnFossilTrail,offerPortal,choosePortal,finishPortal,activeTheme,spawnTerrain,terrainKind,gapUnderfoot,nextMutation,selectPortal,activeStage,BOSS_MILESTONES,setAssistMode,captureCheckpoint,resumePractice};');
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(require.resolve('../trials.js'),'utf8'),sandbox);
  if(withDiscovery)vm.runInContext(fs.readFileSync(require.resolve('../discovery.js'),'utf8'),sandbox);
  if(withAchievements) {
    for(const file of ['achievements-data.js','achievement-engine.js'])vm.runInContext(fs.readFileSync(require.resolve('../'+file),'utf8'),sandbox);
    sandbox.window.DinoAchievements=sandbox.DinoAchievements;
  }
  vm.runInContext(source, sandbox);
  const api = sandbox.api;
  api.reset();
  api.advance = seconds => {
    for (let t = 0; t < seconds && ['running','upgrade'].includes(api.game.mode); t += 1 / 120) {
      if(api.game.mode==='upgrade')api.chooseUpgrade('skip');
      api.update(1 / 120);
    }
  };
  return { ...api, elements, events, draws, storage, achievements:sandbox.DinoAchievements, discovery:sandbox.window.DinoDiscovery,window:sandbox.window };
}

function terrainControls(a,speed){
  const incoming=a.game.terrain.filter(t=>t.x+t.w>a.dino.x+5);
  const duck=incoming.some(t=>t.kind==='vine'&&t.x<a.dino.x+70);
  a.events[duck?'keydown':'keyup']({code:'ArrowDown',preventDefault(){}});
  for(const t of incoming){
    if(t.kind==='vine')continue;
    const lead=(t.x-(a.dino.x+(t.kind==='gap'?23:36)))/speed;
    if(t.kind==='crystal'&&t.h>100){
      if(!t.first&&lead<.65&&lead>0&&a.dino.grounded){a.jump();t.first=true;}
      if(t.first&&!t.second&&lead<.29&&lead>0){a.jump();t.second=true;}
    }else if(!t.first&&lead<(t.kind==='gap'?.14:.28)&&lead>-.03&&a.dino.grounded){a.jump();t.first=true;}
    if(a.game.slow>0&&t.kind==='gap'&&t.w/speed>.55&&a.gapUnderfoot()===t&&a.dino.jumps===1&&a.dino.vy>120)a.jump();
    if(a.game.slow>0&&t.kind!=='gap'&&t.first&&!t.second&&a.dino.jumps===1&&a.dino.vy>0){a.jump();t.second=true;}
  }
}

test('two jumps are allowed, a third is blocked, and landing restores jumps', () => {
  const a = setup();
  a.jump(); a.advance(.15);
  assert.ok(a.dino.y < 247);
  a.jump(); a.advance(.1);
  const vy = a.dino.vy;
  a.jump();
  assert.equal(a.dino.jumps, 2);
  assert.equal(a.dino.vy, vy);
  a.advance(1);
  assert.equal(a.dino.grounded, true);
  assert.equal(a.dino.jumps, 0);
});

test('no clip passes through hazards, flashes red and counts one contact per hazard',()=>{
  const a=setup();a.setAssistMode('noclip');a.game.nextBoss=Infinity;a.game.invincible=0;
  const wall={x:90,y:220,w:90,h:72,type:'cactus',vx:.01};a.game.obstacles=[wall];
  for(let i=0;i<20;i++)a.update(1/120);
  assert.equal(a.game.mode,'running');assert.equal(a.game.trainingDeaths,1);assert.equal(a.game.revivesUsed,0);
  a.updateHUD();assert.ok(Number(a.elements.get('death-flash').style.opacity)>0);
  a.game.obstacles.push({x:90,y:220,w:90,h:72,type:'cactus',vx:.01});a.update(.01);assert.equal(a.game.trainingDeaths,2);
});

test('no clip never ends any of the nine hidden-door modes, even with no input',()=>{
  for(let variant=0;variant<9;variant++){
    const a=setup(390,42,new Map(),false,true);a.setAssistMode('noclip');a.offerPortal('hidden',variant);a.choosePortal(true);
    for(let t=0;t<19&&a.game.challenge;t+=1/120)a.update(1/120);
    assert.equal(a.game.mode,'running',`variant ${variant}`);assert.equal(a.game.challenge,null);assert.equal(a.game.revivesUsed,0);
    assert.ok(a.game.trainingDeaths>0&&a.game.trainingDeaths<50,`one count per contact: ${variant}/${a.game.trainingDeaths}`);
  }
});

test('practice can continue from the death location without resetting score or using an egg',()=>{
  const a=setup();a.setAssistMode('practice');a.game.nextBoss=Infinity;a.game.invincible=0;a.game.bonus=420;
  const obstacle={x:90,y:220,w:90,h:72,type:'cactus',vx:.01};a.game.obstacles=[obstacle];a.update(.01);
  const score=a.score(),distance=a.game.distance;
  assert.equal(a.game.mode,'practice-death');assert.equal(a.game.trainingDeaths,1);
  a.resumePractice(false);assert.equal(a.game.mode,'running');assert.equal(a.score(),score);assert.equal(a.game.distance,distance);
  assert.equal(a.game.revivesUsed,0);assert.equal(obstacle.hit,true);a.update(.1);assert.equal(a.game.mode,'running');
});

test('practice retry restores the checkpoint map and RNG instead of rerolling the section',()=>{
  const a=setup();a.setAssistMode('practice');a.game.nextBoss=Infinity;a.game.invincible=0;a.captureCheckpoint(true,true);
  const signature=()=>a.game.obstacles.map(({type,x,y,w,h})=>({type,x,y,w,h}));
  for(let i=0;i<5;i++)a.spawnObstacle();const first=JSON.stringify(signature());
  a.offerRevive();assert.equal(a.game.mode,'practice-death');a.resumePractice(true);
  assert.equal(a.game.obstacles.length,0);assert.equal(a.game.trainingDeaths,1);
  for(let i=0;i<5;i++)a.spawnObstacle();assert.equal(JSON.stringify(signature()),first);
});

test('practice retries and continues inside a hidden door instead of ending the run',()=>{
  const a=setup(390,42,new Map(),false,true);a.setAssistMode('practice');a.offerPortal('hidden',4);a.choosePortal(true);
  const stage=a.game.challenge.engine,start=JSON.stringify(stage.snapshot());
  for(let t=0;t<3&&a.game.mode==='running';t+=1/120)a.update(1/120);
  assert.equal(a.game.mode,'practice-death');a.resumePractice(true);
  assert.equal(a.game.mode,'running');assert.equal(JSON.stringify(stage.snapshot()),start);assert.equal(a.game.trainingDeaths,1);
  for(let t=0;t<3&&a.game.mode==='running';t+=1/120)a.update(1/120);
  assert.equal(a.game.mode,'practice-death');a.resumePractice(false);assert.equal(a.game.mode,'running');
  assert.equal(a.game.challenge.engine,stage);assert.equal(stage.dead,false);assert.equal(a.game.trainingDeaths,2);assert.equal(a.game.revivesUsed,0);
});

test('training modes persist as a preference and cannot award normal records or museum pieces',()=>{
  const storage=new Map([['dino-jumper-best','999']]),a=setup(1000,42,storage,true,true);
  const stats=JSON.stringify(a.achievements.state.stats);a.setAssistMode('noclip');a.game.bonus=10000;
  a.collectPickup({x:0,y:0,type:'fossil'});a.endRun();
  assert.equal(storage.get('dino-jumper-best'),'999');assert.equal(JSON.stringify(a.achievements.state.stats),stats);assert.equal(a.discovery.found.length,0);
  const b=setup(1000,42,storage,false,true);assert.equal(b.game.assistMode,'noclip');assert.equal(b.game.trainingDeaths,0);
  a.setAssistMode('normal');assert.equal(a.game.assisted,true);a.reset();assert.equal(a.game.assisted,false);
});

test('no clip completes every boss without deaths ending the run or consuming eggs',()=>{
  for(let level=1;level<=10;level++){
    const a=setup();a.setAssistMode('noclip');a.game.bossesDefeated=level-1;a.game.nextBoss=Infinity;
    a.spawnBoss(level);const duration=a.game.boss.duration;a.advance(duration+.02);
    assert.equal(a.game.boss,null,`boss ${level}`);assert.equal(a.game.mode,level===10?'won':'running');
    assert.equal(a.game.revivesUsed,0);assert.ok(a.game.trainingDeaths>0);
  }
});

test('practice keeps a mechanical boss and its elapsed timer when continuing after death',()=>{
  const a=setup();a.setAssistMode('practice');a.game.bossesDefeated=8;a.game.nextBoss=Infinity;a.spawnBoss(9);a.game.invincible=0;
  for(let t=0;t<3&&a.game.mode==='running';t+=1/120)a.update(1/120);
  assert.equal(a.game.mode,'practice-death');const engine=a.game.boss.engine,age=a.game.boss.age;
  a.resumePractice(false);assert.equal(a.game.mode,'running');assert.equal(a.game.boss.engine,engine);assert.equal(a.game.boss.age,age);
  assert.equal(engine.dead,false);assert.equal(a.game.revivesUsed,0);
});

test('automatic practice checkpoints advance to safe spots near the current section',()=>{
  const a=setup(1000,42,new Map(),false,true);a.setAssistMode('practice');a.offerPortal('hidden',6);a.choosePortal(true);const stage=a.game.challenge.engine;
  for(let t=0;t<8&&a.game.mode==='running';t+=1/120){const input=driveTrial(stage,()=>a.jump());a.events[input.duck?'keydown':'keyup']({code:'ArrowDown',preventDefault(){}});a.update(1/120);}
  assert.equal(a.game.mode,'running');a.offerRevive();a.resumePractice(true);
  assert.ok(stage.age>6&&stage.age<8,'retry should return to a recent safe beat, not the portal entrance');
});

test('museum pieces never duplicate, persist, and tolerate malformed or blocked storage',()=>{
  const storage=new Map(),a=setup(1000,42,storage,false,true),pieces=new Set();
  for(let i=0;i<16;i++)pieces.add(a.discovery.uncover());
  assert.equal(pieces.size,16);assert.equal(a.discovery.uncover(),null);
  assert.equal(setup(1000,1,storage,false,true).discovery.found.length,16);
  assert.equal(setup(1000,1,new Map([['dino-jumper-museum-v1','{oops']]),false,true).discovery.found.length,0);
  const blocked=new Map();blocked.set=()=>{throw Error('blocked');};assert.ok(setup(1000,1,blocked,false,true).discovery.uncover());
});

test('jump sound is optional and mute persists without requiring an audio device',()=>{
  const storage=new Map(),a=setup(1000,1,storage,false,true);
  a.discovery.sound();assert.equal(a.discovery.toggleSound(),true);a.discovery.sound(true);
  assert.equal(setup(1000,1,storage,false,true).discovery.muted,true);
});

test('all six biome mutations render without changing speed or jump physics',()=>{
  const a=setup(1000,1,new Map(),false,true),names=new Set();
  for(let i=0;i<6;i++){a.game.mutations[0]=i;const theme=a.activeTheme();names.add(theme.name);a.draw();assert.equal(a.game.speed,500);assert.equal(a.dino.vy,0);}
  assert.equal(names.size,6);
});

test('every run starts in the plain desert and later biome orders are shuffled without duplicates',()=>{
  const orders=new Set();
  for(let seed=1;seed<=60;seed++){
    const a=setup(1000,seed,new Map(),false,true);
    assert.equal(a.activeTheme().name,'DESERT');assert.equal(a.game.mutations[0],undefined);
    assert.equal(a.game.biomeOrder[0],0);assert.equal(new Set(a.game.biomeOrder).size,55);orders.add(a.game.biomeOrder.join(','));
  }
  assert.ok(orders.size>50);
});

test('browser crypto supplies gameplay randomness when available',()=>{
  const a=setup(1000,1,new Map(),false,true);let calls=0;
  a.window.crypto={getRandomValues(values){calls++;values[0]=2147483648;return values;}};
  assert.equal(a.discovery.random(),.5);assert.equal(calls,1);
});

test('all six hidden destinations appear in shuffled bags and portal choices are unique and selectable',()=>{
  const a=setup(1000,1,new Map(),false,true),names=new Set();
  a.game.mutationBag=[];for(let i=0;i<6;i++)names.add(a.nextMutation());assert.equal(names.size,6);
  a.offerPortal('hidden',4);assert.equal(a.game.portalOffers[0],4);assert.equal(new Set(a.game.portalOffers).size,3);
  const destination=a.game.portalOffers[2];a.selectPortal(destination);a.choosePortal(true);
  assert.equal(a.game.challenge.variant,destination);assert.match(a.activeTheme().name,new RegExp(a.discovery.mutations[destination].name));
});

test('the first secret route is an actual staircase with a labeled destination gate',()=>{
  for(const width of [390,1000]){
    const a=setup(width,42,new Map(),false,true);a.spawnRoute();
    assert.equal(a.game.platforms.length,5);assert.ok(a.game.platforms.every(p=>p.stairs));
    for(let i=1;i<5;i++)assert.ok(a.game.platforms[i].y<a.game.platforms[i-1].y);
    const gate=a.game.pickups.find(p=>p.type==='portal');assert.ok(gate);assert.equal(gate.destination,a.game.platforms[4].destination);a.draw();
  }
});

test('hidden staircase gates can be reached using normal jumps at both speeds and screen widths',()=>{
  for(const width of [390,1000])for(const speed of [500,920]){
    let reached=false;
    for(const lead of [.3,.5,.7,.9])for(const secondDelay of [.15,.25,.35]){
      if(reached)continue;
      const a=setup(width,42,new Map(),false,true);a.game.completed=true;a.game.nextBoss=Infinity;
      a.game.distance=(speed-500)*32;a.game.speed=speed;
      for(const key of ['nextObstacle','nextRoute','nextEvent','nextTrail','nextTerrain','nextTraveler','nextPickup'])a.game[key]=100;
      a.spawnRoute();const arrival=(a.game.platforms[0].x-a.dino.x)/speed;let first=false,second=false,firstAt=0;
      for(let t=0;t<8&&a.game.mode==='running';t+=1/120){
        if(!first&&t>=arrival-lead){a.jump();first=true;firstAt=t;}
        if(first&&!second&&t>=firstAt+secondDelay){a.jump();second=true;}
        if(second&&a.dino.grounded&&a.game.platforms.some(p=>p.y<a.dino.y+45-5&&p.x>a.dino.x&&p.x<a.dino.x+a.game.speed*.45))a.jump();
        a.update(1/120);
      }
      reached=a.game.mode==='portal-offer';
    }
    assert.ok(reached,`${width}/${speed}: staircase gate must be reachable`);
  }
});

test('randomized terrain changes its count, dimensions and spacing across runs',()=>{
  for(const kind of ['void','lava','thorns','crystal','geyser','meteor']){
    const signatures=new Set();
    for(let seed=1;seed<=30;seed++){
      const a=setup(1000,seed,new Map(),false,true);a.spawnTerrain(kind,true);
      signatures.add(JSON.stringify(a.game.terrain.map(t=>[t.kind,t.x,t.w,t.h])));
    }
    assert.ok(signatures.size>25,kind);
  }
});

test('once a dinosaur falls below the void lip, jumping or phase cannot rescue it',()=>{
  const a=setup(390,1,new Map(),false,true);a.game.nextObstacle=100;a.game.revivesUsed=2;
  a.game.terrain=[{kind:'gap',x:0,w:3000}];a.advance(.18);assert.equal(a.game.voidFalling,true);
  const velocity=a.dino.vy;a.jump();a.phaseDash();assert.equal(a.dino.vy,velocity);
  a.advance(.5);assert.equal(a.game.mode,'over');
});

test('portal death ends the entire run despite unused eggs and shields',()=>{
  const a=setup(1000,1,new Map(),false,true);a.game.shield=5;a.game.slow=3;
  const old={x:500,y:250,w:30,h:42,type:'cactus'};a.game.obstacles.push(old);
  assert.equal(a.offerPortal('traveler'),true);const distance=a.game.distance;
  a.jump();assert.equal(a.dino.jumps,0);assert.equal(a.choosePortal(false),true);assert.equal(a.game.obstacles[0],old);
  a.offerPortal('hidden');a.choosePortal(true);while(a.game.challenge)a.update(1/120);
  assert.equal(a.game.challenge,null);assert.equal(a.game.revivesUsed,0);assert.equal(a.game.distance,distance);
  assert.equal(a.game.shield,5);assert.equal(a.game.slow,3);assert.equal(a.game.obstacles[0],old);
  assert.equal(a.discovery.found.length,0);assert.equal(a.game.mode,'over');a.useRevive();assert.equal(a.game.mode,'over');
});

test('all nine portal modes have survivable control sequences at the preserved entry speed',()=>{
  for(const width of [390,1000])for(const seed of [1,42,77])for(let variant=0;variant<9;variant++){
    const a=setup(width,seed,new Map(),false,true);a.game.distance=4000;a.game.speed=720;a.game.shield=0;
    a.offerPortal('traveler',variant);a.choosePortal(true);const stage=a.game.challenge.engine;
    assert.equal(stage.speed,720);assert.equal(stage.variant,variant);
    for(let time=0;time<19&&a.game.challenge;time+=1/120){
      const input=driveTrial(stage,()=>a.jump());
      a.events[input.held?'keydown':'keyup']({code:'Space',preventDefault(){}});
      a.events[input.duck?'keydown':'keyup']({code:'ArrowDown',preventDefault(){}});a.update(1/120);
    }
    assert.equal(a.game.mode,'running',width+'/'+seed+'/'+variant+': '+stage.reason);
    assert.equal(a.game.challenge,null);assert.ok(a.game.bonus>=450);assert.equal(a.discovery.found.length,1);
    assert.equal(a.game.revivesUsed,0);assert.equal(a.game.distance,4000);
  }
});

test('mutations preserve entry speed, pay double distance points, and restore the main run on success',()=>{
  const a=setup(1000,42,new Map(),false,true);a.game.speed=720;a.game.nextBoss=Infinity;
  a.offerPortal('hidden',8);a.choosePortal(true);const stage=a.game.challenge.engine;
  a.update(.2);assert.equal(stage.speed,720);assert.equal(a.game.speed,720);assert.equal(a.score(),28);
  const b=setup(1000,42,new Map(),false,true);b.game.nextBoss=Infinity;b.game.speed=720;b.game.mutations[0]=0;
  b.update(.2);assert.equal(b.game.mutationStage.speed,720);assert.equal(b.game.speed,720);assert.equal(b.score(),28);
});

test('55 regular regions and nine shuffled mutations cover 25,000 points without a repeated world',()=>{
  const a=setup(1000,42,new Map(),false,true);assert.equal(a.BIOMES.length,55);assert.equal(a.discovery.mutations.length,9);
  const names=Array.from({length:9},(_,i)=>a.getBiome(a.game.biomeOrder[i]).name);assert.equal(new Set(names).size,9);
  a.game.mutationBag=[];assert.equal(new Set(Array.from({length:9},()=>a.nextMutation())).size,9);
});

test('the five additional campaign bosses have complete, collision-respecting winning inputs',()=>{
  for(const width of [390,1000])for(const initialSpeed of [500,920])for(const seed of [1,42,77])for(let level=6;level<=10;level++){
    const a=setup(width,seed);a.game.speed=initialSpeed;a.game.bossesDefeated=level-1;a.game.nextBoss=Infinity;
    a.spawnBoss(level);a.game.invincible=0;a.game.revivesUsed=2;const stage=a.game.boss.engine;
    assert.ok(stage.speed>initialSpeed);
    for(let time=0;time<23&&a.game.boss&&a.game.mode==='running';time+=1/120){
      const input=driveTrial(stage,()=>a.jump());a.events[input.held?'keydown':'keyup']({code:'Space',preventDefault(){}});
      a.events[input.duck?'keydown':'keyup']({code:'ArrowDown',preventDefault(){}});a.update(1/120);
    }
    assert.equal(a.game.mode,level===10?'won':level%2===0?'upgrade':'running',`${width}/${initialSpeed}/${seed}/${level}: ${stage.reason}`);
    assert.equal(a.game.boss,null);assert.equal(a.game.bossesDefeated,level);assert.equal(a.game.shield,0);assert.equal(a.game.phaseCooldown,0);
  }
});

test('the late campaign starts at 8,000 and ends with the final boss at 25,000',()=>{
  const a=setup();a.game.invincible=100;
  for(let level=6;level<=10;level++){
    a.game.boss=null;a.game.bossRest=0;a.game.mode='running';a.game.bossesDefeated=level-1;
    a.game.bonus=0;a.game.distance=a.BOSS_MILESTONES[level-1]*10;a.game.nextBoss=a.BOSS_MILESTONES[level-1];
    a.update(.0001);assert.equal(a.game.boss.level,level);assert.equal(a.game.nextBoss,a.BOSS_MILESTONES[level]??Infinity);
    a.game.boss.age=a.game.boss.duration-.001;a.update(.002);
    assert.equal(a.game.boss,null);
  }
  assert.equal(a.game.completed,true);assert.equal(a.game.mode,'won');assert.ok(a.score()>=25000);
});

test('holding the jump key in jetpack mode continuously changes height, and release stops thrust',()=>{
  const a=setup(1000,42,new Map(),false,true);a.offerPortal('hidden',8);a.choosePortal(true);
  a.events.keydown({code:'Space',preventDefault(){}});for(let t=0;t<.4;t+=1/120)a.update(1/120);
  const stage=a.game.challenge.engine,fuel=stage.player.fuel;assert.ok(stage.player.y<90);
  a.events.keyup({code:'Space',preventDefault(){}});for(let t=0;t<.3;t+=1/120)a.update(1/120);
  assert.ok(stage.player.fuel>fuel);assert.ok(stage.player.vy>-40);
});

test('normal and mutated terrain sequences are traversable at both speeds, widths, and in slow motion',()=>{
  for(const width of [390,1000])for(const speed of [500,920])for(const slow of [false,true])for(const hard of [false,true])for(const kind of ['void','lava','thorns','crystal','meteor','geyser']){
    const a=setup(width,42,new Map(),false,true);a.game.distance=(speed-500)*32;a.game.speed=speed;
    a.game.completed=true;a.game.nextBoss=Infinity;a.game.nextObstacle=100;a.game.nextEvent=100;a.game.nextRoute=100;a.game.nextTrail=100;a.game.nextTerrain=100;a.game.nextTraveler=100;a.game.revivesUsed=2;a.game.invincible=0;
    a.spawnTerrain(kind,hard,speed);if(slow)a.game.slow=30;
    for(let t=0;t<16&&a.game.terrain.length&&a.game.mode==='running';t+=1/120){terrainControls(a,a.game.speed*(slow?.58:1));a.update(1/120);if(t<.05)a.draw();}
    assert.equal(a.game.mode,'running',`${width}/${speed}/${slow}/${hard}/${kind}`);assert.equal(a.game.terrain.length,0);assert.equal(a.game.shield,0);
    assert.ok(a.game.bonus>=(hard?60:25),'clean passage gives its bonus');
  }
});

test('void falls kill even with a shield or phase; reviving restores safe ground',()=>{
  const a=setup(390,1,new Map(),false,true);a.game.nextObstacle=100;a.game.shield=10;a.game.invincible=100;
  a.game.terrain=[{kind:'gap',x:0,w:3000,lava:false}];a.advance(.7);
  assert.equal(a.game.mode,'revive');assert.ok(a.dino.y>340);assert.ok(a.game.shield>9,'the fall bypasses the shield instead of consuming it');
  a.useRevive();assert.equal(a.game.terrain.length,0);assert.equal(a.dino.y,247);a.advance(.2);assert.equal(a.game.mode,'running');
});

test('biome borders retain old terrain and bosses wait until the last gap has passed',()=>{
  const a=setup(390,1,new Map(),false,true);a.game.nextObstacle=100;a.game.invincible=100;
  a.game.terrain=[{kind:'gap',x:500,w:100,biome:0,bg:'#fff',ink:'#555',faint:'#ddd'}];
  const gap=a.game.terrain[0];a.game.distance=30000;a.synchronizeBiome();assert.equal(a.game.terrain[0],gap);
  a.game.nextBoss=1000;a.update(.001);assert.equal(a.game.boss,null);
  a.game.terrain=[];a.update(.001);assert.equal(a.game.boss.level,1);
});

test('all regular scenery families select themed terrain and mutations override their source biome',()=>{
  const a=setup(1000,1,new Map(),false,true);const kinds=new Set(a.BIOMES.map(b=>a.terrainKind(b)));
  assert.ok(kinds.size>=5);assert.equal(a.terrainKind(a.BIOMES[2]),'lava');
  a.game.mutations[0]=0;assert.equal(a.terrainKind(),'void');assert.ok(a.activeTheme().obstacles.includes('crater'));
  a.game.mutations[0]=5;assert.equal(a.terrainKind(),'lava');assert.ok(a.activeTheme().obstacles.includes('lava-rock'));
});

test('a traveler invitation cannot deadlock with a pending terrain passage',()=>{
  const a=setup(1000,42,new Map(),false,true);a.game.terrainWaiting=true;a.game.nextTraveler=0;
  a.game.travelerWaiting=true;a.game.obstacles=[];a.game.platforms=[];
  a.update(.01);a.update(.01);assert.equal(a.game.mode,'portal-offer');
  assert.equal(a.game.terrainWaiting,false);
});

test('fossil trails grant a full-set bonus and keep individual rewards on a miss',()=>{
  const a=setup(1000,1,new Map(),false,true);a.spawnFossilTrail();const tokens=[...a.game.pickups];
  for(const p of tokens)a.collectPickup(p);
  assert.equal(a.game.bonus,225);assert.equal(a.game.trail,null);assert.equal(a.game.runFossils,5);
  const b=setup(1000,1,new Map(),false,true);b.spawnFossilTrail();b.collectPickup(b.game.pickups[0]);
  b.game.pickups=[];b.update(.01);assert.equal(b.game.bonus,25);assert.equal(b.game.trail,null);
});

test('fossil trails follow a reachable single-jump arc at both speeds and widths',()=>{
  for(const width of [390,1000])for(const speed of [500,920]){
    let solved=false;
    for(const lead of [.02,.06,.10,.14,.18,.22]){
      const a=setup(width,1,new Map(),false,true);a.game.completed=true;a.game.nextBoss=Infinity;
      a.game.distance=(speed-500)*32;a.game.speed=speed;a.game.nextObstacle=100;a.game.nextEvent=100;a.game.nextRoute=100;a.game.nextTrail=100;a.game.nextTraveler=100;
      a.spawnFossilTrail();let jumped=false;
      const arrival=(a.game.pickups[0].x-a.dino.x)/speed;
      for(let t=0;t<arrival+1&&a.game.mode==='running';t+=1/120){if(!jumped&&t>=arrival-lead){a.jump();jumped=true;}a.update(1/120);}
      if(a.game.runFossils===5){solved=true;break;}
    }
    assert.ok(solved,`trail ${width} / ${speed}`);
  }
});

test('double jump can land on a secret ledge and collect its bonus', () => {
  const a = setup();
  a.game.nextObstacle = 100;
  a.game.platforms.push({ x: 80, y: 177, w: 700, h: 8 });
  a.jump(); a.advance(.15); a.jump();
  a.advance(.7);
  assert.equal(a.dino.y, 132);
  assert.equal(a.game.routeActive, true);
  a.game.pickups.push({ x: 124, y: 140, w: 19, h: 19, type: 'bonus' });
  a.advance(.01);
  assert.equal(a.game.bonus, 25);
});

test('a shield absorbs one hit; a later unshielded hit ends the run', () => {
  const a = setup();
  const obstacle = () => ({ x: 115, y: 250, w: 24, h: 42, type: 'cactus' });
  a.game.revivesUsed=2;
  a.game.invincible = 0; a.game.shield = 10;
  a.game.obstacles.push(obstacle()); a.advance(.01);
  assert.equal(a.game.mode, 'running');
  assert.equal(a.game.shield, 0);
  a.game.invincible = 0;
  a.game.obstacles.push(obstacle()); a.advance(.01);
  assert.equal(a.game.mode, 'over');
});

test('power-up pickups activate and expire, and slow time preserves jump physics', () => {
  const a = setup(), b = setup();
  a.game.pickups.push({ x: 124, y: 255, w: 23, h: 23, type: 'slow' });
  a.advance(.01);
  assert.ok(a.game.slow > 6);
  a.reset(); a.game.slow = 7;
  a.jump(); b.jump(); a.advance(.3); b.advance(.3);
  assert.ok(a.game.distance < b.game.distance * .6);
  assert.equal(a.dino.y, b.dino.y);
  a.game.nextObstacle = 100; a.game.nextPickup = 100; a.advance(7);
  assert.equal(a.game.slow, 0);
});

test('biomes advance every 3000 displayed points, including bonuses, without looping', () => {
  const a = setup();
  a.game.nextBoss=Infinity;a.game.bonus = 2900; a.update(.001);
  assert.equal(a.game.biome, 0);
  assert.equal(a.game.boss, null);
  a.game.distance = 1000; a.update(.001); assert.equal(a.game.biome, 1);
  a.game.distance = 61000; a.update(.001); assert.equal(a.game.biome, 3);
  a.game.bonus=0;a.game.distance=29999;a.update(.00001);assert.equal(a.game.biome,0);
  a.game.distance=30000;a.update(.00001);assert.equal(a.game.biome,1);
  a.game.distance=1440000;a.update(.00001);assert.equal(a.game.biome,48);
});

test('boss arrival waits for old hazards to leave, then generates shots and rewards survival', () => {
  const a = setup();
  const old={x:400,y:252,w:24,h:40,type:'cactus'};a.game.obstacles.push(old);
  a.game.distance = 10000; a.update(.001);a.chooseUpgrade('skip');
  assert.equal(a.game.boss,null);assert.ok(a.game.obstacles.includes(old));
  a.game.invincible=100;a.advance(1);
  assert.ok(a.game.boss);
  assert.equal(a.game.obstacles.length, 0);
  assert.equal(a.game.nextBoss, 2000);
  a.game.boss.age=0;a.game.boss.shot=.8;
  a.game.invincible = 30;
  a.advance(4);
  assert.ok(a.game.obstacles.some(o => o.type === 'ball'));
  a.advance(a.game.boss.duration-a.game.boss.age+.01);
  assert.equal(a.game.boss, null);
  assert.equal(a.game.bonus, 50);
});

test('ducking avoids a high projectile while standing collides', () => {
  const a = setup();
  a.game.revivesUsed=2;
  a.game.invincible = 0;
  a.events.keydown({ code: 'ArrowDown', preventDefault() {} });
  a.game.obstacles.push({ x: 120, y: 239, w: 24, h: 24, type: 'ball' });
  a.advance(.01);
  assert.equal(a.game.mode, 'running');
  a.events.keyup({ code: 'ArrowDown' });
  a.advance(.01);
  assert.equal(a.game.mode, 'over');
});

test('pause freezes the loop, resume continues, and restart clears all effects', () => {
  const a = setup();
  a.togglePause();
  a.frame(1000); a.frame(2000);
  assert.equal(a.game.distance, 0);
  a.togglePause(); a.frame(2100); a.frame(2200);
  assert.ok(a.game.distance > 0);
  a.game.shield = 10; a.game.bonus = 90; a.spawnRoute(); a.spawnBoss();
  a.reset();
  assert.equal(a.game.bonus, 0); assert.equal(a.game.shield, 0);
  assert.equal(a.game.platforms.length, 0); assert.equal(a.game.boss, null);
});

test('desktop and phone canvases render every biome and game feature', () => {
  for (const width of [390, 1000]) {
    const a = setup(width);
    assert.equal(a.elements.get('#game').width, width < 650 ? 600 : 1000);
    a.spawnRoute(); a.game.shield = 10; a.game.slow = 7;
    for (let biome=0;biome<a.BIOMES.length+5;biome++) { a.game.biome = biome; a.draw(); }
    a.spawnBoss(); a.draw();
  }
});

test('obstacles vary across runs in type, dimensions, starting position and timing', () => {
  const a=setup();
  const patterns=new Set(),timings=new Set();
  for(let i=0;i<30;i++) {
    a.reset();timings.add(a.game.nextObstacle.toFixed(3));
    a.spawnObstacle();
    const o=a.game.obstacles[0];patterns.add(`${o.type}/${o.w}/${o.h}/${o.x.toFixed(2)}`);
  }
  assert.ok(patterns.size>25);assert.ok(timings.size>25);
  const b=setup(1000,5678);b.spawnObstacle();
  assert.notEqual(b.game.obstacles[0].x,a.game.obstacles[0].x);
});

test('each biome spawns its own obstacles and announces entry with a sign', () => {
  const a=setup();
  for(let biome=0;biome<a.BIOMES.length;biome++) {
    a.game.biome=biome;a.game.distance=0;
    const types=new Set();
    for(let i=0;i<20;i++) {a.spawnObstacle();types.add(a.game.obstacles.at(-1).type);}
    assert.equal(types.size,3);
    assert.ok([...types].every(type=>a.BIOMES[biome].obstacles.includes(type)));
  }
  a.game.distance=30000;a.game.biome=0;a.game.nextBoss=Infinity;a.update(.01);
  assert.equal(a.game.biome,1);assert.ok(a.game.biomeSign>3);
  assert.match(a.game.message,/NEW BIOME.*SNOWFIELD/);
});

test('speed starts at 500, rises quickly, and is capped at 920', () => {
  const a=setup();assert.equal(a.game.speed,500);
  a.game.nextBoss=Infinity;a.game.distance=6400;a.update(.001);assert.ok(a.game.speed>=700);
  a.game.distance=100000;a.update(.01);assert.equal(a.game.speed,920);
});

test('all five bosses have distinct attacks, warnings, increasing duration and rewards', () => {
  const a=setup();
  const expected=[['ball'],['laser'],['siege-rock'],['terrain'],['mirror','laser']];
  let previousDuration=0;
  for(let level=1;level<=5;level++) {
    a.game.nextBoss=Infinity;a.spawnBoss();const boss=a.game.boss;
    assert.equal(boss.level,level);assert.ok(boss.duration>previousDuration);
    previousDuration=boss.duration;
    const types=new Set();
    for(let i=0;i<35;i++) {
      a.game.warnings=[];a.bossAttack(boss);
      for(const warning of a.game.warnings) {
        assert.ok(warning.delay>=.45);types.add(warning.type);
        a.launchAttack(warning);
      }
    }
    assert.ok(expected[level-1].every(type=>types.has(type)));
    a.draw();
    a.game.obstacles=[];a.game.warnings=[];a.game.invincible=100;
    const bonus=a.game.bonus;a.advance(boss.duration+.02);
    assert.equal(a.game.boss,null);assert.equal(a.game.bossesDefeated,level);
    assert.equal(a.game.bonus-bonus,level*50);
    assert.equal(a.game.nextBoss,Infinity);assert.equal(a.game.completed,false);
  }
  a.spawnBoss();assert.equal(a.game.boss.level,6);
});

test('bird chooses six non-repeating multi-ball patterns with random cooldowns', () => {
  const a=setup();a.spawnBoss(1);
  const timings=new Set(),lanes=new Set(),patterns=new Set();let burst=false,lastPattern='';
  for(let i=0;i<40;i++) {
    a.game.warnings=[];a.bossAttack(a.game.boss);
    assert.notEqual(a.game.boss.lastPattern,lastPattern);lastPattern=a.game.boss.lastPattern;
    patterns.add(lastPattern);assert.ok(a.game.boss.laneStreak<=2);
    assert.ok(a.game.warnings.length>=2);
    a.game.warnings.forEach(w=>{lanes.add(w.high);timings.add(w.spacing||0);assert.ok(w.delay>=.45&&w.delay<=.53);});
    burst=true;
  }
  assert.equal(lanes.size,2);assert.ok(burst);assert.ok(timings.size>1);
  assert.equal(patterns.size,6);
  a.game.warnings=[];a.game.boss.shot=0;a.update(.01);
  assert.ok(a.game.boss.shot>=.92 && a.game.boss.shot<=1.23);
  const intervals=new Set();
  for(let i=0;i<20;i++) {
    a.game.warnings=[];a.game.obstacles=[];a.game.boss.shot=0;
    a.update(.001);intervals.add(a.game.boss.shot.toFixed(3));
  }
  assert.ok(intervals.size>15);
});

test('exactly two revivals preserve progress, clear hazards, and cannot be bypassed', () => {
  const a=setup();a.spawnBoss(2);a.game.boss.age=3;a.game.bonus=125;
  a.game.distance=14000;a.game.biome=1;
  a.game.perks.magnet=2;
  const score=a.score(),age=a.game.boss.age;
  for(let i=0;i<2;i++) {
    a.game.obstacles.push({x:120,y:250,w:20,h:30});a.game.invincible=0;
    a.offerRevive();assert.equal(a.game.mode,'revive');
    const distance=a.game.distance;a.frame(1000+i*500);a.frame(1200+i*500);
    assert.equal(a.game.distance,distance);
    a.useRevive();assert.equal(a.game.mode,'running');
    assert.equal(a.game.revivesUsed,i+1);assert.equal(a.score(),score);
    assert.equal(a.game.boss.age,age);assert.equal(a.game.perks.magnet,2);
    assert.equal(a.game.obstacles.length,0);assert.equal(a.game.warnings.length,0);
    assert.ok(a.game.invincible>=2);assert.equal(a.dino.grounded,true);
  }
  a.offerRevive();assert.equal(a.game.mode,'over');a.useRevive();
  assert.equal(a.game.mode,'over');assert.equal(a.game.revivesUsed,2);
  assert.equal(a.journal.revives,2);
  a.reset();assert.equal(a.game.revivesUsed,0);assert.equal(a.game.perks.magnet,0);
});

test('bosses arrive at fixed 1000-point milestones and fight lengths are randomized around eleven to fifteen seconds', () => {
  const a=setup();a.game.invincible=100;
  for(let level=1;level<=5;level++) {
    a.game.bossRest=0;a.game.distance=(level*1000-a.game.bonus)*10;
    a.update(.0001);
    assert.equal(a.game.boss.level,level);assert.equal(a.game.nextBoss,a.BOSS_MILESTONES[level]);
    assert.equal(a.game.mode,'running');
    assert.ok(a.game.boss.duration>=10.7&&a.game.boss.duration<=15.3);
    const boss=a.game.boss;while(a.game.boss===boss&&a.game.mode==='running')a.update(1/120);
    assert.equal(a.game.boss,null);
    if(a.game.mode==='upgrade')a.chooseUpgrade('skip');
  }
  assert.equal(a.game.mode,'running');assert.equal(a.journal.bosses.length,5);assert.equal(a.game.nextBoss,8000);
});

test('biomes do not offer upgrades; upgrade choices pause, apply once, and resume', () => {
  const a=setup();a.game.distance=10000;a.update(.001);
  assert.equal(a.game.mode,'running');assert.equal(a.game.boss.level,1);
  a.openUpgrade();a.game.upgradeOffers=['shell','magnet','fall'];
  const distance=a.game.distance;a.frame(1000);a.frame(2000);
  assert.equal(a.game.distance,distance);
  a.chooseUpgrade('shell');assert.equal(a.game.perks.shell,1);
  a.chooseUpgrade('shell');assert.equal(a.game.perks.shell,1);
  a.collectPickup({x:0,y:0,type:'shield'});assert.equal(a.game.shield,12);
  a.game.nextBoss=Infinity;a.advance(.05);assert.equal(a.game.mode,'running');
  a.game.biome=2;a.openUpgrade();a.game.upgradeOffers=['shell','magnet','fall'];a.chooseUpgrade('fall');
  a.jump();a.advance(.4);a.events.keydown({code:'ArrowDown',preventDefault(){}});
  const vy=a.dino.vy;a.update(.01);assert.ok(a.dino.vy-vy>30);
});

test('fossils and fragments grant rewards while the magnet collects nearby pickups', () => {
  const a=setup();a.game.perks.fortune=1;
  a.collectPickup({x:0,y:0,type:'fossil'});
  assert.equal(a.game.bonus,35);assert.equal(a.game.runFossils,1);assert.equal(a.journal.fossils,1);
  for(let i=0;i<3;i++)a.collectPickup({x:0,y:0,type:'fragment'});
  assert.equal(a.game.fragments,0);assert.ok(a.game.shield>0);
  assert.equal(a.game.revivesUsed,0); // Shell fragments never exceed the two-revive cap.
  a.game.perks.magnet=4;
  a.game.pickups.push({x:150,y:220,w:19,h:19,type:'fossil'});
  a.advance(.12);assert.equal(a.game.pickups.length,0);assert.equal(a.game.runFossils,2);
});

test('all biome events work and boss arrival clears the event without extra hazards', () => {
  const a=setup();
  for(const kind of ['blizzard','meteor','stampede','fireflies']) {
    a.startEvent(kind);assert.equal(a.game.event.kind,kind);a.spawnObstacle();a.draw();
    if(kind==='stampede')assert.equal(a.game.obstacles.at(-1).type,'runner');
    if(kind==='meteor')assert.equal(a.game.obstacles.at(-1).startY,-40);
  }
  assert.ok(a.journal.secrets.filter(s=>s.startsWith('EVENT')).length===4);
  a.spawnBoss();assert.equal(a.game.event,null);
});

test('discoveries persist across new games and malformed storage cannot break the game', () => {
  const storage=new Map();const a=setup(1000,12345,storage);
  a.discover('secrets','A TEST SECRET');a.discover('bosses',a.BOSSES[0].name);
  a.collectPickup({x:0,y:0,type:'fossil'});
  const b=setup(1000,67890,storage);
  assert.ok(b.journal.secrets.includes('A TEST SECRET'));assert.equal(b.journal.bosses.length,1);
  assert.equal(b.journal.fossils,1);assert.equal(b.journal.runs,2);
  const broken=setup(1000,1,new Map([['dino-jumper-journal','{broken']]));
  assert.equal(broken.game.mode,'running');
});

test('high bird balls hit standing dino but clear its dedicated crouch sprite', () => {
  for(const duck of [false,true]) {
    const a=setup();a.spawnBoss(1);a.game.invincible=0;
    a.game.revivesUsed=2;
    if(duck)a.events.keydown({code:'ArrowDown',preventDefault(){}});
    a.launchAttack({type:'ball',high:true});
    const o=a.game.obstacles[0];o.x=120;o.age=1;
    a.update(.001);
    assert.equal(a.game.mode,duck?'running':'over');
  }
  const a=setup();a.draws.length=0;a.pixelDino(105,247,2,true,false);
  assert.ok(a.draws.some(call=>call[0]==='fillRect'));
  assert.ok(a.draws.filter(call=>call[0]==='fillRect').every(call=>call[3]===2&&call[4]===2));
  assert.ok(!a.draws.some(call=>call[0]==='scale'));
  assert.ok(a.DUCK_DINO.every(row=>row.length===24));
});

test('boulders bounce, falling hazards move, ledges crumble and shadow reacts to jumps', () => {
  const a=setup();a.spawnBoss(5);a.launchAttack({type:'boulder'});
  const rock=a.game.obstacles[0],initialY=rock.y;a.advance(.15);assert.notEqual(rock.y,initialY);
  a.spawnBoss(4);a.launchAttack({type:'rain'});
  const rain=a.game.obstacles[0],rainY=rain.y;a.advance(.1);assert.ok(rain.y>rainY);
  a.game.platforms=[{x:80,y:177,w:500,h:8,crumble:null}];
  a.dino.y=132;a.dino.vy=0;a.advance(.01);
  assert.ok(a.game.platforms[0].crumble>0);a.game.invincible=100;a.advance(.9);
  assert.equal(a.game.platforms.length,0);assert.ok(a.dino.y>132);
  a.spawnBoss(5);a.dino.jumps=0;a.jump();assert.equal(a.game.boss.echoes.length,0);assert.match(a.game.boss.reaction,/SHADOW/);
});

test('inventory explains revives, shield fragments, fossil value and live timers',()=>{
  const a=setup();a.game.revivesUsed=1;a.game.fragments=1;a.game.runFossils=4;
  a.game.shield=3.25;a.game.slow=2.5;a.game.perks.finder=1;a.game.perks.fortune=2;a.updateHUD();
  assert.equal(a.elements.get('eggs').textContent,'1 / 2 revives left');
  assert.equal(a.elements.get('fragments').textContent,'1 / 2 pieces');
  assert.equal(a.elements.get('fragment-meter').value,1);assert.equal(a.elements.get('fragment-meter').max,2);
  assert.equal(a.elements.get('fossils').textContent,'4 collected');assert.equal(a.elements.get('fossil-value').textContent,'+45 points each');
  assert.equal(a.elements.get('shield-timer').textContent,'3.3s · 1 hit');assert.equal(a.elements.get('slow-timer').textContent,'2.5s left');
});

test('dragon rift cages, high tides and ash seals are survivable without protection',()=>{
  for(const width of [390,1000])for(const speed of [500,920])for(const slow of [false,true])for(const seed of [1,42,12345,99999]) {
    const a=setup(width,seed);a.spawnBoss(4);a.game.bossesDefeated=3;a.game.nextBoss=Infinity;
    a.game.revivesUsed=2;a.game.invincible=0;if(slow)a.game.slow=30;a.game.distance=(speed-500)*32;a.game.speed=speed;
    const seen=new Set(),plans=[];let time=0,landed=false;
    while(a.game.boss&&a.game.mode==='running'&&time<28){
      for(const warning of a.game.warnings)if(!seen.has(warning)){
        seen.add(warning);assert.equal(warning.type,'terrain');plans.push({kind:warning.kind,impact:time+warning.delay/(slow?.58:1),jumped:false,second:false});
      }
      const duck=plans.some(p=>p.kind==='ash'&&time>=p.impact-.3&&time<=p.impact+(slow?.9:.55));
      a.events[duck?'keydown':'keyup']({code:'ArrowDown',preventDefault(){}});
      for(const p of plans)if(p.kind!=='ash'){
        if(!p.jumped&&time>=p.impact-(p.kind==='vault'?.65:.3)){a.jump();p.jumped=true;}
        if(p.kind==='vault'&&!p.second&&time>=p.impact-.28){a.jump();p.second=true;}
      }
      a.update(1/120);time+=1/120;
      if(a.dino.grounded&&a.dino.y<247)landed=true;
      assert.ok(new Set(a.game.obstacles.filter(o=>o.type==='terrain').map(o=>o.wave)).size<=1,'different pressure waves must not overlap');
    }
    assert.equal(a.game.mode,'upgrade',`width ${width}, speed ${speed}, seed ${seed}`);
    assert.equal(a.game.boss,null);assert.ok(seen.size>=3);assert.ok(landed,'single jump reaches the safe stone');
    assert.equal(a.game.shield,0);assert.equal(a.game.phaseCooldown,0);
  }
});

test('complete shadow mirror fights are survivable using jump, duck and double jump',()=>{
  for(const width of [390,1000])for(const speed of [500,920])for(const seed of [1,42,77,12345,99999]){
    const a=setup(width,seed);a.spawnBoss(5);a.game.bossesDefeated=4;a.game.nextBoss=Infinity;a.game.invincible=0;a.game.revivesUsed=2;
    a.game.distance=(speed-500)*32;a.game.speed=speed;
    const seen=new Set(),plans=new Map();let time=0;
    while(a.game.boss&&a.game.mode==='running'&&time<17){
      for(const w of a.game.warnings)if(!seen.has(w)){
        seen.add(w);const key=a.game.boss.volley;
        if(w.type==='laser')plans.set(key,{action:'double',impact:time+w.delay,first:false,second:false});
        else{
          const left=w.side==='left',velocity=left?(a.dino.x-20)/.45:(a.game.boss.x-a.dino.x)/.8;
          const travel=left?(a.dino.x+6-35)/velocity:(a.game.boss.x+3-a.dino.x-36)/velocity;
          const impact=time+w.delay+travel;
          if(!plans.has(key))plans.set(key,{action:w.high?'duck':'jump',impact,end:impact+.3,first:false});
          else {const p=plans.get(key);p.impact=Math.min(p.impact,impact);p.end=Math.max(p.end,impact+.3);}
        }
      }
      const values=[...plans.values()],duck=values.some(p=>p.action==='duck'&&time>=p.impact-.2&&time<=p.end+.1);
      a.events[duck?'keydown':'keyup']({code:'ArrowDown',preventDefault(){}});
      for(const p of values){
        if(p.action==='jump'&&!p.first&&time>=p.impact-.24){a.jump();p.first=true;}
        if(p.action==='double'){
          if(!p.first&&time>=p.impact-.65){a.jump();p.first=true;}
          if(!p.second&&time>=p.impact-.28){a.jump();p.second=true;}
        }
      }
      a.update(1/120);time+=1/120;
    }
    assert.equal(a.game.mode,'running',`${width}/${speed}/${seed}`);assert.equal(a.game.shield,0);assert.equal(a.game.phaseCooldown,0);
  }
});

test('boss victories produce a lasting randomized particle burst and a short recovery window',()=>{
  const a=setup();a.game.nextBoss=Infinity;a.spawnBoss(1);a.game.boss.age=a.game.boss.duration-.001;a.update(.002);
  const particles=a.game.particles.filter(p=>p.maxLife);assert.ok(particles.length>=45);assert.ok(new Set(particles.map(p=>p.life)).size>30);
  assert.ok(a.game.bossRest>2);a.advance(.7);assert.ok(a.game.particles.some(p=>p.maxLife&&p.life>.3));a.draw();
});

test('Rift Cage punishes a double jump and High Tide punishes staying on the ground',()=>{
  for(const kind of ['cage','vault']){
    const a=setup();a.spawnBoss(4);a.game.boss.shot=Infinity;a.game.boss.arenaBag=[kind];a.game.invincible=0;a.game.revivesUsed=2;
    a.bossAttack(a.game.boss);const impact=a.game.warnings[0].delay;let first=false,second=false;
    for(let t=0;t<impact+1&&a.game.mode==='running';t+=1/120){
      if(kind==='cage'){
        if(!first&&t>=impact-.65){a.jump();first=true;}
        if(!second&&t>=impact-.28){a.jump();second=true;}
      }a.update(1/120);
    }
    assert.equal(a.game.mode,'over',kind);
  }
});

test('magnetic quarry rocks pause behind the player and return at crouch height',()=>{
  const a=setup();a.spawnBoss(3);a.game.boss.shot=Infinity;a.game.invincible=100;
  a.launchAttack({type:'siege-rock',height:42,recall:true});const rock=a.game.obstacles[0];
  for(let t=0;t<3&&rock.stage==='out';t+=1/120)a.update(1/120);
  assert.equal(rock.stage,'windup');assert.equal(rock.y,239);assert.equal(rock.h,22);
  const x=rock.x;a.advance(.3);assert.equal(rock.x,x);
  a.advance(.6);assert.equal(rock.stage,'return');assert.ok(rock.x>x);
  a.advance(3);assert.ok(!a.game.obstacles.includes(rock));
});

test('55 distinct named biomes continue into unique deterministic frontier regions', () => {
  const a=setup();assert.equal(a.BIOMES.length,55);
  const names=new Set();
  for(let i=0;i<5000;i++) {
    const theme=a.getBiome(i);assert.ok(!names.has(theme.name));names.add(theme.name);
    assert.equal(theme.obstacles.length,3);
    assert.equal(a.getBiome(i).name,theme.name);
  }
  assert.ok(new Set(a.BIOMES.map(b=>b.scenery)).size>=12);
});

test('bosses keep attacking while prior volleys are still in flight', () => {
  const a=setup();a.spawnBoss(1);a.game.invincible=100;
  a.game.obstacles.push({x:500,y:80,w:22,h:22,type:'ball',vx:1});
  a.game.boss.shot=0;a.update(.01);
  assert.ok(a.game.warnings.length>=3);
  a.advance(.6);
  assert.ok(a.game.obstacles.length>=3);
  const before=a.game.boss.volley;
  a.advance(1.3);
  assert.ok(a.game.boss.volley>before);
});

test('bird volleys still have reachable dodges', () => {
  for(const width of [390,1000])for(const speed of [500,920])for(const level of [1])for(const high of [false,true]) {
    let solved=false;
    for(const lead of [.18,.22,.26,.30,.34,.38,.42,.46]) {
      const a=setup(width);a.spawnBoss(level);a.game.invincible=0;
      a.game.distance=(speed-500)*32;a.game.speed=speed;
      a.game.biome=Math.floor(a.score()/3000);
      a.game.boss.shot=Infinity;a.game.boss.volley=high?1:0;
      a.bossAttack(a.game.boss);
      const travel=(a.game.boss.x-a.dino.x)/Math.min(speed*1.12,(a.game.boss.x-a.dino.x)/.8);
      const jumpAt=.45+travel-lead;
      let jumped=false;
      for(let t=0;t<.45+travel+.65 && a.game.mode==='running';t+=1/120) {
        const needsDuck=level===1?a.game.boss.lastHigh:high;
        if(needsDuck)a.events.keydown({code:'ArrowDown',preventDefault(){}});
        else if(!jumped && t>=jumpAt){a.jump();jumped=true;}
        a.update(1/120);
      }
      if(a.game.mode==='running'){solved=true;break;}
    }
    assert.ok(solved,`Boss ${level}, ${high?'high':'low'} volley, viewport ${width}, speed ${speed}`);
  }
});

test('complete bird fights remain survivable with the randomized warning and shot spacing',()=>{
  for(const width of [390,1000])for(const speed of [500,920])for(const seed of [1,42,77,12345,99999]){
    const a=setup(width,seed);a.spawnBoss(1);a.game.nextBoss=Infinity;a.game.invincible=0;a.game.revivesUsed=2;
    a.game.distance=(speed-500)*32;a.game.speed=speed;
    const seen=new Set(),plans=new Map();let time=0;
    while(a.game.boss&&a.game.mode==='running'&&time<13){
      for(const w of a.game.warnings)if(!seen.has(w)){
        seen.add(w);if(w.laneY!==undefined)continue;
        const velocity=Math.min(a.game.speed*1.12,(a.game.boss.x-a.dino.x)/.8);
        const impact=time+w.delay+(a.game.boss.x+3-a.dino.x-36)/velocity+(w.spacing||0),key=a.game.boss.volley;
        if(!plans.has(key))plans.set(key,{high:w.high,impact,end:impact+.15,jumped:false});
        else plans.get(key).end=Math.max(plans.get(key).end,impact+.15);
      }
      const values=[...plans.values()],duck=values.some(p=>p.high&&time>=p.impact-.2&&time<=p.end+.15);
      a.events[duck?'keydown':'keyup']({code:'ArrowDown',preventDefault(){}});
      for(const p of values)if(!p.high&&!p.jumped&&time>=p.impact-.25){a.jump();p.jumped=true;}
      a.update(1/120);time+=1/120;
    }
    assert.equal(a.game.mode,'running',`${width}/${speed}/${seed}`);assert.equal(a.game.boss,null);
  }
});

test('dragon attack order, warning delays, fight lengths and safe stones vary across seeds',()=>{
  const orders=new Set(),stones=new Set(),durations=new Set();
  for(let seed=1;seed<=35;seed++){
    const a=setup(1000,seed);a.spawnBoss(4);durations.add(a.game.boss.duration);const order=[];
    for(let i=0;i<9;i++){
      a.game.warnings=[];a.bossAttack(a.game.boss);const w=a.game.warnings[0];order.push(w.kind);
      if(w.kind!=='ash')stones.add([w.ledgeX,w.ledgeY,w.ledgeW,w.expires,w.delay].join(','));
    }orders.add(order.join(','));
  }
  assert.ok(orders.size>25);assert.ok(stones.size>150);assert.equal(durations.size,35);
});

test('upgrade events occur only after defeating bosses 2 and 4', () => {
  const a=setup();a.game.nextBoss=Infinity;
  for(let level=1;level<=5;level++) {
    a.spawnBoss(level);a.game.boss.age=a.game.boss.duration-.001;a.update(.002);
    if(level===2||level===4) {
      assert.equal(a.game.mode,'upgrade');assert.equal(a.game.lastUpgradeBossCount,level);
      assert.equal(a.game.upgradeOffers.length,3);assert.equal(new Set(a.game.upgradeOffers).size,3);
      const chosen=a.game.upgradeOffers[0];a.chooseUpgrade(chosen);
      assert.ok(a.game.perks[chosen]>0);assert.equal(a.game.mode,'running');
      a.update(.001);assert.equal(a.game.mode,'running');
    } else assert.equal(a.game.mode,'running');
  }
});

test('random offers draw from all nine perks, exclude maxed perks, and reject unoffered picks', () => {
  const a=setup();assert.equal(a.UPGRADES.length,9);
  const seen=new Set(),sets=new Set();
  for(let i=0;i<40;i++) {
    a.openUpgrade();assert.equal(a.game.upgradeOffers.length,3);
    a.game.upgradeOffers.forEach(id=>seen.add(id));sets.add(a.game.upgradeOffers.join(','));
    const notOffered=a.UPGRADES.find(p=>!a.game.upgradeOffers.includes(p.id));
    a.chooseUpgrade(notOffered.id);assert.equal(a.game.mode,'upgrade');assert.equal(a.game.perks[notOffered.id],0);
    a.chooseUpgrade('skip');
  }
  assert.equal(seen.size,9);assert.ok(sets.size>20);
  a.game.perks.fall=1;a.game.perks.ward=1;a.game.perks.finder=1;
  for(let i=0;i<15;i++) {a.openUpgrade();assert.ok(a.game.upgradeOffers.every(id=>!['fall','ward','finder'].includes(id)));a.chooseUpgrade('skip');}
});

test('new perk effects match their descriptions and active upgrades appear above the game', () => {
  const a=setup();
  a.game.perks.clock=2;a.collectPickup({type:'slow',x:0,y:0});assert.equal(a.game.slow,11);
  a.game.perks.recovery=2;a.offerRevive();a.useRevive();assert.equal(a.game.invincible,4);assert.equal(a.game.revivesUsed,1);
  a.game.perks.ward=1;a.spawnBoss(3);assert.ok(a.game.shield>=a.game.boss.duration);
  a.game.perks.fortune=2;a.game.perks.route=1;a.game.routeActive=true;
  const bonus=a.game.bonus;a.collectPickup({type:'fossil',x:0,y:0});assert.equal(a.game.bonus-bonus,60);
  a.game.fragments=2;a.openUpgrade();a.game.upgradeOffers=['finder','shell','magnet'];a.chooseUpgrade('finder');
  assert.equal(a.game.fragments,0);assert.ok(a.game.shield>0);
  a.updateHUD();const text=a.elements.get('active-upgrades').textContent;
  assert.match(text,/Longer Slow Motion Lv 2: 11s/);assert.match(text,/Boss Shield/);assert.match(text,/Easy Shell Repair/);
  a.reset();a.updateHUD();assert.match(a.elements.get('active-upgrades').textContent,/None yet/);
});

test('Boss Shield lasts through slow-motion encounters and ends with the fight', () => {
  const a=setup();a.game.nextBoss=Infinity;a.game.perks.ward=1;a.game.slow=13;a.spawnBoss(5);
  a.game.boss.shot=Infinity;a.advance(10);
  assert.ok(a.game.boss);assert.ok(a.game.shield>0);
  a.advance(12);assert.equal(a.game.boss,null);assert.equal(a.game.shield,0);
});

test('real game actions feed the achievement tracker, including pickups, bosses, and revival',()=>{
  const a=setup(1000,12345,new Map(),true),tracker=a.achievements;
  assert.equal(tracker.state.stats.runs,1);assert.equal(tracker.state.stats.biomes,1);
  a.jump();a.jump();assert.equal(tracker.state.stats.doubleJumps,1);
  a.collectPickup({type:'fossil',x:100,y:100});assert.equal(tracker.state.stats.fossils,1);
  a.spawnBoss(1);a.game.boss.age=a.game.boss.duration-.001;a.game.invincible=100;a.update(.002);
  assert.equal(tracker.state.stats.boss1,1);assert.ok(tracker.state.flags.perfectBoss);
  a.offerRevive();a.useRevive();assert.equal(tracker.state.stats.revives,1);
  a.endRun();assert.equal(tracker.state.best.score,a.score());
});

test('biome approach becomes empty before the boundary and existing obstacles are never cut off',()=>{
  for(const width of [390,1000]) {
    const a=setup(width);a.game.nextBoss=Infinity;a.game.invincible=100;
    a.game.distance=25990;a.game.speed=920;a.game.nextObstacle=0;a.game.nextRoute=0;a.game.nextEvent=0;
    const old={x:width<650?620:1020,y:250,w:26,h:42,type:'cactus',biome:0};a.game.obstacles=[old];
    a.update(.02);assert.equal(a.game.obstacles.length,1);assert.ok(a.game.obstacles.includes(old));assert.match(a.game.message,/BORDER AHEAD/);
    while(a.score()<2999){a.update(1/120);if(a.score()>=2800)assert.equal(a.game.obstacles.length,0);}
    assert.equal(a.game.platforms.length,0);assert.equal(a.game.event,null);
    a.advance(.04);assert.equal(a.game.biome,1);assert.ok(a.game.biomeFade>0);assert.match(a.game.message,/NEW BIOME.*SNOWFIELD/);
  }
  const a=setup();a.game.nextBoss=Infinity;a.game.invincible=100;
  a.spawnObstacle();const old=a.game.obstacles[0];old.x=400;
  a.game.distance=29999;a.game.speed=920;a.update(.01);
  assert.equal(a.game.biome,1);assert.ok(a.game.obstacles.includes(old));assert.equal(old.biome,0);a.draw();
});

test('laser boss uses continuous heights and guarantees duck, jump, and double-jump patterns',()=>{
  const a=setup();a.spawnBoss(2);const ys=new Set(),actions=new Set();
  for(let i=0;i<60;i++) {
    a.game.warnings=[];a.bossAttack(a.game.boss);const warning=a.game.warnings[0];
    assert.equal(warning.type,'laser');assert.ok(warning.delay>=.9);ys.add(warning.laneY.toFixed(2));actions.add(warning.action);
    assert.ok(warning.laneY>=20&&warning.laneY<292);assert.ok(warning.height>0);
  }
  assert.ok(ys.size>50);assert.deepEqual([...actions].sort(),['double','duck','jump','scatter']);
});

test('laser curtains require the advertised moves and each has a reachable safe response',()=>{
  for(const width of [390,1000])for(const action of ['duck','jump','double'])for(const seed of [1,42,12345,99999]) {
    const a=setup(width,seed);a.spawnBoss(2);a.game.invincible=0;a.game.revivesUsed=2;a.game.boss.shot=Infinity;
    a.game.boss.laserBag=[action];a.bossAttack(a.game.boss);const warning=a.game.warnings[0];
    assert.equal(warning.action,action);
    let first=false,second=false;const impact=warning.delay;
    for(let t=0;t<1.3&&a.game.mode==='running';t+=1/120) {
      if(action==='duck')a.events.keydown({code:'ArrowDown',preventDefault(){}});
      if(action==='jump'&&!first&&t>=impact-.35){a.jump();first=true;}
      if(action==='double') {
        if(!first&&t>=impact-.65){a.jump();first=true;}
        if(!second&&t>=impact-.28){a.jump();second=true;}
      }
      a.update(1/120);
    }
    assert.equal(a.game.mode,'running',`${width} ${action} seed ${seed}`);
    assert.equal(a.game.obstacles.filter(o=>o.type==='laser').length,0);
  }
  const idle=setup();idle.spawnBoss(2);idle.game.invincible=0;idle.game.revivesUsed=2;idle.game.boss.shot=Infinity;idle.game.boss.laserBag=['double'];idle.bossAttack(idle.game.boss);idle.advance(1.2);assert.equal(idle.game.mode,'over');
});

test('new quarry boss full fights are beatable using ordinary controls without shields or revives',()=>{
  for(const width of [390,1000])for(const initialSpeed of [500,920])for(const seed of [1,42,77,12345]) {
    const a=setup(width,seed);a.spawnBoss(3);a.game.invincible=0;a.game.revivesUsed=2;
    a.game.distance=(initialSpeed-500)*32;a.game.speed=initialSpeed;a.game.nextBoss=Infinity;
    const seen=new Set(),plans=[];let elapsed=0;
    while(a.game.boss&&a.game.mode==='running'&&elapsed<16) {
      for(const warning of a.game.warnings)if(!seen.has(warning)) {
        seen.add(warning);assert.equal(warning.type,'siege-rock');
        if(warning.spacing>0)continue;
        const velocity=Math.min(a.game.speed,(a.game.boss.x-a.dino.x)/1.05);
        const impact=elapsed+warning.delay+(a.game.boss.x-a.dino.x-20)/velocity;
        plans.push({action:warning.action,impact,first:false,second:false});
      }
      const duck=a.game.obstacles.some(o=>o.recall&&o.stage!=='out'&&o.x<a.dino.x+90);
      a.events[duck?'keydown':'keyup']({code:'ArrowDown',preventDefault(){}});
      for(const plan of plans)if(plan.action!=='high') {
        if(!plan.first&&elapsed>=plan.impact-(plan.action==='tower'?.7:.34)){a.jump();plan.first=true;}
        if(plan.action==='tower'&&!plan.second&&elapsed>=plan.impact-.33){a.jump();plan.second=true;}
      }
      a.update(1/120);elapsed+=1/120;
    }
    assert.equal(a.game.mode,'running',`width ${width}, speed ${initialSpeed}, seed ${seed}`);
    assert.equal(a.game.boss,null);assert.ok(seen.size>=2);
    assert.equal(a.game.shield,0);assert.equal(a.game.phaseCooldown,0);
  }
});

test('phase dash protects briefly, has a five-second cooldown, and never consumes an egg',()=>{
  const a=setup();a.game.nextObstacle=100;a.game.nextRoute=100;a.game.nextEvent=100;a.game.invincible=0;
  assert.equal(a.phaseDash(),true);assert.equal(a.game.phaseCooldown,5);assert.ok(a.game.invincible>=.3);
  a.game.obstacles.push({x:0,y:250,w:1000,h:42,type:'laser',ttl:.18});a.advance(.25);
  assert.equal(a.game.mode,'running');assert.equal(a.game.revivesUsed,0);assert.equal(a.phaseDash(),false);
  a.advance(5);assert.equal(a.phaseDash(),true);a.togglePause();assert.equal(a.phaseDash(),false);
});

test('complete laser fights are survivable using jump, double jump and crouch without phase or protection',()=>{
  for(const width of [390,1000])for(const speed of [500,920])for(const seed of [1,42,12345,99999]) {
    const a=setup(width,seed);a.game.bossesDefeated=1;a.spawnBoss(2);a.game.revivesUsed=2;a.game.invincible=0;a.game.nextBoss=Infinity;
    a.game.distance=(speed-500)*32;a.game.speed=speed;
    const seen=new Set(),actions=new Set(),plans=[];let time=0;
    while(a.game.boss&&a.game.mode==='running'&&time<13) {
      for(const warning of a.game.warnings)if(!seen.has(warning)) {
        seen.add(warning);actions.add(warning.action);
        let action=warning.action;
        if(action==='scatter')action=warning.laneY+6<=257?'none':warning.laneY+6<=272?'duck':'jump';
        plans.push({action,impact:time+warning.delay,first:false,second:false});
      }
      const duck=plans.some(p=>p.action==='duck'&&time>=p.impact-.2&&time<=p.impact+.25);
      a.events[duck?'keydown':'keyup']({code:'ArrowDown',preventDefault(){}});
      for(const plan of plans) {
        if(plan.action==='jump'&&!plan.first&&time>=plan.impact-.35){a.jump();plan.first=true;}
        if(plan.action==='double') {
          if(!plan.first&&time>=plan.impact-.65){a.jump();plan.first=true;}
          if(!plan.second&&time>=plan.impact-.28){a.jump();plan.second=true;}
        }
      }
      a.update(1/120);time+=1/120;
    }
    assert.equal(a.game.mode,'upgrade',`${width} ${speed} ${seed}`);
    assert.equal(a.game.boss,null);assert.ok(['duck','jump','double'].every(action=>actions.has(action)));
    assert.equal(a.game.shield,0);assert.equal(a.game.phaseCooldown,0);
  }
});
