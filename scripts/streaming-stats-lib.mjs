import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
};

import { fetchTrackPlaycountViaPathfinder } from "./spotify-web-tokens.mjs";

const MELON_MOBILE_HEADERS = {
  ...BROWSER_HEADERS,
  "User-Agent":
    "Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 Melon/Android",
};

export function buildTrackKey(category, releaseId, trackId) {
  return `${category}/${releaseId}/${trackId}`;
}

export function parseMelonSongId(url) {
  if (!url) return null;
  const match = String(url).match(/songId=(\d+)/i);
  return match ? match[1] : null;
}

export function parseSpotifyTrackId(url) {
  if (!url) return null;
  const match = String(url).match(/track\/([a-zA-Z0-9]+)/i);
  return match ? match[1] : null;
}

const STREAMING_CATEGORY_PRIORITY = { single: 0, ost: 1, album: 2 };

export function shouldIncludeInStreamingList(track) {
  const title = String(track?.title || "").trim();
  if (!title) return false;
  if (/^INTRO$/i.test(title)) return false;
  if (/\(inst\.?\)/i.test(title)) return false;
  return true;
}

function dedupeStreamingTracksBySpotifyId(tracks) {
  const bySpotifyId = new Map();
  const withoutSpotify = [];

  for (const track of tracks) {
    const spotifyId = parseSpotifyTrackId(track.links?.spotify);
    if (!spotifyId) {
      withoutSpotify.push(track);
      continue;
    }

    const existing = bySpotifyId.get(spotifyId);
    if (!existing) {
      bySpotifyId.set(spotifyId, track);
      continue;
    }

    const existingPriority =
      STREAMING_CATEGORY_PRIORITY[existing.category] ?? 99;
    const trackPriority = STREAMING_CATEGORY_PRIORITY[track.category] ?? 99;
    if (trackPriority < existingPriority) {
      bySpotifyId.set(spotifyId, track);
    }
  }

  return [...bySpotifyId.values(), ...withoutSpotify];
}

export function flattenDiscographyTracksForStreaming(discography) {
  const tracks = flattenDiscographyTracks(discography).filter(
    shouldIncludeInStreamingList
  );
  return dedupeStreamingTracksBySpotifyId(tracks);
}

export function flattenDiscographyTracks(discography) {
  const rows = [];
  const categories = ["album", "single", "ost"];

  for (const category of categories) {
    for (const release of discography?.[category] || []) {
      const releaseLinks = release.links || {};
      const cover = release.cover || "";

      if (Array.isArray(release.tracks) && release.tracks.length > 0) {
        for (const track of release.tracks) {
          const links = { ...releaseLinks, ...(track.links || {}) };
          rows.push({
            key: buildTrackKey(category, release.id, track.id),
            title: track.title,
            cover,
            links,
            category,
          });
        }
      } else {
        rows.push({
          key: buildTrackKey(category, release.id, release.id),
          title: release.title,
          cover,
          links: releaseLinks,
          category,
        });
      }
    }
  }

  return rows;
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function collectCookies(response, existing = "") {
  const setCookies =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [];
  const merged = [
    ...existing
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean),
    ...setCookies.map((cookie) => cookie.split(";")[0]),
  ];
  const jar = new Map();
  for (const entry of merged) {
    const [name, ...rest] = entry.split("=");
    if (name) jar.set(name.trim(), rest.join("=").trim());
  }
  return [...jar.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
}

function ensureMelonPcid(cookieHeader = "") {
  if (/PCID=/.test(cookieHeader)) return cookieHeader;
  const pcid = `PCID${Date.now()}${Math.floor(Math.random() * 1e10)}`;
  return cookieHeader ? `${cookieHeader}; PCID=${pcid}` : `PCID=${pcid}`;
}

export async function establishMelonSession(fetchImpl = fetch) {
  let cookieHeader = "";
  try {
    const res = await fetchImpl("https://www.melon.com/index.htm", {
      headers: {
        ...MELON_MOBILE_HEADERS,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
    });
    cookieHeader = collectCookies(res, cookieHeader);
  } catch {
    /* continue with generated PCID */
  }
  return ensureMelonPcid(cookieHeader);
}

export async function fetchMelonListenCountBatch(
  songIds,
  fetchImpl = fetch,
  cookieHeader = ""
) {
  const ids = [...new Set((songIds || []).filter(Boolean).map(String))];
  if (!ids.length) return {};

  const envPcid = process.env.MELON_PCID?.trim();
  const sessionCookie = envPcid
    ? ensureMelonPcid(`PCID=${envPcid}`)
    : ensureMelonPcid(cookieHeader);
  const referer = `https://www.melon.com/song/detail.htm?songId=${ids[0]}`;
  const map = {};

  const jsonUrl = `https://www.melon.com/song/listSongAccCnt.json?songIds=${ids.join(",")}`;
  try {
    const res = await fetchImpl(jsonUrl, {
      headers: {
        ...MELON_MOBILE_HEADERS,
        Accept: "application/json, text/plain, */*",
        Referer: referer,
        Cookie: sessionCookie,
      },
    });
    if (res.ok) {
      const data = await res.json();
      const rows = data?.response?.SONGACCPLAYCNT || data?.SONGACCPLAYCNT || [];
      for (const row of rows) {
        const songId = String(row?.SONGID ?? row?.songId ?? "");
        const count = normalizeCount(row?.ACCPLAYCNT ?? row?.accPlayCnt);
        if (songId && count != null) map[songId] = count;
      }
      if (Object.keys(map).length) return map;
    }
  } catch {
    /* try POST fallback */
  }

  try {
    const res = await fetchImpl(
      "https://www.melon.com/common/player/listSongAccCnt.htm",
      {
        method: "POST",
        headers: {
          ...MELON_MOBILE_HEADERS,
          Accept: "application/json, text/plain, */*",
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          Referer: referer,
          Cookie: sessionCookie,
        },
        body: `songIds=${ids.join(",")}`,
      }
    );
    if (!res.ok) return map;
    const text = await res.text();
    let data = null;
    try {
      data = JSON.parse(text);
    } catch {
      return map;
    }
    const rows = data?.response?.SONGACCPLAYCNT || data?.SONGACCPLAYCNT || [];
    for (const row of rows) {
      const songId = String(row?.SONGID ?? row?.songId ?? "");
      const count = normalizeCount(row?.ACCPLAYCNT ?? row?.accPlayCnt);
      if (songId && count != null) map[songId] = count;
    }
  } catch {
    return map;
  }

  return map;
}

export function extractMelonCountFromHtml(html) {
  const patterns = [
    /"listenCount"\s*:\s*"?(\d+)"?/,
    /"accPlayCnt"\s*:\s*"?(\d+)"?/,
    /"TOTPLAYCNT"\s*:\s*"?(\d+)"?/,
    /"TOTALPLAYCNT"\s*:\s*"?(\d+)"?/,
    /"playCount"\s*:\s*"?(\d+)"?/,
    /누적[^0-9]{0,40}([\d,]+)/,
    /총[^0-9]{0,20}([\d,]+)\s*회/,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return normalizeCount(match[1]);
  }

  return null;
}

export function extractSpotifyCountFromHtml(html) {
  const patterns = [
    /"playcount"\s*:\s*(\d+)/i,
    /"playCount"\s*:\s*(\d+)/,
    /"streamCount"\s*:\s*(\d+)/,
    /Total streams<\/td>\s*<td[^>]*>\s*([\d,]+)/i,
    /Total streams[\s\S]{0,200}?>\s*([\d,]+)\s*</i,
    /([\d,]+)\s*streams on Spotify/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return normalizeCount(match[1]);
  }

  return null;
}

async function fetchSpotifyStreamCountViaPathfinder(trackId, fetchImpl = fetch) {
  try {
    return await fetchTrackPlaycountViaPathfinder(trackId, fetchImpl);
  } catch {
    return null;
  }
}

export async function fetchMelonListenCount(
  songId,
  fetchImpl = fetch,
  cookieHeader = ""
) {
  if (!songId) return null;

  const batch = await fetchMelonListenCountBatch([songId], fetchImpl, cookieHeader);
  if (batch[songId] != null) return batch[songId];

  const referer = `https://www.melon.com/song/detail.htm?songId=${songId}`;

  let sessionCookie = ensureMelonPcid(cookieHeader);
  try {
    const pageRes = await fetchImpl(referer, {
      headers: {
        ...MELON_MOBILE_HEADERS,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        Referer: "https://www.melon.com/",
        Cookie: sessionCookie,
      },
      redirect: "follow",
    });
    sessionCookie = collectCookies(pageRes, sessionCookie);
    const html = await pageRes.text();
    const fromHtml = extractMelonCountFromHtml(html);
    if (fromHtml != null) return fromHtml;
  } catch {
    /* continue with JSON endpoints */
  }

  const retryBatch = await fetchMelonListenCountBatch(
    [songId],
    fetchImpl,
    sessionCookie
  );
  if (retryBatch[songId] != null) return retryBatch[songId];

  const jsonUrls = [
    `https://m2.melon.com/song/detail.json?songId=${songId}`,
    `https://www.melon.com/song/detail.json?songId=${songId}`,
  ];

  for (const jsonUrl of jsonUrls) {
    try {
      const res = await fetchImpl(jsonUrl, {
        headers: {
          ...MELON_MOBILE_HEADERS,
          Accept: "application/json, text/plain, */*",
          Referer: referer,
          Cookie: sessionCookie,
        },
      });
      if (!res.ok) continue;
      const data = await res.json();
      const count =
        data?.songInfo?.listenCount ??
        data?.songInfo?.TOTPLAYCNT ??
        data?.listenCount ??
        data?.accPlayCnt ??
        data?.TOTPLAYCNT ??
        data?.response?.SONGACCPLAYCNT?.[0]?.ACCPLAYCNT ??
        data?.songs?.[0]?.accPlayCnt ??
        data?.songs?.[0]?.listenCount;
      const normalized = normalizeCount(count);
      if (normalized != null) return normalized;
    } catch {
      /* try next endpoint */
    }
  }

  return null;
}

export async function fetchSpotifyStreamCount(trackId, fetchImpl = fetch) {
  if (!trackId) return null;

  const fromPathfinder = await fetchSpotifyStreamCountViaPathfinder(trackId, fetchImpl);
  if (fromPathfinder != null) return fromPathfinder;

  const urls = [
    `https://kworb.net/spotify/track/${trackId}.html`,
    `https://open.spotify.com/track/${trackId}`,
  ];

  for (const pageUrl of urls) {
    try {
      const res = await fetchImpl(pageUrl, {
        headers: {
          ...BROWSER_HEADERS,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          Referer: "https://open.spotify.com/",
        },
        redirect: "follow",
      });
      if (!res.ok) continue;
      const html = await res.text();
      const count = extractSpotifyCountFromHtml(html);
      if (count != null) return count;
    } catch {
      /* try next source */
    }
  }

  return null;
}

export function normalizeCount(value) {
  if (value == null || value === "") return null;
  const num = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(num) ? num : null;
}

export function computeDelta(current, previous) {
  const cur = normalizeCount(current);
  const prev = normalizeCount(previous);
  if (cur == null) return 0;
  if (prev == null) return 0;
  return cur - prev;
}

export async function fetchAllTrackStreamingStats(
  tracks,
  { fetchImpl = fetch, delayMs = 250, batchSize = 50 } = {}
) {
  const melonSession = await establishMelonSession(fetchImpl);
  const melonIds = tracks
    .map((track) => parseMelonSongId(track.links?.melon))
    .filter(Boolean);
  const melonCounts = {};

  for (let i = 0; i < melonIds.length; i += batchSize) {
    const chunk = melonIds.slice(i, i + batchSize);
    const batch = await fetchMelonListenCountBatch(chunk, fetchImpl, melonSession);
    Object.assign(melonCounts, batch);
    if (delayMs > 0 && i + batchSize < melonIds.length) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  const results = [];
  for (let i = 0; i < tracks.length; i += 1) {
    const track = tracks[i];
    if (delayMs > 0 && i > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    const melonId = parseMelonSongId(track.links?.melon);
    const spotifyId = parseSpotifyTrackId(track.links?.spotify);
    const melonTotal =
      melonId && melonCounts[melonId] != null
        ? melonCounts[melonId]
        : await fetchMelonListenCount(melonId, fetchImpl, melonSession);
    const spotifyTotal = await fetchSpotifyStreamCount(spotifyId, fetchImpl);

    results.push({
      key: track.key,
      melon: { total: melonTotal },
      spotify: { total: spotifyTotal },
    });
  }

  return results;
}

export async function fetchTrackStreamingStats(track, { fetchImpl = fetch, delayMs = 0 } = {}) {
  if (delayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  const melonId = parseMelonSongId(track.links?.melon);
  const spotifyId = parseSpotifyTrackId(track.links?.spotify);
  const melonSession = await establishMelonSession(fetchImpl);

  const [melonTotal, spotifyTotal] = await Promise.all([
    fetchMelonListenCount(melonId, fetchImpl, melonSession),
    fetchSpotifyStreamCount(spotifyId, fetchImpl),
  ]);

  return {
    key: track.key,
    melon: { total: melonTotal },
    spotify: { total: spotifyTotal },
  };
}

export function loadStreamingStatsFile(filePath = path.join(ROOT, "data/streaming-stats.json")) {
  if (!fs.existsSync(filePath)) {
    return { updatedAt: todayIso(), tracks: {} };
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function mergeStatsWithBaseline(fetchedTracks, baseline = { tracks: {} }) {
  const tracks = {};

  for (const item of fetchedTracks) {
    const prev = baseline.tracks?.[item.key] || {};
    tracks[item.key] = {
      melon: {
        total: item.melon.total,
        delta: computeDelta(item.melon.total, prev.melon?.total),
      },
      spotify: {
        total: item.spotify.total,
        delta: computeDelta(item.spotify.total, prev.spotify?.total),
      },
    };
  }

  return {
    updatedAt: todayIso(),
    tracks,
  };
}
