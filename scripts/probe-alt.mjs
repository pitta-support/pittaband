const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

async function kworb(id, label) {
  const url = `https://kworb.net/spotify/track/${id}.html`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  const html = await res.text();
  const idx = html.indexOf("Total streams");
  console.log(label, res.status, idx >= 0 ? html.slice(idx, idx + 120) : "no total");
}

await kworb("4cOdK2wGLETKBW3PvgPWoT", "popular");
await kworb("2w6yPgqtZDvKc5wwHwAQrr", "apollon");

const melonUrls = [
  "https://m2.melon.com/song/detail.json?songId=37527519",
  "https://m2.melon.com/song/detail.json?songId=37527519&cpId=AS20",
  "https://www.melon.com/song/detail.json?songId=37527519&cpId=AS20",
];
for (const url of melonUrls) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "application/json",
      Referer: "https://www.melon.com/song/detail.htm?songId=37527519",
    },
  });
  const t = await res.text();
  console.log("melon", url, res.status, t.slice(0, 150));
}
