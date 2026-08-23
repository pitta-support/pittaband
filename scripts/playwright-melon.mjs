import { chromium } from "playwright-core";
const songId = "37527519";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage();
let detailJson = null;
page.on("response", async (res) => {
  if (res.url().includes("/song/detail.json") && res.status() === 200) {
    try {
      detailJson = await res.json();
    } catch {}
  }
});
await page.goto(`https://www.melon.com/song/detail.htm?songId=${songId}`, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(3000);
console.log("detailJson captured", !!detailJson);
if (detailJson) {
  console.log("keys", Object.keys(detailJson));
  console.log("songInfo.listenCount", detailJson?.songInfo?.listenCount);
  console.log("songInfo fields sample", Object.keys(detailJson.songInfo || {}).slice(0, 20));
}
const html = await page.content();
const m = html.match(/listenCount[^0-9]{0,20}(\d+)/);
console.log("html listenCount", m?.[1]);
await browser.close();
