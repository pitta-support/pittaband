const UA = "Mozilla/5.0";
const data = await (await fetch("https://m2.melon.com/song/detail.json?songId=37527519", { headers: { "User-Agent": UA, Accept: "application/json" } })).json();
function walk(obj, p = "") {
  if (!obj || typeof obj !== "object") return;
  for (const [k, v] of Object.entries(obj)) {
    const path = p ? `${p}.${k}` : k;
    if (/cnt|count|listen|play|stream|total/i.test(k)) console.log(path, v);
    if (v && typeof v === "object" && path.split(".").length < 5) walk(v, path);
  }
}
walk(data);
