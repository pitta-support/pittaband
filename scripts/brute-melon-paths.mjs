const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const songId = "37527519";
const referer = `https://www.melon.com/song/detail.htm?songId=${songId}`;
const base = {
  "User-Agent": UA,
  Accept: "application/json, text/javascript, */*; q=0.01",
  Referer: referer,
  "X-Requested-With": "XMLHttpRequest",
  "Accept-Language": "ko-KR,ko;q=0.9",
};
const paths = [
  `/song/listenCount.json?songId=${songId}`,
  `/song/playCount.json?songId=${songId}`,
  `/song/songPlayCount.json?songId=${songId}`,
  `/song/getListenCount.json?songId=${songId}`,
  `/song/songInfo.json?songId=${songId}`,
  `/song/songReviewCnt.json?songId=${songId}`,
  `/song/songStat.json?songId=${songId}`,
  `/song/songPlayInfo.json?songId=${songId}`,
  `/cds/song/web/songdetailplaycount.json?songId=${songId}`,
];
for (const p of paths) {
  const r = await fetch("https://www.melon.com" + p, { headers: base });
  const t = await r.text();
  if (r.status === 200 && t.trim()) console.log(p, r.status, t.slice(0, 300));
  else console.log(p, r.status);
}
