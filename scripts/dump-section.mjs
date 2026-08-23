const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
const songId = "37527519";
const res = await fetch(`https://m2.melon.com/song/detail.json?songId=${songId}`, { headers: { "User-Agent": UA, Accept: "application/json" } });
const data = await res.json();
console.log(JSON.stringify(data.SECTION, null, 2).slice(0, 4000));
