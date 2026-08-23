const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const songId = "37527519";

const res = await fetch(`https://m2.melon.com/song/detail.json?songId=${songId}`, {
  headers: {
    "User-Agent": UA,
    Accept: "application/json",
    Referer: `https://www.melon.com/song/detail.htm?songId=${songId}`,
  },
});
const data = await res.json();
console.log("top keys", Object.keys(data));
function findKeys(obj, prefix = "") {
  if (!obj || typeof obj !== "object") return;
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (/listen|play|cnt|count|stream/i.test(k)) console.log(p, v);
    if (v && typeof v === "object" && prefix.split(".").length < 4) findKeys(v, p);
  }
}
findKeys(data);

const kw = await fetch("https://kworb.net/spotify/", { headers: { "User-Agent": UA } });
const html = await kw.text();
const links = [...html.matchAll(/href=\"(\/spotify\/[^\"]+track[^\"]+)\"/g)].map((m) => m[1]).slice(0, 10);
console.log("kworb sample links", links);
console.log("kworb track link count", [...html.matchAll(/\/spotify\/track\//g)].length);
