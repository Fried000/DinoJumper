const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
function engine(storage=new Map()) {
  const context=vm.createContext({localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},Date});
  for(const file of ['achievements-data.js','achievement-engine.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),context);
  return {api:context.DinoAchievements,data:context.DinoAchievementData,storage};
}
const tick=(api,score,extra={})=>api.record('tick',{dt:1,score,speed:920,...extra});

test('48 goals form six acyclic eight-node branches with valid prerequisites',()=>{
  const {data}=engine();assert.equal(data.items.length,48);assert.equal(data.branches.length,6);
  const ids=new Set(data.items.map(a=>a.id));assert.equal(ids.size,48);
  for(const branch of data.branches)assert.equal(data.items.filter(a=>a.branch===branch.id).length,8);
  function walk(item,seen=new Set()){assert.ok(!seen.has(item.id),'cycle');const next=new Set([...seen,item.id]);for(const id of item.parents){assert.ok(ids.has(id));walk(data.items.find(a=>a.id===id),next);}}
  data.items.forEach(a=>walk(a));
});

test('progress unlocks in prerequisite order and persists without fabricating advanced goals',()=>{
  const {api,storage}=engine();api.record('start');tick(api,1000);api.record('jump',{double:true});
  assert.ok(api.state.unlocked['first-steps']);assert.ok(api.state.unlocked['four-figures']);
  assert.ok(!api.state.unlocked['clean-sweep']);assert.equal(api.state.stats.doubleJumps,1);
  api.save();const next=engine(storage).api;assert.ok(next.state.unlocked['four-figures']);assert.equal(next.state.stats.jumps,1);
});

test('old journal progress imports only achievements supported by recorded facts',()=>{
  const storage=new Map([['dino-jumper-journal',JSON.stringify({runs:3,fossils:120,revives:4,best:5200,biomes:['DESERT','SNOWFIELD','VOLCANIC'],bosses:['BALL-SPITTING BIRD','CHARGING TRICERATOPS']})]]);
  const {api}=engine(storage);assert.ok(api.state.unlocked.museum);assert.ok(api.state.unlocked.horns);assert.ok(api.state.unlocked['five-k']);assert.ok(api.state.unlocked.wanderer);
  assert.ok(!api.state.flags.perfectBoss);assert.ok(!api.state.flags.usedBoth);assert.ok(!api.state.unlocked['clean-sweep']);
});

test('shield hits and revivals invalidate flawless bosses and clean wins',()=>{
  const {api}=engine();api.record('start');api.record('bossStart',{level:1});api.record('hit',{shield:true});api.record('bossWin',{level:1});
  assert.ok(!api.state.flags.perfectBoss);assert.equal(api.state.stats.shieldSaves,1);
  api.record('revive',{score:200,boss:2,fraction:.8});api.record('bossWin',{level:2});assert.ok(api.state.flags.clutchBoss);
  api.record('win');assert.ok(!api.state.flags.cleanWin);assert.ok(!api.state.flags.noReviveWin);
});

test('comeback, no-power and single-jump challenges use one actual run',()=>{
  const {api}=engine();api.record('start');
  api.record('revive',{score:100});api.record('revive',{score:500});tick(api,2500);api.record('win',{score:2550});
  assert.ok(api.state.flags.usedBoth);assert.ok(api.state.flags.comebackWin);assert.ok(api.state.flags.noPowerWin);assert.ok(api.state.flags.singleJumpWin);assert.ok(api.state.best.afterRevive>=2000);
  api.record('start');api.record('jump',{double:true});api.record('pickup',{type:'shield'});api.record('win');
  assert.equal(api.getRun().doubleJumps,1);assert.equal(api.getRun().powers,1);assert.equal(api.getRun().revives,0);
});

test('exploration, weather, fossil value, and build combinations track their real events',()=>{
  const {api}=engine();api.record('start');
  for(const kind of ['blizzard','meteor','stampede','fireflies'])api.record('eventWin',{kind});assert.equal(api.state.stats.eventTypes,4);
  for(let i=0;i<10;i++)api.record('biome',{name:'BIOME '+i,index:i});assert.equal(api.state.best.biomes,10);
  api.record('biome',{name:'FRONTIER 49',index:48});assert.ok(api.state.flags.frontier);
  for(let i=0;i<3;i++)api.record('route');for(let i=0;i<20;i++)api.record('pickup',{type:'fossil',points:55,upper:true,fireflies:true});
  assert.ok(api.state.flags.skyline);assert.ok(api.state.flags.noMagnetRun);assert.equal(api.state.best.fossilValue,55);assert.equal(api.state.stats.fireflyFossils,20);
  api.record('upgrade',{id:'route'});api.record('upgrade',{id:'route'});assert.ok(api.state.flags.doubleDown);
  api.record('upgrade',{id:'magnet'});assert.ok(api.state.flags.balancedBuild);assert.equal(api.state.stats.upgradeTypes,2);
  tick(api,3000,{fastFall:true});api.record('dodge');assert.equal(api.state.stats.fastFallDodges,1);
});

test('magnet runs cannot earn the no-magnet fossil challenge and resets isolate runs',()=>{
  const {api}=engine();api.record('start');api.record('upgrade',{id:'magnet'});
  for(let i=0;i<20;i++)api.record('pickup',{type:'fossil'});assert.ok(!api.state.flags.noMagnetRun);
  api.record('start');for(let i=0;i<19;i++)api.record('pickup',{type:'fossil'});assert.ok(!api.state.flags.noMagnetRun);
  api.record('pickup',{type:'fossil'});assert.ok(api.state.flags.noMagnetRun);
});

test('all goals can be earned when their criteria are met; no graph dead ends',()=>{
  const {api,data}=engine();for(const item of data.items)for(const [location,target]of item.criteria){const [group,key]=location.split('.');api.state[group][key]=Math.max(api.state[group][key]||0,target);}
  api.state.sets.biomes=Array.from({length:48},(_,i)=>String(i));api.state.sets.namedBiomes=[...api.state.sets.biomes];api.state.sets.events=['a','b','c','d'];api.state.sets.upgrades=['shell','magnet','fall','fortune','clock','recovery','ward','finder','route'];
  api.evaluate();assert.equal(Object.keys(api.state.unlocked).length,48);
});

test('broken or blocked browser storage does not prevent tracking or gameplay',()=>{
  const {api}=engine(new Map([['dino-jumper-achievements-v1','{broken']]));api.record('start');assert.ok(api.state.unlocked['first-steps']);
  const blocked=new Map();blocked.set=()=>{throw Error('quota');};const b=engine(blocked).api;b.record('start');tick(b,1000);assert.ok(b.state.unlocked['four-figures']);
});

test('all page navigation and script/style assets exist in the static build',()=>{
  for(const file of ['index.html','play.html','instructions.html','achievements.html','museum.html']) {
    const html=fs.readFileSync(path.join(__dirname,'..','dist',file),'utf8');
    for(const [,url]of html.matchAll(/(?:href|src)="([^"]+)"/g)){if(url.startsWith('#')||url.includes('://'))continue;const target=url.split('#')[0];assert.ok(fs.existsSync(path.join(__dirname,'..','dist',target)),`${file}: ${target}`);}
  }
  const play=fs.readFileSync(path.join(__dirname,'..','play.html'),'utf8');assert.ok(!play.includes('class="field-notes"'));assert.ok(!play.includes('Same little dino.'));assert.ok(!play.includes('id="journal"'));
});
