import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Expand <!-- @include partials/... --> in src/pages/*.html
 * and write the result to the repo root (served by GitHub Pages).
 *
 * Edit:  src/pages/*.html + partials/*
 * Output: ./*.html  (do not hand-edit root HTML — it is overwritten)
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const pagesDir = path.join(root, "src", "pages");

const INCLUDE_RE = /<!--\s*@include\s+([^\s]+)\s*-->/g;

function readPartial(relativePath) {
  const filePath = path.join(root, relativePath.replace(/\//g, path.sep));
  if (!fs.existsSync(filePath)) {
    throw new Error(`Partial not found: ${relativePath}`);
  }
  return fs.readFileSync(filePath, "utf8");
}

function expandIncludes(content, stack = []) {
  return content.replace(INCLUDE_RE, (_, partialPath) => {
    if (stack.includes(partialPath)) {
      throw new Error(`Circular include: ${[...stack, partialPath].join(" -> ")}`);
    }
    const partial = readPartial(partialPath);
    return expandIncludes(partial, [...stack, partialPath]);
  });
}

if (!fs.existsSync(pagesDir)) {
  console.error(`Missing source directory: src/pages/`);
  process.exit(1);
}

const pageFiles = fs
  .readdirSync(pagesDir)
  .filter((name) => name.endsWith(".html"))
  .sort();

let changed = 0;

for (const file of pageFiles) {
  const sourcePath = path.join(pagesDir, file);
  const outPath = path.join(root, file);
  const source = fs.readFileSync(sourcePath, "utf8");
  const built = expandIncludes(source);

  const prev = fs.existsSync(outPath) ? fs.readFileSync(outPath, "utf8") : "";
  if (built !== prev) {
    fs.writeFileSync(outPath, built, "utf8");
    changed += 1;
    console.log(`built ${file}`);
  } else {
    console.log(`unchanged ${file}`);
  }
}

console.log(`\nHTML build complete (${changed} file(s) updated).`);
console.log(`Edit src/pages/ + partials/  →  npm run build:html  →  root *.html`);
