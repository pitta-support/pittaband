const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const songId = "37527519";
const referer = `https://www.melon.com/song/detail.htm?songId=${songId}`;
const headers = {
  "User-Agent": UA,
  Accept: "application/json, text/javascript, */*; q=0.01",
  Referer: referer,
  "Accept-Language": "ko-KR,ko;q=0.9",
};
const urls = [
  `https://www.melon.com/song/detail.json?songId=${songId}`,
  `https://www.melon.com/song/detail.json?songId=${songId}&cpId=AS20`,
  `https://www.melon.com/song/detail.json?songId=${songId}&memberKey=0`,
];
for (const url of urls) {
  for (const xrw of [undefined, "XMLHttpRequest"]) {
    const r = await fetch(url, { headers: { ...headers, ...(xrw ? { "X-Requested-With": xrw } : {}) } });
    const t = await r.text();
    console.log(url.split("?")[1], "xrw", !!xrw, r.status, t.length);
  }
}
