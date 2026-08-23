const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const referer = "https://www.melon.com/song/detail.htm?songId=37527519";
const headers = { "User-Agent": UA, Referer: referer, "Accept-Language": "ko-KR,ko;q=0.9" };
const url = "https://www.melon.com/song/detail.json?songId=37527519";
const r = await fetch(url, { method: "POST", headers: { ...headers, "Content-Type": "application/x-www-form-urlencoded" }, body: "songId=37527519" });
console.log("POST", r.status, await r.text());
