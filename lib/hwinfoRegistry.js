'use strict';

// lib/hwinfoRegistry.js — read HWiNFO Gadget sensor values from the Windows registry
// HKCU\Software\HWiNFO64\VSB  (or HKLM when HWiNFO runs elevated)

const { execSync } = require('child_process');

const VSB_KEY = 'Software\\HWiNFO64\\VSB';
const HIVE_ROOTS = { HKCU: 'HKCU', HKLM: 'HKLM' };

const DEFAULT_LABELS = {
  cpuTemp: 'CPU Package',
  gpuTemp: 'GPU Temperature',
  gpuLoad: 'GPU Core Load',
  gpuMem:  'GPU Memory Usage',
};

function runPowerShell(script, timeout = 5000) {
  return execSync(
    `powershell -NoProfile -NonInteractive -Command "${script.replace(/"/g, '\\"')}"`,
    { stdio: ['ignore', 'pipe', 'ignore'], timeout }
  ).toString().trim();
}

/**
 * Normalize a HWiNFO ValueRaw reading to integer °C or null.
 */
function parseHwinfoTemp(raw) {
  const val = typeof raw === 'number' ? raw : parseFloat(raw);
  if (raw == null || raw === '' || isNaN(val) || val <= 0) return null;
  return Math.round(val);
}

/**
 * Normalize a HWiNFO ValueRaw reading to integer percent (0–100) or null.
 */
function parseHwinfoPercent(raw) {
  const val = typeof raw === 'number' ? raw : parseFloat(raw);
  if (raw == null || raw === '' || isNaN(val) || val < 0) return null;
  return Math.round(Math.min(100, val));
}

/**
 * Build sensor list from flat VSB property map (ValueRawN, LabelN, SensorN).
 */
function parseVsbToSensors(props) {
  if (!props || typeof props !== 'object') return [];

  const indices = new Set();
  for (const key of Object.keys(props)) {
    const m = /^ValueRaw(\d+)$/.exec(key);
    if (m) indices.add(Number(m[1]));
  }

  return [...indices].sort((a, b) => a - b).map(index => ({
    index,
    sensor: String(props[`Sensor${index}`] ?? ''),
    label: String(props[`Label${index}`] ?? ''),
    valueRaw: props[`ValueRaw${index}`],
  }));
}

function findSensorByLabel(sensors, label) {
  if (!label || !sensors.length) return null;
  const needle = label.trim().toLowerCase();

  const exact = sensors.find(s => s.label.trim().toLowerCase() === needle);
  if (exact) return exact.index;

  const partial = sensors.find(s => s.label.trim().toLowerCase().includes(needle));
  return partial ? partial.index : null;
}

/**
 * Resolve a sensor value: configured index → label match → null.
 */
function resolveSensorValue(props, sensors, { index, label }, parseFn) {
  if (index != null && index !== '') {
    const fromIndex = parseFn(props[`ValueRaw${index}`]);
    if (fromIndex != null) return fromIndex;
  }

  const labelIndex = findSensorByLabel(sensors, label);
  if (labelIndex != null) {
    return parseFn(props[`ValueRaw${labelIndex}`]);
  }

  return null;
}

function hiveHasVsb(hive) {
  if (process.platform !== 'win32') return false;
  try {
    const root = HIVE_ROOTS[hive] ?? 'HKCU';
    const ps = `$null -ne (Get-Item -Path '${root}:\\${VSB_KEY}' -ErrorAction SilentlyContinue)`;
    return runPowerShell(ps) === 'True';
  } catch (_) {
    return false;
  }
}

/**
 * @param {'HKCU'|'HKLM'|'auto'} preferred
 * @returns {'HKCU'|'HKLM'}
 */
function resolveHive(preferred = 'auto') {
  if (preferred === 'HKCU' || preferred === 'HKLM') return preferred;
  if (hiveHasVsb('HKCU')) return 'HKCU';
  if (hiveHasVsb('HKLM')) return 'HKLM';
  return 'HKCU';
}

/**
 * Read all VSB value names from the registry as a plain object.
 * @returns {object|null}
 */
function readVsbProperties(hive = 'HKCU') {
  if (process.platform !== 'win32') return null;

  const root = HIVE_ROOTS[hive] ?? 'HKCU';
  const ps = [
    `$p = Get-ItemProperty -Path '${root}:\\${VSB_KEY}' -ErrorAction SilentlyContinue`,
    'if (-not $p) { Write-Output \'{}\'; exit }',
    '$h = @{}',
    'foreach ($prop in $p.PSObject.Properties) {',
    '  if ($prop.Name -notmatch \'^PS\') { $h[$prop.Name] = [string]$prop.Value }',
    '}',
    '$h | ConvertTo-Json -Compress',
  ].join('; ');

  try {
    const out = runPowerShell(ps);
    if (!out || out === '{}') return null;
    return JSON.parse(out);
  } catch (_) {
    return null;
  }
}

/**
 * Read a single named value from the VSB registry key.
 */
function readVsbValue(hive, valueName) {
  if (process.platform !== 'win32') return null;

  const root = HIVE_ROOTS[hive] ?? 'HKCU';
  const ps = `(Get-ItemProperty -Path '${root}:\\${VSB_KEY}' -ErrorAction SilentlyContinue).${valueName}`;

  try {
    const out = runPowerShell(ps);
    return out === '' ? null : out;
  } catch (_) {
    return null;
  }
}

/**
 * Read the full VSB registry key once for batch sensor resolution.
 * @returns {{ hive: string, props: object, sensors: object[] }|null}
 */
function readVsbSnapshot(hive = 'auto') {
  if (process.platform !== 'win32') return null;

  const resolvedHive = resolveHive(hive);
  const props = readVsbProperties(resolvedHive);
  if (!props) return null;

  return {
    hive: resolvedHive,
    props,
    sensors: parseVsbToSensors(props),
  };
}

function listHwinfoSensors(hive) {
  const snapshot = readVsbSnapshot(hive ?? 'auto');
  return snapshot?.sensors ?? [];
}

/**
 * Read CPU temperature from HWiNFO Gadget registry.
 * @param {object} [hwinfo]
 * @param {object|null} [snapshot] — optional pre-read VSB snapshot
 * @returns {number|null}
 */
function readHwinfoTemp(hwinfo = {}, snapshot = null) {
  if (process.platform !== 'win32') return null;

  const snap = snapshot ?? readVsbSnapshot(hwinfo.hive ?? 'auto');
  if (!snap) return null;

  return resolveSensorValue(
    snap.props,
    snap.sensors,
    {
      index: hwinfo.cpuTempIndex ?? null,
      label: hwinfo.cpuTempLabel ?? DEFAULT_LABELS.cpuTemp,
    },
    parseHwinfoTemp
  );
}

/**
 * Read GPU stats from HWiNFO Gadget registry.
 * @param {object} [hwinfo]
 * @param {object|null} [snapshot] — optional pre-read VSB snapshot
 * @returns {{ gpuTemp: number|null, gpuLoadPct: number|null, gpuMemPct: number|null }}
 */
function readHwinfoGpuStats(hwinfo = {}, snapshot = null) {
  const empty = { gpuTemp: null, gpuLoadPct: null, gpuMemPct: null };
  if (process.platform !== 'win32') return empty;

  const snap = snapshot ?? readVsbSnapshot(hwinfo.hive ?? 'auto');
  if (!snap) return empty;

  const { props, sensors } = snap;
  return {
    gpuTemp: resolveSensorValue(
      props,
      sensors,
      { index: hwinfo.gpuTempIndex ?? null, label: hwinfo.gpuTempLabel ?? DEFAULT_LABELS.gpuTemp },
      parseHwinfoTemp
    ),
    gpuLoadPct: resolveSensorValue(
      props,
      sensors,
      { index: hwinfo.gpuLoadIndex ?? null, label: hwinfo.gpuLoadLabel ?? DEFAULT_LABELS.gpuLoad },
      parseHwinfoPercent
    ),
    gpuMemPct: resolveSensorValue(
      props,
      sensors,
      { index: hwinfo.gpuMemIndex ?? null, label: hwinfo.gpuMemLabel ?? DEFAULT_LABELS.gpuMem },
      parseHwinfoPercent
    ),
  };
}

module.exports = {
  VSB_KEY,
  DEFAULT_LABELS,
  parseHwinfoTemp,
  parseHwinfoPercent,
  parseVsbToSensors,
  findSensorByLabel,
  resolveSensorValue,
  resolveHive,
  hiveHasVsb,
  readVsbProperties,
  readVsbValue,
  readVsbSnapshot,
  listHwinfoSensors,
  readHwinfoTemp,
  readHwinfoGpuStats,
};
