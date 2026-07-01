#!/usr/bin/env node
'use strict';

// generate_clock.js — Deutsche Bahn-style analog clock face
// 640×480 PNG; optional config.padding insets the drawable area on all four sides.

const path = require('path');
const { loadConfig } = require('./lib/config');
const {
  W, H,
  resolveLayout,
  C_CANVAS, C_RIM, C_FACE, C_TICK, C_HAND, C_DISC,
} = require('./lib/layout');
const { writeClockPng } = require('./lib/clockOutput');
const { rotatedRect, radialPoint } = require('./lib/geometry');
const { buildComplicationsSvg } = require('./lib/complications');
const { getStats, needsStats } = require('./lib/stats');

// ── Config ────────────────────────────────────────────────────────────────────

// PNG written here; IO Center reads it, creates its own UUID copy, pushes to keyboard
const CURRENT_IMAGE = path.join(__dirname, 'current.png');

// ── SVG builder ───────────────────────────────────────────────────────────────

/**
 * Returns SVG markup for the clock at the given Date.
 * Exported so test scripts can call it without sharp being installed.
 *
 * @param {Date} now
 * @param {object} [config] — optional; `config.complications` toggles overlay slots
 * @param {object} [stats] — system stats for corner slot values
 */
function buildClockSvg(now, config = {}, stats = null) {
  const layout = resolveLayout(config.padding);
  const { CX, CY, R, scale } = layout;

  const h12 = now.getHours() % 12;
  const min = now.getMinutes();

  const hourAngle   = (h12 + min / 60) * 30;
  const minuteAngle = min * 6;

  const TICK_OUTER = R - 6 * scale;

  const HOUR_TICK = { len: 28 * scale, w: 14 * scale };
  const MIN_TICK  = { len: 11 * scale, w:  5 * scale };

  const ticks = [];
  for (let i = 0; i < 60; i++) {
    const t = i % 5 === 0 ? HOUR_TICK : MIN_TICK;
    ticks.push(
      rotatedRect(CX, CY, i * 6, t.w, -TICK_OUTER, -(TICK_OUTER - t.len), C_TICK)
    );
  }

  const HOUR_TIP  = 136 * scale;
  const HOUR_TAIL = 28 * scale;
  const HOUR_W    = 16 * scale;

  const hourHand  = rotatedRect(CX, CY, hourAngle, HOUR_W, -HOUR_TIP, HOUR_TAIL, C_HAND);
  const hourTipPt = radialPoint(CX, CY, hourAngle, HOUR_TIP);
  const hourCap   = `<circle cx="${hourTipPt.x}" cy="${hourTipPt.y}" r="${HOUR_W / 2}" fill="${C_HAND}"/>`;

  const MIN_TIP   = 198 * scale;
  const MIN_TAIL  = 32 * scale;
  const MIN_W     = 7 * scale;
  const DISC_R    = 17 * scale;
  const DISC_DIST = R * 0.765;

  const minStem   = rotatedRect(CX, CY, minuteAngle, MIN_W, -MIN_TIP, MIN_TAIL, C_HAND);
  const minTipPt  = radialPoint(CX, CY, minuteAngle, MIN_TIP);
  const minCap    = `<circle cx="${minTipPt.x}" cy="${minTipPt.y}" r="${MIN_W / 2}" fill="${C_HAND}"/>`;
  const discPt    = radialPoint(CX, CY, minuteAngle, DISC_DIST);
  const disc      = `<circle cx="${discPt.x}" cy="${discPt.y}" r="${DISC_R}" fill="${C_DISC}"/>`;

  const complicationsSvg = buildComplicationsSvg(now, config, stats, layout);

  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">

  <!-- Canvas background -->
  <rect width="${W}" height="${H}" fill="${C_CANVAS}"/>

  <!-- Clock face: rim + off-white inner -->
  <circle cx="${CX}" cy="${CY}" r="${R}"     fill="${C_RIM}"/>
  <circle cx="${CX}" cy="${CY}" r="${R - 5 * scale}" fill="${C_FACE}"/>

  <!-- Complications (corners + date) -->
  ${complicationsSvg}

  <!-- Tick marks -->
  ${ticks.join('\n  ')}

  <!-- Hour hand (below minute hand) -->
  ${hourHand}
  ${hourCap}

  <!-- Minute hand + red disc -->
  ${minStem}
  ${minCap}
  ${disc}

  <!-- Centre hub -->
  <circle cx="${CX}" cy="${CY}" r="${13 * scale}" fill="${C_HAND}"/>
  <circle cx="${CX}" cy="${CY}" r="${5 * scale}"  fill="${C_FACE}"/>

</svg>`;
}

// ── Image generation (used by automate.js via generate.js) ───────────────────

async function generateImage(config) {
  const resolved = config ?? loadConfig();
  const now = new Date();
  const stats = needsStats(resolved) ? await getStats() : null;
  const svg = buildClockSvg(now, resolved, stats);

  await writeClockPng(svg, CURRENT_IMAGE);

  if (stats) {
    const gpuInfo = stats.gpuLoadPct != null
      ? `, GPU ${Math.round(stats.gpuLoadPct)}% @ ${stats.gpuTemp}°C`
      : '';
    console.log(`[${now.toLocaleTimeString()}] CPU ${stats.cpuPct}%  RAM ${stats.ramPct}%${gpuInfo} → ${CURRENT_IMAGE}`);
  } else {
    console.log(`[${now.toLocaleTimeString()}] Clock → ${CURRENT_IMAGE}`);
  }
  return CURRENT_IMAGE;
}

module.exports = { generateImage, buildClockSvg };

// ── Standalone: node generate_clock.js → writes current.png ─────────────────

if (require.main === module) {
  generateImage().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
}
