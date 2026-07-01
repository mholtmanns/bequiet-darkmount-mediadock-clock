'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { buildClockSvg } = require('../generate_clock');
const { writeClockPng } = require('../lib/clockOutput');
const { W, H } = require('../lib/layout');

describe('writeClockPng', () => {
  it('writes PNG at 640×480', async () => {
    const outPath = path.join(os.tmpdir(), `clock-pad-test-${Date.now()}.png`);
    const svg = buildClockSvg(new Date('2026-01-15T10:10:00'), {});

    try {
      await writeClockPng(svg, outPath);
      const sharp = require('sharp');
      const meta = await sharp(outPath).metadata();
      assert.equal(meta.width, W);
      assert.equal(meta.height, H);
    } finally {
      fs.rmSync(outPath, { force: true });
    }
  });
});
