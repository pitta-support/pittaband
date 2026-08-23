import puppeteer from "puppeteer-core";
const songId = "37527519";
const browser = await puppeteer.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: "new" });
const page = await browser.newPage();
await page.goto(`https://www.melon.com/song/detail.htm?songId=${songId}`, { waitUntil: "networkidle2", timeout: 90000 });
const info = await page.evaluate(() => document.body.innerText);
console.log(info.slice(0, 2500));
await browser.close();
