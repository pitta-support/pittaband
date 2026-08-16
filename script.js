(function () {
  "use strict";

  /* ===== Sparkle field ===== */
  const canvas = document.getElementById("particle-canvas");
  const ctx = canvas.getContext("2d");
  let particles = [];
  let shootingStars = [];
  let w, h;
  let mouse = { x: -1000, y: -1000 };
  let animationId;

  const COLORS = {
    cyan: { h: 193, s: 100, l: 65 },
    magenta: { h: 290, s: 100, l: 60 },
    crimson: { h: 345, s: 100, l: 58 },
  };

  function pickColor() {
    const roll = Math.random();
    if (roll > 0.82) return COLORS.crimson;
    if (roll > 0.55) return COLORS.magenta;
    return COLORS.cyan;
  }

  function hsla(c, a) {
    return `hsla(${c.h}, ${c.s}%, ${c.l}%, ${a})`;
  }

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
    initParticles();
  }

  function initParticles() {
    const count = Math.min(Math.floor((w * h) / 7000), 260);
    particles = Array.from({ length: count }, () => {
      const typeRoll = Math.random();
      const type = typeRoll > 0.88 ? "orb" : typeRoll > 0.55 ? "star" : "dot";
      const color = pickColor();
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * (type === "orb" ? 0.25 : 0.55),
        vy: (Math.random() - 0.5) * (type === "orb" ? 0.25 : 0.55),
        r:
          type === "orb"
            ? Math.random() * 2.2 + 1.8
            : type === "star"
            ? Math.random() * 2.5 + 1.5
            : Math.random() * 1.4 + 0.4,
        baseAlpha:
          type === "orb"
            ? Math.random() * 0.35 + 0.25
            : Math.random() * 0.55 + 0.35,
        phase: Math.random() * Math.PI * 2,
        twinkle: Math.random() * 0.04 + 0.015,
        rot: Math.random() * Math.PI,
        rotSpeed: (Math.random() - 0.5) * 0.02,
        type,
        color,
      };
    });
    shootingStars = [];
  }

  function spawnShootingStar() {
    if (shootingStars.length > 3 || Math.random() > 0.012) return;
    const color = pickColor();
    shootingStars.push({
      x: Math.random() * w * 0.8,
      y: Math.random() * h * 0.4,
      vx: Math.random() * 4 + 3,
      vy: Math.random() * 2 + 1,
      len: Math.random() * 60 + 40,
      alpha: 1,
      color,
    });
  }

  function drawStar(x, y, size, alpha, color, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.strokeStyle = hsla(color, alpha);
    ctx.lineWidth = 1;
    ctx.shadowBlur = size * 4;
    ctx.shadowColor = hsla(color, alpha * 0.9);
    ctx.beginPath();
    ctx.moveTo(-size, 0);
    ctx.lineTo(size, 0);
    ctx.moveTo(0, -size * 0.7);
    ctx.lineTo(0, size * 0.7);
    ctx.stroke();
    ctx.restore();
  }

  function drawOrb(x, y, r, alpha, color) {
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r * 3);
    grad.addColorStop(0, hsla(color, alpha));
    grad.addColorStop(0.4, hsla(color, alpha * 0.4));
    grad.addColorStop(1, hsla(color, 0));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r * 3, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawParticles() {
    ctx.clearRect(0, 0, w, h);

    /* mouse glow */
    if (mouse.x > 0) {
      const glow = ctx.createRadialGradient(
        mouse.x,
        mouse.y,
        0,
        mouse.x,
        mouse.y,
        160
      );
      glow.addColorStop(0, "rgba(48, 213, 255, 0.07)");
      glow.addColorStop(0.5, "rgba(216, 0, 255, 0.03)");
      glow.addColorStop(1, "rgba(48, 213, 255, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(mouse.x - 160, mouse.y - 160, 320, 320);
    }

    particles.forEach((p, i) => {
      p.x += p.vx;
      p.y += p.vy;
      p.phase += p.twinkle;
      p.rot += p.rotSpeed;

      if (p.x < -20) p.x = w + 20;
      if (p.x > w + 20) p.x = -20;
      if (p.y < -20) p.y = h + 20;
      if (p.y > h + 20) p.y = -20;

      const dx = mouse.x - p.x;
      const dy = mouse.y - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 140) {
        p.x -= dx * 0.012;
        p.y -= dy * 0.012;
      }

      const twinkle = 0.45 + 0.55 * Math.sin(p.phase);
      const alpha = p.baseAlpha * twinkle;

      if (p.type === "star") {
        drawStar(p.x, p.y, p.r, alpha, p.color, p.rot);
      } else if (p.type === "orb") {
        drawOrb(p.x, p.y, p.r, alpha, p.color);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = hsla(p.color, alpha);
        ctx.shadowBlur = 6;
        ctx.shadowColor = hsla(p.color, alpha * 0.8);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      for (let j = i + 1; j < particles.length; j++) {
        const q = particles[j];
        const d = Math.hypot(p.x - q.x, p.y - q.y);
        if (d < 110) {
          const lineAlpha = 0.14 * (1 - d / 110);
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.strokeStyle = `rgba(48, 213, 255, ${lineAlpha})`;
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }
    });

    spawnShootingStar();
    shootingStars = shootingStars.filter((s) => {
      s.x += s.vx;
      s.y += s.vy;
      s.alpha -= 0.018;

      if (s.alpha <= 0) return false;

      const grad = ctx.createLinearGradient(
        s.x,
        s.y,
        s.x - s.vx * s.len * 0.15,
        s.y - s.vy * s.len * 0.15
      );
      grad.addColorStop(0, hsla(s.color, s.alpha));
      grad.addColorStop(1, hsla(s.color, 0));
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 8;
      ctx.shadowColor = hsla(s.color, s.alpha * 0.6);
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x - s.vx * s.len * 0.15, s.y - s.vy * s.len * 0.15);
      ctx.stroke();
      ctx.shadowBlur = 0;
      return s.x < w + 100 && s.y < h + 100;
    });

    animationId = requestAnimationFrame(drawParticles);
  }

  window.addEventListener("resize", resize);
  window.addEventListener("mousemove", (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  resize();
  drawParticles();

  /* ===== Overlay system (Modal / BottomSheet) ===== */
  const navLinks = document.querySelectorAll(
    ".nav-desktop .nav-link, .nav-mobile .nav-link"
  );
  const overlayRoot = document.getElementById("overlay");
  const overlayPanel = document.getElementById("overlay-panel");
  const overlayIdEl = document.getElementById("overlay-id");
  const overlayTitleEl = document.getElementById("overlay-title");
  const overlayBodyEl = document.getElementById("overlay-body");
  const overlayStackPanel = document.getElementById("overlay-stack-panel");
  const overlayStackIdEl = document.getElementById("overlay-stack-id");
  const overlayStackTitleEl = document.getElementById("overlay-stack-title");
  const overlayStackBodyEl = document.getElementById("overlay-stack-body");
  let lastFocusedEl = null;
  let OVERLAY_PAGES = {};

  const OVERLAY_TYPES = {
    modal: "overlay-panel--modal",
    "sheet-mid": "overlay-panel--sheet-mid",
    "sheet-sm": "overlay-panel--sheet-sm",
  };

  const STANDALONE_PAGES = {
    about: "about.html",
    album: "album.html",
    concert: "concert.html",
    festival: "festival.html",
  };

  function buildHistoryUrl(hash = location.hash) {
    const params = new URLSearchParams(location.search);
    const testId = window.SFAnniversaryTest?.read?.();
    if (testId && !params.has("anniversaryTest")) {
      params.set("anniversaryTest", testId);
    }
    const qs = params.toString();
    const hashPart =
      hash === "" ? "" : hash.startsWith("#") ? hash : `#${hash}`;
    return `${location.pathname}${qs ? `?${qs}` : ""}${hashPart}`;
  }

  function redirectStandalonePage(pageKey) {
    const target = STANDALONE_PAGES[pageKey];
    if (target) {
      window.location.href = target;
      return true;
    }
    if (typeof pageKey === "string" && pageKey.startsWith("member-")) {
      window.location.href = `about.html#${pageKey}`;
      return true;
    }
    return false;
  }

  function rebuildOverlayPages() {
    OVERLAY_PAGES = window.i18n.buildOverlayPages();
  }

  function isMemberOverlayKey(pageKey) {
    return typeof pageKey === "string" && pageKey.startsWith("member-");
  }

  function initAboutBandStage(root = overlayBodyEl) {
    const stage = root.querySelector(".band-stage[data-about-figure]");
    if (stage && typeof window.initBandStage === "function") {
      window.initBandStage(stage);
    }
  }

  function syncAboutOverlayLayout() {
    if (!overlayPanel.classList.contains("overlay-panel--about")) return;

    const header = overlayPanel.querySelector(".overlay-header");
    if (!header) return;

    overlayPanel.style.setProperty(
      "--about-header-h",
      `${Math.ceil(header.getBoundingClientRect().height)}px`
    );
  }

  window.syncAboutOverlayLayout = syncAboutOverlayLayout;

  function resetAboutOverlayLayout() {
    overlayPanel.style.removeProperty("--about-header-h");
  }

  let currentOverlayKey = null;
  let overlayStackActive = false;
  let baseOverlaySnapshot = null;
  let overlayHistoryLock = false;

  function getOverlayFromHash() {
    const key = location.hash.replace(/^#/, "");
    return key && OVERLAY_PAGES[key] ? key : null;
  }

  function pushOverlayHistory(pageKey) {
    history.pushState({ overlay: pageKey }, "", buildHistoryUrl(`#${pageKey}`));
  }

  function ensureOverlayHistoryBase() {
    if (location.hash) {
      history.replaceState(null, "", buildHistoryUrl(""));
    }
    history.pushState({ overlayBase: true }, "", buildHistoryUrl(""));
  }

  function getNavActiveKey() {
    if (overlayStackActive && baseOverlaySnapshot?.key) {
      return baseOverlaySnapshot.key;
    }
    return currentOverlayKey;
  }

  function syncNavActive(pageKey) {
    navLinks.forEach((link) => {
      if (link.dataset.navPage) {
        link.classList.remove("active");
        return;
      }
      if (!link.dataset.overlay) return;
      const activeKey = pageKey ?? getNavActiveKey();
      link.classList.toggle("active", link.dataset.overlay === activeKey);
    });
  }

  function setOverlayType(type) {
    Object.values(OVERLAY_TYPES).forEach((cls) =>
      overlayPanel.classList.remove(cls)
    );
    overlayPanel.classList.add(OVERLAY_TYPES[type] || OVERLAY_TYPES.modal);
  }

  function clearStackPanel() {
    overlayStackPanel.classList.remove("is-active");
    overlayStackPanel.hidden = true;
    overlayStackPanel.setAttribute("aria-hidden", "true");
    overlayStackBodyEl.innerHTML = "";
    overlayRoot.classList.remove("has-stack");
    overlayStackActive = false;
  }

  function restoreBaseOverlayHeader() {
    if (!baseOverlaySnapshot) return;

    overlayIdEl.textContent = baseOverlaySnapshot.id;
    overlayTitleEl.textContent = baseOverlaySnapshot.title;
    currentOverlayKey = baseOverlaySnapshot.key;
    syncNavActive(baseOverlaySnapshot.key);
    baseOverlaySnapshot = null;
  }

  function openStackOverlay(pageKey, { fromHistory = false } = {}) {
    if (!OVERLAY_PAGES[pageKey] && window.i18n?.buildOverlayPages) {
      rebuildOverlayPages();
    }

    const page = OVERLAY_PAGES[pageKey];
    if (!page || !isMemberOverlayKey(pageKey)) return;

    if (!overlayStackActive) {
      baseOverlaySnapshot = {
        key: currentOverlayKey,
        id: overlayIdEl.textContent,
        title: overlayTitleEl.textContent,
      };
      overlayStackActive = true;
      overlayRoot.classList.add("has-stack");
      overlayStackPanel.hidden = false;
      overlayStackPanel.removeAttribute("aria-hidden");
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          overlayStackPanel.classList.add("is-active");
        });
      });
    }

    overlayStackIdEl.textContent = page.id;
    overlayStackTitleEl.textContent = page.title;
    overlayStackBodyEl.innerHTML = page.html;
    currentOverlayKey = pageKey;

    if (!fromHistory) {
      overlayHistoryLock = true;
      pushOverlayHistory(pageKey);
      overlayHistoryLock = false;
    }

    const closeBtn = overlayStackPanel.querySelector("[data-overlay-stack-close]");
    if (closeBtn) closeBtn.focus();
  }

  function closeStackOverlay({ fromHistory = false } = {}) {
    if (!overlayStackActive) return;

    overlayRoot.classList.remove("has-stack");
    overlayStackPanel.classList.remove("is-active");

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      overlayStackPanel.removeEventListener("transitionend", onEnd);

      restoreBaseOverlayHeader();
      clearStackPanel();

      if (!fromHistory) {
        overlayHistoryLock = true;
        history.back();
        overlayHistoryLock = false;
      }
    };

    const onEnd = (e) => {
      if (e.target !== overlayStackPanel || e.propertyName !== "transform") return;
      finish();
    };

    overlayStackPanel.addEventListener("transitionend", onEnd);
    setTimeout(finish, 520);
  }

  function canOpenMemberStack(pageKey) {
    if (!isMemberOverlayKey(pageKey)) return false;
    redirectStandalonePage(pageKey);
    return false;
  }

  function openOverlay(pageKey, { fromHistory = false } = {}) {
    if (redirectStandalonePage(pageKey)) return;

    if (!OVERLAY_PAGES[pageKey] && window.i18n?.buildOverlayPages) {
      rebuildOverlayPages();
    }
    const page = OVERLAY_PAGES[pageKey];
    if (!page) return;

    if (canOpenMemberStack(pageKey)) {
      openStackOverlay(pageKey, { fromHistory });
      return;
    }

    if (overlayStackActive) {
      restoreBaseOverlayHeader();
      clearStackPanel();
    }

    const isAlreadyOpen = overlayRoot.classList.contains("is-open");
    currentOverlayKey = pageKey;

    if (!fromHistory) {
      overlayHistoryLock = true;
      if (isAlreadyOpen && location.hash) {
        pushOverlayHistory(pageKey);
      } else if (!location.hash || getOverlayFromHash() !== pageKey) {
        pushOverlayHistory(pageKey);
      }
      overlayHistoryLock = false;
    }

    syncNavActive(pageKey);

    lastFocusedEl = document.activeElement;
    setOverlayType(page.type);
    overlayPanel.classList.remove("overlay-panel--about");
    overlayIdEl.textContent = page.id;
    overlayTitleEl.textContent = page.title;
    overlayBodyEl.innerHTML = page.html;

    overlayRoot.hidden = false;
    requestAnimationFrame(() => {
      overlayRoot.classList.add("is-open");
    });

    document.body.classList.add("overlay-open");
    overlayRoot.removeAttribute("aria-hidden");

    const closeBtn = overlayPanel.querySelector(".overlay-close");
    if (closeBtn) closeBtn.focus();
  }

  function closeOverlay({ fromHistory = false } = {}) {
    if (overlayStackActive) {
      closeStackOverlay({ fromHistory });
      return;
    }

    if (overlayRoot.hidden && !currentOverlayKey) return;

    currentOverlayKey = null;
    syncNavActive(null);

    overlayRoot.classList.remove("is-open");
    document.body.classList.remove("overlay-open");
    overlayPanel.classList.remove("overlay-panel--about");
    resetAboutOverlayLayout();
    overlayRoot.setAttribute("aria-hidden", "true");

    const onEnd = (e) => {
      if (e.target !== overlayPanel || e.propertyName !== "transform") return;
      overlayPanel.removeEventListener("transitionend", onEnd);
      overlayRoot.hidden = true;
      overlayBodyEl.innerHTML = "";
      if (lastFocusedEl && typeof lastFocusedEl.focus === "function") {
        lastFocusedEl.focus();
      }
    };

    overlayPanel.addEventListener("transitionend", onEnd);

    if (!fromHistory && (location.hash || history.state?.overlay)) {
      overlayHistoryLock = true;
      history.back();
      overlayHistoryLock = false;
    }
  }

  function handleOverlayHistoryNavigation() {
    if (overlayHistoryLock) return;

    const key = location.hash.replace(/^#/, "");
    if (key.startsWith("anniversaryTest=")) {
      return;
    }
    if (STANDALONE_PAGES[key]) {
      location.replace(STANDALONE_PAGES[key]);
      return;
    }
    if (key.startsWith("member-")) {
      location.replace(`about.html#${key}`);
      return;
    }

    const overlayKey = getOverlayFromHash();

    if (overlayKey) {
      if (overlayKey !== currentOverlayKey) openOverlay(overlayKey, { fromHistory: true });
      return;
    }

    if (overlayRoot.classList.contains("is-open")) {
      closeOverlay({ fromHistory: true });
    }
  }

  window.addEventListener("popstate", handleOverlayHistoryNavigation);

  document.addEventListener("i18n:change", () => {
    rebuildOverlayPages();
    if (currentOverlayKey && OVERLAY_PAGES[currentOverlayKey]) {
      if (overlayStackActive && isMemberOverlayKey(currentOverlayKey)) {
        openStackOverlay(currentOverlayKey, { fromHistory: true });
      } else {
        openOverlay(currentOverlayKey, { fromHistory: true });
      }
    }
  });

  window.i18n.ready.then(() => {
    rebuildOverlayPages();

    const hashKey = location.hash.replace(/^#/, "");
    if (hashKey.startsWith("anniversaryTest=")) {
      return;
    }
    if (STANDALONE_PAGES[hashKey]) {
      location.replace(STANDALONE_PAGES[hashKey]);
      return;
    }
    if (hashKey.startsWith("member-")) {
      location.replace(`about.html#${hashKey}`);
      return;
    }

    if (hashKey && OVERLAY_PAGES[hashKey]) {
      ensureOverlayHistoryBase();
      pushOverlayHistory(hashKey);
      openOverlay(hashKey, { fromHistory: true });
    }
  });

  document.addEventListener("click", (e) => {
    const openTrigger = e.target.closest("[data-overlay]");
    if (openTrigger) {
      e.preventDefault();
      const key = openTrigger.dataset.overlay;
      openOverlay(key);

      if (openTrigger.classList.contains("nav-link")) {
        syncNavActive(key);
      }
      return;
    }

    if (e.target.closest("[data-overlay-stack-close]")) {
      e.preventDefault();
      closeStackOverlay();
      return;
    }

    if (e.target.closest("[data-overlay-close]")) {
      e.preventDefault();
      closeOverlay();
      return;
    }

    const switchTrigger = e.target.closest("[data-overlay-switch]");
    if (switchTrigger) {
      e.preventDefault();
      openOverlay(switchTrigger.dataset.overlaySwitch);
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlayRoot.classList.contains("is-open")) {
      closeOverlay();
    }
  });

  window.addEventListener("resize", syncAboutOverlayLayout);

  overlayPanel.addEventListener("transitionend", (e) => {
    if (
      e.target === overlayPanel &&
      e.propertyName === "transform" &&
      overlayPanel.classList.contains("overlay-panel--about")
    ) {
      syncAboutOverlayLayout();
    }
  });

  /* ===== Stat counter animation ===== */
  function animateCount(el) {
    const target = parseInt(el.dataset.count, 10);
    const duration = 2000;
    const start = performance.now();

    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(eased * target);
      el.textContent = target >= 1000 ? current.toLocaleString() : current;
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }

  const statObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          statObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 }
  );

  document.querySelectorAll(".stat-value[data-count]").forEach((el) => {
    statObserver.observe(el);
  });

  /* ===== Terminal scan effect ===== */
  const scanBtn = document.querySelector(".terminal-btn");
  const terminalInput = document.querySelector(".terminal-input");

  scanBtn.addEventListener("click", () => {
    const scanning = window.i18n.t("hero.scanning");
    const scan = window.i18n.t("hero.scan");
    scanBtn.textContent = scanning;
    scanBtn.disabled = true;
    setTimeout(() => {
      scanBtn.textContent = scan;
      scanBtn.disabled = false;
      if (terminalInput.value.trim()) {
        terminalInput.style.textShadow = "0 0 8px rgba(48,213,255,0.6)";
        setTimeout(() => {
          terminalInput.style.textShadow = "";
        }, 600);
      }
    }, 1200);
  });

  /* ===== Cleanup on page hide ===== */
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelAnimationFrame(animationId);
    } else {
      drawParticles();
    }
  });
})();
