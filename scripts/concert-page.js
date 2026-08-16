(function () {
  "use strict";

  const PAGE_TYPE = document.body.dataset.page;
  const PAGE = {
    concert: {
      rootClass: "site-page--concert",
      timelineId: "concert-timeline",
      dataUrl: "data/concerts.json",
      itemsKey: "concerts",
      i18n: "pages.concert",
    },
    festival: {
      rootClass: "site-page--festival",
      timelineId: "festival-timeline",
      dataUrl: "data/festivals.json",
      itemsKey: "festivals",
      i18n: "pages.festival",
    },
  }[PAGE_TYPE];

  if (!PAGE) return;

  const pageRoot = document.querySelector(`.${PAGE.rootClass}`);
  if (!pageRoot) return;

  const timelineEl = document.getElementById(PAGE.timelineId);

  const SHOW_DURATION_MS = 3 * 60 * 60 * 1000;
  const POSTER_PLACEHOLDER = "images/albums/placeholder.svg";

  let pageData = null;

  function t(key, vars) {
    return window.i18n?.t(key, vars) ?? key;
  }

  function ti(key, vars) {
    return t(`${PAGE.i18n}.${key}`, vars);
  }

  function getLang() {
    return window.i18n?.getLang?.() || document.documentElement.lang || "ko";
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function parseDateTime(value) {
    const time = new Date(value).getTime();
    return Number.isFinite(time) ? time : 0;
  }

  function localizedField(field) {
    if (!field) return "";
    if (typeof field === "string") return field;
    const lang = getLang();
    return field[lang] || field.ko || field.en || "";
  }

  function localizeSetlistNote(note) {
    if (!note) return "";
    return note.replace(/앵콜/g, ti("encore"));
  }

  function formatShowDate(dateTime) {
    const ms = parseDateTime(dateTime);
    if (!ms) return "";
    const d = new Date(ms);
    const y = d.getFullYear();
    const m = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const h = pad(d.getHours());
    const min = pad(d.getMinutes());
    return `${y}.${m}.${day} · ${h}:${min}`;
  }

  function getShowDateLabel(show) {
    const schedule = localizedField(show.schedule);
    return schedule || formatShowDate(show.dateTime);
  }

  function renderYoutubeIcon(className = "concert-card__video-icon") {
    return `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`;
  }

  function renderVideosHtml(videos) {
    if (!Array.isArray(videos) || !videos.length) return "";

    const items = videos
      .filter((entry) => entry?.url)
      .map(
        (entry) => `
        <a
          class="concert-card__video-link"
          href="${escapeHtml(entry.url)}"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="${escapeHtml(entry.label || "YouTube")}"
        >
          ${renderYoutubeIcon()}
          <span>${escapeHtml(entry.label || "YouTube")}</span>
        </a>`
      )
      .join("");

    return items ? `<div class="concert-card__videos">${items}</div>` : "";
  }

  function renderSetlistTrackHtml(track) {
    const noteHtml = track.note
      ? ` <span class="concert-card__setlist-note">(${escapeHtml(localizeSetlistNote(track.note))})</span>`
      : "";
    const liveHtml = track.liveUrl
      ? `<a class="concert-card__live-link" href="${escapeHtml(track.liveUrl)}" target="_blank" rel="noopener noreferrer" aria-label="Live: ${escapeHtml(track.title)}">${renderYoutubeIcon("concert-card__live-link-icon")}<span class="concert-card__live-link-label">Live</span></a>`
      : "";

    return `<span class="concert-card__setlist-track">${escapeHtml(track.title)}</span>${noteHtml}${liveHtml}`;
  }

  function renderSetlistHtml(setlist) {
    if (!Array.isArray(setlist) || !setlist.length) return "";

    const items = setlist
      .map(
        (track, index) =>
          `<li><span class="concert-card__setlist-num">${index + 1}.</span> ${renderSetlistTrackHtml(track)}</li>`
      )
      .join("");

    return `
      <div class="concert-card__setlist">
        <ol class="concert-card__setlist-list">${items}</ol>
      </div>`;
  }

  function getShowStatus(show, now = Date.now()) {
    const start = parseDateTime(show.dateTime);
    const end = start + SHOW_DURATION_MS;
    if (!start) return "ended";
    if (now >= start && now < end) return "live";
    if (now < start) return "upcoming";
    return "ended";
  }

  function getNextShow(shows, now = Date.now()) {
    return (
      shows
        .filter((show) => getShowStatus(show, now) === "upcoming")
        .sort((a, b) => parseDateTime(a.dateTime) - parseDateTime(b.dateTime))[0] ||
      null
    );
  }

  function sortShows(shows) {
    const now = Date.now();
    const upcoming = shows
      .filter((show) => getShowStatus(show, now) === "upcoming")
      .sort((a, b) => parseDateTime(a.dateTime) - parseDateTime(b.dateTime));
    const live = shows
      .filter((show) => getShowStatus(show, now) === "live")
      .sort((a, b) => parseDateTime(a.dateTime) - parseDateTime(b.dateTime));
    const past = shows
      .filter((show) => getShowStatus(show, now) === "ended")
      .sort((a, b) => parseDateTime(b.dateTime) - parseDateTime(a.dateTime));
    return [...live, ...upcoming, ...past];
  }

  function getDisplayShows() {
    return sortShows(pageData?.[PAGE.itemsKey] || []);
  }

  function statusLabel(status) {
    const map = {
      upcoming: "statusUpcoming",
      live: "statusLive",
      ended: "statusEnded",
    };
    return ti(map[status] || map.ended);
  }

  function getMapUrl(show) {
    const map = show.mapUrl;
    if (!map) return "";
    if (typeof map === "string") return map;
    const lang = getLang();
    if (lang === "ko" && map.ko) return map.ko;
    return map.default || map.en || map.ko || "";
  }

  function renderVenueHtml(show, venue) {
    if (!venue) return "";
    const mapUrl = getMapUrl(show);
    const label = escapeHtml(ti("openMap"));

    if (!mapUrl) {
      return `<p class="concert-card__venue">${escapeHtml(venue)}</p>`;
    }

    return `
      <p class="concert-card__venue">
        <a
          class="concert-card__venue-link"
          href="${escapeHtml(mapUrl)}"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="${label}: ${escapeHtml(venue)}"
        >
          <svg class="concert-card__venue-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"/>
          </svg>
          <span>${escapeHtml(venue)}</span>
        </a>
      </p>`;
  }

  function renderSessionsHtml(show) {
    if (!Array.isArray(show.sessions) || !show.sessions.length) return "";

    const blocks = show.sessions
      .map((session) => {
        const city = localizedField(session.city);
        const schedule = localizedField(session.schedule);
        const venue = localizedField(session.venue);
        if (!city && !schedule && !venue) return "";

        return `
          <div class="concert-card__session">
            ${city ? `<p class="concert-card__session-city">${escapeHtml(city)}</p>` : ""}
            ${schedule ? `<p class="concert-card__session-date">${escapeHtml(schedule)}</p>` : ""}
            ${renderVenueHtml(session, venue)}
          </div>`;
      })
      .filter(Boolean)
      .join("");

    return blocks ? `<div class="concert-card__sessions">${blocks}</div>` : "";
  }

  function getPosters(show) {
    if (Array.isArray(show.posters) && show.posters.length) {
      return show.posters
        .map((entry) => {
          if (typeof entry === "string") return { src: entry.trim() };
          return { src: entry.src?.trim() || "", city: entry.city };
        })
        .filter((entry) => entry.src);
    }
    const single = show.poster?.trim();
    return single ? [{ src: single }] : [];
  }

  function renderPosterHtml(show, { featured = false } = {}) {
    const posters = getPosters(show);
    if (!posters.length) {
      if (!featured) return "";
      return `
      <div class="concert-card__media concert-card__media--featured">
        <img
          class="concert-card__poster"
          src="${POSTER_PLACEHOLDER}"
          alt=""
          loading="eager"
          draggable="false"
        />
      </div>`;
    }

    const mediaClass = [
      "concert-card__media",
      posters.length > 1 ? "concert-card__media--slider" : "",
      featured ? "concert-card__media--featured" : "concert-card__media--standard",
    ]
      .filter(Boolean)
      .join(" ");

    if (posters.length === 1) {
      const poster = posters[0].src;
      return `
      <div class="${mediaClass}">
        <img
          class="concert-card__poster"
          src="${escapeHtml(poster)}"
          alt=""
          loading="${featured ? "eager" : "lazy"}"
          draggable="false"
          onerror="this.onerror=null;this.src='${POSTER_PLACEHOLDER}';"
        />
      </div>`;
    }

    const slides = posters
      .map((entry, index) => {
        return `
          <figure class="concert-poster-slide${index === 0 ? " is-active" : ""}" data-poster-slide="${index}">
            <img
              class="concert-card__poster"
              src="${escapeHtml(entry.src)}"
              alt="${escapeHtml(show.title || "")}"
              loading="${featured && index === 0 ? "eager" : "lazy"}"
              draggable="false"
              onerror="this.onerror=null;this.src='${POSTER_PLACEHOLDER}';"
            />
          </figure>`;
      })
      .join("");

    const dots = posters
      .map(
        (_, index) =>
          `<button type="button" class="concert-poster-slider__dot${index === 0 ? " is-active" : ""}" data-poster-dot="${index}" aria-label="${index + 1} / ${posters.length}"></button>`
      )
      .join("");

    return `
      <div class="${mediaClass}" data-poster-slider>
        <div class="concert-poster-slider__viewport" data-poster-viewport>
          ${slides}
          <div class="concert-poster-slider__controls">
            <button type="button" class="concert-poster-slider__btn" data-poster-prev aria-label="Previous">&lsaquo;</button>
            <div class="concert-poster-slider__dots">${dots}</div>
            <button type="button" class="concert-poster-slider__btn" data-poster-next aria-label="Next">&rsaquo;</button>
          </div>
        </div>
      </div>`;
  }

  function initPosterSliders(root = timelineEl) {
    if (!root) return;

    root.querySelectorAll("[data-poster-slider]").forEach((slider) => {
      const slides = slider.querySelectorAll("[data-poster-slide]");
      if (slides.length < 2) return;

      const viewport = slider.querySelector("[data-poster-viewport]");
      const dots = slider.querySelectorAll("[data-poster-dot]");
      const prevBtn = slider.querySelector("[data-poster-prev]");
      const nextBtn = slider.querySelector("[data-poster-next]");
      let index = 0;
      let touchStartX = 0;
      let touchDeltaX = 0;

      function goTo(nextIndex) {
        index = (nextIndex + slides.length) % slides.length;
        slides.forEach((slide, i) => {
          slide.classList.toggle("is-active", i === index);
        });
        dots.forEach((dot, i) => {
          dot.classList.toggle("is-active", i === index);
        });
      }

      prevBtn?.addEventListener("click", () => goTo(index - 1));
      nextBtn?.addEventListener("click", () => goTo(index + 1));
      dots.forEach((dot) => {
        dot.addEventListener("click", () => {
          goTo(Number(dot.dataset.posterDot) || 0);
        });
      });

      if (!viewport) return;

      viewport.addEventListener(
        "touchstart",
        (event) => {
          touchStartX = event.changedTouches[0]?.clientX ?? 0;
          touchDeltaX = 0;
        },
        { passive: true }
      );

      viewport.addEventListener(
        "touchmove",
        (event) => {
          const currentX = event.changedTouches[0]?.clientX ?? touchStartX;
          touchDeltaX = currentX - touchStartX;
        },
        { passive: true }
      );

      viewport.addEventListener(
        "touchend",
        () => {
          if (Math.abs(touchDeltaX) < 42) return;
          goTo(touchDeltaX < 0 ? index + 1 : index - 1);
          touchDeltaX = 0;
        },
        { passive: true }
      );
    });
  }

  function renderTimelineItem(show, index, nextId, featured) {
    const status = getShowStatus(show);
    const isNext = show.id === nextId && (status === "upcoming" || status === "live");
    const venue = localizedField(show.venue);
    const detail = localizedField(show.detail);
    const subtitle = localizedField(show.subtitle);
    const ticketUrl = show.ticketUrl?.trim();
    const hasPoster = getPosters(show).length > 0;
    const hasSessions = Array.isArray(show.sessions) && show.sessions.length > 0;
    const dateHtml = hasSessions
      ? ""
      : `<p class="concert-card__date"><time datetime="${escapeHtml(show.dateTime)}">${escapeHtml(getShowDateLabel(show))}</time></p>`;

    const itemClass = [
      "concert-timeline__item",
      featured ? "concert-timeline__item--featured" : "",
    ]
      .filter(Boolean)
      .join(" ");

    const nodeClass = [
      "concert-node",
      isNext || featured ? "concert-node--next" : "",
      status === "ended" && !featured ? "concert-node--ended" : "",
    ]
      .filter(Boolean)
      .join(" ");

    const cardClass = [
      "concert-card",
      featured ? "concert-card--featured" : "concert-card--compact",
      hasPoster ? "concert-card--has-poster" : "",
      hasPoster && !featured ? "concert-card--with-poster" : "",
      isNext ? "concert-card--next" : "",
      status === "ended" && !featured ? "concert-card--ended" : "",
    ]
      .filter(Boolean)
      .join(" ");

    const badgeClass = [
      "concert-card__badge",
      status === "live" ? "concert-card__badge--live" : "",
      status === "ended" ? "concert-card__badge--ended" : "",
    ]
      .filter(Boolean)
      .join(" ");

    const ticketHtml =
      ticketUrl && status !== "ended"
        ? `<a class="concert-card__ticket" href="${escapeHtml(ticketUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(ti("tickets"))}</a>`
        : "";

    const infoHtml = `
      <div class="concert-card__head">
        <span class="${badgeClass}">${escapeHtml(statusLabel(status))}</span>
        <span class="concert-card__title">${escapeHtml(show.title)}</span>
      </div>
      <div class="concert-card__meta">
        ${dateHtml}
        ${subtitle ? `<p class="concert-card__subtitle">${escapeHtml(subtitle)}</p>` : ""}
        ${hasSessions ? renderSessionsHtml(show) : renderVenueHtml(show, venue)}
        ${!hasSessions && detail ? `<p class="concert-card__detail">${escapeHtml(detail)}</p>` : ""}
      </div>
      ${renderVideosHtml(show.videos)}
      ${ticketHtml}`;

    const setlistHtml = renderSetlistHtml(show.setlist);

    const cardContent = hasPoster
      ? `
          <div class="concert-card__layout">
            ${renderPosterHtml(show, { featured })}
            <div class="concert-card__info">${infoHtml}</div>
          </div>
          ${setlistHtml}`
      : `
          <div class="concert-card__body">
            ${infoHtml}
            ${setlistHtml}
          </div>`;

    return `
      <li class="${itemClass}" style="--concert-enter-index: ${index}">
        <span class="${nodeClass}" aria-hidden="true"></span>
        <article class="${cardClass}" data-concert-id="${escapeHtml(show.id)}">${cardContent}</article>
      </li>`;
  }

  function renderTimeline() {
    if (!timelineEl || !pageData) return;

    timelineEl.classList.remove("concert-timeline--enter");
    const items = getDisplayShows();
    const shows = pageData[PAGE.itemsKey] || [];
    const nextId = getNextShow(shows)?.id || null;

    if (!items.length) {
      timelineEl.innerHTML = `<li class="concert-timeline__empty">${escapeHtml(ti("empty"))}</li>`;
      return;
    }

    timelineEl.innerHTML = items
      .map((show, index) => renderTimelineItem(show, index, nextId, index === 0))
      .join("");

    requestAnimationFrame(() => {
      timelineEl.classList.add("concert-timeline--enter");
      initPosterSliders(timelineEl);
    });
  }

  async function loadData() {
    const res = await fetch(PAGE.dataUrl);
    if (!res.ok) throw new Error("Show data not found");
    pageData = await res.json();
  }

  function initScrollTop() {
    const btn = document.getElementById("concert-scroll-top");
    if (!btn) return;

    const scrollRoot = document.body;
    const threshold = 280;
    let ticking = false;

    function updateVisibility() {
      const y = scrollRoot.scrollTop;
      const visible = y > threshold;
      btn.classList.toggle("is-visible", visible);
      btn.hidden = !visible;
      ticking = false;
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(updateVisibility);
    }

    btn.addEventListener("click", () => {
      const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth";
      scrollRoot.scrollTo({ top: 0, behavior });
    });

    scrollRoot.addEventListener("scroll", onScroll, { passive: true });
    updateVisibility();
  }

  async function init() {
    try {
      await loadData();
    } catch {
      if (timelineEl) {
        timelineEl.innerHTML = `<li class="concert-timeline__empty">${escapeHtml(ti("loadError"))}</li>`;
      }
      return;
    }

    renderTimeline();
    initScrollTop();
  }

  document.addEventListener("i18n:change", renderTimeline);

  if (window.i18n?.ready) {
    window.i18n.ready.then(init);
  } else {
    init();
  }
})();
