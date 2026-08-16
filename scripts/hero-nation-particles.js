(function () {
  "use strict";

  const OVERFLOW_RATIO = 0.15;
  let activeEffect = null;

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function isMobileViewport() {
    return window.matchMedia("(max-width: 768px)").matches;
  }

  function getParticleCount() {
    if (prefersReducedMotion()) return 0;
    return isMobileViewport() ? 24 : 40;
  }

  function getMaxDpr() {
    return isMobileViewport() ? 1.5 : 2;
  }

  class NationParticles {
    constructor(visualEl, coverEl) {
      this.visualEl = visualEl;
      this.coverEl = coverEl;
      this.particleCount = getParticleCount();
      this.particles = [];
      this.rafId = 0;
      this.running = false;

      this.canvas = document.createElement("canvas");
      this.canvas.className = "hero-anniversary__nation-particles";
      this.canvas.setAttribute("aria-hidden", "true");
      visualEl.insertBefore(this.canvas, coverEl.nextSibling);

      this.ctx = this.canvas.getContext("2d", { alpha: true });

      for (let i = 0; i < this.particleCount; i += 1) {
        this.particles.push(new RisingParticle(i));
      }

      this.onResize = () => this.resize();
      this.onVisibilityChange = () => {
        if (document.hidden) this.stopLoop();
        else if (this.isInView()) this.startLoop();
      };

      this.resizeObserver = new ResizeObserver(this.onResize);
      this.resizeObserver.observe(visualEl);

      this.intersectionObserver = new IntersectionObserver(
        (entries) => {
          const visible = entries.some((entry) => entry.isIntersecting);
          if (visible) this.startLoop();
          else this.stopLoop();
        },
        { threshold: 0.08 }
      );
      this.intersectionObserver.observe(visualEl);

      window.addEventListener("resize", this.onResize, { passive: true });
      document.addEventListener("visibilitychange", this.onVisibilityChange);

      this.resize();
      this.scatterParticles();
      this.startLoop();
    }

    isInView() {
      const rect = this.visualEl.getBoundingClientRect();
      return rect.bottom > 0 && rect.top < window.innerHeight;
    }

    getLayout() {
      const rect = this.canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return null;

      const dpr = Math.min(window.devicePixelRatio || 1, getMaxDpr());
      const cssW = this.canvas.width / dpr;
      const cssH = this.canvas.height / dpr;
      const coverH = cssH / (1 + OVERFLOW_RATIO);
      const coverTop = coverH * OVERFLOW_RATIO;

      return {
        width: cssW,
        height: cssH,
        coverTop,
        coverBottom: coverTop + coverH,
        coverCenterY: coverTop + coverH * 0.5,
        endY: 0,
      };
    }

    resize() {
      const rect = this.canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const dpr = Math.min(window.devicePixelRatio || 1, getMaxDpr());
      this.canvas.width = Math.round(rect.width * dpr);
      this.canvas.height = Math.round(rect.height * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.scatterParticles();
    }

    scatterParticles() {
      const layout = this.getLayout();
      if (!layout) return;

      this.particles.forEach((particle) => {
        particle.reset(layout);
        particle.y = layout.endY + Math.random() * layout.coverCenterY;
        particle.alpha = Math.random() * particle.maxAlpha;
      });
    }

    drawFrame() {
      const layout = this.getLayout();
      const dpr = Math.min(window.devicePixelRatio || 1, getMaxDpr());
      const cssW = this.canvas.width / dpr;
      const cssH = this.canvas.height / dpr;

      this.ctx.clearRect(0, 0, cssW, cssH);
      if (!layout) return;

      this.particles.forEach((particle) => {
        particle.update(layout);
        particle.draw(this.ctx);
      });
    }

    startLoop() {
      if (this.running || this.particleCount === 0) return;
      this.running = true;

      const tick = () => {
        if (!this.running) return;
        this.drawFrame();
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
      this.stopLoop();
      window.removeEventListener("resize", this.onResize);
      document.removeEventListener("visibilitychange", this.onVisibilityChange);
      this.resizeObserver.disconnect();
      this.intersectionObserver.disconnect();
      this.canvas.remove();
    }
  }

  class RisingParticle {
    reset(layout) {
      this.x = Math.random() * layout.width;
      this.y = layout.coverCenterY + (Math.random() * 30 - 15);
      this.startY = this.y;
      this.radius = Math.random() * 3 + 1;
      this.vy = -(Math.random() * 0.7 + 0.3);
      this.vx = (Math.random() - 0.5) * 0.08;
      this.alpha = 0;
      this.maxAlpha = Math.random() * 0.75 + 0.2;
      this.endY = layout.endY;
      this.coverTop = layout.coverTop;
    }

    update(layout) {
      this.x += this.vx;
      this.y += this.vy;

      if (this.y > this.startY - 30) {
        const progress = (this.startY - this.y) / 30;
        this.alpha = this.maxAlpha * Math.min(1, Math.max(0, progress));
      } else if (this.y < this.coverTop) {
        const progress = (this.coverTop - this.y) / this.coverTop;
        this.alpha = this.maxAlpha * (1 - Math.min(1, Math.max(0, progress)));
      } else {
        this.alpha = this.maxAlpha;
      }

      if (this.y <= this.endY) {
        this.reset(layout);
      }
    }

    draw(ctx) {
      ctx.beginPath();
      ctx.fillStyle = `rgba(255, 255, 255, ${this.alpha})`;
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  window.heroNationParticles = {
    start(visualEl, coverEl) {
      this.stop();
      if (!visualEl || !coverEl || getParticleCount() === 0) return null;
      activeEffect = new NationParticles(visualEl, coverEl);
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
