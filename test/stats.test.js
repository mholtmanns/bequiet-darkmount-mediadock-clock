'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  MOCK_STATS,
  parseCpuTemp,
  formatStatForSlot,
  needsStats,
  isStatTypeKey,
} = require('../lib/stats');

describe('parseCpuTemp', () => {
  it('returns max of valid readings', () => {
    assert.equal(parseCpuTemp({ main: 45, max: 62, cores: [50, 55] }), 62);
  });

  it('returns null when no valid readings', () => {
    assert.equal(parseCpuTemp({ main: null, max: null, cores: [] }), null);
    assert.equal(parseCpuTemp({ main: -1, max: 0 }), null);
  });
});

describe('formatStatForSlot', () => {
  it('formats CPU load as label CPU and percent value', () => {
    const f = formatStatForSlot('cpu', MOCK_STATS);
    assert.equal(f.label, 'CPU');
    assert.equal(f.value, '42%');
  });

  it('formats CPU temp with same label and degree value', () => {
    const f = formatStatForSlot('cpuTemp', MOCK_STATS);
    assert.equal(f.label, 'CPU');
    assert.equal(f.value, '62°');
    assert.match(f.valueFill, /^#/);
  });

  it('formats GPU temp with label GPU not GPU temp', () => {
    const f = formatStatForSlot('gpuTemp', MOCK_STATS);
    assert.equal(f.label, 'GPU');
    assert.equal(f.value, '58°');
  });

  it('shows em dash when GPU load unavailable', () => {
    const f = formatStatForSlot('gpu', { ...MOCK_STATS, gpuLoadPct: null });
    assert.equal(f.value, '—');
  });

  it('returns null for unknown stat type', () => {
    assert.equal(formatStatForSlot('unknown', MOCK_STATS), null);
  });
});

describe('needsStats', () => {
  it('is true when any slot has a stat key', () => {
    assert.equal(needsStats({ complications: { slots: { '1': 'cpu', '2': null } } }), true);
  });

  it('is false when all slots empty or off', () => {
    assert.equal(needsStats({ complications: { slots: { '1': null, '2': 'off' } } }), false);
    assert.equal(needsStats({ complications: { slots: {} } }), false);
  });
});

describe('isStatTypeKey', () => {
  it('recognizes valid stat keys', () => {
    assert.equal(isStatTypeKey('cpuTemp'), true);
    assert.equal(isStatTypeKey('vram'), true);
    assert.equal(isStatTypeKey('placeholder'), false);
  });
});
