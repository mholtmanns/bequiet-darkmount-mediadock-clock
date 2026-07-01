'use strict';

// lib/layout.js — canvas dimensions, padding-aware layout, and clock palette
// Used by generate_clock.js and lib/complications.js.

// ── Canvas ────────────────────────────────────────────────────────────────────
// Fixed 640×480 PNG for the media dock.

const W  = 640;
const H  = 480;
const REF_R = H / 2;  // 240 — reference face radius with zero padding (hand scaling)

// ── Complication layout constants ─────────────────────────────────────────────

const CORNER_W = 155;
const CORNER_H = 100;
const CORNER_TEXT_TOP_INSET = 12;
const CORNER_TEXT_GAP = 12;

const SLOT_NUMBERS = ['1', '2', '3', '4'];
const SLOT_TO_CORNER = {
  '1': 'cornerTopLeft',
  '2': 'cornerTopRight',
  '3': 'cornerBottomLeft',
  '4': 'cornerBottomRight',
};

/**
 * Vertical positions for label + value text in a corner slot (dominant-baseline: middle).
 * @returns {{ labelY: number, valueY: number }}
 */
function computeCornerTextYs(y, h, labelSize, valueSize, gap = CORNER_TEXT_GAP, topInset = CORNER_TEXT_TOP_INSET) {
  const labelY = y + topInset + labelSize / 2;
  const valueY = y + topInset + labelSize + gap + valueSize / 2;
  return { labelY, valueY };
}

function normalizePadding(padding = {}) {
  return {
    top:    Math.max(0, padding.top ?? 0),
    right:  Math.max(0, padding.right ?? 0),
    bottom: Math.max(0, padding.bottom ?? 0),
    left:   Math.max(0, padding.left ?? 0),
  };
}

/**
 * Compute clock centre, face radius, and slot positions from edge padding.
 * Padding shrinks the drawable area; the face fills drawable height when width allows.
 */
function resolveLayout(padding = {}) {
  const pad = normalizePadding(padding);
  const drawW = W - pad.left - pad.right;
  const drawH = H - pad.top - pad.bottom;

  let R = drawH / 2;
  if (drawW < 2 * R) R = drawW / 2;

  const CX = pad.left + drawW / 2;
  const CY = pad.top + drawH / 2;
  const scale = R / REF_R;

  const CORNER_SLOTS = {
    cornerTopLeft:     { x: pad.left,              y: pad.top,               w: CORNER_W, h: CORNER_H },
    cornerTopRight:    { x: W - pad.right - CORNER_W, y: pad.top,            w: CORNER_W, h: CORNER_H },
    cornerBottomLeft:  { x: pad.left,              y: H - pad.bottom - CORNER_H, w: CORNER_W, h: CORNER_H },
    cornerBottomRight: { x: W - pad.right - CORNER_W, y: H - pad.bottom - CORNER_H, w: CORNER_W, h: CORNER_H },
  };

  const DATE_SLOTS = {
    dayOfWeek: { x: CX, y: CY - R / 2 },
    date:      { x: CX, y: CY + R / 2 },
  };

  return { W, H, padding: pad, drawW, drawH, CX, CY, R, scale, CORNER_SLOTS, DATE_SLOTS };
}

// Zero-padding layout (tests and backward-compatible imports).
const DEFAULT_LAYOUT = resolveLayout();

// ── Colours ───────────────────────────────────────────────────────────────────

const C_CANVAS = '#0a0a0f';
const C_RIM    = '#111111';
const C_FACE   = '#f5f0e8';
const C_TICK   = '#111111';
const C_HAND   = '#111111';
const C_DISC   = '#e30613';
const C_COMPLICATION_LABEL = '#b0b0b8';

module.exports = {
  W, H, REF_R,
  CORNER_W, CORNER_H, CORNER_TEXT_TOP_INSET, CORNER_TEXT_GAP,
  computeCornerTextYs,
  normalizePadding,
  resolveLayout,
  DEFAULT_LAYOUT,
  // Re-export zero-padding values for tests that import static names.
  CX: DEFAULT_LAYOUT.CX,
  CY: DEFAULT_LAYOUT.CY,
  R: DEFAULT_LAYOUT.R,
  CORNER_SLOTS: DEFAULT_LAYOUT.CORNER_SLOTS,
  DATE_SLOTS: DEFAULT_LAYOUT.DATE_SLOTS,
  SLOT_NUMBERS,
  SLOT_TO_CORNER,
  C_CANVAS, C_RIM, C_FACE, C_TICK, C_HAND, C_DISC, C_COMPLICATION_LABEL,
};
