import fs from "node:fs";

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
  "sec-ch-ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-origin",
};

const songId = "37527519";

async function tryJson(label, extra = {}) {
  const referer = `https://www.melon.com/song/detail.htm?songId=${songId}`;
  const url = `https://www.melon.com/song/detail.json?songId=${songId}`;
  const res = await fetch(url, {
    headers: {
      ...BROWSER_HEADERS,
      Accept: "application/json, text/javascript, */*; q=0.01",
      Referer: referer,
      "X-Requested-With": "XMLHttpRequest",
      ...extra,
    },
  });
  const text = await res.text();
  console.log(label, res.status, text.slice(0, 180));
  if (text) {
    try {
      const data = JSON.parse(text);
      console.log("  keys", Object.keys(data), "listenCount", data?.songInfo?.listenCount);
    } catch {}
  }
}

const html = fs.readFileSync("tmp-melon.html", "utf8");
console.log("html includes detail.json", html.includes("detail.json"));
const scriptSnips = [...html.matchAll(/detail\.json[^'\"]{0,80}/g)].map((m) => m[0]).slice(0, 5);
console.log("snips", scriptSnips);

await tryJson("plain");
await tryJson("with home cookie", {
  Cookie: "PCID=1234567890123456789012; melonPCID=1234567890123456789012",
});

const endpoints = [
  `https://www.melon.com/song/listen.json?songId=${songId}`,
  `https://www.melon.com/song/detail/info.json?songId=${songId}`,
  `https://www.melon.com/song/detail/info.htm?songId=${songId}`,
];
for (const url of endpoints) {
  const res = await fetch(url, {
    headers: {
      ...BROWSER_HEADERS,
      Accept: "application/json, text/plain, */*",
      Referer: `https://www.melon.com/song/detail.htm?songId=${songId}`,
    },
  });
  const t = await res.text();
  console.log("endpoint", url.split("/").pop(), res.status, t.slice(0, 120));
}
