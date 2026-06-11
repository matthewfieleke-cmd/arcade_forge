/* Audio engine + chiptune music — pasted into index.html */

const AUDIO_KEY='arcade_forge_audio';
const audioPrefs={muted:false};

function loadAudioPrefs(){
  try{
    const raw=localStorage.getItem(AUDIO_KEY);
    if(raw){const p=JSON.parse(raw);audioPrefs.muted=!!p.muted;}
  }catch(err){}
}
function saveAudioPrefs(){
  try{localStorage.setItem(AUDIO_KEY,JSON.stringify({muted:audioPrefs.muted}));}catch(err){}
}

const Sfx={
  ctx:null,master:null,sfxGain:null,musicGain:null,
  buffers:{},unlocked:false,currentMusic:null,musicNodes:null,
  beamSweepT:0,bossPhase:'',droneAnnounced:false
};

function initAudio(){
  if(Sfx.ctx)return;
  try{
    const AC=window.AudioContext||window.webkitAudioContext;
    if(!AC)return;
    Sfx.ctx=new AC();
    Sfx.master=Sfx.ctx.createGain();
    Sfx.sfxGain=Sfx.ctx.createGain();
    Sfx.musicGain=Sfx.ctx.createGain();
    Sfx.sfxGain.connect(Sfx.master);
    Sfx.musicGain.connect(Sfx.master);
    Sfx.master.connect(Sfx.ctx.destination);
    applyAudioMute();
    for(const k in SFX_B64){
      const bin=atob(SFX_B64[k]);
      const bytes=new Uint8Array(bin.length);
      for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
      Sfx.buffers[k]=Sfx.ctx.decodeAudioData(bytes.buffer.slice(0));
    }
    Promise.all(Object.values(Sfx.buffers)).then(bufs=>{
      const keys=Object.keys(SFX_B64);
      keys.forEach((k,i)=>{Sfx.buffers[k]=bufs[i];});
    }).catch(()=>{});
  }catch(err){}
}

function applyAudioMute(){
  if(!Sfx.master)return;
  const m=audioPrefs.muted?0:1;
  Sfx.master.gain.setTargetAtTime(m,Sfx.ctx?Sfx.ctx.currentTime:0,0.02);
  updateMuteBtn();
}

function unlockAudio(){
  if(!Sfx.ctx)initAudio();
  if(!Sfx.ctx)return;
  if(Sfx.ctx.state==='suspended')Sfx.ctx.resume();
  Sfx.unlocked=true;
}

function playSfx(name,opts){
  opts=opts||{};
  if(audioPrefs.muted)return;
  unlockAudio();
  if(!Sfx.ctx)return;
  const buf=Sfx.buffers[name];
  if(!buf||!buf.duration)return;
  const src=Sfx.ctx.createBufferSource();
  src.buffer=buf;
  const g=Sfx.ctx.createGain();
  g.gain.value=opts.vol!=null?opts.vol:1;
  src.playbackRate.value=opts.rate!=null?opts.rate:1;
  src.connect(g);
  g.connect(Sfx.sfxGain);
  src.start(0);
  return src;
}

function updateMuteBtn(){
  const btn=$$('#btn-mute');
  if(!btn)return;
  btn.textContent=audioPrefs.muted?'🔇 AUDIO OFF':'🔊 AUDIO ON';
  btn.classList.toggle('muted',audioPrefs.muted);
}

function toggleMute(){
  audioPrefs.muted=!audioPrefs.muted;
  saveAudioPrefs();
  applyAudioMute();
  if(!audioPrefs.muted){
    unlockAudio();
    syncMusic();
    playSfx('ui_click',{vol:0.7});
  }
}

/* ---- Chiptune music (procedural NES-style) ---- */
const CHIP_NOTES={
  C3:130.81,D3:146.83,E3:164.81,F3:174.61,G3:196,A3:220,B3:246.94,
  C4:261.63,D4:293.66,E4:329.63,F4:349.23,G4:392,A4:440,B4:493.88,
  C5:523.25,D5:587.33,E5:659.25,F5:698.46,G5:783.99,A5:880,B5:987.77,
  REST:0
};
function chipPat(...rows){return rows;}

const CHIP_TRACKS={
  forge:chipPat(
    ['E3','G3','B3','E4','B3','G3','E3','REST'],
    ['C3','E3','G3','C4','G3','E3','C3','REST']
  ),
  combat0:chipPat(
    ['A2','REST','E3','REST','A3','G3','E3','REST'],
    ['A2','C3','E3','A3','E3','C3','A2','REST']
  ),
  combat1:chipPat(
    ['D3','F3','A3','D4','A3','F3','D3','REST'],
    ['D2','A2','D3','F3','D3','A2','D2','REST']
  ),
  combat2:chipPat(
    ['E3','G3','B3','E4','D4','B3','G3','REST'],
    ['C3','E3','G3','B3','A3','G3','E3','REST']
  ),
  boss:chipPat(
    ['A2','A2','E3','E3','A3','G3','E3','A2'],
    ['A1','REST','A2','E3','A2','E3','A2','REST']
  ),
  victory:chipPat(['C4','E4','G4','C5','REST','REST','REST','REST']),
  gameover:chipPat(['E3','D3','C3','B2','A2','REST','REST','REST'])
};

const ChipMusic={
  oscs:null,gains:null,interval:null,row:0,col:0,track:null,tempo:0.22,active:false
};

function stopMusic(){
  ChipMusic.active=false;
  if(ChipMusic.interval){clearInterval(ChipMusic.interval);ChipMusic.interval=null;}
  if(ChipMusic.oscs){
    for(const o of ChipMusic.oscs)try{o.stop();}catch(e){}
    ChipMusic.oscs=null;ChipMusic.gains=null;
  }
  Sfx.currentMusic=null;
}

function startChipTrack(name,tempo){
  if(audioPrefs.muted||!Sfx.unlocked)return;
  if(Sfx.currentMusic===name&&ChipMusic.active)return;
  stopMusic();
  const pat=CHIP_TRACKS[name];
  if(!pat||!Sfx.ctx)return;
  Sfx.currentMusic=name;
  ChipMusic.track=pat;
  ChipMusic.row=0;
  ChipMusic.col=0;
  ChipMusic.tempo=tempo||0.22;
  ChipMusic.active=true;
  const beat=()=>{
    if(!ChipMusic.active||!Sfx.ctx)return;
    const notes=[];
    for(let r=0;r<pat.length;r++){
      const n=pat[r][ChipMusic.col];
      if(n&&n!=='REST')notes.push(CHIP_NOTES[n]||(parseFloat(n)||0));
    }
    playChipChord(notes);
    ChipMusic.col=(ChipMusic.col+1)%pat[0].length;
    if(ChipMusic.col===0)ChipMusic.row=(ChipMusic.row+1)%64;
  };
  beat();
  ChipMusic.interval=setInterval(beat,ChipMusic.tempo*1000);
}

function playChipChord(freqs){
  if(!Sfx.ctx||!freqs.length)return;
  if(ChipMusic.oscs)for(const o of ChipMusic.oscs)try{o.stop();}catch(e){}
  ChipMusic.oscs=[];
  ChipMusic.gains=[];
  const t=Sfx.ctx.currentTime;
  for(const f of freqs){
    const o=Sfx.ctx.createOscillator();
    const g=Sfx.ctx.createGain();
    o.type='square';
    o.frequency.value=f;
    g.gain.setValueAtTime(0,t);
    g.gain.linearRampToValueAtTime(0.045,t+0.01);
    g.gain.exponentialRampToValueAtTime(0.001,t+ChipMusic.tempo*0.9);
    o.connect(g);
    g.connect(Sfx.musicGain);
    o.start(t);
    o.stop(t+ChipMusic.tempo);
    ChipMusic.oscs.push(o);
    ChipMusic.gains.push(g);
  }
}

function playStinger(name){
  stopMusic();
  startChipTrack(name,name==='victory'?0.16:0.2);
  setTimeout(()=>{
    if(Sfx.currentMusic===name)stopMusic();
  },name==='victory'?1400:1200);
}

function syncMusic(){
  if(audioPrefs.muted||!Sfx.unlocked){stopMusic();return;}
  if(G.over){
    playStinger(G.victory?'victory':'gameover');
    return;
  }
  if(appState==='HOME_MENU'||appState==='WIZARD_STEP'||appState==='GAME_SUMMARY'){
    startChipTrack('forge',0.28);
  }else if(appState==='ACTIVE_GAME'){
    if(G.level===10)startChipTrack('boss',0.18);
    else if(G.cfg){
      const tr='combat'+G.cfg.env;
      startChipTrack(CHIP_TRACKS[tr]?'combat'+G.cfg.env:'combat0',0.2);
    }
  }else if(appState==='VICTORY')playStinger('victory');
  else if(appState==='GAME_OVER')playStinger('gameover');
  else stopMusic();
}

function onAppStateAudio(next){
  if(next==='ACTIVE_GAME'){Sfx.droneAnnounced=false;Sfx.bossPhase='';}
  setTimeout(syncMusic,50);
}

function randomizeWizardStep(){
  const step=WIZ[wizardIdx];
  wizardSel[wizardIdx]=Math.floor(Math.random()*step.opts.length);
  playSfx('shuffle',{rate:0.95+Math.random()*0.1});
  playSfx('anvil_light',{vol:0.85,rate:0.92+Math.random()*0.12});
  renderWizard();
}

function randomizeWizardAll(){
  for(let i=0;i<WIZ.length;i++){
    wizardSel[i]=Math.floor(Math.random()*WIZ[i].opts.length);
  }
  playSfx('shuffle');
  playSfx('anvil',{rate:0.9+Math.random()*0.08});
  setAppState('GAME_SUMMARY');
}

function wizardPickOption(oi){
  wizardSel[wizardIdx]=oi;
  playSfx('anvil',{rate:0.88+Math.random()*0.16});
  if(wizardIdx>=WIZ.length-1)setAppState('GAME_SUMMARY');
  else{wizardIdx++;renderWizard();}
}

function updateGameAudio(dt){
  if(!G.running||audioPrefs.muted)return;
  if(boss&&!boss.dead){
    if(boss.phase==='laser_tele'&&Sfx.bossPhase!=='laser_tele'){
      Sfx.bossPhase='laser_tele';
      playSfx('beam_charge',{vol:0.7});
    }else if(boss.phase==='laser'){
      Sfx.beamSweepT-=dt;
      if(Sfx.beamSweepT<=0){
        Sfx.beamSweepT=0.07;
        playSfx('beam_sweep',{vol:0.35,rate:0.9+Math.random()*0.2});
      }
    }else if(boss.phase!=='laser'&&boss.phase!=='laser_tele')Sfx.bossPhase=boss.phase;
  }
}
