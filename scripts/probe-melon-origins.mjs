const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const songId = "37527519";
const headers = {
  "User-Agent": UA,
  Accept: "application/json, text/javascript, */*; q=0.01",
  Referer: `https://m2.melon.com/song/detail.htm?songId=${songId}`,
  Origin: "https://m2.melon.com",
  "X-Requested-With": "XMLHttpRequest",
};
const urls = [
  `https://www.melon.com/song/detail.json?songId=${songId}`,
  `https://m2.melon.com/song/detail.json?songId=${songId}`,
  `https://www.melon.com/song/detail/info.json?songId=${songId}&cpId=AS20`,
];
for (const url of urls) {
  const r = await fetch(url, { headers });
  const t = await r.text();
  console.log(url, r.status, t.slice(0, 250));
}
