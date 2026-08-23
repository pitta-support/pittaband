const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
const html = await (await fetch("https://kworb.net/spotify/track/0VjIjW4GlUZAMYd2vXMi3b.html", { headers: { "User-Agent": UA } })).text();
const target = "800,733,682";
const idx = html.indexOf(target);
console.log("context", html.slice(idx - 200, idx + 200));
console.log("h1 area", html.match(/<h1[^>]*>[\s\S]{0,200}/)?.[0]);
console.log("bold nums", [...html.matchAll(/<b>([\d,]+)<\/b>/g)].slice(0,5).map(m=>m[1]));
