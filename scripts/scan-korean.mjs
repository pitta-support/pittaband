import fs from "node:fs";
const h = fs.readFileSync("tmp-melon.html", "utf8");
for (const k of ["누적", "감상", "재생수", "전체", "listen", "cnt_", "count", "play_count", "accPlay", "ACCPLAY"]) {
  let idx = h.indexOf(k);
  console.log(k, idx >= 0 ? h.slice(idx, idx + 80).replace(/\s+/g, " ") : "missing");
}
