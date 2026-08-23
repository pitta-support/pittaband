const UA = "Mozilla/5.0";
const urls = [
  "https://static.melon.co.kr/static/web/resource/script/w1/l7/6/un971rm8f9.js",
  "https://static.melon.co.kr/static/web/resource/script/w1/8k/8/1ed5h822hvv.js",
];
for (const url of urls) {
  const js = await (await fetch(url, { headers: { "User-Agent": UA } })).text();
  console.log("\n", url.split("/").pop(), "len", js.length);
  for (const k of ["detail.json", "listenCount", "accPlayCnt", "playCount", "getSongDetail"]) {
    if (js.includes(k)) console.log(" has", k, "count", js.split(k).length - 1);
  }
  const m = js.match(/detail\.json[^'\"]{0,80}/);
  if (m) console.log(" snippet", m[0]);
}
