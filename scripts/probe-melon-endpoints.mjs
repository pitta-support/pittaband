const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const songId = "37527519";
const referer = `https://www.melon.com/song/detail.htm?songId=${songId}`;
const base = { "User-Agent": UA, Referer: referer, "Accept-Language": "ko-KR,ko;q=0.9" };

const res = await fetch(`https://m2.melon.com/song/detail.json?songId=${songId}`, { headers: { ...base, Accept: "application/json" } });
const data = await res.json();
console.log("RECORDINFO", JSON.stringify(data.RECORDINFO, null, 2));
console.log("SECTION keys", data.SECTION ? Object.keys(data.SECTION) : null);

const candidates = [
  `https://m2.melon.com/song/playCount.json?songId=${songId}`,
  `https://m2.melon.com/song/listenCount.json?songId=${songId}`,
  `https://m2.melon.com/song/getSongInfo.json?songId=${songId}`,
  `https://www.melon.com/song/playCount.json?songId=${songId}`,
  `https://www.melon.com/song/listenCount.json?songId=${songId}`,
  `https://www.melon.com/song/detail/listenCount.json?songId=${songId}`,
  `https://www.melon.com/song/detail/playCount.json?songId=${songId}`,
];
for (const url of candidates) {
  const r = await fetch(url, { headers: { ...base, Accept: "application/json", "X-Requested-With": "XMLHttpRequest" } });
  const t = await r.text();
  if (r.status !== 404) console.log(url.replace("https://", ""), r.status, t.slice(0, 200));
}
