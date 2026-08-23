import fs from "node:fs";
const h = fs.readFileSync("tmp-melon.html", "utf8");
const scripts = [...h.matchAll(/src=\"([^\"]+\.js[^\"]*)\"/g)].map((m) => m[1].startsWith("http") || m[1].startsWith("//") ? m[1].replace(/^\/\//, "https:") : "https://www.melon.com" + m[1]);
const UA = "Mozilla/5.0";
for (const url of scripts) {
  try {
    const js = await (await fetch(url, { headers: { "User-Agent": UA } })).text();
    if (js.includes("detail.json") || js.includes("listenCount") || js.includes("accPlayCnt")) {
      console.log("HIT", url.split("/").slice(-1)[0], "detail.json", js.includes("detail.json"), "listenCount", js.includes("listenCount"));
      const idx = js.indexOf("detail.json");
      if (idx >= 0) console.log(" snippet", js.slice(Math.max(0, idx - 60), idx + 60));
    }
  } catch (e) {
    console.log("fail", url, e.message);
  }
}
