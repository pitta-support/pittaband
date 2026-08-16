import fs from "fs";
import path from "path";

const dir = path.resolve("images/effects/dandelion");
const pad = 16;

function parsePathBounds(d) {
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) || [];
  let i = 0;
  let cx = 0;
  let cy = 0;
  let startX = 0;
  let startY = 0;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  function addPoint(x, y) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }

  function readNumber() {
    return +tokens[i++];
  }

  while (i < tokens.length) {
    const token = tokens[i];
    if (!/[a-zA-Z]/.test(token)) {
      i++;
      continue;
    }

    const cmd = token;
    i++;
    const isRelative = cmd === cmd.toLowerCase() && cmd !== "Z" && cmd !== "z";
    const upper = cmd.toUpperCase();

    if (upper === "M") {
      const x = readNumber();
      const y = readNumber();
      cx = isRelative ? cx + x : x;
      cy = isRelative ? cy + y : y;
      startX = cx;
      startY = cy;
      addPoint(cx, cy);

      while (i < tokens.length && !/[a-zA-Z]/.test(tokens[i])) {
        const lx = readNumber();
        const ly = readNumber();
        cx = isRelative ? cx + lx : lx;
        cy = isRelative ? cy + ly : ly;
        addPoint(cx, cy);
      }
      continue;
    }

    if (upper === "L") {
      while (i < tokens.length && !/[a-zA-Z]/.test(tokens[i])) {
        const x = readNumber();
        const y = readNumber();
        cx = isRelative ? cx + x : x;
        cy = isRelative ? cy + y : y;
        addPoint(cx, cy);
      }
      continue;
    }

    if (upper === "H") {
      while (i < tokens.length && !/[a-zA-Z]/.test(tokens[i])) {
        const x = readNumber();
        cx = isRelative ? cx + x : x;
        addPoint(cx, cy);
      }
      continue;
    }

    if (upper === "V") {
      while (i < tokens.length && !/[a-zA-Z]/.test(tokens[i])) {
        const y = readNumber();
        cy = isRelative ? cy + y : y;
        addPoint(cx, cy);
      }
      continue;
    }

    if (upper === "C") {
      while (i < tokens.length && !/[a-zA-Z]/.test(tokens[i])) {
        const x1 = readNumber();
        const y1 = readNumber();
        const x2 = readNumber();
        const y2 = readNumber();
        const x = readNumber();
        const y = readNumber();
        if (isRelative) {
          addPoint(cx + x1, cy + y1);
          addPoint(cx + x2, cy + y2);
          cx += x;
          cy += y;
        } else {
          addPoint(x1, y1);
          addPoint(x2, y2);
          cx = x;
          cy = y;
        }
        addPoint(cx, cy);
      }
      continue;
    }

    if (upper === "S") {
      while (i < tokens.length && !/[a-zA-Z]/.test(tokens[i])) {
        const x2 = readNumber();
        const y2 = readNumber();
        const x = readNumber();
        const y = readNumber();
        if (isRelative) {
          addPoint(cx + x2, cy + y2);
          cx += x;
          cy += y;
        } else {
          addPoint(x2, y2);
          cx = x;
          cy = y;
        }
        addPoint(cx, cy);
      }
      continue;
    }

    if (upper === "Q") {
      while (i < tokens.length && !/[a-zA-Z]/.test(tokens[i])) {
        const x1 = readNumber();
        const y1 = readNumber();
        const x = readNumber();
        const y = readNumber();
        if (isRelative) {
          addPoint(cx + x1, cy + y1);
          cx += x;
          cy += y;
        } else {
          addPoint(x1, y1);
          cx = x;
          cy = y;
        }
        addPoint(cx, cy);
      }
      continue;
    }

    if (upper === "Z") {
      cx = startX;
      cy = startY;
      continue;
    }

    break;
  }

  return { minX, minY, maxX, maxY };
}

function fixSvg(filePath) {
  const svg = fs.readFileSync(filePath, "utf8");
  const paths = [...svg.matchAll(/\sd="([^"]+)"/g)].map((m) => m[1]);
  if (!paths.length) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const d of paths) {
    const b = parsePathBounds(d);
    minX = Math.min(minX, b.minX);
    maxX = Math.max(maxX, b.maxX);
    minY = Math.min(minY, b.minY);
    maxY = Math.max(maxY, b.maxY);
  }

  const x = minX - pad;
  const y = minY - pad;
  const w = maxX - minX + pad * 2;
  const h = maxY - minY + pad * 2;
  const viewBox = `${x.toFixed(1)} ${y.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`;

  const updated = svg.replace(/viewBox="[^"]+"/, `viewBox="${viewBox}"`);
  fs.writeFileSync(filePath, updated);
  return viewBox;
}

for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".svg"))) {
  const viewBox = fixSvg(path.join(dir, file));
  console.log(`${file}: ${viewBox}`);
}
