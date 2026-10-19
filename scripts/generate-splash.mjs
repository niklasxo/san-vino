// Erzeugt die iOS-Startbilder (apple-touch-startup-image) für alle aktuellen iPhones.
// Ohne sie zeigt iOS beim Öffnen vom Home-Bildschirm einen weißen Bildschirm, bevor die App lädt.
// Aufruf: node scripts/generate-splash.mjs   → schreibt public/splash/*.png und die <link>-Tags nach stdout
import { mkdirSync, readFileSync } from "node:fs";
import { chromium } from "playwright";

// [CSS-Breite, CSS-Höhe, Pixeldichte] im Hochformat
const DEVICES = [
  [440, 956, 3], // 16/17 Pro Max
  [430, 932, 3], // 14 Pro Max, 15 Plus/Pro Max, 16 Plus
  [420, 912, 3], // iPhone Air
  [428, 926, 3], // 12/13 Pro Max, 14 Plus
  [402, 874, 3], // 16 Pro, 17, 17 Pro
  [393, 852, 3], // 14 Pro, 15, 15 Pro, 16
  [390, 844, 3], // 12, 12 Pro, 13, 13 Pro, 14, 16e
  [375, 812, 3], // X, XS, 11 Pro, 12 mini, 13 mini
  [414, 896, 3], // XS Max, 11 Pro Max
  [414, 896, 2], // XR, 11
  [414, 736, 3], // 8 Plus
  [375, 667, 2], // SE (2./3. Gen.), 8
];

const font = readFileSync("node_modules/@fontsource-variable/playfair-display/files/playfair-display-latin-wght-normal.woff2").toString("base64");
// Gleiches Bild wie der Lade-Bildschirm der App (SplashScreen, Logo 28px) → nahtloser Übergang.
const html = `<html><head><style>
@font-face{font-family:Playfair;src:url(data:font/woff2;base64,${font}) format("woff2");font-weight:400 900}
html,body{margin:0;height:100%;background:#faf7f2}
body{display:grid;place-items:center}
.logo{display:inline-flex;align-items:center;gap:8px;font-family:Playfair;font-size:28px;font-weight:600;letter-spacing:.16em;color:#531f32;transform:translateY(-11px)}
.logo svg{width:19px;height:19px}.san{margin-right:.32em;font-size:.72em;letter-spacing:.22em;color:#c6a878}
</style></head><body><span class="logo"><svg viewBox="0 0 24 24"><path d="M10 2.5h4v4.2c0 .9.5 1.6 1.2 2.2 1 .8 1.6 2 1.6 3.3V20a1.5 1.5 0 0 1-1.5 1.5H8.7A1.5 1.5 0 0 1 7.2 20v-7.8c0-1.3.6-2.5 1.6-3.3.7-.6 1.2-1.3 1.2-2.2Z" fill="#531f32"/><rect x="8.4" y="13" width="7.2" height="4.4" rx="0.8" fill="#c6a878"/></svg><span><span class="san">SAN</span>VINO</span></span></body></html>`;

mkdirSync("public/splash", { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const links = [];
for (const [w, h, dpr] of DEVICES) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr });
  await page.setContent(html);
  await page.evaluate(() => document.fonts.ready);
  const file = `splash/iphone-${w * dpr}x${h * dpr}.png`;
  await page.screenshot({ path: `public/${file}` });
  await page.close();
  links.push(
    `<link rel="apple-touch-startup-image" media="(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait)" href="/${file}" />`,
  );
}
await browser.close();
console.log(links.join("\n"));
