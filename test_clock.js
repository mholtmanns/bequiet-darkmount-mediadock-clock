#!/usr/bin/env node
'use strict';

// test_clock.js — sandbox test runner for generate_clock.js
// Uses ImageMagick `convert` instead of sharp (no native binaries needed).
//
// Usage:
//   node test_clock.js          — current time
//   node test_clock.js 10:10   — specific time (good for visual symmetry checks)

const { execSync }    = require('child_process');
const { buildClockSvg } = require('./generate_clock');
const path = require('path');
const fs   = require('fs');

const OUT_SVG = path.join(__dirname, 'clock_test.svg');
const OUT_PNG = path.join(__dirname, 'clock_test.png');

let now = new Date();
if (process.argv[2]) {
  const [h, m] = process.argv[2].split(':').map(Number);
  now.setHours(h);
  now.setMinutes(m);
  now.setSeconds(0);
}

console.log(`Rendering ${now.getHours()}:${String(now.getMinutes()).padStart(2,'0')} ...`);

const svg = buildClockSvg(now);
fs.writeFileSync(OUT_SVG, svg, 'utf8');

// Force exact 512×640 output with the ! flag; no -density needed (viewBox is set).
execSync(`convert -background none "${OUT_SVG}" -resize 640x512! "${OUT_PNG}"`, {
  stdio: 'inherit',
});

fs.unlinkSync(OUT_SVG);
console.log(`Done → ${OUT_PNG}`);
