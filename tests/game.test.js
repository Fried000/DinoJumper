const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

// Exercise the actual game loop in a minimal DOM. The test hook is injected into
// the VM copy only, so the game does not expose mutable state in the browser.
function setup(width = 1000, seed = 12345, storage = new Map()) {
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
    requestAnimationFrame() {}, HTMLButtonElement: class {}, HTMLAnchorElement: class {} };
  const randomMath=Object.create(Math);
  randomMath.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  sandbox.Math=randomMath;
  const source = fs.readFileSync(require.resolve('../game.js'), 'utf8')
    .replace('  renderJournal();updateHUD();requestAnimationFrame(frame);',
      '  globalThis.api = {game,dino,reset,jump,update,togglePause,spawnRoute,spawnBoss,playerBox,draw,score,frame,spawnObstacle,bossAttack,launchAttack,pixelDino,DUCK_DINO,BIOMES,BOSSES,getBiome,continueExploring,journal,offerRevive,useRevive,chooseUpgrade,openUpgrade,startEvent,collectPickup,endRun,discover};');
  vm.runInNewContext(source, sandbox);
  const api = sandbox.api;
  api.reset();
  api.advance = seconds => {
    for (let t = 0; t < seconds && ['running','upgrade'].includes(api.game.mode); t += 1 / 120) {
      if(api.game.mode==='upgrade')api.chooseUpgrade('skip');
      api.update(1 / 120);
    }
  };
  return { ...api, elements, events, draws, storage };
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

test('biomes advance every 1000 displayed points, including bonuses, without looping', () => {
  const a = setup();
  a.game.bonus = 900; a.update(.001);
  assert.equal(a.game.biome, 0);
  assert.equal(a.game.boss, null);
  a.game.distance = 1000; a.update(.001); assert.equal(a.game.biome, 1);
  a.game.distance = 21000; a.update(.001); assert.equal(a.game.biome, 3);
  a.game.bonus=0;a.game.distance=9999;a.update(.00001);assert.equal(a.game.biome,0);
  a.game.distance=10000;a.update(.00001);assert.equal(a.game.biome,1);
  a.game.distance=480000;a.update(.00001);assert.equal(a.game.biome,48);
});

test('boss arrival clears hazards, generates projectiles, and rewards survival', () => {
  const a = setup();
  a.game.obstacles.push({ x: 400 });
  a.game.distance = 10000; a.update(.001);a.chooseUpgrade('skip');
  assert.ok(a.game.boss);
  assert.equal(a.game.obstacles.length, 0);
  assert.equal(a.game.nextBoss, 2000);
  a.game.invincible = 30;
  a.advance(4);
  assert.ok(a.game.obstacles.some(o => o.type === 'ball'));
  a.advance(a.BOSSES[0].duration-3.9);
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
  a.game.distance=10000;a.game.biome=0;a.game.nextBoss=Infinity;a.update(.01);
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
  const expected=[['ball'],['charge','boulder'],['boulder'],['rain','fireball'],['boulder','fireball','ball']];
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
    if(level<5)assert.equal(a.game.nextBoss,Infinity);
    else {assert.equal(a.game.mode,'won');assert.equal(a.game.completed,true);a.continueExploring();assert.equal(a.game.nextBoss,Infinity);}
  }
  a.spawnBoss();assert.equal(a.game.boss.level,5);
});

test('bird chooses six non-repeating multi-ball patterns with random cooldowns', () => {
  const a=setup();a.spawnBoss(1);
  const timings=new Set(),lanes=new Set(),patterns=new Set();let burst=false,lastPattern='';
  for(let i=0;i<40;i++) {
    a.game.warnings=[];a.bossAttack(a.game.boss);
    assert.notEqual(a.game.boss.lastPattern,lastPattern);lastPattern=a.game.boss.lastPattern;
    patterns.add(lastPattern);assert.ok(a.game.boss.laneStreak<=2);
    assert.ok(a.game.warnings.length>=2);
    a.game.warnings.forEach(w=>{lanes.add(w.high);timings.add(w.spacing||0);assert.equal(w.delay,.45);});
    burst=true;
  }
  assert.equal(lanes.size,2);assert.ok(burst);assert.ok(timings.size>1);
  assert.equal(patterns.size,6);
  a.game.warnings=[];a.game.boss.shot=0;a.update(.01);
  assert.ok(a.game.boss.shot>=.95 && a.game.boss.shot<=1.25);
  const intervals=new Set();
  for(let i=0;i<20;i++) {
    a.game.warnings=[];a.game.obstacles=[];a.game.boss.shot=0;
    a.update(.001);intervals.add(a.game.boss.shot.toFixed(3));
  }
  assert.ok(intervals.size>15);
});

test('exactly two revivals preserve progress, clear hazards, and cannot be bypassed', () => {
  const a=setup();a.spawnBoss(2);a.game.boss.age=3;a.game.bonus=125;
  a.game.distance=14000;a.game.biome=1;a.game.lastUpgradeBiome=1;
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

test('bosses arrive at fixed 1000-point milestones and fights are shorter than ten seconds', () => {
  const a=setup();a.game.invincible=100;
  for(let level=1;level<=5;level++) {
    a.game.distance=(level*1000-a.game.bonus)*10;
    a.update(.0001);
    assert.equal(a.game.boss.level,level);assert.equal(a.game.nextBoss,(level+1)*1000);
    assert.equal(a.game.mode,'upgrade');a.chooseUpgrade('shell');
    assert.ok(a.game.boss.duration<10);
    a.advance(a.game.boss.duration+.02);
    assert.equal(a.game.boss,null);
  }
  assert.equal(a.game.mode,'won');assert.equal(a.journal.bosses.length,5);
});

test('biome upgrades pause the world, apply once, and resume the waiting boss', () => {
  const a=setup();a.game.distance=10000;a.update(.001);
  assert.equal(a.game.mode,'upgrade');assert.equal(a.game.boss.level,1);
  const distance=a.game.distance;a.frame(1000);a.frame(2000);
  assert.equal(a.game.distance,distance);
  a.chooseUpgrade('shell');assert.equal(a.game.perks.shell,1);
  a.chooseUpgrade('shell');assert.equal(a.game.perks.shell,1);
  a.collectPickup({x:0,y:0,type:'shield'});assert.equal(a.game.shield,12);
  a.game.nextBoss=Infinity;a.advance(.05);assert.equal(a.game.mode,'running');
  a.game.biome=2;a.openUpgrade();a.chooseUpgrade('fall');
  a.jump();a.advance(.4);a.events.keydown({code:'ArrowDown',preventDefault(){}});
  const vy=a.dino.vy;a.update(.01);assert.ok(a.dino.vy-vy>30);
});

test('fossils and fragments grant rewards while the magnet collects nearby pickups', () => {
  const a=setup();a.game.perks.fall=2;
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

test('boulders bounce, lava falls, dragon platforms crumble and shadow copies jumps', () => {
  const a=setup();a.spawnBoss(3);a.launchAttack({type:'boulder'});
  const rock=a.game.obstacles[0],initialY=rock.y;a.advance(.15);assert.notEqual(rock.y,initialY);
  a.spawnBoss(4);a.launchAttack({type:'rain'});
  const rain=a.game.obstacles[0],rainY=rain.y;a.advance(.1);assert.ok(rain.y>rainY);
  a.game.platforms=[{x:80,y:177,w:500,h:8,crumble:null}];
  a.dino.y=132;a.dino.vy=0;a.advance(.01);
  assert.ok(a.game.platforms[0].crumble>0);a.game.invincible=100;a.advance(.9);
  assert.equal(a.game.platforms.length,0);assert.ok(a.dino.y>132);
  a.spawnBoss(5);a.dino.jumps=0;a.jump();assert.equal(a.game.boss.echoes.length,1);
  a.advance(.82);assert.ok(a.game.warnings.some(w=>w.type==='echo'));
});

test('48 distinct named biomes continue into unique deterministic frontier regions', () => {
  const a=setup();assert.equal(a.BIOMES.length,48);
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
  a.advance(.5);
  assert.ok(a.game.obstacles.length>=4);
  const before=a.game.boss.volley;
  a.advance(1.3);
  assert.ok(a.game.boss.volley>before);
});

test('all five boss volleys leave a physically reachable dodge on phone and desktop', () => {
  for(const width of [390,1000])for(const speed of [500,920])for(const level of [1,2,3,4,5])for(const high of [false,true]) {
    let solved=false;
    for(const lead of [.18,.22,.26,.30,.34,.38,.42,.46]) {
      const a=setup(width);a.spawnBoss(level);a.game.invincible=0;
      a.game.distance=(speed-500)*32;a.game.speed=speed;
      a.game.biome=Math.floor(a.score()/1000);a.game.lastUpgradeBiome=a.game.biome;
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
