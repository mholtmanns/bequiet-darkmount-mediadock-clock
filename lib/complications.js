'use strict';

// lib/complications.js — overlay slots for the analog clock face
// Corner widgets (155×100) and date text above/below the centre.

const { resolveFont } = require('./config');
const { formatStatForSlot, isStatTypeKey, isSlotEnabled } = require('./stats');
const {
  resolveLayout,
  SLOT_NUMBERS,
  SLOT_TO_CORNER,
  computeCornerTextYs,
  C_HAND,
  C_COMPLICATION_LABEL,
} = require('./layout');

/**
 * SVG fragment for one corner stat complication: label + value.
 */
function buildStatCornerComplication(slot, formatted, labelFont, valueFont) {
  const { x, y, w, h } = slot;
  const cx = x + w / 2;
  const { labelY, valueY } = computeCornerTextYs(y, h, labelFont.size, valueFont.size);
  return `
  <text x="${cx}" y="${labelY}" text-anchor="middle" dominant-baseline="middle"
        font-family="${labelFont.family}" font-size="${labelFont.size}" font-weight="${labelFont.weight}" fill="${C_COMPLICATION_LABEL}">${formatted.label}</text>
  <text x="${cx}" y="${valueY}" text-anchor="middle" dominant-baseline="middle"
        font-family="${valueFont.family}" font-size="${valueFont.size}" font-weight="${valueFont.weight}" fill="${formatted.valueFill}">${formatted.value}</text>`;
}

/**
 * Returns SVG markup for all enabled complications.
 * Reads `config.complications.slots` for corner stat assignment and `config.fonts` for typography.
 */
function buildComplicationsSvg(now, config = {}, stats = null, layout = null) {
  const resolvedLayout = layout ?? resolveLayout(config.padding);
  const { CORNER_SLOTS, DATE_SLOTS } = resolvedLayout;

  const complicationsConfig = config.complications ?? {};
  const slots = complicationsConfig.slots ?? {};
  const labelFont = resolveFont(config.fonts, {
    familyKey: 'complication', weightKey: 'semibold', sizeKey: 'complicationCornerLabel',
  });
  const valueFont = resolveFont(config.fonts, {
    familyKey: 'complication', weightKey: 'bold', sizeKey: 'complicationCorner',
  });
  const dateFont = resolveFont(config.fonts, {
    familyKey: 'complication', weightKey: 'semibold', sizeKey: 'complicationDate',
  });
  const parts = [];

  // ── Corner slots (stats assigned via slots 1–4) ─────────────────────────────
  const resolvedStats = stats ?? {};
  for (const num of SLOT_NUMBERS) {
    const statType = slots[num];
    if (!isSlotEnabled(statType) || !isStatTypeKey(statType)) continue;
    const cornerKey = SLOT_TO_CORNER[num];
    const slot = CORNER_SLOTS[cornerKey];
    const formatted = formatStatForSlot(statType, resolvedStats);
    if (!formatted || !slot) continue;
    parts.push(buildStatCornerComplication(slot, formatted, labelFont, valueFont));
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

module.exports = { buildComplicationsSvg, buildStatCornerComplication };
