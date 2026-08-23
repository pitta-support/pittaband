const UA = "Mozilla/5.0";
for (const songId of ["30314791", "32525352", "37527519"]) {
  const data = await (await fetch(`https://m2.melon.com/song/detail.json?songId=${songId}`, { headers: { "User-Agent": UA, Accept: "application/json" } })).json();
  console.log(songId, data.SONGINFO?.SONGNAMEWEBLIST, "SUMMCNT", data.SONGINFO?.SUMMCNT, "CMTCNT", data.CMTCNT);
}
