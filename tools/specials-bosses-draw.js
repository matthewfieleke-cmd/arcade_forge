/* ---------------- SPECIAL ENEMY & BOSS RENDERING ---------------- */
function drawSpecialBar(s){
  const w=46;
  ctx.fillStyle='rgba(8,12,20,0.7)';
  ctx.fillRect(s.x+s.w/2-w/2,s.y-12,w,5);
  ctx.fillStyle='#ffd95f';
  ctx.fillRect(s.x+s.w/2-w/2+1,s.y-11,(w-2)*clamp(s.hp/s.maxHp,0,1),3);
}
function drawSpecial(){
  const s=special;
  if(!s)return;
  ctx.save();
  if(s.flashT>0)ctx.globalAlpha=0.55+0.45*Math.sin(G.gameTime*42);
  if(s.kind==='drone')drawBombDrone(s);
  else if(s.kind==='channeler')drawChanneler(s);
  else drawSpitter(s);
  ctx.restore();
  if(!s.dying)drawSpecialBar(s);
}
function drawBombDrone(s){
  const cx=s.x+s.w/2,cy=s.y+s.h/2;
  ctx.save();
  ctx.translate(cx,cy);
  ctx.rotate(s.tilt||0);
  ctx.translate(-cx,-cy);
  /* angular vector hull */
  ctx.shadowColor='#ff6b6b';
  ctx.shadowBlur=10;
  const hg=ctx.createLinearGradient(s.x,s.y,s.x,s.y+s.h);
  hg.addColorStop(0,'#727e92');
  hg.addColorStop(1,'#2c323f');
  ctx.fillStyle=hg;
  ctx.beginPath();
  ctx.moveTo(s.x,s.y+s.h*0.45);
  ctx.lineTo(s.x+s.w*0.2,s.y);
  ctx.lineTo(s.x+s.w*0.8,s.y);
  ctx.lineTo(s.x+s.w,s.y+s.h*0.45);
  ctx.lineTo(s.x+s.w*0.78,s.y+s.h);
  ctx.lineTo(s.x+s.w*0.22,s.y+s.h);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur=0;
  /* hazard stripes */
  ctx.fillStyle='#ffd95f';
  for(let i=0;i<3;i++)ctx.fillRect(s.x+s.w*0.26+i*s.w*0.18,s.y+s.h*0.42,s.w*0.09,5);
  /* optic eye */
  ctx.fillStyle='#ff4040';
  ctx.shadowColor='#ff4040';
  ctx.shadowBlur=12;
  ctx.beginPath();
  ctx.arc(cx,s.y+s.h*0.26,4.2,0,TAU);
  ctx.fill();
  ctx.shadowBlur=0;
  /* rotor glow pods */
  for(const sideX of[s.x-3,s.x+s.w+3]){
    ctx.strokeStyle='rgba(155,232,255,0.85)';
    ctx.lineWidth=2.5;
    ctx.beginPath();
    ctx.ellipse(sideX,s.y+s.h*0.3,9,3.4+Math.sin(G.gameTime*30)*1.2,0,0,TAU);
    ctx.stroke();
  }
  /* thruster flame */
  const fl=4+s.thr*8+Math.sin(G.gameTime*26)*2;
  const tg=ctx.createLinearGradient(cx,s.y+s.h,cx,s.y+s.h+fl*2);
  tg.addColorStop(0,'rgba(255,210,110,0.95)');
  tg.addColorStop(1,'rgba(255,90,20,0)');
  ctx.fillStyle=tg;
  ctx.beginPath();
  ctx.moveTo(cx-6,s.y+s.h-2);
  ctx.lineTo(cx,s.y+s.h+fl*2);
  ctx.lineTo(cx+6,s.y+s.h-2);
  ctx.closePath();
  ctx.fill();
  /* bomb bay */
  ctx.fillStyle='#1a1e27';
  ctx.fillRect(cx-7,s.y+s.h-6,14,6);
  ctx.restore();
}
function drawMines(){
  for(const m of mines){
    ctx.save();
    ctx.translate(m.x,m.y);
    ctx.rotate(m.spin);
    const urgency=1-clamp(m.fuse/1.5,0,1);
    ctx.shadowColor='#ff4040';
    ctx.shadowBlur=8+urgency*14;
    ctx.fillStyle='#3a4250';
    hexPath(ctx,0,0,m.r,0);
    ctx.fill();
    ctx.strokeStyle='#ffd95f';
    ctx.lineWidth=2;
    hexPath(ctx,0,0,m.r,0);
    ctx.stroke();
    /* blinking core */
    const blink=Math.sin(G.gameTime*(8+urgency*26))>0;
    ctx.fillStyle=blink?'#ff3030':'#7a1515';
    ctx.beginPath();
    ctx.arc(0,0,3.6+urgency*1.6,0,TAU);
    ctx.fill();
    /* spin marker fins */
    ctx.strokeStyle='rgba(255,217,95,0.7)';
    ctx.lineWidth=1.6;
    for(let k=0;k<6;k++){
      const a=k*(TAU/6);
      ctx.beginPath();
      ctx.moveTo(Math.cos(a)*m.r,Math.sin(a)*m.r);
      ctx.lineTo(Math.cos(a)*(m.r+4),Math.sin(a)*(m.r+4));
      ctx.stroke();
    }
    ctx.restore();
  }
}
function drawGridBeams(){
  for(const b of gridBeams){
    const k=b.life/b.maxLife;
    ctx.save();
    ctx.globalAlpha=Math.min(1,k*1.6);
    ctx.shadowColor='#ff4030';
    ctx.shadowBlur=16;
    ctx.strokeStyle='rgba(255,235,230,0.95)';
    ctx.lineWidth=2.4;
    ctx.beginPath();
    ctx.moveTo(b.x1,b.y1);
    ctx.lineTo(b.x2,b.y2);
    ctx.stroke();
    ctx.strokeStyle='rgba(255,80,50,0.8)';
    ctx.lineWidth=7;
    ctx.globalAlpha=k*0.55;
    ctx.stroke();
    ctx.restore();
  }
}
function drawChanneler(s){
  const cx=s.x+s.w/2;
  const byT=s.y+s.bob;
  ctx.save();
  ctx.shadowColor='#9d6bff';
  ctx.shadowBlur=14;
  /* legless cloak: tapering bezier robe */
  const rg=ctx.createLinearGradient(cx,byT,cx,byT+s.h);
  rg.addColorStop(0,'rgba(170,130,235,0.95)');
  rg.addColorStop(0.7,'rgba(90,55,170,0.85)');
  rg.addColorStop(1,'rgba(70,40,140,0)');
  ctx.fillStyle=rg;
  ctx.beginPath();
  ctx.moveTo(cx,byT);
  ctx.bezierCurveTo(cx-s.w*0.62,byT+s.h*0.25,cx-s.w*0.5,byT+s.h*0.7,
    cx-s.w*0.16+Math.sin(s.t*3)*4,byT+s.h);
  ctx.lineTo(cx+s.w*0.16+Math.sin(s.t*3+1.4)*4,byT+s.h);
  ctx.bezierCurveTo(cx+s.w*0.5,byT+s.h*0.7,cx+s.w*0.62,byT+s.h*0.25,cx,byT);
  ctx.closePath();
  ctx.fill();
  /* hood + glowing eyes */
  ctx.fillStyle='#241540';
  ctx.beginPath();
  ctx.arc(cx,byT+s.h*0.18,s.w*0.3,0,TAU);
  ctx.fill();
  ctx.fillStyle='#e7d4ff';
  ctx.shadowBlur=10;
  ctx.beginPath();
  ctx.arc(cx-5,byT+s.h*0.17,2.4,0,TAU);
  ctx.arc(cx+5,byT+s.h*0.17,2.4,0,TAU);
  ctx.fill();
  /* luminous vector staff */
  const tip=channelerStaffTip(s);
  ctx.strokeStyle='#c9a6ff';
  ctx.lineWidth=3;
  ctx.shadowBlur=12;
  ctx.beginPath();
  ctx.moveTo(cx+s.w*0.3,byT+s.h*0.72);
  ctx.lineTo(tip.x,tip.y);
  ctx.stroke();
  const og=ctx.createRadialGradient(tip.x,tip.y,1,tip.x,tip.y,10);
  og.addColorStop(0,'rgba(255,255,255,0.95)');
  og.addColorStop(0.5,'rgba(190,140,255,0.8)');
  og.addColorStop(1,'rgba(140,80,230,0)');
  ctx.fillStyle=og;
  ctx.beginPath();
  ctx.arc(tip.x,tip.y,10,0,TAU);
  ctx.fill();
  ctx.restore();
  /* ectoplasmic tether to the player */
  if(s.tetherOn&&!player.dead){
    const px=player.x+player.w/2,py=player.y+player.h/2;
    ctx.save();
    ctx.shadowColor='#bf8fff';
    ctx.shadowBlur=12;
    ctx.lineWidth=3;
    ctx.strokeStyle='rgba(200,150,255,0.85)';
    drawWavyLine(tip.x,tip.y,px,py,9,G.gameTime*9);
    ctx.lineWidth=1.4;
    ctx.strokeStyle='rgba(255,255,255,0.7)';
    drawWavyLine(tip.x,tip.y,px,py,5,G.gameTime*9+2);
    ctx.restore();
  }
  /* energy tethers into each buffed enemy */
  ctx.save();
  ctx.shadowColor='#9d6bff';
  ctx.shadowBlur=8;
  ctx.lineWidth=1.8;
  ctx.strokeStyle='rgba(170,110,255,0.55)';
  for(const en of enemies){
    if(en.dead||!(en.buffT>0))continue;
    drawWavyLine(cx,byT+s.h*0.4,en.x+en.w/2,en.y+en.h/2,6,G.gameTime*7+en.id);
  }
  ctx.restore();
}
function drawWavyLine(x1,y1,x2,y2,amp,ph){
  const d=Math.hypot(x2-x1,y2-y1)||1;
  const nx=-(y2-y1)/d,ny=(x2-x1)/d;
  const segs=Math.max(6,Math.floor(d/26));
  ctx.beginPath();
  ctx.moveTo(x1,y1);
  for(let i=1;i<=segs;i++){
    const k=i/segs;
    const off=Math.sin(k*Math.PI*3+ph)*amp*Math.sin(k*Math.PI);
    ctx.lineTo(x1+(x2-x1)*k+nx*off,y1+(y2-y1)*k+ny*off);
  }
  ctx.stroke();
}
function drawSpitter(s){
  const cx=s.x+s.w/2,cy=s.y+s.h/2;
  /* multi-segment physics vine from the overhead anchor */
  if(s.phase!=='fall'){
    ctx.save();
    ctx.strokeStyle='#3f8a4d';
    ctx.lineWidth=4;
    ctx.shadowColor='#7dffa8';
    ctx.shadowBlur=6;
    ctx.beginPath();
    ctx.moveTo(s.anchorX,s.anchorY);
    const bend=clamp(-s.angV*0.16,-0.3,0.3);
    for(let i=1;i<=s.segs;i++){
      const k=i/s.segs;
      const a=s.ang+bend*Math.sin(k*Math.PI);
      ctx.lineTo(s.anchorX+Math.sin(a)*s.len*k,s.anchorY+Math.cos(a)*s.len*k);
    }
    ctx.stroke();
    /* small leaves along the vine */
    ctx.fillStyle='#5dc473';
    for(let i=1;i<s.segs;i+=2){
      const k=i/s.segs;
      const a=s.ang+bend*Math.sin(k*Math.PI);
      const lx=s.anchorX+Math.sin(a)*s.len*k,ly=s.anchorY+Math.cos(a)*s.len*k;
      ctx.beginPath();
      ctx.ellipse(lx+5,ly,6,2.6,a+0.8,0,TAU);
      ctx.fill();
    }
    ctx.restore();
  }
  /* pod rotates with the swing arc */
  ctx.save();
  ctx.translate(cx,cy);
  ctx.rotate(s.phase==='fall'?s.ang:s.ang*0.9);
  ctx.shadowColor='#7dffa8';
  ctx.shadowBlur=12;
  const pg=ctx.createRadialGradient(0,-4,2,0,0,s.w*0.62);
  pg.addColorStop(0,'#7adf8e');
  pg.addColorStop(1,'#1d5e30');
  ctx.fillStyle=pg;
  ctx.beginPath();
  ctx.ellipse(0,0,s.w*0.5,s.h*0.46,0,0,TAU);
  ctx.fill();
  /* spiky husk */
  ctx.strokeStyle='#2f7a44';
  ctx.lineWidth=2.4;
  for(let k=0;k<7;k++){
    const a=-0.5+k*0.34;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a)*s.w*0.46,Math.sin(a)*s.h*0.4);
    ctx.lineTo(Math.cos(a)*(s.w*0.46+7),Math.sin(a)*(s.h*0.4+7));
    ctx.stroke();
  }
  /* acid maw facing outward (down along the vine) */
  const open=s.phase==='fall'?0.2:(0.3+0.7*Math.max(0,Math.sin((2.4+1.4-Math.max(0,s.sprayT))*4)));
  ctx.fillStyle='#0e2c16';
  ctx.beginPath();
  ctx.ellipse(0,s.h*0.24,s.w*0.26,s.h*0.14*(0.4+open*0.6),0,0,TAU);
  ctx.fill();
  ctx.fillStyle='#c8ff6a';
  ctx.shadowBlur=8;
  ctx.beginPath();
  ctx.ellipse(0,s.h*0.24,s.w*0.12,s.h*0.05,0,0,TAU);
  ctx.fill();
  ctx.restore();
}
function drawDebris(){
  ctx.save();
  for(const d of debris){
    ctx.globalAlpha=clamp(d.life,0,1);
    ctx.translate(d.x,d.y);
    ctx.rotate(d.rot);
    if(d.kind==='vine'){
      ctx.strokeStyle='#3f8a4d';
      ctx.lineWidth=3.4;
      ctx.beginPath();
      ctx.moveTo(-d.len/2,0);
      ctx.lineTo(d.len/2,0);
      ctx.stroke();
    }else{
      ctx.strokeStyle='#c9a6ff';
      ctx.lineWidth=2.4;
      ctx.beginPath();
      ctx.moveTo(-d.len/2,0);
      ctx.lineTo(d.len/2,0);
      ctx.stroke();
    }
    ctx.rotate(-d.rot);
    ctx.translate(-d.x,-d.y);
  }
  ctx.restore();
}

/* ---------------- BOSS RENDERING ---------------- */
function drawBoss(){
  if(!boss||boss.dead)return;
  ctx.save();
  if(boss.flashT>0)ctx.globalAlpha=0.55+0.45*Math.sin(G.gameTime*40);
  if(boss.type===1)drawColossus(boss);
  else if(boss.type===0)drawBehemoth(boss,boss.alpha);
  else drawBramble(boss);
  if(boss.recover){
    ctx.globalAlpha=0.6;
    ctx.strokeStyle='rgba(125,255,168,0.55)';
    ctx.lineWidth=2;
    ctx.setLineDash([7,6]);
    ctx.strokeRect(boss.x-5,boss.y-5,boss.w+10,boss.h+10);
    ctx.setLineDash([]);
  }
  ctx.restore();
}
function drawColossus(b){
  const cx=b.x+b.w/2,gy=G.groundY;
  const crouch=b.crouch||0;
  ctx.save();
  ctx.translate(cx,b.y+b.h);
  ctx.scale(1+crouch*0.1,1-crouch*0.16);
  ctx.translate(-cx,-(b.y+b.h));
  /* jump-slam shadow indicator */
  if(b.phase==='slam_air'||b.phase==='slam_drop'){
    const sx=b.phase==='slam_air'?b.shadowX:b.x+b.w/2;
    ctx.save();
    ctx.globalAlpha=0.5+0.3*Math.sin(G.gameTime*16);
    ctx.fillStyle='#ff3030';
    ctx.beginPath();
    ctx.ellipse(sx,gy+4,b.w*0.55,9,0,0,TAU);
    ctx.fill();
    ctx.strokeStyle='#ffd95f';
    ctx.lineWidth=2;
    ctx.beginPath();
    ctx.moveTo(sx-16,gy-26);ctx.lineTo(sx,gy-6);ctx.lineTo(sx+16,gy-26);
    ctx.stroke();
    ctx.restore();
  }
  /* legs: multi-jointed struts */
  ctx.strokeStyle='#566076';
  ctx.lineWidth=13;
  ctx.lineCap='round';
  const step=Math.sin(b.t*5)*(b.phase==='idle'?6:0);
  for(const sgn of[-1,1]){
    const hipX=cx+sgn*b.w*0.26,hipY=b.y+b.h*0.62;
    const kneeX=hipX+sgn*10,kneeY=b.y+b.h*0.8+sgn*step*0.4;
    const footX=hipX+sgn*16,footY=b.y+b.h;
    ctx.beginPath();
    ctx.moveTo(hipX,hipY);ctx.lineTo(kneeX,kneeY);ctx.lineTo(footX,footY);
    ctx.stroke();
    ctx.fillStyle='#2c323f';
    ctx.fillRect(footX-15,footY-7,30,9);
  }
  /* torso armor */
  ctx.shadowColor='#ff6b6b';
  ctx.shadowBlur=12;
  const tg=ctx.createLinearGradient(b.x,b.y,b.x,b.y+b.h*0.66);
  tg.addColorStop(0,'#8a93a5');
  tg.addColorStop(1,'#3c4250');
  ctx.fillStyle=tg;
  ctx.beginPath();
  ctx.moveTo(b.x+b.w*0.16,b.y+b.h*0.14);
  ctx.lineTo(b.x+b.w*0.84,b.y+b.h*0.14);
  ctx.lineTo(b.x+b.w*0.92,b.y+b.h*0.4);
  ctx.lineTo(b.x+b.w*0.78,b.y+b.h*0.68);
  ctx.lineTo(b.x+b.w*0.22,b.y+b.h*0.68);
  ctx.lineTo(b.x+b.w*0.08,b.y+b.h*0.4);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur=0;
  /* armor plate lines */
  ctx.strokeStyle='rgba(20,24,32,0.65)';
  ctx.lineWidth=2;
  ctx.beginPath();
  ctx.moveTo(b.x+b.w*0.22,b.y+b.h*0.3);ctx.lineTo(b.x+b.w*0.78,b.y+b.h*0.3);
  ctx.moveTo(b.x+b.w*0.3,b.y+b.h*0.5);ctx.lineTo(b.x+b.w*0.7,b.y+b.h*0.5);
  ctx.stroke();
  /* glowing reactor core */
  const coreP=0.6+0.4*Math.sin(b.t*4);
  const cg=ctx.createRadialGradient(cx,b.y+b.h*0.42,2,cx,b.y+b.h*0.42,16);
  cg.addColorStop(0,'rgba(255,255,255,0.95)');
  cg.addColorStop(0.5,'rgba(255,110,60,'+(0.75*coreP)+')');
  cg.addColorStop(1,'rgba(255,60,20,0)');
  ctx.fillStyle=cg;
  ctx.beginPath();
  ctx.arc(cx,b.y+b.h*0.42,16,0,TAU);
  ctx.fill();
  /* shoulder pads */
  ctx.fillStyle='#6a7488';
  for(const sgn of[-1,1]){
    ctx.beginPath();
    ctx.ellipse(cx+sgn*b.w*0.46,b.y+b.h*0.2,b.w*0.16,b.h*0.085,sgn*0.2,0,TAU);
    ctx.fill();
  }
  /* head + visor */
  ctx.fillStyle='#4a5266';
  ctx.fillRect(cx-b.w*0.14,b.y,b.w*0.28,b.h*0.14);
  const scan=cx+Math.sin(b.t*4)*(b.w*0.08);
  ctx.fillStyle='#ff3030';
  ctx.shadowColor='#ff3030';
  ctx.shadowBlur=14;
  ctx.fillRect(scan-6,b.y+b.h*0.05,12,6);
  ctx.shadowBlur=0;
  /* rail-gun arm */
  const gun=colossusGun(b);
  ctx.strokeStyle='#566076';
  ctx.lineWidth=11;
  ctx.beginPath();
  ctx.moveTo(cx+b.facing*b.w*0.4,b.y+b.h*0.24);
  ctx.lineTo(gun.x-b.facing*8,gun.y);
  ctx.stroke();
  ctx.fillStyle='#2c323f';
  ctx.fillRect(gun.x-12,gun.y-8,24,16);
  if(b.phase==='laser_charge'||b.phase==='laser_fire'){
    const gl=b.phase==='laser_fire'?1:b.gunGlow;
    const gg=ctx.createRadialGradient(gun.x,gun.y,1,gun.x,gun.y,14+gl*10);
    gg.addColorStop(0,'rgba(255,255,255,'+(0.9*gl)+')');
    gg.addColorStop(0.6,'rgba(255,90,60,'+(0.7*gl)+')');
    gg.addColorStop(1,'rgba(255,60,20,0)');
    ctx.fillStyle=gg;
    ctx.beginPath();
    ctx.arc(gun.x,gun.y,14+gl*10,0,TAU);
    ctx.fill();
  }
  /* continuous sweeping beam */
  if(b.phase==='laser_fire'&&b.beamEnd){
    ctx.save();
    ctx.shadowColor='#ff4030';
    ctx.shadowBlur=20;
    const bg2=ctx.createLinearGradient(gun.x,gun.y,b.beamEnd.x,b.beamEnd.y);
    bg2.addColorStop(0,'rgba(255,240,235,0.95)');
    bg2.addColorStop(1,'rgba(255,90,50,0.75)');
    ctx.strokeStyle=bg2;
    ctx.lineWidth=9;
    ctx.lineCap='round';
    ctx.beginPath();
    ctx.moveTo(gun.x,gun.y);
    ctx.lineTo(b.beamEnd.x,b.beamEnd.y);
    ctx.stroke();
    ctx.strokeStyle='rgba(255,255,255,0.9)';
    ctx.lineWidth=3;
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}
function drawBehemothBody(x,y,w,h,t,alpha){
  const cx=x+w/2;
  ctx.save();
  ctx.globalAlpha=alpha;
  ctx.shadowColor='#9d6bff';
  ctx.shadowBlur=18;
  /* flowing spectral robe */
  const rg=ctx.createLinearGradient(cx,y,cx,y+h);
  rg.addColorStop(0,'rgba(220,200,255,0.95)');
  rg.addColorStop(0.6,'rgba(120,80,210,0.8)');
  rg.addColorStop(1,'rgba(90,50,180,0)');
  ctx.fillStyle=rg;
  ctx.beginPath();
  ctx.moveTo(cx,y+8);
  ctx.bezierCurveTo(x-w*0.18,y+h*0.3,x+w*0.06+Math.sin(t*2.2)*7,y+h*0.75,x+w*0.16,y+h);
  ctx.lineTo(x+w*0.84,y+h);
  ctx.bezierCurveTo(x+w*0.94+Math.sin(t*2.2+1.8)*7,y+h*0.75,x+w*1.18,y+h*0.3,cx,y+8);
  ctx.closePath();
  ctx.fill();
  /* crown of spikes */
  ctx.fillStyle='rgba(230,215,255,0.92)';
  for(let k=-2;k<=2;k++){
    const kx=cx+k*w*0.11;
    ctx.beginPath();
    ctx.moveTo(kx-5,y+12);
    ctx.lineTo(kx,y-14-Math.abs(k)*-4);
    ctx.lineTo(kx+5,y+12);
    ctx.closePath();
    ctx.fill();
  }
  /* face void + royal eyes */
  ctx.fillStyle='rgba(20,8,45,0.95)';
  ctx.beginPath();
  ctx.ellipse(cx,y+h*0.2,w*0.26,h*0.13,0,0,TAU);
  ctx.fill();
  ctx.fillStyle='#e9d8ff';
  ctx.shadowBlur=12;
  ctx.beginPath();
  ctx.arc(cx-w*0.1,y+h*0.19,3.6,0,TAU);
  ctx.arc(cx+w*0.1,y+h*0.19,3.6,0,TAU);
  ctx.fill();
  /* spectral wisps at hem */
  ctx.strokeStyle='rgba(190,150,255,0.5)';
  ctx.lineWidth=3;
  for(let k=0;k<3;k++){
    const wx=x+w*(0.25+k*0.25);
    ctx.beginPath();
    ctx.moveTo(wx,y+h*0.92);
    ctx.quadraticCurveTo(wx+Math.sin(t*3+k)*10,y+h*1.05,wx+Math.sin(t*2+k*2)*16,y+h*1.16);
    ctx.stroke();
  }
  ctx.restore();
}
function drawBehemoth(b,alpha){
  drawBehemothBody(b.x,b.y+b.bob,b.w,b.h,b.t,alpha);
  if(b.phase==='vortex'){
    const cx=b.x+b.w/2,cy=b.y+b.h*0.55;
    ctx.save();
    ctx.shadowColor='#9d6bff';
    ctx.shadowBlur=20;
    for(let r=3;r>=1;r--){
      ctx.strokeStyle='rgba(157,107,255,'+(0.25*r)+')';
      ctx.lineWidth=3;
      ctx.beginPath();
      ctx.arc(cx,cy,18*r+Math.sin(G.gameTime*6+r)*5,G.gameTime*(4-r),G.gameTime*(4-r)+4.6);
      ctx.stroke();
    }
    const vg=ctx.createRadialGradient(cx,cy,2,cx,cy,46);
    vg.addColorStop(0,'rgba(255,255,255,0.9)');
    vg.addColorStop(0.4,'rgba(157,107,255,0.55)');
    vg.addColorStop(1,'rgba(90,40,180,0)');
    ctx.fillStyle=vg;
    ctx.beginPath();
    ctx.arc(cx,cy,46,0,TAU);
    ctx.fill();
    ctx.restore();
  }
}
function drawClones(){
  for(const c of clones){
    if(c.dead)continue;
    drawBehemothBody(c.x,c.y+Math.sin(c.t*1.6)*12,c.w,c.h,c.t,0.62+0.24*Math.sin(c.t*2.3));
  }
}
function drawEchoes(){
  ctx.save();
  for(const e of echoes){
    for(const tr of e.trail){
      ctx.globalAlpha=clamp(tr.life/1.3,0,1)*0.4;
      ctx.fillStyle='#7a5cb8';
      ctx.beginPath();
      ctx.arc(tr.x,tr.y,12,0,TAU);
      ctx.fill();
    }
    if(!e.done){
      ctx.globalAlpha=0.8;
      ctx.shadowColor='#42306b';
      ctx.shadowBlur=14;
      ctx.fillStyle='rgba(40,25,70,0.9)';
      roundRectPath(ctx,e.x-13,e.y-19,26,38,8);
      ctx.fill();
      ctx.fillStyle='#c9a6ff';
      ctx.beginPath();
      ctx.arc(e.x-4,e.y-8,2.2,0,TAU);
      ctx.arc(e.x+4,e.y-8,2.2,0,TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}
function drawSplitMsg(){
  if(!boss||!(boss.msgT>0))return;
  const k=boss.msgT/2;
  ctx.save();
  ctx.globalAlpha=Math.min(1,k*1.8);
  const pulse=1+0.06*Math.sin(G.gameTime*9);
  ctx.font='bold '+Math.round(26*pulse)+'px "Courier New", monospace';
  ctx.textAlign='center';
  ctx.fillStyle='#c46bff';
  ctx.shadowColor='#9d2bff';
  ctx.shadowBlur=22;
  ctx.fillText('FIND THE REAL ENEMY!',viewW/2,viewH*0.3);
  ctx.restore();
}
function drawBramble(b){
  const cx=b.x+b.w/2,gy=G.groundY;
  ctx.save();
  /* root mass */
  ctx.fillStyle='#23401f';
  ctx.beginPath();
  ctx.ellipse(cx,gy,b.w*0.62,16,0,Math.PI,0);
  ctx.fill();
  ctx.strokeStyle='#2f5c2a';
  ctx.lineWidth=6;
  for(const sgn of[-1,-0.4,0.5,1]){
    ctx.beginPath();
    ctx.moveTo(cx+sgn*b.w*0.3,gy);
    ctx.quadraticCurveTo(cx+sgn*b.w*0.55,gy-12,cx+sgn*b.w*0.72,gy+4);
    ctx.stroke();
  }
  /* animated tendril splines */
  ctx.strokeStyle='#3f8a4d';
  ctx.lineWidth=7;
  ctx.lineCap='round';
  for(let k=0;k<4;k++){
    const sgn=k<2?-1:1;
    const ph=b.t*1.6+k*1.9;
    const bx=cx+sgn*b.w*0.34;
    const by=b.y+b.h*0.5;
    ctx.beginPath();
    ctx.moveTo(bx,by+30);
    ctx.bezierCurveTo(
      bx+sgn*40+Math.sin(ph)*16,by-20,
      bx+sgn*70+Math.sin(ph*1.3)*22,by-70+Math.cos(ph)*14,
      bx+sgn*88+Math.sin(ph*0.8)*26,by-120+Math.sin(ph*1.1)*18);
    ctx.stroke();
    /* thorn tips */
    ctx.fillStyle='#7dffa8';
    ctx.beginPath();
    ctx.arc(bx+sgn*88+Math.sin(ph*0.8)*26,by-120+Math.sin(ph*1.1)*18,4.4,0,TAU);
    ctx.fill();
  }
  /* trunk */
  const trg=ctx.createLinearGradient(cx,b.y+b.h*0.4,cx,gy);
  trg.addColorStop(0,'#3a7a44');
  trg.addColorStop(1,'#1d3d20');
  ctx.fillStyle=trg;
  ctx.beginPath();
  ctx.moveTo(cx-b.w*0.2,gy);
  ctx.bezierCurveTo(cx-b.w*0.26,b.y+b.h*0.6,cx-b.w*0.18,b.y+b.h*0.5,cx-b.w*0.22,b.y+b.h*0.38);
  ctx.lineTo(cx+b.w*0.22,b.y+b.h*0.38);
  ctx.bezierCurveTo(cx+b.w*0.18,b.y+b.h*0.5,cx+b.w*0.26,b.y+b.h*0.6,cx+b.w*0.2,gy);
  ctx.closePath();
  ctx.fill();
  /* carnivorous maw head */
  const jaw=b.jaw*14;
  ctx.shadowColor='#7dffa8';
  ctx.shadowBlur=14;
  const hg=ctx.createRadialGradient(cx,b.y+b.h*0.22,4,cx,b.y+b.h*0.22,b.w*0.5);
  hg.addColorStop(0,'#5dc473');
  hg.addColorStop(1,'#1d5e30');
  ctx.fillStyle=hg;
  /* upper jaw */
  ctx.beginPath();
  ctx.ellipse(cx,b.y+b.h*0.18-jaw*0.4,b.w*0.46,b.h*0.16,0,Math.PI,0);
  ctx.closePath();
  ctx.fill();
  /* lower jaw */
  ctx.beginPath();
  ctx.ellipse(cx,b.y+b.h*0.3+jaw*0.6,b.w*0.42,b.h*0.13,0,0,Math.PI);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur=0;
  /* mouth void + teeth */
  ctx.fillStyle='#0c2410';
  ctx.fillRect(cx-b.w*0.4,b.y+b.h*0.18-jaw*0.4,b.w*0.8,b.h*0.12+jaw);
  ctx.fillStyle='#e8ffe0';
  for(let k=0;k<7;k++){
    const tx=cx-b.w*0.36+k*b.w*0.12;
    ctx.beginPath();
    ctx.moveTo(tx,b.y+b.h*0.18-jaw*0.4);
    ctx.lineTo(tx+b.w*0.05,b.y+b.h*0.18-jaw*0.4+10);
    ctx.lineTo(tx+b.w*0.1,b.y+b.h*0.18-jaw*0.4);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(tx,b.y+b.h*0.3+jaw*0.6);
    ctx.lineTo(tx+b.w*0.05,b.y+b.h*0.3+jaw*0.6-9);
    ctx.lineTo(tx+b.w*0.1,b.y+b.h*0.3+jaw*0.6);
    ctx.closePath();
    ctx.fill();
  }
  /* glaring eyes */
  ctx.fillStyle='#ffd95f';
  ctx.shadowColor='#ffd95f';
  ctx.shadowBlur=10;
  ctx.beginPath();
  ctx.arc(cx-b.w*0.18,b.y+b.h*0.08,5,0,TAU);
  ctx.arc(cx+b.w*0.18,b.y+b.h*0.08,5,0,TAU);
  ctx.fill();
  /* leafy collar */
  ctx.shadowBlur=0;
  ctx.fillStyle='#2f7a44';
  for(let k=0;k<6;k++){
    const a=Math.PI+k*(Math.PI/5);
    ctx.beginPath();
    ctx.ellipse(cx+Math.cos(a)*b.w*0.34,b.y+b.h*0.36+Math.sin(a)*10,
      16,6,a+Math.sin(b.t*2+k)*0.2,0,TAU);
    ctx.fill();
  }
  ctx.restore();
}
function drawPillars(){
  const gy=G.groundY;
  for(const p of pillars){
    if(p.state==='warn'){
      const fl=Math.sin(G.gameTime*22)>0;
      ctx.save();
      ctx.globalAlpha=fl?0.75:0.35;
      ctx.fillStyle='#ff3030';
      ctx.beginPath();
      ctx.ellipse(p.x,gy+3,p.w*0.9,7,0,0,TAU);
      ctx.fill();
      ctx.restore();
      continue;
    }
    const hh=p.h*Math.max(0,p.upT);
    if(hh<=0)continue;
    ctx.save();
    ctx.shadowColor='#7dffa8';
    ctx.shadowBlur=8;
    const wg=ctx.createLinearGradient(p.x-p.w/2,0,p.x+p.w/2,0);
    wg.addColorStop(0,'#4a3520');
    wg.addColorStop(0.5,'#7a5a36');
    wg.addColorStop(1,'#3a2818');
    ctx.fillStyle=wg;
    ctx.fillRect(p.x-p.w/2,gy-hh,p.w,hh);
    /* spike tip */
    ctx.beginPath();
    ctx.moveTo(p.x-p.w/2,gy-hh);
    ctx.lineTo(p.x,gy-hh-22);
    ctx.lineTo(p.x+p.w/2,gy-hh);
    ctx.closePath();
    ctx.fill();
    /* side thorns */
    ctx.fillStyle='#5c4226';
    for(let k=1;k<4;k++){
      const ty=gy-hh*k/4;
      ctx.beginPath();
      ctx.moveTo(p.x-p.w/2,ty);ctx.lineTo(p.x-p.w/2-9,ty+5);ctx.lineTo(p.x-p.w/2,ty+10);
      ctx.closePath();ctx.fill();
      ctx.beginPath();
      ctx.moveTo(p.x+p.w/2,ty);ctx.lineTo(p.x+p.w/2+9,ty+5);ctx.lineTo(p.x+p.w/2,ty+10);
      ctx.closePath();ctx.fill();
    }
    ctx.restore();
  }
}
function drawVines(){
  for(const v of vines){
    if(v.depth<=2)continue;
    const r=vineRect(v);
    ctx.save();
    ctx.globalAlpha=v.dead?0.5:1;
    ctx.shadowColor='#7dffa8';
    ctx.shadowBlur=10;
    const horiz=v.side==='T'||v.side==='B';
    const vg=horiz
      ?ctx.createLinearGradient(0,r.y,0,r.y+r.h)
      :ctx.createLinearGradient(r.x,0,r.x+r.w,0);
    const inward=(v.side==='L'||v.side==='T');
    vg.addColorStop(inward?0:1,'#1d4d2c');
    vg.addColorStop(inward?1:0,'#3f8a4d');
    ctx.fillStyle=vg;
    ctx.fillRect(r.x,r.y,r.w,r.h);
    /* thorny crawling edge */
    ctx.fillStyle='#5dc473';
    const n=Math.floor((horiz?r.w:r.h)/26);
    for(let k=0;k<n;k++){
      const ph=Math.sin(v.t*3+k)*3;
      if(v.side==='L'){
        const ty=r.y+k*26+13;
        ctx.beginPath();
        ctx.moveTo(r.x+r.w,ty-6);ctx.lineTo(r.x+r.w+10+ph,ty);ctx.lineTo(r.x+r.w,ty+6);
        ctx.closePath();ctx.fill();
      }else if(v.side==='R'){
        const ty=r.y+k*26+13;
        ctx.beginPath();
        ctx.moveTo(r.x,ty-6);ctx.lineTo(r.x-10-ph,ty);ctx.lineTo(r.x,ty+6);
        ctx.closePath();ctx.fill();
      }else if(v.side==='T'){
        const tx=r.x+k*26+13;
        ctx.beginPath();
        ctx.moveTo(tx-6,r.y+r.h);ctx.lineTo(tx,r.y+r.h+10+ph);ctx.lineTo(tx+6,r.y+r.h);
        ctx.closePath();ctx.fill();
      }else{
        const tx=r.x+k*26+13;
        ctx.beginPath();
        ctx.moveTo(tx-6,r.y);ctx.lineTo(tx,r.y-10-ph);ctx.lineTo(tx+6,r.y);
        ctx.closePath();ctx.fill();
      }
    }
    /* HP pips */
    if(!v.dead){
      ctx.fillStyle='rgba(8,12,20,0.7)';
      const bx=r.x+r.w/2-20,by=r.y+r.h/2-3;
      ctx.fillRect(bx,by,40,6);
      ctx.fillStyle='#7dffa8';
      ctx.fillRect(bx+1,by+1,38*clamp(v.hp/v.maxHp,0,1),4);
    }
    ctx.restore();
  }
}
function drawPods(){
  for(const p of pods){
    if(p.dead)continue;
    ctx.save();
    const pulse=0.85+0.15*Math.sin(p.t*6);
    const warm=p.chainT>=0?1:clamp(1-p.timer/4,0,1);
    ctx.shadowColor=warm>0.6?'#ffb347':'#7dffa8';
    ctx.shadowBlur=10+warm*10;
    const pg=ctx.createRadialGradient(p.x,p.y-3,1,p.x,p.y,p.r*pulse);
    pg.addColorStop(0,'#d6ffb0');
    pg.addColorStop(1,warm>0.6?'#a86a20':'#2f7a44');
    ctx.fillStyle=pg;
    ctx.beginPath();
    ctx.arc(p.x,p.y,p.r*pulse,0,TAU);
    ctx.fill();
    /* spore speckles */
    ctx.fillStyle='rgba(230,255,190,0.8)';
    for(let k=0;k<4;k++){
      const a=p.t*1.2+k*1.7;
      ctx.beginPath();
      ctx.arc(p.x+Math.cos(a)*p.r*0.5,p.y+Math.sin(a)*p.r*0.5,1.8,0,TAU);
      ctx.fill();
    }
    ctx.restore();
  }
}
function drawGas(){
  ctx.save();
  for(const g2 of gas){
    const a=clamp(g2.life/3,0,1)*0.4;
    const gg=ctx.createRadialGradient(g2.x,g2.y,4,g2.x,g2.y,g2.r);
    gg.addColorStop(0,'rgba(150,230,90,'+(a*0.9)+')');
    gg.addColorStop(1,'rgba(80,160,40,0)');
    ctx.fillStyle=gg;
    ctx.beginPath();
    ctx.arc(g2.x+Math.sin(g2.t*1.4)*5,g2.y+Math.cos(g2.t)*4,g2.r,0,TAU);
    ctx.fill();
  }
  ctx.restore();
}
function drawBossWaves(){
  for(const w of bossWaves){
    const k=w.t/w.life;
    const hh=w.h+w.grow*w.t;
    ctx.save();
    ctx.globalAlpha=(1-k)*0.9;
    ctx.shadowColor='#ffb347';
    ctx.shadowBlur=10;
    const wg=ctx.createLinearGradient(0,w.y-hh,0,w.y);
    wg.addColorStop(0,'rgba(255,210,130,0.2)');
    wg.addColorStop(1,'rgba(255,150,60,0.85)');
    ctx.fillStyle=wg;
    ctx.beginPath();
    ctx.moveTo(w.x-16,w.y);
    ctx.quadraticCurveTo(w.x,w.y-hh*1.5,w.x+16,w.y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}
