const UA = "Mozilla/5.0";
const js = await (await fetch("https://static.melon.co.kr/static/web/resource/script/w1/7x/m/8zbna4xujoeuvm9s.js", { headers: { "User-Agent": UA } })).text();
const jsonRefs = [...new Set([...js.matchAll(/[a-zA-Z0-9_/]+\.json/g)].map((m) => m[0]))];
console.log(jsonRefs.filter((s) => /song|play|listen|detail/i.test(s)).slice(0, 50));
