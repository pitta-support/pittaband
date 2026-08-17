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
    return isMobileViewport() ? 1.25 : 2;
  }

  function getParticleScale() {
    return isMobileViewport() ? 0.58 : 1;
  }

  class ParadoxAura {
    constructor(visualEl, coverEl) {
      this.visualEl = visualEl;
      this.coverEl = coverEl;
      this.particleCount = getParticleCount();
      this.particles = [];
      this.rafId = 0;
      this.running = false;
      this.dpr = 1;
      this.cssWidth = 0;
      this.cssHeight = 0;

      this.canvas = document.createElement("canvas");
      this.canvas.className = "hero-anniversary__paradox-aura";
      this.canvas.setAttribute("aria-hidden", "true");
      visualEl.insertBefore(this.canvas, coverEl);

      this.ctx = this.canvas.getContext("2d", { alpha: true });

      for (let i = 0; i < this.particleCount; i += 1) {
        this.particles.push(new AuraParticle(i, this.particleCount));
      }

      this.onResize = () => this.resize();
      this.onVisibilityChange = () => {
        if (document.hidden) this.stopLoop();
        else if (this.isInView()) this.startLoop();
      };

      this.resizeObserver = new ResizeObserver(this.onResize);
      this.resizeObserver.observe(visualEl);
      this.resizeObserver.observe(coverEl);

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
      this.resetParticles();
      this.startLoop();
    }

    isInView() {
      const rect = this.visualEl.getBoundingClientRect();
      return rect.bottom > 0 && rect.top < window.innerHeight;
    }

    getCoverMetrics() {
      const canvasRect = this.canvas.getBoundingClientRect();
      if (!canvasRect.width || !canvasRect.height) {
        return null;
      }

      const coverRect = this.coverEl.getBoundingClientRect();

      return {
        centerX: coverRect.left + coverRect.width / 2 - canvasRect.left,
        centerY: coverRect.top + coverRect.height / 2 - canvasRect.top,
        distanceX: coverRect.width * 0.46,
        distanceY: coverRect.height * 0.46,
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
      this.resetParticles();
    }

    resetParticles() {
      const metrics = this.getCoverMetrics();
      if (!metrics) return;
      const scale = getParticleScale();
      this.particles.forEach((particle) => particle.reset(metrics, scale));
    }

    drawFrame(timestamp) {
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
      if (this.running || this.particleCount === 0) return;
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
      this.stopLoop();
      window.removeEventListener("resize", this.onResize);
      document.removeEventListener("visibilitychange", this.onVisibilityChange);
      this.resizeObserver.disconnect();
      this.intersectionObserver.disconnect();
      this.canvas.remove();
    }
  }

  class AuraParticle {
    constructor(index, total) {
      this.index = index;
      this.total = total;
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
      this.baseRadiusX = (Math.random() * 55 + 55) * scale;
      this.baseRadiusY = (Math.random() * 20 + 12) * scale;
      this.speed = Math.random() * 0.0015 + 0.001;
      this.wobbleX = 3.5 * scale;
      this.wobbleY = 3.5 * scale;
      this.pulseX = 25 * scale;
      this.pulseY = 7 * scale;

      if (this.index % 2 === 0) {
        this.color = { r: 255, g: 0, b: 51 };
        this.maxAlpha = (Math.random() * 0.35 + 0.45) * (scale < 1 ? 1.08 : 1);
      } else {
        this.color = { r: 0, g: 240, b: 255 };
        this.maxAlpha = (Math.random() * 0.3 + 0.4) * (scale < 1 ? 1.08 : 1);
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
      gradient.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, ${this.alpha * 0.8})`);
      gradient.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, ${this.alpha * 0.2})`);
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

      ctx.beginPath();
      ctx.globalCompositeOperation = "screen";
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
