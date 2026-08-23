import {
  fetchMelonListenCount,
  fetchSpotifyStreamCount,
} from "./streaming-stats-lib.mjs";

const melonId = "37527521";
const spotifyId = "2w6yPgqtZDvKc5wwHwAQrr";

const melon = await fetchMelonListenCount(melonId);
const spotify = await fetchSpotifyStreamCount(spotifyId);

console.log(JSON.stringify({ melonId, melon, spotifyId, spotify }, null, 2));
