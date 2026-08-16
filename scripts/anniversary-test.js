(function () {
  "use strict";

  const KEY = "sf-archive-anniversary-test";

  const ALIASES = {
    nation: "the-nation",
    shadow: "deep-shadow",
  };

  function parse(raw) {
    const value = raw?.trim().toLowerCase();
    return value && value !== "1" ? value : "dandelion";
  }

  function fromQuery() {
    const params = new URLSearchParams(location.search);
    if (!params.has("anniversaryTest")) return null;
    return parse(params.get("anniversaryTest"));
  }

  function fromHash() {
    const hash = location.hash.replace(/^#/, "");
    if (!hash.startsWith("anniversaryTest=")) return null;
    const raw = hash.slice("anniversaryTest=".length).split("&")[0];
    try {
      return parse(decodeURIComponent(raw));
    } catch {
      return parse(raw);
    }
  }

  function fromHistoryState() {
    const id = history.state?.anniversaryTest;
    return id ? parse(id) : null;
  }

  function fromStorage() {
    try {
      return sessionStorage.getItem(KEY);
    } catch {
      return null;
    }
  }

  function store(id) {
    if (!id) return;
    window.__SF_ANNIVERSARY_TEST__ = id;
    try {
      sessionStorage.setItem(KEY, id);
    } catch {
      /* ignore storage errors */
    }
  }

  function read() {
    return (
      fromQuery() ||
      fromHash() ||
      fromHistoryState() ||
      window.__SF_ANNIVERSARY_TEST__ ||
      fromStorage()
    );
  }

  function capture() {
    const id = fromQuery() || fromHash() || fromHistoryState();
    if (id) {
      store(id);
      return id;
    }
    return read();
  }

  function resolve(id) {
    return ALIASES[id] || id;
  }

  function syncUrl(id = read()) {
    if (!id) return;
    store(id);

    const params = new URLSearchParams(location.search);
    params.set("anniversaryTest", id);
    const qs = params.toString();

    const hashBody = location.hash.replace(/^#/, "");
    const hash =
      hashBody && !hashBody.startsWith("anniversaryTest=")
        ? location.hash
        : `#anniversaryTest=${encodeURIComponent(id)}`;

    history.replaceState(
      { ...(history.state || {}), anniversaryTest: id },
      "",
      `${location.pathname}${qs ? `?${qs}` : ""}${hash}`
    );
  }

  window.SFAnniversaryTest = {
    KEY,
    ALIASES,
    parse,
    read,
    capture,
    store,
    resolve,
    syncUrl,
    fromQuery,
    fromHash,
  };

  capture();
})();
