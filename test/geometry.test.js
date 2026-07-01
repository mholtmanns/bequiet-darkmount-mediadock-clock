'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { radialPoint } = require('../lib/geometry');
const { CX, CY, R } = require('../lib/layout');

describe('radialPoint', () => {
  it('returns point half radius above center at 0 degrees', () => {
    const pt = radialPoint(CX, CY, 0, R / 2);
    assert.equal(pt.x, CX.toFixed(2));
    assert.equal(pt.y, (CY - R / 2).toFixed(2));
  });

  it('returns point half radius below center at 180 degrees', () => {
    const pt = radialPoint(CX, CY, 180, R / 2);
    assert.equal(pt.x, CX.toFixed(2));
    assert.equal(pt.y, (CY + R / 2).toFixed(2));
  });

  it('returns point to the right at 90 degrees', () => {
    const pt = radialPoint(CX, CY, 90, 100);
    assert.equal(pt.x, (CX + 100).toFixed(2));
    assert.equal(pt.y, CY.toFixed(2));
  });
});
