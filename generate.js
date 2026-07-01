#!/usr/bin/env node
'use strict';

// generate.js — config-driven dispatcher for image generators
// Reads config.json and delegates to generate_clock.js or generate_stats.js.

const { loadConfig } = require('./lib/config');

// ── Generator registry ────────────────────────────────────────────────────────

const GENERATORS = {
  clock: require('./generate_clock'),
  stats: require('./generate_stats'),
};

// ── Public API (used by automate.js) ────────────────────────────────────────────

async function generateImage() {
  const config = loadConfig();
  const name = config.generator ?? 'clock';
  const gen = GENERATORS[name];
  if (!gen) throw new Error(`Unknown generator: ${name}`);
  return gen.generateImage(config);
}

module.exports = { generateImage, GENERATORS };

// ── Standalone: node generate.js → writes current.png ─────────────────────────

if (require.main === module) {
  generateImage().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
}
