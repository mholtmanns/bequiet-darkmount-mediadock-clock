'use strict';

// lib/clockOutput.js — rasterize clock SVG to 640×480 dock PNG

const { W, H } = require('./layout');

async function writeClockPng(svg, outPath) {
  const sharp = require('sharp');
  await sharp(Buffer.from(svg))
    .resize(W, H)
    .png()
    .toFile(outPath);
}

module.exports = { writeClockPng };
