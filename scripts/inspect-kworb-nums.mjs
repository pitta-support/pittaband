const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
const html = await (await fetch("https://kworb.net/spotify/track/0VjIjW4GlUZAMYd2vXMi3b.html", { headers: { "User-Agent": UA } })).text();
const nums = [...html.matchAll(/\b(\d{1,3}(?:,\d{3})+)\b/g)].map((m) => m[1]);
console.log("top nums", nums.slice(0, 30));
console.log("snippet around weekly", html.slice(3300, 3800));
