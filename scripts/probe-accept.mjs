const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const url = "https://www.melon.com/song/detail.json?songId=37527519";
const referer = "https://www.melon.com/song/detail.htm?songId=37527519";
for (const accept of ["text/html", "application/json", "application/json, text/plain, */*", "*/*"]) {
  const r = await fetch(url, { headers: { "User-Agent": UA, Accept: accept, Referer: referer } });
  console.log(accept, r.status, (await r.text()).length);
}
