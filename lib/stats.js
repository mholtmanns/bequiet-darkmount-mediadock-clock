'use strict';

// lib/stats.js — system stat collection and formatting for complications + stats template

const si = require('systeminformation');
const { readVsbSnapshot, readHwinfoTemp, readHwinfoGpuStats } = require('./hwinfoRegistry');
const { getNvidiaGpuStats } = require('./nvidiaSmi');
const { getWindowsGpuPct } = require('./windowsGpu');

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
const GPU_SLOT_KEYS = ['gpu', 'vram', 'gpuTemp'];

const UNAVAILABLE = '—';
const DEFAULT_VALUE_FILL = '#f5f0e8';  // matches C_FACE

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

function isSlotEnabled(value) {
  return value != null && value !== 'off' && value !== false;
}

function needsCpuTemp(config = {}) {
  const slots = config.complications?.slots ?? {};
  return Object.values(slots).some(v => isSlotEnabled(v) && v === 'cpuTemp');
}

function needsGpuStats(config = {}) {
  if (config.generator === 'stats') return true;
  const slots = config.complications?.slots ?? {};
  return Object.values(slots).some(v => isSlotEnabled(v) && GPU_SLOT_KEYS.includes(v));
}

function hasHwinfoIndex(config = {}) {
  const hw = config.hwinfo ?? {};
  return hw.cpuTempIndex != null
    || hw.gpuTempIndex != null
    || hw.gpuLoadIndex != null
    || hw.gpuMemIndex != null;
}

function needsHwinfo(config = {}) {
  if (process.platform !== 'win32') return false;
  return needsCpuTemp(config) || needsGpuStats(config) || hasHwinfoIndex(config);
}

function resolveCpuTemp(cpuTempRaw, config = {}, snapshot = null) {
  let cpuTemp = parseCpuTemp(cpuTempRaw);

  if (process.platform === 'win32' && (needsCpuTemp(config) || config.hwinfo?.cpuTempIndex != null)) {
    const hwTemp = readHwinfoTemp(config.hwinfo ?? {}, snapshot);
    if (hwTemp != null) cpuTemp = hwTemp;
  }

  return cpuTemp;
}

function resolveGpuStats(config = {}, snapshot = null) {
  const empty = { gpuTemp: null, gpuLoadPct: null, gpuMemPct: null };
  if (!needsGpuStats(config)) return empty;

  const hw = readHwinfoGpuStats(config.hwinfo ?? {}, snapshot);
  const nvidiaEnabled = config.nvidiaSmi?.enabled !== false;
  const nvidia = getNvidiaGpuStats(nvidiaEnabled);

  return {
    gpuTemp:    hw.gpuTemp    ?? nvidia.gpuTemp    ?? null,
    gpuLoadPct: hw.gpuLoadPct ?? getWindowsGpuPct() ?? nvidia.gpuLoadPct ?? null,
    gpuMemPct:  hw.gpuMemPct  ?? nvidia.gpuMemPct  ?? null,
  };
}

async function getStats(config = {}) {
  const [load, mem, cpuTempRaw] = await Promise.all([
    si.currentLoad(),
    si.mem(),
    si.cpuTemperature(),
  ]);

  const snapshot = needsHwinfo(config)
    ? readVsbSnapshot(config.hwinfo?.hive ?? 'auto')
    : null;

  const gpu = resolveGpuStats(config, snapshot);

  return {
    cpuPct:    Math.round(load.currentLoad),
    ramPct:    Math.round(mem.used / mem.total * 100),
    ramUsedGB: (mem.used / 1073741824).toFixed(1),
    ramTotGB:  (mem.total / 1073741824).toFixed(0),
    ...gpu,
    cpuTemp: resolveCpuTemp(cpuTempRaw, config, snapshot),
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

function needsStats(config = {}) {
  const slots = config.complications?.slots ?? {};
  return Object.values(slots).some(v => isSlotEnabled(v) && isStatTypeKey(v));
}

module.exports = {
  MOCK_STATS,
  STAT_TYPE_KEYS,
  parseCpuTemp,
  resolveCpuTemp,
  resolveGpuStats,
  needsCpuTemp,
  needsGpuStats,
  needsHwinfo,
  getStats,
  tempColor,
  formatStatForSlot,
  isStatTypeKey,
  isSlotEnabled,
  needsStats,
};
