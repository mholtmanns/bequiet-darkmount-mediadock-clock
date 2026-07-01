#!/usr/bin/env node
'use strict';

// generate_clock.js — Deutsche Bahn-style analog clock face
// 640×480 PNG; optional config.padding insets the drawable area on all four sides.

const path = require('path');
const { loadConfig } = require('./lib/config');
const {
  W, H,
  resolveLayout,
  HAND_REF,
  minuteHandTip,
  C_CANVAS, C_RIM, C_FACE, C_TICK, C_HAND,
} = require('./lib/layout');
const { writeClockPng } = require('./lib/clockOutput');
const { rotatedRect } = require('./lib/geometry');
const { buildComplicationsSvg } = require('./lib/complications');
const { getStats, needsStats } = require('./lib/stats');

// ── Config ────────────────────────────────────────────────────────────────────

const CURRENT_IMAGE = path.join(__dirname, 'current.png');

function scaledTick(ref, scale) {
  return { len: ref.len * scale, w: ref.w * scale };
}

/**
 * Returns SVG markup for the clock at the given Date.
 */
function buildClockSvg(now, config = {}, stats = null) {
  const layout = resolveLayout(config.padding);
  const { CX, CY, R, scale } = layout;

  const h12 = now.getHours() % 12;
  const min = now.getMinutes();

  const hourAngle   = (h12 + min / 60) * 30;
  const minuteAngle = min * 6;

  const tickOuter = R - HAND_REF.tickInset * scale;
  const hourTick = scaledTick(HAND_REF.hourTick, scale);
  const cardinalTick = scaledTick(HAND_REF.cardinalTick, scale);
  const minTick = scaledTick(HAND_REF.minTick, scale);

  const ticks = [];
  for (let i = 0; i < 60; i++) {
    const t = i % 15 === 0 ? cardinalTick : i % 5 === 0 ? hourTick : minTick;
    ticks.push(
      rotatedRect(CX, CY, i * 6, t.w, -tickOuter, -(tickOuter - t.len), C_TICK)
    );
  }

  const HOUR_TIP  = HAND_REF.hourTip * scale;
  const HOUR_TAIL = HAND_REF.hourTail * scale;
  const HOUR_W    = HAND_REF.hourWidth * scale;

  const MIN_TIP   = minuteHandTip(R, scale);
  const MIN_TAIL  = HAND_REF.minuteTail * scale;
  const MIN_W     = HAND_REF.minuteWidth * scale;

  const hourHand = rotatedRect(CX, CY, hourAngle, HOUR_W, -HOUR_TIP, HOUR_TAIL, C_HAND);
  const minHand  = rotatedRect(CX, CY, minuteAngle, MIN_W, -MIN_TIP, MIN_TAIL, C_HAND);

  const complicationsSvg = buildComplicationsSvg(now, config, stats, layout);

  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">

  <!-- Canvas background -->
  <rect width="${W}" height="${H}" fill="${C_CANVAS}"/>

  <!-- Clock face: rim + off-white inner -->
  <circle cx="${CX}" cy="${CY}" r="${R}"     fill="${C_RIM}"/>
  <circle cx="${CX}" cy="${CY}" r="${R - HAND_REF.faceRimInset * scale}" fill="${C_FACE}"/>

  <!-- Complications (corners + date) -->
  ${complicationsSvg}

  <!-- Tick marks -->
  ${ticks.join('\n  ')}

  <!-- Hour hand (below minute hand) -->
  ${hourHand}

  <!-- Minute hand -->
  ${minHand}

  <!-- Centre hub -->
  <circle cx="${CX}" cy="${CY}" r="${HAND_REF.hubOuter * scale}" fill="${C_HAND}"/>
  <circle cx="${CX}" cy="${CY}" r="${HAND_REF.hubInner * scale}"  fill="${C_FACE}"/>

</svg>`;
}

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

if (require.main === module) {
  generateImage().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
}
