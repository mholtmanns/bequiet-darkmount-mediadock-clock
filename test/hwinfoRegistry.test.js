'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  parseHwinfoTemp,
  parseVsbToSensors,
  findSensorByLabel,
} = require('../lib/hwinfoRegistry');

describe('parseHwinfoTemp', () => {
  it('rounds valid positive numbers', () => {
    assert.equal(parseHwinfoTemp(62.4), 62);
    assert.equal(parseHwinfoTemp('55.8'), 56);
  });

  it('returns null for invalid readings', () => {
    assert.equal(parseHwinfoTemp(null), null);
    assert.equal(parseHwinfoTemp(''), null);
    assert.equal(parseHwinfoTemp(0), null);
    assert.equal(parseHwinfoTemp(-3), null);
    assert.equal(parseHwinfoTemp('n/a'), null);
  });
});

describe('parseVsbToSensors', () => {
  it('extracts indexed sensors from flat property map', () => {
    const sensors = parseVsbToSensors({
      Sensor0: 'CPU [#0]',
      Label0: 'CPU Package',
      ValueRaw0: '62.5',
      Value0: '62.5 °C',
      Sensor1: 'GPU [#0]',
      Label1: 'GPU Temperature',
      ValueRaw1: '48',
    });

    assert.equal(sensors.length, 2);
    assert.deepEqual(sensors[0], {
      index: 0,
      sensor: 'CPU [#0]',
      label: 'CPU Package',
      valueRaw: '62.5',
    });
    assert.equal(sensors[1].index, 1);
  });

  it('returns empty array for missing props', () => {
    assert.deepEqual(parseVsbToSensors(null), []);
    assert.deepEqual(parseVsbToSensors({}), []);
  });
});

describe('findSensorByLabel', () => {
  const sensors = [
    { index: 0, label: 'CPU Package', sensor: 'CPU', valueRaw: 60 },
    { index: 5, label: 'Core 0 Temperature', sensor: 'CPU', valueRaw: 55 },
  ];

  it('matches label case-insensitively', () => {
    assert.equal(findSensorByLabel(sensors, 'cpu package'), 0);
  });

  it('falls back to partial label match', () => {
    assert.equal(findSensorByLabel(sensors, 'Core 0'), 5);
  });

  it('returns null when no match', () => {
    assert.equal(findSensorByLabel(sensors, 'GPU Temperature'), null);
    assert.equal(findSensorByLabel([], 'CPU Package'), null);
  });
});
