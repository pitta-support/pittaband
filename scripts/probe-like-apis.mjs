const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
const songId = "37527519";
const urls = [
  `https://www.melon.com/commonlike/getSongLike.json?contsIds=${songId}`,
  `https://www.melon.com/song/withLikeUserSong.json?contsId=${songId}&viewPage=1`,
  `https://www.melon.com/song/songReviewCnt.json?songId=${songId}`,
];
for (const url of urls) {
  const r = await fetch(url, { headers: { "User-Agent": UA, Referer: `https://www.melon.com/song/detail.htm?songId=${songId}`, Accept: "application/json", "X-Requested-With": "XMLHttpRequest" } });
  console.log("\n", url.split("melon.com")[1]);
  console.log(await r.text());
}
