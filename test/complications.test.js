'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { buildComplicationsSvg } = require('../lib/complications');
const { CORNER_SLOTS, DATE_SLOTS, CX, CY, R } = require('../lib/layout');

const FIXED_DATE = new Date('2026-06-28T10:30:00');

function config(complications, fonts) {
  return { complications, fonts };
}

describe('buildComplicationsSvg', () => {
  it('renders all four corner rects at expected positions', () => {
    const svg = buildComplicationsSvg(FIXED_DATE, config({
      cornerTopLeft: true,
      cornerTopRight: true,
      cornerBottomLeft: true,
      cornerBottomRight: true,
      dayOfWeek: false,
      date: false,
    }));

    assert.match(svg, new RegExp(`x="${CORNER_SLOTS.cornerTopLeft.x}" y="${CORNER_SLOTS.cornerTopLeft.y}" width="155" height="100"`));
    assert.match(svg, new RegExp(`x="${CORNER_SLOTS.cornerTopRight.x}" y="${CORNER_SLOTS.cornerTopRight.y}" width="155" height="100"`));
    assert.match(svg, new RegExp(`x="${CORNER_SLOTS.cornerBottomLeft.x}" y="${CORNER_SLOTS.cornerBottomLeft.y}" width="155" height="100"`));
    assert.match(svg, new RegExp(`x="${CORNER_SLOTS.cornerBottomRight.x}" y="${CORNER_SLOTS.cornerBottomRight.y}" width="155" height="100"`));
  });

  it('shows placeholder numbers 1–4 in corners', () => {
    const svg = buildComplicationsSvg(FIXED_DATE, config({
      cornerTopLeft: true,
      cornerTopRight: true,
      cornerBottomLeft: true,
      cornerBottomRight: true,
      dayOfWeek: false,
      date: false,
    }));

    assert.match(svg, />1</);
    assert.match(svg, />2</);
    assert.match(svg, />3</);
    assert.match(svg, />4</);
  });

  it('omits disabled corners', () => {
    const svg = buildComplicationsSvg(FIXED_DATE, config({
      cornerTopLeft: true,
      cornerTopRight: false,
      cornerBottomLeft: false,
      cornerBottomRight: true,
      dayOfWeek: false,
      date: false,
    }));

    assert.match(svg, />1</);
    assert.match(svg, />4</);
    assert.doesNotMatch(svg, />2</);
    assert.doesNotMatch(svg, />3</);
  });

  it('renders day of week at CY - R/2', () => {
    const svg = buildComplicationsSvg(FIXED_DATE, config({
      cornerTopLeft: false,
      cornerTopRight: false,
      cornerBottomLeft: false,
      cornerBottomRight: false,
      dayOfWeek: true,
      date: false,
    }));

    assert.match(svg, new RegExp(`x="${DATE_SLOTS.dayOfWeek.x}" y="${DATE_SLOTS.dayOfWeek.y}"`));
    assert.match(svg, />Sun</);
  });

  it('renders abbreviated date at CY + R/2', () => {
    const svg = buildComplicationsSvg(FIXED_DATE, config({
      cornerTopLeft: false,
      cornerTopRight: false,
      cornerBottomLeft: false,
      cornerBottomRight: false,
      dayOfWeek: false,
      date: true,
    }));

    assert.match(svg, new RegExp(`x="${DATE_SLOTS.date.x}" y="${DATE_SLOTS.date.y}"`));
    assert.match(svg, />Jun 28</);
  });

  it('omits date text when disabled', () => {
    const svg = buildComplicationsSvg(FIXED_DATE, config({
      dayOfWeek: false,
      date: false,
    }));
    assert.doesNotMatch(svg, />Jun 28</);
    assert.doesNotMatch(svg, />Sun</);
  });

  it('uses font family and weight from config.fonts', () => {
    const svg = buildComplicationsSvg(FIXED_DATE, config(
      { dayOfWeek: true, date: false },
      {
        complication: 'Roboto, sans-serif',
        weights: { semibold: '500', bold: '800' },
      }
    ));

    assert.match(svg, /font-family="Roboto, sans-serif"/);
    assert.match(svg, /font-weight="500"/);
  });

  it('uses font size from config.fonts.sizes', () => {
    const svg = buildComplicationsSvg(FIXED_DATE, config(
      { dayOfWeek: true, date: false },
      { sizes: { complicationDate: 32 } }
    ));

    assert.match(svg, /font-size="32"/);
  });

  it('date slot y positions are half radius from center', () => {
    assert.equal(DATE_SLOTS.dayOfWeek.y, CY - R / 2);
    assert.equal(DATE_SLOTS.date.y, CY + R / 2);
  });
});
