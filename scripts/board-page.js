(function () {
  "use strict";

  const form = document.getElementById("board-form");
  const titleInput = document.getElementById("board-title");
  const contentInput = document.getElementById("board-content");
  const submitBtn = document.getElementById("board-submit");
  const accessKey = window.BOARD_CONFIG?.accessKey?.trim() || "";

  function t(key) {
    return window.i18n ? window.i18n.t(key) : key;
  }

  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

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
      alert(t("pages.board.alertSuccess"));
    } catch {
      alert(t("pages.board.alertFail"));
    } finally {
      submitBtn.disabled = false;
    }
  });
})();
