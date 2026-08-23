const url = "https://www.melon.com/song/detail.json?songId=37527519";
const referer = "https://www.melon.com/song/detail.htm?songId=37527519";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const variants = [
  { Accept: "*/*", Referer: referer },
  { Accept: "application/json", Referer: referer, "Accept-Encoding": "gzip, deflate, br" },
  { Accept: "application/json", Referer: referer, "X-Requested-With": "XMLHttpRequest", cookie: "PCID=1700000000000000000" },
  { Accept: "application/json", Referer: referer, Origin: "https://www.melon.com" },
  { Accept: "application/json", Referer: "https://m2.melon.com/song/detail.htm?songId=37527519" },
];

for (const [i, extra] of variants.entries()) {
  const { cookie, ...headersExtra } = extra;
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      "Accept-Language": "ko-KR,ko;q=0.9",
      ...headersExtra,
      ...(cookie ? { Cookie: cookie } : {}),
    },
  });
  const t = await res.text();
  console.log(i + 1, res.status, t.length, t.slice(0, 80));
}
