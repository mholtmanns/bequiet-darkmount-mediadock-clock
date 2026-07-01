#!/usr/bin/env node
'use strict';

// preview.js — generate preview PNGs for any configured generator
//
// Usage:
//   node preview.js [clock|stats] [--time HH:MM] [--out <path>] [--config <path>]
//
// Examples:
//   node preview.js clock --time 10:10 --out preview_clock.png
//   node preview.js stats --out preview_stats.png

const { execSync } = require('child_process');
const fs   = require('fs');
const path = require('path');
const { loadConfig } = require('./lib/config');
const { buildClockSvg } = require('./generate_clock');
const { buildSvg } = require('./generate_stats');
const { MOCK_STATS } = require('./lib/stats');

function parseArgs(argv) {
  const opts = {
    generator: null,
    time: null,
    out: null,
    config: null,
  };

  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--time') {
      opts.time = argv[++i];
    } else if (arg === '--out') {
      opts.out = argv[++i];
    } else if (arg === '--config') {
      opts.config = argv[++i];
    } else if (!arg.startsWith('-')) {
      positional.push(arg);
    }
  }

  if (positional.length > 0) opts.generator = positional[0];
  return opts;
}

function parseTime(timeStr) {
  const now = new Date();
  if (!timeStr) return now;
  const [h, m] = timeStr.split(':').map(Number);
  now.setHours(h);
  now.setMinutes(m);
  now.setSeconds(0);
  now.setMilliseconds(0);
  return now;
}

async function svgToPng(svg, outPath, width, height) {
  const tmpSvg = path.join(__dirname, `.preview_${Date.now()}.svg`);
  fs.writeFileSync(tmpSvg, svg, 'utf8');
  try {
    const resize = `${width}x${height}!`;
    const commands = [
      `magick -background none "${tmpSvg}" -resize ${resize} "${outPath}"`,
      `convert -background none "${tmpSvg}" -resize ${resize} "${outPath}"`,
    ];
    for (const cmd of commands) {
      try {
        execSync(cmd, { stdio: 'pipe' });
        return;
      } catch (_) { /* try next */ }
    }
    const sharp = require('sharp');
    await sharp(Buffer.from(svg)).resize(width, height).png().toFile(outPath);
  } finally {
    fs.unlinkSync(tmpSvg);
  }
}

async function previewClock(config, now, outPath) {
  const svg = buildClockSvg(now, config, MOCK_STATS);
  await svgToPng(svg, outPath, 640, 512);
}

async function previewStats(now, outPath) {
  const svg = buildSvg(MOCK_STATS, now);
  await svgToPng(svg, outPath, 512, 640);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const config = loadConfig(opts.config ?? undefined);
  const generator = opts.generator ?? config.generator ?? 'clock';
  const outPath = path.resolve(
    opts.out ?? path.join(__dirname, `preview_${generator}.png`)
  );
  const now = parseTime(opts.time);

  console.log(`Rendering ${generator} (${now.toLocaleString()}) → ${outPath}`);

  if (generator === 'clock') {
    await previewClock(config, now, outPath);
  } else if (generator === 'stats') {
    await previewStats(now, outPath);
  } else {
    console.error(`Unknown generator: ${generator}`);
    process.exit(1);
  }

  console.log(`Done → ${outPath}`);
}

if (require.main === module) {
  main().catch(err => {
    console.error(err.message);
    process.exit(1);
  });
}

module.exports = { parseArgs, parseTime, MOCK_STATS, previewClock, previewStats, main };
