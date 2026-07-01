'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { buildComplicationsSvg } = require('../lib/complications');
const { MOCK_STATS } = require('../lib/stats');
const { CORNER_SLOTS, DATE_SLOTS, CX, CY, R } = require('../lib/layout');
const { DEFAULTS } = require('../lib/config');

const FIXED_DATE = new Date('2026-06-28T10:30:00');

function config(overrides = {}) {
  return {
    complications: {
      ...DEFAULTS.complications,
      ...overrides,
    },
    fonts: DEFAULTS.fonts,
  };
}

describe('buildComplicationsSvg', () => {
  it('renders corner stat text centered in each slot region', () => {
    const svg = buildComplicationsSvg(FIXED_DATE, config(), MOCK_STATS);
    const tlCx = CORNER_SLOTS.cornerTopLeft.x + CORNER_SLOTS.cornerTopLeft.w / 2;

    assert.doesNotMatch(svg, /width="155" height="100"/);
    assert.match(svg, new RegExp(`x="${tlCx}"[^>]*>CPU</`));
  });

  it('shows CPU load in slot 1 and RAM in slot 2', () => {
    const svg = buildComplicationsSvg(FIXED_DATE, config(), MOCK_STATS);
    assert.match(svg, />CPU</);
    assert.match(svg, />42%</);
    assert.match(svg, />RAM</);
    assert.match(svg, />67%</);
  });

  it('shows GPU temp with label GPU and degree value in slot 4', () => {
    const svg = buildComplicationsSvg(FIXED_DATE, config({
      slots: { '1': null, '2': null, '3': null, '4': 'gpuTemp' },
    }), MOCK_STATS);
    assert.match(svg, />GPU</);
    assert.match(svg, />58°</);
    assert.doesNotMatch(svg, />42%</);
  });

  it('omits disabled slots', () => {
    const svg = buildComplicationsSvg(FIXED_DATE, config({
      slots: { '1': 'cpu', '2': null, '3': null, '4': null },
    }), MOCK_STATS);
    assert.match(svg, />42%</);
    assert.doesNotMatch(svg, />67%</);
    assert.doesNotMatch(svg, />58°</);
  });

  it('renders day of week at CY - R/2', () => {
    const svg = buildComplicationsSvg(FIXED_DATE, config({
      slots: { '1': null, '2': null, '3': null, '4': null },
      dayOfWeek: true,
      date: false,
    }), MOCK_STATS);

    assert.match(svg, new RegExp(`x="${DATE_SLOTS.dayOfWeek.x}" y="${DATE_SLOTS.dayOfWeek.y}"`));
    assert.match(svg, />Sun</);
  });

  it('renders abbreviated date at CY + R/2', () => {
    const svg = buildComplicationsSvg(FIXED_DATE, config({
      slots: { '1': null, '2': null, '3': null, '4': null },
      dayOfWeek: false,
      date: true,
    }), MOCK_STATS);

    assert.match(svg, new RegExp(`x="${DATE_SLOTS.date.x}" y="${DATE_SLOTS.date.y}"`));
    assert.match(svg, />Jun 28</);
  });

  it('uses visible label color on clock face', () => {
    const svg = buildComplicationsSvg(FIXED_DATE, config(), MOCK_STATS);
    assert.match(svg, /fill="#b0b0b8">CPU</);
    assert.doesNotMatch(svg, /fill="#111111">CPU</);
  });

  it('uses font family and size-aware layout from config.fonts', () => {
    const svg = buildComplicationsSvg(FIXED_DATE, {
      complications: { slots: { '1': 'cpu' }, dayOfWeek: false, date: false },
      fonts: {
        complication: 'Roboto, sans-serif',
        weights: { semibold: '500', bold: '800' },
        sizes: { complicationCorner: 48, complicationCornerLabel: 28 },
      },
    }, MOCK_STATS);

    assert.match(svg, /font-family="Roboto, sans-serif"/);
    assert.match(svg, /y="26"[^>]*font-size="28"[^>]*>CPU</);
    assert.match(svg, /y="76"[^>]*font-size="48"[^>]*>42%</);
  });

  it('date slot y positions are half radius from center', () => {
    assert.equal(DATE_SLOTS.dayOfWeek.y, CY - R / 2);
    assert.equal(DATE_SLOTS.date.y, CY + R / 2);
  });
});
