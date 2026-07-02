'use strict';

// lib/nvidiaSmi.js — optional GPU stats via nvidia-smi CLI

const { execSync } = require('child_process');

function getNvidiaStat(queryKey) {
  try {
    const out = execSync(
      `nvidia-smi --query-gpu=${queryKey} --format=csv,noheader,nounits`,
      { stdio: ['ignore', 'pipe', 'ignore'], timeout: 3000 }
    ).toString().trim();
    const val = parseFloat(out);
    return isNaN(val) ? null : val;
  } catch (_) {
    return null;
  }
}

/**
 * @param {boolean} [enabled=true]
 * @returns {{ gpuTemp: number|null, gpuLoadPct: number|null, gpuMemPct: number|null }}
 */
function getNvidiaGpuStats(enabled = true) {
  if (!enabled) {
    return { gpuTemp: null, gpuLoadPct: null, gpuMemPct: null };
  }
  return {
    gpuTemp:    getNvidiaStat('temperature.gpu'),
    gpuLoadPct: getNvidiaStat('utilization.gpu'),
    gpuMemPct:  getNvidiaStat('utilization.memory'),
  };
}

module.exports = { getNvidiaStat, getNvidiaGpuStats };
