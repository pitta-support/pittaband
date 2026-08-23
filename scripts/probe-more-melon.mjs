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
  `/song/lyricInfo.json?songId=${songId}`,
  `/song/withLikeUserSong.json?songId=${songId}`,
  `/song/detail/listenCount.htm?songId=${songId}`,
  `/song/detail/listenCount.json?songId=${songId}`,
  `/song/detail/playCount.htm?songId=${songId}`,
  `/song/detail/accPlayCnt.json?songId=${songId}`,
  `/song/detail/songInfo.json?songId=${songId}`,
  `/song/detail/songDetail.json?songId=${songId}`,
];
for (const p of paths) {
  const r = await fetch("https://www.melon.com" + p, { headers: base });
  const t = await r.text();
  console.log(p, r.status, t.slice(0, 180).replace(/\s+/g, " "));
}
