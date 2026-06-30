#!/usr/bin/env node
'use strict';

// generate_clock.js — Deutsche Bahn-style analog clock face
// 512×640 portrait PNG, updated every minute (no seconds hand).
// Lazy-requires sharp so the module can be imported for testing without it.

const path = require('path');

// ── Config ────────────────────────────────────────────────────────────────────

const CURRENT_IMAGE = path.join(__dirname, 'current.png');

const W  = 640;
const H  = 512;
const CX = W / 2;   // 256
const CY = H / 2;   // 320
const R  = 224;     // clock face radius (px)

// ── Colours ───────────────────────────────────────────────────────────────────

const C_CANVAS = '#0a0a0f';  // dark outer background
const C_RIM    = '#111111';  // face border ring
const C_FACE   = '#f5f0e8';  // warm off-white face
const C_TICK   = '#111111';  // tick marks
const C_HAND   = '#111111';  // hour hand + minute stem
const C_DISC   = '#e30613';  // DB red — minute-hand lollipop disc

// ── Geometry helpers ─────────────────────────────────────────────────────────
// All angles: 0° = 12 o'clock, positive = clockwise (SVG convention).

/**
 * Apply a clockwise rotation of `angleDeg` to a list of local [x, y] points,
 * then translate to absolute position (cx, cy).
 * Local y-axis: negative = toward 12 o'clock.
 */
function rotateAndTranslate(points, angleDeg, cx, cy) {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return points.map(([lx, ly]) => [
    (cx + lx * cos - ly * sin).toFixed(2),
    (cy + lx * sin + ly * cos).toFixed(2),
  ]);
}

/**
 * SVG <polygon> for a rectangle in local coords:
 *   x ∈ [-w/2, w/2], y ∈ [yNear, yFar]  (negative y = toward 12)
 * Rotated by angleDeg and centred on (cx, cy).
 */
function rotatedRect(cx, cy, angleDeg, w, yNear, yFar, fill) {
  const corners = rotateAndTranslate(
    [[-w / 2, yNear], [w / 2, yNear], [w / 2, yFar], [-w / 2, yFar]],
    angleDeg, cx, cy
  );
  return `<polygon points="${corners.map(c => c.join(',')).join(' ')}" fill="${fill}"/>`;
}

/**
 * Absolute (x, y) of the point that lies `dist` px from (cx, cy)
 * in the direction of `angleDeg` (0 = up, 90 = right).
 */
function radialPoint(cx, cy, angleDeg, dist) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: (cx + Math.sin(rad) * dist).toFixed(2),
    y: (cy - Math.cos(rad) * dist).toFixed(2),
  };
}

// ── SVG builder ───────────────────────────────────────────────────────────────

/**
 * Returns SVG markup for the clock at the given Date.
 * Exported so test scripts can call it without sharp being installed.
 */
function buildClockSvg(now) {
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

  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">

  <!-- Canvas background -->
  <rect width="${W}" height="${H}" fill="${C_CANVAS}"/>

  <!-- Clock face: rim + off-white inner -->
  <circle cx="${CX}" cy="${CY}" r="${R}"     fill="${C_RIM}"/>
  <circle cx="${CX}" cy="${CY}" r="${R - 5}" fill="${C_FACE}"/>

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

// ── Image generation (used by automate.js) ───────────────────────────────────

async function generateImage() {
  const sharp = require('sharp');  // lazy: only loaded when actually generating
  const now = new Date();
  const svg = buildClockSvg(now);

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
