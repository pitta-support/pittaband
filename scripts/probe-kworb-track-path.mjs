const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
const html = await (await fetch("https://kworb.net/spotify/country/global_daily_totals.html", { headers: { "User-Agent": UA } })).text();
const idx = html.indexOf("/track/");
console.log(html.slice(idx - 20, idx + 100));
const m = html.match(/href=\"([^\"]*track\/[a-zA-Z0-9]+[^\"]*)\"/);
console.log("first href", m?.[1]);
if (m) {
  const url = m[1].startsWith("http") ? m[1] : "https://kworb.net" + m[1];
  const page = await (await fetch(url, { headers: { "User-Agent": UA } })).text();
  const i = page.indexOf("Total streams");
  console.log("page status len", page.length, "total idx", i);
  if (i >= 0) console.log(page.slice(i, i + 220));
}

const apollon = await fetch("https://kworb.net/spotify/track/2w6yPgqtZDvKc5wwHwAQrr.html", { headers: { "User-Agent": UA } });
console.log("apollon old path", apollon.status);
const apollon2 = await fetch("https://kworb.net/track/2w6yPgqtZDvKc5wwHwAQrr.html", { headers: { "User-Agent": UA } });
console.log("apollon /track/", apollon2.status);
const t = await apollon2.text();
const i2 = t.indexOf("Total streams");
console.log("apollon context", i2 >= 0 ? t.slice(i2, i2 + 220) : "missing");
