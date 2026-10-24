const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

// Exercise the actual game loop in a minimal DOM. The test hook is injected into
// the VM copy only, so the game does not expose mutable state in the browser.
function setup(width = 1000) {
  const elements = new Map();
  const context = new Proxy({}, { get: () => () => {} });
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
    localStorage: { getItem() {}, setItem() {} }, matchMedia: () => ({ matches: false }),
    requestAnimationFrame() {}, HTMLButtonElement: class {}, HTMLAnchorElement: class {} };
  const source = fs.readFileSync(require.resolve('../game.js'), 'utf8')
    .replace('  updateHUD();requestAnimationFrame(frame);',
      '  globalThis.api = {game,dino,reset,jump,update,togglePause,spawnRoute,spawnBoss,playerBox,draw,score,frame};');
  vm.runInNewContext(source, sandbox);
  const api = sandbox.api;
  api.reset();
  api.advance = seconds => {
    for (let t = 0; t < seconds && api.game.mode === 'running'; t += 1 / 120) api.update(1 / 120);
  };
  return { ...api, elements, events };
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
  a.game.platforms.push({ x: 80, y: 177, w: 400, h: 8 });
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

test('biomes rotate by distance, independent of bonus score', () => {
  const a = setup();
  a.game.bonus = 900; a.update(.001);
  assert.equal(a.game.biome, 0);
  assert.equal(a.game.boss, null);
  a.game.distance = 3000; a.update(.001); assert.equal(a.game.biome, 1);
  a.game.distance = 9000; a.update(.001); assert.equal(a.game.biome, 0);
});

test('boss arrival clears hazards, generates projectiles, and rewards survival', () => {
  const a = setup();
  a.game.obstacles.push({ x: 400 });
  a.game.distance = 6000; a.update(.001);
  assert.ok(a.game.boss);
  assert.equal(a.game.obstacles.length, 0);
  assert.equal(a.game.nextBoss, 1200);
  a.game.invincible = 30;
  a.advance(3);
  assert.ok(a.game.obstacles.some(o => o.type === 'rock'));
  a.advance(12);
  assert.equal(a.game.boss, null);
  assert.equal(a.game.bonus, 100);
});

test('ducking avoids a high projectile while standing collides', () => {
  const a = setup();
  a.game.invincible = 0;
  a.events.keydown({ code: 'ArrowDown', preventDefault() {} });
  a.game.obstacles.push({ x: 120, y: 229, w: 26, h: 25, type: 'rock' });
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
    for (let biome=0;biome<3;biome++) { a.game.biome = biome; a.draw(); }
    a.spawnBoss(); a.draw();
  }
});
