const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const drive=require('./trial-controls');
function trial(variant,rank=0,speed=920,width=1000,seed=42){
  const context={window:{}};vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../trials.js'),'utf8'),context);
  const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  return context.window.DinoTrials.create({variant,rank,speed,width,height:360,random});
}
test('all nine distinct trap modes have collision-respecting routes at every supported entry speed',()=>{
  for(const width of [600,1000])for(const speed of [500,720,920,1080])for(let variant=0;variant<9;variant++)for(const seed of [1,42,77]){
    const stage=trial(variant,0,speed,width,seed);
    for(let t=0;t<18&&!stage.dead;t+=1/120)stage.step(1/120,drive(stage));
    assert.equal(stage.dead,false,`${width}/${speed}/${variant}/${seed}: ${stage.reason}`);
  }
});
test('five new boss profiles are physically beatable at their higher speeds',()=>{
  for(const [variant,rank]of [[6,1],[1,2],[3,3],[4,4],[8,5]])for(const width of [600,1000])for(const seed of [1,42,77]){
    const stage=trial(variant,rank,1020+rank*40,width,seed);
    for(let t=0;t<22&&!stage.dead;t+=1/120)stage.step(1/120,drive(stage));
    assert.equal(stage.dead,false,`${variant}/${rank}/${width}/${seed}: ${stage.reason}`);
  }
});
test('longer jetpack holds increase height and releasing regenerates fuel',()=>{
  const short=trial(8),long=trial(8);short.cursor=long.cursor=Infinity;
  for(let t=0;t<.4;t+=1/120){short.step(1/120,{held:t<.15});long.step(1/120,{held:true});}
  assert.ok(long.player.y<short.player.y-20);const fuel=long.player.fuel;
  for(let t=0;t<.3;t+=1/120)long.step(1/120,{held:false});
  assert.ok(long.player.fuel>fuel);assert.equal(long.dead,false);
});
test('concealed traps activate suddenly, press ceilings have a crouching route, and springs launch automatically',()=>{
  const press=trial(1);press.cursor=Infinity;press.objects=[{kind:'press',x:press.player.x+press.speed*.25,w:160,h:0,y:0,bottom:90,hidden:true,active:false}];
  for(let t=0;t<.5&&!press.dead;t+=1/120)press.step(1/120,{duck:true});
  assert.equal(press.dead,false);assert.equal(press.objects[0].active,true);
  const spring=trial(5);spring.cursor=Infinity;spring.objects=[{kind:'spring',x:105,w:130,h:10,y:282,used:false}];
  for(let t=0;t<.08;t+=1/120)spring.step(1/120,{});assert.ok(spring.player.vy<-700);
});
test('UFO taps flap, ship hold supplies continuous thrust, and invisible walls are collidable when revealed',()=>{
  const ufo=trial(3);ufo.jump();assert.equal(ufo.player.vy,-285);
  const ship=trial(4);ship.cursor=Infinity;ship.step(.1,{held:true});assert.ok(ship.player.vy<0);
  const wall=trial(7);wall.cursor=Infinity;wall.objects=[{kind:'wall',x:105,w:45,h:70,y:222,hidden:true,active:false}];wall.step(.01,{});
  assert.equal(wall.dead,true);assert.equal(wall.reason,'phantom wall');
});

test('all nine movement modes render their real hazards and controls without non-finite geometry',()=>{
  for(let variant=0;variant<9;variant++){
    const stage=trial(variant);stage.step(.01,{});let calls=0;
    const ctx=new Proxy({}, {get:(_,name)=>(...args)=>{calls++;for(const value of args)if(typeof value==='number')assert.ok(Number.isFinite(value),`${variant}/${String(name)}`);}});
    stage.draw(ctx,{bg:'#fff',ink:'#555',faint:'#ddd'},()=>{});assert.ok(calls>30);
  }
});
