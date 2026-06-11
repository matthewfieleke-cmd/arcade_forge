#!/usr/bin/env node
/* Generates compact mono WAV base64 samples for Arcade Forge (recorded-style SFX). */
const fs = require('fs');
const path = require('path');

const SR = 22050;

function wavBuffer(samples) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE((v * 32767) | 0, 44 + i * 2);
  }
  return buf;
}

function env(t, a, d, s, r, len) {
  if (t < a) return t / a;
  if (t < a + d) return 1 - (1 - s) * ((t - a) / d);
  if (t < len - r) return s;
  return s * Math.max(0, 1 - (t - (len - r)) / r);
}

function noise(n) {
  const out = new Float32Array(n);
  let l = 0;
  for (let i = 0; i < n; i++) {
    const w = Math.random() * 2 - 1;
    l = l * 0.85 + w * 0.15;
    out[i] = l;
  }
  return out;
}

function tone(freq, len, type, gain, adsr) {
  const n = Math.floor(SR * len);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const ph = (t * freq) % 1;
    let s = 0;
    if (type === 'sin') s = Math.sin(2 * Math.PI * ph);
    else if (type === 'sq') s = ph < 0.5 ? 1 : -1;
    else if (type === 'tri') s = 1 - 4 * Math.abs(ph - 0.5);
    out[i] = s * gain * env(t, adsr[0], adsr[1], adsr[2], adsr[3], len);
  }
  return out;
}

function mix(...bufs) {
  const n = Math.max(...bufs.map(b => b.length));
  const out = new Float32Array(n);
  for (const b of bufs) for (let i = 0; i < b.length; i++) out[i] += b[i];
  return out;
}

function norm(b, peak = 0.92) {
  let m = 0;
  for (const v of b) m = Math.max(m, Math.abs(v));
  if (m < 1e-6) return b;
  const g = peak / m;
  return b.map(v => v * g);
}

function lp(b, cutoff) {
  const out = new Float32Array(b.length);
  const rc = 1 / (2 * Math.PI * cutoff);
  const dt = 1 / SR;
  const alpha = dt / (rc + dt);
  let y = 0;
  for (let i = 0; i < b.length; i++) {
    y += alpha * (b[i] - y);
    out[i] = y;
  }
  return out;
}

function render(name, fn) {
  return [name, fn()];
}

const defs = [
  render('anvil', () => {
    const n = Math.floor(SR * 0.28);
    const out = new Float32Array(n);
    const nse = lp(noise(n), 2800);
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      const e = Math.exp(-t * 18);
      const ring = Math.sin(2 * Math.PI * (420 - t * 900) * t) * 0.5;
      const thud = Math.sin(2 * Math.PI * 95 * t) * Math.exp(-t * 35);
      out[i] = (nse[i] * 0.55 + ring + thud * 0.8) * e;
    }
    return norm(out);
  }),
  render('anvil_light', () => {
    const b = tone(680, 0.09, 'tri', 0.35, [0.001, 0.02, 0.2, 0.05]);
    const n = lp(noise(b.length), 4000);
    return norm(mix(b, n.map((v, i) => v * (1 - i / b.length) * 0.25)));
  }),
  render('ui_click', () => norm(tone(1200, 0.05, 'sq', 0.22, [0.001, 0.01, 0.1, 0.02]))),
  render('ui_confirm', () => norm(mix(
    tone(523, 0.12, 'sq', 0.2, [0.002, 0.04, 0.5, 0.04]),
    tone(784, 0.14, 'sq', 0.16, [0.004, 0.05, 0.4, 0.05])
  ))),
  render('shuffle', () => norm(mix(
    tone(880, 0.06, 'sq', 0.15, [0.001, 0.02, 0.2, 0.02]),
    tone(1320, 0.08, 'sq', 0.12, [0.01, 0.03, 0.15, 0.03])
  ))),
  render('jump', () => {
    const n = Math.floor(SR * 0.1);
    const out = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      const f = 320 + t * 900;
      out[i] = Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 12) * 0.35;
    }
    return norm(out);
  }),
  render('land', () => {
    const n = Math.floor(SR * 0.14);
    const out = new Float32Array(n);
    const nse = lp(noise(n), 600);
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      out[i] = (nse[i] * 0.4 + Math.sin(2 * Math.PI * 80 * t) * Math.exp(-t * 40)) * Math.exp(-t * 12);
    }
    return norm(out);
  }),
  render('hurt_hull', () => norm(mix(
    tone(180, 0.18, 'sq', 0.35, [0.001, 0.05, 0.3, 0.08]),
    lp(noise(Math.floor(SR * 0.18)), 800).map((v, i) => v * Math.exp(-i / SR * 10) * 0.3)
  ))),
  render('hurt_shield', () => norm(mix(
    tone(620, 0.12, 'sin', 0.3, [0.001, 0.02, 0.5, 0.05]),
    tone(930, 0.1, 'sin', 0.2, [0.002, 0.03, 0.4, 0.04])
  ))),
  render('death_player', () => norm(mix(
    tone(220, 0.5, 'sq', 0.3, [0.01, 0.2, 0.4, 0.25]),
    tone(110, 0.55, 'tri', 0.35, [0.01, 0.15, 0.3, 0.3])
  ))),
  render('laser', () => {
    const n = Math.floor(SR * 0.16);
    const out = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      const f = 1400 - t * 4000;
      out[i] = Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 8) * 0.45;
    }
    return norm(out);
  }),
  render('slash', () => {
    const n = Math.floor(SR * 0.12);
    const out = new Float32Array(n);
    const nse = noise(n);
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      out[i] = (nse[i] * 0.25 + Math.sin(2 * Math.PI * (800 - t * 5000) * t)) * Math.exp(-t * 14) * 0.5;
    }
    return norm(out);
  }),
  render('fireball', () => norm(mix(
    lp(noise(Math.floor(SR * 0.2)), 1200).map((v, i) => v * Math.exp(-i / SR * 6) * 0.35),
    tone(200, 0.18, 'tri', 0.25, [0.005, 0.08, 0.4, 0.06])
  ))),
  render('rocket_launch', () => {
    const n = Math.floor(SR * 0.35);
    const out = new Float32Array(n);
    const nse = lp(noise(n), 400);
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      out[i] = nse[i] * (0.2 + t * 0.5) * Math.exp(-t * 2.5);
    }
    return norm(out);
  }),
  render('rocket_explode', () => {
    const n = Math.floor(SR * 0.45);
    const out = new Float32Array(n);
    const nse = noise(n);
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      out[i] = nse[i] * Math.exp(-t * 5) * 0.7 + Math.sin(2 * Math.PI * 60 * t) * Math.exp(-t * 8) * 0.4;
    }
    return norm(out);
  }),
  render('yarn_throw', () => norm(tone(440, 0.14, 'tri', 0.28, [0.003, 0.04, 0.5, 0.06]))),
  render('yarn_bounce', () => norm(tone(520, 0.06, 'sq', 0.18, [0.001, 0.02, 0.2, 0.02]))),
  render('pickup_health', () => norm(mix(tone(523, 0.1, 'sq', 0.2, [0.002, 0.03, 0.5, 0.04]), tone(659, 0.12, 'sq', 0.18, [0.004, 0.04, 0.4, 0.05])))),
  render('pickup_shield', () => norm(mix(tone(587, 0.1, 'sin', 0.22, [0.002, 0.03, 0.5, 0.04]), tone(880, 0.12, 'sin', 0.18, [0.004, 0.04, 0.4, 0.05])))),
  render('pickup_ult', () => norm(mix(tone(659, 0.08, 'sq', 0.2, [0.002, 0.02, 0.5, 0.03]), tone(988, 0.1, 'sq', 0.2, [0.003, 0.03, 0.4, 0.04]), tone(1319, 0.12, 'sq', 0.16, [0.005, 0.04, 0.3, 0.05])))),
  render('enemy_hit', () => norm(tone(300, 0.07, 'sq', 0.22, [0.001, 0.02, 0.2, 0.02]))),
  render('enemy_death', () => norm(mix(
    tone(160, 0.2, 'sq', 0.28, [0.002, 0.06, 0.3, 0.1]),
    lp(noise(Math.floor(SR * 0.2)), 2000).map((v, i) => v * Math.exp(-i / SR * 12) * 0.25)
  ))),
  render('enemy_laser', () => norm(tone(900, 0.09, 'sq', 0.2, [0.001, 0.02, 0.3, 0.03]))),
  render('explosion_small', () => {
    const n = Math.floor(SR * 0.25);
    const out = noise(n).map((v, i) => v * Math.exp(-i / SR * 7) * 0.55);
    return norm(out);
  }),
  render('explosion_big', () => {
    const n = Math.floor(SR * 0.7);
    const out = new Float32Array(n);
    const nse = noise(n);
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      out[i] = (nse[i] * 0.65 + Math.sin(2 * Math.PI * 45 * t) * 0.35) * Math.exp(-t * 3.5);
    }
    return norm(out);
  }),
  render('portal', () => norm(mix(
    tone(440, 0.2, 'sin', 0.2, [0.01, 0.08, 0.6, 0.1]),
    tone(660, 0.25, 'sin', 0.18, [0.02, 0.1, 0.5, 0.12]),
    tone(880, 0.3, 'sin', 0.15, [0.03, 0.12, 0.4, 0.15])
  ))),
  render('level_up', () => norm(mix(
    tone(392, 0.1, 'sq', 0.2, [0.002, 0.03, 0.5, 0.04]),
    tone(523, 0.1, 'sq', 0.2, [0.012, 0.03, 0.5, 0.04]),
    tone(659, 0.14, 'sq', 0.22, [0.022, 0.04, 0.5, 0.06])
  ))),
  render('victory', () => norm(mix(
    tone(523, 0.15, 'sq', 0.22, [0.005, 0.05, 0.6, 0.08]),
    tone(659, 0.15, 'sq', 0.2, [0.02, 0.05, 0.6, 0.08]),
    tone(784, 0.2, 'sq', 0.22, [0.04, 0.06, 0.6, 0.1]),
    tone(1047, 0.28, 'sq', 0.2, [0.06, 0.08, 0.5, 0.15])
  ))),
  render('game_over', () => norm(mix(
    tone(311, 0.35, 'sq', 0.28, [0.01, 0.1, 0.5, 0.2]),
    tone(196, 0.45, 'tri', 0.3, [0.05, 0.15, 0.4, 0.25])
  ))),
  render('stomp', () => {
    const n = Math.floor(SR * 0.35);
    const out = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      out[i] = (Math.sin(2 * Math.PI * 55 * t) * 0.7 + noise(1)[0] * 0.4) * Math.exp(-t * 6);
    }
    return norm(out);
  }),
  render('beam_charge', () => {
    const n = Math.floor(SR * 0.5);
    const out = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      out[i] = Math.sin(2 * Math.PI * (200 + t * 1800) * t) * t * 0.35;
    }
    return norm(out);
  }),
  render('beam_sweep', () => {
    const n = Math.floor(SR * 0.08);
    const out = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      out[i] = Math.sin(2 * Math.PI * 2200 * t) * Math.exp(-t * 20) * 0.4;
    }
    return norm(out);
  }),
  render('bomb_drop', () => norm(tone(600, 0.2, 'sin', 0.15, [0.01, 0.05, 0.6, 0.08]).map((v, i) => {
    const t = i / SR; return v * (1 + t * 2);
  }))),
  render('bomb_detonate', () => {
    const n = Math.floor(SR * 0.4);
    const out = noise(n).map((v, i) => v * Math.exp(-i / SR * 5.5) * 0.65);
    return norm(mix(out, tone(120, 0.3, 'tri', 0.3, [0.001, 0.08, 0.4, 0.15])));
  }),
  render('drone_alarm', () => norm(mix(
    tone(880, 0.12, 'sq', 0.22, [0.002, 0.02, 0.7, 0.03]),
    tone(660, 0.12, 'sq', 0.22, [0.14, 0.02, 0.7, 0.03])
  ))),
  render('ult_timestop', () => norm(mix(
    tone(1200, 0.3, 'sin', 0.2, [0.02, 0.1, 0.5, 0.15]),
    tone(800, 0.35, 'sin', 0.18, [0.02, 0.12, 0.4, 0.18])
  ))),
  render('ult_shield', () => norm(mix(
    tone(440, 0.25, 'sin', 0.22, [0.01, 0.08, 0.6, 0.1]),
    tone(554, 0.3, 'sin', 0.2, [0.02, 0.1, 0.5, 0.12])
  ))),
  render('ult_overdrive', () => norm(mix(
    tone(220, 0.2, 'sq', 0.25, [0.005, 0.05, 0.7, 0.08]),
    tone(330, 0.25, 'sq', 0.22, [0.01, 0.06, 0.6, 0.1])
  ))),
  render('geyser', () => {
    const n = Math.floor(SR * 0.5);
    const out = lp(noise(n), 900).map((v, i) => v * (0.2 + (i / n) * 0.5) * Math.exp(-i / SR * 2));
    return norm(out);
  }),
  render('asteroid_warn', () => norm(mix(
    tone(1000, 0.08, 'sq', 0.2, [0.001, 0.02, 0.6, 0.02]),
    tone(1000, 0.08, 'sq', 0.2, [0.12, 0.02, 0.6, 0.02])
  ))),
  render('phantom', () => norm(tone(280, 0.35, 'sin', 0.2, [0.05, 0.1, 0.5, 0.2]))),
  render('pit_fall', () => norm(mix(
    tone(200, 0.3, 'tri', 0.25, [0.01, 0.1, 0.5, 0.15]),
    lp(noise(Math.floor(SR * 0.3)), 500).map((v, i) => v * Math.exp(-i / SR * 4) * 0.35)
  ))),
  render('wisp_summon', () => norm(mix(tone(784, 0.12, 'sin', 0.2, [0.005, 0.04, 0.5, 0.05]), tone(1175, 0.14, 'sin', 0.18, [0.01, 0.05, 0.4, 0.06])))),
  render('wisp_pew', () => norm(tone(1400, 0.05, 'sq', 0.15, [0.001, 0.01, 0.2, 0.02]))),
  render('vault_delete', () => norm(tone(150, 0.15, 'sq', 0.28, [0.002, 0.05, 0.3, 0.08]))),
  render('root_pop', () => norm(mix(
    lp(noise(Math.floor(SR * 0.22)), 700).map((v, i) => v * Math.exp(-i / SR * 8) * 0.4),
    tone(100, 0.15, 'tri', 0.25, [0.001, 0.04, 0.4, 0.06])
  ))),
  render('forge_open', () => norm(mix(
    tone(130, 0.2, 'tri', 0.3, [0.005, 0.08, 0.5, 0.1]),
    lp(noise(Math.floor(SR * 0.25)), 500).map((v, i) => v * Math.exp(-i / SR * 5) * 0.3)
  ))),
  render('tether_hum', () => {
    const n = Math.floor(SR * 0.4);
    const out = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      out[i] = (Math.sin(2 * Math.PI * 160 * t) * 0.5 + Math.sin(2 * Math.PI * 242 * t + Math.sin(t * 30) * 0.6) * 0.35) *
        env(t, 0.04, 0.1, 0.6, 0.15, 0.4) * 0.4;
    }
    return norm(out, 0.6);
  }),
  render('mine_beep', () => norm(tone(1450, 0.06, 'sq', 0.25, [0.001, 0.015, 0.3, 0.02]))),
  render('vine_snap', () => {
    const n = Math.floor(SR * 0.13);
    const out = new Float32Array(n);
    const nse = lp(noise(n), 3200);
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      out[i] = (nse[i] * 0.7 + Math.sin(2 * Math.PI * 240 * t) * 0.3) * Math.exp(-t * 26);
    }
    return norm(out);
  }),
  render('spore_pop', () => norm(mix(
    tone(420, 0.07, 'sin', 0.3, [0.001, 0.02, 0.3, 0.03]),
    lp(noise(Math.floor(SR * 0.09)), 1400).map((v, i) => v * Math.exp(-i / SR * 18) * 0.35)
  ))),
  render('vortex_pull', () => {
    const n = Math.floor(SR * 0.55);
    const out = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      const f = 700 - t * 800;
      out[i] = Math.sin(2 * Math.PI * Math.max(60, f) * t) * env(t, 0.05, 0.15, 0.5, 0.2, 0.55) * 0.35;
    }
    return norm(out, 0.7);
  }),
  render('soul_split', () => norm(mix(
    tone(311, 0.4, 'sin', 0.25, [0.02, 0.12, 0.5, 0.2]),
    tone(316, 0.4, 'sin', 0.25, [0.02, 0.12, 0.5, 0.2]),
    tone(622, 0.3, 'sin', 0.15, [0.05, 0.1, 0.4, 0.15])
  ))),
  render('pillar_erupt', () => {
    const n = Math.floor(SR * 0.3);
    const out = new Float32Array(n);
    const nse = lp(noise(n), 900);
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      out[i] = (nse[i] * 0.55 + Math.sin(2 * Math.PI * 70 * t) * 0.45) * Math.exp(-t * 7);
    }
    return norm(out);
  }),
  render('acid_spit', () => {
    const n = Math.floor(SR * 0.12);
    const out = lp(noise(n), 2400).map((v, i) => v * Math.exp(-i / SR * 16) * (0.3 + (i / n) * 0.4));
    return norm(out, 0.7);
  }),
  render('clone_shatter', () => norm(mix(
    tone(1100, 0.14, 'sin', 0.2, [0.001, 0.04, 0.3, 0.06]),
    tone(1650, 0.12, 'sin', 0.16, [0.005, 0.04, 0.25, 0.05]),
    lp(noise(Math.floor(SR * 0.14)), 5000).map((v, i) => v * Math.exp(-i / SR * 16) * 0.22)
  ))),
  render('buff_pulse', () => {
    const n = Math.floor(SR * 0.18);
    const out = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      out[i] = Math.sin(2 * Math.PI * (300 + t * 700) * t) * env(t, 0.01, 0.06, 0.4, 0.08, 0.18) * 0.3;
    }
    return norm(out, 0.7);
  }),
  render('slam_warn', () => norm(mix(
    tone(95, 0.45, 'tri', 0.35, [0.03, 0.15, 0.5, 0.2]),
    tone(140, 0.4, 'sin', 0.2, [0.05, 0.12, 0.4, 0.18])
  )))
];

const out = {};
for (const [name, samples] of defs) {
  out[name] = wavBuffer(samples).toString('base64');
}

const js = 'const SFX_B64=' + JSON.stringify(out) + ';\n';
const outPath = path.join(__dirname, 'sfx-b64.js');
fs.writeFileSync(outPath, js);
console.log('Wrote', outPath, Object.keys(out).length, 'samples,', (fs.statSync(outPath).size / 1024).toFixed(1), 'KB');
