import { flattenDiscographyTracks } from "./streaming-stats-lib.mjs";
import fs from "node:fs";
const d = JSON.parse(fs.readFileSync("data/discography.json", "utf8"));
const tracks = flattenDiscographyTracks(d).slice(0, 2);
console.log(JSON.stringify(tracks, null, 2));
