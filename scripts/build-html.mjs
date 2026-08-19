import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const pagesDir = path.join(root, "src", "pages");

const INCLUDE_RE = /<!--\s*@include\s+([^\s]+)\s*-->/g;

const CHROME_INCLUDES = `<!-- @include partials/dday-bar.html -->
    <!-- @include partials/site-header.html -->
    <!-- @include partials/nav-mobile.html -->`;

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
console.log(`Source: src/pages/  |  Chrome: partials/`);
