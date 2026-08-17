(function () {
  "use strict";

  const OVERLAY_ID = "board-overlay";
  const CLOSE_SVG =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>';

  let overlay = null;
  let panel = null;
  let lastFocused = null;
  let formBound = false;

  function t(key) {
    return window.i18n ? window.i18n.t(key) : key;
  }

  function getAccessKey() {
    return window.BOARD_CONFIG?.accessKey?.trim() || "";
  }

  function applyBoardI18n() {
    if (!overlay) return;
    window.i18n?.applyElements?.();
  }

  function ensureOverlay() {
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.className = "board-overlay";
    overlay.hidden = true;
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML = `
      <div class="board-overlay__backdrop" data-board-close tabindex="-1" aria-hidden="true"></div>
      <div class="board-overlay__panel" role="dialog" aria-modal="true" aria-labelledby="board-overlay-title">
        <header class="overlay-header">
          <span class="overlay-id">BRD-01</span>
          <h2 class="overlay-title" id="board-overlay-title" data-i18n="pages.board.title">건의사항</h2>
          <button type="button" class="overlay-close" data-board-close data-i18n-attr="aria-label:overlay.close" aria-label="닫기">
            ${CLOSE_SVG}
          </button>
        </header>
        <div class="overlay-body">
          <form class="board-form" id="board-form">
            <div class="board-form__field">
              <label class="board-form__label" for="board-title" data-i18n="pages.board.titleLabel">제목</label>
              <input
                class="board-form__input"
                type="text"
                id="board-title"
                name="title"
                maxlength="200"
                required
                autocomplete="off"
              />
            </div>
            <div class="board-form__field">
              <label class="board-form__label" for="board-content" data-i18n="pages.board.contentLabel">내용</label>
              <textarea
                class="board-form__textarea"
                id="board-content"
                name="content"
                maxlength="10000"
                required
              ></textarea>
            </div>
            <button type="submit" class="board-form__submit" id="board-submit" data-i18n="pages.board.submit">등록</button>
          </form>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    panel = overlay.querySelector(".board-overlay__panel");
    bindForm();
    applyBoardI18n();
    return overlay;
  }

  function bindForm() {
    if (formBound || !overlay) return;

    const form = overlay.querySelector("#board-form");
    const titleInput = overlay.querySelector("#board-title");
    const contentInput = overlay.querySelector("#board-content");
    const submitBtn = overlay.querySelector("#board-submit");
    if (!form) return;

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const accessKey = getAccessKey();
      if (!accessKey) {
        alert(t("pages.board.alertConfig"));
        return;
      }

      const title = titleInput?.value.trim() || "";
      const content = contentInput?.value.trim() || "";

      if (!title || !content) {
        alert(t("pages.board.alertRequired"));
        return;
      }

      submitBtn.disabled = true;

      try {
        const res = await fetch("https://api.web3forms.com/submit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            access_key: accessKey,
            subject: `${t("pages.board.subjectPrefix")} ${title}`,
            from_name: "SCI-FI Archive",
            title,
            message: content,
          }),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.message || "submit failed");
        }

        form.reset();
        closeBoardModal();
        alert(t("pages.board.alertSuccess"));
      } catch {
        alert(t("pages.board.alertFail"));
      } finally {
        submitBtn.disabled = false;
      }
    });

    formBound = true;
  }

  function openBoardModal() {
    ensureOverlay();
    if (overlay.classList.contains("is-open")) return;

    lastFocused = document.activeElement;
    overlay.hidden = false;
    overlay.removeAttribute("aria-hidden");
    requestAnimationFrame(() => {
      overlay.classList.add("is-open");
    });
    document.body.classList.add("board-overlay-open");

    const titleInput = overlay.querySelector("#board-title");
    titleInput?.focus();
  }

  function closeBoardModal({ clearHash = true } = {}) {
    if (!overlay?.classList.contains("is-open")) return;

    overlay.classList.remove("is-open");
    document.body.classList.remove("board-overlay-open");
    overlay.setAttribute("aria-hidden", "true");

    const finish = () => {
      overlay.hidden = true;
      if (lastFocused && typeof lastFocused.focus === "function") {
        lastFocused.focus();
      }
      lastFocused = null;
    };

    let done = false;
    const onEnd = (event) => {
      if (event.target !== panel || event.propertyName !== "opacity") return;
      panel.removeEventListener("transitionend", onEnd);
      if (!done) {
        done = true;
        finish();
      }
    };

    panel?.addEventListener("transitionend", onEnd);
    window.setTimeout(() => {
      if (!done) {
        done = true;
        panel?.removeEventListener("transitionend", onEnd);
        finish();
      }
    }, 400);

    if (clearHash && window.location.hash === "#board") {
      history.replaceState(
        null,
        "",
        `${window.location.pathname}${window.location.search}`
      );
    }
  }

  function handleDocumentClick(event) {
    const openTrigger = event.target.closest("[data-board-open]");
    if (openTrigger) {
      event.preventDefault();
      openBoardModal();
      return;
    }

    if (!overlay?.classList.contains("is-open")) return;

    if (event.target.closest("[data-board-close]")) {
      event.preventDefault();
      closeBoardModal();
    }
  }

  function handleKeydown(event) {
    if (event.key === "Escape" && overlay?.classList.contains("is-open")) {
      closeBoardModal();
    }
  }

  function syncHash() {
    if (window.location.hash === "#board") {
      openBoardModal();
    }
  }

  document.addEventListener("click", handleDocumentClick);
  document.addEventListener("keydown", handleKeydown);
  document.addEventListener("i18n:ready", applyBoardI18n);
  document.addEventListener("i18n:change", applyBoardI18n);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", syncHash);
  } else {
    syncHash();
  }

  window.addEventListener("hashchange", syncHash);

  if (document.body.dataset.page === "board") {
    const home = document.body.dataset.boardHome || "index.html";
    if (!window.location.hash) {
      window.location.replace(`${home}#board`);
    } else {
      openBoardModal();
    }
  }

  window.boardModal = {
    open: openBoardModal,
    close: closeBoardModal,
  };
})();
