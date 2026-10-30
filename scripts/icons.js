// Generates the plugin icons (SVG source -> PNG via inkscape).
// Usage: node scripts/icons.js  (requires inkscape in PATH)
const {execFileSync} = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const dir = path.join(__dirname, "..", "src", "dev.lyzev.opendeckgo.sdPlugin", "resources");

const BG = "#0f172a";      // dark slate
const TRACK = "#334155";   // unused capacity
const FILL = "#2ecc71";    // available capacity

// Points on a circle, degrees measured from 3 o'clock, clockwise.
function polar(cx, cy, r, deg) {
    const rad = deg * Math.PI / 180;
    return `${(cx + r * Math.cos(rad)).toFixed(2)} ${(cy + r * Math.sin(rad)).toFixed(2)}`;
}

// 270 degree gauge arc starting at 135 degrees (bottom left).
function arc(cx, cy, r, start = 135, sweep = 270) {
    const end = start + sweep;
    const large = sweep > 180 ? 1 : 0;
    return `M ${polar(cx, cy, r, start)} A ${r} ${r} 0 ${large} 1 ${polar(cx, cy, r, end)}`;
}

// Gauge that is 64% consumed: 64% of the 270 degree sweep is "track".
const PCT = 64;
const cx = 50, cy = 54, r = 32;
const openAt = arc(cx, cy, r, 135, 270 - 270 * PCT / 100);

const gauge = `
  <path d="${arc(cx, cy, r)}" stroke="${TRACK}" stroke-width="11" stroke-linecap="round" fill="none"/>
  <path d="${openAt}" stroke="${FILL}" stroke-width="11" stroke-linecap="round" fill="none"/>
  <circle cx="${cx}" cy="${cy}" r="4" fill="${FILL}"/>`;

const pluginSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="${BG}"/>
  <path d="${arc(cx, cy, r, 135, 132)}" stroke="#2563eb" stroke-width="11" stroke-linecap="round" fill="none"/>
  ${gauge}
</svg>`;

const actionSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 100 100">
  ${gauge}
</svg>`;

for (const [name, svg] of [["pluginIcon", pluginSvg], ["actionIcon", actionSvg]]) {
    for (const size of ["", "@2x"]) {
        const px = size ? 256 : 128;
        const file = path.join(dir, `${name}${size}.png`);
        const tmp = path.join(os.tmpdir(), `${name}${size}.svg`);
        fs.writeFileSync(tmp, svg);
        execFileSync("inkscape", [tmp, "--export-type=png", `--export-width=${px}`, `--export-height=${px}`, `--export-filename=${file}`]);
        console.log(file);
    }
}
