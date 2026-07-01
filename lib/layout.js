'use strict';

// lib/layout.js — shared canvas dimensions, complication positions, and clock palette
// Used by generate_clock.js and lib/complications.js.

// ── Canvas ────────────────────────────────────────────────────────────────────
// Landscape 640×512 (media dock orientation for the clock template).

const W  = 640;
const H  = 512;
const CX = W / 2;  // 320 — horizontal centre
const CY = H / 2;  // 256 — vertical centre
const R  = 224;    // clock face radius (px)

// ── Complication layout (static positions) ────────────────────────────────────

const CORNER_W = 155;
const CORNER_H = 100;

// Four corner slots; placeholder digits 1–4 map to TL, TR, BL, BR.
const CORNER_SLOTS = {
  cornerTopLeft:     { x: 0,           y: 0,           w: CORNER_W, h: CORNER_H, placeholder: '1' },
  cornerTopRight:    { x: W - CORNER_W, y: 0,           w: CORNER_W, h: CORNER_H, placeholder: '2' },
  cornerBottomLeft:  { x: 0,           y: H - CORNER_H, w: CORNER_W, h: CORNER_H, placeholder: '3' },
  cornerBottomRight: { x: W - CORNER_W, y: H - CORNER_H, w: CORNER_W, h: CORNER_H, placeholder: '4' },
};

// Date slots sit on the vertical axis through the clock centre, half a radius away.
const DATE_SLOTS = {
  dayOfWeek: { x: CX, y: CY - R / 2 },  // above centre
  date:      { x: CX, y: CY + R / 2 },  // below centre
};

// ── Colours ───────────────────────────────────────────────────────────────────

const C_CANVAS = '#0a0a0f';  // dark outer background
const C_RIM    = '#111111';  // face border ring
const C_FACE   = '#f5f0e8';  // warm off-white face
const C_TICK   = '#111111';  // tick marks
const C_HAND   = '#111111';  // hour hand + minute stem
const C_DISC   = '#e30613';  // DB red — minute-hand lollipop disc

module.exports = {
  W, H, CX, CY, R,
  CORNER_W, CORNER_H,
  CORNER_SLOTS,
  DATE_SLOTS,
  C_CANVAS, C_RIM, C_FACE, C_TICK, C_HAND, C_DISC,
};
