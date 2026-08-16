(function () {
  "use strict";

  const pageRoot = document.querySelector(".site-page--about");
  if (!pageRoot) return;

  const memberOverlay = document.getElementById("member-overlay");
  const memberPanel = document.getElementById("member-panel");
  const memberIdEl = document.getElementById("member-panel-id");
  const memberTitleEl = document.getElementById("member-panel-title");
  const memberBodyEl = document.getElementById("member-panel-body");
  let memberPages = {};
  let lastFocusedEl = null;

  function rebuildMemberPages() {
    if (!window.i18n?.buildOverlayPages) return;
    const all = window.i18n.buildOverlayPages();
    memberPages = Object.fromEntries(
      Object.entries(all).filter(([key]) => key.startsWith("member-"))
    );
  }

  function syncAboutPageLayout() {}

  window.syncAboutOverlayLayout = syncAboutPageLayout;

  function initAboutStage() {
    const stage = pageRoot.querySelector(".band-stage[data-about-figure]");
    if (stage && typeof window.initBandStage === "function") {
      window.initBandStage(stage);
    }
  }

  function openMemberPanel(key, { fromHistory = false } = {}) {
    const page = memberPages[key];
    if (!page || !memberOverlay || !memberPanel) return;

    lastFocusedEl = document.activeElement;
    memberIdEl.textContent = page.id;
    memberTitleEl.textContent = page.title;
    memberBodyEl.innerHTML = page.html;

    memberOverlay.hidden = false;
    memberOverlay.removeAttribute("aria-hidden");
    requestAnimationFrame(() => {
      memberOverlay.classList.add("is-open");
    });
    document.body.classList.add("member-overlay-open");

    if (!fromHistory) {
      history.pushState({ member: key }, "", `#${key}`);
    }

    const closeBtn = memberPanel.querySelector("[data-member-close]");
    if (closeBtn) closeBtn.focus();
  }

  function closeMemberPanel({ fromHistory = false } = {}) {
    if (!memberOverlay?.classList.contains("is-open")) return;

    memberOverlay.classList.remove("is-open");
    document.body.classList.remove("member-overlay-open");
    memberOverlay.setAttribute("aria-hidden", "true");

    const finish = () => {
      memberOverlay.hidden = true;
      memberBodyEl.innerHTML = "";
      if (lastFocusedEl && typeof lastFocusedEl.focus === "function") {
        lastFocusedEl.focus();
      }
    };

    let done = false;
    const onEnd = (e) => {
      if (e.target !== memberPanel || e.propertyName !== "opacity") return;
      memberPanel.removeEventListener("transitionend", onEnd);
      if (!done) {
        done = true;
        finish();
      }
    };

    memberPanel.addEventListener("transitionend", onEnd);
    setTimeout(() => {
      if (!done) {
        done = true;
        memberPanel.removeEventListener("transitionend", onEnd);
        finish();
      }
    }, 420);

    if (!fromHistory && location.hash.startsWith("#member-")) {
      history.back();
    }
  }

  function handleMemberHistory() {
    const key = location.hash.replace(/^#/, "");
    if (key && memberPages[key]) {
      openMemberPanel(key, { fromHistory: true });
      return;
    }

    if (memberOverlay?.classList.contains("is-open")) {
      closeMemberPanel({ fromHistory: true });
    }
  }

  function renderAboutStage() {
    const root = document.getElementById("about-stage-root");
    if (!root || !window.i18n?.aboutStageHtml) return;
    root.innerHTML = window.i18n.aboutStageHtml();
    initAboutStage();
    requestAnimationFrame(() => {
      requestAnimationFrame(syncAboutPageLayout);
    });
  }

  window.addEventListener("popstate", handleMemberHistory);
  window.addEventListener("resize", syncAboutPageLayout);

  document.addEventListener("click", (e) => {
    const memberTrigger = e.target.closest("[data-overlay^='member-']");
    if (memberTrigger) {
      e.preventDefault();
      openMemberPanel(memberTrigger.dataset.overlay);
      return;
    }

    if (e.target.closest("[data-member-close], [data-overlay-stack-close]")) {
      e.preventDefault();
      closeMemberPanel();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && memberOverlay?.classList.contains("is-open")) {
      closeMemberPanel();
    }
  });

  document.addEventListener("i18n:ready", () => {
    rebuildMemberPages();
    renderAboutStage();
    syncAboutPageLayout();

    const hashKey = location.hash.replace(/^#/, "");
    if (hashKey && hashKey.startsWith("member-")) {
      openMemberPanel(hashKey, { fromHistory: true });
    }
  });

  document.addEventListener("i18n:change", () => {
    rebuildMemberPages();
    renderAboutStage();

    const hashKey = location.hash.replace(/^#/, "");
    if (memberOverlay?.classList.contains("is-open") && hashKey && memberPages[hashKey]) {
      openMemberPanel(hashKey, { fromHistory: true });
    }
  });
})();
