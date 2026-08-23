const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const BASE = {
  "User-Agent": UA,
  "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
};

function getSetCookie(headers) {
  const list = headers.getSetCookie?.() ?? [];
  if (list.length) return list.map((c) => c.split(";")[0]).join("; ");
  return headers.get("set-cookie") ?? "";
}

function mergeCookieJar(jar, setCookieHeader) {
  const map = new Map();
  for (const chunk of `${jar}; ${setCookieHeader}`.split(";")) {
    const part = chunk.trim();
    if (!part || !part.includes("=")) continue;
    map.set(part.split("=")[0], part);
  }
  return [...map.values()].join("; ");
}

async function fetchMelonHtml(songId) {
  let jar = "";
  for (const [url, referer] of [
    ["https://www.melon.com/", ""],
    [`https://www.melon.com/song/detail.htm?songId=${songId}`, "https://www.melon.com/"],
  ]) {
    const res = await fetch(url, {
      headers: {
        ...BASE,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        ...(referer ? { Referer: referer } : {}),
        ...(jar ? { Cookie: jar } : {}),
      },
    });
    jar = mergeCookieJar(jar, getSetCookie(res.headers));
    if (url.includes("detail.htm")) return { html: await res.text(), jar, status: res.status };
  }
  return { html: "", jar, status: 0 };
}

async function fetchMelonJson(songId, jar) {
  const referer = `https://www.melon.com/song/detail.htm?songId=${songId}`;
  const res = await fetch(`https://www.melon.com/song/detail.json?songId=${songId}`, {
    headers: {
      ...BASE,
      Accept: "application/json, text/javascript, */*; q=0.01",
      Referer: referer,
      "X-Requested-With": "XMLHttpRequest",
      ...(jar ? { Cookie: jar } : {}),
    },
  });
  return { status: res.status, text: await res.text() };
}

function scanMelonHtml(html) {
  const patterns = [
    ["listenCount JSON", /"listenCount"\s*:\s*(\d+)/],
    ["accPlayCnt JSON", /"accPlayCnt"\s*:\s*(\d+)/],
    ["playCount JSON", /"playCount"\s*:\s*(\d+)/],
    ["totPlayCnt JSON", /"totPlayCnt"\s*:\s*(\d+)/],
    ["누적 label", /\uB204\uC801[^0-9]{0,60}([\d,]+)/],
    ["play count class", /play_cnt[^>]*>([\d,]+)/i],
  ];
  for (const [name, re] of patterns) {
    const m = html.match(re);
    if (m) console.log("  melon html", name, "=>", m[1]);
  }
}

async function probeSong(songId, label) {
  console.log(`\n--- Melon ${label} (${songId}) ---`);
  const { html, jar, status } = await fetchMelonHtml(songId);
  console.log("html status", status, "len", html.length, "jar", jar.slice(0, 100));
  scanMelonHtml(html);
  const json = await fetchMelonJson(songId, jar);
  console.log("json status", json.status, "body", json.text.slice(0, 200));
  if (json.text) {
    try {
      const data = JSON.parse(json.text);
      console.log("json keys", Object.keys(data));
      console.log("songInfo.listenCount", data?.songInfo?.listenCount);
    } catch {}
  }
}

async function probeKworb(trackId) {
  const url = `https://kworb.net/spotify/track/${trackId}.html`;
  const res = await fetch(url, { headers: { ...BASE, Accept: "text/html", Referer: "https://kworb.net/" } });
  const html = await res.text();
  console.log(`\n--- Kworb ${trackId} status ${res.status} len ${html.length} ---`);
  const idx = html.indexOf("Total streams");
  if (idx >= 0) console.log("context", html.slice(idx, idx + 220));
  const m = html.match(/Total streams<\/td>\s*<td[^>]*>\s*([\d,]+)/i);
  console.log("regex match", m?.[1] ?? null);
}

await probeSong("37527521", "user Apollon id");
await probeSong("37527519", "discography Apollon id");

const tracks = JSON.parse(await (await import("node:fs/promises")).readFile("data/discography.json", "utf8"));
const flat = [];
for (const cat of ["album", "single", "ost"]) {
  for (const rel of tracks[cat] || []) {
    const list = rel.tracks?.length ? rel.tracks : [{ ...rel, links: rel.links }];
    for (const t of list) flat.push({ title: t.title, spotify: t.links?.spotify, melon: t.links?.melon });
  }
}
console.log("\nFirst 2 tracks:", flat.slice(0, 2).map((t) => t.title));
for (const t of flat.slice(0, 5)) {
  const id = t.spotify?.match(/track\/([a-zA-Z0-9]+)/)?.[1];
  if (id) await probeKworb(id);
}
