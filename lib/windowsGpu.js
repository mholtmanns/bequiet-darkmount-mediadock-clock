'use strict';

// lib/windowsGpu.js — GPU load % via Windows DXGI/WDDM performance counters

const { execSync } = require('child_process');

/** Matches Task Manager GPU utilization (sum of GPU Engine counters). */
function getWindowsGpuPct() {
  if (process.platform !== 'win32') return null;
  try {
    const ps = `$s=(Get-Counter '\\GPU Engine(*)\\Utilization Percentage' -ErrorAction Stop).CounterSamples;[Math]::Round([Math]::Min(100,($s|Measure-Object -Property CookedValue -Sum).Sum))`;
    const out = execSync(`powershell -NoProfile -NonInteractive -Command "${ps}"`, {
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 6000,
    }).toString().trim();
    const val = parseFloat(out);
    return isNaN(val) ? null : val;
  } catch (_) {
    return null;
  }
}

module.exports = { getWindowsGpuPct };
