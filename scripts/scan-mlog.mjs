const js = await (await fetch("https://static.melon.co.kr/statistics/js/mlog.28ba021f940fcdaa81ff.js", { headers: { "User-Agent": "Mozilla/5.0" } })).text();
console.log("len", js.length);
for (const k of ["listenCount", "accPlayCnt", "detail.json", "playCount"]) {
  if (js.includes(k)) console.log(k);
}
