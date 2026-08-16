(function () {
  "use strict";

  let activeEffect = null;

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function isMobileViewport() {
    return window.matchMedia("(max-width: 768px)").matches;
  }

  function getParticleCount() {
    if (prefersReducedMotion()) return 0;
    return isMobileViewport() ? 32 : 45;
  }

  function getMaxDpr() {
    return isMobileViewport() ? 1.5 : 2;
  }

  class ShadowFragments {
    constructor(visualEl, coverEl) {
      this.visualEl = visualEl;
      this.coverEl = coverEl;
      this.particleCount = getParticleCount();
      this.particles = [];
      this.rafId = 0;
      this.running = false;

      this.backCanvas = this.createCanvas("hero-anniversary__shadow-fragments--back");
      this.frontCanvas = this.createCanvas("hero-anniversary__shadow-fragments--front");

      visualEl.insertBefore(this.backCanvas, coverEl);
      visualEl.insertBefore(this.frontCanvas, coverEl.nextSibling);

      this.backCtx = this.backCanvas.getContext("2d", { alpha: true });
      this.frontCtx = this.frontCanvas.getContext("2d", { alpha: true });

      for (let i = 0; i < this.particleCount; i += 1) {
        this.particles.push(new FragmentParticle());
        this.particles[i].alpha = Math.random();
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

      this.onCoverReady = () => this.resetParticles(true);
      if (!coverEl.complete || coverEl.naturalWidth === 0) {
        coverEl.addEventListener("load", this.onCoverReady, { once: true });
      }

      this.resize();
      this.resetParticles(true);
      this.startLoop();
      requestAnimationFrame(() => {
        this.resetParticles(true);
        this.drawFrame();
      });
    }

    createCanvas(className) {
      const canvas = document.createElement("canvas");
      canvas.className = `hero-anniversary__shadow-fragments ${className}`;
      canvas.setAttribute("aria-hidden", "true");
      return canvas;
    }

    isInView() {
      const rect = this.visualEl.getBoundingClientRect();
      return rect.bottom > 0 && rect.top < window.innerHeight;
    }

    getCssSize(canvas) {
      const dpr = Math.min(window.devicePixelRatio || 1, getMaxDpr());
      return {
        width: canvas.width / dpr,
        height: canvas.height / dpr,
        dpr,
      };
    }

    getCoverMetrics() {
      const canvasRect = this.backCanvas.getBoundingClientRect();
      if (!canvasRect.width || !canvasRect.height) return null;

      const { width, height } = this.getCssSize(this.backCanvas);
      const coverRect = this.coverEl.getBoundingClientRect();
      const scaleX = width / canvasRect.width;
      const scaleY = height / canvasRect.height;

      if (!coverRect.width || !coverRect.height) {
        const coverSize = Math.min(width, height) * 0.78;
        return {
          centerX: width / 2,
          centerY: height / 2,
          coverRadius: coverSize / 2,
          spawnRadius: Math.max(coverSize / 2 - 18, coverSize * 0.18),
        };
      }

      const centerX = (coverRect.left + coverRect.width / 2 - canvasRect.left) * scaleX;
      const centerY = (coverRect.top + coverRect.height / 2 - canvasRect.top) * scaleY;
      const coverSize = Math.min(coverRect.width, coverRect.height) * Math.min(scaleX, scaleY);

      return {
        centerX,
        centerY,
        coverRadius: coverSize / 2,
        spawnRadius: Math.max(coverSize / 2 - 18, coverSize * 0.18),
      };
    }

    resizeCanvas(canvas, ctx) {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const dpr = Math.min(window.devicePixelRatio || 1, getMaxDpr());
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resize() {
      this.resizeCanvas(this.backCanvas, this.backCtx);
      this.resizeCanvas(this.frontCanvas, this.frontCtx);
      this.resetParticles();
    }

    resetParticles(scatter = false) {
      const metrics = this.getCoverMetrics();
      if (!metrics) return;
      this.particles.forEach((particle) => {
        particle.reset(metrics, scatter);
      });
    }

    clearCanvas(canvas, ctx) {
      const { width, height } = this.getCssSize(canvas);
      ctx.clearRect(0, 0, width, height);
    }

    drawFrame() {
      const metrics = this.getCoverMetrics();
      this.clearCanvas(this.backCanvas, this.backCtx);
      this.clearCanvas(this.frontCanvas, this.frontCtx);
      if (!metrics) return;

      this.particles.forEach((particle) => {
        if (particle.alpha > 0.5) {
          particle.draw(this.backCtx);
        }
      });

      this.particles.forEach((particle) => {
        particle.update(metrics);
        if (particle.alpha <= 0.5) {
          particle.draw(this.frontCtx);
        }
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
      if (this.onCoverReady) {
        this.coverEl.removeEventListener("load", this.onCoverReady);
      }
      this.resizeObserver.disconnect();
      this.intersectionObserver.disconnect();
      this.backCanvas.remove();
      this.frontCanvas.remove();
    }
  }

  class FragmentParticle {
    reset(metrics, scatter = false) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * metrics.spawnRadius;

      this.x = metrics.centerX + Math.cos(angle) * distance;
      this.y = metrics.centerY + Math.sin(angle) * distance;

      const speed = Math.random() * 1.2 + 0.4;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;

      this.size = Math.random() * 10 + 4;
      this.rotation = Math.random() * Math.PI * 2;
      this.rotationSpeed = (Math.random() - 0.5) * 0.04;
      this.alpha = 1;
      this.fadeSpeed = Math.random() * 0.008 + 0.004;

      if (Math.random() < 0.3) {
        const darkVal = Math.floor(Math.random() * 10);
        this.color = `${darkVal}, ${darkVal}, ${darkVal}`;
      } else {
        const lightVal = Math.floor(Math.random() * 30) + 55;
        this.color = `${lightVal - 10}, ${lightVal}, ${lightVal + 15}`;
      }

      if (scatter) {
        this.alpha = Math.random() * 0.75 + 0.25;
        const advance = Math.random() * 36 + 4;
        this.x += this.vx * advance;
        this.y += this.vy * advance;
      }
    }

    update(metrics) {
      this.x += this.vx;
      this.y += this.vy;
      this.rotation += this.rotationSpeed;
      this.alpha -= this.fadeSpeed;

      if (this.alpha <= 0) {
        this.reset(metrics);
      }
    }

    draw(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
      ctx.fillStyle = `rgba(${this.color}, ${this.alpha})`;
      ctx.shadowColor = "rgba(40, 53, 64, 0.4)";
      ctx.shadowBlur = 6;
      ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
      ctx.restore();
    }
  }

  window.heroShadowFragments = {
    start(visualEl, coverEl) {
      this.stop();
      if (!visualEl || !coverEl || getParticleCount() === 0) return null;
      activeEffect = new ShadowFragments(visualEl, coverEl);
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
