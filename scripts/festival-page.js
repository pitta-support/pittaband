(function () {
  "use strict";

  const pageRoot = document.querySelector(".site-page--festival");
  const galleryEl = document.getElementById("festival-gallery");
  const modalEl = document.getElementById("festival-modal");
  const modalPanel = document.getElementById("festival-modal-panel");
  const modalBodyEl = document.getElementById("festival-modal-body");
  const modalIdEl = document.getElementById("festival-modal-id");
  const modalHeadingEl = document.getElementById("festival-modal-heading");
  const modalInstagramEl = document.getElementById("festival-modal-instagram");

  if (!pageRoot || !galleryEl) return;

  let festivals = [];
  let lastFocusedEl = null;

  function t(key, vars) {
    return window.i18n?.t(key, vars) ?? key;
  }

  function ti(key, vars) {
    return t(`pages.festival.${key}`, vars);
  }

  function getLang() {
    return window.i18n?.getLang?.() || document.documentElement.lang || "ko";
  }

  function localizedField(value) {
    if (!value) return "";
    if (typeof value === "string") return value;
    const lang = getLang();
    return value[lang] || value.ko || value.en || "";
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderInstagramIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true" focusable="false"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>`;
  }

  function renderInstagramLink(url) {
    return `<a class="member-profile__instagram festival-modal__instagram" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(t("overlay.instagram"))}"><span class="member-profile__instagram-icon">${renderInstagramIcon()}</span></a>`;
  }

  function updateModalHeader(entry) {
    if (modalHeadingEl) {
      modalHeadingEl.innerHTML = renderModalTitleHtml(entry);
    }
    if (modalInstagramEl) {
      const instagram = entry.instagram?.trim();
      modalInstagramEl.innerHTML = instagram ? renderInstagramLink(instagram) : "";
    }
  }

  function getKstDateKey(date = new Date()) {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(date);
  }

  function getFestivalStatus(entry, now = new Date()) {
    const today = getKstDateKey(now);
    const start = entry.dateTime?.slice(0, 10) || "";
    const end = entry.endDate || start;
    if (!start) return "ended";
    if (today < start) return "upcoming";
    if (today > end) return "ended";
    return "live";
  }

  function statusLabel(status) {
    const map = {
      upcoming: "statusUpcoming",
      live: "statusLive",
      ended: "statusEnded",
    };
    return ti(map[status] || map.ended);
  }

  function renderStatusBadge(entry) {
    const status = getFestivalStatus(entry);
    const badgeClass = [
      "concert-card__badge",
      "festival-modal__status",
      status === "live" ? "concert-card__badge--live" : "",
      status === "ended" ? "concert-card__badge--ended" : "",
    ]
      .filter(Boolean)
      .join(" ");

    return `<span class="${badgeClass}">${escapeHtml(statusLabel(status))}</span>`;
  }

  function renderModalTitleHtml(entry) {
    return `${renderStatusBadge(entry)}<span class="festival-modal__title-text">${escapeHtml(entry.title || "")}</span>`;
  }

  function localizeSetlistNote(note) {
    if (!note) return "";
    return note.replace(/앵콜/g, t("pages.concert.encore"));
  }

  function renderSetlistHtml(setlist) {
    if (!Array.isArray(setlist) || !setlist.length) return "";

    const items = setlist
      .map((track, index) => {
        const title = typeof track === "string" ? track : track?.title;
        if (!title) return "";
        const note = typeof track === "object" && track?.note
          ? ` <span class="concert-card__setlist-note">(${escapeHtml(localizeSetlistNote(track.note))})</span>`
          : "";
        return `<li><span class="concert-card__setlist-num">${index + 1}.</span><span class="concert-card__setlist-track">${escapeHtml(title)}</span>${note}</li>`;
      })
      .filter(Boolean)
      .join("");

    if (!items) return "";

    return `
      <div class="concert-card__setlist festival-modal__setlist">
        <ol class="concert-card__setlist-list">${items}</ol>
      </div>`;
  }

  function renderModalHtml(entry) {
    const poster = entry.poster?.trim() || "";
    const schedule = localizedField(entry.schedule);
    const venue = localizedField(entry.venue);
    const setlistHtml = renderSetlistHtml(entry.setlist);

    const dateHtml = schedule
      ? `<p class="concert-card__date"><time datetime="${escapeHtml(entry.dateTime || "")}">${escapeHtml(schedule)}</time></p>`
      : "";
    const venueHtml = venue ? `<p class="concert-card__venue">${escapeHtml(venue)}</p>` : "";

    const hasContent = schedule || venue || setlistHtml;
    const pendingHtml = hasContent
      ? ""
      : `<p class="festival-modal__placeholder">${escapeHtml(ti("detailPending"))}</p>`;

    const posterAlt = escapeHtml(entry.title || "Pitta Band");

    return `
      <div class="festival-modal__content concert-card concert-card--with-poster concert-card--has-poster">
        <div class="concert-card__layout">
          <div class="concert-card__media concert-card__media--standard">
            <img class="concert-card__poster" src="${escapeHtml(poster)}" alt="${posterAlt}" width="480" height="680" loading="lazy" draggable="false" />
          </div>
          <div class="concert-card__info festival-modal__info">
            <div class="concert-card__meta">
              ${dateHtml}
              ${venueHtml}
              ${pendingHtml}
            </div>
            ${setlistHtml}
          </div>
        </div>
      </div>`;
  }

  function openModal(entry) {
    if (!modalEl || !modalPanel) return;

    lastFocusedEl = document.activeElement;
    modalIdEl.textContent = entry.id?.toUpperCase().replace(/-/g, " · ") || "FST";
    updateModalHeader(entry);
    modalBodyEl.innerHTML = renderModalHtml(entry);

    modalEl.hidden = false;
    modalEl.removeAttribute("aria-hidden");
    requestAnimationFrame(() => {
      modalEl.classList.add("is-open");
    });
    document.body.classList.add("festival-modal-open");

    const closeBtn = modalPanel.querySelector("[data-festival-close]");
    closeBtn?.focus();
  }

  function closeModal() {
    if (!modalEl?.classList.contains("is-open")) return;

    modalEl.classList.remove("is-open");
    document.body.classList.remove("festival-modal-open");

    const onEnd = (event) => {
      if (event.target !== modalPanel) return;
      modalPanel.removeEventListener("transitionend", onEnd);
      modalEl.hidden = true;
      modalEl.setAttribute("aria-hidden", "true");
      if (lastFocusedEl && typeof lastFocusedEl.focus === "function") {
        lastFocusedEl.focus();
      }
    };

    modalPanel.addEventListener("transitionend", onEnd);
  }

  function renderGalleryItem(entry, index) {
    const poster = entry.poster?.trim();
    const title = entry.title || "";
    const schedule = localizedField(entry.schedule);
    const posterAlt = escapeHtml(title || "Pitta Band");

    return `
      <li class="festival-gallery__item" style="--festival-enter-index: ${index}" data-festival-index="${index}">
        <button
          type="button"
          class="festival-card"
          data-festival-id="${escapeHtml(entry.id)}"
          aria-label="${escapeHtml(title)}"
        >
          <span class="festival-card__frame">
            <img
              class="festival-card__poster"
              src="${escapeHtml(poster)}"
              alt="${posterAlt}"
              width="480"
              height="680"
              loading="${index < 2 ? "eager" : "lazy"}"
              draggable="false"
            />
            <span class="festival-card__meta">
              <span class="festival-card__title">${escapeHtml(title)}</span>
              ${schedule ? `<span class="festival-card__date">${escapeHtml(schedule)}</span>` : ""}
            </span>
          </span>
        </button>
      </li>`;
  }

  function renderGallery() {
    galleryEl.classList.remove("festival-gallery--enter");

    if (!festivals.length) {
      galleryEl.innerHTML = `<li class="festival-gallery__empty">${escapeHtml(ti("empty"))}</li>`;
      return;
    }

    galleryEl.innerHTML = festivals.map(renderGalleryItem).join("");

    requestAnimationFrame(() => {
      galleryEl.classList.add("festival-gallery--enter");
    });
  }

  function getGalleryCols() {
    return window.matchMedia("(min-width: 768px)").matches ? 3 : 2;
  }

  function getItemDistance(focusIndex, itemIndex) {
    const cols = getGalleryCols();
    const focusRow = Math.floor(focusIndex / cols);
    const focusCol = focusIndex % cols;
    const itemRow = Math.floor(itemIndex / cols);
    const itemCol = itemIndex % cols;

    return Math.abs(focusRow - itemRow) + Math.abs(focusCol - itemCol);
  }

  function setFocusIndex(index) {
    galleryEl.classList.add("festival-gallery--focus");
    galleryEl.querySelectorAll(".festival-gallery__item").forEach((item) => {
      const itemIndex = Number(item.dataset.festivalIndex);
      item.dataset.dist = String(getItemDistance(index, itemIndex));
    });
  }

  function clearFocus() {
    galleryEl.classList.remove("festival-gallery--focus");
    galleryEl.querySelectorAll(".festival-gallery__item").forEach((item) => {
      delete item.dataset.dist;
      item.classList.remove("is-focused");
    });
  }

  function bindGalleryEvents() {
    const touchGallery = window.matchMedia("(hover: none), (pointer: coarse)");

    galleryEl.addEventListener("mouseover", (event) => {
      if (touchGallery.matches) return;
      const item = event.target.closest(".festival-gallery__item");
      if (!item || !galleryEl.contains(item)) return;
      setFocusIndex(Number(item.dataset.festivalIndex));
    });

    galleryEl.addEventListener("mouseleave", clearFocus);

    galleryEl.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-festival-id]");
      if (!btn) return;

      const entry = festivals.find((item) => item.id === btn.dataset.festivalId);
      if (!entry) return;

      openModal(entry);
    });
  }

  function bindModalEvents() {
    if (!modalEl) return;

    modalEl.addEventListener("click", (event) => {
      if (event.target.closest("[data-festival-close]")) {
        closeModal();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && modalEl.classList.contains("is-open")) {
        closeModal();
      }
    });
  }

  function parseDateTime(value) {
    const time = new Date(value).getTime();
    return Number.isFinite(time) ? time : 0;
  }

  function sortFestivals(items) {
    return [...items].sort(
      (a, b) => parseDateTime(b.dateTime) - parseDateTime(a.dateTime)
    );
  }

  async function loadData() {
    const res = await fetch("data/festivals.json");
    if (!res.ok) throw new Error("Festival data not found");
    const data = await res.json();
    festivals = sortFestivals(data.festivals || []);
  }

  async function init() {
    try {
      await loadData();
    } catch {
      galleryEl.innerHTML = `<li class="festival-gallery__empty">${escapeHtml(ti("loadError"))}</li>`;
      return;
    }

    renderGallery();
    bindGalleryEvents();
    bindModalEvents();
  }

  document.addEventListener("i18n:change", renderGallery);
  window.addEventListener("resize", () => {
    if (!galleryEl.classList.contains("festival-gallery--focus")) return;
    const focused = galleryEl.querySelector('.festival-gallery__item[data-dist="0"]');
    if (!focused) return;
    setFocusIndex(Number(focused.dataset.festivalIndex));
  });

  if (window.i18n?.ready) {
    window.i18n.ready.then(init);
  } else {
    init();
  }
})();
