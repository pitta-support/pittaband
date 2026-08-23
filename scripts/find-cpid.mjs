import fs from "node:fs";
const h = fs.readFileSync("tmp-melon.html", "utf8");
for (const k of ["cpId", "CPID", "contsId", "CONTSID", "songId", "POC"]) {
  const ms = [...h.matchAll(new RegExp(k + "[^\\n]{0,40}", "g"))].slice(0,3).map(m=>m[0]);
  if (ms.length) console.log(k, ms);
}
