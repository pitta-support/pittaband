(function () {
  "use strict";

  const pageRoot = document.querySelector(".site-page--album");
  if (!pageRoot) return;

  const titleEl = document.getElementById("album-page-title");
  const tabsEl = document.getElementById("album-tabs");
  const gridEl = document.getElementById("album-grid");
  const overlay = document.getElementById("album-detail-overlay");
  const panel = document.getElementById("album-detail-panel");
  const panelIdEl = document.getElementById("album-detail-id");
  const panelTitleEl = document.getElementById("album-detail-title");
  const panelBodyEl = document.getElementById("album-detail-body");
  const coverLightbox = document.getElementById("album-cover-lightbox");
  const coverLightboxImg = document.getElementById("album-cover-lightbox-img");
  const coverLightboxPanel = coverLightbox?.querySelector(".album-cover-lightbox__dialog");

  const TAB_KEYS = ["album", "single", "ost"];
  const TITLE_KEYS = {
    album: "pages.album.title",
    single: "pages.album.tabSingle",
    ost: "pages.album.tabOst",
  };

  let discography = null;
  let discographyI18n = null;
  let activeTab = "album";
  let openItemId = null;
  let lastFocusedEl = null;
  let coverLightboxLastFocus = null;

  function t(key) {
    return window.i18n?.t(key) ?? key;
  }

  function getLang() {
    return window.i18n?.lang ?? "ko";
  }

  function formatDate(iso) {
    if (!iso) return "";
    const d = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(d.getTime())) return iso;
    const lang = getLang();
    try {
      return new Intl.DateTimeFormat(lang === "ko" ? "ko-KR" : lang, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(d);
    } catch {
      return iso;
    }
  }

  function buildI18nKey({ category, releaseId, trackId = null }) {
    if (!category || !releaseId) return null;
    if (trackId) return `${category}/${releaseId}/${trackId}`;
    return `${category}/${releaseId}`;
  }

  function getItemTitle(item, { category = null, albumId = null } = {}) {
    if (!item?.title) return "";
    const lang = getLang();
    if (lang === "ko") return item.title;

    const releaseId = albumId || item.id;
    const trackId = albumId ? item.id : null;
    const key = buildI18nKey({ category, releaseId, trackId });
    const localized = key && discographyI18n?.[key]?.title?.[lang];
    return localized || item.title;
  }

  function getDescription(item, { category = null, albumId = null } = {}) {
    const lang = getLang();
    const releaseId = albumId || item?.id;
    const trackId = albumId ? item?.id : null;
    const key = buildI18nKey({ category, releaseId, trackId });
    const ext = key && discographyI18n?.[key]?.description?.[lang];
    if (ext) return ext;

    const desc = item.description;
    if (!desc || typeof desc !== "object") return "";
    return desc[lang] || desc.ko || desc.en || "";
  }

  function tabLabel(tab) {
    const map = {
      album: "pages.album.tabAlbum",
      single: "pages.album.tabSingle",
      ost: "pages.album.tabOst",
    };
    return t(map[tab]);
  }

  function renderCardTitleHtml(item) {
    const title = escapeHtml(getItemTitle(item, { category: item.category }));
    if (activeTab !== "album") {
      return title;
    }
    const type = escapeHtml(tabLabel(item.category));
    return `<span class="album-card__type">${type}</span><span class="album-card__name">${title}</span>`;
  }

  function renderCardAriaLabel(item) {
    if (activeTab !== "album") {
      return getItemTitle(item, { category: item.category });
    }
    return `${tabLabel(item.category)} ${getItemTitle(item, { category: item.category })}`;
  }

  function getTrackTitle(track, { albumId = null } = {}) {
    const title = getItemTitle(track, { category: "album", albumId });
    return track.subtitle ? `${title} (${track.subtitle})` : title;
  }

  function renderPathLabel(label) {
    return `<span class="album-detail__path">${escapeHtml(label)}</span>`;
  }

  function renderPathSep() {
    return `<span class="album-detail__path-sep" aria-hidden="true"> &gt; </span>`;
  }

  function renderDetailTitleHtml({ category, item, track = null, albumId = null }) {
    if (track && isAlbumRelease(item, category)) {
      const id = albumId || item.id;
      return [
        renderPathLabel(t("pages.album.tabAlbum")),
        renderPathSep(),
        `<button type="button" class="album-detail__path-link" data-album-crumb-back="${escapeHtml(id)}">${escapeHtml(getItemTitle(item, { category: "album" }))}</button>`,
        renderPathSep(),
        `<span class="album-detail__path-current">${escapeHtml(getTrackTitle(track, { albumId: id }))}</span>`,
      ].join("");
    }

    if (isAlbumRelease(item, category)) {
      return [
        renderPathLabel(t("pages.album.tabAlbum")),
        renderPathSep(),
        `<span class="album-detail__path-current">${escapeHtml(getItemTitle(item, { category: "album" }))}</span>`,
      ].join("");
    }

    const typeKey = {
      album: "pages.album.tabAlbum",
      single: "pages.album.tabSingle",
      ost: "pages.album.tabOst",
    }[category];

    return [
      renderPathLabel(t(typeKey || "pages.album.tabSingle")),
      renderPathSep(),
      `<span class="album-detail__path-current">${escapeHtml(getItemTitle(item, { category }))}</span>`,
    ].join("");
  }

  function updateTitle() {
    if (!titleEl) return;
    titleEl.textContent = t(TITLE_KEYS[activeTab]);
  }

  function updateTabs() {
    if (!tabsEl) return;
    tabsEl.querySelectorAll("[data-album-tab]").forEach((btn) => {
      const tab = btn.dataset.albumTab;
      const selected = tab === activeTab;
      btn.setAttribute("aria-selected", selected ? "true" : "false");
      btn.tabIndex = selected ? 0 : -1;
    });
  }

  function sortByReleaseDate(items) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();

    return [...items].sort((a, b) => {
      const da = new Date(`${a.releaseDate}T00:00:00`).getTime() || 0;
      const db = new Date(`${b.releaseDate}T00:00:00`).getTime() || 0;
      const aFuture = da >= todayMs;
      const bFuture = db >= todayMs;

      if (aFuture && bFuture) return da - db;
      if (aFuture !== bFuture) return aFuture ? -1 : 1;
      return db - da;
    });
  }

  function shouldShowInGrid(item) {
    const cover = item.cover || "";
    if (!cover || /placeholder/i.test(cover)) return false;

    const hasTracks = (item.tracks?.length ?? 0) > 0;
    const desc = item.description || {};
    const hasDesc = !!(desc.ko?.trim() || desc.en?.trim());
    const links = item.links || {};
    const hasLinks = !!(
      links.melon ||
      links.spotify ||
      links.youtube ||
      links.liveclip
    );
    const hasLyrics = !!item.lyricsText?.trim();

    if (item.category === "album" && !hasTracks && !hasDesc && !hasLinks && !hasLyrics) {
      return false;
    }

    return true;
  }

  function getItemsForTab(tab) {
    if (!discography) return [];

    let items;

    if (tab === "album") {
      items = [];
      for (const category of ["album", "single", "ost"]) {
        (discography[category] || []).forEach((item) => {
          items.push({ ...item, category });
        });
      }
    } else {
      items = (discography[tab] || []).map((item) => ({ ...item, category: tab }));
    }

    return sortByReleaseDate(items.filter(shouldShowInGrid));
  }

  function renderGrid() {
    if (!gridEl || !discography) return;
    const items = getItemsForTab(activeTab);

    gridEl.classList.remove("album-grid--enter");

    if (!items.length) {
      gridEl.innerHTML = `<li class="album-grid__empty">${t("pages.album.empty")}</li>`;
      return;
    }

    gridEl.innerHTML = items
      .map(
        (item, index) => `
      <li class="album-grid__item" style="--album-enter-index: ${index}">
        <button
          type="button"
          class="album-card"
          data-album-item="${item.id}"
          data-album-category="${item.category}"
          aria-label="${escapeHtml(renderCardAriaLabel(item))}"
        >
          <span class="album-card__cover-wrap">
            <img
              class="album-card__cover"
              src="${item.cover || "images/albums/placeholder.svg"}"
              alt="${escapeHtml(getItemTitle(item, { category: item.category }) || item.id || "Pitta Band")}"
              width="320"
              height="320"
              loading="lazy"
              draggable="false"
              onerror="this.onerror=null;this.src='images/albums/placeholder.svg';"
            />
          </span>
          <span class="album-card__title">${renderCardTitleHtml(item)}</span>
          <time class="album-card__date" datetime="${item.releaseDate || ""}">${formatDate(item.releaseDate)}</time>
        </button>
      </li>`
      )
      .join("");

    requestAnimationFrame(() => {
      gridEl.classList.add("album-grid--enter");
    });
  }

  function findItem(category, id) {
    const list = discography?.[category] || [];
    return list.find((item) => item.id === id) ?? null;
  }

  function isAlbumRelease(item, category) {
    return (
      category === "album" &&
      Array.isArray(item?.tracks) &&
      item.tracks.length > 0
    );
  }

  function hasReleaseTracklist(item) {
    return Array.isArray(item?.tracks) && item.tracks.length > 0;
  }

  function usesInlineTracklistLayout(item, category) {
    return category !== "album" && hasReleaseTracklist(item);
  }

  function getTrackListContext(category, releaseId) {
    return category === "album" ? { category, albumId: releaseId } : { category };
  }

  function getTrackLinks(release, track) {
    if (track.isMain || track.id === release.id) return release.links || {};
    return track.links || {};
  }

  function isNonInteractiveTrack(track, release, { category, currentTrackId = null } = {}) {
    if (track.noDetail) return true;
    if (category !== "album" && (track.isMain || track.id === release.id)) return true;
    if (currentTrackId && track.id === currentTrackId) return true;
    return false;
  }

  function renderTitleTrackBadge() {
    return `<span class="album-detail__title-badge" title="${escapeHtml(t("pages.album.titleTrack"))}" aria-label="${escapeHtml(t("pages.album.titleTrack"))}">
      <svg viewBox="0 0 16 16" aria-hidden="true" width="14" height="14">
        <path fill="currentColor" d="M8 1l2.2 4.5 4.9.7-3.5 3.4.8 4.9L8 12.3 3.6 14.5l.8-4.9L1 6.2l4.9-.7z"/>
      </svg>
    </span>`;
  }

  function renderTrackListItems(release, category, { currentTrackId = null } = {}) {
    const listContext = getTrackListContext(category, release.id);

    return (release.tracks || [])
      .map((track, index) => {
        const label = track.subtitle
          ? `${getItemTitle(track, listContext)} (${track.subtitle})`
          : getItemTitle(track, listContext);
        const titleBadge = track.isTitle ? renderTitleTrackBadge() : "";
        const titleHtml = `<span class="album-detail__track-title">${escapeHtml(label)}</span>${titleBadge}`;
        const links = getTrackLinks(release, track);
        const nonInteractive = isNonInteractiveTrack(track, release, {
          category,
          currentTrackId,
        });

        const titleCell = nonInteractive
          ? `<span class="album-detail__track-label">
              <span class="album-detail__track-num">${index + 1}</span>
              ${titleHtml}
            </span>`
          : `<button
              type="button"
              class="album-detail__track-btn"
              data-album-track="${track.id}"
              data-album-parent="${release.id}"
              data-album-category="${category}"
            >
              <span class="album-detail__track-num">${index + 1}</span>
              ${titleHtml}
            </button>`;

        return `
          <li class="album-detail__track-item">
            ${titleCell}
            ${renderTrackRowLinks(links)}
          </li>`;
      })
      .join("");
  }

  function renderTracklistSection(release, category, options = {}) {
    if (!hasReleaseTracklist(release)) return "";
    return `<ol class="album-detail__tracklist">${renderTrackListItems(release, category, options)}</ol>`;
  }

  function renderReleaseDateMeta(item) {
    const date = formatDate(item.releaseDate);
    if (!date) return "";
    return `<dl class="album-detail__meta album-detail__meta--compact album-detail__meta--release-date">${metaRow("pages.album.releaseDate", date)}</dl>`;
  }

  function renderCreditsMeta(item) {
    const rows = [
      metaRow("pages.album.lyricsBy", item.lyricsBy),
      metaRow("pages.album.composedBy", item.composedBy),
      metaRow("pages.album.arrangedBy", item.arrangedBy),
      metaRow("pages.album.producedBy", item.producedBy),
    ].join("");
    const hasCredits = !!(
      item.lyricsBy ||
      item.composedBy ||
      item.arrangedBy ||
      item.producedBy
    );
    if (!hasCredits && !isKoreanLang()) return "";
    return `
      ${hasCredits ? `<dl class="album-detail__meta album-detail__meta--credits">${rows}</dl>` : ""}
      ${isKoreanLang() ? `<p class="album-detail__source">${t("pages.album.sourceMelon")}</p>` : ""}`;
  }

  function renderTracklistPageContent(
    release,
    category,
    { desc = "", currentTrackId = null, creditsItem = null } = {}
  ) {
    const creditsHtml = creditsItem ? renderCreditsMeta(creditsItem) : "";

    return `
      <div class="album-detail__body">
        ${renderReleaseDateMeta(release)}
        ${renderTracklistSection(release, category, { currentTrackId })}
        ${desc ? `<div class="album-detail__intro"><p class="album-detail__desc">${escapeHtml(desc)}</p></div>` : ""}
        ${creditsHtml ? `<div class="album-detail__details">${creditsHtml}</div>` : ""}
      </div>`;
  }

  function findAlbumTrack(albumId, trackId) {
    const album = findItem("album", albumId);
    if (!album?.tracks) return null;
    const track = album.tracks.find((entry) => entry.id === trackId);
    if (!track) return null;
    return {
      ...track,
      cover: album.cover,
      releaseDate: album.releaseDate,
    };
  }

  function parseHash() {
    const hash = location.hash.replace(/^#/, "");
    const match = hash.match(/^(album|single|ost)\/([^/]+)(?:\/track\/(.+))?$/);
    if (!match) return null;
    return { category: match[1], id: match[2], trackId: match[3] || null };
  }

  function metaRow(labelKey, value) {
    if (!value) return "";
    return `
      <div class="album-detail__row">
        <dt>${t(labelKey)}</dt>
        <dd>${value}</dd>
      </div>`;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderMagnifyIcon() {
    return `<svg class="album-detail__zoom-icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
      <circle cx="10.5" cy="10.5" r="6.25" fill="none" stroke="currentColor" stroke-width="1.8"></circle>
      <path d="M15.5 15.5L20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
    </svg>`;
  }

  function renderDetailCover(item, context = {}) {
    const title = getItemTitle(item, context) || item.id || "Pitta Band";
    const src = item.cover || "images/albums/placeholder.svg";
    const zoomLabel = t("pages.album.zoomCover");
    return `
          <button
            type="button"
            class="album-detail__cover-btn"
            data-album-cover-zoom
            data-zoom-src="${escapeHtml(src)}"
            aria-label="${escapeHtml(zoomLabel)}: ${escapeHtml(title)}"
          >
            <img
              class="album-detail__cover"
              src="${escapeHtml(src)}"
              alt="${escapeHtml(title)}"
              width="320"
              height="320"
              loading="lazy"
              draggable="false"
              onerror="this.onerror=null;this.src='images/albums/placeholder.svg';"
            />
            <span class="album-detail__cover-zoom" aria-hidden="true">${renderMagnifyIcon()}</span>
          </button>`;
  }

  function openCoverLightbox(src, alt = "") {
    if (!coverLightbox || !coverLightboxImg) return;

    coverLightboxLastFocus = document.activeElement;
    coverLightboxImg.src = src;
    coverLightboxImg.alt = alt;
    coverLightbox.hidden = false;
    coverLightbox.removeAttribute("aria-hidden");
    requestAnimationFrame(() => coverLightbox.classList.add("is-open"));
    document.body.classList.add("album-cover-lightbox-open");

    const closeBtn = coverLightbox.querySelector("[data-album-cover-lightbox-close].album-cover-lightbox__close");
    closeBtn?.focus();
  }

  function closeCoverLightbox() {
    if (!coverLightbox?.classList.contains("is-open")) return;

    coverLightbox.classList.remove("is-open");
    document.body.classList.remove("album-cover-lightbox-open");
    coverLightbox.setAttribute("aria-hidden", "true");

    const finish = () => {
      coverLightbox.hidden = true;
      coverLightboxImg?.removeAttribute("src");
      if (coverLightboxLastFocus && typeof coverLightboxLastFocus.focus === "function") {
        coverLightboxLastFocus.focus();
      }
      coverLightboxLastFocus = null;
    };

    if (!coverLightboxPanel) {
      finish();
      return;
    }

    let done = false;
    const onEnd = (event) => {
      if (event.target !== coverLightboxPanel || event.propertyName !== "opacity") return;
      coverLightboxPanel.removeEventListener("transitionend", onEnd);
      if (!done) {
        done = true;
        finish();
      }
    };

    coverLightboxPanel.addEventListener("transitionend", onEnd);
    setTimeout(() => {
      if (!done) {
        done = true;
        coverLightboxPanel.removeEventListener("transitionend", onEnd);
        finish();
      }
    }, 420);
  }

  function youtubeEmbedUrl(url) {
    if (!url) return null;
    const match = url.match(
      /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^?&/]+)/
    );
    return match ? `https://www.youtube.com/embed/${match[1]}` : null;
  }

  function getMvTabLabel(item) {
    if (item.videoType === "lyricvideo") return t("pages.album.tabLyricVideo");
    return t("pages.album.tabMv");
  }

  function showMvTab(item) {
    const links = item.links || {};
    if (item.videoType === "liveclip") return false;
    return !!links.youtube;
  }

  function showLiveClipTab(item) {
    const links = item.links || {};
    if (links.liveclip) return true;
    return item.videoType === "liveclip" && !!links.youtube;
  }

  function getLiveClipUrl(item) {
    const links = item.links || {};
    return links.liveclip || (item.videoType === "liveclip" ? links.youtube : "");
  }

  function getDetailNavClass(item, { includeDetails = true } = {}) {
    let count = includeDetails ? 2 : 1;
    if (showMvTab(item)) count += 1;
    if (showLiveClipTab(item)) count += 1;
    if (count === 2) return "album-detail__nav album-detail__nav--two";
    if (count === 4) return "album-detail__nav album-detail__nav--four";
    return "album-detail__nav";
  }

  function renderVideoEmbed(url, title, emptyKey = "pages.album.noMv") {
    const embedUrl = youtubeEmbedUrl(url);
    if (!embedUrl) {
      return `<p class="album-detail__empty">${t(emptyKey)}</p>`;
    }
    return `
      <div class="album-detail__video">
        <iframe
          src="${embedUrl}"
          title="${escapeHtml(title)}"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
          loading="lazy"
        ></iframe>
      </div>`;
  }

  function renderMvPanel(item) {
    const label = getMvTabLabel(item);
    return renderVideoEmbed(item.links?.youtube, label);
  }

  function renderLiveClipPanel(item) {
    return renderVideoEmbed(
      getLiveClipUrl(item),
      t("pages.album.tabLiveClip"),
      "pages.album.noLiveClip"
    );
  }

  function renderVideoTabs(item) {
    const tabs = [];

    if (showMvTab(item)) {
      tabs.push({
        key: "mv",
        label: getMvTabLabel(item),
        panelHtml: renderMvPanel(item),
      });
    }

    if (showLiveClipTab(item)) {
      tabs.push({
        key: "liveclip",
        label: t("pages.album.tabLiveClip"),
        panelHtml: renderLiveClipPanel(item),
      });
    }

    const buttons = tabs
      .map(
        (tab) => `
          <button
            type="button"
            class="album-detail__nav-btn"
            role="tab"
            data-album-detail-tab="${tab.key}"
            aria-selected="false"
            aria-controls="album-detail-panel-${tab.key}"
            id="album-detail-tab-${tab.key}"
            tabindex="-1"
          >${tab.label}</button>`
      )
      .join("");

    const panels = tabs
      .map(
        (tab) => `
          <div
            class="album-detail__panel"
            role="tabpanel"
            id="album-detail-panel-${tab.key}"
            data-album-detail-panel="${tab.key}"
            aria-labelledby="album-detail-tab-${tab.key}"
            hidden
          >
            ${tab.panelHtml}
          </div>`
      )
      .join("");

    return { buttons, panels };
  }

  function isKoreanLang() {
    return getLang() === "ko";
  }

  function renderPlatformIconAnchors(links, linkClass) {
    const icons = [];

    if (isKoreanLang() && links.melon) {
      icons.push(`
        <a
          class="${linkClass} ${linkClass}--melon"
          href="${links.melon}"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="${escapeHtml(t("pages.album.listenMelon"))}"
          data-album-track-link
        >
          <img src="images/icons/melon.svg?v=3" alt="" width="24" height="24" />
        </a>`);
    }

    if (links.spotify) {
      icons.push(`
        <a
          class="${linkClass} ${linkClass}--spotify"
          href="${links.spotify}"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="${escapeHtml(t("pages.album.listenSpotify"))}"
          data-album-track-link
        >
          <img src="images/icons/spotify.svg" alt="" width="24" height="24" />
        </a>`);
    }

    return icons;
  }

  function renderHeroPlatformButton(service, href, label) {
    const iconSrc =
      service === "melon" ? "images/icons/melon.svg?v=3" : "images/icons/spotify.svg";
    return `
        <a
          class="album-detail__platform-btn album-detail__platform-btn--${service}"
          href="${escapeHtml(href)}"
          target="_blank"
          rel="noopener noreferrer"
          data-album-track-link
        >
          <img
            class="album-detail__platform-btn-icon"
            src="${iconSrc}"
            alt=""
            width="20"
            height="20"
          />
          <span class="album-detail__platform-btn-label">${escapeHtml(label)}</span>
        </a>`;
  }

  function renderPlatformLinks(links) {
    const buttons = [];

    if (isKoreanLang() && links.melon) {
      buttons.push(renderHeroPlatformButton("melon", links.melon, t("pages.album.listenMelon")));
    }

    if (links.spotify) {
      const label = isKoreanLang()
        ? t("pages.album.listenSpotify")
        : t("pages.album.platformSpotify");
      buttons.push(renderHeroPlatformButton("spotify", links.spotify, label));
    }

    if (!buttons.length) return "";

    const soloClass = buttons.length === 1 ? " album-detail__platforms--solo" : "";
    return `<div class="album-detail__platforms${soloClass}">${buttons.join("")}</div>`;
  }

  function renderTrackRowLinks(links) {
    const icons = renderPlatformIconAnchors(links, "album-detail__track-link");
    if (!icons.length) return "";
    return `<span class="album-detail__track-links">${icons.join("")}</span>`;
  }

  function renderLyricsPanel(item, links) {
    if (item.lyricsText) {
      return `<pre class="album-detail__lyrics-text">${escapeHtml(item.lyricsText)}</pre>`;
    }
    if (links.lyrics) {
      return `<p class="album-detail__empty">
        <a href="${links.lyrics}" target="_blank" rel="noopener noreferrer">${t("pages.album.viewLyrics")}</a>
      </p>`;
    }
    return `<p class="album-detail__empty">${t("pages.album.noLyrics")}</p>`;
  }

  function setDetailTab(tabKey, root = panelBodyEl) {
    if (!root) return;
    root.querySelectorAll("[data-album-detail-tab]").forEach((btn) => {
      const selected = btn.dataset.albumDetailTab === tabKey;
      btn.setAttribute("aria-selected", selected ? "true" : "false");
      btn.tabIndex = selected ? 0 : -1;
    });
    root.querySelectorAll("[data-album-detail-panel]").forEach((panelEl) => {
      panelEl.hidden = panelEl.dataset.albumDetailPanel !== tabKey;
    });
  }

  function renderAlbumReleaseBody(album, category = "album") {
    const desc = getDescription(album, { category });

    return `
      <div class="album-detail album-detail--release album-detail--has-tracklist">
        <div class="album-detail__hero">
          ${renderDetailCover(album, { category })}
        </div>
        ${renderTracklistPageContent(album, category, { desc })}
      </div>`;
  }

  function renderDetailsSection(item, desc) {
    const creditsHtml = renderCreditsMeta(item);
    return `
      ${renderReleaseDateMeta(item)}
      ${desc ? `<div class="album-detail__intro"><p class="album-detail__desc">${escapeHtml(desc)}</p></div>` : ""}
      ${creditsHtml ? `<div class="album-detail__details">${creditsHtml}</div>` : ""}`;
  }

  function renderTrackDetailBody(item, { albumId = null, category = "album" } = {}) {
    const desc = getDescription(item, { category: albumId ? "album" : category, albumId });
    const links = item.links || {};
    const showTracklist = category !== "album" && hasReleaseTracklist(item);

    if (showTracklist) {
      return `
        <div class="album-detail album-detail--has-tracklist album-detail--tracklist-only">
          <div class="album-detail__hero">
            ${renderDetailCover(item, { category: albumId ? "album" : category, albumId })}
          </div>
          ${renderTracklistPageContent(item, category, {
            desc,
            currentTrackId: item.id,
            creditsItem: item,
          })}
        </div>`;
    }

    const navClass = getDetailNavClass(item);
    const { buttons: videoTabBtns, panels: videoPanels } = renderVideoTabs(item);
    const detailsSectionHtml = renderDetailsSection(item, desc);

    return `
      <div class="album-detail">
        <div class="album-detail__hero">
          ${renderDetailCover(item, { category: albumId ? "album" : category, albumId })}
          ${renderPlatformLinks(links)}
        </div>
        <nav
          class="${navClass}"
          role="tablist"
          aria-label="${escapeHtml(t("pages.album.detailTabListLabel"))}"
        >
          <button
            type="button"
            class="album-detail__nav-btn"
            role="tab"
            data-album-detail-tab="details"
            aria-selected="true"
            aria-controls="album-detail-panel-details"
            id="album-detail-tab-details"
          >${t("pages.album.tabDetails")}</button>
          <button
            type="button"
            class="album-detail__nav-btn"
            role="tab"
            data-album-detail-tab="lyrics"
            aria-selected="false"
            aria-controls="album-detail-panel-lyrics"
            id="album-detail-tab-lyrics"
            tabindex="-1"
          >${t("pages.album.tabLyrics")}</button>
          ${videoTabBtns}
        </nav>
        <div class="album-detail__panels">
          <div
            class="album-detail__panel"
            role="tabpanel"
            id="album-detail-panel-details"
            data-album-detail-panel="details"
            aria-labelledby="album-detail-tab-details"
          >
            ${detailsSectionHtml}
          </div>
          <div
            class="album-detail__panel"
            role="tabpanel"
            id="album-detail-panel-lyrics"
            data-album-detail-panel="lyrics"
            aria-labelledby="album-detail-tab-lyrics"
            hidden
          >
            ${renderLyricsPanel(item, links)}
          </div>
          ${videoPanels}
        </div>
      </div>`;
  }

  function resetDetailScroll() {
    if (panelBodyEl) panelBodyEl.scrollTop = 0;
  }

  function showDetailPanel({ titleHtml, idLabel, bodyHtml }) {
    panelIdEl.textContent = idLabel;
    panelTitleEl.innerHTML = titleHtml;
    panelBodyEl.innerHTML = bodyHtml;
    resetDetailScroll();

    overlay.hidden = false;
    overlay.removeAttribute("aria-hidden");
    requestAnimationFrame(() => {
      resetDetailScroll();
      overlay.classList.add("is-open");
    });
    document.body.classList.add("member-overlay-open");
  }

  function openDetail(category, id, { fromHistory = false, trackId = null } = {}) {
    const item = findItem(category, id);
    if (!item || !overlay || !panel) return;

    if (trackId && isAlbumRelease(item, category)) {
      const track = findAlbumTrack(id, trackId);
      if (!track) return;

      if (track.noDetail) {
        openItemId = id;
        lastFocusedEl = document.activeElement;
        showDetailPanel({
          titleHtml: renderDetailTitleHtml({ category, item }),
          idLabel: id.toUpperCase().replace(/-/g, "·"),
          bodyHtml: renderAlbumReleaseBody(item, category),
        });
        if (!fromHistory) {
          history.replaceState({ albumDetail: `${category}/${id}` }, "", `#${category}/${id}`);
        }
        return;
      }

      openItemId = trackId;
      lastFocusedEl = document.activeElement;
      showDetailPanel({
        titleHtml: renderDetailTitleHtml({ category, item, track, albumId: id }),
        idLabel: trackId.toUpperCase().replace(/-/g, "·"),
        bodyHtml: renderTrackDetailBody(track, { albumId: id, category }),
      });

      if (!fromHistory) {
        history.pushState(
          { albumDetail: `${category}/${id}/track/${trackId}`, albumParent: `${category}/${id}` },
          "",
          `#${category}/${id}/track/${trackId}`
        );
      }

      const closeBtn = panel.querySelector("[data-album-detail-close]");
      if (closeBtn) closeBtn.focus();
      return;
    }

    openItemId = id;
    lastFocusedEl = document.activeElement;

    const bodyHtml = isAlbumRelease(item, category)
      ? renderAlbumReleaseBody(item, category)
      : renderTrackDetailBody(item, { category });

    showDetailPanel({
      titleHtml: renderDetailTitleHtml({ category, item }),
      idLabel: id.toUpperCase().replace(/-/g, "·"),
      bodyHtml,
    });

    if (!fromHistory) {
      history.pushState({ albumDetail: `${category}/${id}` }, "", `#${category}/${id}`);
    }

    const closeBtn = panel.querySelector("[data-album-detail-close]");
    if (closeBtn) closeBtn.focus();
  }

  function goBackToAlbum(albumId) {
    const album = findItem("album", albumId);
    if (!album) return;

    openItemId = albumId;
    showDetailPanel({
      titleHtml: renderDetailTitleHtml({ category: "album", item: album }),
      idLabel: albumId.toUpperCase().replace(/-/g, "·"),
      bodyHtml: renderAlbumReleaseBody(album, "album"),
    });
    history.replaceState({ albumDetail: `album/${albumId}` }, "", `#album/${albumId}`);
  }

  function closeDetail({ fromHistory = false } = {}) {
    if (!overlay?.classList.contains("is-open")) return;

    closeCoverLightbox();

    overlay.classList.remove("is-open");
    document.body.classList.remove("member-overlay-open");
    overlay.setAttribute("aria-hidden", "true");
    openItemId = null;

    const finish = () => {
      overlay.hidden = true;
      if (panelBodyEl) {
        panelBodyEl.innerHTML = "";
        panelBodyEl.scrollTop = 0;
      }
      if (panelTitleEl) panelTitleEl.innerHTML = "";
      if (lastFocusedEl && typeof lastFocusedEl.focus === "function") {
        lastFocusedEl.focus();
      }
    };

    let done = false;
    const onEnd = (e) => {
      if (e.target !== panel || e.propertyName !== "opacity") return;
      panel.removeEventListener("transitionend", onEnd);
      if (!done) {
        done = true;
        finish();
      }
    };

    panel.addEventListener("transitionend", onEnd);
    setTimeout(() => {
      if (!done) {
        done = true;
        panel.removeEventListener("transitionend", onEnd);
        finish();
      }
    }, 420);

    if (!fromHistory) {
      const hasDetailHash = /^#(album|single|ost)\//.test(location.hash);
      if (hasDetailHash || history.state?.albumDetail) {
        history.replaceState(null, "", `${location.pathname}${location.search}`);
      }
    }
  }

  function handleHistory() {
    const parsed = parseHash();
    if (parsed) {
      const { category, id, trackId } = parsed;
      if (category !== "album") {
        activeTab = category;
        updateTitle();
        updateTabs();
      }
      renderGrid();
      openDetail(category, id, { fromHistory: true, trackId });
      return;
    }

    if (overlay?.classList.contains("is-open")) {
      closeDetail({ fromHistory: true });
    }
  }

  function refreshOpenDetail() {
    if (!openItemId || !overlay?.classList.contains("is-open")) return;
    const parsed = parseHash();
    if (!parsed) return;

    if (parsed.trackId) {
      const album = findItem(parsed.category, parsed.id);
      const track = findAlbumTrack(parsed.id, parsed.trackId);
      if (track && album) {
        panelTitleEl.innerHTML = renderDetailTitleHtml({
          category: parsed.category,
          item: album,
          track,
          albumId: parsed.id,
        });
        panelBodyEl.innerHTML = renderTrackDetailBody(track, {
          albumId: parsed.id,
          category: parsed.category,
        });
        setDetailTab("details");
      }
      return;
    }

    const item = findItem(parsed.category, parsed.id);
    if (!item) return;

    panelTitleEl.innerHTML = renderDetailTitleHtml({ category: parsed.category, item });
    panelBodyEl.innerHTML = isAlbumRelease(item, parsed.category)
      ? renderAlbumReleaseBody(item, parsed.category)
      : renderTrackDetailBody(item, { category: parsed.category });
    if (!isAlbumRelease(item, parsed.category) && !usesInlineTracklistLayout(item, parsed.category)) {
      setDetailTab("details");
    }
  }

  function setTab(tab) {
    if (!TAB_KEYS.includes(tab) || tab === activeTab) return;
    if (overlay?.classList.contains("is-open")) {
      closeDetail();
    }
    activeTab = tab;
    updateTitle();
    updateTabs();
    renderGrid();
  }

  function initTabs() {
    if (!tabsEl) return;
    tabsEl.innerHTML = TAB_KEYS.map(
      (tab) =>
        `<button
          type="button"
          class="album-tabs__btn"
          role="tab"
          data-album-tab="${tab}"
          aria-selected="${tab === activeTab ? "true" : "false"}"
          tabindex="${tab === activeTab ? "0" : "-1"}"
        >${tabLabel(tab)}</button>`
    ).join("");

    tabsEl.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-album-tab]");
      if (!btn) return;
      setTab(btn.dataset.albumTab);
    });

    tabsEl.addEventListener("keydown", (e) => {
      const tabs = [...tabsEl.querySelectorAll("[data-album-tab]")];
      const idx = tabs.findIndex((btn) => btn.getAttribute("aria-selected") === "true");
      if (idx < 0) return;

      let next = idx;
      if (e.key === "ArrowRight") next = (idx + 1) % tabs.length;
      else if (e.key === "ArrowLeft") next = (idx - 1 + tabs.length) % tabs.length;
      else return;

      e.preventDefault();
      setTab(tabs[next].dataset.albumTab);
      tabs[next].focus();
    });
  }

  function bindEvents() {
    pageRoot.addEventListener("click", (e) => {
      const card = e.target.closest("[data-album-item]");
      if (!card) return;
      openDetail(card.dataset.albumCategory, card.dataset.albumItem);
    });

    overlay?.addEventListener("click", (e) => {
      if (e.target.closest("[data-album-detail-close]")) {
        closeDetail();
        return;
      }

      const zoomBtn = e.target.closest("[data-album-cover-zoom]");
      if (zoomBtn) {
        const img = zoomBtn.querySelector(".album-detail__cover");
        openCoverLightbox(zoomBtn.dataset.zoomSrc, img?.alt || "");
        return;
      }

      if (e.target.closest("[data-album-track-link]")) {
        return;
      }

      const backBtn = e.target.closest("[data-album-crumb-back]");
      if (backBtn) {
        goBackToAlbum(backBtn.dataset.albumCrumbBack);
        return;
      }

      const trackBtn = e.target.closest("[data-album-track]");
      if (trackBtn) {
        openDetail(trackBtn.dataset.albumCategory || "album", trackBtn.dataset.albumParent, {
          trackId: trackBtn.dataset.albumTrack,
        });
        return;
      }

      const detailTab = e.target.closest("[data-album-detail-tab]");
      if (detailTab) {
        setDetailTab(detailTab.dataset.albumDetailTab);
      }
    });

    coverLightbox?.addEventListener("click", (e) => {
      if (e.target.closest("[data-album-cover-lightbox-close]")) {
        closeCoverLightbox();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && coverLightbox?.classList.contains("is-open")) {
        closeCoverLightbox();
        return;
      }

      if (e.key === "Escape" && overlay?.classList.contains("is-open")) {
        closeDetail();
      }
    });

    window.addEventListener("popstate", handleHistory);
    document.addEventListener("i18n:change", () => {
      initTabs();
      updateTitle();
      renderGrid();
      refreshOpenDetail();
    });
  }

  async function loadDiscography() {
    const [res, i18nRes] = await Promise.all([
      fetch("data/discography.json"),
      fetch("data/discography-i18n.json"),
    ]);
    if (!res.ok) throw new Error("Discography data not found");
    discography = await res.json();
    if (i18nRes.ok) {
      discographyI18n = await i18nRes.json();
    } else {
      discographyI18n = {};
    }
  }

  async function init() {
    try {
      await loadDiscography();
    } catch {
      if (gridEl) {
        gridEl.innerHTML = `<li class="album-grid__empty">${t("pages.album.loadError")}</li>`;
      }
      return;
    }

    initTabs();
    updateTitle();
    renderGrid();
    bindEvents();
    handleHistory();
  }

  if (window.i18n?.ready) {
    window.i18n.ready.then(init);
  } else {
    init();
  }
})();
