const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const songId = "37527519";

function collect(headers) {
  return headers.getSetCookie?.() ?? [];
}

function jarFrom(setCookies) {
  return setCookies.map((c) => c.split(";")[0]).join("; ");
}

function merge(jar, setCookies) {
  const map = new Map();
  for (const part of `${jar}; ${jarFrom(setCookies)}`.split(";")) {
    const p = part.trim();
    if (!p.includes("=")) continue;
    map.set(p.split("=")[0], p);
  }
  return [...map.values()].join("; ");
}

let jar = "";
const base = {
  "User-Agent": UA,
  "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

for (const url of ["https://www.melon.com/", `https://www.melon.com/song/detail.htm?songId=${songId}`]) {
  const res = await fetch(url, { headers: { ...base, Cookie: jar, Referer: url.includes("detail") ? "https://www.melon.com/" : undefined } });
  const set = collect(res.headers);
  console.log("GET", url, res.status, "set-cookie count", set.length, set.map((c) => c.split(";")[0]));
  jar = merge(jar, set);
  await res.text();
}

console.log("final jar", jar);

const referer = `https://www.melon.com/song/detail.htm?songId=${songId}`;
const jsonRes = await fetch(`https://www.melon.com/song/detail.json?songId=${songId}`, {
  headers: {
    ...base,
    Accept: "application/json, text/javascript, */*; q=0.01",
    Referer: referer,
    Cookie: jar,
    "X-Requested-With": "XMLHttpRequest",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
  },
});
console.log("detail.json", jsonRes.status, jsonRes.headers.get("content-type"));
const text = await jsonRes.text();
console.log(text.slice(0, 500));
if (text) {
  try {
    const data = JSON.parse(text);
    console.log("keys", Object.keys(data));
    console.log("songInfo keys", data.songInfo ? Object.keys(data.songInfo) : null);
    console.log("listenCount", data?.songInfo?.listenCount);
  } catch (e) {
    console.log("parse err", e.message);
  }
}
