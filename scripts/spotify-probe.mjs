#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import {
  getSpotifyWebPlayerSession,
  fetchTrackPlaycountViaPathfinder,
} from "./spotify-web-tokens.mjs";
import { ROOT } from "./streaming-stats-lib.mjs";

const require = createRequire(import.meta.url);
const SpotifyWebApi = require("spotify-web-api-node");
const trackId = process.argv[2] || "2w6yPgqtZDvKc5wwHwAQrr";

function loadDotEnv() {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

async function main() {
  loadDotEnv();
  console.log("Probing Spotify web session…");
  const session = await getSpotifyWebPlayerSession(fetch);
  console.log("Session OK:", {
    clientId: session.clientId,
    clientVersion: session.clientVersion,
    hasClientToken: Boolean(session.clientToken),
    expiresAtMs: session.expiresAtMs,
  });

  const clientId = process.env.SPOTIFY_CLIENT_ID?.trim();
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET?.trim();
  if (clientId && clientSecret) {
    const api = new SpotifyWebApi({ clientId, clientSecret });
    const token = await api.clientCredentialsGrant();
    api.setAccessToken(token.body.access_token);
    const track = await api.getTrack(trackId);
    console.log("Official API track:", track.body.name);
  }

  const count = await fetchTrackPlaycountViaPathfinder(trackId, fetch);
  console.log(`Play count for ${trackId}:`, count ?? "—");
}

main().catch((err) => {
  console.error("Probe failed:", err?.message || err);
  process.exit(1);
});
