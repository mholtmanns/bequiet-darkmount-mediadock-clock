# Idle Images for be Quiet! Media Dock

## The Plan
Replace the `generate.js` script with different templates to display user designed image content. Start things off with a simple analog clock updating every minute.

## Configuration

Copy `config.example.json` to `config.json` and edit as needed:

```json
{
  "generator": "clock",
  "intervalMs": 30000,
  "complications": {
    "slots": {
      "1": "cpu",
      "2": "ram",
      "3": "gpu",
      "4": "cpuTemp"
    },
    "dayOfWeek": true,
    "date": true
  }
}
```

| Parameter | Values | Description |
|-----------|--------|-------------|
| `generator` | `"clock"` \| `"stats"` | Which image template to render |
| `intervalMs` | milliseconds | Upload interval in `automate.js` (default 60s) |
| `complications.slots` | stat key or `null` | Corner slots 1–4 (see below) |
| `complications.dayOfWeek` | boolean | Short weekday above clock centre |
| `complications.date` | boolean | Abbreviated date below clock centre |
| `padding.top/right/bottom/left` | pixels | Inset drawable area on each edge (clock only) |
| `hwinfo.cpuTempIndex` | number or `null` | HWiNFO Gadget sensor index for CPU temp (Windows) |
| `hwinfo.cpuTempLabel` | string | Label fallback when index unset (default `CPU Package`) |
| `hwinfo.gpuTempIndex` | number or `null` | HWiNFO sensor index for GPU temperature |
| `hwinfo.gpuLoadIndex` | number or `null` | HWiNFO sensor index for GPU core load % |
| `hwinfo.gpuMemIndex` | number or `null` | HWiNFO sensor index for GPU memory usage % |
| `hwinfo.gpuTempLabel` / `gpuLoadLabel` / `gpuMemLabel` | string | Label fallbacks for GPU sensors |
| `hwinfo.hive` | `"auto"` \| `"HKCU"` \| `"HKLM"` | Registry hive for HWiNFO Gadget values |
| `nvidiaSmi.enabled` | boolean | Use `nvidia-smi` as fallback when HWiNFO unavailable (default `true`) |

`generate.js` reads `config.json` and dispatches to the selected generator. `automate.js` uses the same config for `intervalMs`.

**Note:** the clock template is **640×480**. Use `padding` (top/right/bottom/left, px) to inset the drawable area if the dock crops the image. Stats template is 512×640 (portrait).

### Fonts

Typography for **clock complications** (corner stats and date labels). Fonts are resolved at PNG rasterize time via the OS font stack (sharp uses system fonts).

```json
"fonts": {
  "sans": "Segoe UI, Helvetica Neue, Arial, sans-serif",
  "mono": "Consolas, Courier New, monospace",
  "complication": null,
  "weights": {
    "normal": "400",
    "semibold": "600",
    "bold": "700"
  },
  "sizes": {
    "complicationCorner": 40,
    "complicationCornerLabel": 20,
    "complicationDate": 28
  }
}
```

| Key | Used for |
|-----|----------|
| `fonts.sans` | Default family when no role-specific override is set |
| `fonts.mono` | Reserved; not used by the clock template today |
| `fonts.complication` | Family for all complication text; `null` inherits `sans` |
| `fonts.weights.normal` | Available weight key (400) |
| `fonts.weights.semibold` | Corner stat labels (`CPU`, `GPU`, …) and date slots |
| `fonts.weights.bold` | Corner stat values (`42%`, `58°`, …) |
| `fonts.sizes.complicationCorner` | Font size (px) for corner stat values |
| `fonts.sizes.complicationCornerLabel` | Font size (px) for corner stat labels |
| `fonts.sizes.complicationDate` | Font size (px) for day-of-week and date text |

Corner label and value positions are computed from the configured sizes (12px gap between lines, 12px inset from the top of each corner slot). If label and value overlap, reduce the sizes or increase padding.

The **stats** template (`"generator": "stats"`) uses hardcoded monospace styling and does not read `fonts` from config.

## Analog Clock

`generate_clock.js` — Deutsche Bahn-style analog watchface with optional complications.

![preview](preview_clock.png)

### Complications

Overlay slots on the clock face (configured via `complications` in `config.json`):

**Corner slots 1–4** (155×100 px each) — assign any stat key or `null` to disable:

| Slot | Position |
|------|----------|
| `1` | Top-left |
| `2` | Top-right |
| `3` | Bottom-left |
| `4` | Bottom-right |

| Stat key | Label | Value example |
|----------|-------|----------------|
| `cpu` | CPU | `42%` |
| `cpuTemp` | CPU | `62°` |
| `ram` | RAM | `67%` |
| `gpu` | GPU | `23%` |
| `vram` | VRAM | `45%` |
| `gpuTemp` | GPU | `58°` |

Temperatures use the same source name as load (e.g. `GPU` for both `gpu` and `gpuTemp`); `%` vs `°` distinguishes them.

**Date slots** (boolean toggles):

- **Above centre** (half the face radius): short day of week, e.g. `Thu`
- **Below centre** (half the face radius): abbreviated date, e.g. `Jun 28`

Corner stats are collected live on each refresh (same sources as the stats template). Recommended `intervalMs`: **20000** when using live stats.

### Sensor stats (HWiNFO)

On Windows, CPU and GPU sensor values for complication slots are read from **HWiNFO Gadget** registry values when available. CPU/RAM **load** still uses `systeminformation`.

**GPU resolution order** (per metric):

| Metric | Primary | Fallback 1 | Fallback 2 |
|--------|---------|------------|------------|
| GPU temp (`gpuTemp`) | HWiNFO | `nvidia-smi` (if enabled) | `—` |
| GPU load (`gpu`) | HWiNFO | Windows performance counters | `nvidia-smi` (if enabled) |
| VRAM (`vram`) | HWiNFO | `nvidia-smi` (if enabled) | `—` |

Set `"nvidiaSmi": { "enabled": false }` to rely on HWiNFO only (plus Windows counters for GPU load fallback).

**Setup:**

1. Run HWiNFO in sensor mode (tray icon → Sensors).
2. **Configure Sensors** → **HWiNFO Gadget** tab → enable **Enable reporting to Gadget**.
3. Find your CPU/GPU sensors and tick **Report value in Gadget** for each.
4. List exported sensors and copy the indices:

```
npm run hwinfo:sensors
```

5. Set `hwinfo.*Index` in `config.json`, or rely on label matching (see defaults below).

```json
"hwinfo": {
  "cpuTempIndex": null,
  "cpuTempLabel": "CPU Package",
  "gpuTempIndex": null,
  "gpuTempLabel": "GPU Temperature",
  "gpuLoadIndex": null,
  "gpuLoadLabel": "GPU Core Load",
  "gpuMemIndex": null,
  "gpuMemLabel": "GPU Memory Usage",
  "hive": "auto"
},
"nvidiaSmi": {
  "enabled": true
}
```

| Key | Description |
|-----|-------------|
| `cpuTempIndex` / `cpuTempLabel` | CPU temperature sensor |
| `gpuTempIndex` / `gpuTempLabel` | GPU temperature (default label `GPU Temperature`) |
| `gpuLoadIndex` / `gpuLoadLabel` | GPU core load % (default `GPU Core Load`) |
| `gpuMemIndex` / `gpuMemLabel` | GPU memory usage % (default `GPU Memory Usage`) |
| `hive` | `"auto"` (try HKCU then HKLM), `"HKCU"`, or `"HKLM"`. Use `"HKLM"` if HWiNFO runs elevated. |
| `nvidiaSmi.enabled` | Optional `nvidia-smi` fallback for GPU temp/VRAM (and GPU load if HWiNFO + Windows counters fail) |

HWiNFO and this script should run under the **same Windows user**. If HWiNFO is not running or a sensor is not exported, values fall back as described above or show `—`.

CPU temperature additionally falls back to WMI via `systeminformation` when HWiNFO has no reading.

**Note:** Gadget sensor indices can change when you add or remove exported sensors — set the index once your gadget list is stable, and keep `cpuTempLabel` as a fallback.

For clock-only (no stats), set all slots to `null`. For minute-only updates without stats polling, use `intervalMs`: **30000**.

## System Stats (legacy)

`generate_stats.js` — original stats dashboard from [bequiet-darkmount-mediadock-stats](https://github.com/MikeAndrews90/bequiet-darkmount-mediadock-stats). Set `"generator": "stats"` to use it.

![preview](preview_stats.png)

## Preview images

Generate preview PNGs without sharp (requires ImageMagick `convert` on PATH):

```
npm run preview              # uses generator from config.json
npm run preview:clock        # clock at 10:09 → preview_clock.png
npm run preview:stats        # stats with mock data → preview_stats.png
```

Or directly:

```
node preview.js clock --out preview_clock.png
node preview.js clock --time 10:09 --out preview_clock.png
node preview.js stats --out preview_stats.png
```

## Tests

```
npm test
```

Runs unit tests (Node built-in `node:test`) for config loading, complication layout, geometry, and clock SVG output. No ImageMagick required for tests.

---

Original README content below this line.
--
*(Source: https://github.com/MikeAndrews90/bequiet-darkmount-mediadock-stats)*

# keyboard-stats

Displays live system stats on the be quiet! Dark Mount keyboard's media dock LCD, updated every 20 seconds.

![preview](preview_orig.png)

## How it works

A Node.js script generates a stats image as a PNG, then uses browser automation (Playwright + Chromium) to upload it to the official [be quiet! IOCenter web app](https://iocenter.bequiet.com/), which pushes it to the keyboard over WebHID.

## Requirements

- Windows (HWiNFO Gadget registry for CPU/GPU sensor stats; optional `nvidia-smi` fallback)
- Node.js 18+
- A be quiet! Dark Mount keyboard
- HWiNFO with Gadget reporting enabled for the sensors you use. Stats degrade gracefully when unavailable (CPU and RAM still show).

## Installation

```
npm install
npx playwright install chromium
```

## First run

On first run the browser needs to connect to the keyboard. WebHID requires a one-time manual approval that can't be automated:

```
node automate.js
```

1. The browser will open and navigate to iocenter.bequiet.com
2. If prompted, dismiss the welcome popup
3. When you see "No Device detected", the script will click **Find Device** automatically
4. Select your keyboard in the browser's HID picker and click **Connect**
5. The script takes over from here — the browser minimises and runs in the background

The keyboard permission is saved in `.chromium-profile/` so subsequent runs are fully automatic.

## Normal usage (background)

Double-click `start-background.vbs`. A browser window will briefly appear while it connects to the keyboard, then automatically minimise to the taskbar. Stats update every 20 seconds from that point.

Logs are written to `automate.log`.

To stop: end the `node.exe` process in Task Manager, or run:
```
taskkill /f /im node.exe
```

To check on it or intervene, click the Chromium icon in the taskbar or open `http://localhost:9222` in any Chrome window for remote DevTools.

## Disclaimer

This project automates the official be quiet! IOCenter web interface. It is not affiliated with or endorsed by be quiet!. Use at your own risk — web automation may break if the site is updated.
