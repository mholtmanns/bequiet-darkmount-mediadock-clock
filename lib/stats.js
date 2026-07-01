'use strict';

// lib/stats.js — system stat collection and formatting for complications + stats template

const si = require('systeminformation');
const { execSync } = require('child_process');
const { readHwinfoTemp } = require('./hwinfoRegistry');

const MOCK_STATS = {
  cpuPct: 42,
  ramPct: 67,
  ramUsedGB: '10.7',
  ramTotGB: '16',
  gpuLoadPct: 23,
  gpuMemPct: 45,
  gpuTemp: 58,
  cpuTemp: 62,
};

const STAT_TYPE_KEYS = ['cpu', 'cpuTemp', 'ram', 'gpu', 'vram', 'gpuTemp'];

const UNAVAILABLE = '—';
const DEFAULT_VALUE_FILL = '#f5f0e8';  // matches C_FACE

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

// Uses Windows DXGI/WDDM GPU Engine counters — matches Task Manager exactly.
function getWindowsGpuPct() {
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

/**
 * Normalize systeminformation cpuTemperature() result to integer °C or null.
 * Prefers the hottest valid reading (max, main, or per-core).
 */
function parseCpuTemp({ main, max, cores } = {}) {
  const candidates = [max, main, ...(cores ?? [])].filter(
    t => t != null && t > 0 && !isNaN(t)
  );
  return candidates.length ? Math.round(Math.max(...candidates)) : null;
}

function needsCpuTemp(config = {}) {
  const slots = config.complications?.slots ?? {};
  return Object.values(slots).some(v => isSlotEnabled(v) && v === 'cpuTemp');
}

function resolveCpuTemp(cpuTempRaw, config = {}) {
  let cpuTemp = parseCpuTemp(cpuTempRaw);

  if (process.platform === 'win32' && (needsCpuTemp(config) || config.hwinfo?.cpuTempIndex != null)) {
    const hwTemp = readHwinfoTemp(config.hwinfo ?? {});
    if (hwTemp != null) cpuTemp = hwTemp;
  }

  return cpuTemp;
}

async function getStats(config = {}) {
  const [load, mem, cpuTempRaw] = await Promise.all([
    si.currentLoad(),
    si.mem(),
    si.cpuTemperature(),
  ]);

  const gpuTemp    = getNvidiaStat('temperature.gpu');
  const gpuLoadPct = getWindowsGpuPct();
  const gpuMemPct  = getNvidiaStat('utilization.memory');

  return {
    cpuPct:    Math.round(load.currentLoad),
    ramPct:    Math.round(mem.used / mem.total * 100),
    ramUsedGB: (mem.used / 1073741824).toFixed(1),
    ramTotGB:  (mem.total / 1073741824).toFixed(0),
    gpuTemp,
    gpuLoadPct,
    gpuMemPct,
    cpuTemp:   resolveCpuTemp(cpuTempRaw, config),
  };
}

function tempColor(c) {
  if (c === null) return '#555560';
  if (c >= 85) return '#ff4040';
  if (c >= 70) return '#ffb030';
  return '#40c840';
}

function formatPct(n) {
  return n == null ? UNAVAILABLE : `${Math.round(n)}%`;
}

function formatTemp(n) {
  return n == null ? UNAVAILABLE : `${Math.round(n)}°`;
}

/**
 * Format a stat for corner complication display.
 * @returns {{ label: string, value: string, valueFill: string }}
 */
function formatStatForSlot(type, stats) {
  switch (type) {
    case 'cpu':
      return { label: 'CPU', value: formatPct(stats.cpuPct), valueFill: DEFAULT_VALUE_FILL };
    case 'cpuTemp':
      return {
        label: 'CPU',
        value: formatTemp(stats.cpuTemp),
        valueFill: stats.cpuTemp == null ? DEFAULT_VALUE_FILL : tempColor(stats.cpuTemp),
      };
    case 'ram':
      return { label: 'RAM', value: formatPct(stats.ramPct), valueFill: DEFAULT_VALUE_FILL };
    case 'gpu':
      return { label: 'GPU', value: formatPct(stats.gpuLoadPct), valueFill: DEFAULT_VALUE_FILL };
    case 'vram':
      return { label: 'VRAM', value: formatPct(stats.gpuMemPct), valueFill: DEFAULT_VALUE_FILL };
    case 'gpuTemp':
      return {
        label: 'GPU',
        value: formatTemp(stats.gpuTemp),
        valueFill: stats.gpuTemp == null ? DEFAULT_VALUE_FILL : tempColor(stats.gpuTemp),
      };
    default:
      return null;
  }
}

function isStatTypeKey(value) {
  return typeof value === 'string' && STAT_TYPE_KEYS.includes(value);
}

function isSlotEnabled(value) {
  return value != null && value !== 'off' && value !== false;
}

function needsStats(config = {}) {
  const slots = config.complications?.slots ?? {};
  return Object.values(slots).some(v => isSlotEnabled(v) && isStatTypeKey(v));
}

module.exports = {
  MOCK_STATS,
  STAT_TYPE_KEYS,
  getNvidiaStat,
  getWindowsGpuPct,
  parseCpuTemp,
  resolveCpuTemp,
  needsCpuTemp,
  getStats,
  tempColor,
  formatStatForSlot,
  isStatTypeKey,
  isSlotEnabled,
  needsStats,
};
