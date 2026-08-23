const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
const res = await fetch("https://kworb.net/spotify/country/global_daily_totals.html", { headers: { "User-Agent": UA } });
console.log("totals", res.status);
const html = await res.text();
for (const needle of ["Total streams", "/track/", "spotify/track"]) {
  console.log(needle, html.includes(needle), html.indexOf(needle));
}
console.log(html.slice(0, 800));
