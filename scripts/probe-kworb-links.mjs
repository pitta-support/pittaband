const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
const res = await fetch("https://kworb.net/spotify/country/global_daily.html", { headers: { "User-Agent": UA } });
const html = await res.text();
const idx = html.indexOf("/spotify/track/");
console.log("first track idx", idx, html.slice(idx, idx + 120));
const res2 = await fetch("https://kworb.net/spotify/country/global_weekly.html", { headers: { "User-Agent": UA } });
const html2 = await res2.text();
const m = html2.match(/\/spotify\/track\/[a-zA-Z0-9]+\.html/);
console.log("weekly sample", m?.[0]);
if (m) {
  const r = await fetch("https://kworb.net" + m[0], { headers: { "User-Agent": UA } });
  const h = await r.text();
  console.log("sample track page status", r.status, "total idx", h.indexOf("Total streams"));
  const i = h.indexOf("Total streams");
  if (i >= 0) console.log(h.slice(i, i + 200));
}
