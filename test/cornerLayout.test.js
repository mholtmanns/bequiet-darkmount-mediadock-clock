'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  computeCornerTextYs,
  CORNER_TEXT_GAP,
  CORNER_TEXT_TOP_INSET,
  CORNER_H,
} = require('../lib/layout');

describe('computeCornerTextYs', () => {
  it('places label and value with CORNER_TEXT_GAP between them', () => {
    const labelSize = 28;
    const valueSize = 48;
    const { labelY, valueY } = computeCornerTextYs(0, CORNER_H, labelSize, valueSize);

    const labelBottom = labelY + labelSize / 2;
    const valueTop = valueY - valueSize / 2;
    assert.equal(valueTop - labelBottom, CORNER_TEXT_GAP);
  });

  it('anchors label CORNER_TEXT_TOP_INSET below slot top', () => {
    const labelSize = 28;
    const { labelY } = computeCornerTextYs(0, CORNER_H, labelSize, 48);

    assert.equal(labelY - labelSize / 2, CORNER_TEXT_TOP_INSET);
  });

  it('works with default font sizes (20 / 40)', () => {
    const labelSize = 20;
    const valueSize = 40;
    const { labelY, valueY } = computeCornerTextYs(0, CORNER_H, labelSize, valueSize);
    assert.equal(labelY - labelSize / 2, CORNER_TEXT_TOP_INSET);
    assert.equal(valueY - valueSize / 2 - (labelY + labelSize / 2), CORNER_TEXT_GAP);
  });
});
