import fs from "node:fs";
const h = fs.readFileSync("tmp-melon.html", "utf8");
const nums = [...h.matchAll(/\b(\d{1,3}(?:,\d{3}){2,})\b/g)].map((m) => m[1]);
console.log("large comma nums sample", nums.slice(0, 20));
const playish = [...h.matchAll(/play[^<]{0,80}/gi)].slice(0, 15).map((m) => m[0].replace(/\s+/g, " "));
console.log("play snippets", playish);
