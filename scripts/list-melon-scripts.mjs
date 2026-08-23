import fs from "node:fs";
const h = fs.readFileSync("tmp-melon.html", "utf8");
const scripts = [...h.matchAll(/src=\"([^\"]+\.js[^\"]*)\"/g)].map((m) => m[1]).filter((s) => s.includes("melon"));
console.log("script count", scripts.length);
console.log(scripts.slice(0, 15));
