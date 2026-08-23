(function () {
  "use strict";

  let activeCleanup = null;

  function initStars() {
    activeCleanup?.();
    activeCleanup = null;

    const canvas = document.getElementById("hero-custom-stars");
    const container = canvas?.closest(".hero-event__media, .hero__custom--img");
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobileQuery = window.matchMedia("(max-width: 768px)");

    function getMaxStars() {
      if (reducedMotionQuery.matches) return 0;
      return mobileQuery.matches ? 42 : 60;
    }

    function getMaxDpr() {
      return mobileQuery.matches ? 1.5 : 2;
    }

    const stars = [];
    let rafId = 0;
    let running = false;
    let width = 0;
    let height = 0;

    class Star {
      constructor() {
        this.reset(true);
      }

      reset(initial = false) {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.size = Math.random() * 2 + 1;
        this.twinkleSpeed = Math.random() * 0.03 + 0.01;
        this.opacity = initial ? Math.random() : 0.35 + Math.random() * 0.65;
        this.factor = Math.random() > 0.5 ? 1 : -1;
      }

      update() {
        this.opacity += this.twinkleSpeed * this.factor;
        if (this.opacity > 1) {
          this.opacity = 1;
          this.factor = -1;
        } else if (this.opacity < 0.1) {
          this.opacity = 0.1;
          this.factor = 1;
        }
      }

      draw() {
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.fillStyle = "#ffffff";
        ctx.shadowBlur = this.size * 3;
        ctx.shadowColor = "#ffffff";

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();

        if (this.size > 2.3 && this.opacity > 0.6) {
          ctx.strokeStyle = `rgba(255, 255, 255, ${this.opacity - 0.3})`;
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          ctx.moveTo(this.x - this.size * 2.5, this.y);
          ctx.lineTo(this.x + this.size * 2.5, this.y);
          ctx.moveTo(this.x, this.y - this.size * 2.5);
          ctx.lineTo(this.x, this.y + this.size * 2.5);
          ctx.stroke();
        }

        ctx.restore();
      }
    }

    function syncStarCount() {
      const target = getMaxStars();

      while (stars.length < target) {
        stars.push(new Star());
      }

      while (stars.length > target) {
        stars.pop();
      }

      stars.forEach((star) => star.reset(true));
    }

    function resize() {
      const nextWidth = container.clientWidth;
      const nextHeight = container.clientHeight;
      if (!nextWidth || !nextHeight) return;

      width = nextWidth;
      height = nextHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, getMaxDpr());

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stars.forEach((star) => star.reset(true));
    }

    function drawFrame() {
      ctx.clearRect(0, 0, width, height);
      stars.forEach((star) => {
        star.update();
        star.draw();
      });
    }

    function loop() {
      if (!running) return;
      drawFrame();
      rafId = window.requestAnimationFrame(loop);
    }

    function start() {
      if (running || !getMaxStars()) return;
      running = true;
      loop();
    }

    function stop() {
      running = false;
      if (rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
      }
    }

    let visible = true;

    function startIfActive() {
      if (visible && getMaxStars()) start();
    }

    function refreshMotionPreference() {
      syncStarCount();
      if (!getMaxStars()) {
        stop();
        ctx.clearRect(0, 0, width, height);
        canvas.hidden = true;
        return;
      }

      canvas.hidden = false;
      startIfActive();
    }

    function onReducedMotionChange() {
      refreshMotionPreference();
    }

    function onMobileChange() {
      syncStarCount();
      resize();
    }

    function onVisibilityChange() {
      if (document.hidden) stop();
      else startIfActive();
    }

    syncStarCount();
    resize();

    const resizeObserver = new ResizeObserver(() => resize());
    resizeObserver.observe(container);

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        visible = entries.some((entry) => entry.isIntersecting);
        if (visible && getMaxStars()) start();
        else stop();
      },
      { threshold: 0.05 }
    );
    intersectionObserver.observe(container);

    reducedMotionQuery.addEventListener("change", onReducedMotionChange);
    mobileQuery.addEventListener("change", onMobileChange);
    document.addEventListener("visibilitychange", onVisibilityChange);

    refreshMotionPreference();

    activeCleanup = () => {
      stop();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      reducedMotionQuery.removeEventListener("change", onReducedMotionChange);
      mobileQuery.removeEventListener("change", onMobileChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }

  document.addEventListener("hero-event:rendered", initStars);
  document.addEventListener("DOMContentLoaded", initStars);
})();
