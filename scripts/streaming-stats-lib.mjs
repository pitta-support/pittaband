import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fetchTrackPlaycountViaPathfinder } from "./spotify-web-tokens.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
};

export function buildTrackKey(category, releaseId, trackId) {
  return `${category}/${releaseId}/${trackId}`;
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
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
  }).format(new Date());
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

export async function fetchSpotifyStreamCount(trackId, fetchImpl = fetch) {
  if (!trackId) return null;

  const fromPathfinder = await fetchSpotifyStreamCountViaPathfinder(
    trackId,
    fetchImpl
  );
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
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
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

export function loadStreamingStatsFile(
  filePath = path.join(ROOT, "data/streaming-stats.json")
) {
  if (!fs.existsSync(filePath)) {
    return { updatedAt: todayIso(), source: "spotify", tracks: {} };
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function mergeStatsWithBaseline(fetchedTracks, baseline = { tracks: {} }) {
  const tracks = {};

  for (const item of fetchedTracks) {
    const prev = baseline.tracks?.[item.key] || {};
    tracks[item.key] = {
      spotify: {
        total: item.spotify.total,
        delta: computeDelta(item.spotify.total, prev.spotify?.total),
      },
    };
  }

  return {
    updatedAt: todayIso(),
    source: "spotify",
    tracks,
  };
}
