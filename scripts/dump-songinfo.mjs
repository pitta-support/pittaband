const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
for (const songId of ["37527519", "37527521"]) {
  const res = await fetch(`https://m2.melon.com/song/detail.json?songId=${songId}`, {
    headers: { "User-Agent": UA, Accept: "application/json", Referer: `https://www.melon.com/song/detail.htm?songId=${songId}` },
  });
  const data = await res.json();
  console.log("\n=== songId", songId, "===");
  console.log("SONGINFO", JSON.stringify(data.SONGINFO, null, 2));
}
