(() => {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";

  const random = (min, max) => Math.random() * (max - min) + min;
  const randomInt = (min, max) => Math.floor(random(min, max + 1));

  function setFillWhite(element) {
    element.removeAttribute("stroke");
    element.setAttribute("fill", "#fff");

    element.querySelectorAll("*").forEach((child) => {
      child.removeAttribute("stroke");
      child.setAttribute("fill", "#fff");
    });
  }

  function createMask(svg, fillGroup, id, x, y, width, height) {
    const mask = document.createElementNS(SVG_NS, "mask");

    mask.setAttribute("id", id);
    mask.setAttribute("maskUnits", "userSpaceOnUse");
    mask.setAttribute("maskContentUnits", "userSpaceOnUse");
    mask.setAttribute("x", x);
    mask.setAttribute("y", y);
    mask.setAttribute("width", width);
    mask.setAttribute("height", height);

    const black = document.createElementNS(SVG_NS, "rect");
    black.setAttribute("x", x);
    black.setAttribute("y", y);
    black.setAttribute("width", width);
    black.setAttribute("height", height);
    black.setAttribute("fill", "#000");
    mask.appendChild(black);

    const silhouette = fillGroup.cloneNode(true);
    silhouette.removeAttribute("class");
    setFillWhite(silhouette);
    mask.appendChild(silhouette);

    return mask;
  }

  function createNoiseFilter(defs, filterId) {
    const filter = document.createElementNS(SVG_NS, "filter");
    filter.setAttribute("id", filterId);
    filter.setAttribute("x", "-20%");
    filter.setAttribute("y", "-20%");
    filter.setAttribute("width", "140%");
    filter.setAttribute("height", "140%");
    filter.setAttribute("color-interpolation-filters", "sRGB");

    const turbulence = document.createElementNS(SVG_NS, "feTurbulence");
    turbulence.setAttribute("type", "fractalNoise");
    turbulence.setAttribute("baseFrequency", "1.12");
    turbulence.setAttribute("numOctaves", "4");
    turbulence.setAttribute("seed", randomInt(1, 999));
    turbulence.setAttribute("stitchTiles", "stitch");

    const matrix = document.createElementNS(SVG_NS, "feColorMatrix");
    matrix.setAttribute("type", "matrix");
    matrix.setAttribute(
      "values",
      "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.85 0"
    );

    filter.appendChild(turbulence);
    filter.appendChild(matrix);
    defs.appendChild(filter);

    return filterId;
  }

  function createLine(x, y, width, thickness, opacity, className) {
    const line = document.createElementNS(SVG_NS, "rect");
    line.setAttribute("class", className);
    line.setAttribute("x", x);
    line.setAttribute("y", y);
    line.setAttribute("width", width);
    line.setAttribute("height", thickness);
    line.setAttribute("opacity", opacity);
    return line;
  }

  function createPattern(x, y, width, height) {
    const fragment = document.createDocumentFragment();
    let cursor = y;

    while (cursor < y + height) {
      const gap = randomInt(2, 9);
      const thickness = randomInt(1, 4);
      const opacity = random(0.16, 0.62);

      cursor += gap;
      if (cursor >= y + height) break;

      const xJitter = random(-width * 0.035, width * 0.035);
      const widthJitter = random(1.02, 1.12);

      fragment.appendChild(
        createLine(
          x + xJitter,
          cursor,
          width * widthJitter,
          thickness,
          opacity,
          "member-hologram__line"
        )
      );

      cursor += thickness;
    }

    return fragment;
  }

  function createHitArea(svg, fillGroup) {
    if (svg.querySelector(".member-svg__hit")) return;

    const hitGroup = fillGroup.cloneNode(true);
    hitGroup.setAttribute("class", "member-svg__hit");
    hitGroup.setAttribute("fill", "transparent");
    hitGroup.setAttribute("stroke", "none");
    hitGroup.setAttribute("pointer-events", "all");
    hitGroup.setAttribute("aria-hidden", "true");

    hitGroup.querySelectorAll("*").forEach((child) => {
      child.removeAttribute("stroke");
      child.setAttribute("fill", "transparent");
      child.setAttribute("pointer-events", "all");
    });

    svg.appendChild(hitGroup);
  }

  function createHologram(svg) {
    if (svg.dataset.holoReady === "true") return;

    const fillGroup = svg.querySelector(".member-svg__fill");
    if (!fillGroup) return;

    createHitArea(svg, fillGroup);

    const viewBox = svg.viewBox.baseVal;
    const { x, y, width, height } = viewBox;

    if (!width || !height) return;

    const unique = Math.random().toString(36).slice(2);
    const maskId = `pitta-member-mask-${unique}`;
    const filterId = `pitta-noise-filter-${unique}`;

    let defs = svg.querySelector("defs");
    if (!defs) {
      defs = document.createElementNS(SVG_NS, "defs");
      svg.insertBefore(defs, svg.firstChild);
    }

    const mask = createMask(svg, fillGroup, maskId, x, y, width, height);
    mask.setAttribute("data-pitta-mask", "true");
    defs.appendChild(mask);
    createNoiseFilter(defs, filterId);

    const hologram = document.createElementNS(SVG_NS, "g");
    hologram.setAttribute("class", "member-hologram");
    hologram.setAttribute("mask", `url(#${maskId})`);
    hologram.style.setProperty("--holo-distance", `-${height}px`);

    const base = document.createElementNS(SVG_NS, "rect");
    base.setAttribute("class", "member-hologram__base");
    base.setAttribute("x", x);
    base.setAttribute("y", y);
    base.setAttribute("width", width);
    base.setAttribute("height", height);
    hologram.appendChild(base);

    const lines = document.createElementNS(SVG_NS, "g");
    lines.setAttribute("class", "member-hologram__lines");
    lines.appendChild(createPattern(x - width * 0.08, y, width * 1.16, height));

    const secondLines = document.createElementNS(SVG_NS, "g");
    secondLines.setAttribute("transform", `translate(0 ${height})`);
    lines.querySelectorAll(".member-hologram__line").forEach((line) => {
      secondLines.appendChild(line.cloneNode(true));
    });
    lines.appendChild(secondLines);
    hologram.appendChild(lines);

    const noise = document.createElementNS(SVG_NS, "rect");
    noise.setAttribute("class", "member-hologram__noise");
    noise.setAttribute("x", x);
    noise.setAttribute("y", y);
    noise.setAttribute("width", width);
    noise.setAttribute("height", height);
    noise.setAttribute("fill", "#fff");
    noise.setAttribute("filter", `url(#${filterId})`);
    hologram.appendChild(noise);

    svg.appendChild(hologram);
    svg.dataset.holoReady = "true";
  }

  function getOutlineMetrics(stage) {
    const styles = getComputedStyle(stage);
    return {
      strokePx: parseFloat(styles.getPropertyValue("--outline-stroke-px")) || 2,
      dashPx: parseFloat(styles.getPropertyValue("--outline-dash-px")) || 6,
      gapPx: parseFloat(styles.getPropertyValue("--outline-gap-px")) || 6,
    };
  }

  function syncOutlineDash(root) {
    const stage = root?.classList?.contains("band-stage")
      ? root
      : root?.querySelector?.(".band-stage");
    if (!stage) return;

    const { strokePx, dashPx, gapPx } = getOutlineMetrics(stage);

    stage.querySelectorAll(".member-svg").forEach((svg) => {
      const vb = svg.viewBox.baseVal;
      if (!vb?.width) return;

      const rect = svg.getBoundingClientRect();
      if (!rect.width) return;

      const scale = rect.width / vb.width;
      if (scale <= 0) return;

      const stroke = strokePx / scale;
      const dash = dashPx / scale;
      const gap = gapPx / scale;

      svg.querySelectorAll(".member-svg__outline path").forEach((path) => {
        path.style.strokeWidth = String(stroke);
        path.style.strokeDasharray = `${dash} ${gap}`;
      });
    });
  }

  function scheduleOutlineDashSync(root) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => syncOutlineDash(root));
    });
  }

  let outlineDashResizeTimer;
  let outlineDashResizeBound = false;

  function bindOutlineDashSync(stage) {
    scheduleOutlineDashSync(stage);
    setTimeout(() => syncOutlineDash(stage), 1200);

    if (!outlineDashResizeBound) {
      outlineDashResizeBound = true;
      window.addEventListener("resize", () => {
        clearTimeout(outlineDashResizeTimer);
        outlineDashResizeTimer = setTimeout(() => {
          document
            .querySelectorAll(".band-stage[data-about-figure]")
            .forEach(scheduleOutlineDashSync);
        }, 100);
      });
    }

    if (stage.dataset.outlineDashBound === "true") return;
    stage.dataset.outlineDashBound = "true";

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => {
        scheduleOutlineDashSync(stage);
      });
      observer.observe(stage);
    }
  }

  function initBandStage(root) {
    if (!root) return;

    const stage = root.classList?.contains("band-stage")
      ? root
      : root.querySelector(".band-stage");

    root.querySelectorAll(".band-member .member-svg").forEach(createHologram);

    if (stage) {
      scheduleOutlineDashSync(stage);
      bindOutlineDashSync(stage);
    }

    if (typeof window.syncAboutOverlayLayout === "function") {
      window.syncAboutOverlayLayout();
    }
  }

  window.initBandStage = initBandStage;
})();
