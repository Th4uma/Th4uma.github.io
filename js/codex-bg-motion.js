/*
 * Codex 来源：Thaumazein's Shelter 背景细竖条微动特效。
 * 合并位置：复制到 static/js/codex-bg-motion.js，然后在 footer/custom.html 中引用一次。
 *
 * 设计原则：
 * - 模板只保留一行脚本引用，避免把 footer/custom.html 写成屎山。
 * - 只复制背景图切片，不加亮、不调色、不使用 mix-blend-mode。
 * - 竖条在小鱼下面、星星上面。
 */
(() => {
  "use strict";

  if (window.__codexBgMotionStop) {
    return;
  }

  const CFG = {
    bg: "/background/bg.png",
    count: 8,
    mobileCount: 6,
    width: 3,
    mobileWidth: 2,
    edge: 18,
    gap: 88,
    moveEvery: 5000,
    moveCount: 3,
    weights: [0.375, 0.25, 0.375],
    duration: 5000,
    stagger: [200, 420],
    maxActive: 4,
    maxStart: 2,
    dx: [-4,-3, -2, -1, 1, 2, 3, 4],
  };

  const ID = "codex-bg-motion";
  const STYLE_ID = "codex-bg-motion-style";
  const root = document.createElement("div");
  const style = document.createElement("style");
  const timers = new Set();
  const active = new Set();
  const pending = new Set();
  const queue = [];
  const pos = Array(CFG.count).fill(null);
  let scheduler = 0;
  let mover = 0;
  let resizeTimer = 0;

  const rand = (min, max) => Math.round(min + Math.random() * Math.max(0, max - min));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const viewport = () =>
    Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0, 320);

  const mode = () => {
    const vw = viewport();
    const mobile = vw <= 767;
    return {
      vw,
      n: mobile ? CFG.mobileCount : CFG.count,
      w: mobile ? CFG.mobileWidth : CFG.width,
    };
  };

  const visibleIds = (n) => Array.from({ length: n }, (_, i) => i);
  const gap = (n, w, vw) => {
    const edge = Math.min(CFG.edge, Math.floor(vw * 0.04));
    const free = vw - edge * 2 - w * n;
    const maxGap = n > 1 ? Math.floor(free / (n - 1)) : 0;
    return clamp(Math.min(CFG.gap, maxGap), 8, CFG.gap);
  };

  const randomX = (min, max) => rand(min, max);
  const weightedX = (min, max) => {
    /*
     * Codex 作用：画面竖着切成三等分。
     * 换位时左/中/右概率分别为 3/8、1/4、3/8，
     * 再在抽中的三分区内部随机取点。
     */
    let roll = Math.random() * CFG.weights.reduce((s, w) => s + w, 0);
    let region = CFG.weights.length - 1;
    for (let i = 0; i < CFG.weights.length; i += 1) {
      roll -= CFG.weights[i];
      if (roll <= 0) {
        region = i;
        break;
      }
    }
    const part = Math.max(0, max - min) / CFG.weights.length;
    const a = min + part * region;
    const b = region === CFG.weights.length - 1 ? max : min + part * (region + 1);
    return rand(a, b);
  };

  const farEnough = (x, self, n, minGap) =>
    pos.every((p, i) => i === self || i >= n || p == null || Math.abs(x - p) >= minGap);

  const nextX = (self, n, w, vw, weighted) => {
    const edge = Math.min(CFG.edge, Math.floor(vw * 0.04));
    const min = edge;
    const max = Math.max(min, vw - edge - w);
    const minGap = gap(n, w, vw);
    const make = weighted ? weightedX : randomX;

    for (let i = 0; i < 48; i += 1) {
      const x = make(min, max);
      if (farEnough(x, self, n, minGap)) {
        return x;
      }
    }
    return make(min, max);
  };

  style.id = STYLE_ID;
  style.textContent = `
    #${ID}{position:fixed;inset:0;z-index:-2;pointer-events:none;overflow:hidden;contain:layout paint style}
    #particles-js{z-index:-3}
    #jsi-flying-fish-container{z-index:-1}
    html,body{overscroll-behavior-y:none}
    .main-container{position:relative;z-index:3}
    #back-to-top{z-index:4}
    #${ID} .s{position:absolute;top:0;left:var(--x);width:var(--w);height:100vh;overflow:hidden;opacity:1;transform:translate3d(0,0,0);will-change:transform,left;mix-blend-mode:normal}
    #${ID} .s::before{content:"";position:absolute;top:0;left:calc(0px - var(--x));width:100vw;height:100vh;background:url("${CFG.bg}") no-repeat center top / cover;filter:none;opacity:1}
    #${ID} .s.m{animation:codex-bg-step ${CFG.duration}ms steps(1,end) 1}
    @keyframes codex-bg-step{0%,18%,100%{transform:translate3d(0,0,0)}24%,38%{transform:translate3d(var(--dx),0,0)}44%,58%{transform:translate3d(var(--dx2),0,0)}64%,72%{transform:translate3d(var(--dx),var(--dy),0)}78%,86%{transform:translate3d(0,var(--dy2),0)}}
    @media (prefers-reduced-motion:reduce){#${ID}{display:none}}
  `;

  root.id = ID;
  root.setAttribute("aria-hidden", "true");
  root.innerHTML = Array.from({ length: CFG.count }, () => '<i class="s"></i>').join("");

  const slices = () => [...root.children];
  const setOffsets = (el) => {
    const dx = pick(CFG.dx);
    const dy = pick([-1, 1]);
    el.style.setProperty("--dx", `${dx}px`);
    el.style.setProperty("--dx2", `${dx * -1}px`);
    el.style.setProperty("--dy", `${dy}px`);
    el.style.setProperty("--dy2", `${dy * -1}px`);
  };

  const place = (i, x, w) => {
    const el = slices()[i];
    pos[i] = x;
    el.style.setProperty("--x", `${x}px`);
    el.style.setProperty("--w", `${w}px`);
    setOffsets(el);
  };

  const animate = (i) => {
    const el = slices()[i];
    el.classList.remove("m");
    void el.offsetWidth;
    el.classList.add("m");
  };

  const canMove = (i, n) => i < n && pos[i] != null && !active.has(i);
  const markActive = (i) => {
    active.add(i);
    const t = window.setTimeout(() => {
      active.delete(i);
      timers.delete(t);
    }, CFG.duration);
    timers.add(t);
  };

  const layout = () => {
    const { vw, n, w } = mode();
    active.clear();
    pending.clear();
    queue.length = 0;
    slices().forEach((el, i) => {
      el.classList.remove("m");
      el.style.display = i < n ? "block" : "none";
      pos[i] = i < n ? nextX(i, n, w, vw, false) : null;
      if (i < n) {
        place(i, pos[i], w);
      }
    });
  };

  const markReposition = () => {
    const { n } = mode();
    pending.clear();
    shuffle(visibleIds(n)).slice(0, Math.min(CFG.moveCount, n)).forEach((i) => pending.add(i));
  };

  const reposition = (i) => {
    const { vw, n, w } = mode();
    if (!canMove(i, n)) return false;
    place(i, nextX(i, n, w, vw, true), w);
    animate(i);
    return true;
  };

  const pixelMove = (i) => {
    const { n } = mode();
    if (!canMove(i, n)) return false;
    setOffsets(slices()[i]);
    animate(i);
    return true;
  };

  const nextJob = (n) => {
    const p = [...pending].filter((i) => canMove(i, n));
    if (p.length) {
      const i = pick(p);
      pending.delete(i);
      return ["pos", i];
    }
    while (queue.length && !canMove(queue[0], n)) queue.shift();
    if (!queue.length) queue.push(...shuffle(visibleIds(n).filter((i) => canMove(i, n))));
    const i = queue.shift();
    return i == null ? null : ["px", i];
  };

  const tick = () => {
    const { n } = mode();
    const starts = Math.min(CFG.maxStart, Math.max(0, CFG.maxActive - active.size));
    for (let k = 0; k < starts; k += 1) {
      const job = nextJob(n);
      if (!job) break;
      const ok = job[0] === "pos" ? reposition(job[1]) : pixelMove(job[1]);
      if (ok) markActive(job[1]);
    }
    scheduler = window.setTimeout(tick, rand(CFG.stagger[0], CFG.stagger[1]));
  };

  window.__codexBgMotionStop = () => {
    window.clearTimeout(scheduler);
    window.clearInterval(mover);
    window.clearTimeout(resizeTimer);
    timers.forEach((t) => window.clearTimeout(t));
    root.remove();
    style.remove();
    window.__codexBgMotionStop = null;
  };

  document.head.appendChild(style);
  document.body.prepend(root);
  layout();
  tick();
  mover = window.setInterval(markReposition, CFG.moveEvery);
  window.addEventListener("resize", () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(layout, 120);
  });
})();
