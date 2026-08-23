const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
const html = await (await fetch("https://kworb.net/spotify/track/0VjIjW4GlUZAMYd2vXMi3b.html", { headers: { "User-Agent": UA } })).text();
for (const needle of ["Total streams", "total streams", "Streams", "streams"]) {
  let idx = 0, n = 0;
  while (n < 3) {
    idx = html.indexOf(needle, idx);
    if (idx < 0) break;
    console.log(needle, "at", idx, JSON.stringify(html.slice(idx, idx + 120)));
    idx += needle.length;
    n++;
  }
}
const patterns = [
  /Total streams<\/td>\s*<td[^>]*>\s*([\d,]+)/i,
  /Total streams[\s\S]{0,200}?>\s*([\d,]+)\s*</i,
  />([\d,]+)<\/td>\s*<td[^>]*>\s*Total/i,
];
for (const p of patterns) {
  const m = html.match(p);
  console.log("pattern", p.source, m?.[1] ?? "no");
}
