import puppeteer from "puppeteer-core";
const songId = "37527519";
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  headless: "new",
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
let detailJson = null;
page.on("response", async (res) => {
  if (res.url().includes("/song/detail.json")) {
    console.log("saw detail.json", res.status(), res.url());
    if (res.status() === 200) {
      try {
        detailJson = await res.json();
      } catch (e) {
        console.log("json err", e.message);
      }
    }
  }
});
await page.goto(`https://www.melon.com/song/detail.htm?songId=${songId}`, { waitUntil: "networkidle2", timeout: 90000 });
await page.waitForTimeout(5000);
console.log("captured", !!detailJson);
if (detailJson?.songInfo) {
  console.log("listenCount", detailJson.songInfo.listenCount);
  console.log("accPlayCnt", detailJson.songInfo.accPlayCnt);
  console.log("songInfo keys", Object.keys(detailJson.songInfo).filter((k) => /listen|play|cnt|count/i.test(k)));
}
await browser.close();
