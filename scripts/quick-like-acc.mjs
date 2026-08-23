const songId = process.argv[2] || "37527521";
const referer = `https://www.melon.com/song/detail.htm?songId=${songId}`;
const H = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept-Language": "ko-KR,ko;q=0.9",
};
(async () => {
  const likeUrl = `https://www.melon.com/commonlike/getSongLike.json?contsIds=${songId}`;
  const lr = await fetch(likeUrl, { headers: { ...H, Referer: referer, Accept: "application/json" } });
  console.log("getSongLike", lr.status, await lr.text());
  const accUrl = `https://www.melon.com/song/listSongAccCnt.json?songIds=${songId}`;
  const ar = await fetch(accUrl, { headers: { ...H, Referer: referer, Accept: "application/json" } });
  console.log("listSongAccCnt", ar.status, (await ar.text()).slice(0, 500));
})();
