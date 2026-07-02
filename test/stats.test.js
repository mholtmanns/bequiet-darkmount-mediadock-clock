'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  MOCK_STATS,
  parseCpuTemp,
  resolveCpuTemp,
  resolveGpuStats,
  needsCpuTemp,
  needsGpuStats,
  formatStatForSlot,
  needsStats,
  isStatTypeKey,
} = require('../lib/stats');
const { parseVsbToSensors } = require('../lib/hwinfoRegistry');

describe('parseCpuTemp', () => {
  it('returns max of valid readings', () => {
    assert.equal(parseCpuTemp({ main: 45, max: 62, cores: [50, 55] }), 62);
  });

  it('returns null when no valid readings', () => {
    assert.equal(parseCpuTemp({ main: null, max: null, cores: [] }), null);
    assert.equal(parseCpuTemp({ main: -1, max: 0 }), null);
  });
});

describe('needsCpuTemp', () => {
  it('is true when a slot uses cpuTemp', () => {
    assert.equal(needsCpuTemp({ complications: { slots: { '4': 'cpuTemp' } } }), true);
  });

  it('is false when no cpuTemp slot', () => {
    assert.equal(needsCpuTemp({ complications: { slots: { '1': 'cpu' } } }), false);
  });
});

describe('resolveCpuTemp', () => {
  it('uses systeminformation when HWiNFO lookup fails', () => {
    const result = resolveCpuTemp(
      { main: 55, max: 60 },
      {
        complications: { slots: { '4': 'cpuTemp' } },
        hwinfo: { cpuTempIndex: 999999, cpuTempLabel: '__nonexistent__' },
      }
    );
    assert.equal(result, 60);
  });

  it('skips HWiNFO when cpuTemp slot disabled and no index configured', () => {
    const result = resolveCpuTemp(
      { main: 55, max: 60 },
      {
        complications: { slots: { '4': 'cpu' } },
        hwinfo: { cpuTempLabel: 'CPU Package' },
      }
    );
    assert.equal(result, 60);
  });

  it('prefers HWiNFO value from snapshot', () => {
    const snapshot = {
      hive: 'HKCU',
      props: { ValueRaw0: '72', Label0: 'CPU Package' },
      sensors: [{ index: 0, label: 'CPU Package', sensor: 'CPU', valueRaw: '72' }],
    };
    const result = resolveCpuTemp(
      { main: 55, max: 60 },
      { complications: { slots: { '4': 'cpuTemp' } }, hwinfo: { cpuTempIndex: 0 } },
      snapshot
    );
    assert.equal(result, 72);
  });
});

describe('needsGpuStats', () => {
  it('is true when a slot uses gpu, vram, or gpuTemp', () => {
    assert.equal(needsGpuStats({ complications: { slots: { '3': 'gpu' } } }), true);
    assert.equal(needsGpuStats({ complications: { slots: { '2': 'vram' } } }), true);
    assert.equal(needsGpuStats({ complications: { slots: { '1': 'gpuTemp' } } }), true);
  });

  it('is true for stats generator', () => {
    assert.equal(needsGpuStats({ generator: 'stats', complications: { slots: {} } }), true);
  });

  it('is false when no GPU slots and clock generator', () => {
    assert.equal(needsGpuStats({ complications: { slots: { '1': 'cpu' } } }), false);
  });
});

describe('resolveGpuStats', () => {
  const gpuSnapshot = {
    hive: 'HKCU',
    props: {
      ValueRaw1: '58',
      ValueRaw3: '23',
      ValueRaw4: '45',
      Label1: 'GPU Temperature',
      Label3: 'GPU Core Load',
      Label4: 'GPU Memory Usage',
    },
    sensors: parseVsbToSensors({
      ValueRaw1: '58',
      Label1: 'GPU Temperature',
      ValueRaw3: '23',
      Label3: 'GPU Core Load',
      ValueRaw4: '45',
      Label4: 'GPU Memory Usage',
    }),
  };

  it('returns nulls when no GPU stats needed', () => {
    assert.deepEqual(
      resolveGpuStats({ complications: { slots: { '1': 'cpu' } } }, gpuSnapshot),
      { gpuTemp: null, gpuLoadPct: null, gpuMemPct: null }
    );
  });

  it('prefers HWiNFO values from snapshot when nvidia-smi disabled', () => {
    const result = resolveGpuStats({
      complications: { slots: { '3': 'gpu', '4': 'gpuTemp' } },
      nvidiaSmi: { enabled: false },
      hwinfo: { gpuTempIndex: 1, gpuLoadIndex: 3, gpuMemIndex: 4 },
    }, gpuSnapshot);
    assert.deepEqual(result, { gpuTemp: 58, gpuLoadPct: 23, gpuMemPct: 45 });
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
