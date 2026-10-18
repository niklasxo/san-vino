// Fügt JS und CSS der Demo-Build in eine einzige HTML-Datei ein (ohne <html>/<head>/<body>-Gerüst).
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dir = "demo-dist/build";
const assets = readdirSync(join(dir, "assets"));
const js = assets.filter((f) => f.endsWith(".js"));
const css = assets.filter((f) => f.endsWith(".css"));
if (js.length !== 1) throw new Error(`Erwarte genau eine JS-Datei, gefunden: ${js.join(", ")}`);

const script = readFileSync(join(dir, "assets", js[0]), "utf8").replaceAll("</script", "<\\/script");
const styles = css.map((f) => readFileSync(join(dir, "assets", f), "utf8")).join("\n");
const icon = readFileSync("public/favicon.svg", "utf8");

const html = `<title>SAN VINO</title>
<meta name="description" content="SAN VINO – dein persönlicher Wein-Sommelier (Demo)">
<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(icon)}">
<style>${styles}</style>
<div id="root"></div>
<script type="module">${script}</script>
`;
writeFileSync("demo-dist/san-vino-demo.html", html);
console.log(`✓ demo-dist/san-vino-demo.html (${(html.length / 1024 / 1024).toFixed(2)} MB)`);
