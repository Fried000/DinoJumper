(() => {
  'use strict';
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
  const clone=value=>JSON.parse(JSON.stringify(value,(key,item)=>typeof item==='function'?undefined:typeof item==='number'&&!Number.isFinite(item)?{$nonFinite:String(item)}:item),(key,item)=>item&&typeof item==='object'&&item.$nonFinite?Number(item.$nonFinite):item);
  const modes=['run','run','run','ufo','ship','run','rhythm','run','jetpack'];
  const bosses=[
    {name:'BEAT REAPER',variant:6,duration:16,concept:'SYNC JUMPS · DOUBLE SPIKE BEATS'},
    {name:'PRESS SOVEREIGN',variant:1,duration:17,concept:'CRUSHING CEILINGS · MOVING BONE SPIKES'},
    {name:'PARALLAX MOTH',variant:3,duration:18,concept:'UFO TAPS · SHIFTING CRYSTAL WINDOWS'},
    {name:'ION LEVIATHAN',variant:4,duration:19,concept:'HOLD TO FLY · MOVING METEOR ROTORS'},
    {name:'NULL ARCHITECT',variant:8,duration:21,concept:'HOLD FOR JETPACK HEIGHT · RELEASE TO DROP · MANAGE FUEL'},
  ];
  function create({variant=0,rank=0,speed=500,width=1000,height=360,random=Math.random}){
    const rand=(a,b)=>a+random()*(b-a),floor=292;
    const stage={variant,rank,speed,width,height,mode:modes[variant],age:0,distance:0,dead:false,reason:'',collisions:0,lastHazard:null,lastBoundary:null,collected:0,objects:[],gaps:[],platforms:[],cursor:speed*1.7+105,center:165,beat:rand(.63,.7),beats:0,cleanBeats:0,chapter:1,lastPattern:'',player:{x:105,y:247,w:34,h:40,vy:0,jumps:0,grounded:true,fuel:1.4,falling:false}};
    const p=stage.player;
    if(['ship','ufo','jetpack'].includes(stage.mode)){p.y=145;p.h=26;p.w=30;p.grounded=false;}
    const add=(kind,x,w,h,extra={})=>stage.objects.push({kind,x,w,h,y:floor-h,hidden:false,active:true,...extra});
    const gap=(x,w,lava=false)=>stage.gaps.push({x,w,lava});
    function generate(){
      while(stage.cursor<stage.distance+width+speed*2){
        const x=stage.cursor;
        if(['ship','ufo','jetpack'].includes(stage.mode)){
          stage.center=clamp(stage.center+rand(-32,32),95,235);
          const opening=rand(118,137)-(rank?rank*4:8),period=rand(1.45,2.1);
          add('gate',x,rand(23,38),0,{center:stage.center,opening,phase:rand(0,6.28),amplitude:variant===3?rand(12,20):variant===4?rand(16,25):rand(9,18),period});
          stage.cursor+=speed*rand(rank?1.08:1.2,1.45);
        }else if(variant===0){
          const w=speed*rand(.32,.43);gap(x,w);
          if(random()<.65)stage.platforms.push({x:x+w*.42,y:floor-rand(20,40),w:speed*rand(.12,.16),h:9,crumble:null,lifetime:rand(.23,.35)});
          stage.cursor+=w+speed*rand(.78,1.1);
        }else if(variant===1){
          const press=random()<.6;
          if(press)add('press',x,speed*rand(.23,.33),0,{bottom:90,hidden:true,active:false});
          else add('spike',x,speed*rand(.07,.11),rand(27,40),{moving:true,phase:rand(0,6.28)});
          stage.cursor+=speed*rand(1.2,1.5);
        }else if(variant===2){
          const thorn=random()<.65;
          if(thorn)add('spike',x,speed*rand(.07,.11),rand(26,39),{hidden:true,active:false,moving:random()<.5,phase:rand(0,6.28)});
          else add('vine',x,speed*rand(.18,.27),33,{y:228,movingY:true,phase:rand(0,6.28)});
          stage.cursor+=speed*rand(1.18,1.5);
        }else if(variant===5){
          add('spring',x,speed*.12,10,{used:false});
          const w=speed*rand(.63,.75);gap(x+speed*.18,w,true);
          add('volcano',x+speed*(1.4+rand(0,.16)),speed*.1,rand(55,77),{hidden:true,active:false});
          stage.cursor+=speed*rand(2.5,2.9);
        }else if(variant===6){
          add('spike',x,rand(20,29),rank>2?32:27,{beat:true});
          if(rank&&random()<.32)add('spike',x+speed*.11,21,24,{beat:true});
          stage.cursor+=speed*stage.beat;stage.beats++;
        }else{
          const kind=random()<.56?'wall':'press';
          add(kind,x,speed*rand(.1,.17),kind==='wall'?rand(60,83):0,{hidden:true,active:false,bottom:70});
          stage.cursor+=speed*rand(1.23,1.5);
        }
        if(!rank&&random()<.65)add('token',x+speed*.18,18,18,{y:['ship','ufo','jetpack'].includes(stage.mode)?stage.center-9:floor-95});
      }
    }
    function rects(o){
      const x=o.x-stage.distance+(o.moving?Math.sin(stage.age*3+o.phase)*speed*.055:0);
      if(o.kind==='gate'){
        const center=o.center+Math.sin(stage.age*o.period+o.phase)*o.amplitude;
        return [{x,y:0,w:o.w,h:center-o.opening/2},{x,y:center+o.opening/2,w:o.w,h:height-center-o.opening/2}];
      }
      if(o.kind==='press')return [{x,y:0,w:o.w,h:o.bottom}];
      return [{x,y:o.y+(o.movingY?Math.sin(stage.age*2+o.phase)*5:0),w:o.w,h:o.h}];
    }
    function die(reason,source=null){
      stage.reason=reason;stage.lastHazard=source?{x:source.x,w:source.w,kind:source.kind||'gap'}:null;
      if(stage.grace)return;
      if(stage.noclip){
        if(source){if(source.assistTouched)return;source.assistTouched=true;}
        else{const edge=p.y<4?'ceiling':'floor';if(stage.lastBoundary===edge)return;stage.lastBoundary=edge;}
        stage.collisions++;return;
      }
      stage.dead=true;
    }
    function jump(){
      if(stage.dead||p.falling)return;
      if(stage.mode==='ufo'){p.vy=-285;return;}
      if(['ship','jetpack'].includes(stage.mode))return;
      if(p.jumps>=(stage.mode==='rhythm'?1:2))return;
      p.vy=stage.mode==='rhythm'?-620:p.jumps?-610:-660;p.jumps++;p.grounded=false;
    }
    function step(dt,{held=false,duck=false,noclip=false,grace=false}={}){
      if(stage.dead)return;
      stage.noclip=noclip;stage.grace=grace;
      stage.age+=dt;stage.distance+=speed*dt;stage.chapter=1+Math.floor(stage.age/6);generate();
      if(['ship','ufo','jetpack'].includes(stage.mode)){
        let acceleration=stage.mode==='ship'?720:stage.mode==='ufo'?850:1050;
        if(stage.mode!=='ufo'&&held&&(stage.mode!=='jetpack'||p.fuel>0)){
          acceleration-=stage.mode==='ship'?1560:2250;
          if(stage.mode==='jetpack')p.fuel=Math.max(0,p.fuel-dt);
        }else p.fuel=Math.min(1.4,p.fuel+dt*.8);
        if(duck)acceleration+=500;
        p.vy=clamp(p.vy+acceleration*dt,-330,330);p.y+=p.vy*dt;
        if(p.y<4||p.y+p.h>height-4){die('flight boundary');if(noclip||grace){p.y=clamp(p.y,5,height-p.h-5);p.vy=0;}}
        else if(p.y>20&&p.y+p.h<height-20)stage.lastBoundary=null;
      }else{
        const bottom=p.y+p.h,gravity=stage.mode==='rhythm'?2350:1850;
        p.vy+=gravity*dt;p.y+=p.vy*dt;p.grounded=false;
        for(const platform of stage.platforms){
          if(platform.crumble!==null){platform.crumble-=dt;if(platform.crumble<=0){platform.falling=true;platform.vy=(platform.vy||0)+1500*dt;platform.y+=platform.vy*dt;continue;}}
          const x=platform.x-stage.distance;
          if(!p.falling&&p.vy>=0&&bottom<=platform.y+3&&p.y+p.h>=platform.y&&p.x+p.w>x&&p.x<x+platform.w){
            p.y=platform.y-p.h;p.vy=0;p.jumps=0;p.grounded=true;
            if(platform.crumble===null)platform.crumble=platform.lifetime;
          }
        }
        const hole=stage.gaps.find(g=>p.x+p.w/2+stage.distance>g.x&&p.x+p.w/2+stage.distance<g.x+g.w);
        if((!hole||(noclip&&hole.assistTouched)||grace)&&!p.falling&&p.y+p.h>=floor&&bottom<=floor+4){p.y=floor-p.h;p.vy=0;p.jumps=0;p.grounded=true;}
        if(hole&&p.y+p.h>floor+17)p.falling=true;
        if(hole?.lava&&p.y+p.h>floor+5){die('lava lake',hole);if(noclip||grace){p.y=floor-p.h;p.vy=0;p.jumps=0;p.grounded=true;p.falling=false;}}
        if(p.y>height-5){die('void fall',hole);if(noclip||grace){p.y=floor-p.h;p.vy=0;p.jumps=0;p.grounded=true;p.falling=false;}}
      }
      const box={x:p.x+3,y:p.y+(duck&&p.grounded?23:5),w:p.w-6,h:duck&&p.grounded?15:p.h-7};
      for(const o of stage.objects){
        const lead=(o.x-stage.distance-p.x)/speed;
        if(o.hidden&&!o.active&&lead<(o.kind==='press'?.85:o.kind==='wall'?.95:.9)){o.active=true;o.revealedAt=stage.age;}
        if(o.kind==='press'&&o.active)o.bottom=Math.min(floor-24,o.bottom+1700*dt);
        if(o.kind==='spring'){
          if(!o.used&&p.grounded&&overlap(box,{x:o.x-stage.distance,y:floor-12,w:o.w,h:16})){o.used=true;p.vy=-930;p.jumps=1;p.grounded=false;}
          continue;
        }
        if(o.kind==='token'){if(!o.collected&&overlap(box,rects(o)[0])){o.collected=true;stage.collected++;}continue;}
        if(o.kind==='gate'||o.active)for(const r of rects(o)){
          const hit={x:r.x+2,y:r.y+2,w:r.w-4,h:Math.max(0,r.h-4)};
          if(hit.h&&overlap(box,hit))die(o.kind==='press'?'crushing ceiling':o.kind==='wall'?'phantom wall':o.kind==='gate'?'flight gate':'hidden spike',o);
        }
      }
      stage.objects=stage.objects.filter(o=>!o.collected&&o.x+o.w>stage.distance-60);
      stage.gaps=stage.gaps.filter(g=>g.x+g.w>stage.distance-60);
      stage.platforms=stage.platforms.filter(t=>t.x+t.w>stage.distance-60&&t.y<height+30);
    }
    function draw(ctx,theme,drawDino){
      ctx.save();ctx.fillStyle=theme.bg;ctx.fillRect(0,0,width,height);
      ctx.strokeStyle=theme.faint;ctx.fillStyle=theme.faint;
      for(let i=0;i<24;i++){const x=(i*71-stage.distance*.15)%width;ctx.fillRect((x+width)%width,35+(i*43)%210,2,2);}
      ctx.save();ctx.globalAlpha=.55;ctx.strokeStyle=theme.faint;ctx.fillStyle=theme.faint;
      for(let i=0;i<6;i++){
        const x=((i*213-stage.distance*.12)%width+width)%width,y=75+(i*37)%120;
        if(variant===0){ctx.strokeRect(x,y,42,42);ctx.strokeRect(x+10,y+10,22,22);}
        if(variant===1){ctx.fillRect(x,30,9,140);ctx.fillRect(x-18,60,47,12);ctx.strokeRect(x-13,173,35,24);}
        if(variant===2){ctx.fillRect(x,70,8,220);ctx.fillRect(x-24,115,60,5);ctx.fillRect(x-12,151,5,4);ctx.fillRect(x+13,151,5,4);}
        if(variant===3){ctx.beginPath();ctx.moveTo(x,y-35);ctx.lineTo(x+24,y);ctx.lineTo(x,y+35);ctx.lineTo(x-24,y);ctx.closePath();ctx.stroke();}
        if(variant===4){ctx.beginPath();ctx.ellipse(x,y,34,16,-.5,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(x-35,y+40);ctx.lineTo(x-8,y+18);ctx.stroke();}
        if(variant===5){ctx.beginPath();ctx.moveTo(x-65,292);ctx.lineTo(x-10,180);ctx.lineTo(x+10,180);ctx.lineTo(x+65,292);ctx.closePath();ctx.fill();ctx.fillRect(x-3,157,6,15);}
        if(variant===6){ctx.save();ctx.translate(x,y);ctx.rotate(stage.age);ctx.strokeRect(-25,-25,50,50);ctx.strokeRect(-15,-15,30,30);ctx.restore();}
        if(variant===7){ctx.globalAlpha=.17;ctx.fillRect(x,y,28,160);ctx.strokeRect(x+6,y-8,28,160);ctx.globalAlpha=.55;}
        if(variant===8){ctx.beginPath();ctx.ellipse(x,y,40,55,stage.age*.2,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.ellipse(x,y,27,37,-stage.age*.2,0,Math.PI*2);ctx.stroke();}
      }ctx.restore();
      if(!['ship','ufo','jetpack'].includes(stage.mode)){
        ctx.strokeStyle=theme.ink;ctx.beginPath();ctx.moveTo(0,floor);ctx.lineTo(width,floor);ctx.stroke();
        for(const g of stage.gaps){const x=g.x-stage.distance;ctx.fillStyle=theme.bg;ctx.fillRect(x,floor-1,g.w,height-floor+1);ctx.fillStyle=g.lava?'#b9673b':'#262735';ctx.fillRect(x,floor+2,g.w,height-floor);}
        for(const t of stage.platforms){ctx.fillStyle=theme.ink;ctx.fillRect(t.x-stage.distance,t.y,t.w,9);}ctx.globalAlpha=1;
      }
      for(const o of stage.objects){
        ctx.fillStyle=o.kind==='spring'?'#9c884d':theme.ink;ctx.strokeStyle=theme.ink;
        ctx.globalAlpha=o.hidden&&!o.active?(o.kind==='wall'?.055:0):1;
        if(o.kind==='token'){ctx.strokeRect(o.x-stage.distance,o.y,18,18);ctx.fillRect(o.x-stage.distance+5,o.y+7,8,3);}
        else if(o.kind==='spring'){ctx.fillRect(o.x-stage.distance,o.y,o.w,4);ctx.strokeRect(o.x-stage.distance+4,o.y+4,o.w-8,6);}
        else for(const r of rects(o)){
          if(o.kind==='spike'){
            for(let x=r.x;x<r.x+r.w;x+=12){ctx.beginPath();ctx.moveTo(x,r.y+r.h);ctx.lineTo(x+6,r.y);ctx.lineTo(x+12,r.y+r.h);ctx.closePath();ctx.fill();}
          }else{ctx.fillRect(r.x,r.y,r.w,r.h);ctx.fillStyle=theme.bg;if(o.kind==='gate')ctx.fillRect(r.x+5,r.y+6,3,Math.max(0,r.h-12));ctx.fillStyle=theme.ink;}
        }
        ctx.globalAlpha=1;
      }
      ctx.fillStyle=theme.ink;ctx.strokeStyle=theme.ink;
      if(['run','rhythm'].includes(stage.mode))drawDino(p.x,p.y-5,2,Boolean(stage.duck));
      else{
        const y=p.y;
        if(stage.mode==='ufo'){ctx.fillRect(p.x,y+9,30,9);ctx.fillRect(p.x+7,y+2,16,7);ctx.fillRect(p.x+4,y+18,5,5);ctx.fillRect(p.x+21,y+18,5,5);}
        if(stage.mode==='ship'){ctx.beginPath();ctx.moveTo(p.x,y+3);ctx.lineTo(p.x+30,y+13);ctx.lineTo(p.x,y+24);ctx.lineTo(p.x+7,y+13);ctx.closePath();ctx.fill();}
        if(stage.mode==='jetpack'){drawDino(p.x,p.y-27,1,false);ctx.fillRect(p.x-5,y+8,8,15);if(stage.held){ctx.fillStyle='#c58745';ctx.fillRect(p.x-3,y+23,4,8);}}
      }
      ctx.font='10px Consolas,monospace';ctx.fillStyle=theme.ink;ctx.textAlign='left';
      ctx.fillText(stage.mode==='ship'?'SHIP · HOLD TO RISE / RELEASE TO DROP':stage.mode==='ufo'?'UFO · TAP TO FLAP':stage.mode==='jetpack'?'JETPACK · HOLD FOR HEIGHT / RELEASE TO REFUEL':stage.mode==='rhythm'?'RHYTHM · ONE JUMP PER BEAT':'JUMP / DOUBLE JUMP / CROUCH · TRAPS HAVE NO ALARMS',18,25);
      if(stage.mode==='rhythm'){const origin=1.7-p.w/speed-.24,phase=((stage.age-origin+stage.beat*100)%stage.beat)/stage.beat;ctx.globalAlpha=.2+phase*.5;ctx.fillRect(18,height-22,150*phase,4);ctx.globalAlpha=1;}
      if(stage.mode==='jetpack'){ctx.strokeRect(18,height-24,102,7);ctx.fillRect(19,height-23,100*p.fuel/1.4,5);}
      ctx.restore();
    }
    function update(dt,input){stage.held=Boolean(input.held);stage.duck=Boolean(input.duck);step(dt,input);}
    stage.jump=jump;stage.step=update;stage.draw=draw;stage.rects=rects;
    stage.snapshot=()=>clone(stage);
    stage.restore=saved=>{
      const copy=clone(saved);
      for(const key of Object.keys(stage))if(typeof stage[key]!=='function'&&key!=='player'&&!(key in copy))delete stage[key];
      for(const [key,value]of Object.entries(copy))if(key!=='player')stage[key]=value;
      for(const key of Object.keys(p))if(!(key in copy.player))delete p[key];
      Object.assign(p,copy.player);stage.player=p;stage.dead=false;
    };
    stage.recover=()=>{
      const end=stage.lastHazard?stage.lastHazard.x+stage.lastHazard.w-p.x+45:stage.distance;
      const advance=Math.max(0,end-stage.distance);stage.distance+=advance;stage.age+=advance/speed;
      const gate=stage.objects.find(o=>o.kind==='gate'&&o.x+o.w>stage.distance+p.x);
      p.y=['ship','ufo','jetpack'].includes(stage.mode)?clamp((gate?.center||165)-p.h/2,40,height-p.h-40):floor-p.h;
      p.vy=0;p.jumps=0;p.falling=false;p.grounded=!['ship','ufo','jetpack'].includes(stage.mode);p.fuel=1.4;stage.dead=false;stage.lastBoundary=null;
    };
    stage.canExit=()=>!p.falling&&stage.objects.every(o=>Math.abs(o.x-stage.distance-p.x)>speed*.65)&&!stage.gaps.some(g=>g.x<stage.distance+p.x+speed*.65&&g.x+g.w>stage.distance+p.x);
    stage.checkpointSafe=()=>{
      if(stage.dead||p.falling)return false;
      if(['ship','ufo','jetpack'].includes(stage.mode)){if(p.y<18||p.y+p.h>height-18)return false;}
      else if(!p.grounded)return false;
      const left=p.x-speed*.18,right=p.x+p.w+speed*.3;
      return stage.objects.every(o=>['token','spring'].includes(o.kind)||rects(o).every(r=>r.x>right||r.x+r.w<left))&&!stage.gaps.some(g=>g.x-stage.distance<right&&g.x+g.w-stage.distance>left);
    };
    return stage;
  }
  window.DinoTrials={create,bosses,modes};
})();
