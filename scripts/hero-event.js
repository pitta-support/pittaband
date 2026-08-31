(function () {
  "use strict";

  /**
   * Hero event section — driven by DDAY_CAMPAIGNS[].hero
   * Static HTML in index.html is the fallback; this script updates it from config.
   */
  const root = document.getElementById("hero-event");
  const wrapper = document.getElementById("hero-default");
  if (!root || !wrapper) return;

  function t(key, fallback, params) {
    if (!key) {
      console.warn("[hero-event] Missing i18n key:", {
        key,
        fallback,
      });
      return fallback ?? "";
    }

    if (window.i18n?.t) {
      const resolved = params ? window.i18n.t(key, params) : window.i18n.t(key);
      if (resolved != null && resolved !== key) return resolved;
    }
    if (params && typeof fallback === "string") {
      return Object.keys(params).reduce(
        (text, name) => text.replace(`{${name}}`, String(params[name])),
        fallback
      );
    }
    return fallback ?? key;
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function resolveAssetUrl(path) {
    if (typeof window.resolveSiteAssetUrl === "function") {
      return window.resolveSiteAssetUrl(path);
    }
    if (!path) return "";
    if (/^https?:\/\//i.test(path)) return path;
    try {
      return new URL(path, document.baseURI).href;
    } catch {
      return path;
    }
  }

  function getKstDateKey(date = new Date()) {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(
      date
    );
  }

  function parseKstDateStart(dateStr) {
    return new Date(`${dateStr}T00:00:00+09:00`);
  }

  function parseKstDateEnd(dateStr) {
    return new Date(`${dateStr}T23:59:59.999+09:00`);
  }

  function addDaysToDateStr(dateStr, days) {
    const start = parseKstDateStart(dateStr);
    return getKstDateKey(new Date(start.getTime() + days * 86400000));
  }

  function resolveCampaignState(campaign, now) {
    if (!campaign?.enabled) return null;

    if (campaign.type === "concert") {
      const day1 = campaign.dates?.[0];
      const day2 = campaign.dates?.[1] || day1;
      if (!day1) return null;

      const showFrom = parseKstDateStart(campaign.showFrom || day1);
      const day1Start = parseKstDateStart(day1);
      const lastEnd = parseKstDateEnd(day2);

      if (now < showFrom) return null;
      if (now > lastEnd) return { expired: true };

      return { campaign, showLink: now < day1Start };
    }

    if (campaign.type === "festival") {
      const day = campaign.date;
      if (!day) return null;

      const showFrom = parseKstDateStart(campaign.showFrom || day);
      const dayStart = parseKstDateStart(day);
      const dayEnd = parseKstDateEnd(day);

      if (now < showFrom) return null;
      if (now > dayEnd) return { expired: true };

      return { campaign, showLink: now < dayStart };
    }

    if (campaign.type === "album") {
      const release = campaign.date;
      if (!release) return null;

      const showFrom = parseKstDateStart(campaign.showFrom || release);
      const lastDisplayDay = addDaysToDateStr(
        release,
        campaign.displayDays ?? 7
      );
      const displayEnd = parseKstDateEnd(lastDisplayDay);
      const nowKey = getKstDateKey(now);

      if (now < showFrom) return null;
      if (now > displayEnd) return { expired: true };

      return { campaign, showLink: nowKey >= release };
    }

    return null;
  }

  function getActiveHeroEntry(now = new Date()) {
    return (
      (window.DDAY_CAMPAIGNS || [])
        .filter((campaign) => campaign.enabled && campaign.hero)
        .map((campaign) => ({
          campaign,
          state: resolveCampaignState(campaign, now),
        }))
        .filter((entry) => entry.state && !entry.state.expired)
        .sort(
          (a, b) => (b.campaign.priority || 0) - (a.campaign.priority || 0)
        )[0] || null
    );
  }

  function defaultButtonI18n(type) {
    if (type === "festival") return "dday.linkFestival";
    if (type === "album") return "dday.linkAlbum";
    return "dday.linkConcert";
  }

  function setText(el, value) {
    if (el && value != null) el.textContent = value;
  }

  function renderLines(container, lines) {
    if (!container || !lines?.length) return;

    container
      .querySelectorAll(".hero-event__text")
      .forEach((el) => el.remove());

    const meta = container.querySelector(".hero-event__meta");
    const fragment = document.createDocumentFragment();

    for (const line of lines) {
      const span = document.createElement("span");
      span.className = "hero-event__text";
      if (line.class) span.classList.add(`hero-event__text--${line.class}`);
      span.textContent = t(line.i18n, line.fallback || "");
      fragment.appendChild(span);
    }

    container.insertBefore(fragment, meta || null);
  }

  function renderVenue(venue) {
    const link = document.getElementById("hero-event-venue-link");
    if (!link || !venue) return;

    const label = t(venue.i18n, venue.fallback || "");
    const mapKo = venue.mapKo || "";
    const mapDefault = venue.mapDefault || mapKo;
    const aria = t(venue.mapAriaI18n, venue.mapAriaFallback || label);

    link.href = mapDefault;
    link.dataset.mapKo = mapKo;
    link.dataset.mapDefault = mapDefault;
    link.setAttribute("aria-label", aria);

    const labelEl = link.querySelector("span");
    if (labelEl) labelEl.textContent = label;
  }

  function renderTicketButton(campaign, state) {
    const actions = document.getElementById("hero-event-actions");
    const btn = document.getElementById("hero-event-ticket-btn");
    if (!actions || !btn) return;

    if (!state.showLink) {
      btn.hidden = true;
      actions.hidden = !document.getElementById("hero-event-promo-btn");
      return;
    }

    const hero = campaign.hero;
    const link = campaign.link || {};
    const href = link.href || link.fallbackHref || "#";
    const external = link.external !== false && /^https?:\/\//i.test(href);

    btn.hidden = false;
    btn.href = href;
    btn.textContent = t(
      hero.buttonI18n ||
        campaign.link?.labelI18n ||
        defaultButtonI18n(campaign.type),
      hero.buttonFallback || "예매하기"
    );

    if (external) {
      btn.target = "_blank";
      btn.rel = "noopener noreferrer";
    } else {
      btn.removeAttribute("target");
      btn.removeAttribute("rel");
    }

    actions.hidden = false;
  }

  function resolveHeroStatus(campaign, state) {
    if (campaign?.type === "concert" || campaign?.type === "festival") {
      return state?.showLink ? "upcoming" : "live";
    }
    if (campaign?.type === "album") {
      return state?.showLink ? "live" : "upcoming";
    }
    return "upcoming";
  }

  function statusTagLabel(status) {
    const map = {
      upcoming: ["pages.concert.statusUpcoming", "UPCOMING"],
      live: ["pages.concert.statusLive", "LIVE"],
      ended: ["pages.concert.statusEnded", "ENDED"],
    };
    const [key, fallback] = map[status] || map.upcoming;
    return t(key, fallback);
  }

  function renderHero(entry) {
    const { campaign, state } = entry;
    const hero = campaign.hero;
    const status = resolveHeroStatus(campaign, state);

    const imageEl = document.getElementById("hero-event-image");
    if (imageEl && hero.image) {
      imageEl.src = resolveAssetUrl(hero.image);
      imageEl.alt = t(hero.imageAltI18n, hero.imageAltFallback || "");
    }

    const tagEl = document.getElementById("hero-event-tag");
    if (tagEl) {
      tagEl.className = `hero-event__tag hero-event__tag--${status}`;
      setText(
        tagEl,
        campaign.type === "album"
          ? t(hero.tagI18n, hero.tagFallback || statusTagLabel(status))
          : statusTagLabel(status)
      );
    }

    const logoEl = document.getElementById("hero-event-logo");
    if (logoEl) {
      if (hero.logo) {
        logoEl.src = resolveAssetUrl(hero.logo);
        logoEl.alt = t(hero.logoAltI18n, hero.logoAltFallback || "");
        logoEl.hidden = false;
        logoEl.className = "hero-event__logo";
        if (hero.logoClass) logoEl.classList.add(hero.logoClass);
      } else {
        logoEl.hidden = true;
      }
    }

    const copyEl = document.getElementById("hero-event-copy");
    if (copyEl && hero.lines?.length) {
      renderLines(copyEl, hero.lines);
    }

    const dateEl = copyEl?.querySelector(".hero-event__meta--date span");
    setText(dateEl, t(hero.dateI18n, hero.dateFallback || ""));

    renderVenue(hero.venue);
    renderTicketButton(campaign, state);
    showHero();
    syncVenueLink();
    window.dispatchEvent(new CustomEvent("hero-event:rendered"));
  }

  function showHero() {
    wrapper.hidden = false;
    wrapper.removeAttribute("hidden");
    wrapper.removeAttribute("aria-hidden");
    root.hidden = false;
    root.removeAttribute("hidden");
  }

  function hideHero() {
    wrapper.hidden = true;
  }

  function syncVenueLink() {
    const link = document.getElementById("hero-event-venue-link");
    if (!link) return;

    const lang =
      window.i18n?.getLang?.() || document.documentElement.lang || "ko";
    const ko = link.dataset.mapKo;
    const fallback = link.dataset.mapDefault;
    link.href = lang === "ko" && ko ? ko : fallback || ko || link.href;
  }

  function isAnniversaryActive() {
    const section = document.getElementById("archive");
    if (section?.classList.contains("hero--anniversary")) return true;

    const anniversary = document.getElementById("hero-anniversary");
    return Boolean(
      anniversary &&
        !anniversary.hidden &&
        anniversary.classList.contains("is-visible")
    );
  }

  function refresh() {
    if (isAnniversaryActive()) {
      hideHero();
      return;
    }

    const entry = getActiveHeroEntry();
    if (entry) {
      renderHero(entry);
      return;
    }

    // Keep static HTML fallback visible when no dynamic campaign applies.
    showHero();
    syncVenueLink();
  }

  document.addEventListener("i18n:ready", refresh);
  document.addEventListener("i18n:change", refresh);
  document.addEventListener("DOMContentLoaded", refresh);
  document.addEventListener("hero-anniversary:done", refresh);

  refresh();

  window.heroEvent = { refresh, syncVenueLink };
})();
