const UA = "Mozilla/5.0";
const js = await (await fetch("https://www.melon.com/resource/script/web/clean/melonweb_clean.js?_resVer=700ea91a5b3de6a68f3cfef4e629b86a", { headers: { "User-Agent": UA } })).text();
for (const k of ["listenCount", "accPlayCnt", "detail.json", "playCount", "getSongDetail"]) {
  if (js.includes(k)) console.log(k, js.split(k).length - 1);
}
const matches = [...js.matchAll(/['"]([^'"]*(?:listen|play|detail)[^'"]*)['"]/g)].map((m) => m[1]).filter((s) => s.includes(".json") || s.includes(".htm"));
console.log("json-like", [...new Set(matches)].slice(0, 40));
