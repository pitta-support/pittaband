"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");
const crypto = require("crypto");

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 3000;
const ADMIN_PASSWORD = process.env.BOARD_ADMIN_PASSWORD || "";
const POSTS_FILE = path.join(ROOT, "data", "board-posts.json");
const MAX_TITLE = 200;
const MAX_CONTENT = 10000;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

function readPosts() {
  try {
    const raw = fs.readFileSync(POSTS_FILE, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data.posts) ? data.posts : [];
  } catch {
    return [];
  }
}

function writePosts(posts) {
  fs.mkdirSync(path.dirname(POSTS_FILE), { recursive: true });
  fs.writeFileSync(POSTS_FILE, JSON.stringify({ posts }, null, 2), "utf8");
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > 64 * 1024) {
        reject(new Error("Payload too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function isAdmin(req) {
  if (!ADMIN_PASSWORD) return false;
  const key = req.headers["x-board-admin-key"];
  if (!key || typeof key !== "string") return false;
  const a = Buffer.from(key);
  const b = Buffer.from(ADMIN_PASSWORD);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function sanitizeText(value, maxLen) {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .trim()
    .slice(0, maxLen);
}

function serveStatic(req, res, pathname) {
  let filePath = path.join(ROOT, pathname);

  if (pathname.endsWith("/")) {
    filePath = path.join(filePath, "index.html");
  }

  if (!filePath.startsWith(ROOT)) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      sendJson(res, 404, { error: "Not found" });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=3600",
    });
    fs.createReadStream(filePath).pipe(res);
  });
}

async function handleApi(req, res, pathname) {
  if (req.method === "POST" && pathname === "/api/board") {
    let body = "";
    try {
      body = await readBody(req);
    } catch {
      sendJson(res, 413, { error: "Payload too large" });
      return;
    }

    let data;
    try {
      data = JSON.parse(body || "{}");
    } catch {
      sendJson(res, 400, { error: "Invalid JSON" });
      return;
    }

    const title = sanitizeText(data.title, MAX_TITLE);
    const content = sanitizeText(data.content, MAX_CONTENT);

    if (!title || !content) {
      sendJson(res, 400, { error: "Title and content are required" });
      return;
    }

    const posts = readPosts();
    const entry = {
      id: crypto.randomUUID(),
      title,
      content,
      createdAt: new Date().toISOString(),
    };
    posts.unshift(entry);
    writePosts(posts);
    sendJson(res, 201, { ok: true });
    return;
  }

  if (req.method === "GET" && pathname === "/api/board/posts") {
    if (!ADMIN_PASSWORD) {
      sendJson(res, 503, { error: "Admin password not configured" });
      return;
    }
    if (!isAdmin(req)) {
      sendJson(res, 401, { error: "Unauthorized" });
      return;
    }
    sendJson(res, 200, { posts: readPosts() });
    return;
  }

  sendJson(res, 404, { error: "Not found" });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  let pathname = decodeURIComponent(url.pathname);

  if (pathname.startsWith("/api/")) {
    try {
      await handleApi(req, res, pathname);
    } catch {
      sendJson(res, 500, { error: "Server error" });
    }
    return;
  }

  if (pathname === "/") pathname = "/index.html";
  serveStatic(req, res, pathname);
});

server.listen(PORT, () => {
  console.log(`SCI-FI Archive server http://localhost:${PORT}`);
  if (!ADMIN_PASSWORD) {
    console.warn("BOARD_ADMIN_PASSWORD is not set. Admin board view is disabled.");
  }
});
