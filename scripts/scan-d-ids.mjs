import fs from "node:fs";
const h = fs.readFileSync("tmp-melon.html", "utf8");
const ids = [...h.matchAll(/id=\"(d_[^\"]+)\"/g)].map((m) => m[1]);
console.log("d_ ids", ids);
for (const id of ids) {
  const re = new RegExp(`id=\"${id}\"[^>]*>([^<]*)`);
  const m = h.match(re);
  console.log(id, m?.[1]?.trim() ?? "(empty)");
}
