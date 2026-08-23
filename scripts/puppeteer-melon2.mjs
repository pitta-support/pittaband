import puppeteer from "puppeteer-core";
const songId = "37527519";
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  headless: "new",
});
const page = await browser.newPage();
const responses = [];
page.on("response", (res) => {
  const u = res.url();
  if (/melon\.com.*\.json/.test(u)) responses.push(`${res.status()} ${u.split("melon.com")[1]}`);
});
await page.goto(`https://www.melon.com/song/detail.htm?songId=${songId}`, { waitUntil: "networkidle2", timeout: 90000 });
await page.waitForTimeout(5000);
console.log("json responses", responses.slice(0, 30));
const text = await page.evaluate(() => document.body.innerText);
const lines = text.split("\n").map((l) => l.trim()).filter((l) => /누적|재생|listen|감상|[0-9,]{4,}/i.test(l));
console.log("interesting lines", lines.slice(0, 20));
await browser.close();
