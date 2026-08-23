#!/usr/bin/env node
/**
 * Daily Spotify stream count fetcher for Pitta Band Archive.
 *
 * Uses spotify-web-api-node (Client Credentials) for official Web API access.
 * Cumulative play counts come from Spotify Pathfinder / kworb / page HTML —
 * the official Web API does not expose total stream counts.
 *
 * Run locally:
 *   cp .env.example .env   # add credentials
 *   npm run fetch:streaming
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import {
  ROOT,
  flattenDiscographyTracksForStreaming,
  fetchSpotifyStreamCount,
  loadStreamingStatsFile,
  computeDelta,
  parseSpotifyTrackId,
  todayIso,
} from "./streaming-stats-lib.mjs";
import { getSpotifyWebPlayerSession } from "./spotify-web-tokens.mjs";

const require = createRequire(import.meta.url);
const SpotifyWebApi = require("spotify-web-api-node");

const ENV_PATH = path.join(ROOT, ".env");
const DISCO_PATH = path.join(ROOT, "data/discography.json");
const OUT_PATH = path.join(ROOT, "data/streaming-stats.json");
const REQUEST_DELAY_MS = 250;

function log(message) {
  process.stdout.write(`${message}\n`);
}

function loadDotEnv(filePath = ENV_PATH) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mergeSpotifyStats(fetchedTracks, baseline = { tracks: {} }) {
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

async function createSpotifyApi() {
  const clientId = process.env.SPOTIFY_CLIENT_ID?.trim();
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET.\n" +
        "Set them in .env (see .env.example) or GitHub Actions secrets."
    );
  }

  const api = new SpotifyWebApi({ clientId, clientSecret });
  const token = await api.clientCredentialsGrant();
  api.setAccessToken(token.body.access_token);
  return api;
}

async function main() {
  log("Pitta Spotify stats fetcher starting…");
  loadDotEnv();

  const discography = JSON.parse(fs.readFileSync(DISCO_PATH, "utf8"));
  const baseline = loadStreamingStatsFile(OUT_PATH);
  const tracks = flattenDiscographyTracksForStreaming(discography);

  log(`Fetching Spotify stats for ${tracks.length} tracks…`);

  const api = await createSpotifyApi();
  log("Spotify Client Credentials OK (spotify-web-api-node)");

  try {
    await getSpotifyWebPlayerSession(fetch);
    log("Spotify web player session OK (TOTP + Pathfinder)");
  } catch (err) {
    throw new Error(
      `Spotify web player session failed: ${err?.message || err}\n` +
        "Play counts require Spotify's internal API; check network access."
    );
  }

  const sampleId = tracks
    .map((track) => parseSpotifyTrackId(track.links?.spotify))
    .find(Boolean);

  if (sampleId) {
    const sample = await api.getTrack(sampleId);
    log(
      `Official Web API OK (sample: ${sample.body.name} / ${sampleId})`
    );
  }

  const fetched = [];
  let success = 0;
  let firstFailureLogged = false;

  for (let index = 0; index < tracks.length; index += 1) {
    const track = tracks[index];
    if (index > 0) await sleep(REQUEST_DELAY_MS);

    const spotifyId = parseSpotifyTrackId(track.links?.spotify);
    let total = null;

    if (spotifyId) {
      total = await fetchSpotifyStreamCount(spotifyId);
      if (total != null) {
        success += 1;
      } else if (!firstFailureLogged) {
        log(
          `Warning: could not read play count for ${track.title} (${spotifyId}). Trying fallbacks for remaining tracks…`
        );
        firstFailureLogged = true;
      }
    }

    fetched.push({
      key: track.key,
      spotify: { total },
    });

    log(`[${index + 1}/${tracks.length}] ${track.title}: ${total ?? "—"}`);
  }

  const output = mergeSpotifyStats(fetched, baseline);
  fs.writeFileSync(OUT_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  log(
    `\nWrote ${OUT_PATH}\nupdatedAt: ${output.updatedAt}\nspotify: ${success}/${tracks.length} tracks with counts`
  );
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});
