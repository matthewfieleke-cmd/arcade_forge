#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '../index.html');
let html = fs.readFileSync(htmlPath, 'utf8');
const sfx = fs.readFileSync(path.join(__dirname, 'sfx-b64.js'), 'utf8');
const audio = fs.readFileSync(path.join(__dirname, 'audio-module.js'), 'utf8');

const marker = "'use strict';";
if (!html.includes(marker)) throw new Error('marker not found');
if (html.includes('const SFX_B64=')) {
  console.log('Already injected');
  process.exit(0);
}
html = html.replace(
  marker,
  marker + '\n' + sfx + '\n' + audio
);
fs.writeFileSync(htmlPath, html);
console.log('Injected SFX + audio module into index.html');
