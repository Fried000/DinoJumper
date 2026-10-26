// A constructive control sequence: successful runs demonstrate a physical route,
// without disabling collisions, spending resources, or changing the stage state.
module.exports=function drive(stage,jump=()=>stage.jump()){
  const p=stage.player,speed=stage.speed;
  if(['ship','ufo','jetpack'].includes(stage.mode)){
    const gate=stage.objects.find(o=>o.kind==='gate'&&o.x+o.w-stage.distance>p.x);
    let target=155;
    if(gate){const lead=Math.max(0,(gate.x-stage.distance-p.x)/speed);target=gate.center+Math.sin((stage.age+lead)*gate.period+gate.phase)*gate.amplitude-p.h/2;}
    if(stage.mode==='ufo'){if(p.vy>0&&p.y>target+9)jump();return {held:false,duck:false};}
    return {held:p.y+p.vy*(stage.mode==='jetpack'?.18:.23)>target,duck:false};
  }
  let duck=false;
  for(const o of stage.objects){
    if(['token','spring','gate'].includes(o.kind))continue;
    const r=stage.rects(o)[0],lead=(r.x-p.x-p.w+3)/speed;
    if(['press','vine'].includes(o.kind)&&r.x+r.w>p.x&&lead<.36)duck=true;
    if(['spike','wall','volcano'].includes(o.kind)&&lead<.24&&lead>-.05&&p.grounded)jump();
  }
  if(stage.variant!==5)for(const g of stage.gaps){
    const lead=(g.x-stage.distance-p.x-p.w/2)/speed;
    const inside=lead<0&&g.x+g.w-stage.distance>p.x+p.w/2;
    if(p.grounded&&((lead<.14&&lead>0)||inside))jump();
  }
  return {held:false,duck};
};
