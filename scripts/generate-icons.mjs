// Erzeugt alle PNG-App-Icons aus public/icons/app-icon.svg.
// Aufruf: node scripts/generate-icons.mjs   (optional CHROMIUM_PATH=/pfad/zu/chrome)
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const svg = readFileSync("public/icons/app-icon.svg", "utf8");
// rounded = abgerundet (Browser/Android "any"), padded = mit Sicherheitsrand (maskable)
const targets = [
  { file: "public/icons/icon-512.png", size: 512, rounded: true },
  { file: "public/icons/icon-192.png", size: 192, rounded: true },
  { file: "public/icons/icon-maskable-512.png", size: 512, padded: true },
  { file: "public/icons/apple-touch-icon.png", size: 180 },
  { file: "public/icons/icon-1024.png", size: 1024 },
];

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage();
for (const t of targets) {
  await page.setViewportSize({ width: t.size, height: t.size });
  const radius = t.rounded ? Math.round(t.size * 0.225) : 0;
  const scale = t.padded ? 0.84 : 1;
  await page.setContent(`<html><body style="margin:0;background:${t.padded ? "#3d1525" : "transparent"}">
    <div style="width:${t.size}px;height:${t.size}px;border-radius:${radius}px;overflow:hidden;display:grid;place-items:center">
      <div style="width:${t.size}px;height:${t.size}px;transform:scale(${scale})">${svg.replace('width="1024" height="1024"', `width="${t.size}" height="${t.size}"`)}</div>
    </div></body></html>`);
  await page.screenshot({ path: t.file, omitBackground: true, clip: { x: 0, y: 0, width: t.size, height: t.size } });
  console.log("✓", t.file);
}
await browser.close();
