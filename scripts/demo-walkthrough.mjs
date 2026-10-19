// Klickt die komplette App im Demo-Modus durch und speichert Screenshots (Smartphone 390×844).
// Voraussetzung: VITE_DEMO_MODE=true npm run dev  ·  Aufruf: npm run e2e:demo
import { chromium } from "playwright";
const BASE = process.env.BASE_URL ?? "http://localhost:5173";
const out = process.env.SHOT_DIR ?? "screenshots";
await import("node:fs").then((fs) => fs.mkdirSync(out, { recursive: true }));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
// Testbild für den Upload erzeugen
{
  const p = await browser.newPage({ viewport: { width: 600, height: 800 } });
  await p.setContent(`<body style="margin:0;background:#2a1a12;display:grid;place-items:center;height:800px"><div style="width:420px;height:620px;background:#f4ead6;border-radius:12px;font-family:Georgia;text-align:center;padding-top:120px;box-sizing:border-box;color:#3b1d1d"><div style="font-size:18px;letter-spacing:6px">MASSERIA DEL SOLE</div><div style="font-size:44px;margin-top:40px">Primitivo<br>di Manduria</div><div style="margin-top:30px;font-size:20px">2021 · DOC</div><div style="margin-top:120px;font-size:14px">14,5 % vol · 0,75 l</div></div></body>`);
  await p.screenshot({ path: "tests/fixtures/demo-label.jpg", type: "jpeg", quality: 85 });
  await p.close();
}
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "de-DE" });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
const shot = async (n) => { await page.waitForTimeout(900); await page.screenshot({ path: `${out}/${n}.png` }); };

await page.goto(`${BASE}/`);
await page.waitForURL("**/willkommen");
await shot("01-welcome");
await page.getByRole("button", { name: /Meinen Geschmack entdecken/ }).click();
await shot("02-q1");
const answers = [
  "Ein bisschen süß ist perfekt", "Lieber mild und ausgewogen", ["Erdbeeren und Kirschen", "Brombeeren und dunkle Früchte"],
  "Gerne intensiv", "In kleinen Mengen okay", "Rotwein",
];
const LAST = answers.length - 1;
for (const [i, a] of answers.entries()) {
  if (Array.isArray(a)) {
    for (const x of a) await page.getByRole("checkbox", { name: x }).click();
    if (i === 2) await shot("03-q3-multi");
    await page.getByRole("button", { name: /^Weiter/ }).click();
  } else {
    await page.getByRole("radio", { name: a }).click();
    if (i === LAST) { await shot("04-q-last"); await page.getByRole("button", { name: /Mein Profil erstellen/ }).click(); }
    else await page.getByRole("button", { name: /^Weiter/ }).click();
  }
  await page.waitForTimeout(450);
}
await page.waitForURL("**/onboarding/ergebnis");
await shot("05-result");
await page.screenshot({ path: `${out}/05b-result-full.png`, fullPage: true });
await page.getByRole("button", { name: /Erst mal umsehen/ }).click();
await page.waitForURL(`${BASE}/`);
await shot("06-home");
await page.screenshot({ path: `${out}/06b-home-full.png`, fullPage: true });

// Weinkarte scannen
await page.goto(`${BASE}/scannen?typ=karte`);
await shot("07-scan");
await page.getByRole("button", { name: /Weinkarte scannen/ }).click();
await page.locator("input[capture]").setInputFiles("tests/fixtures/demo-label.jpg");
await shot("08-preview");
await page.getByRole("button", { name: /Karte analysieren/ }).click();
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/09-analyzing.png` });
await page.waitForURL(/\/scan\/[^/]+$/, { timeout: 15000 });
await shot("10-menu-results");
await page.screenshot({ path: `${out}/10b-menu-full.png`, fullPage: true });
await page.getByRole("link", { name: /Warum passt der zu mir/ }).click();
await page.waitForURL(/wein/);
await page.waitForTimeout(1500);
await shot("11-item-detail");
await page.screenshot({ path: `${out}/11b-item-full.png`, fullPage: true });
await page.getByRole("button", { name: /Zu meinen Weinen/ }).click();
await page.waitForTimeout(600);
await page.getByRole("button", { name: /Habe ich probiert/ }).click();
await page.waitForTimeout(700);
await shot("12-rating-sheet");
await page.getByRole("radio", { name: /richtig gut geschmeckt/ }).click();
await page.getByRole("radio", { name: "4 Sterne" }).click();
await page.getByRole("button", { name: "Schön fruchtig" }).click();
await shot("12b-rating-filled");
await page.getByRole("button", { name: /Bewertung speichern/ }).click();
await page.waitForTimeout(1200);
await shot("13-after-rating");

// Flasche (unsicher: zweiter/dritter Demo-Scan)
for (const n of [1, 2, 3]) {
  await page.goto(`${BASE}/scannen`);
  await page.getByRole("button", { name: /Flasche scannen/ }).click();
  await page.locator("input[capture]").setInputFiles("tests/fixtures/demo-label.jpg");
  await page.getByRole("button", { name: /Wein analysieren/ }).click();
  await page.waitForURL(/\/scan\//, { timeout: 15000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${out}/14-bottle-${n}.png`, fullPage: true });
}
await page.goto(`${BASE}/weine`);
await shot("15-my-wines");
await page.goto(`${BASE}/geschmack`);
await shot("16-taste");
await page.screenshot({ path: `${out}/16b-taste-full.png`, fullPage: true });
console.log("URL", page.url());
console.log("ERRORS", JSON.stringify(errors, null, 1));
await browser.close();
