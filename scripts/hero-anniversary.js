(function () {

  "use strict";



  const heroSection = document.getElementById("archive");

  const container = document.getElementById("hero-anniversary");

  const heroDefault = document.getElementById("hero-default");

  if (!heroSection || !container) return;



  const labelEl = document.getElementById("hero-anniversary-label");

  const greetingEl = document.getElementById("hero-anniversary-greeting");

  const releaseTitleEl = document.getElementById("hero-anniversary-release-title");

  const releaseLogoEl = document.getElementById("hero-anniversary-release-logo");

  const logoShellEl = document.getElementById("hero-anniversary-logo-shell");

  const ctaEl = document.getElementById("hero-anniversary-cta");

  const ctaTextEl = document.getElementById("hero-anniversary-cta-text");

  const ctaSlotEl = document.getElementById("hero-anniversary-cta-slot");

  const coverEl = document.getElementById("hero-anniversary-cover");

  const lottieEl = document.getElementById("hero-anniversary-lottie");

  const effectsEl = document.getElementById("hero-anniversary-effects");

  const visualEl = document.getElementById("hero-anniversary-visual");



  const FANCAFE_URL = "https://cafe.naver.com/phantomkang";



  const RELEASE_EFFECTS = {

    dandelion: "dandelion",

    paradox: "paradox",

    "the-nation": "nation",

    "deep-shadow": "shadow",

    universe: "universe",

  };



  const EFFECT_ASSETS = {

    dandelion: {

      visualClass: "hero-anniversary__visual--dandelion",

      effectsClass: "hero-anniversary__effects--dandelion",

      logo: "images/effects/dandelion/dan_logo.svg",

      mark: {

        src: "images/effects/dandelion/dandelion.svg",

        className: "hero-anniversary__dandelion-flower",

      },

      orbit: [

        { src: "images/effects/dandelion/dan01.svg", size: 44 },

        { src: "images/effects/dandelion/dan02.svg", size: 58 },

        { src: "images/effects/dandelion/dan03.svg", size: 50 },

        { src: "images/effects/dandelion/dan04.svg", size: 62 },

      ],

      seedClass: "hero-anniversary__orbit-seed",

      titleClass: null,

    },

    paradox: {

      visualClass: "hero-anniversary__visual--paradox",

      effectsClass: "hero-anniversary__effects--paradox",

      logo: "images/effects/paradox/paradox.svg",

      logoClass: "hero-anniversary__release-logo--paradox",

      aura: true,

      mark: null,

      orbit: [],

      seedClass: null,

      titleClass: null,

    },

    nation: {

      visualClass: "hero-anniversary__visual--nation",

      effectsClass: "hero-anniversary__effects--nation",

      logo: "images/effects/nation/nation_logo.svg",

      logoClass: "hero-anniversary__release-logo--nation",

      risingParticles: true,

      mark: {

        src: "images/effects/nation/nation.png",

        className: "hero-anniversary__nation-character",

      },

      orbit: [],

      seedClass: null,

      titleClass: null,

    },

    shadow: {

      visualClass: "hero-anniversary__visual--shadow",

      effectsClass: "hero-anniversary__effects--shadow",

      logo: "images/effects/shadow/shadow_logo.svg",

      logoClass: "hero-anniversary__release-logo--shadow",

      burstFragments: true,

      mark: null,

      orbit: [],

      seedClass: null,

      titleClass: null,

    },

    universe: {

      visualClass: "hero-anniversary__visual--universe",

      effectsClass: "hero-anniversary__effects--universe",

      logo: "images/effects/universe/universe_logo.svg",

      logoClass: "hero-anniversary__release-logo--universe",

      universeEffect: true,

      mark: null,

      orbit: [],

      seedClass: null,

      titleClass: null,

    },

  };



  const I18N_FALLBACK = {

    "hero.anniversary.label": "CELEBRATION",

    "hero.anniversary.greeting": "Happy {yearsYear} Anniversary!",

    "hero.anniversary.cta": "축하 메세지를 써주세요",

  };



  let activeEvent = null;

  const ANNIVERSARY_TEST_KEY = "sf-archive-anniversary-test";

  function getAnniversaryTestApi() {
    return window.SFAnniversaryTest;
  }

  function readAnniversaryTestId() {
    const api = getAnniversaryTestApi();
    if (api?.capture) return api.capture();
    if (api?.read) return api.read();

    try {
      const params = new URLSearchParams(location.search);
      if (params.has("anniversaryTest")) {
        return params.get("anniversaryTest").trim().toLowerCase();
      }
      const hash = location.hash.replace(/^#/, "");
      if (hash.startsWith("anniversaryTest=")) {
        const raw = hash.slice("anniversaryTest=".length).split("&")[0];
        return decodeURIComponent(raw).trim().toLowerCase();
      }
    } catch {
      /* ignore malformed URL */
    }
    return null;
  }

  function resolveTestReleaseId(testId) {
    const api = getAnniversaryTestApi();
    if (api?.resolve) return api.resolve(testId);
    return testId;
  }

  function syncAnniversaryTestUrl(testId = readAnniversaryTestId()) {
    const api = getAnniversaryTestApi();
    if (api?.syncUrl) {
      api.syncUrl(testId);
      return;
    }
    if (!testId) return;
    try {
      sessionStorage.setItem(ANNIVERSARY_TEST_KEY, testId);
    } catch {
      /* ignore storage errors */
    }
  }

  function getTestReleaseId() {
    return readAnniversaryTestId();
  }



  function t(key, vars = {}) {

    const template = window.i18n?.t?.(key, vars);

    if (template && template !== key) return template;



    let value = I18N_FALLBACK[key] || key;

    return Object.entries(vars).reduce(

      (str, [name, val]) => str.replace(new RegExp(`\\{${name}\\}`, "g"), val),

      value

    );

  }



  function getLang() {

    return window.i18n?.getLang?.() || document.documentElement.lang || "ko";

  }



  function resolveDataUrl(path) {

    try {

      return new URL(path, document.baseURI).href;

    } catch {

      return path;

    }

  }



  function getKstDateParts(date = new Date()) {

    const kstMs = date.getTime() + date.getTimezoneOffset() * 60000 + 9 * 3600000;

    const kst = new Date(kstMs);

    return {

      year: kst.getUTCFullYear(),

      month: kst.getUTCMonth() + 1,

      day: kst.getUTCDate(),

    };

  }



  function parseReleaseDate(str) {

    const [year, month, day] = str.split("-").map(Number);

    return { year, month, day };

  }



  function getAnniversaryYears(releaseDate, today) {

    const release = parseReleaseDate(releaseDate);

    return today.year - release.year;

  }



  function formatOrdinal(years, lang) {

    if (lang === "es") return `${years}º`;

    const mod100 = years % 100;

    const mod10 = years % 10;

    if (mod100 >= 11 && mod100 <= 13) return `${years}th`;

    if (mod10 === 1) return `${years}st`;

    if (mod10 === 2) return `${years}nd`;

    if (mod10 === 3) return `${years}rd`;

    return `${years}th`;

  }



  function collectReleases(data) {

    const list = [];

    for (const category of ["album", "single", "ost"]) {

      const items = data[category];

      if (!Array.isArray(items)) continue;

      for (const item of items) {

        if (item.releaseDate && item.id) {

          list.push({ ...item, category });

        }

      }

    }

    return list;

  }



  function findAnniversaries(releases, today) {

    return releases

      .filter((item) => {

        const release = parseReleaseDate(item.releaseDate);

        if (release.month !== today.month || release.day !== today.day) {

          return false;

        }

        return today.year - release.year >= 1;

      })

      .map((item) => ({

        ...item,

        years: getAnniversaryYears(item.releaseDate, today),

      }));

  }



  function findReleaseById(releases, id) {

    const matches = releases.filter((item) => item.id === id);

    if (matches.length === 0) return null;

    if (matches.length === 1) return matches[0];

    return matches.find((item) => item.category === "single") || matches[0];

  }



  function getEffectId(event) {

    return RELEASE_EFFECTS[event.id] || null;

  }



  function getEffectConfig(event) {

    const effectId = getEffectId(event);

    return effectId ? EFFECT_ASSETS[effectId] : null;

  }



  function clearEffects() {

    window.heroParadoxAura?.stop();

    window.heroNationParticles?.stop();

    window.heroShadowFragments?.stop();

    window.heroUniverseEffect?.stop();

    if (effectsEl) {

      effectsEl.innerHTML = "";

      effectsEl.className = "hero-anniversary__effects";

    }



    for (const config of Object.values(EFFECT_ASSETS)) {

      visualEl?.classList.remove(config.visualClass);

    }

  }



  function getOrbitAssets(config) {

    return config.orbit.flatMap((asset) => [

      asset,

      {

        ...asset,

        size: Math.round(asset.size * (0.72 + Math.random() * 0.28)),

      },

    ]);

  }



  function createOrbitSeed(asset, config) {

    const spin = document.createElement("div");

    spin.className = "hero-anniversary__orbit-spin";



    const angle = Math.random() * 360;

    const radius = 205 + Math.random() * 55;

    const duration = 48 + Math.random() * 42;

    const delay = -(Math.random() * duration);



    spin.style.setProperty("--orbit-angle", `${angle}deg`);

    spin.style.setProperty("--orbit-radius", `${radius}px`);

    spin.style.setProperty("--orbit-duration", `${duration}s`);

    spin.style.setProperty("--orbit-delay", `${delay}s`);



    const arm = document.createElement("div");

    arm.className = "hero-anniversary__orbit-arm";



    const img = document.createElement("img");

    img.className = config.seedClass;

    img.src = asset.src;

    img.alt = "";

    img.draggable = false;

    img.width = asset.size;

    img.style.setProperty("--seed-size", `${asset.size}px`);



    arm.appendChild(img);

    spin.appendChild(arm);

    return spin;

  }



  function spawnReleaseEffect(event) {

    const effectId = getEffectId(event);

    const config = effectId ? EFFECT_ASSETS[effectId] : null;

    if (!effectsEl || !config) return;



    effectsEl.classList.add(config.effectsClass);

    visualEl?.classList.add(config.visualClass);



    if (config.orbit?.length) {

      const orbitField = document.createElement("div");

      orbitField.className = "hero-anniversary__orbit-field";

      getOrbitAssets(config).forEach((asset) => {

        orbitField.appendChild(createOrbitSeed(asset, config));

      });

      effectsEl.appendChild(orbitField);

    }



    if (config.aura && coverEl && visualEl) {

      window.heroParadoxAura?.start(visualEl, coverEl);

    }



    if (config.risingParticles && coverEl && visualEl) {

      window.heroNationParticles?.start(visualEl, coverEl);

    }



    if (config.burstFragments && coverEl && visualEl) {

      window.heroShadowFragments?.start(visualEl, coverEl);

    }



    if (config.universeEffect && coverEl && visualEl) {

      window.heroUniverseEffect?.start(visualEl, coverEl);

    }



    if (config.mark) {

      const mark = document.createElement("img");

      mark.className = config.mark.className;

      mark.src = config.mark.src;

      mark.alt = "";

      mark.draggable = false;

      effectsEl.appendChild(mark);

    }

  }



  function applyEffect(event) {

    clearEffects();

    spawnReleaseEffect(event);

  }



  function syncCtaAlignment() {
    if (!ctaSlotEl) return;
    ctaSlotEl.style.width = "";
  }



  function replayGreetingAnimation() {

    if (!greetingEl || !container.classList.contains("is-visible")) return;

    greetingEl.style.animation = "none";

    void greetingEl.offsetHeight;

    greetingEl.style.animation = "";

  }



  function clearUniverseLogoShell() {
    if (!logoShellEl) return;
    logoShellEl.classList.remove("hero-anniversary__logo-shell--universe");
    logoShellEl.style.removeProperty("--universe-logo-url");
  }

  function applyUniverseLogoShell(logoSrc) {
    if (!logoShellEl || !logoSrc) return;
    logoShellEl.classList.add("hero-anniversary__logo-shell--universe");
    logoShellEl.style.setProperty("--universe-logo-url", `url("${logoSrc}")`);
  }



  function setReleaseBrand(event) {

    const title = event.title || event.id;

    const config = getEffectConfig(event);

    clearUniverseLogoShell();



    releaseTitleEl.classList.remove("hero-anniversary__release-title--paradox");

    for (const item of Object.values(EFFECT_ASSETS)) {

      if (item.logoClass) releaseLogoEl?.classList.remove(item.logoClass);

      if (item.titleClass) releaseTitleEl.classList.remove(item.titleClass);

    }

    if (config?.titleClass) {

      releaseTitleEl.classList.add(config.titleClass);

    }



    if (config?.logo && releaseLogoEl) {

      releaseTitleEl.hidden = true;

      releaseTitleEl.textContent = "";

      releaseLogoEl.src = config.logo;

      releaseLogoEl.alt = title;

      if (config.logoClass) {

        releaseLogoEl.classList.add(config.logoClass);

      }

      if (config.logoClass === "hero-anniversary__release-logo--universe") {
        applyUniverseLogoShell(config.logo);
      }

      releaseLogoEl.hidden = false;

      return;

    }



    if (releaseLogoEl) {

      releaseLogoEl.hidden = true;

      releaseLogoEl.removeAttribute("src");

    }

    releaseTitleEl.hidden = false;

    releaseTitleEl.textContent = title;

  }



  function setVisual(event) {

    const title = event.title || event.id;

    const useLottie = Boolean(event.lottie);



    if (useLottie && lottieEl) {

      lottieEl.hidden = false;

      lottieEl.dataset.lottieSrc = event.lottie;

      if (coverEl) coverEl.hidden = true;

      return;

    }



    if (lottieEl) {

      lottieEl.hidden = true;

      lottieEl.removeAttribute("data-lottie-src");

    }



    if (event.cover && coverEl) {

      coverEl.src = event.cover;

      coverEl.alt = title;

      coverEl.hidden = false;

    } else if (coverEl) {

      coverEl.removeAttribute("src");

      coverEl.alt = "";

      coverEl.hidden = true;

    }

  }



  function renderGreetingHtml(years) {
    const yearsYear =
      `<span class="hero-anniversary__greeting-accent">` +
      `<span class="hero-anniversary__greeting-num">${years}</span> ` +
      `<span class="hero-anniversary__greeting-year">year</span>` +
      `</span>`;
    return t("hero.anniversary.greeting", { yearsYear });
  }



  function renderEvent(event) {

    if (!greetingEl || !releaseTitleEl || !ctaEl) return;



    activeEvent = event;

    if (labelEl) labelEl.textContent = t("hero.anniversary.label");

    greetingEl.innerHTML = renderGreetingHtml(event.years);

    greetingEl.removeAttribute("aria-hidden");

    replayGreetingAnimation();



    setReleaseBrand(event);



    const ctaTarget = ctaTextEl || ctaEl;

    ctaTarget.textContent = t("hero.anniversary.cta");

    ctaEl.href = FANCAFE_URL;



    setVisual(event);

    applyEffect(event);

    syncCtaAlignment();



    container.hidden = false;

    container.classList.add("is-visible");

    heroSection.classList.add("hero--anniversary");

    document.querySelector("main:not(.site-main)")?.classList.add("main--anniversary");

    if (heroDefault) heroDefault.setAttribute("aria-hidden", "true");

  }



  function hideEvent() {

    activeEvent = null;

    clearEffects();

    container.hidden = true;

    container.classList.remove("is-visible");

    heroSection.classList.remove("hero--anniversary");

    document.querySelector("main:not(.site-main)")?.classList.remove("main--anniversary");

    if (heroDefault) heroDefault.removeAttribute("aria-hidden");

    if (greetingEl) greetingEl.setAttribute("aria-hidden", "true");

  }



  async function loadDiscography() {

    try {

      const response = await fetch(resolveDataUrl("data/discography.json"));

      if (!response.ok) return null;

      return response.json();

    } catch {

      return null;

    }

  }



  function buildTestEvent(releases, today, testId = getTestReleaseId() || "dandelion") {

    const releaseId = resolveTestReleaseId(testId);

    const fromData = findReleaseById(releases, releaseId);

    const fallback = {

      dandelion: {

        category: "single",

        id: "dandelion",

        title: "DANDELION",

        releaseDate: "2021-07-20",

        cover: "images/albums/dandelion.png",

      },

      paradox: {

        category: "single",

        id: "paradox",

        title: "Paradox",

        releaseDate: "2024-10-04",

        cover: "images/albums/paradox.png",

      },

      nation: {

        category: "single",

        id: "the-nation",

        title: "The Nation",

        releaseDate: "2021-10-26",

        cover: "images/albums/the-nation.png",

      },

      "the-nation": {

        category: "single",

        id: "the-nation",

        title: "The Nation",

        releaseDate: "2021-10-26",

        cover: "images/albums/the-nation.png",

      },

      shadow: {

        category: "single",

        id: "deep-shadow",

        title: "Deep Shadow",

        releaseDate: "2025-03-27",

        cover: "images/albums/deep-shadow.png",

      },

      "deep-shadow": {

        category: "single",

        id: "deep-shadow",

        title: "Deep Shadow",

        releaseDate: "2025-03-27",

        cover: "images/albums/deep-shadow.png",

      },

      universe: {

        category: "single",

        id: "universe",

        title: "UNIVERSE",

        releaseDate: "2020-10-29",

        cover: "images/albums/universe.png",

      },

    };

    const source =
      fromData || fallback[releaseId] || fallback[testId] || fallback.dandelion;

    const years = getAnniversaryYears(source.releaseDate, today);

    return {

      ...source,

      years: years >= 1 ? years : 1,

    };

  }



  async function waitForI18n() {

    if (!window.i18n?.ready) return;

    try {

      await window.i18n.ready;

    } catch {

      /* locale fetch 실패해도 표시는 계속 */

    }

  }



  async function init() {
    const testId = readAnniversaryTestId();
    const today = getKstDateParts();

    if (testId) {
      renderEvent(buildTestEvent([], today, testId));
      syncAnniversaryTestUrl(testId);

      Promise.all([waitForI18n(), loadDiscography()]).then(([, data]) => {
        const releases = data ? collectReleases(data) : [];
        renderEvent(buildTestEvent(releases, today, testId));
      });

      return;
    }



    await waitForI18n();



    const data = await loadDiscography();

    if (!data) {

      hideEvent();

      return;

    }



    const releases = collectReleases(data);

    const events = findAnniversaries(releases, today);



    if (events.length === 0) {

      hideEvent();

      return;

    }



    events.sort((a, b) => b.years - a.years || a.title.localeCompare(b.title));

    renderEvent(events[0]);

  }



  document.addEventListener("i18n:change", () => {

    if (activeEvent) renderEvent(activeEvent);

  });



  window.addEventListener("resize", syncCtaAlignment);

  window.addEventListener("pageshow", (event) => {
    if (!event.persisted) return;

    const testId = readAnniversaryTestId();
    if (!testId) return;

    const releaseId = resolveTestReleaseId(testId);
    if (activeEvent?.id === releaseId) return;

    loadDiscography().then((data) => {
      const releases = data ? collectReleases(data) : [];
      renderEvent(buildTestEvent(releases, getKstDateParts(), testId));
      syncAnniversaryTestUrl(testId);
    });
  });

  init();

})();


