'use strict';

// lib/complications.js — overlay slots for the analog clock face
// Corner widgets (155×100) and date text above/below the centre.

const { resolveFont } = require('./config');
const {
  CORNER_SLOTS,
  DATE_SLOTS,
  C_CANVAS,
  C_FACE,
  C_HAND,
} = require('./layout');

/**
 * SVG fragment for one corner complication: bordered rect + centred placeholder digit.
 */
function buildCornerComplication(slot, font) {
  const { x, y, w, h, placeholder } = slot;
  const cx = x + w / 2;
  const cy = y + h / 2;
  return `
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${C_CANVAS}" stroke="${C_HAND}" stroke-width="2"/>
  <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle"
        font-family="${font.family}" font-size="${font.size}" font-weight="${font.weight}" fill="${C_FACE}">${placeholder}</text>`;
}

/**
 * Returns SVG markup for all enabled complications.
 * Reads `config.complications` for slot toggles and `config.fonts` for typography.
 */
function buildComplicationsSvg(now, config = {}) {
  const complicationsConfig = config.complications ?? {};
  const cornerFont = resolveFont(config.fonts, {
    familyKey: 'complication', weightKey: 'bold', sizeKey: 'complicationCorner',
  });
  const dateFont = resolveFont(config.fonts, {
    familyKey: 'complication', weightKey: 'semibold', sizeKey: 'complicationDate',
  });
  const parts = [];

  // ── Corner slots (placeholders 1–4) ───────────────────────────────────────────
  for (const [key, slot] of Object.entries(CORNER_SLOTS)) {
    if (complicationsConfig[key]) {
      parts.push(buildCornerComplication(slot, cornerFont));
    }
  }

  // ── Date slots (on the vertical axis through the clock centre) ──────────────
  if (complicationsConfig.dayOfWeek) {
    const { x, y } = DATE_SLOTS.dayOfWeek;
    const label = now.toLocaleDateString('en-US', { weekday: 'short' });
    parts.push(`
  <text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle"
        font-family="${dateFont.family}" font-size="${dateFont.size}" font-weight="${dateFont.weight}" fill="${C_HAND}">${label}</text>`);
  }

  if (complicationsConfig.date) {
    const { x, y } = DATE_SLOTS.date;
    const label = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    parts.push(`
  <text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle"
        font-family="${dateFont.family}" font-size="${dateFont.size}" font-weight="${dateFont.weight}" fill="${C_HAND}">${label}</text>`);
  }

  return parts.join('\n');
}

module.exports = { buildComplicationsSvg, buildCornerComplication };
