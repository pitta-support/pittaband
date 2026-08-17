(function () {
  "use strict";

  let activeAura = null;

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function isMobileViewport() {
    return window.matchMedia("(max-width: 768px)").matches;
  }

  function getParticleCount() {
    if (prefersReducedMotion()) return 0;
    return isMobileViewport() ? 24 : 56;
  }

  function getMaxDpr() {
    return isMobileViewport() ? 1 : 2;
  }

  function getParticleScale() {
    return isMobileViewport() ? 0.78 : 1;
  }

  function getOrbitScale() {
    return isMobileViewport()
      ? { x: 0.54, y: 0.52 }
      : { x: 0.46, y: 0.46 };
  }

  function waitForCover(coverEl) {
    if (coverEl.complete && coverEl.naturalWidth > 0) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      coverEl.addEventListener("load", resolve, { once: true });
      coverEl.addEventListener("error", resolve, { once: true });
    });
  }

  function waitForLayout() {
    return new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });
  }

  class ParadoxAura {
    constructor(visualEl, coverEl) {
      this.visualEl = visualEl;
      this.coverEl = coverEl;
      this.mobile = isMobileViewport();
      this.particleCount = getParticleCount();
      this.particles = [];
      this.rafId = 0;
      this.running = false;
      this.dpr = 1;
      this.cssWidth = 0;
      this.cssHeight = 0;
      this.destroyed = false;

      this.canvas = document.createElement("canvas");
      this.canvas.className = "hero-anniversary__paradox-aura";
      if (this.mobile) {
        this.canvas.classList.add("hero-anniversary__paradox-aura--mobile");
      }
      this.canvas.setAttribute("aria-hidden", "true");
      this.canvas.style.opacity = "0";
      visualEl.insertBefore(this.canvas, coverEl);

      this.ctx = this.canvas.getContext("2d", { alpha: true });

      for (let i = 0; i < this.particleCount; i += 1) {
        this.particles.push(new AuraParticle(i, this.particleCount, this.mobile));
      }

      this.onResize = () => this.resize();
      this.onVisibilityChange = () => {
        if (document.hidden) this.stopLoop();
        else if (this.isInView() && this.isReady) this.startLoop();
      };

      this.resizeObserver = new ResizeObserver(this.onResize);
      this.resizeObserver.observe(visualEl);
      this.resizeObserver.observe(coverEl);

      this.intersectionObserver = new IntersectionObserver(
        (entries) => {
          const visible = entries.some((entry) => entry.isIntersecting);
          if (visible && this.isReady) this.startLoop();
          else this.stopLoop();
        },
        { threshold: 0.08 }
      );
      this.intersectionObserver.observe(visualEl);

      window.addEventListener("resize", this.onResize, { passive: true });
      document.addEventListener("visibilitychange", this.onVisibilityChange);

      this.isReady = false;
      this.boot();
    }

    async boot() {
      await waitForCover(this.coverEl);
      if (this.destroyed) return;

      await waitForLayout();
      if (this.destroyed) return;

      this.resize();
      this.resetParticles();
      this.isReady = true;
      this.canvas.style.opacity = "1";

      if (this.isInView()) {
        this.startLoop();
      }
    }

    isInView() {
      const rect = this.visualEl.getBoundingClientRect();
      return rect.bottom > 0 && rect.top < window.innerHeight;
    }

    getCoverMetrics() {
      const canvasRect = this.canvas.getBoundingClientRect();
      const coverRect = this.coverEl.getBoundingClientRect();
      if (
        !canvasRect.width ||
        !canvasRect.height ||
        !coverRect.width ||
        !coverRect.height
      ) {
        return null;
      }

      const orbit = getOrbitScale();

      return {
        centerX: coverRect.left + coverRect.width / 2 - canvasRect.left,
        centerY: coverRect.top + coverRect.height / 2 - canvasRect.top,
        distanceX: coverRect.width * orbit.x,
        distanceY: coverRect.height * orbit.y,
      };
    }

    resize() {
      const rect = this.canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      this.dpr = Math.min(window.devicePixelRatio || 1, getMaxDpr());
      this.cssWidth = rect.width;
      this.cssHeight = rect.height;
      this.canvas.width = Math.max(1, Math.round(rect.width * this.dpr));
      this.canvas.height = Math.max(1, Math.round(rect.height * this.dpr));
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

      if (this.isReady) {
        this.resetParticles();
      }
    }

    resetParticles() {
      const metrics = this.getCoverMetrics();
      if (!metrics) return;
      const scale = getParticleScale();
      this.particles.forEach((particle) => particle.reset(metrics, scale));
    }

    drawFrame(timestamp) {
      if (!this.isReady) return;

      const metrics = this.getCoverMetrics();
      const { ctx } = this;

      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, this.cssWidth, this.cssHeight);

      if (!metrics) return;

      this.particles.forEach((particle) => {
        particle.update(timestamp, metrics);
        particle.draw(ctx);
      });
    }

    startLoop() {
      if (this.running || this.particleCount === 0 || !this.isReady) return;
      this.running = true;

      const tick = (timestamp) => {
        if (!this.running) return;
        this.drawFrame(timestamp);
        this.rafId = requestAnimationFrame(tick);
      };

      this.rafId = requestAnimationFrame(tick);
    }

    stopLoop() {
      this.running = false;
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = 0;
      }
    }

    destroy() {
      this.destroyed = true;
      this.stopLoop();
      window.removeEventListener("resize", this.onResize);
      document.removeEventListener("visibilitychange", this.onVisibilityChange);
      this.resizeObserver.disconnect();
      this.intersectionObserver.disconnect();
      this.canvas.remove();
    }
  }

  class AuraParticle {
    constructor(index, total, mobile = false) {
      this.index = index;
      this.total = total;
      this.mobile = mobile;
      this.timeOffset = Math.random() * 5000;
      this.scale = 1;
      this.reset(null, 1);
    }

    reset(metrics, scale = 1) {
      this.scale = scale;

      if (!metrics) {
        this.angle = (this.index / this.total) * Math.PI * 2;
        return;
      }

      this.angle = (this.index / this.total) * Math.PI * 2;
      this.baseX = metrics.centerX + Math.cos(this.angle) * metrics.distanceX;
      this.baseY = metrics.centerY + Math.sin(this.angle) * metrics.distanceY;
      this.baseRadiusX = (Math.random() * (this.mobile ? 42 : 55) + (this.mobile ? 46 : 55)) * scale;
      this.baseRadiusY = (Math.random() * (this.mobile ? 16 : 20) + (this.mobile ? 14 : 12)) * scale;
      this.speed = Math.random() * 0.0015 + 0.001;
      this.wobbleX = (this.mobile ? 3 : 3.5) * scale;
      this.wobbleY = (this.mobile ? 3 : 3.5) * scale;
      this.pulseX = (this.mobile ? 18 : 25) * scale;
      this.pulseY = (this.mobile ? 6 : 7) * scale;

      const alphaBoost = this.mobile ? 1.05 : 1;

      if (this.index % 2 === 0) {
        this.color = { r: 255, g: 0, b: 51 };
        this.maxAlpha = (Math.random() * 0.26 + 0.42) * alphaBoost;
      } else {
        this.color = { r: 0, g: 240, b: 255 };
        this.maxAlpha = (Math.random() * 0.24 + 0.38) * alphaBoost;
      }
    }

    update(time, metrics) {
      if (!this.baseX) this.reset(metrics, this.scale);
      const t = time * this.speed + this.timeOffset;

      this.x = this.baseX + Math.sin(t * 0.3) * this.wobbleX;
      this.y = this.baseY + Math.cos(t * 0.2) * this.wobbleY;
      this.radiusX = this.baseRadiusX + Math.sin(t) * this.pulseX;
      this.radiusY = this.baseRadiusY + Math.cos(t * 0.8) * this.pulseY;
      this.alpha = this.maxAlpha;
    }

    draw(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);

      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radiusX);
      const { r, g, b } = this.color;
      gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${this.alpha})`);
      gradient.addColorStop(0.35, `rgba(${r}, ${g}, ${b}, ${this.alpha * 0.72})`);
      gradient.addColorStop(0.65, `rgba(${r}, ${g}, ${b}, ${this.alpha * 0.18})`);
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

      ctx.beginPath();
      ctx.globalCompositeOperation = this.mobile ? "lighter" : "screen";
      ctx.fillStyle = gradient;
      ctx.ellipse(0, 0, this.radiusX, this.radiusY, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  window.heroParadoxAura = {
    start(visualEl, coverEl) {
      this.stop();
      if (!visualEl || !coverEl || getParticleCount() === 0) return null;
      activeAura = new ParadoxAura(visualEl, coverEl);
      return activeAura;
    },

    stop() {
      if (activeAura) {
        activeAura.destroy();
        activeAura = null;
      }
    },
  };
})();
