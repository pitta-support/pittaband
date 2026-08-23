const fs = require("fs");
const path = require("path");

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 Melon/Android",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
  Referer: "https://www.melon.com/song/detail.htm?songId=37527521",
  Origin: "https://www.melon.com",
};

async function fetchUrl(url, extraHeaders = {}) {
  const res = await fetch(url, { headers: { ...HEADERS, ...extraHeaders } });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, ok: res.ok, text, json };
}

function allPaths(obj, prefix = "") {
  const out = [];
  if (obj && typeof obj === "object") {
    if (Array.isArray(obj)) {
      obj.forEach((v, i) => out.push(...allPaths(v, `${prefix}[${i}]`)));
    } else {
      for (const k of Object.keys(obj)) {
        const p = prefix ? `${prefix}.${k}` : k;
        out.push(p);
        out.push(...allPaths(obj[k], p));
      }
    }
  }
  return out;
}

function findPlayPaths(obj, prefix = "", hits = []) {
  const keyRe = /play|acc|listen|stream|count|tot/i;
  if (obj && typeof obj === "object") {
    if (Array.isArray(obj)) {
      obj.forEach((v, i) => findPlayPaths(v, `${prefix}[${i}]`, hits));
    } else {
      for (const [k, v] of Object.entries(obj)) {
        const p = prefix ? `${prefix}.${k}` : k;
        if (keyRe.test(k)) hits.push({ path: p, value: v });
        findPlayPaths(v, p, hits);
      }
    }
  }
  return hits;
}

function pickCumulative(hits) {
  const priority = [
    /accplay/i,
    /totplay/i,
    /acc.*play/i,
    /cumulative/i,
    /total.*play/i,
    /playcnt/i,
    /playcount/i,
  ];
  for (const re of priority) {
    const m = hits.find((h) => re.test(h.path) && (typeof h.value === "number" || /^\d+$/.test(String(h.value))));
    if (m) return m;
  }
  return hits.find((h) => /play/i.test(h.path) && (typeof h.value === "number" || /^\d+$/.test(String(h.value))));
}

(async () => {
  const report = { melon: {}, spotify: {}, cumulativePlayPath: null };
  const detailUrl = "https://m2.melon.com/song/detail.json?songId=37527521";
  console.log("=== 1. detail.json ===");
  const detail = await fetchUrl(detailUrl);
  console.log("status:", detail.status);
  report.melon.detail = { status: detail.status };
  if (detail.json) {
    const outPath = path.join("scripts", "melon-debug.json");
    fs.writeFileSync(outPath, JSON.stringify(detail.json, null, 2));
    console.log("Saved", outPath);
    const paths = allPaths(detail.json);
    console.log("top-level:", Object.keys(detail.json).join(", "));
    console.log("path count:", paths.length);
    const hits = findPlayPaths(detail.json);
    console.log("play-related hits:", JSON.stringify(hits, null, 2));
    report.melon.detail.hits = hits;
    const cum = pickCumulative(hits);
    if (cum) report.cumulativePlayPath = cum.path;
  } else {
    console.log("body:", detail.text.slice(0, 400));
    report.melon.detail.bodySample = detail.text.slice(0, 400);
  }

  const urls = [
    "https://m2.melon.com/chartflow/report/basic.json?songId=37527521",
    "https://m2.melon.com/chartflow/report/weekly.json?songId=37527521",
    "https://www.melon.com/song/getSongInfo.json?songId=37527521",
    "https://m2.melon.com/song/playcount.json?songId=37527521",
    "https://m2.melon.com/song/accPlayCnt.json?songId=37527521",
    "https://m2.melon.com/song/accPlayCount.json?songId=37527521",
    "https://m2.melon.com/song/detail/info.json?songId=37527521",
    "https://m2.melon.com/song/streaming.json?songId=37527521",
    "https://m2.melon.com/song/listen.json?songId=37527521",
    "https://m2.melon.com/song/acc.json?songId=37527521",
  ];

  console.log("\n=== 2. other Melon URLs ===");
  for (const url of urls) {
    const r = await fetchUrl(url);
    console.log("\nURL:", url);
    console.log("status:", r.status);
    const entry = { status: r.status };
    if (r.json) {
      entry.topKeys = Object.keys(r.json);
      const hits = findPlayPaths(r.json);
      entry.hits = hits;
      console.log("top keys:", entry.topKeys.join(", "));
      if (hits.length) console.log("hits:", JSON.stringify(hits.slice(0, 20), null, 2));
      else console.log("sample:", JSON.stringify(r.json).slice(0, 350));
      const cum = pickCumulative(hits);
      if (cum && !report.cumulativePlayPath) report.cumulativePlayPath = cum.path;
    } else {
      entry.bodySample = r.text.slice(0, 250);
      console.log("body:", entry.bodySample);
    }
    report.melon[url] = entry;
  }

  console.log("\n=== 3. Spotify ===");
  const spUrl = "https://open.spotify.com/track/2w6yPgqtZDvKc5wwHwAQrr";
  const spRes = await fetch(spUrl, {
    headers: {
      "User-Agent": HEADERS["User-Agent"],
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  const html = await spRes.text();
  console.log("status:", spRes.status, "len:", html.length);
  report.spotify = { status: spRes.status, length: html.length };
  const re = /playcount|playCount|play_count/gi;
  let m;
  const matches = [];
  while ((m = re.exec(html)) !== null) {
    matches.push({ index: m.index, match: m[0], context: html.slice(Math.max(0, m.index - 60), m.index + 80) });
    if (matches.length >= 5) break;
  }
  report.spotify.matches = matches;
  if (matches.length) console.log("matches:", JSON.stringify(matches, null, 2));
  else console.log("No playcount/playCount in HTML");

  console.log("\n=== CUMULATIVE PLAY PATH ===");
  console.log(report.cumulativePlayPath || "(not found in probed JSON)");
  fs.writeFileSync(path.join("scripts", "melon-probe-report.json"), JSON.stringify(report, null, 2));
  console.log("Wrote scripts/melon-probe-report.json");
})();
