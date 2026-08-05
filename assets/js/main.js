/* ============================================================
   1. THEME TOGGLE
   ============================================================ */
(function () {
  "use strict";

  const html = document.documentElement;

  const btn = document.getElementById("btn-theme");
  if (!btn) return;

  btn.addEventListener("click", () => {
    const isDark = html.classList.contains("dark");
    html.classList.remove("dark", "light");
    html.classList.add(isDark ? "light" : "dark");
    try {
      localStorage.setItem("theme", isDark ? "light" : "dark");
    } catch (_) {}
  });
})();

/* ============================================================
   2. DOCK
   ============================================================ */
(function () {
  "use strict";

  const footer = document.getElementById("footer");
  const buttons = Array.from(document.querySelectorAll(".dock-btn"));
  if (!footer || !buttons.length) return;
  class Spring {
    constructor(target, { stiffness = 170, damping = 26, mass = 1 } = {}) {
      this.stiffness = stiffness;
      this.damping = damping;
      this.mass = mass;
      this._value = target;
      this._velocity = 0;
      this._target = target;
      this._raf = null;
      this._listeners = [];
    }

    set(target) {
      this._target = target;
      if (this._raf) return;
      const tick = () => {
        const F = -this.stiffness * (this._value - this._target);
        const D = -this.damping * this._velocity;
        const acc = (F + D) / this.mass;
        this._velocity += acc * (1 / 60);
        this._value += this._velocity * (1 / 60);

        const atRest =
          Math.abs(this._value - this._target) < 0.01 &&
          Math.abs(this._velocity) < 0.01;
        if (atRest) {
          this._value = this._target;
          this._velocity = 0;
          this._raf = null;
        } else {
          this._raf = requestAnimationFrame(tick);
        }
        this._listeners.forEach((fn) => fn(this._value));
      };
      this._raf = requestAnimationFrame(tick);
    }

    onChange(fn) {
      this._listeners.push(fn);
      return this;
    }
  }

  function interpolate(input, output, v) {
    const len = input.length;
    if (v <= input[0]) return output[0];
    if (v >= input[len - 1]) return output[len - 1];
    for (let i = 0; i < len - 1; i++) {
      if (v >= input[i] && v <= input[i + 1]) {
        const t = (v - input[i]) / (input[i + 1] - input[i]);
        return output[i] + t * (output[i + 1] - output[i]);
      }
    }
    return output[len - 1];
  }

  const INPUT_DIST = [-240, -192, -120, 0, 120, 192, 240];
  const OUTPUT_SIZE = [40, 44, 56.56, 80, 56.56, 44, 40];
  let mouseX = null;

  footer.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    mouseX = e.clientX;
    updateSizes();
  });

  footer.addEventListener("pointerleave", () => {
    mouseX = null;
    updateSizes();
  });

  const buttonState = buttons.map((btn) => {
    const sizeSpring = new Spring(40, { stiffness: 500, damping: 40, mass: 1 });
    const bounceSpring = new Spring(0, { stiffness: 250, damping: 19 });

    sizeSpring.onChange((v) => {
      btn.style.width = v + "px";
      btn.style.height = v + "px";
    });
    bounceSpring.onChange((v) => {
      btn.style.top = v + "px";
    });

    btn.addEventListener("mousedown", () => bounceSpring.set(8));
    btn.addEventListener("mouseleave", () => bounceSpring.set(0));
    btn.addEventListener("mouseup", () => {
      bounceSpring.set(window.innerWidth < 700 ? -20 : -40);
      setTimeout(() => bounceSpring.set(0), 300);
    });

    return { btn, sizeSpring, bounceSpring };
  });

  function updateSizes() {
    buttonState.forEach(({ btn, sizeSpring }) => {
      let targetSize = 40;
      if (mouseX !== null) {
        const rect = btn.getBoundingClientRect();
        const center = rect.left + rect.width / 2;
        const dist = mouseX - center;
        targetSize = interpolate(INPUT_DIST, OUTPUT_SIZE, dist);
      }
      sizeSpring.set(targetSize);
    });
  }

  // ── Tooltip ────────────────────────────────────────────────
  const tooltip = document.createElement("div");
  tooltip.className = "dock-tooltip-popup";
  tooltip.style.cssText = `
    position: fixed;
    padding: 4px 8px;
    box-shadow: 0 5px 10px rgba(0,0,0,0.12);
    color: hsl(0 0% 43.5%);
    font-family: inherit;
    font-size: 12px;
    background: white;
    border-radius: 6px;
    border: 1px solid hsl(0 0% 85.8%);
    z-index: 1337;
    pointer-events: none;
    white-space: nowrap;
    opacity: 0;
    transform: translateY(4px);
    transition: opacity 150ms ease, transform 150ms ease;
  `;
  document.body.appendChild(tooltip);

  // Dark mode: swap tooltip bg
  function updateTooltipTheme() {
    const isDark = document.documentElement.classList.contains("dark");
    tooltip.style.background = isDark ? "hsl(0 0% 11%)" : "white";
    tooltip.style.borderColor = isDark ? "hsl(0 0% 24.3%)" : "hsl(0 0% 85.8%)";
    tooltip.style.color = isDark ? "hsl(0 0% 62.8%)" : "hsl(0 0% 43.5%)";
  }

  new MutationObserver(updateTooltipTheme).observe(document.documentElement, {
    attributeFilter: ["class"],
  });

  let tooltipTimeout = null;

  buttons.forEach((btn) => {
    const label = btn.getAttribute("aria-label");
    if (!label) return;

    btn.addEventListener("mouseenter", () => {
      clearTimeout(tooltipTimeout);
      tooltip.textContent = label;
      updateTooltipTheme();
      const rect = btn.getBoundingClientRect();
      const tw = tooltip.offsetWidth || 80;
      tooltip.style.left = rect.left + rect.width / 2 - tw / 2 + "px";
      tooltip.style.top = rect.top - 8 - 28 + "px";

      tooltip.style.opacity = "1";
      tooltip.style.transform = "translateY(0)";

      requestAnimationFrame(() => {
        const tw2 = tooltip.offsetWidth;
        tooltip.style.left = rect.left + rect.width / 2 - tw2 / 2 + "px";
        tooltip.style.top = rect.top - 8 - tooltip.offsetHeight + "px";
      });
    });

    btn.addEventListener("mouseleave", () => {
      tooltipTimeout = setTimeout(() => {
        tooltip.style.opacity = "0";
        tooltip.style.transform = "translateY(4px)";
      }, 60);
    });

    btn.addEventListener("click", () => {
      tooltip.style.opacity = "0";
      tooltip.style.transform = "translateY(4px)";
    });
  });

  buttons.forEach((btn) => {
    const href = btn.dataset.href;
    if (!href) return;
    btn.addEventListener("click", () => {
      if (href.startsWith("http") || href.startsWith("mailto")) {
        window.open(href, "_blank", "noopener,noreferrer");
      } else if (href === "#") {
        // no-op
      } else {
        window.location.href = href;
      }
    });
  });

  const currentPath = window.location.pathname.replace(/\/$/, "") || "/";
  buttons.forEach((btn) => {
    const href = btn.dataset.href;
    if (!href) return;
    const normHref = href.replace(/\/$/, "") || "/";
    if (currentPath === normHref) {
      const dot = btn.querySelector(".dock-indicator");
      if (dot) dot.style.opacity = "1";
    }
  });
})();

(function () {
  "use strict";

  const clockEls = document.querySelectorAll("[data-clock]");
  const headerBar = document.getElementById("header-bar");
  const locationEl = document.querySelector(".header-meta span:last-child");

  // Use the visitor's local timezone detected by the browser
  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  function formatTime() {
    return new Date().toLocaleTimeString([], {
      timeZone: userTimeZone,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  }

  if (clockEls.length) {
    clockEls.forEach((el) => {
      el.textContent = formatTime();
    });
    setInterval(() => {
      clockEls.forEach((el) => {
        el.textContent = formatTime();
      });
    }, 1000);
  }

  // Location is hardcoded — no IP fetch needed
  // locationEl stays as the default "Kigali, Rwanda" set in HTML

  // Fade header bar in after a short delay
  if (headerBar) {
    setTimeout(() => headerBar.classList.add("visible"), 300);
  }
})();

/* ============================================================
   4. CAROUSEL 
   ============================================================ */
(function () {
  "use strict";

  // ── uZ = clamp (mirrors original E.uZ) ───────────────────
  function uZ(v, lo, hi) {
    return Math.min(Math.max(v, lo), hi);
  }

  const track = document.querySelector("[data-carousel]");
  if (!track) return;

  // 8 primary cards, same as original L[] array
  const N_CARDS = 8;
  const CARD_W = 340;
  const CARD_G = 12;
  const TOTAL_W = (CARD_W + CARD_G) * N_CARDS; // 2816

  // ── Shared scroll state — mirrors original [n] useState(0) ──

  const MAX_SCROLL = 5000;
  let scrollN = 0;

  // ── Derived values — exact formulas from original source ──

  function getDerived() {
    const i = scrollN < -250 ? -1 * scrollN - 250 : scrollN;
    const a = uZ(0.2 * i, 0, 250);
    const l = uZ(1 - 0.002 * i, 0, 1);
    const s = 1 - l === 1;
    return { i, a, l, s };
  }

  // ── Carousel track offset — exact original logic ──────────
  let trackOffset = 0;

  function setTrackOffset(v) {
    // Smooth infinite loop: modulo wrap (no jump)
    trackOffset = ((v % TOTAL_W) + TOTAL_W) % TOTAL_W;
    track.style.transform = `translate3d(${-trackOffset}px, 0, 0) translateZ(0)`;
  }

  // ── Main update — called on every scroll/key event ────────
  const noiseWrap = document.querySelector(".noise-canvas-wrap");

  function onScroll() {
    const { i, a, l, s } = getDerived();

    // 1. Letter parallax
    updateLetterParallax(i, a);

    // 2. Track opacity — light mode only (dark handled by CSS)
    const isDark = document.documentElement.classList.contains("dark");
    if (!isDark) {
      if (i > 0) {
        track.style.opacity = String(uZ(0.002 * i, 0.5, 1));
      } else {
        track.style.removeProperty("opacity");
      }
    } else {
      track.style.removeProperty("opacity");
    }

    // 3. Arrow buttons
    document.querySelectorAll("[data-fake-button]").forEach((btn) => {
      if (s) btn.style.removeProperty("opacity");
      else btn.style.setProperty("opacity", "0");
    });

    // 4. Noise canvas — JS fully controls opacity AND blend-mode
    // (no CSS animation, so inline styles are never blocked)
    // l = 1 at rest → fluid fully visible
    // l → 0 as you scroll far → fluid fades out
    // Light mode: color-dodge (brightening shimmer over images)
    // Dark mode:  color-burn  (dark liquid effect over images)
    if (noiseWrap) {
      noiseWrap.style.opacity = String(l);
      noiseWrap.style.mixBlendMode = isDark ? "color-burn" : "color-dodge";
    }
  }

  // ── Wheel — preventDefault stops browser page scroll/navigation ──
  // Cannot be passive since we call preventDefault
  window.addEventListener(
    "wheel",
    (e) => {
      if (window.matchMedia("(max-width: 720px)").matches) return;
      e.preventDefault();
      const delta = e.deltaY + e.deltaX;
      scrollN = uZ(scrollN + delta, -MAX_SCROLL, MAX_SCROLL);
      setTrackOffset(trackOffset + delta);
      onScroll();
    },
    { passive: false },
  );

  // ── Keyboard ──────────────────────────────────────────────
  // Original keyboard speed for parallax: 10 (default), 500 (shift)
  // Track keyboard speed: 250 (hardcoded in carousel callback)
  document.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const dir = e.key === "ArrowRight" ? 1 : -1;
    const nSpeed = e.shiftKey ? 500 : 10;
    const tSpeed = 250;
    scrollN = uZ(scrollN + dir * nSpeed, -MAX_SCROLL, MAX_SCROLL);
    setTrackOffset(trackOffset + dir * tSpeed);
    onScroll();
  });

  // ── Pointer drag on track ─────────────────────────────────
  let isDragging = false,
    dragStartX = 0,
    dragStartO = 0,
    dragStartN = 0;
  let velocity = 0,
    rafId = null;

  track.addEventListener("pointerdown", (e) => {
    isDragging = true;
    dragStartX = e.clientX;
    dragStartO = trackOffset;
    dragStartN = scrollN;
    velocity = 0;
    cancelAnimationFrame(rafId);
    track.setPointerCapture(e.pointerId);
    track.style.cursor = "grabbing";
  });

  track.addEventListener("pointermove", (e) => {
    if (!isDragging) return;
    const dx = dragStartX - e.clientX;
    velocity = dx - (dragStartO - trackOffset);
    const newO = dragStartO + dx;
    const newN = uZ(dragStartN + dx, -MAX_SCROLL, MAX_SCROLL);
    trackOffset = ((newO % TOTAL_W) + TOTAL_W) % TOTAL_W;
    track.style.transform = `translate3d(${-trackOffset}px, 0, 0) translateZ(0)`;
    scrollN = newN;
    onScroll();
  });

  const endDrag = () => {
    if (!isDragging) return;
    isDragging = false;
    track.style.cursor = "";
    const glide = () => {
      if (Math.abs(velocity) < 0.3) return;
      velocity *= 0.93;
      setTrackOffset(trackOffset + velocity);
      scrollN = uZ(scrollN + velocity, -MAX_SCROLL, MAX_SCROLL);
      onScroll();
      rafId = requestAnimationFrame(glide);
    };
    glide();
  };
  track.addEventListener("pointerup", endDrag);
  track.addEventListener("pointercancel", endDrag);

  track.querySelectorAll("a[carousel-item]").forEach((a) => {
    let sx = 0;
    a.addEventListener("mousedown", (e) => {
      sx = e.clientX;
    });
    a.addEventListener("click", (e) => {
      if (Math.abs(e.clientX - sx) > 6) e.preventDefault();
    });
  });

  // ── Video hover ───────────────────────────────────────────
  // Original: onClick + onPointerEnter both call play + blur siblings
  // onPointerLeave: pause, reset blur (currentTime=0 when focus lost via useEffect)
  document.querySelectorAll("[carousel-item]").forEach((card) => {
    const video = card.querySelector("video");

    function activate() {
      if (video) video.play().catch(() => {});
      document.querySelectorAll("[carousel-item]").forEach((c) => {
        if (c !== card) c.style.setProperty("--blur", "2px");
      });
    }

    card.addEventListener("pointerenter", activate);
    card.addEventListener("click", activate);

    card.addEventListener("pointerleave", () => {
      if (video) {
        video.pause();
        video.currentTime = 0;
      }
      document.querySelectorAll("[carousel-item]").forEach((c) => {
        c.style.setProperty("--blur", "0px");
      });
    });
  });

  // ── Fade carousel-inner in (Framer Motion initial:0, animate:1, delay:0.15) ─
  const inner = document.getElementById("carousel-inner");
  if (inner)
    setTimeout(() => {
      inner.style.opacity = "1";
    }, 150);

  // ── SERAPHIN letter parallax — exact original per-letter math extended to 8 ──
  // Original RAUNO: R=+i, A=-i/4, U=+i/5, N=-i/6, O=+i/7
  // Mapped to SERAPHIN: same stagger pattern, 8 letters
  function updateLetterParallax(i, a) {
    const letters = [
      { id: "L1", ySign: +1, yDiv: 1, ds: 0.003 }, // S → R
      { id: "L2", ySign: -1, yDiv: 4, ds: 0.004 }, // E → A
      { id: "L3", ySign: +1, yDiv: 5, ds: 0.005 }, // R → U
      { id: "L4", ySign: -1, yDiv: 6, ds: 0.006 }, // A → N
      { id: "L5", ySign: +1, yDiv: 7, ds: 0.007 }, // P → O
      { id: "L6", ySign: -1, yDiv: 5, ds: 0.004 }, // H
      { id: "L7", ySign: +1, yDiv: 6, ds: 0.005 }, // I
      { id: "L8", ySign: -1, yDiv: 8, ds: 0.003 }, // N
    ];
    letters.forEach(({ id, ySign, yDiv, ds }) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (i === 0) {
        el.style.transform = "";
        el.style.filter = "";
        return;
      }
      const y = ySign * uZ(i / yDiv, 0, 150);
      const s = uZ(1 - ds * i, 0, 1);
      el.style.transform = `translateY(${y}px) scale(${s})`;
      el.style.filter = `blur(${a}px)`;
    });
  }

  // Observe theme changes to re-apply opacity correctly
  new MutationObserver(() => onScroll()).observe(document.documentElement, {
    attributeFilter: ["class"],
  });

  // Fire once on load so noise canvas gets correct initial opacity
  // and arrow buttons get their initial state
  onScroll();
})();

/* ============================================================
   5. WEBGL NOISE CANVAS — fixed viewport, exact original shader
   ============================================================ */
(function () {
  "use strict";

  const canvas = document.getElementById("noise-canvas");
  if (!canvas) return;

  const VERT = `#version 300 es
in vec4 position;
void main(){ gl_Position = position; }`;

  const FRAG = `#version 300 es
precision mediump float;
out vec4 fragColor;
uniform float time;
uniform float width;
uniform float height;
float blendOverlay(float b,float bl){return b<0.5?(2.0*b*bl):(1.0-2.0*(1.0-b)*(1.0-bl));}
vec3 blendOverlay(vec3 b,vec3 bl){return vec3(blendOverlay(b.r,bl.r),blendOverlay(b.g,bl.g),blendOverlay(b.b,bl.b));}
vec3 blendOverlay(vec3 b,vec3 bl,float op){return(blendOverlay(b,bl)*op+b*(1.0-op));}
float random(in vec2 st){return fract(sin(dot(st.xy,vec2(12.9898,78.233)))*43758.5453123);}
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
vec3 fade(vec3 t){return t*t*t*(t*(t*6.0-15.0)+10.0);}
float cnoise(vec3 P){
  vec3 Pi0=floor(P),Pi1=Pi0+vec3(1.0);
  Pi0=mod289(Pi0);Pi1=mod289(Pi1);
  vec3 Pf0=fract(P),Pf1=Pf0-vec3(1.0);
  vec4 ix=vec4(Pi0.x,Pi1.x,Pi0.x,Pi1.x);
  vec4 iy=vec4(Pi0.yy,Pi1.yy);
  vec4 iz0=Pi0.zzzz,iz1=Pi1.zzzz;
  vec4 ixy=permute(permute(ix)+iy);
  vec4 ixy0=permute(ixy+iz0),ixy1=permute(ixy+iz1);
  vec4 gx0=ixy0*(1.0/7.0),gy0=fract(floor(gx0)*(1.0/7.0))-0.5;
  gx0=fract(gx0);
  vec4 gz0=vec4(0.5)-abs(gx0)-abs(gy0),sz0=step(gz0,vec4(0.0));
  gx0-=sz0*(step(0.0,gx0)-0.5);gy0-=sz0*(step(0.0,gy0)-0.5);
  vec4 gx1=ixy1*(1.0/7.0),gy1=fract(floor(gx1)*(1.0/7.0))-0.5;
  gx1=fract(gx1);
  vec4 gz1=vec4(0.5)-abs(gx1)-abs(gy1),sz1=step(gz1,vec4(0.0));
  gx1-=sz1*(step(0.0,gx1)-0.5);gy1-=sz1*(step(0.0,gy1)-0.5);
  vec3 g000=vec3(gx0.x,gy0.x,gz0.x),g100=vec3(gx0.y,gy0.y,gz0.y);
  vec3 g010=vec3(gx0.z,gy0.z,gz0.z),g110=vec3(gx0.w,gy0.w,gz0.w);
  vec3 g001=vec3(gx1.x,gy1.x,gz1.x),g101=vec3(gx1.y,gy1.y,gz1.y);
  vec3 g011=vec3(gx1.z,gy1.z,gz1.z),g111=vec3(gx1.w,gy1.w,gz1.w);
  vec4 norm0=taylorInvSqrt(vec4(dot(g000,g000),dot(g010,g010),dot(g100,g100),dot(g110,g110)));
  g000*=norm0.x;g010*=norm0.y;g100*=norm0.z;g110*=norm0.w;
  vec4 norm1=taylorInvSqrt(vec4(dot(g001,g001),dot(g011,g011),dot(g101,g101),dot(g111,g111)));
  g001*=norm1.x;g011*=norm1.y;g101*=norm1.z;g111*=norm1.w;
  float n000=dot(g000,Pf0),n100=dot(g100,vec3(Pf1.x,Pf0.yz));
  float n010=dot(g010,vec3(Pf0.x,Pf1.y,Pf0.z)),n110=dot(g110,vec3(Pf1.xy,Pf0.z));
  float n001=dot(g001,vec3(Pf0.xy,Pf1.z)),n101=dot(g101,vec3(Pf1.x,Pf0.y,Pf1.z));
  float n011=dot(g011,vec3(Pf0.x,Pf1.yz)),n111=dot(g111,Pf1);
  vec3 fade_xyz=fade(Pf0);
  vec4 n_z=mix(vec4(n000,n100,n010,n110),vec4(n001,n101,n011,n111),fade_xyz.z);
  vec2 n_yz=mix(n_z.xy,n_z.zw,fade_xyz.y);
  return 2.2*mix(n_yz.x,n_yz.y,fade_xyz.x);
}
vec3 palette(in float t,in vec3 a,in vec3 b,in vec3 c,in vec3 d){return a+b*cos(6.4*(c*t+d));}
void main(){
  vec2 res=vec2(width,height);
  vec2 vUv=gl_FragCoord.xy/res.xy;
  vec2 uv=vUv*6.0;
  float t=time*2.0;
  float n=cnoise(vec3(uv.x-t*2.0,uv.y+sin(uv.x+120.0+t)*3.0,t)*0.4);
  vec3 color=palette(n,vec3(0.5,0.29,0.45),vec3(0.5,0.3,0.1),vec3(1.0,1.1,1.1),vec3(0.35,0.25,1.1));
  vec2 st=gl_FragCoord.xy/res.xy;
  float noise=random(st);
  fragColor=vec4(blendOverlay(
    palette(cnoise(vec3(uv.x,uv.y+sin(uv.x+1.15+t)*3.0,t)*0.4),
      vec3(0.45,0.29,0.45),vec3(0.5,0.3,0.1),vec3(1.0,1.1,1.1),vec3(0.38,0.25,1.1)),
    vec3(noise),0.2),1.0);
}`;

  try {
    // Canvas fills the full viewport — matches original exactly
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const gl = canvas.getContext("webgl2");
    if (!gl) return;

    function sh(src, type) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.warn(gl.getShaderInfoLog(s));
        return null;
      }
      return s;
    }

    const prog = gl.createProgram();
    const vs = sh(VERT, gl.VERTEX_SHADER);
    const fs = sh(FRAG, gl.FRAGMENT_SHADER);
    if (!vs || !fs) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, 1, -1, -1, 1, 1, 1, -1]),
      gl.STATIC_DRAW,
    );
    const posLoc = gl.getAttribLocation(prog, "position");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 8, 0);

    const uTime = gl.getUniformLocation(prog, "time");
    const uWidth = gl.getUniformLocation(prog, "width");
    const uHeight = gl.getUniformLocation(prog, "height");
    gl.uniform1f(uWidth, canvas.width);
    gl.uniform1f(uHeight, canvas.height);

    window.addEventListener("resize", () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform1f(uWidth, canvas.width);
      gl.uniform1f(uHeight, canvas.height);
    });

    let elapsed = 0,
      t0 = Date.now();
    (function loop() {
      const now = Date.now();
      elapsed += (now - t0) / 2000;
      t0 = now;
      gl.uniform1f(uTime, elapsed);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      requestAnimationFrame(loop);
    })();
  } catch (e) {}
})();

/* ============================================================
   6. BODY SCROLL LOCK  (home page only)
   ============================================================ */
(function () {
  "use strict";
  // Only lock scroll on the home page — blog/projects need free scroll
  const isBlog    = window.location.pathname.includes("/blog");
  const isProject = window.location.pathname.includes("/projects");
  if (isBlog || isProject) return;

  document.body.style.overflow = "hidden";
  document.body.style.overscrollBehaviorX = "none";
  document.body.style.overscrollBehaviorY = "none";
  document.documentElement.style.overflow = "hidden";
})();

/* ============================================================
   7. BLOG COLUMN SCROLL
   Each column auto-scrolls upward via CSS animation.
   Wheel / touch input nudges a JS offset on top of the animation
   so the user can scroll manually while the auto-scroll continues.
   ============================================================ */
(function () {
  "use strict";

  const columns = Array.from(document.querySelectorAll(".column"));
  if (!columns.length) return;

  // Per-column state
  const state = columns.map((col) => {
    const inner = col.querySelector(".column-inner");
    if (!inner) return null;

    // Read the CSS animation duration so we can match the auto-scroll speed
    const dur = parseFloat(
      getComputedStyle(col).getPropertyValue("--scroll-duration") || "30"
    );

    return {
      col,
      inner,
      dur,           // animation duration in seconds
      offset: 0,     // manual px offset applied via translateY
      velocity: 0,   // momentum after flick
      raf: null,
    };
  }).filter(Boolean);

  if (!state.length) return;

  // ── Helpers ────────────────────────────────────────────────

  function getInnerHeight(s) {
    // column-inner contains original + clone, so half = one full set
    return s.inner.scrollHeight / 2;
  }

  function applyOffset(s) {
    // Clamp to one full set height for seamless wrap
    const h = getInnerHeight(s);
    if (h > 0) s.offset = ((s.offset % h) + h) % h;
    // Stack on top of the CSS keyframe animation via a second transform
    // CSS animation handles the base upward movement; we add manual delta
    s.inner.style.transform = `translateY(${-s.offset}px)`;
  }

  // ── Momentum glide ─────────────────────────────────────────

  function glide(s) {
    if (Math.abs(s.velocity) < 0.2) {
      s.velocity = 0;
      s.raf = null;
      return;
    }
    s.velocity *= 0.92;
    s.offset += s.velocity;
    applyOffset(s);
    s.raf = requestAnimationFrame(() => glide(s));
  }

  // ── Wheel ──────────────────────────────────────────────────
  // Find which column is under the pointer and scroll that one,
  // or scroll all equally if pointer is over the grid area.

  function getTargetStates(clientX) {
    // Find the column under the cursor
    for (const s of state) {
      const rect = s.col.getBoundingClientRect();
      if (clientX >= rect.left && clientX <= rect.right) return [s];
    }
    return state; // fallback: scroll all
  }

  window.addEventListener("wheel", (e) => {
    const grid = document.querySelector(".grid");
    if (!grid) return;
    const rect = grid.getBoundingClientRect();
    // Only intercept wheel when over the grid
    if (
      e.clientY < rect.top || e.clientY > rect.bottom ||
      e.clientX < rect.left || e.clientX > rect.right
    ) return;

    e.preventDefault();

    const delta = e.deltaY || e.deltaX;
    const targets = getTargetStates(e.clientX);

    targets.forEach((s) => {
      cancelAnimationFrame(s.raf);
      s.velocity = 0;
      s.offset += delta;
      applyOffset(s);
    });
  }, { passive: false });

  // ── Touch ──────────────────────────────────────────────────

  let touchY = null;
  let touchTargets = state;

  window.addEventListener("touchstart", (e) => {
    const grid = document.querySelector(".grid");
    if (!grid) return;
    const touch = e.touches[0];
    const rect = grid.getBoundingClientRect();
    if (touch.clientY < rect.top || touch.clientY > rect.bottom) return;
    touchY = touch.clientY;
    touchTargets = getTargetStates(touch.clientX);
    touchTargets.forEach((s) => {
      cancelAnimationFrame(s.raf);
      s.velocity = 0;
    });
  }, { passive: true });

  window.addEventListener("touchmove", (e) => {
    if (touchY === null) return;
    const touch = e.touches[0];
    const dy = touchY - touch.clientY;
    touchY = touch.clientY;
    touchTargets.forEach((s) => {
      s.velocity = dy;
      s.offset += dy;
      applyOffset(s);
    });
    e.preventDefault();
  }, { passive: false });

  window.addEventListener("touchend", () => {
    if (touchY === null) return;
    touchY = null;
    touchTargets.forEach((s) => {
      cancelAnimationFrame(s.raf);
      s.raf = requestAnimationFrame(() => glide(s));
    });
  }, { passive: true });

})();

/* ============================================================
   8. SANITY BLOG GRID — fetch posts & projects, render cards
   ============================================================ */
(function () {
  "use strict";

  // Only runs on the blog page
  const grid = document.getElementById("blog-grid");
  if (!grid) return;

  const PROJECT_ID = "bvxz357b";
  const DATASET    = "production";
  const API_VER    = "2024-01-01";

  // ── Sanity CDN fetch ───────────────────────────────────────
  // Fetches both posts and projects in a single request using
  // GROQ's array concatenation. Returns them merged and sorted
  // by publishedAt descending.
  function sanityFetch(query) {
    const encoded = encodeURIComponent(query);
    const url = `https://${PROJECT_ID}.apicdn.sanity.io/v${API_VER}/data/query/${DATASET}?query=${encoded}`;
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error("Sanity fetch failed: " + r.status);
      return r.json();
    });
  }

  // ── GROQ query ─────────────────────────────────────────────
  // Fetches posts and projects together.
  // aspectRatio: uses manual override if set, otherwise falls back
  //              to the image's natural dimensions from Sanity metadata.
  // imageUrl: uses Sanity's image CDN URL with w=800 for performance.
  // date: formatted as "Month YYYY" for the card subtitle.
  const QUERY = `
    *[_type in ["post","project"]] | order(publishedAt desc) {
      _type,
      title,
      publishedAt,
      "slug": slug.current,
      "url": select(_type == "post" => null, url),
      "imageUrl": coverImage.asset->url + "?w=800&auto=format",
      "imageRatio": coalesce(
        aspectRatio,
        coverImage.asset->metadata.dimensions.aspectRatio
      )
    }
  `;

  // ── Date formatter ─────────────────────────────────────────
  function formatDate(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }

  // ── Arrow SVG ─────────────────────────────────────────────
  var ARROW_SVG =
    '<svg data-arrow width="16px" height="16px" stroke-width="1.5" ' +
    'viewBox="0 0 24 24" fill="none" color="currentColor">' +
    '<path d="M6 12h12.5m0 0l-6-6m6 6l-6 6" stroke="currentColor" ' +
    'stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>';

  var ARROW_SVG_EXT =
    '<svg data-arrow width="16px" height="16px" stroke-width="1.5" ' +
    'viewBox="0 0 24 24" fill="none" color="currentColor" style="transform:rotate(-45deg)">' +
    '<path d="M6 12h12.5m0 0l-6-6m6 6l-6 6" stroke="currentColor" ' +
    'stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>';

  // ── Text class string (shared by all <p> elements) ────────
  var P_BASE = "c-iLbGmI c-iLbGmI-cyRcZm-family-body c-iLbGmI-jIjxDA-size-14 " +
               "c-iLbGmI-bwnKsc-lineHeight-28 c-iLbGmI-cdWBIM-weight-400 " +
               "c-iLbGmI-cOWITQ-color-gray12 ";

  // ── Build one card's inner HTML ────────────────────────────
  // item = { _type, title, publishedAt, slug, url, imageUrl, imageRatio }
  // hasLink = true  → wraps in <a>, shows button
  // hasLink = false → wraps in <div>, no button
  function buildCard(item, hasLink) {
    var ratio   = (item.imageRatio || 1.4).toFixed(5);
    var title   = escapeHtml(item.title || "Untitled");
    var date    = escapeHtml(formatDate(item.publishedAt));
    var imgSrc  = item.imageUrl || "";
    var imgAlt  = title;

    // Determine link href and button label
    var href, btnLabel, isExternal;
    if (item._type === "post") {
      href       = "/blog/" + (item.slug || "#");
      btnLabel   = "Read Post";
      isExternal = false;
    } else {
      href       = item.url || "#";
      btnLabel   = "View Project";
      isExternal = !!item.url;
    }

    // Inner media + overlay row — same for both card types
    // linked cards use iekRYXs-css (has gradient overlay ::after)
    // display cards use ikgVxhC-css (same gradient, no border-radius)
    var mediaClass = hasLink
      ? "c-lesPJm c-lesPJm-iekRYXs-css"
      : "c-lesPJm c-lesPJm-ikgVxhC-css";

    var mediaHtml =
      '<div class="' + mediaClass + '">' +
        '<div class="c-kjYPsQ" style="aspect-ratio:' + ratio + '/1">' +
          (imgSrc
            ? '<img src="' + imgSrc + '" alt="' + imgAlt + '" loading="lazy" />'
            : "") +
        "</div>" +
        '<div class="c-gqwkJN c-gqwkJN-ejCoEP-direction-row c-gqwkJN-jroWjL-align-center ' +
             'c-gqwkJN-knmidH-justify-between c-gqwkJN-kVNAnR-wrap-no-wrap c-gqwkJN-iiIbqbF-css">' +
          '<p class="' + P_BASE + 'c-iLbGmI-ifMJHCC-css">' + title + "</p>" +
          '<p class="' + P_BASE + 'c-iLbGmI-ijLzJmS-css">' + date  + "</p>" +
        "</div>" +
      "</div>";

    if (hasLink) {
      var targetAttr = isExternal ? ' target="_blank" rel="noopener noreferrer"' : "";
      var btnArrow   = isExternal ? ARROW_SVG_EXT : ARROW_SVG;
      return (
        '<a class="c-dcJSMY c-dcJSMY-cEsUQp-interactive-true" href="' + href + '"' + targetAttr + ">" +
          mediaHtml +
          '<div data-fake-button>' + btnLabel + btnArrow + "</div>" +
        "</a>"
      );
    } else {
      return '<div class="c-dcJSMY">' + mediaHtml + "</div>";
    }
  }

  // ── HTML escape ────────────────────────────────────────────
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // ── Distribute items across 3 columns ─────────────────────
  // Round-robin by index so items are spread evenly.
  // Posts get a button; projects get a button only if they have a url,
  // otherwise they show as display-only cards.
  function distributeToColumns(items) {
    var cols = [[], [], []];
    items.forEach(function (item, i) {
      cols[i % 3].push(item);
    });
    return cols;
  }

  // ── Render columns ─────────────────────────────────────────
  function renderColumns(items) {
    var cols = distributeToColumns(items);
    ["col-1-inner", "col-2-inner", "col-3-inner"].forEach(function (id, ci) {
      var inner = document.getElementById(id);
      if (!inner) return;

      var colItems = cols[ci];
      if (!colItems.length) return;

      // Build original cards HTML
      var cardsHtml = colItems.map(function (item) {
        // Posts always get a button.
        // Projects get a button only if they have a live url.
        var hasLink = item._type === "post" || !!item.url;
        return buildCard(item, hasLink);
      }).join("");

      // Duplicate for seamless infinite loop (original + clone)
      inner.innerHTML = cardsHtml + cardsHtml;
    });
  }

  // ── Fetch & render ─────────────────────────────────────────
  sanityFetch(QUERY)
    .then(function (data) {
      var items = (data && data.result) ? data.result : [];
      if (!items.length) {
        // Nothing in Sanity yet — grid stays empty, no visual change
        return;
      }
      renderColumns(items);
    })
    .catch(function (err) {
      console.warn("[blog grid] Sanity fetch error:", err);
    });

})();
