const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
for (const url of [
  "https://kworb.net/spotify/track/0VjIjW4GlUZAMYd2vXMi3b.html",
  "https://kworb.net/spotify/track/2w6yPgqtZDvKc5wwHwAQrr.html",
]) {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html", Referer: "https://kworb.net/spotify/" } });
  const html = await res.text();
  const i = html.indexOf("Total streams");
  console.log("\n", url, res.status, "len", html.length);
  if (i >= 0) console.log(html.slice(i, i + 180));
  else console.log("title", html.match(/<title>([^<]+)/)?.[1]);
}
