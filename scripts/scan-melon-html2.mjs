import fs from "node:fs";
const h = fs.readFileSync("tmp-melon.html", "utf8");
for (const k of ["listenCount", "accPlayCnt", "detail.json", "playCnt", "totCnt", "songDtl", "getSong"]) {
  console.log(k, h.includes(k));
}
const ajax = [...h.matchAll(/url\s*:\s*['"]([^'"]+)['"]/g)].map((m) => m[1]).filter((u) => /song|play|listen|detail/i.test(u));
console.log("ajax urls", ajax.slice(0, 20));
const inline = h.match(/songId=37527519[\s\S]{0,500}/);
console.log("inline", inline?.[0]?.slice(0, 300));
