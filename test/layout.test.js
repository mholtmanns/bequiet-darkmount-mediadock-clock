'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { W, H, resolveLayout } = require('../lib/layout');

describe('resolveLayout', () => {
  it('matches full-canvas layout with zero padding', () => {
    const layout = resolveLayout();
    assert.equal(layout.CX, W / 2);
    assert.equal(layout.CY, H / 2);
    assert.equal(layout.R, H / 2);
    assert.equal(layout.CORNER_SLOTS.cornerBottomLeft.y, H - 100);
  });

  it('shrinks face and shifts centre with bottom padding', () => {
    const layout = resolveLayout({ bottom: 20 });
    assert.equal(layout.CY, (H - 20) / 2);
    assert.equal(layout.R, (H - 20) / 2);
    assert.equal(layout.CORNER_SLOTS.cornerBottomLeft.y, H - 20 - 100);
  });

  it('insets corners on all sides', () => {
    const layout = resolveLayout({ top: 10, right: 15, bottom: 20, left: 5 });
    assert.equal(layout.CORNER_SLOTS.cornerTopLeft.x, 5);
    assert.equal(layout.CORNER_SLOTS.cornerTopLeft.y, 10);
    assert.equal(layout.CORNER_SLOTS.cornerTopRight.x, W - 15 - 155);
    assert.equal(layout.CORNER_SLOTS.cornerBottomRight.y, H - 20 - 100);
  });
});
