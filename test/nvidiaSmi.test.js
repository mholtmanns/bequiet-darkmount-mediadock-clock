'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { getNvidiaGpuStats } = require('../lib/nvidiaSmi');

describe('getNvidiaGpuStats', () => {
  it('returns nulls when disabled', () => {
    assert.deepEqual(getNvidiaGpuStats(false), {
      gpuTemp: null,
      gpuLoadPct: null,
      gpuMemPct: null,
    });
  });
});
