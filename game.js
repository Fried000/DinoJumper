(() => {
  'use strict';
  const canvas = document.querySelector('#game');
  const ctx = canvas.getContext('2d');
  const $ = id => document.getElementById(id);
  const W = window.innerWidth < 650 ? 600 : 1000, H = 360, GROUND = 292;
  canvas.width = W;
  const GRAVITY = 1850, JUMP = -660;
  const BIOMES = [
    { name: 'DESERT', bg: '#ffffff', ink: '#53534e', faint: '#e4e4dc', scenery: 'dune' },
    { name: 'SNOWFIELD', bg: '#f3f7f8', ink: '#536168', faint: '#d6e1e4', scenery: 'snow' },
    { name: 'VOLCANIC', bg: '#f5f0ec', ink: '#655750', faint: '#e2d6cc', scenery: 'volcano' },
  ];
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
  let high = 0;
  try { high = Number(localStorage.getItem('dino-jumper-best')) || 0; } catch {}
  const game = { mode: 'ready', distance: 0, bonus: 0, speed: 310, time: 0, biome: 0,
    obstacles: [], pickups: [], platforms: [], particles: [], boss: null,
    nextObstacle: 1.7, nextPickup: 7, nextRoute: 12, nextBoss: 600, routeActive: false,
    shield: 0, slow: 0, invincible: 0, message: '', messageTimer: 0 };
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
  function showOverlay(kicker, title, text, button) {
    $('overlay-kicker').textContent = kicker;
    $('overlay-title').textContent = title;
    $('overlay-text').textContent = text;
    $('start').innerHTML = `${button} <span>↗</span>`;
    $('overlay').hidden = false;
  }
  function reset() {
    Object.assign(game, { mode: 'running', distance: 0, bonus: 0, speed: 310, time: 0, biome: 0,
      obstacles: [], pickups: [], platforms: [], particles: [], boss: null,
      nextObstacle: 1.7, nextPickup: 7, nextRoute: 12, nextBoss: 600, routeActive: false,
      shield: 0, slow: 0, invincible: 1, message: '', messageTimer: 0 });
    Object.assign(dino, { y: GROUND - 45, vy: 0, jumps: 0, grounded: true, duck: false });
    duckKey = false;
    $('overlay').hidden = true;
    $('pause').textContent = 'Ⅱ';
    $('pause').setAttribute('aria-label', 'Pause game');
    announce('Run started. Double jump to reach the upper route.');
    last = null;
    updateHUD();
  }
  function jump() {
    if (game.mode === 'ready' || game.mode === 'over') { reset(); return; }
    if (game.mode === 'paused') { togglePause(); return; }
    if (dino.jumps >= 2) return;
    dino.duck = false;
    dino.vy = dino.jumps === 0 ? JUMP : -610;
    dino.jumps++;
    dino.grounded = false;
    if (dino.jumps === 2) burst(dino.x + 20, dino.y + 40, 8);
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
    game.mode = 'over';
    high = Math.max(high, score());
    try { localStorage.setItem('dino-jumper-best', String(high)); } catch {}
    showOverlay('THERE’S ALWAYS ANOTHER HORIZON', 'One more try?', `You ran ${score()} points. Best run: ${high}.`, 'RUN AGAIN');
    announce(`Game over. Score ${score()}. Best ${high}.`);
    updateHUD();
  }
  function burst(x, y, count) {
    if (reducedMotion) return;
    for (let i=0;i<count;i++) game.particles.push({x,y,vx:rand(-90,90),vy:rand(-100,40),life:.45});
  }
  function hurt(obstacle) {
    if (game.invincible > 0) return;
    if (game.shield > 0) {
      game.shield = 0; game.invincible = 1.4;
      obstacle.hit = true;
      burst(dino.x+20, dino.y+20, 14);
      toast('SHIELD SAVED YOU');
    } else endRun();
  }
  function spawnObstacle() {
    const bird = score() > 100 && Math.random() < .22;
    const w = bird ? 42 : (Math.random() < .28 ? 44 : 24);
    const h = bird ? 28 : rand(37,53);
    // High birds can be ducked; lower birds must be jumped.
    const y = bird ? GROUND - (Math.random() < .5 ? 62 : 37) : GROUND-h;
    game.obstacles.push({x:W+40,y,w,h,type:bird?'bird':'cactus',hit:false});
  }
  function spawnRoute() {
    // The entrance is visible well before it reaches the player. A double jump
    // reaches the first ledge; the ground underneath always stays traversable.
    for (let i=0;i<4;i++) {
      const x = W+80+i*205;
      const y = GROUND-115-(i===1||i===2?25:0);
      game.platforms.push({x,y,w:180,h:8});
      game.pickups.push({x:x+65,y:y-38,w:19,h:19,type:'bonus'});
    }
    toast('SECRET ROUTE AHEAD · DOUBLE JUMP UP');
  }
  function spawnBoss() {
    game.boss = { age: 0, duration: 14, shot: 2.6, x: W-155, y: 68, w: 88, h: 60 };
    // Clear the runway so boss projectiles do not create unfair combinations.
    game.obstacles = [];
    game.platforms = [];
    game.pickups = [];
    game.routeActive = false;
    toast('BIG VISITOR · DODGE UNTIL IT LEAVES');
  }
  function playerBox() {
    return {x:dino.x+7,y:dino.y+(dino.duck?23:4),w:dino.duck?39:30,h:dino.duck?18:38};
  }
  function update(dt) {
    // Slow motion affects world movement, not the responsiveness of the jump.
    const worldDt = dt * (game.slow > 0 ? .58 : 1);
    game.time += dt;
    game.distance += game.speed * worldDt;
    game.speed = Math.min(500,310+game.distance/250);
    for (const key of ['shield','slow','invincible','messageTimer']) game[key] = Math.max(0,game[key]-dt);
    const biome = Math.floor(game.distance / 3000) % BIOMES.length;
    if (biome !== game.biome) { game.biome = biome; toast(`ENTERING THE ${BIOMES[biome].name}`); }
    dino.duck = duckKey && dino.grounded;
    const oldBottom = dino.y+dino.h;
    dino.vy += GRAVITY*dt;
    dino.y += dino.vy*dt;
    dino.grounded = false;
    const dx = game.speed*worldDt;
    for (const platform of game.platforms) {
      platform.x -= dx;
      if (dino.vy >= 0 && oldBottom <= platform.y+3 && dino.y+dino.h >= platform.y &&
        dino.x+dino.w-8 > platform.x && dino.x+8 < platform.x+platform.w) {
        dino.y = platform.y-dino.h; dino.vy = 0; dino.grounded = true; dino.jumps = 0;
        if (!game.routeActive) { game.routeActive = true; toast('THE HIGH ROAD · +25 PER DIAMOND'); }
      }
    }
    if (dino.y+dino.h >= GROUND) {
      dino.y = GROUND-dino.h; dino.vy = 0; dino.grounded = true; dino.jumps = 0;
      game.routeActive = false;
    }
    if (dino.grounded) dino.duck = duckKey;
    game.platforms = game.platforms.filter(p=>p.x+p.w>0);

    if (!game.boss && game.distance/10 >= game.nextBoss) {
      game.nextBoss += 600;
      spawnBoss();
    }
    if (game.boss) {
      const boss = game.boss;
      boss.age += worldDt;
      boss.shot -= worldDt;
      if (boss.shot <= 0 && boss.age < boss.duration-2) {
        const highShot = Math.random() < .45;
        game.obstacles.push({x:boss.x,y:GROUND-(highShot?63:29),w:26,h:highShot?25:29,type:'rock',hit:false});
        boss.shot = 1.55;
      }
      if (boss.age >= boss.duration) {
        game.boss = null; game.bonus += 100;
        game.obstacles = []; game.nextObstacle = 2;
        game.nextRoute = Math.max(3, game.nextRoute);
        toast('VISITOR OUTRUN · +100');
      }
    } else {
      game.nextObstacle -= worldDt;
      if (game.nextObstacle<=0) { spawnObstacle(); game.nextObstacle=rand(1.35,2.1); }
      game.nextPickup -= worldDt;
      if (game.nextPickup<=0) {
        game.pickups.push({x:W+60,y:GROUND-95,w:23,h:23,type:Math.random()<.5?'shield':'slow'});
        game.nextPickup=rand(11,15);
      }
      game.nextRoute -= worldDt;
      if (game.nextRoute<=0 && !game.platforms.length) { spawnRoute(); game.nextRoute=rand(22,28); }
    }
    const box = playerBox();
    for (const obstacle of game.obstacles) {
      obstacle.x -= dx;
      const hitbox = {x:obstacle.x+3,y:obstacle.y+3,w:obstacle.w-6,h:obstacle.h-5};
      if (!obstacle.hit && intersects(box,hitbox)) {
        hurt(obstacle);
        if (game.mode === 'over') return;
      }
    }
    game.obstacles = game.obstacles.filter(o=>o.x+o.w>0 && !o.hit);
    for (const pickup of game.pickups) {
      pickup.x -= dx;
      if (intersects(box,pickup)) {
        pickup.collected = true;
        burst(pickup.x,pickup.y,8);
        if (pickup.type==='shield') { game.shield=10; toast('SHIELD · ONE FREE HIT'); }
        else if (pickup.type==='slow') { game.slow=7; toast('SLOW TIME · 7 SECONDS'); }
        else { game.bonus+=25; }
      }
    }
    game.pickups=game.pickups.filter(p=>p.x+p.w>0&&!p.collected);
    for (const p of game.particles) { p.x+=p.vx*dt-dx/2; p.y+=p.vy*dt; p.vy+=300*dt; p.life-=dt; }
    game.particles=game.particles.filter(p=>p.life>0);
  }
  function updateHUD() {
    const theme = BIOMES[game.biome];
    $('biome').textContent = `0${game.biome+1} / ${theme.name}`;
    $('score').textContent = `HI ${pad(Math.max(high,score()))}   ${pad(score())}`;
    $('status').textContent = {ready:'READY TO RUN',running:game.boss?'BIG VISITOR NEARBY':'ON THE MOVE',paused:'TAKING A BREATHER',over:'UNTIL NEXT TIME'}[game.mode];
    const effects = [];
    if (game.shield>0) effects.push(`SHIELD ${Math.ceil(game.shield)}s`);
    if (game.slow>0) effects.push(`SLOW ${Math.ceil(game.slow)}s`);
    $('effect').textContent = effects.join(' / ') || 'JUST YOU AND THE HORIZON';
    $('route-status').textContent = game.routeActive?'ON THE HIGH ROAD · +25 PER DIAMOND':'THE HIGH ROAD IS OPTIONAL';
    document.querySelector('.game-shell').style.setProperty('--game-bg',theme.bg);
  }
  function pixelDino(x,y,scale=2.5,duck=false,animate=true) {
    ctx.save();ctx.translate(Math.round(x),Math.round(y));
    if (duck) { ctx.translate(0,22); ctx.scale(1.25,.52); }
    const step = Math.floor(game.time*11)%2;
    DINO.forEach((row,r)=> {
      for (let c=0;c<row.length;c++) {
        if (row[c]!=='1') continue;
        if (r>=15 && animate && dino.grounded && game.mode==='running' &&
          ((step===0 && c>=9)||(step===1 && c<8))) continue;
        ctx.fillRect(c*scale,r*scale,Math.ceil(scale),Math.ceil(scale));
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
    for (let i=0;i<5;i++) {
      const x=((i*270-game.distance*.12)%1350+1350)%1350-150;
      const height=35+i%3*12;
      ctx.beginPath();ctx.moveTo(x,GROUND);ctx.lineTo(x+65,GROUND-height);ctx.lineTo(x+145,GROUND);ctx.stroke();
      if (theme.scenery==='snow') {
        ctx.beginPath();ctx.moveTo(x+44,GROUND-height+14);ctx.lineTo(x+65,GROUND-height);ctx.lineTo(x+90,GROUND-height+14);ctx.stroke();
      } else if (theme.scenery==='volcano') {
        ctx.beginPath();ctx.moveTo(x+57,GROUND-height+4);ctx.lineTo(x+66,GROUND-height+12);ctx.lineTo(x+75,GROUND-height+5);ctx.stroke();
      }
    }
    for (let i=0;i<4;i++) cloud(((i*300+180-game.distance*.07)%1250+1250)%1250-80,48+(i%3)*24);
    if (theme.scenery==='snow' && !reducedMotion) {
      ctx.fillStyle=theme.faint;
      for(let i=0;i<28;i++) ctx.fillRect((i*97+game.time*14)%W,(i*53+game.time*23)%GROUND,2,2);
    }
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
    ctx.strokeStyle=BIOMES[game.biome].ink;ctx.lineWidth=2;
    if(p.type==='bonus') {
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
    const theme=BIOMES[game.biome];
    ctx.fillStyle=theme.bg;ctx.fillRect(0,0,W,H);
    scenery(theme);
    ctx.fillStyle=theme.ink;ctx.strokeStyle=theme.ink;ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(0,GROUND+.5);ctx.lineTo(W,GROUND+.5);ctx.stroke();
    for(let i=0;i<50;i++) {
      const x=((i*73-game.distance)%1100+1100)%1100;
      ctx.fillRect(x,GROUND+7+(i*13)%23,2+i%5,1);
    }
    for(const p of game.platforms) {
      ctx.setLineDash([5,4]);ctx.strokeRect(Math.round(p.x),p.y,p.w,5);ctx.setLineDash([]);
      ctx.fillStyle=theme.faint;ctx.fillRect(p.x,p.y+6,p.w,3);ctx.fillStyle=theme.ink;
    }
    for(const o of game.obstacles) {
      if(o.type==='cactus')cactus(o);
      else if(o.type==='bird')bird(o);
      else {
        ctx.fillRect(o.x+5,o.y,o.w-10,o.h);ctx.fillRect(o.x,o.y+6,o.w,o.h-12);
        ctx.fillStyle=theme.bg;ctx.fillRect(o.x+7,o.y+7,4,4);ctx.fillStyle=theme.ink;
      }
    }
    for(const p of game.pickups) drawPickup(p);
    if(game.boss) {
      const boss=game.boss;
      const entrance=Math.min(1,boss.age/1.4);
      bird({x:boss.x+(1-entrance)*220,y:boss.y+Math.sin(game.time*2)*10},true);
      ctx.font='10px Consolas,monospace';ctx.textAlign='right';
      ctx.fillText('OUTRUN THE VISITOR',W-30,28);
      ctx.fillStyle=theme.faint;ctx.fillRect(W-170,38,140,3);
      ctx.fillStyle=theme.ink;ctx.fillRect(W-170,38,140*(1-boss.age/boss.duration),3);
    }
    if(game.invincible<=0||Math.floor(game.time*14)%2===0||game.mode!=='running')pixelDino(dino.x,dino.y,2.5,dino.duck);
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
  $('start').addEventListener('click',()=>{if(game.mode==='paused')togglePause();else reset();canvas.focus({preventScroll:true});});
  $('restart').addEventListener('click',()=>{reset();canvas.focus({preventScroll:true});});
  $('pause').addEventListener('click',togglePause);
  document.addEventListener('keydown',e=>{
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
  updateHUD();requestAnimationFrame(frame);
})();
