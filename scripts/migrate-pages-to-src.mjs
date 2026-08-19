import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "src", "pages");

const DDAY_HIDE_RE =
  /    <script>\s*\(function \(\) \{[\s\S]*?document\.documentElement\.classList\.add\("is-dday-hidden"\);[\s\S]*?\}\)\(\);\s*<\/script>\s*\n/;

const CHROME_RE =
  /    <!-- D-day Bar -->\s*\n?    <div class="dday-bar"[\s\S]*?    <\/nav>\s*\n/;

const CHROME_RE_NO_COMMENT =
  /    <div class="dday-bar"[\s\S]*?    <\/nav>\s*\n/;

const DDAY_HIDE_INCLUDE = "    <!-- @include partials/dday-hide-script.html -->\n";
const CHROME_INCLUDES = `    <!-- @include partials/dday-bar.html -->
    <!-- @include partials/site-header.html -->
    <!-- @include partials/nav-mobile.html -->
`;

const pageFiles = [
  "index.html",
  "about.html",
  "album.html",
  "concert.html",
  "festival.html",
];

fs.mkdirSync(outDir, { recursive: true });

for (const file of pageFiles) {
  const filePath = path.join(root, file);
  let html = fs.readFileSync(filePath, "utf8");

  html = html.replace(DDAY_HIDE_RE, DDAY_HIDE_INCLUDE);
  html = html.replace(CHROME_RE, CHROME_INCLUDES);
  html = html.replace(CHROME_RE_NO_COMMENT, CHROME_INCLUDES);

  const outPath = path.join(outDir, file);
  fs.writeFileSync(outPath, html, "utf8");
  console.log(`migrated ${file} -> src/pages/${file}`);
}
