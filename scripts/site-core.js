(function () {
  "use strict";

  const clockEl = document.getElementById("sys-clock");
  const ddayBarEl = document.getElementById("dday-bar");
  const ddayFlipEl = document.getElementById("dday-flip");
  const ddayProgressEl = document.getElementById("dday-progress");
  const ddayInfoEl = document.getElementById("dday-info");
  const ddayLogoEl = document.getElementById("dday-logo");
  const ddayLinkEl = document.getElementById("dday-link");
  const ddayHideCheckbox = document.getElementById("dday-hide-today");
  const menuToggle = document.getElementById("menu-toggle");
  const navMobile = document.getElementById("nav-mobile");

  const DDAY_TARGET = new Date("2026-09-15T19:00:00+09:00");
  const DDAY_START = new Date("2026-01-01T00:00:00+09:00");
  const DDAY_HIDE_KEY = "sf-archive-dday-hide";

  /** @type {"concert"|"album"} */
  const DDAY_CONFIG = {
    type: "concert",
    linkHref: "concert.html",
    logoSrc: "images/dday/nexus-live-logo.png",
    logoAlt: "NEXUS LIVE · SEOUL",
  };

  function getKstDateKey() {
    const now = new Date();
    const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const y = kst.getUTCFullYear();
    const m = String(kst.getUTCMonth() + 1).padStart(2, "0");
    const d = String(kst.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function isDdayHiddenToday() {
    try {
      return localStorage.getItem(DDAY_HIDE_KEY) === getKstDateKey();
    } catch {
      return false;
    }
  }

  function setDdayHidden(hidden) {
    document.body.classList.toggle("is-dday-hidden", hidden);
    if (ddayBarEl) ddayBarEl.hidden = hidden;
  }

  function hideDdayForToday() {
    try {
      localStorage.setItem(DDAY_HIDE_KEY, getKstDateKey());
    } catch {
      /* ignore storage errors */
    }
    setDdayHidden(true);
  }

  function syncDdayLink() {
    if (!ddayLinkEl) return;

    ddayLinkEl.href = DDAY_CONFIG.linkHref;
    const key = DDAY_CONFIG.type === "album" ? "dday.linkAlbum" : "dday.linkConcert";
    const fallback = DDAY_CONFIG.type === "album" ? "구매하기" : "예매하기";
    ddayLinkEl.dataset.i18n = key;
    ddayLinkEl.textContent = window.i18n ? window.i18n.t(key) : fallback;
  }

  function syncDdayLogo() {
    if (!ddayLogoEl) return;

    const src = DDAY_CONFIG.logoSrc;
    if (!src) {
      ddayLogoEl.hidden = true;
      ddayInfoEl?.classList.remove("has-logo");
      return;
    }

    ddayLogoEl.alt = DDAY_CONFIG.logoAlt || "";
    ddayLogoEl.onerror = () => {
      ddayLogoEl.hidden = true;
      ddayInfoEl?.classList.remove("has-logo");
    };
    ddayLogoEl.onload = () => {
      ddayLogoEl.hidden = false;
      ddayInfoEl?.classList.add("has-logo");
    };
    ddayLogoEl.src = src;
  }

  function initDdayVisibility() {
    if (isDdayHiddenToday()) {
      setDdayHidden(true);
      if (ddayHideCheckbox) ddayHideCheckbox.checked = true;
    }
  }

  let flipDigits = null;
  let flipPastLabelEl = null;

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function createFlipDigit(index) {
    const el = document.createElement("div");
    el.className = "dday-flip__digit";
    el.dataset.flipIndex = String(index);

    const topEl = document.createElement("span");
    topEl.className = "dday-flip__digit-top";
    topEl.setAttribute("aria-hidden", "true");
    topEl.textContent = "0";

    const bottomEl = document.createElement("span");
    bottomEl.className = "dday-flip__digit-bottom";
    bottomEl.setAttribute("aria-hidden", "true");
    bottomEl.textContent = "0";

    const valueEl = document.createElement("span");
    valueEl.className = "dday-flip__digit-value";
    valueEl.textContent = "0";

    el.append(topEl, bottomEl, valueEl);
    return { el, valueEl, topEl, bottomEl, current: "0" };
  }

  function createColon() {
    const el = document.createElement("span");
    el.className = "dday-flip__colon";
    el.setAttribute("aria-hidden", "true");
    el.innerHTML = "<span></span><span></span>";
    return el;
  }

  function initFlipClock() {
    if (!ddayFlipEl || flipDigits) return;

    flipDigits = [];

    const daysGroup = document.createElement("div");
    daysGroup.className = "dday-flip__group dday-flip__group--days";

    for (let i = 0; i < 2; i += 1) {
      const digit = createFlipDigit(flipDigits.length);
      daysGroup.appendChild(digit.el);
      flipDigits.push(digit);
    }
    ddayFlipEl.appendChild(daysGroup);

    const sep = document.createElement("span");
    sep.className = "dday-flip__sep";
    sep.setAttribute("aria-hidden", "true");
    ddayFlipEl.appendChild(sep);

    [2, 2, 2].forEach((count, groupIndex) => {
      if (groupIndex > 0) ddayFlipEl.appendChild(createColon());

      const group = document.createElement("div");
      group.className = "dday-flip__group";
      for (let i = 0; i < count; i += 1) {
        const digit = createFlipDigit(flipDigits.length);
        group.appendChild(digit.el);
        flipDigits.push(digit);
      }
      ddayFlipEl.appendChild(group);
    });
  }

  function setFlipDigit(digit, char) {
    if (digit.current === char) return;
    digit.current = char;
    digit.valueEl.textContent = char;
    digit.topEl.textContent = char;
    digit.bottomEl.textContent = char;
    digit.el.classList.remove("is-flip");
    void digit.el.offsetWidth;
    digit.el.classList.add("is-flip");
  }

  function setFlipDigits(str) {
    flipDigits.forEach((digit, index) => {
      setFlipDigit(digit, str[index] || "0");
    });
  }

  function showPastLabel(label) {
    if (!ddayFlipEl) return;
    ddayFlipEl.classList.add("dday-flip--past");
    ddayFlipEl.querySelectorAll(".dday-flip__group, .dday-flip__colon, .dday-flip__sep").forEach((node) => {
      node.hidden = true;
    });
    if (!flipPastLabelEl) {
      flipPastLabelEl = document.createElement("span");
      flipPastLabelEl.className = "dday-flip__past-label";
      ddayFlipEl.appendChild(flipPastLabelEl);
    }
    flipPastLabelEl.hidden = false;
    flipPastLabelEl.textContent = label;
  }

  function showCountdownFlip() {
    if (!ddayFlipEl) return;
    ddayFlipEl.classList.remove("dday-flip--past");
    ddayFlipEl.querySelectorAll(".dday-flip__group, .dday-flip__colon, .dday-flip__sep").forEach((node) => {
      node.hidden = false;
    });
    if (flipPastLabelEl) flipPastLabelEl.hidden = true;
  }

  function updateClock() {
    if (!clockEl) return;
    const now = new Date();
    const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const h = String(kst.getUTCHours()).padStart(2, "0");
    const m = String(kst.getUTCMinutes()).padStart(2, "0");
    const s = String(kst.getUTCSeconds()).padStart(2, "0");
    const suffix = window.i18n ? window.i18n.t("header.clockSuffix") : "KST";
    clockEl.textContent = `${h}:${m}:${s} ${suffix}`;
  }

  function updateDday() {
    if (!ddayFlipEl || !ddayProgressEl) return;
    initFlipClock();
    if (!flipDigits) return;

    const now = new Date();
    const diff = DDAY_TARGET - now;

    if (diff <= 0) {
      const pastDays = Math.floor(Math.abs(diff) / 86400000);
      const dDayLabel = window.i18n ? window.i18n.t("dday.dDay") : "D-DAY";
      const dPlusLabel = window.i18n
        ? window.i18n.t("dday.dPlus", { days: pastDays })
        : `D+${pastDays}`;
      showPastLabel(pastDays === 0 ? dDayLabel : dPlusLabel);
      ddayProgressEl.style.width = "100%";
      return;
    }

    showCountdownFlip();

    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);

    const dayStr = String(Math.min(days, 99)).padStart(2, "0");
    const timeStr = `${pad(hours)}${pad(mins)}${pad(secs)}`;
    setFlipDigits(dayStr + timeStr);

    const total = DDAY_TARGET - DDAY_START;
    const elapsed = now - DDAY_START;
    const pct = Math.min(Math.max((elapsed / total) * 100, 0), 100);
    ddayProgressEl.style.width = `${pct}%`;
  }

  function syncNavActivePage() {
    const current = document.body.dataset.navSection || document.body.dataset.page;
    if (!current) return;

    document.querySelectorAll("[data-nav-page]").forEach((link) => {
      link.classList.toggle("active", link.dataset.navPage === current);
    });
  }

  function getMenuOpenLabel() {
    return window.i18n ? window.i18n.t("header.menuOpen") : "메뉴 열기";
  }

  function getMenuCloseLabel() {
    return window.i18n ? window.i18n.t("header.menuClose") : "메뉴 닫기";
  }

  function setMobileNavOpen(open) {
    navMobile.classList.toggle("open", open);
    document.body.classList.toggle("nav-mobile-open", open);
    menuToggle.setAttribute("aria-expanded", open ? "true" : "false");
    menuToggle.setAttribute("aria-label", open ? getMenuCloseLabel() : getMenuOpenLabel());
  }

  if (ddayHideCheckbox) {
    ddayHideCheckbox.addEventListener("change", () => {
      if (ddayHideCheckbox.checked) {
        hideDdayForToday();
        return;
      }

      try {
        localStorage.removeItem(DDAY_HIDE_KEY);
      } catch {
        /* ignore storage errors */
      }
      setDdayHidden(false);
    });
  }

  if (menuToggle && navMobile) {
    menuToggle.addEventListener("click", () => {
      setMobileNavOpen(!navMobile.classList.contains("open"));
    });

    navMobile.querySelectorAll(".nav-mobile__links .nav-link").forEach((link) => {
      link.addEventListener("click", () => {
        setMobileNavOpen(false);
      });
    });
  }

  initDdayVisibility();
  syncDdayLink();
  syncDdayLogo();
  updateClock();
  updateDday();
  setInterval(updateClock, 1000);
  setInterval(updateDday, 1000);
  syncNavActivePage();

  document.addEventListener("i18n:ready", () => {
    syncDdayLink();
    updateClock();
    updateDday();
    syncNavActivePage();
    if (menuToggle && navMobile) {
      const open = navMobile.classList.contains("open");
      menuToggle.setAttribute("aria-label", open ? getMenuCloseLabel() : getMenuOpenLabel());
    }
  });

  document.addEventListener("i18n:change", () => {
    syncDdayLink();
    updateClock();
    updateDday();
    syncNavActivePage();
    if (menuToggle && navMobile) {
      const open = navMobile.classList.contains("open");
      menuToggle.setAttribute("aria-label", open ? getMenuCloseLabel() : getMenuOpenLabel());
    }
  });

  window.siteCore = { updateClock, updateDday, syncNavActivePage, DDAY_CONFIG };
})();
