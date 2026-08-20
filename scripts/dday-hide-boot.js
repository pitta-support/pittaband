(function () {
  "use strict";

  var KEY = "sf-archive-dday-hide";

  try {
    var stored = localStorage.getItem(KEY);
    if (!stored) return;

    var kst = new Date(Date.now() + 32400000);
    var dateKey =
      kst.getUTCFullYear() +
      "-" +
      String(kst.getUTCMonth() + 1).padStart(2, "0") +
      "-" +
      String(kst.getUTCDate()).padStart(2, "0");

    if (stored !== dateKey) return;

    document.documentElement.classList.add("is-dday-hidden");

    var style = document.createElement("style");
    style.id = "dday-hide-boot";
    style.textContent =
      "html.is-dday-hidden,html.is-dday-hidden body{--dday-h:0px;--site-top-h:var(--header-h)}" +
      "html.is-dday-hidden .dday-bar{display:none!important;height:0!important;padding:0!important;border:none!important}";
    document.head.appendChild(style);
  } catch (_) {
    /* ignore storage / DOM errors */
  }
})();
