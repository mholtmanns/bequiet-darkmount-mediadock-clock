#!/usr/bin/env node
'use strict';

// generate_clock.js — Deutsche Bahn-style analog clock face
// 640×512 landscape PNG, updated every minute (no seconds hand).
// Lazy-requires sharp so the module can be imported for testing without it.

const path = require('path');
const { loadConfig } = require('./lib/config');
const {
  W, H, CX, CY, R,
  C_CANVAS, C_RIM, C_FACE, C_TICK, C_HAND, C_DISC,
} = require('./lib/layout');
const { rotatedRect, radialPoint } = require('./lib/geometry');
const { buildComplicationsSvg } = require('./lib/complications');

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
 */
function buildClockSvg(now, config = {}) {
  const h12 = now.getHours() % 12;
  const min = now.getMinutes();

  // Smooth hour hand: advances 0.5° per minute within the hour
  const hourAngle   = (h12 + min / 60) * 30;
  const minuteAngle = min * 6;

  // ── Tick marks ──────────────────────────────────────────────────────────────
  const TICK_OUTER = R - 6;  // outer edge of ticks (just inside the rim)

  const HOUR_TICK = { len: 28, w: 14 };
  const MIN_TICK  = { len: 11, w:  5 };

  const ticks = [];
  for (let i = 0; i < 60; i++) {
    const t = i % 5 === 0 ? HOUR_TICK : MIN_TICK;
    ticks.push(
      rotatedRect(CX, CY, i * 6, t.w, -TICK_OUTER, -(TICK_OUTER - t.len), C_TICK)
    );
  }

  // ── Hour hand ────────────────────────────────────────────────────────────────
  const HOUR_TIP  = 136;   // distance tip → centre (px)
  const HOUR_TAIL = 28;    // distance centre → tail (px)
  const HOUR_W    = 16;    // hand width (px)

  const hourHand  = rotatedRect(CX, CY, hourAngle, HOUR_W, -HOUR_TIP, HOUR_TAIL, C_HAND);
  const hourTipPt = radialPoint(CX, CY, hourAngle, HOUR_TIP);
  const hourCap   = `<circle cx="${hourTipPt.x}" cy="${hourTipPt.y}" r="${HOUR_W / 2}" fill="${C_HAND}"/>`;

  // ── Minute hand ──────────────────────────────────────────────────────────────
  const MIN_TIP   = 198;        // stem tip → centre (px)
  const MIN_TAIL  = 32;         // centre → tail (px)
  const MIN_W     = 7;          // stem width (px)
  const DISC_R    = 17;         // radius of the red disc (px)
  const DISC_DIST = R * 0.765;  // disc centre → clock centre (≈ 171 px)

  const minStem   = rotatedRect(CX, CY, minuteAngle, MIN_W, -MIN_TIP, MIN_TAIL, C_HAND);
  const minTipPt  = radialPoint(CX, CY, minuteAngle, MIN_TIP);
  const minCap    = `<circle cx="${minTipPt.x}" cy="${minTipPt.y}" r="${MIN_W / 2}" fill="${C_HAND}"/>`;
  const discPt    = radialPoint(CX, CY, minuteAngle, DISC_DIST);
  const disc      = `<circle cx="${discPt.x}" cy="${discPt.y}" r="${DISC_R}" fill="${C_DISC}"/>`;

  // ── Complications (corners + date) ─────────────────────────────────────────
  // Rendered after the face background, before tick marks and hands.
  const complicationsSvg = buildComplicationsSvg(now, config);

  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">

  <!-- Canvas background -->
  <rect width="${W}" height="${H}" fill="${C_CANVAS}"/>

  <!-- Clock face: rim + off-white inner -->
  <circle cx="${CX}" cy="${CY}" r="${R}"     fill="${C_RIM}"/>
  <circle cx="${CX}" cy="${CY}" r="${R - 5}" fill="${C_FACE}"/>

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
  <circle cx="${CX}" cy="${CY}" r="13" fill="${C_HAND}"/>
  <circle cx="${CX}" cy="${CY}" r="5"  fill="${C_FACE}"/>

</svg>`;
}

// ── Image generation (used by automate.js via generate.js) ───────────────────

async function generateImage(config) {
  const sharp = require('sharp');  // lazy: only loaded when actually generating
  const resolved = config ?? loadConfig();
  const now = new Date();
  const svg = buildClockSvg(now, resolved);

  await sharp(Buffer.from(svg))
    .resize(W, H)
    .png()
    .toFile(CURRENT_IMAGE);

  console.log(`[${now.toLocaleTimeString()}] Clock → ${CURRENT_IMAGE}`);
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
