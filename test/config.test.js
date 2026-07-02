'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs   = require('fs');
const path = require('path');
const os   = require('os');
const { loadConfig, resolveFont, DEFAULTS } = require('../lib/config');
const { GENERATORS } = require('../generate');

describe('loadConfig', () => {
  it('returns defaults when config file is missing', () => {
    const config = loadConfig(path.join(os.tmpdir(), 'nonexistent-config.json'));
    assert.equal(config.generator, DEFAULTS.generator);
    assert.equal(config.intervalMs, DEFAULTS.intervalMs);
    assert.deepEqual(config.complications, DEFAULTS.complications);
    assert.deepEqual(config.fonts, DEFAULTS.fonts);
    assert.deepEqual(config.padding, DEFAULTS.padding);
    assert.deepEqual(config.hwinfo, DEFAULTS.hwinfo);
    assert.deepEqual(config.nvidiaSmi, DEFAULTS.nvidiaSmi);
  });

  it('merges file values over defaults', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'config-test-'));
    const configPath = path.join(tmpDir, 'config.json');
    fs.writeFileSync(configPath, JSON.stringify({
      generator: 'stats',
      intervalMs: 20_000,
      complications: { slots: { '1': 'gpu', '2': null } },
    }));

    const config = loadConfig(configPath);
    assert.equal(config.generator, 'stats');
    assert.equal(config.intervalMs, 20_000);
    assert.equal(config.complications.slots['1'], 'gpu');
    assert.equal(config.complications.slots['2'], null);
    assert.equal(config.complications.slots['3'], DEFAULTS.complications.slots['3']);

    fs.rmSync(tmpDir, { recursive: true });
  });

  it('deep-merges complications.slots', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'config-test-'));
    const configPath = path.join(tmpDir, 'config.json');
    fs.writeFileSync(configPath, JSON.stringify({
      complications: { slots: { '4': 'vram' } },
    }));

    const config = loadConfig(configPath);
    assert.equal(config.complications.slots['4'], 'vram');
    assert.equal(config.complications.slots['1'], DEFAULTS.complications.slots['1']);

    fs.rmSync(tmpDir, { recursive: true });
  });

  it('deep-merges padding', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'config-test-'));
    const configPath = path.join(tmpDir, 'config.json');
    fs.writeFileSync(configPath, JSON.stringify({
      padding: { bottom: 20 },
    }));

    const config = loadConfig(configPath);
    assert.equal(config.padding.bottom, 20);
    assert.equal(config.padding.top, DEFAULTS.padding.top);

    fs.rmSync(tmpDir, { recursive: true });
  });

  it('deep-merges fonts.weights', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'config-test-'));
    const configPath = path.join(tmpDir, 'config.json');
    fs.writeFileSync(configPath, JSON.stringify({
      fonts: { sans: 'Arial, sans-serif', weights: { bold: '900' } },
    }));

    const config = loadConfig(configPath);
    assert.equal(config.fonts.sans, 'Arial, sans-serif');
    assert.equal(config.fonts.weights.bold, '900');
    assert.equal(config.fonts.weights.semibold, DEFAULTS.fonts.weights.semibold);

    fs.rmSync(tmpDir, { recursive: true });
  });

  it('deep-merges fonts.sizes', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'config-test-'));
    const configPath = path.join(tmpDir, 'config.json');
    fs.writeFileSync(configPath, JSON.stringify({
      fonts: { sizes: { complicationDate: 32 } },
    }));

    const config = loadConfig(configPath);
    assert.equal(config.fonts.sizes.complicationDate, 32);
    assert.equal(config.fonts.sizes.complicationCorner, DEFAULTS.fonts.sizes.complicationCorner);

    fs.rmSync(tmpDir, { recursive: true });
  });

  it('deep-merges hwinfo', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'config-test-'));
    const configPath = path.join(tmpDir, 'config.json');
    fs.writeFileSync(configPath, JSON.stringify({
      hwinfo: { cpuTempIndex: 102 },
    }));

    const config = loadConfig(configPath);
    assert.equal(config.hwinfo.cpuTempIndex, 102);
    assert.equal(config.hwinfo.cpuTempLabel, DEFAULTS.hwinfo.cpuTempLabel);
    assert.equal(config.hwinfo.hive, DEFAULTS.hwinfo.hive);

    fs.rmSync(tmpDir, { recursive: true });
  });

  it('deep-merges nvidiaSmi', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'config-test-'));
    const configPath = path.join(tmpDir, 'config.json');
    fs.writeFileSync(configPath, JSON.stringify({
      nvidiaSmi: { enabled: false },
    }));

    const config = loadConfig(configPath);
    assert.equal(config.nvidiaSmi.enabled, false);

    fs.rmSync(tmpDir, { recursive: true });
  });
});

describe('resolveFont', () => {
  it('returns sans + semibold by default', () => {
    const { family, weight } = resolveFont();
    assert.equal(family, DEFAULTS.fonts.sans);
    assert.equal(weight, DEFAULTS.fonts.weights.semibold);
  });

  it('uses role-specific family when set', () => {
    const { family } = resolveFont(
      { complication: 'Georgia, serif' },
      { familyKey: 'complication' }
    );
    assert.equal(family, 'Georgia, serif');
  });

  it('falls back to sans when role family is null', () => {
    const { family } = resolveFont(
      { complication: null },
      { familyKey: 'complication' }
    );
    assert.equal(family, DEFAULTS.fonts.sans);
  });

  it('returns size when sizeKey is given', () => {
    const { size } = resolveFont(
      { sizes: { complicationDate: 36 } },
      { sizeKey: 'complicationDate' }
    );
    assert.equal(size, 36);
  });
});

describe('generate.js dispatcher', () => {
  it('throws for unknown generator name', () => {
    const name = 'unknown';
    const gen = GENERATORS[name];
    assert.equal(gen, undefined);
    assert.throws(() => {
      if (!gen) throw new Error(`Unknown generator: ${name}`);
    }, /Unknown generator: unknown/);
  });

  it('exports clock and stats generators', () => {
    assert.ok(GENERATORS.clock);
    assert.ok(GENERATORS.stats);
    assert.equal(typeof GENERATORS.clock.generateImage, 'function');
    assert.equal(typeof GENERATORS.stats.generateImage, 'function');
  });
});
