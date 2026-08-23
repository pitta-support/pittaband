import fs from "node:fs";
const h = fs.readFileSync("tmp-melon.html", "utf8");
const scripts = [...h.matchAll(/src=\"([^\"]+\.js[^\"]*)\"/g)].map((m) => m[1].startsWith("http") || m[1].startsWith("//") ? m[1].replace(/^\/\//, "https:") : "https://www.melon.com" + m[1]);
const UA = "Mozilla/5.0";
for (const url of scripts) {
  const js = await (await fetch(url, { headers: { "User-Agent": UA } })).text();
  if (/listenCount|accPlayCnt|playCnt|PLAYCNT/i.test(js)) {
    console.log("HIT", url);
    const m = js.match(/listenCount|accPlayCnt|playCnt|PLAYCNT/gi);
    console.log(m?.slice(0,5));
  }
}
