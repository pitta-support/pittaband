(function () {
  "use strict";

  const voteRoot = document.querySelector(".site-page--for-pitta-vote");
  const streamRoot = document.querySelector(".site-page--for-pitta-streaming");
  if (!voteRoot && !streamRoot) return;

  const voteListEl = document.getElementById("for-pitta-vote-list");
  const streamListEl = document.getElementById("for-pitta-streaming-list");
  const streamDateEl = document.getElementById("for-pitta-streaming-date");

  const CORS_PROXIES = [
    (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  ];
  const FETCH_CONCURRENCY = 4;

  let discography = null;
  let discographyI18n = null;
  let streamingTracks = [];
  let streamingBaseline = null;
  let streamingFetchToken = 0;
  let votesData = null;

  function t(key, fallback) {
    const resolved = window.i18n?.t?.(key);
    if (resolved != null && resolved !== key) return resolved;
    return fallback ?? key;
  }

  async function whenI18nReady() {
    if (window.i18n?.ready) {
      try {
        await window.i18n.ready;
      } catch {
        /* locale load failed — fall back to inline strings */
      }
    }
  }

  function getLang() {
    return window.i18n?.lang ?? "ko";
  }

  function localizeVoteField(field) {
    if (!field) return "";
    if (typeof field === "string") return field;
    const lang = getLang();
    return field[lang] || field.ko || field.en || "";
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function isProductionSiteHost() {
    const siteBase = document.documentElement.dataset.siteBase;
    if (!siteBase) return false;
    try {
      return window.location.host === new URL(siteBase).host;
    } catch {
      return false;
    }
  }

  function resolveAssetUrl(path) {
    if (typeof window.resolveSiteAssetUrl === "function") {
      return window.resolveSiteAssetUrl(path);
    }
    if (!path) return "";
    if (/^https?:\/\//i.test(path)) return path;

    const siteBase = document.documentElement.dataset.siteBase?.replace(/\/$/, "");
    if (siteBase && isProductionSiteHost()) {
      return `${siteBase}/${path.replace(/^\//, "")}`;
    }

    try {
      return new URL(path, document.baseURI).href;
    } catch {
      return path;
    }
  }

  function formatStreamingDate(isoOrDate) {
    const d =
      isoOrDate instanceof Date
        ? isoOrDate
        : new Date(`${String(isoOrDate).slice(0, 10)}T00:00:00`);
    if (Number.isNaN(d.getTime())) return String(isoOrDate ?? "");
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}.${month}.${day}`;
  }

  function formatDate(isoOrDate) {
    const d =
      isoOrDate instanceof Date
        ? isoOrDate
        : new Date(`${String(isoOrDate).slice(0, 10)}T00:00:00`);
    if (Number.isNaN(d.getTime())) return String(isoOrDate ?? "");
    const lang = getLang();
    try {
      return new Intl.DateTimeFormat(lang === "ko" ? "ko-KR" : lang, {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: lang === "ko" ? "short" : undefined,
      }).format(d);
    } catch {
      return d.toISOString().slice(0, 10);
    }
  }

  const KO_WEEKDAY_SHORT = ["일", "월", "화", "수", "목", "금", "토"];

  function formatVoteDeadlineDate(isoOrDate) {
    const d =
      isoOrDate instanceof Date
        ? isoOrDate
        : new Date(`${String(isoOrDate).slice(0, 10)}T00:00:00`);
    if (Number.isNaN(d.getTime())) return String(isoOrDate ?? "");
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const lang = getLang();

    if (lang === "ko") {
      return `${year}.${month}.${day}(${KO_WEEKDAY_SHORT[d.getDay()]})`;
    }

    try {
      const weekday = new Intl.DateTimeFormat(lang, { weekday: "short" }).format(
        d
      );
      return `${year}.${month}.${day} (${weekday})`;
    } catch {
      return `${year}.${month}.${day}`;
    }
  }

  const VOTE_LINK_IMAGES = [
    {
      pattern: /^https?:\/\/(?:www\.)?podoal\.io\//i,
      image: "images/votes/podoal.png",
    },
  ];

  function resolveVoteImage(vote) {
    if (vote?.image) return vote.image;
    const href = String(vote?.href || "");
    for (const rule of VOTE_LINK_IMAGES) {
      if (rule.pattern.test(href)) return rule.image;
    }
    return "";
  }

  function normalizeCount(value) {
    if (value == null || value === "") return null;
    const num = Number(String(value).replace(/,/g, ""));
    return Number.isFinite(num) ? num : null;
  }

  function formatNumber(value) {
    if (value == null || value === "" || Number.isNaN(Number(value))) {
      return "—";
    }
    const lang = getLang();
    try {
      return new Intl.NumberFormat(lang === "ko" ? "ko-KR" : lang).format(
        Number(value)
      );
    } catch {
      return String(value);
    }
  }

  function formatDelta(delta) {
    const num = Number(delta);
    if (!Number.isFinite(num) || num === 0) return "";
    const sign = num > 0 ? "+" : "-";
    return `<span class="for-pitta-stream-stat__delta">${sign}${formatNumber(Math.abs(num))}</span>`;
  }

  function buildTrackKey(category, releaseId, trackId) {
    return `${category}/${releaseId}/${trackId}`;
  }

  function parseMelonSongId(url) {
    if (!url) return null;
    const match = String(url).match(/songId=(\d+)/i);
    return match ? match[1] : null;
  }

  function parseSpotifyTrackId(url) {
    if (!url) return null;
    const match = String(url).match(/track\/([a-zA-Z0-9]+)/i);
    return match ? match[1] : null;
  }

  function computeDelta(current, previous) {
    const cur = normalizeCount(current);
    const prev = normalizeCount(previous);
    if (cur == null || prev == null) return 0;
    return cur - prev;
  }

  function getLocalizedTitle(category, releaseId, track, fallbackTitle) {
    const lang = getLang();
    if (lang === "ko") return fallbackTitle;
    const trackKey = buildTrackKey(category, releaseId, track?.id || releaseId);
    const releaseKey = `${category}/${releaseId}`;
    return (
      discographyI18n?.[trackKey]?.title?.[lang] ||
      discographyI18n?.[releaseKey]?.title?.[lang] ||
      fallbackTitle
    );
  }

  function shouldIncludeInStreamingList(source) {
    const title = String(source?.title || "").trim();
    const subtitle = String(source?.subtitle || "").trim();
    if (!title) return false;
    if (/^INTRO$/i.test(title)) return false;
    if (/\(inst\.?\)/i.test(title)) return false;
    if (/applause guide/i.test(subtitle)) return false;
    return true;
  }

  function localizeStreamingTrackRow(row) {
    const { category, releaseId, trackId, sourceTitle, sourceSubtitle } = row;
    const trackRef = trackId ? { id: trackId } : null;
    return {
      ...row,
      title: getLocalizedTitle(category, releaseId, trackRef, sourceTitle),
      subtitle: sourceSubtitle || "",
    };
  }

  function buildStreamingTracks(data) {
    const rows = [];
    const categories = ["album", "single", "ost"];

    for (const category of categories) {
      for (const release of data?.[category] || []) {
        const releaseLinks = release.links || {};
        const cover = release.cover || "";

        if (Array.isArray(release.tracks) && release.tracks.length > 0) {
          for (const track of release.tracks) {
            if (
              !shouldIncludeInStreamingList({
                title: track.title,
                subtitle: track.subtitle,
              })
            ) {
              continue;
            }

            const links = { ...releaseLinks, ...(track.links || {}) };
            rows.push({
              key: buildTrackKey(category, release.id, track.id),
              sourceTitle: track.title,
              sourceSubtitle: track.subtitle || "",
              cover,
              links,
              category,
              releaseId: release.id,
              trackId: track.id,
            });
          }
        } else if (
          shouldIncludeInStreamingList({
            title: release.title,
            subtitle: release.subtitle,
          })
        ) {
          rows.push({
            key: buildTrackKey(category, release.id, release.id),
            sourceTitle: release.title,
            sourceSubtitle: release.subtitle || "",
            cover,
            links: releaseLinks,
            category,
            releaseId: release.id,
            trackId: release.id,
          });
        }
      }
    }

    return dedupeStreamingTracksBySpotifyId(
      rows.map((row) => localizeStreamingTrackRow(row))
    );
  }

  function dedupeStreamingTracksBySpotifyId(tracks) {
    const priority = { single: 0, ost: 1, album: 2 };
    const bySpotifyId = new Map();
    const withoutSpotify = [];

    for (const track of tracks) {
      const spotifyId = parseSpotifyTrackId(track.links?.spotify);
      if (!spotifyId) {
        withoutSpotify.push(track);
        continue;
      }

      const existing = bySpotifyId.get(spotifyId);
      if (!existing) {
        bySpotifyId.set(spotifyId, track);
        continue;
      }

      const existingPriority = priority[existing.category] ?? 99;
      const trackPriority = priority[track.category] ?? 99;
      if (trackPriority < existingPriority) {
        bySpotifyId.set(spotifyId, track);
      }
    }

    return [...bySpotifyId.values(), ...withoutSpotify];
  }

  function flattenDiscography(data) {
    return buildStreamingTracks(data);
  }

  async function proxyFetchText(url) {
    let lastError = null;
    for (const toProxyUrl of CORS_PROXIES) {
      try {
        const res = await fetch(toProxyUrl(url));
        if (!res.ok) throw new Error(`Proxy HTTP ${res.status}`);
        const text = await res.text();
        if (text) return text;
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError || new Error("Proxy fetch failed");
  }

  function baselineToStatsMap(tracks, baseline) {
    const map = {};
    for (const track of tracks) {
      const saved = baseline?.tracks?.[track.key] || {};
      map[track.key] = {
        spotify: {
          total: saved.spotify?.total ?? null,
          delta: saved.spotify?.delta ?? 0,
        },
      };
    }
    return map;
  }

  function mergeLiveStats(savedStats, liveStats) {
    if (!liveStats) return savedStats;
    return {
      melon: {
        total:
          liveStats.melon?.total ?? savedStats?.melon?.total ?? null,
        delta:
          liveStats.melon?.total != null && savedStats?.melon?.total != null
            ? liveStats.melon.total - savedStats.melon.total
            : liveStats.melon?.delta ?? savedStats?.melon?.delta ?? 0,
      },
      spotify: {
        total:
          liveStats.spotify?.total ?? savedStats?.spotify?.total ?? null,
        delta:
          liveStats.spotify?.total != null &&
          savedStats?.spotify?.total != null
            ? liveStats.spotify.total - savedStats.spotify.total
            : liveStats.spotify?.delta ?? savedStats?.spotify?.delta ?? 0,
      },
    };
  }

  function extractMelonCountFromHtml(html) {
    const patterns = [
      /"listenCount"\s*:\s*"?(\d+)"?/,
      /"accPlayCnt"\s*:\s*"?(\d+)"?/,
      /"TOTPLAYCNT"\s*:\s*"?(\d+)"?/,
      /"playCount"\s*:\s*"?(\d+)"?/,
      /누적[^0-9]{0,40}([\d,]+)/,
      /총[^0-9]{0,20}([\d,]+)\s*회/,
    ];
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) return normalizeCount(match[1]);
    }
    return null;
  }

  function extractSpotifyCountFromHtml(html) {
    const patterns = [
      /"playcount"\s*:\s*(\d+)/i,
      /"playCount"\s*:\s*(\d+)/,
      /"streamCount"\s*:\s*(\d+)/,
      /Total streams<\/td>\s*<td[^>]*>\s*([\d,]+)/i,
      /Total streams[\s\S]{0,200}?>\s*([\d,]+)\s*</i,
      /([\d,]+)\s*streams on Spotify/i,
    ];
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) return normalizeCount(match[1]);
    }
    return null;
  }

  async function fetchMelonListenCountDirect(songId) {
    if (!songId) return null;
    const referer = `https://www.melon.com/song/detail.htm?songId=${songId}`;
    try {
      const pageRes = await fetch(referer, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          Referer: "https://www.melon.com/",
          "Accept-Language": "ko-KR,ko;q=0.9",
        },
      });
      const html = await pageRes.text();
      return extractMelonCountFromHtml(html);
    } catch {
      return null;
    }
  }

  async function fetchSpotifyStreamCountDirect(trackId) {
    if (!trackId) return null;
    try {
      const res = await fetch(`https://open.spotify.com/track/${trackId}`, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          Accept: "text/html",
        },
      });
      if (!res.ok) return null;
      return extractSpotifyCountFromHtml(await res.text());
    } catch {
      return null;
    }
  }

  async function fetchMelonListenCount(songId) {
    const direct = await fetchMelonListenCountDirect(songId);
    if (direct != null) return direct;

    if (!songId) return null;
    const jsonUrl = `https://www.melon.com/song/detail.json?songId=${songId}`;
    try {
      const text = await proxyFetchText(jsonUrl);
      const data = JSON.parse(text);
      return normalizeCount(
        data?.songInfo?.listenCount ??
          data?.listenCount ??
          data?.songInfo?.accPlayCnt ??
          data?.accPlayCnt
      );
    } catch {
      try {
        const html = await proxyFetchText(
          `https://www.melon.com/song/detail.htm?songId=${songId}`
        );
        return extractMelonCountFromHtml(html);
      } catch {
        return null;
      }
    }
  }

  async function fetchSpotifyStreamCount(trackId) {
    const direct = await fetchSpotifyStreamCountDirect(trackId);
    if (direct != null) return direct;

    if (!trackId) return null;
    const urls = [
      `https://kworb.net/spotify/track/${trackId}.html`,
      `https://open.spotify.com/track/${trackId}`,
    ];
    for (const url of urls) {
      try {
        const html = await proxyFetchText(url);
        const count = extractSpotifyCountFromHtml(html);
        if (count != null) return count;
      } catch {
        /* try next */
      }
    }
    return null;
  }

  async function fetchLiveTrackStats(track, baselineTrack) {
    const melonId = parseMelonSongId(track.links?.melon);
    const spotifyId = parseSpotifyTrackId(track.links?.spotify);
    const prevMelon = baselineTrack?.melon?.total ?? null;
    const prevSpotify = baselineTrack?.spotify?.total ?? null;

    const [melonTotal, spotifyTotal] = await Promise.all([
      fetchMelonListenCount(melonId),
      fetchSpotifyStreamCount(spotifyId),
    ]);

    return {
      melon: {
        total: melonTotal,
        delta: computeDelta(melonTotal, prevMelon),
      },
      spotify: {
        total: spotifyTotal,
        delta: computeDelta(spotifyTotal, prevSpotify),
      },
    };
  }

  async function mapConcurrent(items, limit, mapper) {
    const results = new Array(items.length);
    let index = 0;

    async function worker() {
      while (index < items.length) {
        const current = index;
        index += 1;
        results[current] = await mapper(items[current], current);
      }
    }

    const workers = Array.from(
      { length: Math.min(limit, items.length) },
      () => worker()
    );
    await Promise.all(workers);
    return results;
  }

  function renderCover(cover) {
    if (!cover) {
      return `<span class="for-pitta-banner__cover-placeholder" aria-hidden="true"></span>`;
    }
    const src = resolveAssetUrl(cover);
    const fallback = resolveAssetUrl("images/albums/paradox.png");
    return `<img class="for-pitta-banner__cover" src="${escapeHtml(src)}" alt="" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='${fallback}';" />`;
  }

  function renderVoteCover(vote) {
    const cover = resolveVoteImage(vote);
    if (!cover) {
      return `<span class="for-pitta-banner__cover-placeholder" aria-hidden="true"></span>`;
    }
    const src = resolveAssetUrl(cover);
    return `<img class="for-pitta-banner__cover for-pitta-banner__cover--platform" src="${escapeHtml(src)}" alt="" loading="lazy" decoding="async" />`;
  }

  function renderSpotifyListenLink(url) {
    if (!url) return "";
    return `
      <a
        class="for-pitta-stream-stat__spotify"
        href="${escapeHtml(url)}"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="${escapeHtml(t("pages.album.listenSpotify"))}"
      >
        <img src="images/icons/spotify.svg" alt="" width="18" height="18" loading="lazy" decoding="async" />
      </a>`;
  }

  function renderStreamingStat(total, delta, loading, spotifyUrl) {
    const value = loading
      ? `<span class="for-pitta-stream-stat__loading" aria-hidden="true">…</span>`
      : escapeHtml(formatNumber(total));
    const deltaHtml = loading ? "" : formatDelta(delta);
    const spotifyLink = loading ? "" : renderSpotifyListenLink(spotifyUrl);
    return `
      <div class="for-pitta-stream-stat">
        <div class="for-pitta-stream-stat__row">
          <span class="for-pitta-stream-stat__total">${value}</span>
          ${spotifyLink}
        </div>
        ${deltaHtml ? `<span class="for-pitta-stream-stat__delta-wrap">${deltaHtml}</span>` : ""}
      </div>`;
  }

  function getKstDateKey(date = new Date()) {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Seoul",
    }).format(date);
  }

  function isVoteActive(vote) {
    if ((vote?.status || "active") !== "active") return false;
    const endsAt = String(vote?.endsAt || "").slice(0, 10);
    if (!endsAt) return true;
    return getKstDateKey() <= endsAt;
  }

  function renderVotes(votes) {
    if (!voteListEl) return;
    const activeVotes = (votes || []).filter(isVoteActive);

    if (!activeVotes.length) {
      voteListEl.innerHTML = `<li class="for-pitta-list__empty"><p class="for-pitta-empty" data-i18n="pages.forPitta.voteEmpty">${escapeHtml(t("pages.forPitta.voteEmpty", "현재 진행중인 투표가 없습니다"))}</p></li>`;
      return;
    }

    voteListEl.innerHTML = activeVotes
      .map((vote) => {
        const title = escapeHtml(localizeVoteField(vote.title));
        const description = localizeVoteField(vote.description);
        const desc = description
          ? `<p class="for-pitta-banner__desc">${escapeHtml(description)}</p>`
          : "";
        const meta = vote.endsAt
          ? `<span class="for-pitta-banner__meta">${escapeHtml(t("pages.forPitta.voteEnds", "투표마감 :"))} ${escapeHtml(formatVoteDeadlineDate(vote.endsAt))}</span>`
          : "";
        const inner = `
          ${renderVoteCover(vote)}
          <div class="for-pitta-banner__main">
            <h3 class="for-pitta-banner__title">${title}</h3>
            ${desc}
            ${meta}
          </div>`;

        if (vote.href) {
          const target = vote.href.startsWith("http")
            ? ' target="_blank" rel="noopener noreferrer"'
            : "";
          return `<li><a class="for-pitta-banner for-pitta-banner--vote" href="${escapeHtml(vote.href)}"${target}>${inner}</a></li>`;
        }

        return `<li><article class="for-pitta-banner for-pitta-banner--static for-pitta-banner--vote">${inner}</article></li>`;
      })
      .join("");
  }

  function sortTracksBySpotifyPlays(tracks, statsByKey) {
    return [...tracks].sort((a, b) => {
      const aTotal = normalizeCount(statsByKey?.[a.key]?.spotify?.total);
      const bTotal = normalizeCount(statsByKey?.[b.key]?.spotify?.total);
      if (aTotal == null && bTotal == null) {
        return a.title.localeCompare(b.title, "ko");
      }
      if (aTotal == null) return 1;
      if (bTotal == null) return -1;
      if (bTotal !== aTotal) return bTotal - aTotal;
      return a.title.localeCompare(b.title, "ko");
    });
  }

  function renderStreaming(tracks, statsByKey, { loading = false, updatedAt = null } = {}) {
    if (!streamListEl) return;

    if (streamDateEl) {
      streamDateEl.textContent = updatedAt
        ? formatStreamingDate(updatedAt)
        : formatStreamingDate(new Date());
    }

    const sortedTracks = sortTracksBySpotifyPlays(tracks, statsByKey);

    if (!sortedTracks.length) {
      streamListEl.innerHTML = `<li class="for-pitta-list__empty"><p class="for-pitta-empty">${escapeHtml(t("pages.forPitta.streamingEmpty", "표시할 곡이 없습니다."))}</p></li>`;
      streamListEl.classList.remove("for-pitta-list--loading");
      return;
    }

    streamListEl.classList.toggle("for-pitta-list--loading", loading);

    streamListEl.innerHTML = sortedTracks
      .map((track) => {
        const stat = statsByKey?.[track.key];
        const trackLoading = loading && !stat;
        const spotify = stat?.spotify || {};
        const subtitle = track.subtitle
          ? `<p class="for-pitta-banner__desc">${escapeHtml(track.subtitle)}</p>`
          : "";

        return `
          <li>
            <article class="for-pitta-banner for-pitta-banner--static for-pitta-banner--streaming">
              ${renderCover(track.cover)}
              <div class="for-pitta-banner__main">
                <div class="for-pitta-banner__streaming-row">
                  <div class="for-pitta-banner__info">
                    <h3 class="for-pitta-banner__title">${escapeHtml(track.title)}</h3>
                    ${subtitle}
                  </div>
                  ${renderStreamingStat(spotify.total, spotify.delta, trackLoading, track.links?.spotify)}
                </div>
              </div>
            </article>
          </li>`;
      })
      .join("");
  }

  async function loadJson(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load ${url}`);
    return res.json();
  }

  async function initVotePage() {
    if (!voteListEl) return;
    await whenI18nReady();
    try {
      if (!votesData) {
        votesData = await loadJson("data/votes.json?v=5");
      }
      renderVotes(votesData.votes || []);
    } catch {
      voteListEl.innerHTML = `<li class="for-pitta-list__empty"><p class="for-pitta-empty">${escapeHtml(t("pages.forPitta.loadError", "데이터를 불러오지 못했습니다."))}</p></li>`;
    }
  }

  async function crawlStreamingStats(tracks, baseline, token) {
    const statsMap = baselineToStatsMap(tracks, baseline);

    await mapConcurrent(tracks, FETCH_CONCURRENCY, async (track) => {
      const saved = statsMap[track.key];
      const live = await fetchLiveTrackStats(track, baseline?.tracks?.[track.key]);
      if (token !== streamingFetchToken) return;
      statsMap[track.key] = mergeLiveStats(saved, live);
      renderStreaming(tracks, statsMap, { loading: true });
    });

    if (token !== streamingFetchToken) return statsMap;
    renderStreaming(tracks, statsMap, { loading: false });
    return statsMap;
  }

  async function initStreamingPage() {
    if (!streamListEl) return;
    await whenI18nReady();

    try {
      const [disco, baseline, i18nData] = await Promise.all([
        loadJson("data/discography.json"),
        loadJson("data/streaming-stats.json").catch(() => ({ tracks: {} })),
        loadJson("data/discography-i18n.json").catch(() => ({})),
      ]);

      discography = disco;
      discographyI18n = i18nData;
      streamingBaseline = baseline;
      streamingTracks = flattenDiscography(disco);
      const statsMap = baselineToStatsMap(streamingTracks, baseline);

      renderStreaming(streamingTracks, statsMap, {
        loading: false,
        updatedAt: baseline?.updatedAt,
      });
    } catch {
      streamListEl.innerHTML = `<li class="for-pitta-list__empty"><p class="for-pitta-empty">${escapeHtml(t("pages.forPitta.loadError", "데이터를 불러오지 못했습니다."))}</p></li>`;
      streamListEl.classList.remove("for-pitta-list--loading");
    }
  }

  function refreshLocalizedContent() {
    if (voteRoot) {
      if (votesData) {
        renderVotes(votesData.votes || []);
      } else {
        initVotePage();
      }
    }
    if (streamRoot && discography) {
      streamingTracks = buildStreamingTracks(discography);
      const statsMap = baselineToStatsMap(streamingTracks, streamingBaseline);
      renderStreaming(streamingTracks, statsMap, {
        loading: false,
        updatedAt: streamingBaseline?.updatedAt,
      });
    }
  }

  document.addEventListener("i18n:ready", refreshLocalizedContent);
  document.addEventListener("i18n:change", refreshLocalizedContent);

  if (voteRoot) initVotePage();
  if (streamRoot) initStreamingPage();
})();
