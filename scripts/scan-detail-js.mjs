const UA = "Mozilla/5.0";
const js = await (await fetch("https://static.melon.co.kr/static/web/resource/script/w1/7x/m/8zbna4xujoeuvm9s.js", { headers: { "User-Agent": UA } })).text();
console.log("len", js.length);
for (const k of ["detail.json", "listenCount", "accPlayCnt", "songInfo"]) {
  if (js.includes(k)) console.log("found", k);
}
const urls = [...new Set([...js.matchAll(/\/song\/[a-zA-Z0-9_.?=&-]+/g)].map((m) => m[0]))];
console.log(urls.slice(0, 30));
