#!/usr/bin/env node
'use strict';

// scripts/list-hwinfo-sensors.js — list HWiNFO Gadget registry sensors for config setup

const { listHwinfoSensors, resolveHive } = require('../lib/hwinfoRegistry');

function main() {
  if (process.platform !== 'win32') {
    console.error('HWiNFO registry sensors are only available on Windows.');
    process.exit(1);
  }

  const hive = resolveHive('auto');
  const sensors = listHwinfoSensors(hive);

  if (!sensors.length) {
    console.log('No HWiNFO Gadget sensors found.');
    console.log('');
    console.log('Ensure HWiNFO is running, then in Configure Sensors → HWiNFO Gadget:');
    console.log('  1. Enable "Enable reporting to Gadget"');
    console.log('  2. Tick "Report value in Gadget" for each sensor you want');
    console.log('');
    console.log(`Checked hive: ${hive}\\Software\\HWiNFO64\\VSB`);
    process.exit(1);
  }

  console.log(`HWiNFO Gadget sensors (${hive}\\Software\\HWiNFO64\\VSB)\n`);
  console.log('Index | ValueRaw | Label | Sensor');
  console.log('------+----------+-------+-------');

  for (const s of sensors) {
    const index = String(s.index).padStart(5);
    const raw = String(s.valueRaw ?? '').padStart(8);
    const label = s.label.slice(0, 40);
    const sensor = s.sensor.slice(0, 40);
    console.log(`${index} | ${raw} | ${label} | ${sensor}`);
  }

  console.log('');
  console.log('Config keys (set Index or rely on default Label):');
  console.log('  CPU temp:  hwinfo.cpuTempIndex  /  hwinfo.cpuTempLabel  (default: CPU Package)');
  console.log('  GPU temp:  hwinfo.gpuTempIndex  /  hwinfo.gpuTempLabel  (default: GPU Temperature)');
  console.log('  GPU load:  hwinfo.gpuLoadIndex  /  hwinfo.gpuLoadLabel  (default: GPU Core Load)');
  console.log('  GPU VRAM:  hwinfo.gpuMemIndex   /  hwinfo.gpuMemLabel   (default: GPU Memory Usage)');
  console.log('');
  console.log('Set nvidiaSmi.enabled to false in config.json to skip nvidia-smi fallback.');
}

main();
