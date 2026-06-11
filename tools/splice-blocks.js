#!/usr/bin/env node
/* Replaces the legacy boss/drone logic + draw blocks in index.html
   with the new specials/bosses implementation. */
const fs = require('fs');
const path = require('path');
const htmlPath = path.join(__dirname, '../index.html');
let html = fs.readFileSync(htmlPath, 'utf8');
const logic = fs.readFileSync(path.join(__dirname, 'specials-bosses.js'), 'utf8');
const draw = fs.readFileSync(path.join(__dirname, 'specials-bosses-draw.js'), 'utf8');

function spliceBetween(startMark, endMark, replacement, keepEnd) {
  const a = html.indexOf(startMark);
  const b = html.indexOf(endMark);
  if (a < 0 || b < 0 || b <= a) throw new Error('markers not found: ' + startMark.slice(0, 40));
  html = html.slice(0, a) + replacement + (keepEnd ? html.slice(b) : html.slice(b + endMark.length));
}

/* 1. logic block: buildBossStage .. buildPlatformerWorld */
spliceBetween('function buildBossStage(D){', 'function buildPlatformerWorld(lvl,D){', logic + '\n', true);

/* 2. draw block: BOSS / DRONE RENDERING .. ENEMY RENDERING */
spliceBetween('/* ---------------- BOSS / DRONE RENDERING ---------------- */',
  '/* ---------------- ENEMY RENDERING ---------------- */', draw + '\n', true);

fs.writeFileSync(htmlPath, html);
console.log('Spliced new specials/bosses blocks');
