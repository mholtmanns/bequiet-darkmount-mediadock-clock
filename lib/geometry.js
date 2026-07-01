'use strict';

// lib/geometry.js — rotation and radial helpers for the analog clock SVG
// All angles: 0° = 12 o'clock, positive = clockwise (SVG convention).

/**
 * Apply a clockwise rotation of `angleDeg` to a list of local [x, y] points,
 * then translate to absolute position (cx, cy).
 * Local y-axis: negative = toward 12 o'clock.
 */
function rotateAndTranslate(points, angleDeg, cx, cy) {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return points.map(([lx, ly]) => [
    (cx + lx * cos - ly * sin).toFixed(2),
    (cy + lx * sin + ly * cos).toFixed(2),
  ]);
}

/**
 * SVG <polygon> for a rectangle in local coords:
 *   x ∈ [-w/2, w/2], y ∈ [yNear, yFar]  (negative y = toward 12)
 * Rotated by angleDeg and centred on (cx, cy).
 */
function rotatedRect(cx, cy, angleDeg, w, yNear, yFar, fill) {
  const corners = rotateAndTranslate(
    [[-w / 2, yNear], [w / 2, yNear], [w / 2, yFar], [-w / 2, yFar]],
    angleDeg, cx, cy
  );
  return `<polygon points="${corners.map(c => c.join(',')).join(' ')}" fill="${fill}"/>`;
}

/**
 * Absolute (x, y) of the point that lies `dist` px from (cx, cy)
 * in the direction of `angleDeg` (0 = up, 90 = right).
 */
function radialPoint(cx, cy, angleDeg, dist) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: (cx + Math.sin(rad) * dist).toFixed(2),
    y: (cy - Math.cos(rad) * dist).toFixed(2),
  };
}

module.exports = { rotateAndTranslate, rotatedRect, radialPoint };
