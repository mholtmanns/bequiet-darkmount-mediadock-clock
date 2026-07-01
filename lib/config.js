'use strict';

// lib/config.js — load config.json and merge with defaults
// Shared by generate.js, automate.js, and generate_clock.js (standalone).

const fs   = require('fs');
const path = require('path');

const DEFAULT_CONFIG_PATH = path.join(__dirname, '..', 'config.json');

// ── Defaults ──────────────────────────────────────────────────────────────────
// Copy config.example.json → config.json to override.

const DEFAULTS = {
  generator: 'clock',   // 'clock' | 'stats'
  intervalMs: 60_000,   // upload interval for automate.js
  complications: {
    slots: {
      '1': 'cpu',
      '2': 'ram',
      '3': 'gpu',
      '4': 'cpuTemp',
    },
    dayOfWeek: true,
    date:      true,
  },
  // Font stacks resolved at PNG rasterize time (sharp / OS system fonts).
  // Generators pick a family key + weight key; per-role overrides optional.
  fonts: {
    sans: 'Segoe UI, Helvetica Neue, Arial, sans-serif',
    mono: 'Consolas, Courier New, monospace',
    complication: null,   // omit or null → inherit sans
    weights: {
      normal:   '400',
      semibold: '600',
      bold:     '700',
    },
    sizes: {
      complicationCorner:      40,
      complicationCornerLabel: 20,
      complicationDate:        28,
    },
  },
  // Inset from each edge (px). Shrinks drawable area; output PNG stays 640×480.
  padding: {
    top:    0,
    right:  0,
    bottom: 0,
    left:   0,
  },
};

/**
 * Read config.json (if present) and deep-merge with DEFAULTS.
 * Never throws when the file is missing — returns defaults instead.
 */
function loadConfig(configPath = DEFAULT_CONFIG_PATH) {
  let fileConfig = {};
  if (fs.existsSync(configPath)) {
    fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
  return {
    ...DEFAULTS,
    ...fileConfig,
    complications: {
      ...DEFAULTS.complications,
      ...(fileConfig.complications ?? {}),
      slots: {
        ...DEFAULTS.complications.slots,
        ...(fileConfig.complications?.slots ?? {}),
      },
    },
    fonts: {
      ...DEFAULTS.fonts,
      ...(fileConfig.fonts ?? {}),
      weights: {
        ...DEFAULTS.fonts.weights,
        ...(fileConfig.fonts?.weights ?? {}),
      },
      sizes: {
        ...DEFAULTS.fonts.sizes,
        ...(fileConfig.fonts?.sizes ?? {}),
      },
    },
    padding: {
      ...DEFAULTS.padding,
      ...(fileConfig.padding ?? {}),
    },
  };
}

/**
 * Resolve font-family and font-weight for a generator role.
 * @param {object} [fonts] — config.fonts (partial OK)
 * @param {{ familyKey?: string, weightKey?: string, sizeKey?: string }} [options]
 *   familyKey — key under fonts (e.g. 'sans', 'complication'); falls back to sans
 *   weightKey — key under fonts.weights (e.g. 'semibold', 'bold')
 *   sizeKey   — key under fonts.sizes (e.g. 'complicationDate')
 */
function resolveFont(fonts = {}, { familyKey = 'sans', weightKey = 'semibold', sizeKey } = {}) {
  const merged = {
    ...DEFAULTS.fonts,
    ...fonts,
    weights: {
      ...DEFAULTS.fonts.weights,
      ...(fonts.weights ?? {}),
    },
    sizes: {
      ...DEFAULTS.fonts.sizes,
      ...(fonts.sizes ?? {}),
    },
  };
  const family = merged[familyKey] || merged.sans;
  const weight = merged.weights[weightKey] ?? merged.weights.semibold;
  const result = { family, weight };
  if (sizeKey) {
    result.size = merged.sizes[sizeKey] ?? DEFAULTS.fonts.sizes[sizeKey];
  }
  return result;
}

module.exports = { loadConfig, resolveFont, DEFAULTS, DEFAULT_CONFIG_PATH };
