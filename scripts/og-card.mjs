/**
 * Link preview for WhatsApp, iMessage & Co. (1200×630): public/og.jpg in the app's look
 * – ivory, burgundy, gold, the app icon and the welcome page's promise.
 *
 *   pip install pillow fonttools brotli
 *   node scripts/og-card.mjs
 *
 * Fonts are cut from the self-hosted variable fonts by Python (fontTools), the card is drawn as
 * SVG and rasterised with resvg, Pillow saves the JPEG (keep it well under 300 kB for WhatsApp).
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Resvg } from "@resvg/resvg-js";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const FILES = join(ROOT, "node_modules", "@fontsource-variable");
const tmp = mkdtempSync(join(tmpdir(), "og-"));
const py = process.platform === "win32" ? "python" : "python3";
const cut = `
import sys
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
src, wght, dst = sys.argv[1], int(sys.argv[2]), sys.argv[3]
f = TTFont(src); instancer.instantiateVariableFont(f, {"wght": wght}, inplace=True); f.flavor = None; f.save(dst)
`;
const fonts = [
  [join(FILES, "playfair-display", "files", "playfair-display-latin-wght-normal.woff2"), 600, "playfair.ttf"],
  [join(FILES, "dm-sans", "files", "dm-sans-latin-wght-normal.woff2"), 500, "dmsans-500.ttf"],
  [join(FILES, "dm-sans", "files", "dm-sans-latin-wght-normal.woff2"), 700, "dmsans-700.ttf"],
];
for (const [src, w, out] of fonts) execFileSync(py, ["-c", cut, src, String(w), join(tmp, out)]);

// Colours from src/styles/index.css
const IVORY = "#faf7f2", CREAM = "#f2ece4", BURGUNDY = "#531f32", GOLD = "#c6a878", CHARCOAL = "#242022", TAUPE = "#6f655f";
const icon = readFileSync(join(ROOT, "public", "icons", "app-icon.svg"), "utf8")
  .replace(/<\?xml[^>]*>/, "")
  .replace(/<svg [^>]*>/, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" x="96" y="125" width="380" height="380">`);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${IVORY}"/>
  <circle cx="286" cy="315" r="300" fill="${CREAM}"/>
  <clipPath id="ic"><rect x="96" y="125" width="380" height="380" rx="86"/></clipPath>
  <rect x="96" y="139" width="380" height="380" rx="86" fill="${BURGUNDY}" opacity="0.18"/>
  <g clip-path="url(#ic)">${icon}</g>

  <text x="560" y="176" font-family="DM Sans 9pt" font-weight="700" font-size="24" letter-spacing="5" fill="${GOLD}">SAN VINO</text>
  <text font-family="Playfair Display" font-weight="600" font-size="66" fill="${CHARCOAL}">
    <tspan x="556" y="262">Wein finden,</tspan>
    <tspan x="556" y="340">der wirklich zu</tspan>
    <tspan x="556" y="418">dir passt.</tspan>
  </text>
  <text font-family="DM Sans 9pt" font-weight="500" font-size="29" fill="${TAUPE}">
    <tspan x="560" y="486">Flasche oder Weinkarte fotografieren –</tspan>
    <tspan x="560" y="526">dein persönlicher KI-Sommelier.</tspan>
  </text>
</svg>`;

const png = new Resvg(svg, {
  fitTo: { mode: "width", value: 1200 },
  font: { loadSystemFonts: false, fontFiles: fonts.map(([, , f]) => join(tmp, f)), defaultFontFamily: "DM Sans 9pt" },
}).render().asPng();
writeFileSync(join(tmp, "card.png"), png);
const save = `
import sys
from PIL import Image
Image.open(sys.argv[1]).convert("RGB").save(sys.argv[2], "JPEG", quality=88, optimize=True, progressive=True)
`;
execFileSync(py, ["-c", save, join(tmp, "card.png"), join(ROOT, "public", "og.jpg")]);
rmSync(tmp, { recursive: true, force: true });
console.log("public/og.jpg:", Math.round(readFileSync(join(ROOT, "public", "og.jpg")).length / 1024), "kB");
