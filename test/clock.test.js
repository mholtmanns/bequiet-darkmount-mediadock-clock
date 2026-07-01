'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { buildClockSvg } = require('../generate_clock');
const { DEFAULTS } = require('../lib/config');
const { MOCK_STATS } = require('../lib/stats');

const TIME_10_10 = new Date('2026-01-15T10:10:00');

describe('buildClockSvg', () => {
  it('produces valid SVG with clock face dimensions', () => {
    const svg = buildClockSvg(TIME_10_10, {});
    assert.match(svg, /^<svg width="640" height="480"/);
    assert.match(svg, /viewBox="0 0 640 480"/);
    assert.match(svg, /cy="240" r="240"/);
  });

  it('includes tick marks and centre hub', () => {
    const svg = buildClockSvg(TIME_10_10, {});
    assert.match(svg, /<polygon/);
    assert.match(svg, /Centre hub/);
  });

  it('includes stat complications when config and stats provided', () => {
    const svg = buildClockSvg(TIME_10_10, { complications: DEFAULTS.complications }, MOCK_STATS);
    assert.match(svg, />CPU</);
    assert.match(svg, />42%</);
    assert.match(svg, />Jan 15</);
    assert.match(svg, />Thu</);
  });

  it('excludes complications when all slots and dates disabled', () => {
    const svg = buildClockSvg(TIME_10_10, {
      complications: {
        slots: { '1': null, '2': null, '3': null, '4': null },
        dayOfWeek: false,
        date: false,
      },
    }, MOCK_STATS);
    assert.doesNotMatch(svg, /width="155" height="100"/);
    assert.doesNotMatch(svg, />Thu</);
  });

  it('renders symmetric hands at 10:10', () => {
    const svg = buildClockSvg(TIME_10_10, { complications: { slots: {} } });
    const polygonCount = (svg.match(/<polygon/g) || []).length;
    assert.ok(polygonCount >= 62, `expected tick marks + hands, got ${polygonCount} polygons`);
  });
});
