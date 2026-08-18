(function () {
  "use strict";

  const ddayBarEl = document.getElementById("dday-bar");
  const ddaySliderTrackEl = document.getElementById("dday-slider-track");
  const ddaySliderNavEl = document.getElementById("dday-slider-nav");
  const ddaySliderDotsEl = document.getElementById("dday-slider-dots");
  const ddaySliderPrevEl = document.getElementById("dday-slider-prev");
  const ddaySliderNextEl = document.getElementById("dday-slider-next");
  const ddayProgressEl = document.getElementById("dday-progress");
  const ddayHideCheckbox = document.getElementById("dday-hide-today");
  const menuToggle = document.getElementById("menu-toggle");
  const navMobile = document.getElementById("nav-mobile");

  const DDAY_HIDE_KEY = "sf-archive-dday-hide";
  const SLIDER_INTERVAL_MS = window.DDAY_SLIDER?.intervalMs ?? 6000;

  let activeCampaignStates = [];
  let currentSlideIndex = 0;
  let slideSignature = "";
  let sliderTimer = null;
  const flipClocks = new Map();

  function t(key, fallback, params) {
    if (window.i18n) return window.i18n.t(key, params);
    if (params && typeof fallback === "string") {
      return Object.keys(params).reduce(
        (text, name) => text.replace(`{${name}}`, String(params[name])),
        fallback
      );
    }
    return fallback;
  }

  function getKstDateKey(date = new Date()) {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(date);
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
      const nowKey = getKstDateKey(now);

      if (now < showFrom) return null;
      if (now > lastEnd) return { expired: true };

      let target = day1Start;
      if (campaign.targetTime) {
        target = new Date(`${day1}T${campaign.targetTime}+09:00`);
      }

      const onBanner = nowKey >= day1 && nowKey <= day2;

      return {
        campaign,
        mode: onBanner ? "banner" : "countdown",
        showLink: now < day1Start,
        target,
        progressStart: showFrom,
        progressEnd: target,
      };
    }

    if (campaign.type === "album") {
      const release = campaign.date;
      if (!release) return null;

      const showFrom = parseKstDateStart(campaign.showFrom || release);
      const releaseStart = parseKstDateStart(release);
      const lastDisplayDay = addDaysToDateStr(release, campaign.displayDays ?? 7);
      const displayEnd = parseKstDateEnd(lastDisplayDay);
      const nowKey = getKstDateKey(now);

      if (now < showFrom) return null;
      if (now > displayEnd) return { expired: true };

      const onBanner = nowKey >= release;

      return {
        campaign,
        mode: onBanner ? "banner" : "countdown",
        showLink: onBanner,
        target: releaseStart,
        progressStart: showFrom,
        progressEnd: releaseStart,
      };
    }

    if (campaign.type === "festival") {
      const day = campaign.date;
      if (!day) return null;

      const showFrom = parseKstDateStart(campaign.showFrom || day);
      const dayStart = parseKstDateStart(day);
      const dayEnd = parseKstDateEnd(day);
      const nowKey = getKstDateKey(now);

      if (now < showFrom) return null;
      if (now > dayEnd) return { expired: true };

      let target = dayStart;
      if (campaign.targetTime) {
        target = new Date(`${day}T${campaign.targetTime}+09:00`);
      }

      const onBanner = nowKey >= day;

      return {
        campaign,
        mode: onBanner ? "banner" : "countdown",
        showLink: now < dayStart,
        target,
        progressStart: showFrom,
        progressEnd: target,
      };
    }

    return null;
  }

  function getActiveCampaignStates(now = new Date()) {
    return (window.DDAY_CAMPAIGNS || [])
      .map((campaign) => resolveCampaignState(campaign, now))
      .filter((state) => state && !state.expired)
      .sort((a, b) => (b.campaign.priority || 0) - (a.campaign.priority || 0));
  }

  function getActiveCampaignState(now = new Date()) {
    const states = getActiveCampaignStates(now);
    return states[currentSlideIndex] || states[0] || null;
  }

  function isDdayHiddenToday() {
    try {
      return localStorage.getItem(DDAY_HIDE_KEY) === getKstDateKey();
    } catch {
      return false;
    }
  }

  function setDdayHidden(hidden) {
    document.documentElement.classList.toggle("is-dday-hidden", hidden);
    document.body.classList.toggle("is-dday-hidden", hidden);
    if (ddayBarEl) ddayBarEl.hidden = hidden;
  }

  function setDdayBarGone(gone) {
    if (!ddayBarEl) return;

    ddayBarEl.hidden = gone;
    document.documentElement.classList.toggle("is-dday-gone", gone);

    if (gone) {
      stopSliderAutoplay();
      document.documentElement.classList.add("is-dday-hidden");
      document.body.classList.add("is-dday-hidden");
    } else if (!isDdayHiddenToday()) {
      document.documentElement.classList.remove("is-dday-hidden");
      document.body.classList.remove("is-dday-hidden");
    }
  }

  function hideDdayForToday() {
    try {
      localStorage.setItem(DDAY_HIDE_KEY, getKstDateKey());
    } catch {
      /* ignore storage errors */
    }
    stopSliderAutoplay();
    setDdayHidden(true);
  }

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

  function initFlipClock(flipEl, campaignId) {
    if (!flipEl || flipClocks.has(campaignId)) return;

    const flipDigits = [];

    const daysGroup = document.createElement("div");
    daysGroup.className = "dday-flip__group dday-flip__group--days";

    for (let i = 0; i < 2; i += 1) {
      const digit = createFlipDigit(flipDigits.length);
      daysGroup.appendChild(digit.el);
      flipDigits.push(digit);
    }
    flipEl.appendChild(daysGroup);

    const sep = document.createElement("span");
    sep.className = "dday-flip__sep";
    sep.setAttribute("aria-hidden", "true");
    flipEl.appendChild(sep);

    [2, 2, 2].forEach((count, groupIndex) => {
      if (groupIndex > 0) flipEl.appendChild(createColon());

      const group = document.createElement("div");
      group.className = "dday-flip__group";
      for (let i = 0; i < count; i += 1) {
        const digit = createFlipDigit(flipDigits.length);
        group.appendChild(digit.el);
        flipDigits.push(digit);
      }
      flipEl.appendChild(group);
    });

    flipClocks.set(campaignId, flipDigits);
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

  function setFlipDigits(campaignId, str) {
    const flipDigits = flipClocks.get(campaignId);
    if (!flipDigits) return;
    flipDigits.forEach((digit, index) => {
      setFlipDigit(digit, str[index] || "0");
    });
  }

  function getDefaultLinkLabelKey(type) {
    if (type === "album") return "dday.linkAlbum";
    if (type === "festival") return "dday.linkFestival";
    return "dday.linkConcert";
  }

  function getDefaultLinkFallback(type) {
    if (type === "album") return "구매하기";
    return "예매하기";
  }

  function resolveCampaignLink(campaign) {
    const link = campaign.link || {};
    const legacyHref = campaign.linkHref;
    const primaryHref = (link.href || legacyHref || "").trim();
    const href = primaryHref || (link.fallbackHref || "#").trim() || "#";

    return {
      href,
      external: primaryHref ? link.external !== false : false,
      labelKey: link.labelI18n || getDefaultLinkLabelKey(campaign.type),
      labelFallback: getDefaultLinkFallback(campaign.type),
    };
  }

  function getBannerTheme(type) {
    if (type === "album") return "album";
    if (type === "festival") return "festival";
    return "concert";
  }

  function getDefaultBannerBadge(type) {
    if (type === "album") {
      return { key: "dday.outNow", fallback: "OUT NOW" };
    }
    if (type === "festival") {
      return { key: "dday.festNow", fallback: "ON STAGE" };
    }
    return { key: "dday.liveNow", fallback: "LIVE" };
  }

  function syncSlideInfo(slide, state) {
    const { campaign } = state;
    const info = campaign.countdown || {};
    const infoEl = slide.querySelector(".dday-info");
    const tagEl = slide.querySelector(".dday-tag");
    const eventEl = slide.querySelector(".dday-event");
    const logoEl = slide.querySelector(".dday-logo");

    if (tagEl) {
      const tagKey = info.tagI18n || "dday.tag";
      tagEl.dataset.i18n = tagKey;
      tagEl.textContent = t(tagKey, "UPCOMING");
    }

    if (eventEl) {
      const eventKey = info.eventI18n || "dday.event";
      const eventFallback = info.eventFallback || "NEXUS LIVE · SEOUL";
      eventEl.dataset.i18n = eventKey;
      eventEl.textContent = t(eventKey, eventFallback);
    }

    if (!logoEl) return;

    const src = info.logoSrc || "";
    if (!src) {
      logoEl.hidden = true;
      infoEl?.classList.remove("has-logo");
      return;
    }

    const alt = info.logoAltI18n
      ? t(info.logoAltI18n, info.logoAltFallback || info.eventFallback || "")
      : info.logoAltFallback || info.eventFallback || "";

    logoEl.alt = alt;
    logoEl.onerror = () => {
      logoEl.hidden = true;
      infoEl?.classList.remove("has-logo");
    };
    logoEl.onload = () => {
      logoEl.hidden = false;
      infoEl?.classList.add("has-logo");
    };

    if (logoEl.getAttribute("src") !== src) logoEl.src = src;
  }

  function syncSlideLink(slide, state) {
    const linkEl = slide.querySelector(".dday-link");
    if (!linkEl) return;

    const { campaign, showLink } = state;
    const link = resolveCampaignLink(campaign);

    linkEl.href = link.href;
    linkEl.hidden = !showLink;

    if (link.external && showLink) {
      linkEl.target = "_blank";
      linkEl.rel = "noopener noreferrer";
    } else {
      linkEl.removeAttribute("target");
      linkEl.removeAttribute("rel");
    }

    linkEl.dataset.i18n = link.labelKey;
    linkEl.textContent = t(link.labelKey, link.labelFallback);
  }

  function renderSlideBanner(slide, state) {
    const { campaign } = state;
    const banner = campaign.banner || {};
    const theme = getBannerTheme(campaign.type);
    const badgeDefault = getDefaultBannerBadge(campaign.type);
    const shellEl = slide.querySelector(".dday-banner__shell");
    const titleEl = slide.querySelector(".dday-banner__title");
    const badgeEl = slide.querySelector(".dday-banner__badge");
    const visualEl = slide.querySelector(".dday-banner__visual");

    if (shellEl) shellEl.className = `dday-banner__shell dday-banner--${theme}`;

    if (titleEl) {
      titleEl.textContent = t(
        banner.titleI18n || "dday.event",
        banner.titleFallback || "NEXUS LIVE · SEOUL"
      );
    }

    if (badgeEl) {
      badgeEl.textContent = t(
        banner.badgeI18n || badgeDefault.key,
        banner.badgeFallback || badgeDefault.fallback
      );
    }

    if (!visualEl) return;

    const visualSrc = theme === "album" ? banner.coverSrc : banner.logoSrc;
    if (!visualSrc) {
      visualEl.hidden = true;
      visualEl.removeAttribute("src");
      return;
    }

    visualEl.alt = titleEl?.textContent || "";
    visualEl.onerror = () => {
      visualEl.hidden = true;
    };
    visualEl.onload = () => {
      visualEl.hidden = false;
    };

    if (visualEl.getAttribute("src") !== visualSrc) visualEl.src = visualSrc;
  }

  function setSlideMode(slide, state) {
    const isBanner = state.mode === "banner";
    slide.classList.toggle("is-banner-mode", isBanner);
    slide.dataset.ddayType = state.campaign.type;

    const flipEl = slide.querySelector(".dday-flip");
    const bannerEl = slide.querySelector(".dday-banner");

    if (flipEl) flipEl.hidden = isBanner;
    if (bannerEl) bannerEl.hidden = !isBanner;

    syncSlideInfo(slide, state);
    syncSlideLink(slide, state);

    if (isBanner) {
      renderSlideBanner(slide, state);
      return;
    }

    if (flipEl) initFlipClock(flipEl, state.campaign.id);
  }

  function createSlideElement(state, index) {
    const slide = document.createElement("article");
    slide.className = "dday-slide";
    slide.dataset.campaignId = state.campaign.id;
    slide.dataset.slideIndex = String(index);

    slide.innerHTML = `
      <div class="dday-info">
        <span class="dday-tag"></span>
        <img class="dday-logo" src="" alt="" width="140" height="56" hidden />
        <span class="dday-event"></span>
      </div>
      <div class="dday-countdown">
        <div class="dday-flip" aria-label="D-day countdown"></div>
        <div class="dday-banner" hidden>
          <div class="dday-banner__shell">
            <span class="dday-banner__glow" aria-hidden="true"></span>
            <img class="dday-banner__visual" src="" alt="" width="48" height="48" hidden />
            <span class="dday-banner__title"></span>
            <span class="dday-banner__badge"></span>
          </div>
        </div>
      </div>
      <a class="dday-link" href="#" hidden></a>
    `;

    setSlideMode(slide, state);
    return slide;
  }

  function buildSlideSignature(states) {
    return states
      .map(
        (state) =>
          `${state.campaign.id}:${state.mode}:${state.showLink ? 1 : 0}:${state.campaign.type}`
      )
      .join("|");
  }

  function renderSlides(states) {
    if (!ddaySliderTrackEl) return;

    const nextSignature = buildSlideSignature(states);
    const isSlider = states.length > 1;

    ddayBarEl?.classList.toggle("is-slider-mode", isSlider);

    if (nextSignature !== slideSignature) {
      slideSignature = nextSignature;
      flipClocks.clear();
      ddaySliderTrackEl.innerHTML = "";

      states.forEach((state, index) => {
        ddaySliderTrackEl.appendChild(createSlideElement(state, index));
      });

      if (currentSlideIndex >= states.length) currentSlideIndex = 0;
      setSlideIndex(currentSlideIndex, false);
    } else {
      ddaySliderTrackEl.querySelectorAll(".dday-slide").forEach((slide, index) => {
        const state = states[index];
        if (state) setSlideMode(slide, state);
      });
    }

    updateSliderNav(states.length);
  }

  function updateSliderNav(count) {
    const showNav = count > 1;
    if (ddaySliderNavEl) ddaySliderNavEl.hidden = !showNav;

    if (!showNav || !ddaySliderDotsEl) return;

    if (ddaySliderDotsEl.childElementCount !== count) {
      ddaySliderDotsEl.innerHTML = "";
      for (let i = 0; i < count; i += 1) {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.className = "dday-slider__dot";
        dot.dataset.slideIndex = String(i);
        dot.setAttribute("aria-label", t("dday.sliderGoTo", "D-day {n}로 이동", { n: i + 1 }));
        dot.addEventListener("click", () => {
          setSlideIndex(i);
          restartSliderAutoplay();
        });
        ddaySliderDotsEl.appendChild(dot);
      }
    }

    ddaySliderDotsEl.querySelectorAll(".dday-slider__dot").forEach((dot, index) => {
      dot.classList.toggle("is-active", index === currentSlideIndex);
      dot.setAttribute("aria-current", index === currentSlideIndex ? "true" : "false");
    });
  }

  function setSlideIndex(index, animate = true) {
    if (!activeCampaignStates.length) return;

    currentSlideIndex = ((index % activeCampaignStates.length) + activeCampaignStates.length) % activeCampaignStates.length;

    if (ddaySliderTrackEl) {
      ddaySliderTrackEl.classList.toggle("is-animating", animate);
      ddaySliderTrackEl.style.transform = `translate3d(-${currentSlideIndex * 100}%, 0, 0)`;
    }

    updateSliderNav(activeCampaignStates.length);
    updateCurrentSlideCountdown();
    updateCurrentSlideProgress();
  }

  function stopSliderAutoplay() {
    if (sliderTimer) {
      clearInterval(sliderTimer);
      sliderTimer = null;
    }
  }

  function startSliderAutoplay() {
    stopSliderAutoplay();
    if (activeCampaignStates.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    sliderTimer = setInterval(() => {
      setSlideIndex(currentSlideIndex + 1);
    }, SLIDER_INTERVAL_MS);
  }

  function restartSliderAutoplay() {
    stopSliderAutoplay();
    startSliderAutoplay();
  }

  function getCurrentSlideEl() {
    return ddaySliderTrackEl?.querySelector(`.dday-slide[data-slide-index="${currentSlideIndex}"]`);
  }

  function updateCountdownForState(state) {
    if (!state || state.mode !== "countdown") return;

    const slide = getCurrentSlideEl();
    const flipEl = slide?.querySelector(".dday-flip");
    if (!flipEl) return;

    initFlipClock(flipEl, state.campaign.id);

    const now = new Date();
    const diff = state.target - now;

    if (diff <= 0) return;

    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);

    const dayStr = String(Math.min(days, 99)).padStart(2, "0");
    const timeStr = `${pad(hours)}${pad(mins)}${pad(secs)}`;
    setFlipDigits(state.campaign.id, dayStr + timeStr);
  }

  function updateProgressForState(state) {
    if (!ddayProgressEl || !state) return;

    if (state.mode === "banner") {
      ddayProgressEl.style.width = "100%";
      return;
    }

    const now = new Date();
    const diff = state.target - now;

    if (diff <= 0) {
      ddayProgressEl.style.width = "100%";
      return;
    }

    const total = state.progressEnd - state.progressStart;
    const elapsed = now - state.progressStart;
    const pct = total > 0 ? Math.min(Math.max((elapsed / total) * 100, 0), 100) : 100;
    ddayProgressEl.style.width = `${pct}%`;
  }

  function updateCurrentSlideCountdown() {
    const state = activeCampaignStates[currentSlideIndex];
    updateCountdownForState(state);
    updateProgressForState(state);
  }

  function updateCurrentSlideProgress() {
    updateProgressForState(activeCampaignStates[currentSlideIndex]);
  }

  function updateAllCountdowns() {
    activeCampaignStates.forEach((state) => {
      if (state.mode !== "countdown") return;
      const slide = ddaySliderTrackEl?.querySelector(
        `.dday-slide[data-campaign-id="${state.campaign.id}"]`
      );
      const flipEl = slide?.querySelector(".dday-flip");
      if (!flipEl) return;

      initFlipClock(flipEl, state.campaign.id);

      const now = new Date();
      const diff = state.target - now;
      if (diff <= 0) return;

      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      const dayStr = String(Math.min(days, 99)).padStart(2, "0");
      const timeStr = `${pad(hours)}${pad(mins)}${pad(secs)}`;
      setFlipDigits(state.campaign.id, dayStr + timeStr);
    });

    updateCurrentSlideProgress();
  }

  function initDdayVisibility() {
    activeCampaignStates = getActiveCampaignStates();

    if (!activeCampaignStates.length) {
      setDdayBarGone(true);
      return;
    }

    setDdayBarGone(false);
    renderSlides(activeCampaignStates);
    startSliderAutoplay();

    if (isDdayHiddenToday()) {
      setDdayHidden(true);
      if (ddayHideCheckbox) ddayHideCheckbox.checked = true;
    }
  }

  function updateDday() {
    const nextStates = getActiveCampaignStates();

    if (!nextStates.length) {
      activeCampaignStates = [];
      setDdayBarGone(true);
      return;
    }

    setDdayBarGone(false);

    if (isDdayHiddenToday()) return;

    if (ddayBarEl && ddayBarEl.hidden) {
      ddayBarEl.hidden = false;
      document.documentElement.classList.remove("is-dday-hidden");
      document.body.classList.remove("is-dday-hidden");
    }

    activeCampaignStates = nextStates;
    renderSlides(activeCampaignStates);

    if (activeCampaignStates.length > 1 && !sliderTimer) {
      startSliderAutoplay();
    }

    if (activeCampaignStates.length <= 1) {
      stopSliderAutoplay();
    }

    updateAllCountdowns();
  }

  function syncNavActivePage() {
    const current = document.body.dataset.navSection || document.body.dataset.page;
    if (!current) return;

    document.querySelectorAll("[data-nav-page]").forEach((link) => {
      link.classList.toggle("active", link.dataset.navPage === current);
    });
  }

  function getMenuOpenLabel() {
    return t("header.menuOpen", "메뉴 열기");
  }

  function getMenuCloseLabel() {
    return t("header.menuClose", "메뉴 닫기");
  }

  function setMobileNavOpen(open) {
    navMobile.classList.toggle("open", open);
    document.body.classList.toggle("nav-mobile-open", open);
    menuToggle.setAttribute("aria-expanded", open ? "true" : "false");
    menuToggle.setAttribute("aria-label", open ? getMenuCloseLabel() : getMenuOpenLabel());
  }

  if (ddaySliderPrevEl) {
    ddaySliderPrevEl.addEventListener("click", () => {
      setSlideIndex(currentSlideIndex - 1);
      restartSliderAutoplay();
    });
  }

  if (ddaySliderNextEl) {
    ddaySliderNextEl.addEventListener("click", () => {
      setSlideIndex(currentSlideIndex + 1);
      restartSliderAutoplay();
    });
  }

  if (ddayBarEl) {
    ddayBarEl.addEventListener("mouseenter", stopSliderAutoplay);
    ddayBarEl.addEventListener("mouseleave", startSliderAutoplay);
    ddayBarEl.addEventListener("focusin", stopSliderAutoplay);
    ddayBarEl.addEventListener("focusout", (event) => {
      if (!ddayBarEl.contains(event.relatedTarget)) startSliderAutoplay();
    });
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

      if (!getActiveCampaignStates().length) {
        setDdayBarGone(true);
        return;
      }

      setDdayHidden(false);
      updateDday();
      startSliderAutoplay();
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
  updateDday();
  setInterval(updateDday, 1000);
  syncNavActivePage();

  document.addEventListener("i18n:ready", () => {
    slideSignature = "";
    updateDday();
    syncNavActivePage();
    if (menuToggle && navMobile) {
      const open = navMobile.classList.contains("open");
      menuToggle.setAttribute("aria-label", open ? getMenuCloseLabel() : getMenuOpenLabel());
    }
  });

  document.addEventListener("i18n:change", () => {
    slideSignature = "";
    updateDday();
    syncNavActivePage();
    if (menuToggle && navMobile) {
      const open = navMobile.classList.contains("open");
      menuToggle.setAttribute("aria-label", open ? getMenuCloseLabel() : getMenuOpenLabel());
    }
  });

  window.siteCore = {
    updateDday,
    syncNavActivePage,
    getActiveCampaignState,
    getActiveCampaignStates,
  };
})();
