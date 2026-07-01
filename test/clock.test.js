'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { buildClockSvg } = require('../generate_clock');
const { DEFAULTS } = require('../lib/config');

const TIME_10_10 = new Date('2026-01-15T10:10:00');

describe('buildClockSvg', () => {
  it('produces valid SVG with clock face dimensions', () => {
    const svg = buildClockSvg(TIME_10_10, {});
    assert.match(svg, /^<svg width="640" height="512"/);
    assert.match(svg, /viewBox="0 0 640 512"/);
  });

  it('includes tick marks and centre hub', () => {
    const svg = buildClockSvg(TIME_10_10, {});
    assert.match(svg, /<polygon/);
    assert.match(svg, /Centre hub/);
  });

  it('includes complications when config enables them', () => {
    const svg = buildClockSvg(TIME_10_10, { complications: DEFAULTS.complications });
    assert.match(svg, />1</);
    assert.match(svg, />Jan 15</);
    assert.match(svg, />Thu</);
  });

  it('excludes complications when all disabled', () => {
    const svg = buildClockSvg(TIME_10_10, {
      complications: {
        cornerTopLeft: false,
        cornerTopRight: false,
        cornerBottomLeft: false,
        cornerBottomRight: false,
        dayOfWeek: false,
        date: false,
      },
    });
    assert.doesNotMatch(svg, /width="155" height="100"/);
    assert.doesNotMatch(svg, />Thursday</);
  });

  it('renders symmetric hands at 10:10', () => {
    const svg = buildClockSvg(TIME_10_10, { complications: {} });
    // Both hands present
    const polygonCount = (svg.match(/<polygon/g) || []).length;
    assert.ok(polygonCount >= 62, `expected tick marks + hands, got ${polygonCount} polygons`);
  });
});
