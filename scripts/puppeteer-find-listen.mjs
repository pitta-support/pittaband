import puppeteer from "puppeteer-core";
const songIds = ["37527521", "37527519"];
const browser = await puppeteer.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: "new" });
const page = await browser.newPage();
page.on("response", async (res) => {
  try {
    const ct = res.headers()["content-type"] || "";
    if (!ct.includes("json")) return;
    const t = await res.text();
    if (/listenCount|accPlayCnt|playCnt/i.test(t)) {
      console.log("HIT", res.status(), res.url().slice(0, 120));
      console.log(t.slice(0, 400));
    }
  } catch {}
});
for (const songId of songIds) {
  console.log("\n=== song", songId, "===");
  await page.goto(`https://www.melon.com/song/detail.htm?songId=${songId}`, { waitUntil: "networkidle2", timeout: 90000 });
  await page.waitForTimeout(2000);
}
await browser.close();
