import fs from "node:fs";
const h = fs.readFileSync("tmp-melon.html", "utf8");
const scripts = [...h.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).filter((s) => s.trim().length > 0);
console.log("inline scripts", scripts.length);
for (const s of scripts) {
  if (/listen|playCnt|detail\.json|songInfo/i.test(s)) {
    console.log("--- hit ---");
    console.log(s.slice(0, 500));
  }
}
