import puppeteer from "puppeteer-core";
const songId = "37527519";
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  headless: "new",
});
const page = await browser.newPage();
await page.goto(`https://www.melon.com/song/detail.htm?songId=${songId}`, { waitUntil: "networkidle2", timeout: 90000 });
await page.waitForTimeout(3000);
const html = await page.content();
for (const needle of ["listenCount", "accPlayCnt", "누적", "total_play", "play_count", "d_listen", "69432", "161309"]) {
  const idx = html.indexOf(needle);
  console.log(needle, idx >= 0 ? html.slice(Math.max(0, idx - 100), idx + 120).replace(/\s+/g, " ") : "missing");
}
const snippet = await page.evaluate(() => {
  const els = [...document.querySelectorAll("*")].filter((el) => /누적|전체|재생/.test(el.textContent || "") && (el.textContent || "").length < 80);
  return els.slice(0, 10).map((el) => ({ tag: el.tagName, class: el.className, text: el.textContent.trim() }));
});
console.log("els", snippet);
await browser.close();
