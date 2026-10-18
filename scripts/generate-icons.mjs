// Erzeugt die PNG-App-Icons aus SVG (einmalig bzw. nach Logo-Änderungen ausführen).
// Aufruf: node scripts/generate-icons.mjs   (optional CHROMIUM_PATH=/pfad/zu/chrome)
import { chromium } from "playwright";

const glass = (scale) => `
  <g transform="translate(256 256) scale(${scale}) translate(-32 -32)">
    <path d="M19 13h26c0 13.5-5.6 22.3-13 23.4C24.6 35.3 19 26.5 19 13Z" fill="#FAF7F2"/>
    <path d="M20.4 20.5c3.8-1.4 7.7 1.3 11.6 0s7.8-1.4 11.6 0c-.9 8.4-5 14.2-11.6 15.4-6.6-1.2-10.7-7-11.6-15.4Z" fill="#7A3A50"/>
    <path d="M32 36.5V49M25 51h14" stroke="#C6A878" stroke-width="2.6" stroke-linecap="round"/>
  </g>`;
const svg = (scale, rounded) => `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6b2a40"/><stop offset="1" stop-color="#351522"/></linearGradient></defs>
  <rect width="512" height="512" rx="${rounded ? 112 : 0}" fill="url(#g)"/>
  <circle cx="256" cy="256" r="190" fill="none" stroke="#C6A878" stroke-opacity=".35" stroke-width="3"/>
  ${glass(scale)}
</svg>`;

const targets = [
  { file: "public/icons/icon-512.png", size: 512, svg: svg(5.6, true) },
  { file: "public/icons/icon-192.png", size: 192, svg: svg(5.6, true) },
  { file: "public/icons/icon-maskable-512.png", size: 512, svg: svg(4.4, false) },
  { file: "public/icons/apple-touch-icon.png", size: 180, svg: svg(5.2, false) },
];

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage();
for (const t of targets) {
  await page.setViewportSize({ width: t.size, height: t.size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${t.svg.replace('width="512" height="512"', `width="${t.size}" height="${t.size}"`)}</body></html>`);
  await page.screenshot({ path: t.file, omitBackground: true, clip: { x: 0, y: 0, width: t.size, height: t.size } });
  console.log("✓", t.file);
}
await browser.close();
