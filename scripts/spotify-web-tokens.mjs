import crypto from "node:crypto";

const SECRETS_URL =
  process.env.SPOTIFY_TOTP_SECRETS_URL ||
  "https://code.thetadev.de/ThetaDev/spotify-secrets/raw/branch/main/secrets/secretDict.json";

const FALLBACK_SECRET = {
  version: 61,
  bytes: [
    44, 55, 47, 42, 70, 40, 34, 114, 76, 74, 50, 111, 120, 97, 75, 76, 94,
    102, 43, 69, 49, 120, 118, 80, 64, 78,
  ],
};

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
};

const SPOTIFY_TRACK_QUERY_HASH =
  "612585ae06ba435ad26369870deaae23b5c8800a256cd8a57e08eddc25a37294";

const PATHFINDER_URLS = [
  "https://api-partner.spotify.com/pathfinder/v1/query",
  "https://api-partner.spotify.com/pathfinder/v2/query",
];

let secretsCache = null;
let secretsCacheExpiry = 0;
let sessionCache = null;

function base32Encode(buffer) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += alphabet[(value << (5 - bits)) & 31];
  }

  return output;
}

function base32Decode(input) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const map = Object.fromEntries(
    [...alphabet].map((char, index) => [char, index])
  );
  const normalized = input.toUpperCase().replace(/=+$/g, "");
  let bits = 0;
  let value = 0;
  const bytes = [];

  for (const char of normalized) {
    if (!(char in map)) continue;
    value = (value << 5) | map[char];
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

function generateTotpCode(secretBase32, timestampSec = Math.floor(Date.now() / 1000)) {
  const counter = Math.floor(timestampSec / 30);
  const key = base32Decode(secretBase32);
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const digest = crypto.createHmac("sha1", key).update(buffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const code =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  return String(code % 1_000_000).padStart(6, "0");
}

function buildTotpSecret(secretBytes) {
  const transformed = secretBytes.map((value, index) =>
    value ^ ((index % 33) + 9)
  );
  const joined = transformed.map(String).join("");
  return base32Encode(Buffer.from(joined, "utf8"));
}

async function fetchTotpSecrets(fetchImpl = fetch) {
  if (secretsCache && Date.now() < secretsCacheExpiry) {
    return secretsCache;
  }

  try {
    const response = await fetchImpl(SECRETS_URL, {
      headers: { ...BROWSER_HEADERS, Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const secrets = await response.json();
    const version = Number(
      Object.keys(secrets)
        .map(Number)
        .filter(Number.isFinite)
        .sort((a, b) => b - a)[0]
    );
    const bytes = secrets[String(version)];
    if (!Array.isArray(bytes) || !bytes.length) {
      throw new Error("Secret bytes missing");
    }
    secretsCache = { version, bytes };
    secretsCacheExpiry = Date.now() + 15 * 60 * 1000;
    return secretsCache;
  } catch {
    secretsCache = FALLBACK_SECRET;
    secretsCacheExpiry = Date.now() + 5 * 60 * 1000;
    return secretsCache;
  }
}

function parseCookie(headerValue, name) {
  if (!headerValue) return null;
  const match = headerValue.match(new RegExp(`${name}=([^;]+)`));
  return match ? match[1] : null;
}

function collectSetCookies(response) {
  if (typeof response.headers.getSetCookie === "function") {
    return response.headers.getSetCookie();
  }
  const raw = response.headers.get("set-cookie");
  return raw ? [raw] : [];
}

function extractDeviceId(setCookies) {
  for (const cookie of setCookies) {
    const value = parseCookie(cookie, "sp_t");
    if (value) return value;
  }
  return `web-${Date.now()}`;
}

function extractClientVersion(html) {
  const match = html.match(/"clientVersion"\s*:\s*"([^"]+)"/);
  return match?.[1] || "1.2.91.72.g5337566e";
}

export async function getSpotifyWebPlayerSession(fetchImpl = fetch) {
  if (
    sessionCache &&
    sessionCache.expiresAtMs > Date.now() + 30_000
  ) {
    return sessionCache;
  }

  const homeResponse = await fetchImpl("https://open.spotify.com/", {
    headers: {
      ...BROWSER_HEADERS,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    redirect: "follow",
  });
  if (!homeResponse.ok) {
    throw new Error(`Spotify home page HTTP ${homeResponse.status}`);
  }

  const html = await homeResponse.text();
  const deviceId = extractDeviceId(collectSetCookies(homeResponse));
  const clientVersion = extractClientVersion(html);

  const { version, bytes } = await fetchTotpSecrets(fetchImpl);
  const totpSecret = buildTotpSecret(bytes);
  const totp = generateTotpCode(totpSecret);

  const tokenUrl = new URL("https://open.spotify.com/api/token");
  tokenUrl.searchParams.set("reason", "init");
  tokenUrl.searchParams.set("productType", "web-player");
  tokenUrl.searchParams.set("totp", totp);
  tokenUrl.searchParams.set("totpServer", totp);
  tokenUrl.searchParams.set("totpVer", String(version));

  const tokenResponse = await fetchImpl(tokenUrl, {
    headers: {
      ...BROWSER_HEADERS,
      Accept: "application/json",
      Referer: "https://open.spotify.com/",
      "App-Platform": "WebPlayer",
    },
  });
  if (!tokenResponse.ok) {
    const body = await tokenResponse.text();
    throw new Error(
      `Spotify token HTTP ${tokenResponse.status}: ${body.slice(0, 200)}`
    );
  }

  const tokenData = await tokenResponse.json();
  const accessToken = tokenData.accessToken || tokenData.access_token;
  const clientId = tokenData.clientId || tokenData.client_id;
  if (!accessToken || !clientId) {
    throw new Error("Spotify token response missing accessToken/clientId");
  }

  const clientTokenResponse = await fetchImpl(
    "https://clienttoken.spotify.com/v1/clienttoken",
    {
      method: "POST",
      headers: {
        ...BROWSER_HEADERS,
        Accept: "application/json",
        "Content-Type": "application/json",
        Origin: "https://open.spotify.com",
        Referer: "https://open.spotify.com/",
      },
      body: JSON.stringify({
        client_data: {
          client_version: clientVersion,
          client_id: clientId,
          js_sdk_data: {
            device_brand: "unknown",
            device_model: "unknown",
            os: "windows",
            os_version: "NT 10.0",
            device_id: deviceId,
            device_type: "computer",
          },
        },
      }),
    }
  );

  let clientToken = null;
  if (clientTokenResponse.ok) {
    const clientTokenData = await clientTokenResponse.json();
    clientToken = clientTokenData?.granted_token?.token ?? null;
  }

  sessionCache = {
    accessToken,
    clientToken,
    clientId,
    clientVersion,
    deviceId,
    expiresAtMs: Number(tokenData.accessTokenExpirationTimestampMs) || Date.now() + 3600000,
  };

  return sessionCache;
}

export function extractPlaycountFromPathfinder(data) {
  const hits = [];

  function walk(value) {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      for (const item of value) walk(item);
      return;
    }
    for (const [key, child] of Object.entries(value)) {
      if (/playcount|playCount|streamCount/i.test(key)) {
        hits.push(child);
      }
      walk(child);
    }
  }

  walk(data);
  for (const hit of hits) {
    if (hit == null || hit === "") continue;
    const num = Number(String(hit).replace(/,/g, ""));
    if (Number.isFinite(num) && num >= 0) return num;
  }
  return null;
}

export async function fetchTrackPlaycountViaPathfinder(
  trackId,
  fetchImpl = fetch
) {
  const session = await getSpotifyWebPlayerSession(fetchImpl);
  const payload = {
    operationName: "getTrack",
    variables: { uri: `spotify:track:${trackId}` },
    extensions: {
      persistedQuery: {
        version: 1,
        sha256Hash: SPOTIFY_TRACK_QUERY_HASH,
      },
    },
  };

  const headers = {
    ...BROWSER_HEADERS,
    Authorization: `Bearer ${session.accessToken}`,
    "Content-Type": "application/json",
    Origin: "https://open.spotify.com",
    Referer: "https://open.spotify.com/",
    "App-Platform": "WebPlayer",
    "Spotify-App-Version": session.clientVersion,
  };
  if (session.clientToken) {
    headers["client-token"] = session.clientToken;
  }

  for (const url of PATHFINDER_URLS) {
    try {
      const response = await fetchImpl(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      if (!response.ok) continue;
      const data = await response.json();
      const count = extractPlaycountFromPathfinder(data);
      if (count != null) return count;
    } catch {
      /* try next endpoint */
    }
  }

  return null;
}

export function resetSpotifyWebSessionCache() {
  sessionCache = null;
}
