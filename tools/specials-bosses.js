/* ============================================================
   SPECIAL ENEMIES & BOSSES
   - Specials: additive, EXACTLY ONE rolled per level.
     chance = level===10 ? 0 : 0.10 + level*0.10
   - Bosses: PLATFORMER level 10 only, keyed to enemy faction.
     0 ghosts -> Spectral Behemoth, 1 robots -> Iron Colossus,
     2 plants -> Alpha Bramble.
   ============================================================ */
const BOSS_NAMES=['SPECTRAL BEHEMOTH','IRON COLOSSUS','ALPHA BRAMBLE'];
const SPECIAL_NAMES=['PHANTASM CHANNELER','BOMB DRONE','SPORE SPITTER'];

function rollSpecialSpawn(){
  const ch=G.level===10?0:0.10+G.level*0.10;
  G.specialPlanned=Math.random()<ch;
  G.specialSpawnAt=rand(0.12,0.5);
  G.specialSpawned=false;
}
function getLevelProgress(){
  if(G.cfg.genre===0){
    if(G.level===10)return boss&&!boss.dead?0.5:1;
    const start=G.levelStartX,end=G.portal?G.portal.x:start+1;
    return clamp((player.x-start)/(end-start),0,1);
  }
  return G.killQuota>0?clamp(G.kills/G.killQuota,0,1):0;
}
function trySpawnSpecial(){
  if(!G.specialPlanned||G.specialSpawned||special||G.bossActive)return;
  if(getLevelProgress()<G.specialSpawnAt)return;
  spawnSpecial();
}
function spawnSpecial(){
  G.specialSpawned=true;
  const t=G.cfg.enemy;
  if(t===1)spawnBombDrone();
  else if(t===0)spawnChanneler();
  else spawnSpitter();
  G.bannerSub=SPECIAL_NAMES[t]+' DETECTED';
  G.bannerT=1.6;
  playSfx('drone_alarm',{vol:0.8});
}
function specialLoot(x,y){
  const n=1+Math.floor(Math.random()*2);
  for(let i=0;i<n;i++)spawnPickup(x+rand(-30,30),y+rand(-16,8));
}
function surfaceYAt(x,refY){
  let best=null;
  for(const s of solids){
    if(x<s.x||x>s.x+s.w)continue;
    if(s.y<refY-24)continue;
    if(best===null||s.y<best)best=s.y;
  }
  for(const p of platforms){
    if(x<p.x||x>p.x+p.w)continue;
    if(p.y<refY-24)continue;
    if(best===null||p.y<best)best=p.y;
  }
  if(G.cfg.genre===0&&best===null&&refY<=G.groundY+8)best=G.groundY;
  return best;
}
function damageSpecial(dmg){
  if(!special||special.dying)return;
  special.hp-=dmg;
  special.flashT=0.1;
  spawnDmgText(special.x+special.w/2,special.y-10,dmg);
  burstParticles(special.x+special.w/2,special.y+special.h/2,5,160,2.2,0.25,[255,255,255],[255,120,80],0);
  playSfx('enemy_hit',{vol:0.38});
  if(special.hp<=0)killSpecial();
}
function killSpecial(){
  const s=special;
  s.dying=true;
  G.score+=220*diffMods().score;
  addUlt(14);
  if(s.kind==='drone'){
    /* propulsion failure: gravity drop with smoke, crash sparks */
    s.phase='fall';
    s.vy=-60;
    playSfx('rocket_launch',{vol:0.5,rate:0.7});
  }else if(s.kind==='channeler'){
    /* staff shatters, body implodes into a vortex flash */
    s.phase='implode';
    s.phaseT=0.65;
    severTether();
    for(let i=0;i<7;i++){
      debris.push({x:s.x+s.w/2,y:s.y+s.h*0.3,vx:rand(-180,180),vy:rand(-220,-40),
        rot:rand(0,TAU),rotV:rand(-9,9),len:6+rand(0,10),life:0.9,kind:'shard'});
    }
    playSfx('clone_shatter',{vol:0.85});
    playSfx('vortex_pull',{vol:0.8});
  }else{
    /* vine snaps into debris, pod drops then bursts */
    s.phase='fall';
    s.vy=0;
    const ax=s.anchorX,ay=s.anchorY;
    for(let i=0;i<s.segs;i++){
      const k=(i+0.5)/s.segs;
      debris.push({x:ax+(s.x+s.w/2-ax)*k,y:ay+(s.y-ay)*k,
        vx:rand(-90,90),vy:rand(-60,40),rot:rand(0,TAU),rotV:rand(-7,7),
        len:10+rand(0,8),life:1.1,kind:'vine'});
    }
    playSfx('vine_snap',{vol:0.9});
  }
}

/* ---------------- FACTION A SPECIAL: BOMB DRONE ---------------- */
function spawnBombDrone(){
  const w=56,h=30;
  special={kind:'drone',w:w,h:h,
    x:G.camX+viewW*0.5-w/2,
    y:G.cfg.genre===0?viewH*0.16:viewH*0.14,
    vx:0,vy:0,tilt:0,thr:0,
    hp:Math.round((85+G.level*8)*diffMods().eHp),maxHp:1,
    mineT:2.4,flashT:0,dying:false,phase:'hover',smokeT:0,t:0};
  special.maxHp=special.hp;
}
function updateBombDrone(dt){
  const s=special;
  s.t+=dt;
  if(s.phase==='fall'){
    s.vy+=950*dt;
    s.y+=s.vy*dt;
    s.x+=s.vx*dt;
    s.tilt+=2.8*dt;
    s.smokeT-=dt;
    while(s.smokeT<=0){
      s.smokeT+=0.04;
      spawnParticle(s.x+s.w/2+rand(-8,8),s.y+rand(0,s.h),rand(-26,26),-rand(20,70),
        4+rand(0,2.5),0.55,[120,120,130],[40,40,48],-60);
    }
    const floorY=G.cfg.genre===0?surfaceYAt(s.x+s.w/2,s.y+s.h+80):viewH-44;
    if(floorY!==null&&s.y+s.h>=floorY-2){
      /* massive non-damaging spark explosion */
      burstParticles(s.x+s.w/2,floorY,36,360,4.4,0.7,[255,255,255],[255,170,50],110);
      burstParticles(s.x+s.w/2,floorY-6,18,200,3,0.5,[255,230,150],[200,80,20],60);
      spawnShockwave(s.x+s.w/2,floorY-8,120,'#ffb347');
      addShake(8,0.32);
      playSfx('explosion_big',{vol:0.85});
      specialLoot(s.x+s.w/2,floorY-20);
      special=null;
    }
    return;
  }
  /* hover-track the player with a weaving offset, tilting into accel */
  const pcx=player.x+player.w/2;
  const tx=pcx+Math.sin(s.t*0.85)*150;
  const ty=G.cfg.genre===0
    ?Math.max(60,player.y-185+Math.sin(s.t*1.7)*22)
    :Math.max(50,player.y-150+Math.sin(s.t*1.7)*22);
  const ax=clamp((tx-(s.x+s.w/2))*3.2,-560,560);
  const ay=clamp((ty-s.y)*3.2,-420,420);
  s.vx+=(ax-s.vx*2.4)*dt;
  s.vy+=(ay-s.vy*2.4)*dt;
  s.x+=s.vx*dt;
  s.y+=s.vy*dt;
  /* camera-locked: always stays inside the viewport */
  s.x=clamp(s.x,G.camX+16,G.camX+viewW-16-s.w);
  s.y=clamp(s.y,34,viewH*0.55);
  s.tilt+=(clamp(s.vx*0.0018,-0.42,0.42)-s.tilt)*Math.min(1,dt*9);
  s.thr=Math.min(1,Math.hypot(s.vx,s.vy)/300);
  s.mineT-=dt;
  if(s.mineT<=0){
    s.mineT=3+rand(0,1.6);
    mines.push({x:s.x+s.w/2,y:s.y+s.h+6,vy:40,spin:rand(0,TAU),
      spinV:rand(7,12)*(Math.random()<0.5?-1:1),
      fuse:1.5,r:11,landed:false,beepT:0,dead:false});
    playSfx('bomb_drop',{vol:0.5,rate:1.1});
  }
}
function beamEndpoint(x,y,ang){
  const dx=Math.cos(ang),dy=Math.sin(ang);
  const maxD=Math.hypot(viewW,viewH)+120;
  for(let d=14;d<maxD;d+=12){
    const px=x+dx*d,py=y+dy*d;
    if(G.cfg.genre===0){
      for(const sl of solids)if(px>=sl.x&&px<=sl.x+sl.w&&py>=sl.y&&py<=sl.y+sl.h)return{x:px,y:py};
      if(px<G.camX-30||px>G.camX+viewW+30||py<-30||py>viewH+30)return{x:px,y:py};
    }else{
      for(const w of walls)if(px>=w.x&&px<=w.x+w.w&&py>=w.y&&py<=w.y+w.h)return{x:px,y:py};
      if(px<-30||px>viewW+30||py<-30||py>viewH+30)return{x:px,y:py};
    }
  }
  return{x:x+dx*maxD,y:y+dy*maxD};
}
function updateMines(dt){
  for(let i=mines.length-1;i>=0;i--){
    const m=mines[i];
    if(m.dead){mines.splice(i,1);continue;}
    if(!m.landed){
      m.vy+=820*dt;
      m.y+=m.vy*dt;
      const fy=G.cfg.genre===0?surfaceYAt(m.x,m.y+m.r+40):viewH-44;
      if(fy!==null&&m.y+m.r>=fy){m.y=fy-m.r;m.landed=true;}
    }
    m.spin+=m.spinV*dt;
    m.fuse-=dt;
    m.beepT-=dt;
    if(m.beepT<=0){
      m.beepT=Math.max(0.09,m.fuse*0.3);
      playSfx('mine_beep',{vol:0.45,rate:1+(1.5-m.fuse)*0.4});
    }
    if(m.fuse<=0){
      m.dead=true;
      detonateMine(m);
    }
  }
}
function detonateMine(m){
  playSfx('bomb_detonate',{vol:0.9});
  burstParticles(m.x,m.y,20,300,4,0.5,[255,255,255],[255,120,40],60);
  spawnShockwave(m.x,m.y,80,'#ff8840');
  addShake(7,0.26);
  for(let k=0;k<6;k++){
    const ang=m.spin+k*(TAU/6);
    const end=beamEndpoint(m.x,m.y,ang);
    gridBeams.push({x1:m.x,y1:m.y,x2:end.x,y2:end.y,life:0.42,maxLife:0.42});
  }
}
function updateGridBeams(dt){
  for(let i=gridBeams.length-1;i>=0;i--){
    const b=gridBeams[i];
    b.life-=dt;
    if(b.life<=0){gridBeams.splice(i,1);continue;}
    if(!player.dead&&b.life>b.maxLife*0.2){
      const pc={x:player.x+player.w/2,y:player.y+player.h/2};
      if(distPointSeg(pc.x,pc.y,b.x1,b.y1,b.x2,b.y2)<7+Math.min(player.w,player.h)*0.4){
        damagePlayer(13);
      }
    }
  }
}

/* ---------------- FACTION B SPECIAL: PHANTASM CHANNELER ---------------- */
function spawnChanneler(){
  const w=42,h=64;
  special={kind:'channeler',w:w,h:h,
    x:G.camX+viewW*(player.x+player.w/2>G.camX+viewW/2?0.2:0.8)-w/2,
    y:G.cfg.genre===0?viewH*0.3:viewH*0.25,
    vx:0,vy:0,bob:0,t:0,
    hp:Math.round((80+G.level*7)*diffMods().eHp),maxHp:1,
    tetherOn:false,humT:0,flashT:0,dying:false,phase:'float',phaseT:0};
  special.maxHp=special.hp;
}
function tetherBlocked(x1,y1,x2,y2){
  const d=Math.hypot(x2-x1,y2-y1)||1;
  const steps=Math.ceil(d/14);
  for(let i=1;i<steps;i++){
    const px=x1+(x2-x1)*i/steps,py=y1+(y2-y1)*i/steps;
    if(G.cfg.genre===0){
      for(const s of solids)if(px>=s.x&&px<=s.x+s.w&&py>=s.y&&py<=s.y+s.h)return true;
      for(const p of platforms)if(px>=p.x&&px<=p.x+p.w&&py>=p.y&&py<=p.y+p.h)return true;
    }else{
      for(const w of walls)if(px>=w.x&&px<=w.x+w.w&&py>=w.y&&py<=w.y+w.h)return true;
    }
  }
  return false;
}
function severTether(){
  if(special&&special.tetherOn)special.tetherOn=false;
}
function channelerStaffTip(s){
  return{x:s.x+s.w/2+Math.cos(s.t*0.8)*4+s.w*0.62,y:s.y-s.h*0.28+s.bob};
}
function updateChanneler(dt){
  const s=special;
  s.t+=dt;
  s.bob=Math.sin(s.t*2.1)*7;
  if(s.phase==='implode'){
    s.phaseT-=dt;
    /* particle-sucking vortex flash */
    const cx=s.x+s.w/2,cy=s.y+s.h/2;
    for(let i=0;i<3;i++){
      const a=Math.random()*TAU,d=40+Math.random()*70;
      spawnParticle(cx+Math.cos(a)*d,cy+Math.sin(a)*d,
        -Math.cos(a)*240,-Math.sin(a)*240,2.6,0.3,[200,150,255],[120,60,220],0);
    }
    if(s.phaseT<=0){
      burstParticles(cx,cy,26,300,3.6,0.6,[255,255,255],[157,107,255],0);
      spawnShockwave(cx,cy,110,'#9d6bff');
      specialLoot(cx,cy);
      /* buffs fade out once the channeler is gone */
      for(const en of enemies)if(en.buffT>0)en.buffT=Math.min(en.buffT,0.6);
      special=null;
    }
    return;
  }
  /* drift to hold mid-range from the player, camera-locked */
  const pcx=player.x+player.w/2,pcy=player.y+player.h/2;
  const dx=pcx-(s.x+s.w/2),dy=pcy-(s.y+s.h/2);
  const d=Math.hypot(dx,dy)||1;
  const want=d>320?1:(d<210?-1:0);
  s.vx+=(dx/d*120*want-s.vx)*Math.min(1,dt*2.2);
  s.vy+=((dy/d*90*want+Math.sin(s.t*1.3)*30)-s.vy)*Math.min(1,dt*2.2);
  s.x+=s.vx*dt;
  s.y+=s.vy*dt;
  s.x=clamp(s.x,G.camX+18,G.camX+viewW-18-s.w);
  s.y=clamp(s.y,40,G.cfg.genre===0?G.groundY-s.h-30:viewH-80);
  /* ectoplasmic tether: max radius + line of sight */
  const tip=channelerStaffTip(s);
  const inRange=d<390;
  const blocked=tetherBlocked(tip.x,tip.y,pcx,pcy);
  s.tetherOn=inRange&&!blocked&&!player.dead;
  if(s.tetherOn){
    /* drains ult + shield only - NEVER hp */
    player.ult=Math.max(0,player.ult-15*dt);
    player.shield=Math.max(0,player.shield-10*dt);
    s.humT-=dt;
    if(s.humT<=0){s.humT=0.38;playSfx('tether_hum',{vol:0.4});}
    /* pump the stolen energy into nearby regulars */
    const scx=s.x+s.w/2,scy=s.y+s.h/2;
    for(const en of enemies){
      if(en.dead||isBuried(en))continue;
      if(dist2(scx,scy,en.x+en.w/2,en.y+en.h/2)<300*300){
        if(!(en.buffT>0)){
          playSfx('buff_pulse',{vol:0.5,rate:0.9+Math.random()*0.2});
          burstParticles(en.x+en.w/2,en.y+en.h/2,8,150,2.6,0.35,[200,150,255],[120,60,220],0);
        }
        en.buffT=1.4;
      }
    }
  }
}

/* ---------------- FACTION C SPECIAL: SPORE SPITTER ---------------- */
function spawnSpitter(){
  const w=44,h=46;
  const L=Math.min(viewH*0.34,300);
  special={kind:'spitter',w:w,h:h,
    anchorSX:viewW*0.5,anchorY:G.cfg.genre===0?14:12,len:L,
    swingA:0.85,omega:Math.sqrt(900/L),t:rand(0,3),
    x:0,y:0,ang:0,angV:0,segs:7,sprayT:2.2,
    hp:Math.round((85+G.level*7)*diffMods().eHp),maxHp:1,
    flashT:0,dying:false,phase:'swing',vy:0,anchorX:0};
  special.maxHp=special.hp;
  const s=special;
  s.anchorX=G.camX+s.anchorSX;
  s.ang=s.swingA*Math.sin(s.t*s.omega);
  s.x=s.anchorX+Math.sin(s.ang)*s.len-s.w/2;
  s.y=s.anchorY+Math.cos(s.ang)*s.len;
}
function updateSpitter(dt){
  const s=special;
  s.t+=dt;
  if(s.phase==='fall'){
    s.vy+=900*dt;
    s.y+=s.vy*dt;
    s.ang+=2.2*dt;
    const fy=G.cfg.genre===0?surfaceYAt(s.x+s.w/2,s.y+s.h+80):viewH-44;
    if(fy!==null&&s.y+s.h>=fy-2){
      /* burst into a giant non-damaging leaf & pollen cloud */
      burstParticles(s.x+s.w/2,fy-10,40,280,4,0.85,[180,255,170],[60,170,80],40);
      burstParticles(s.x+s.w/2,fy-14,22,160,3,1.1,[230,255,190],[140,210,90],-40);
      playSfx('spore_pop',{vol:0.9,rate:0.8});
      specialLoot(s.x+s.w/2,fy-20);
      special=null;
    }
    return;
  }
  /* pendulum harmonic oscillation from a camera-following anchor */
  s.anchorX=G.camX+s.anchorSX;
  s.ang=s.swingA*Math.sin(s.t*s.omega);
  s.angV=s.swingA*s.omega*Math.cos(s.t*s.omega);
  s.x=s.anchorX+Math.sin(s.ang)*s.len-s.w/2;
  s.y=s.anchorY+Math.cos(s.ang)*s.len;
  s.sprayT-=dt;
  if(s.sprayT<=0){
    s.sprayT=2.4+rand(0,1.4);
    /* spray wherever the pod currently faces (outward along the vine) */
    const fx=Math.sin(s.ang),fy2=Math.cos(s.ang);
    const px=s.x+s.w/2+fx*s.h*0.5,py=s.y+s.h*0.5+fy2*s.h*0.5;
    for(let i=0;i<6;i++){
      const spread=rand(-0.32,0.32);
      const ca=Math.atan2(fy2,fx)+spread;
      const sp=300+rand(0,90);
      eprojs.push({kind:'acid',x:px,y:py,vx:Math.cos(ca)*sp,vy:Math.sin(ca)*sp,
        r:5,dmg:8,grav:420,life:2.2});
    }
    playSfx('acid_spit',{vol:0.7,rate:0.95+Math.random()*0.1});
    burstParticles(px,py,6,120,2.4,0.3,[200,255,140],[110,190,40],60);
  }
}
function updateSpecial(dt){
  if(!special)return;
  special.flashT=Math.max(0,special.flashT-dt);
  if(special.kind==='drone')updateBombDrone(dt);
  else if(special.kind==='channeler')updateChanneler(dt);
  else updateSpitter(dt);
}
function updateDebris(dt){
  for(let i=debris.length-1;i>=0;i--){
    const d=debris[i];
    d.life-=dt;
    if(d.life<=0){debris.splice(i,1);continue;}
    d.vy+=800*dt;
    d.x+=d.vx*dt;
    d.y+=d.vy*dt;
    d.rot+=d.rotV*dt;
  }
}

/* ============================================================
   BOSSES (platformer level 10 only)
   ============================================================ */
function buildBossStage(D){
  G.levelStartX=70;
  G.portalLocked=true;
  G.bossActive=true;
  G.killQuota=0;
  G.kills=0;
  G.specialPlanned=false;
  G.specialSpawned=true;
  boss=null;
  special=null;
  G.groundY=Math.round(viewH*0.78);
  G.camX=0;
  const gy=G.groundY;
  const stageW=Math.max(560,Math.round(viewW*1.02));
  solids.push({x:0,y:gy,w:stageW+220,h:viewH-gy+260});
  G.worldW=stageW+90;
  G.portal={x:stageW-58,y:gy-96,w:48,h:96};
  player.x=64;
  player.y=gy-player.h;
  spawnBoss(gy);
}
function spawnBoss(gy){
  const t=G.cfg.enemy,D=diffMods();
  const hp=Math.round([1500,1750,1650][t]*D.eHp);
  boss={type:t,hp:hp,maxHp:hp,t:0,flashT:0,dead:false,dyingT:0,
    recover:false,recoverT:0,phase:'intro',phaseT:1.6,atkCd:1.3,facing:-1};
  if(t===1){
    /* IRON COLOSSUS */
    boss.w=150;boss.h=200;
    boss.x=G.worldW*0.55-boss.w/2;boss.y=gy-boss.h;
    boss.shadowX=boss.x+boss.w/2;boss.crouch=0;
    boss.beamAng=0;boss.beamBase=0;boss.beamT=0;boss.gunGlow=0;
  }else if(t===0){
    /* SPECTRAL BEHEMOTH */
    boss.w=120;boss.h=190;
    boss.x=G.worldW*0.55-boss.w/2;boss.y=gy-280;
    boss.alpha=0.85;boss.bob=0;boss.splitT=0;boss.msgT=0;
    boss.vortexT=0;boss.orbT=0;boss.homeY=gy-280;
  }else{
    /* ALPHA BRAMBLE - rooted near the portal end */
    boss.w=180;boss.h=215;
    boss.x=G.worldW-330;boss.y=gy-boss.h;
    boss.jaw=0;boss.cageT=0;boss.rootedX=boss.x;
  }
}
function damageBoss(dmg){
  if(!boss||boss.dead||boss.phase==='dying')return;
  const dealt=dmg*(boss.recover?1.35:1);
  boss.hp-=dealt;
  boss.flashT=0.1;
  spawnDmgText(boss.x+boss.w/2+rand(-14,14),boss.y-16,dealt);
  burstParticles(boss.x+boss.w/2,boss.y+boss.h*0.4,5,180,2.4,0.26,[255,255,255],[255,90,60],0);
  if(boss.hp<=0)startBossDeath();
}
function startBossDeath(){
  boss.phase='dying';
  boss.dyingT=3.2;
  boss.recover=false;
  clones.length=0;vines.length=0;pods.length=0;pillars.length=0;echoes.length=0;
  addShake(14,0.7);
  playSfx('explosion_big',{vol:0.9});
}
function unlockBossPortal(){
  G.portalLocked=false;
  G.bossActive=false;
  G.bannerSub='TOUCH THE PORTAL';
  G.bannerT=2.2;
  playSfx('portal',{vol:0.9});
  burstParticles(G.portal.x+G.portal.w/2,G.portal.y+G.portal.h/2,30,220,3.4,0.7,[255,255,255],[125,255,168],0);
  syncMusic();
}
function bossEnterRecover(t){
  boss.phase='recover';
  boss.recover=true;
  boss.recoverT=t;
}
function updateBoss(dt){
  if(!boss||boss.dead)return;
  boss.t+=dt;
  boss.flashT=Math.max(0,boss.flashT-dt);
  if(boss.phase==='dying'){
    boss.dyingT-=dt;
    if(Math.random()<0.5){
      burstParticles(boss.x+rand(8,boss.w-8),boss.y+rand(8,boss.h-8),
        rand(-130,130),rand(-180,40),4.2,0.5,[255,230,150],[255,60,20],120);
    }
    if(boss.dyingT<=0){
      boss.dead=true;
      burstParticles(boss.x+boss.w/2,boss.y+boss.h/2,56,440,5.5,0.95,[255,255,255],
        boss.type===0?[157,107,255]:(boss.type===1?[255,120,40]:[110,220,90]),100);
      addShake(18,0.85);
      unlockBossPortal();
    }
    return;
  }
  if(boss.phase==='intro'){
    boss.phaseT-=dt;
    if(boss.phaseT<=0){boss.phase='idle';boss.atkCd=1.1;}
    return;
  }
  if(boss.recover){
    boss.recoverT-=dt;
    if(boss.recoverT<=0){boss.recover=false;boss.phase='idle';boss.atkCd=0.9;}
    return;
  }
  if(boss.type===1)updateColossus(dt);
  else if(boss.type===0)updateBehemoth(dt);
  else updateBramble(dt);
}

/* ---- IRON COLOSSUS ---- */
function updateColossus(dt){
  const b=boss,gy=G.groundY;
  const pcx=player.x+player.w/2;
  b.facing=pcx>b.x+b.w/2?1:-1;
  if(b.phase==='idle'){
    /* heavy stride toward the player */
    b.x+=clamp(pcx-(b.x+b.w/2),-1,1)*46*dt;
    b.x=clamp(b.x,30,G.worldW-30-b.w);
    b.atkCd-=dt;
    if(b.atkCd<=0){
      const r=Math.random();
      if(r<0.34){b.phase='slam_tele';b.phaseT=0.62;playSfx('slam_warn',{vol:0.85});}
      else if(r<0.67){b.phase='laser_charge';b.phaseT=0.95;b.gunGlow=0;playSfx('beam_charge',{vol:0.8});}
      else{b.phase='volley';b.phaseT=0.4;b.volleyLeft=3;}
    }
    return;
  }
  if(b.phase==='slam_tele'){
    b.phaseT-=dt;
    b.crouch=Math.min(1,b.crouch+dt*3);
    if(b.phaseT<=0){
      b.phase='slam_air';
      b.phaseT=1.25;
      b.crouch=0;
      b.airFrom=b.y;
      b.shadowX=b.x+b.w/2;
      burstParticles(b.x+b.w/2,gy,16,240,3.4,0.4,[200,210,230],[120,130,150],190);
      addShake(6,0.25);
    }
    return;
  }
  if(b.phase==='slam_air'){
    b.phaseT-=dt;
    /* exponential launch fully off-screen */
    const k=1-Math.max(0,b.phaseT/1.25);
    b.y=b.airFrom-(Math.pow(k,0.55))*(b.airFrom+b.h+260);
    /* shadow shadows the player's X with an exponential tracking curve */
    b.shadowX+=(pcx-b.shadowX)*Math.min(1,dt*4.5);
    if(b.phaseT<=0){
      b.phase='slam_drop';
      b.x=clamp(b.shadowX-b.w/2,10,G.worldW-10-b.w);
    }
    return;
  }
  if(b.phase==='slam_drop'){
    b.y+=1750*dt; /* terminal velocity */
    if(b.y+b.h>=gy){
      b.y=gy-b.h;
      b.phase='slam_land';
      b.phaseT=0.3;
      addShake(13,0.45);
      playSfx('stomp',{vol:0.95});
      burstParticles(b.x+b.w/2,gy,26,330,4,0.55,[220,225,240],[130,140,160],220);
      const sx=b.x+b.w/2;
      bossWaves.push({x:sx,y:gy,dir:1,sp:360,h:24,grow:34,t:0,life:1.5});
      bossWaves.push({x:sx,y:gy,dir:-1,sp:360,h:24,grow:34,t:0,life:1.5});
      if(!player.dead&&player.invulnT<=0&&rectsOverlap(player,{x:b.x-8,y:b.y,w:b.w+16,h:b.h}))damagePlayer(24);
    }
    return;
  }
  if(b.phase==='slam_land'){
    b.phaseT-=dt;
    if(b.phaseT<=0)bossEnterRecover(1.5);
    return;
  }
  if(b.phase==='laser_charge'){
    b.phaseT-=dt;
    b.gunGlow=Math.min(1,b.gunGlow+dt*1.3);
    if(b.phaseT<=0){
      b.phase='laser_fire';
      b.phaseT=3.1;
      b.beamT=0;
      const gun=colossusGun(b);
      b.beamBase=Math.atan2(player.y+player.h/2-gun.y,pcx-gun.x);
    }
    return;
  }
  if(b.phase==='laser_fire'){
    b.phaseT-=dt;
    b.beamT+=dt;
    /* procedural sweep: angle = sin(time) * maxAngle */
    b.beamAng=b.beamBase+Math.sin(b.beamT*1.7)*0.52;
    const gun=colossusGun(b);
    const end=beamEndpoint(gun.x,gun.y,b.beamAng);
    b.beamEnd=end;
    if(!player.dead&&player.invulnT<=0){
      const pc={x:player.x+player.w/2,y:player.y+player.h/2};
      if(distPointSeg(pc.x,pc.y,gun.x,gun.y,end.x,end.y)<10+Math.min(player.w,player.h)*0.4){
        damagePlayer(18);
      }
    }
    if(Math.random()<0.4){
      spawnParticle(end.x+rand(-6,6),end.y+rand(-6,6),rand(-60,60),-rand(20,120),
        3,0.3,[255,160,140],[255,40,20],80);
    }
    Sfx.beamTickT=(Sfx.beamTickT||0)-dt;
    if(Sfx.beamTickT<=0){Sfx.beamTickT=0.09;playSfx('beam_sweep',{vol:0.32,rate:0.9+Math.random()*0.2});}
    if(b.phaseT<=0){b.beamEnd=null;bossEnterRecover(1.6);}
    return;
  }
  if(b.phase==='volley'){
    b.phaseT-=dt;
    if(b.volleyLeft>0&&b.phaseT<=0){
      const rx=b.x+b.w*(b.facing>0?0.85:0.15);
      const ry=b.y+b.h*0.22;
      const ang=Math.atan2(player.y-ry,pcx-rx)+rand(-0.5,0.5);
      eprojs.push({kind:'bossRocket',x:rx,y:ry,
        vx:Math.cos(ang)*180,vy:Math.sin(ang)*180,
        r:7,dmg:14,grav:0,life:5,armT:0.3,turn:3.1+rand(0,0.6),smokeT:0});
      playSfx('rocket_launch',{vol:0.55,rate:0.85});
      b.volleyLeft--;
      b.phaseT=0.28;
    }
    if(b.volleyLeft<=0&&b.phaseT<=0)bossEnterRecover(1.5);
  }
}
function colossusGun(b){
  return{x:b.x+(b.facing>0?b.w+6:-6),y:b.y+b.h*0.34};
}
function updateBossWaves(dt){
  for(let i=bossWaves.length-1;i>=0;i--){
    const w=bossWaves[i];
    w.t+=dt;
    w.x+=w.dir*w.sp*dt;
    if(w.t>=w.life){bossWaves.splice(i,1);continue;}
    const hh=w.h+w.grow*w.t;
    const box={x:w.x-14,y:w.y-hh,w:28,h:hh};
    if(!player.dead&&player.invulnT<=0&&player.shieldUltT<=0&&rectsOverlap(player,box)){
      if(player.onGround)damagePlayer(20);
    }
  }
}

/* ---- SPECTRAL BEHEMOTH ---- */
function updateBehemoth(dt){
  const b=boss,gy=G.groundY;
  const pcx=player.x+player.w/2;
  b.bob=Math.sin(b.t*1.6)*12;
  b.alpha=0.62+0.24*Math.sin(b.t*2.3);
  if(b.msgT>0)b.msgT-=dt;
  if(b.phase==='idle'){
    b.x+=clamp(pcx-(b.x+b.w/2),-1,1)*58*dt;
    b.x=clamp(b.x,20,G.worldW-20-b.w);
    b.y+=(b.homeY-b.y)*Math.min(1,dt*2);
    b.atkCd-=dt;
    if(b.atkCd<=0){
      const r=Math.random();
      if(r<0.34){startSoulSplit();}
      else if(r<0.67){b.phase='vortex_move';b.phaseT=0.7;}
      else{startTemporalHaunt();}
    }
    return;
  }
  if(b.phase==='split'){
    b.splitT-=dt;
    let aliveDecoys=0;
    for(const c of clones)if(!c.dead)aliveDecoys++;
    if(b.splitT<=0||aliveDecoys===0){
      for(const c of clones)if(!c.dead)shatterClone(c);
      clones.length=0;
      bossEnterRecover(1.4);
    }
    return;
  }
  if(b.phase==='vortex_move'){
    b.phaseT-=dt;
    const tx=G.camX+viewW/2-b.w/2,ty=viewH*0.34;
    b.x+=(tx-b.x)*Math.min(1,dt*4);
    b.y+=(ty-b.y)*Math.min(1,dt*4);
    if(b.phaseT<=0){
      b.phase='vortex';
      b.phaseT=4.6;
      b.orbT=0.3;
      playSfx('vortex_pull',{vol:0.9});
    }
    return;
  }
  if(b.phase==='vortex'){
    b.phaseT-=dt;
    const cx=b.x+b.w/2,cy=b.y+b.h*0.55;
    /* continuous pull force on the player */
    if(!player.dead){
      const dx=cx-(player.x+player.w/2),dy=cy-(player.y+player.h/2);
      const d=Math.hypot(dx,dy)||1;
      const pull=G.cfg.genre===0?290:330;
      player.vx+=dx/d*pull*dt;
      if(G.cfg.genre===0)player.vy+=dy/d*pull*0.45*dt;
      else player.vy+=dy/d*pull*dt;
      if(d<46&&player.invulnT<=0)damagePlayer(12);
    }
    /* swirling intake particles */
    if(Math.random()<0.6){
      const a=Math.random()*TAU,dd=90+Math.random()*120;
      spawnParticle(cx+Math.cos(a)*dd,cy+Math.sin(a)*dd,
        -Math.cos(a+0.8)*200,-Math.sin(a+0.8)*200,2.8,0.4,[200,150,255],[90,40,180],0);
    }
    /* slow wave-trajectory spirit orbs */
    b.orbT-=dt;
    if(b.orbT<=0){
      b.orbT=0.55;
      const oa=Math.random()*TAU;
      eprojs.push({kind:'orb',x:cx,y:cy,baseAng:oa,sp:95,wT:0,
        vx:Math.cos(oa)*95,vy:Math.sin(oa)*95,r:8,dmg:10,grav:0,life:4.2});
    }
    if(b.phaseT<=0)bossEnterRecover(1.5);
    return;
  }
  if(b.phase==='haunt'){
    b.phaseT-=dt;
    if(b.phaseT<=0)bossEnterRecover(1.3);
    return;
  }
}
function startSoulSplit(){
  const b=boss;
  b.phase='split';
  b.splitT=7;
  b.msgT=2;
  playSfx('soul_split',{vol:0.95});
  burstParticles(b.x+b.w/2,b.y+b.h/2,24,260,3.4,0.5,[230,200,255],[120,60,220],0);
  /* 3 identical kings - only the real one is vulnerable */
  const slots=[0.18,0.5,0.82].map(f=>G.camX+viewW*f-b.w/2);
  for(let i=slots.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    const tmp=slots[i];slots[i]=slots[j];slots[j]=tmp;
  }
  b.x=slots[0];
  b.y=b.homeY+rand(-30,30);
  clones.length=0;
  for(let i=1;i<3;i++){
    clones.push({x:slots[i],y:b.homeY+rand(-30,30),w:b.w,h:b.h,
      t:rand(0,3),dead:false,shatterT:0});
  }
}
function shatterClone(c){
  c.dead=true;
  burstParticles(c.x+c.w/2,c.y+c.h/2,22,260,3.2,0.55,[230,210,255],[130,80,220],0);
  playSfx('clone_shatter',{vol:0.8});
}
function updateClones(dt){
  for(let i=clones.length-1;i>=0;i--){
    const c=clones[i];
    if(c.dead){clones.splice(i,1);continue;}
    c.t+=dt;
    c.y+=Math.sin(c.t*1.6)*12*dt;
  }
}
function startTemporalHaunt(){
  const b=boss;
  b.phase='haunt';
  b.phaseT=1.2;
  playSfx('phantom',{vol:0.8,rate:0.8});
  /* capture the player's last 3 seconds of coordinates */
  if(histBuf.length>4){
    echoes.push({path:histBuf.slice(),i:0,t:0,trail:[],done:false,
      x:histBuf[0].x,y:histBuf[0].y});
  }
}
function updateEchoes(dt){
  for(let i=echoes.length-1;i>=0;i--){
    const e=echoes[i];
    if(!e.done){
      e.t+=dt;
      const idx=Math.min(e.path.length-1,e.t/HIST_DT);
      const i0=Math.floor(idx),i1=Math.min(e.path.length-1,i0+1);
      const fr=idx-i0;
      e.x=e.path[i0].x+(e.path[i1].x-e.path[i0].x)*fr;
      e.y=e.path[i0].y+(e.path[i1].y-e.path[i0].y)*fr;
      e.trailT=(e.trailT||0)-dt;
      if(e.trailT<=0){
        e.trailT=0.07;
        e.trail.push({x:e.x,y:e.y,life:1.3});
      }
      if(i0>=e.path.length-1)e.done=true;
      /* the echo itself is hostile */
      if(!player.dead&&player.invulnT<=0&&
         dist2(e.x,e.y,player.x+player.w/2,player.y+player.h/2)<26*26){
        damagePlayer(12);
      }
    }
    for(let k=e.trail.length-1;k>=0;k--){
      const tr=e.trail[k];
      tr.life-=dt;
      if(tr.life<=0){e.trail.splice(k,1);continue;}
      if(!player.dead&&player.invulnT<=0&&tr.life>0.3&&
         dist2(tr.x,tr.y,player.x+player.w/2,player.y+player.h/2)<17*17){
        damagePlayer(8);
      }
    }
    if(e.done&&e.trail.length===0)echoes.splice(i,1);
  }
}
const HIST_DT=0.06;
function recordHistory(dt){
  if(!G.bossActive||G.cfg.enemy!==0)return;
  G.histT=(G.histT||0)-dt;
  if(G.histT<=0){
    G.histT=HIST_DT;
    histBuf.push({x:player.x+player.w/2,y:player.y+player.h/2});
    while(histBuf.length>Math.ceil(3/HIST_DT))histBuf.shift();
  }
}

/* ---- ALPHA BRAMBLE ---- */
function updateBramble(dt){
  const b=boss,gy=G.groundY;
  b.jaw=0.5+0.5*Math.sin(b.t*1.8);
  if(b.phase==='idle'){
    b.atkCd-=dt;
    if(b.atkCd<=0){
      const r=Math.random();
      if(r<0.34)startRootEruption();
      else if(r<0.67)startVineCage();
      else startSporeGrid();
    }
    return;
  }
  if(b.phase==='roots'){
    b.phaseT-=dt;
    if(b.phaseT<=0)bossEnterRecover(1.5);
    return;
  }
  if(b.phase==='cage'){
    b.cageT-=dt;
    let alive=0;
    for(const v of vines)if(!v.dead)alive++;
    if(b.cageT<=0||alive===0){
      for(const v of vines)v.retract=true;
      bossEnterRecover(1.6);
    }
    return;
  }
  if(b.phase==='spores'){
    b.phaseT-=dt;
    if(b.phaseT<=0&&pods.length===0)bossEnterRecover(1.4);
    return;
  }
}
function startRootEruption(){
  const b=boss;
  b.phase='roots';
  b.phaseT=1.9;
  playSfx('slam_warn',{vol:0.7});
  const px=player.x+player.w/2;
  const offs=[-95,0,95];
  for(const o of offs){
    pillars.push({x:clamp(px+o,30,G.worldW-30),warnT:0.55,upT:0,
      h:175,w:36,state:'warn',holdT:0.55,t:0});
  }
}
function updatePillars(dt){
  const gy=G.groundY;
  for(let i=pillars.length-1;i>=0;i--){
    const p=pillars[i];
    p.t+=dt;
    if(p.state==='warn'){
      p.warnT-=dt;
      if(p.warnT<=0){
        p.state='up';
        playSfx('pillar_erupt',{vol:0.85});
        addShake(7,0.25);
        burstParticles(p.x,gy,14,220,3.2,0.4,[150,110,60],[80,50,20],200);
      }
    }else if(p.state==='up'){
      p.upT=Math.min(1,p.upT+dt*7);
      if(p.upT>=1){p.state='hold';}
      brambleSpikeHit(p,gy);
    }else if(p.state==='hold'){
      p.holdT-=dt;
      brambleSpikeHit(p,gy);
      if(p.holdT<=0)p.state='down';
    }else{
      p.upT-=dt*3.4;
      if(p.upT<=0){pillars.splice(i,1);continue;}
    }
  }
}
function brambleSpikeHit(p,gy){
  if(player.dead||player.invulnT>0)return;
  const hh=p.h*p.upT;
  if(rectsOverlap(player,{x:p.x-p.w/2,y:gy-hh,w:p.w,h:hh}))damagePlayer(16);
}
function startVineCage(){
  const b=boss;
  b.phase='cage';
  b.cageT=8.5;
  playSfx('vine_snap',{vol:0.7,rate:0.8});
  vines.length=0;
  const hp=Math.round(34*diffMods().eHp);
  vines.push({side:'L',depth:0,max:viewW*0.26,hp:hp,maxHp:hp,dead:false,retract:false,t:rand(0,9)});
  vines.push({side:'R',depth:0,max:viewW*0.26,hp:hp,maxHp:hp,dead:false,retract:false,t:rand(0,9)});
  vines.push({side:'T',depth:0,max:viewH*0.3,hp:hp,maxHp:hp,dead:false,retract:false,t:rand(0,9)});
  vines.push({side:'B',depth:0,max:64,hp:hp,maxHp:hp,dead:false,retract:false,t:rand(0,9)});
}
function vineRect(v){
  const cx=G.camX;
  if(v.side==='L')return{x:cx,y:0,w:v.depth,h:viewH};
  if(v.side==='R')return{x:cx+viewW-v.depth,y:0,w:v.depth,h:viewH};
  if(v.side==='T')return{x:cx,y:0,w:viewW,h:v.depth};
  return{x:cx,y:G.groundY-v.depth,w:viewW,h:v.depth};
}
function updateVines(dt){
  for(let i=vines.length-1;i>=0;i--){
    const v=vines[i];
    v.t+=dt;
    if(v.dead||v.retract){
      v.depth-=190*dt;
      if(v.depth<=0){vines.splice(i,1);}
      continue;
    }
    v.depth=Math.min(v.max,v.depth+26*dt);
    if(!player.dead&&player.invulnT<=0&&v.depth>8&&rectsOverlap(player,vineRect(v))){
      damagePlayer(10);
    }
  }
}
function damageVine(v,dmg){
  if(v.dead)return;
  v.hp-=dmg;
  const r=vineRect(v);
  spawnDmgText(r.x+r.w/2,r.y+r.h/2,dmg);
  burstParticles(r.x+r.w/2+rand(-30,30),r.y+r.h/2+rand(-30,30),5,140,2.4,0.3,[180,255,150],[60,160,60],60);
  if(v.hp<=0){
    v.dead=true;
    playSfx('vine_snap',{vol:0.85});
    burstParticles(r.x+r.w/2,r.y+r.h/2,16,220,3,0.5,[180,255,150],[60,160,60],150);
  }
}
function startSporeGrid(){
  const b=boss;
  b.phase='spores';
  b.phaseT=6.5;
  playSfx('spore_pop',{vol:0.6,rate:1.2});
  pods.length=0;
  const n=7;
  for(let i=0;i<n;i++){
    pods.push({x:G.camX+viewW*(0.12+0.76*(i/(n-1)))+rand(-22,22),
      y:viewH*(0.2+((i%2)?0.18:0))+rand(-18,18),
      r:13,timer:4+rand(0,1.6),chainT:-1,dead:false,t:rand(0,5)});
  }
}
function explodePod(p){
  if(p.dead)return;
  p.dead=true;
  playSfx('spore_pop',{vol:0.8,rate:0.9+Math.random()*0.2});
  burstParticles(p.x,p.y,18,240,3.4,0.5,[200,255,150],[90,180,50],60);
  spawnShockwave(p.x,p.y,70,'#7dffa8');
  gas.push({x:p.x,y:p.y,r:56,life:3,t:0});
  if(!player.dead&&player.invulnT<=0&&
     dist2(p.x,p.y,player.x+player.w/2,player.y+player.h/2)<72*72){
    damagePlayer(13);
  }
  /* cascading chain reaction through neighbouring pods */
  for(const q of pods){
    if(q.dead||q===p||q.chainT>=0)continue;
    if(dist2(p.x,p.y,q.x,q.y)<135*135)q.chainT=0.16;
  }
}
function updatePods(dt){
  for(let i=pods.length-1;i>=0;i--){
    const p=pods[i];
    if(p.dead){pods.splice(i,1);continue;}
    p.t+=dt;
    p.y+=Math.sin(p.t*2.2)*8*dt;
    p.timer-=dt;
    if(p.chainT>=0){
      p.chainT-=dt;
      if(p.chainT<=0)explodePod(p);
    }else if(p.timer<=0)explodePod(p);
  }
}
function updateGas(dt){
  for(let i=gas.length-1;i>=0;i--){
    const g2=gas[i];
    g2.t+=dt;
    g2.life-=dt;
    if(g2.life<=0){gas.splice(i,1);continue;}
    if(!player.dead&&player.invulnT<=0&&
       dist2(g2.x,g2.y,player.x+player.w/2,player.y+player.h/2)<g2.r*g2.r){
      damagePlayer(7);
    }
  }
}
