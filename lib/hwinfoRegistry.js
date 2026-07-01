'use strict';

// lib/hwinfoRegistry.js — read HWiNFO Gadget sensor values from the Windows registry
// HKCU\Software\HWiNFO64\VSB  (or HKLM when HWiNFO runs elevated)

const { execSync } = require('child_process');

const VSB_KEY = 'Software\\HWiNFO64\\VSB';
const HIVE_ROOTS = { HKCU: 'HKCU', HKLM: 'HKLM' };

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

function listHwinfoSensors(hive) {
  const resolved = resolveHive(hive ?? 'auto');
  const props = readVsbProperties(resolved);
  if (!props) return [];
  return parseVsbToSensors(props);
}

/**
 * Read CPU (or other) temperature from HWiNFO Gadget registry.
 * Resolution order: configured index → label match → null.
 *
 * @param {{ cpuTempIndex?: number|null, cpuTempLabel?: string, hive?: string }} options
 * @returns {number|null}
 */
function readHwinfoTemp({ cpuTempIndex = null, cpuTempLabel = 'CPU Package', hive = 'auto' } = {}) {
  if (process.platform !== 'win32') return null;

  const resolvedHive = resolveHive(hive);
  const props = readVsbProperties(resolvedHive);
  if (!props) return null;

  const sensors = parseVsbToSensors(props);

  if (cpuTempIndex != null && cpuTempIndex !== '') {
    const fromIndex = parseHwinfoTemp(props[`ValueRaw${cpuTempIndex}`]);
    if (fromIndex != null) return fromIndex;
  }

  const labelIndex = findSensorByLabel(sensors, cpuTempLabel);
  if (labelIndex != null) {
    return parseHwinfoTemp(props[`ValueRaw${labelIndex}`]);
  }

  return null;
}

module.exports = {
  VSB_KEY,
  parseHwinfoTemp,
  parseVsbToSensors,
  findSensorByLabel,
  resolveHive,
  hiveHasVsb,
  readVsbProperties,
  readVsbValue,
  listHwinfoSensors,
  readHwinfoTemp,
};
