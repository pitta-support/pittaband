(function () {
  "use strict";

  const voteRoot = document.querySelector(".site-page--for-pitta-vote");
  const streamRoot = document.querySelector(".site-page--for-pitta-streaming");
  if (!voteRoot && !streamRoot) return;

  const voteListEl = document.getElementById("for-pitta-vote-list");
  const streamListEl = document.getElementById("for-pitta-streaming-list");
  const streamDateEl = document.getElementById("for-pitta-streaming-date");

  let discography = null;
  let discographyI18n = null;
  let streamingTracks = [];
  let streamingBaseline = null;
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
    const key =
      isoOrDate instanceof Date
        ? getKstDateKey(isoOrDate)
        : String(isoOrDate ?? "").slice(0, 10);
    const [year, month, day] = key.split("-");
    if (!year || !month || !day) return String(isoOrDate ?? "");
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

  function parseSpotifyTrackId(url) {
    if (!url) return null;
    const match = String(url).match(/track\/([a-zA-Z0-9]+)/i);
    return match ? match[1] : null;
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

  function msUntilNextKstMidnight() {
    const now = Date.now();
    const kstOffsetMs = 9 * 60 * 60 * 1000;
    const dayMs = 24 * 60 * 60 * 1000;
    const msIntoKstDay = ((now + kstOffsetMs) % dayMs + dayMs) % dayMs;
    return dayMs - msIntoKstDay;
  }

  function updateStreamingDateDisplay() {
    if (!streamDateEl) return;
    const todayKey = getKstDateKey();
    streamDateEl.textContent = formatStreamingDate(todayKey);
    streamDateEl.dateTime = todayKey;
  }

  async function reloadStreamingStats() {
    if (!streamListEl || !discography) return;
    try {
      const baseline = await loadJson(
        `data/streaming-stats.json?t=${Date.now()}`
      ).catch(() => streamingBaseline || { tracks: {} });
      streamingBaseline = baseline;
      streamingTracks = flattenDiscography(discography);
      renderStreaming(streamingTracks, baselineToStatsMap(streamingTracks, baseline), {
        loading: false,
      });
    } catch {
      updateStreamingDateDisplay();
    }
  }

  function scheduleStreamingDayRollover() {
    if (!streamRoot) return;
    const delay = Math.max(1000, msUntilNextKstMidnight() + 750);
    window.setTimeout(() => {
      void reloadStreamingStats();
      scheduleStreamingDayRollover();
    }, delay);
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

  function renderStreaming(tracks, statsByKey, { loading = false } = {}) {
    if (!streamListEl) return;

    updateStreamingDateDisplay();

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
      });
      scheduleStreamingDayRollover();
    } catch {
      streamListEl.innerHTML = `<li class="for-pitta-list__empty"><p class="for-pitta-empty">${escapeHtml(t("pages.forPitta.loadError", "데이터를 불러오지 못했습니다."))}</p></li>`;
      streamListEl.classList.remove("for-pitta-list--loading");
      updateStreamingDateDisplay();
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
      });
    }
  }

  document.addEventListener("i18n:ready", refreshLocalizedContent);
  document.addEventListener("i18n:change", refreshLocalizedContent);

  if (voteRoot) initVotePage();
  if (streamRoot) initStreamingPage();
})();
