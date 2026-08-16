import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function flatten(obj, prefix = "") {
  const out = {};
  for (const [key, value] of Object.entries(obj)) {
    const dotPath = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(out, flatten(value, dotPath));
    } else {
      out[dotPath] = value;
    }
  }
  return out;
}

function walk(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (name === "node_modules") continue;
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, files);
    else if (/\.(html|js)$/.test(name) && !/board-admin|server\.js|i18n-audit/.test(name)) {
      files.push(full);
    }
  }
  return files;
}

const ko = flatten(JSON.parse(fs.readFileSync(path.join(ROOT, "locales/ko.json"), "utf8")));
const targets = ["en", "ja", "es"].map((lang) => ({
  lang,
  flat: flatten(JSON.parse(fs.readFileSync(path.join(ROOT, `locales/${lang}.json`), "utf8"))),
}));

const used = new Set();
const files = walk(ROOT);

for (const file of files) {
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  const content = fs.readFileSync(file, "utf8");

  for (const m of content.matchAll(/data-i18n="([^"]+)"/g)) used.add(m[1]);
  for (const m of content.matchAll(/data-i18n-attr="([^"]+)"/g)) {
    for (const pair of m[1].split(";")) {
      const key = pair.split(":").slice(1).join(":").trim();
      if (key) used.add(key);
    }
  }
  for (const m of content.matchAll(/\bt\(\s*["']([^"']+)["']/g)) used.add(m[1]);

  const tiPrefix = rel.includes("festival-page")
    ? "pages.festival."
    : rel.includes("concert-page")
      ? "pages.concert."
      : null;
  if (tiPrefix) {
    for (const m of content.matchAll(/\bti\(\s*["']([^"']+)["']/g)) {
      used.add(tiPrefix + m[1]);
    }
  }
}

for (const key of [
  "overlay.instagram",
  "hero.anniversary.label",
  "hero.anniversary.greeting",
  "hero.anniversary.cta",
  "hero.anniversary.typeAlbum",
  "hero.anniversary.typeSingle",
  "hero.anniversary.typeOst",
  "pages.concert.statusUpcoming",
  "pages.concert.statusLive",
  "pages.concert.statusEnded",
  "pages.concert.openMap",
  "pages.concert.encore",
  "pages.concert.tickets",
  "pages.concert.empty",
  "pages.concert.loadError",
  "pages.festival.detailPending",
  "pages.festival.empty",
  "pages.festival.loadError",
  "pages.board.alertConfig",
  "pages.board.alertRequired",
  "pages.board.alertSuccess",
  "pages.board.alertFail",
  "pages.board.subjectPrefix",
]) {
  used.add(key);
}

const missingInKo = [...used].filter((k) => ko[k] === undefined).sort();
console.log("=== Keys used in code but missing in ko.json ===");
console.log(missingInKo.length ? missingInKo.join("\n") : "(none)");

for (const { lang, flat } of targets) {
  const missing = Object.keys(ko).filter((k) => flat[k] === undefined);
  const empty = Object.keys(ko).filter((k) => flat[k] === "" || flat[k] == null);
  const korean = Object.keys(ko).filter(
    (k) => typeof flat[k] === "string" && /[\uAC00-\uD7AF]/.test(flat[k]) && k !== "lang.ko"
  );
  const identical = Object.keys(ko).filter((k) => {
    const a = ko[k];
    const b = flat[k];
    return typeof a === "string" && a === b && k !== "lang.ko" && /[\uAC00-\uD7AF]/.test(a);
  });

  console.log(`\n=== ${lang}.json ===`);
  console.log(`missing: ${missing.length}, empty: ${empty.length}, korean: ${korean.length}, identical-ko: ${identical.length}`);
  if (missing.length) console.log("missing:\n" + missing.join("\n"));
  if (korean.length) console.log("still korean:\n" + korean.map((k) => `${k}: ${flat[k]}`).join("\n"));
  if (identical.length) console.log("identical to ko (sample):\n" + identical.slice(0, 20).join("\n"));
}

// HTML pages without data-page meta check
const htmlPages = fs.readdirSync(ROOT).filter((f) => f.endsWith(".html"));
console.log("\n=== HTML pages ===");
for (const page of htmlPages) {
  const content = fs.readFileSync(path.join(ROOT, page), "utf8");
  const dataPage = content.match(/data-page="([^"]+)"/)?.[1] || "(none)";
  const i18nCount = (content.match(/data-i18n/g) || []).length;
  const hasLangSelect = content.includes("lang-select");
  console.log(`${page}: data-page=${dataPage}, data-i18n=${i18nCount}, lang-select=${hasLangSelect}`);
}
