import fs from "node:fs";
import path from "node:path";
import {
  ROOT,
  flattenDiscographyTracks,
  fetchAllTrackStreamingStats,
  loadStreamingStatsFile,
  mergeStatsWithBaseline,
} from "./streaming-stats-lib.mjs";

const DISCO_PATH = path.join(ROOT, "data/discography.json");
const OUT_PATH = path.join(ROOT, "data/streaming-stats.json");
const DELAY_MS = 200;

async function main() {
  const discography = JSON.parse(fs.readFileSync(DISCO_PATH, "utf8"));
  const baseline = loadStreamingStatsFile(OUT_PATH);
  const tracks = flattenDiscographyTracks(discography);

  console.log(`Fetching streaming stats for ${tracks.length} tracks…`);

  const fetched = await fetchAllTrackStreamingStats(tracks, { delayMs: DELAY_MS });

  let melonHits = 0;
  let spotifyHits = 0;
  for (const stats of fetched) {
    if (stats.melon.total != null) melonHits += 1;
    if (stats.spotify.total != null) spotifyHits += 1;
    console.log(
      `${stats.key}: melon=${stats.melon.total ?? "—"} spotify=${stats.spotify.total ?? "—"}`
    );
  }

  const merged = mergeStatsWithBaseline(fetched, baseline);
  fs.writeFileSync(OUT_PATH, `${JSON.stringify(merged, null, 2)}\n`, "utf8");
  console.log(
    `\nWrote ${OUT_PATH} (updatedAt: ${merged.updatedAt}, melon=${melonHits}/${tracks.length}, spotify=${spotifyHits}/${tracks.length})`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
