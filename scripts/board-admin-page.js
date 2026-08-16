(function () {
  "use strict";

  const STORAGE_KEY = "board-admin-key";
  const loginSection = document.getElementById("board-admin-login");
  const listSection = document.getElementById("board-admin-list");
  const loginForm = document.getElementById("board-admin-login-form");
  const passwordInput = document.getElementById("board-admin-password");
  const logoutBtn = document.getElementById("board-admin-logout");
  const postsEl = document.getElementById("board-admin-posts");
  const emptyEl = document.getElementById("board-admin-empty");
  const errorEl = document.getElementById("board-admin-error");

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatDate(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso || "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const h = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${y}.${m}.${day} ${h}:${min}`;
  }

  function showError(message) {
    if (!errorEl) return;
    errorEl.textContent = message;
    errorEl.hidden = !message;
  }

  function setAuthed(authed) {
    loginSection.hidden = authed;
    listSection.hidden = !authed;
    if (!authed) {
      sessionStorage.removeItem(STORAGE_KEY);
      if (passwordInput) passwordInput.value = "";
    }
  }

  async function loadPosts(key) {
    showError("");
    const res = await fetch("/api/board/posts", {
      headers: { "X-Board-Admin-Key": key },
    });

    if (res.status === 401) {
      setAuthed(false);
      showError("비밀번호가 올바르지 않습니다.");
      return;
    }

    if (!res.ok) {
      showError("글 목록을 불러오지 못했습니다.");
      return;
    }

    const data = await res.json();
    const posts = data.posts || [];

    if (!posts.length) {
      postsEl.innerHTML = "";
      emptyEl.hidden = false;
      return;
    }

    emptyEl.hidden = true;
    postsEl.innerHTML = posts
      .map(
        (post) => `
        <article class="board-admin-post">
          <header class="board-admin-post__head">
            <h2 class="board-admin-post__title">${escapeHtml(post.title)}</h2>
            <time class="board-admin-post__date" datetime="${escapeHtml(post.createdAt)}">${escapeHtml(formatDate(post.createdAt))}</time>
          </header>
          <div class="board-admin-post__body">${escapeHtml(post.content).replace(/\n/g, "<br>")}</div>
        </article>`
      )
      .join("");
  }

  loginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const key = passwordInput?.value || "";
    if (!key) return;

    showError("");

    try {
      const res = await fetch("/api/board/posts", {
        headers: { "X-Board-Admin-Key": key },
      });

      if (res.status === 401) {
        setAuthed(false);
        showError("비밀번호가 올바르지 않습니다.");
        return;
      }

      if (!res.ok) {
        showError("글 목록을 불러오지 못했습니다.");
        return;
      }

      sessionStorage.setItem(STORAGE_KEY, key);
      setAuthed(true);

      const data = await res.json();
      const posts = data.posts || [];

      if (!posts.length) {
        postsEl.innerHTML = "";
        emptyEl.hidden = false;
        return;
      }

      emptyEl.hidden = true;
      postsEl.innerHTML = posts
        .map(
          (post) => `
        <article class="board-admin-post">
          <header class="board-admin-post__head">
            <h2 class="board-admin-post__title">${escapeHtml(post.title)}</h2>
            <time class="board-admin-post__date" datetime="${escapeHtml(post.createdAt)}">${escapeHtml(formatDate(post.createdAt))}</time>
          </header>
          <div class="board-admin-post__body">${escapeHtml(post.content).replace(/\n/g, "<br>")}</div>
        </article>`
        )
        .join("");
    } catch {
      showError("글 목록을 불러오지 못했습니다.");
    }
  });

  logoutBtn?.addEventListener("click", () => {
    setAuthed(false);
    showError("");
  });

  const savedKey = sessionStorage.getItem(STORAGE_KEY);
  if (savedKey) {
    setAuthed(true);
    loadPosts(savedKey);
  } else {
    setAuthed(false);
  }
})();
