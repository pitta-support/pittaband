import fs from "node:fs";
const h = fs.readFileSync("tmp-melon.html", "utf8");
for (const k of ["__", "preload", "INITIAL", "songInfo", "SONGINFO", "melonData"]) {
  const c = (h.match(new RegExp(k, "g")) || []).length;
  if (c) console.log(k, c);
}
