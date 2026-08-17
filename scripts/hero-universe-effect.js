(function () {
  "use strict";

  const LINE_SRC = "images/effects/universe/line.svg";
  const SHUTTLE_SRC = "images/effects/universe/space-ship.svg";

  let activeEffect = null;

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function createLineWrap() {
    const wrap = document.createElement("div");
    wrap.className = "hero-anniversary__universe-orbit-wrap";
    wrap.setAttribute("aria-hidden", "true");

    const img = document.createElement("img");
    img.className = "hero-anniversary__universe-orbit";
    img.src = LINE_SRC;
    img.alt = "";
    img.draggable = false;

    wrap.appendChild(img);
    return wrap;
  }

  class UniverseEffect {
    constructor(visualEl, coverEl) {
      this.visualEl = visualEl;
      this.coverEl = coverEl;
      this.running = false;
      this.activeShuttle = null;
      this.timer = 0;
      this.firstLaunch = true;

      this.lineWrap = createLineWrap();

      this.shuttleField = document.createElement("div");
      this.shuttleField.className = "hero-anniversary__universe-shuttle-field";
      this.shuttleField.setAttribute("aria-hidden", "true");

      visualEl.insertBefore(this.lineWrap, coverEl.nextSibling);
      visualEl.appendChild(this.shuttleField);

      this.onVisibilityChange = () => {
        if (document.hidden) this.pause();
        else this.resume();
      };

      document.addEventListener("visibilitychange", this.onVisibilityChange);

      this.running = true;
      if (!prefersReducedMotion()) {
        this.scheduleNext();
      }
    }

    pause() {
      if (this.timer) {
        clearTimeout(this.timer);
        this.timer = 0;
      }
    }

    resume() {
      if (!this.running || prefersReducedMotion() || this.timer) return;
      this.scheduleNext();
    }

    scheduleNext() {
      const delay = this.firstLaunch
        ? 800 + Math.random() * 800
        : 6500 + Math.random() * 4500;
      this.firstLaunch = false;

      this.timer = window.setTimeout(() => {
        this.timer = 0;
        if (!this.running) return;
        this.launchShuttle();
      }, delay);
    }

    launchShuttle() {
      if (this.activeShuttle || !this.shuttleField) return;

      const shuttle = document.createElement("img");
      shuttle.className = "hero-anniversary__universe-shuttle is-flying";
      shuttle.src = SHUTTLE_SRC;
      shuttle.alt = "";
      shuttle.draggable = false;
      shuttle.width = 28;

      this.activeShuttle = shuttle;
      this.shuttleField.appendChild(shuttle);

      shuttle.addEventListener(
        "animationend",
        () => {
          shuttle.remove();
          if (this.activeShuttle === shuttle) {
            this.activeShuttle = null;
          }
          if (this.running && !prefersReducedMotion()) {
            this.scheduleNext();
          }
        },
        { once: true }
      );
    }

    destroy() {
      this.running = false;
      this.pause();
      document.removeEventListener("visibilitychange", this.onVisibilityChange);

      if (this.activeShuttle) {
        this.activeShuttle.remove();
        this.activeShuttle = null;
      }

      this.lineWrap?.remove();
      this.shuttleField?.remove();
      this.lineWrap = null;
      this.shuttleField = null;
    }
  }

  window.heroUniverseEffect = {
    start(visualEl, coverEl) {
      this.stop();
      if (!visualEl || !coverEl) return null;
      activeEffect = new UniverseEffect(visualEl, coverEl);
      return activeEffect;
    },

    stop() {
      if (activeEffect) {
        activeEffect.destroy();
        activeEffect = null;
      }
    },
  };
})();
