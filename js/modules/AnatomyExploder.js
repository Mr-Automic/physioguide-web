/**
 * AnatomyExploder — محمّل SVG ديناميكي + تفكيك وتجميع تفاعلي منضبط تشريحياً لعظام الرسغ.
 */
const SVG_NS = "http://www.w3.org/2000/svg";
const SHAPE_SELECTOR =
  "g, path, image, ellipse, circle, rect, polygon, polyline";
const SHAPE_TAGS = new Set([
  "path",
  "ellipse",
  "circle",
  "rect",
  "polygon",
  "polyline",
]);
const BONE_LABEL_PREFIX = "bone-";

// بيانات الأسماء ثنائية اللغة لعظام الرسغ الثمانية مقسمة تشريحياً
const BONE_META = {
  // الصف القريب (Proximal Row)
  scaphoid: { en: "Scaphoid", ar: "الزورقي", row: "proximal" },
  lunate: { en: "Lunate", ar: "الهلالي", row: "proximal" },
  triquetrum: { en: "Triquetrum", ar: "المثلثي", row: "proximal" },
  pisiform: { en: "Pisiform", ar: "الحمصي", row: "proximal" },
  // الصف البعيد (Distal Row)
  trapezium: { en: "Trapezium", ar: "المربعي", row: "distal" },
  trapezoid: { en: "Trapezoid", ar: "المنحرفي", row: "distal" },
  capitate: { en: "Capitate", ar: "الكبير", row: "distal" },
  hamate: { en: "Hamate", ar: "الكلابي", row: "distal" },
};

const ROW_AR_LABEL = { proximal: "الصف القريب", distal: "الصف البعيد" };

// إحداثيات انتشار مداري متزن ومحسوب تشريحياً (لا يتجاوز حدود الرسغ ولا يغطي الأصابع أو الساعد)
const BONE_EXPLODE_OFFSETS = {
  // الصف البعيد (Distal) - متباعد للأعلى والأطراف
  trapezium: { x: -85, y: -25 },
  trapezoid: { x: -45, y: -65 },
  capitate: { x: 0, y: -70 },
  hamate: { x: 65, y: -45 },

  // الصف القريب (Proximal) - متباعد للأسفل والأطراف
  scaphoid: { x: -75, y: 40 },
  lunate: { x: 0, y: 55 },
  triquetrum: { x: 60, y: 45 },
  pisiform: { x: 85, y: 5 },
};

export default class AnatomyExploder {
  constructor(containerSelector, options = {}) {
    this.container = document.querySelector(containerSelector);
    this.svgUrl = options.svgUrl || "images/carpal_hand.svg";

    this.anime = window.anime;
    this.svgEl = null;
    this.stage = this.container
      ? this.container.closest(".interactive-stage") || this.container
      : null;
    this.badgeLayer = null;
    this.bones = [];
    this.isExploded = false;
    this.currentAnims = [];
    this.scale = 1;
    this._resizeTimer = null;

    if (!this.container) {
      console.warn("[AnatomyExploder] container not found:", containerSelector);
      return;
    }
    if (!this.anime) {
      console.warn("[AnatomyExploder] Anime.js not loaded.");
    }

    this.init();
  }

  async init() {
    this.renderMessage("جارِ تحميل النموذج التشريحي…");
    try {
      const markup = await this.fetchSvg();
      this.injectSvg(markup);
      this.collectBones();

      if (!this.bones.length) {
        this.renderMessage("لم يتم العثور على عناصر عظام داخل ملف SVG.");
        return;
      }

      this.wrapBones();
      this.cacheCenters();
      this.createBadgeLayer();
      this.positionBadges();
      this.cacheExplodeTargets();
      this.bindControls();
    } catch (error) {
      console.error("[AnatomyExploder] فشل تحميل SVG:", error);
      this.renderMessage(`تعذّر تحميل النموذج: ${this.svgUrl}`);
    }
  }

  async fetchSvg() {
    const response = await fetch(this.svgUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.text();
  }

  injectSvg(markup) {
    this.container.innerHTML = "";
    const doc = new DOMParser().parseFromString(markup, "image/svg+xml");
    this.svgEl = doc.documentElement;
    this.svgEl.classList.add("anatomy-svg");

    if (!this.svgEl.getAttribute("viewBox")) {
      try {
        const bb = this.svgEl.getBBox();
        this.svgEl.setAttribute(
          "viewBox",
          `${bb.x} ${bb.y} ${bb.width} ${bb.height}`,
        );
      } catch (e) {
        /* تجاهل */
      }
    }

    this.container.appendChild(this.svgEl);
  }

  collectBones() {
    const candidates = Array.from(this.svgEl.querySelectorAll(SHAPE_SELECTOR));

    let bones = candidates.filter((el) =>
      (el.getAttribute("inkscape:label") || "")
        .toLowerCase()
        .startsWith(BONE_LABEL_PREFIX),
    );
    bones = this.keepOutermost(bones);

    if (!bones.length) {
      bones = candidates.filter((el) =>
        Object.keys(BONE_META).some((name) =>
          (el.id || "").toLowerCase().includes(name),
        ),
      );
      bones = this.keepOutermost(bones);
    }

    if (!bones.length) {
      bones = candidates.filter((el) => el.id && !this.isInsideDefs(el));
      bones = this.keepOutermost(bones);
    }

    this.bones = bones;
  }

  keepOutermost(elements) {
    const set = new Set(elements);
    return elements.filter((el) => {
      let parent = el.parentElement;
      while (parent && parent !== this.svgEl) {
        if (set.has(parent)) return false;
        parent = parent.parentElement;
      }
      return true;
    });
  }

  isInsideDefs(el) {
    let parent = el.parentElement;
    while (parent && parent !== this.svgEl) {
      const tag = parent.tagName.toLowerCase();
      if (tag === "defs" || tag === "clippath") return true;
      parent = parent.parentElement;
    }
    return false;
  }

  resolveBoneKey(el) {
    const label = (el.getAttribute("inkscape:label") || "").toLowerCase();
    if (label.startsWith(BONE_LABEL_PREFIX)) {
      return label.slice(BONE_LABEL_PREFIX.length).trim();
    }
    const id = (el.id || "").toLowerCase();
    return Object.keys(BONE_META).find((name) => id.includes(name)) || null;
  }

  wrapBones() {
    this.bones = this.bones.map((el) => {
      const key = this.resolveBoneKey(el) || "bone";
      const meta = BONE_META[key] || { en: key, ar: "", row: "" };

      const outer = document.createElementNS(SVG_NS, "g");
      outer.classList.add("bone");
      outer.setAttribute("data-bone", key);
      outer.setAttribute("tabindex", "0");
      outer.setAttribute("role", "button");
      outer.setAttribute(
        "aria-label",
        `${meta.en} — ${meta.ar}${meta.row ? ` (${ROW_AR_LABEL[meta.row]})` : ""}`,
      );

      const inner = document.createElementNS(SVG_NS, "g");
      inner.classList.add("bone__shape");

      el.parentNode.insertBefore(outer, el);
      outer.appendChild(inner);
      inner.appendChild(el);

      return {
        key,
        meta,
        el,
        outer,
        inner,
        center: null,
        target: { x: 0, y: 0 },
        badge: null,
        badgeInner: null,
        badgeBase: { x: 0, y: 0 },
        badgeTarget: { x: 0, y: 0 },
      };
    });
  }

  cacheCenters() {
    this.bones.forEach((bone) => {
      bone.center = this.getBoneCenter(bone.el);
    });
  }

  getBoneCenter(el) {
    const tag = el.tagName.toLowerCase();

    if (SHAPE_TAGS.has(tag)) {
      try {
        const bb = el.getBBox();
        return { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 };
      } catch (e) {
        /* تجاهل */
      }
    }

    if (tag === "image") {
      const w = parseFloat(el.getAttribute("width"));
      const h = parseFloat(el.getAttribute("height"));
      const t = this.parseTranslate(el.getAttribute("transform"));
      const vb = this.svgEl.viewBox && this.svgEl.viewBox.baseVal;
      const fullW = (vb && vb.width) || 6000;
      const fullH = (vb && vb.height) || 6000;

      if (w && h && w >= fullW * 0.6 && h >= fullH * 0.6) {
        const clip = this.getClipPathBBox(el);
        if (clip)
          return { x: clip.x + clip.width / 2, y: clip.y + clip.height / 2 };
        return { x: t.x + w / 2, y: t.y + h / 2 };
      }
      if (w && h) return { x: t.x + w / 2, y: t.y + h / 2 };
    }

    try {
      const bb = el.getBBox();
      return { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 };
    } catch (e) {
      /* تجاهل */
    }
    return null;
  }

  getClipPathBBox(el) {
    const ref = (el.getAttribute("clip-path") || "").trim();
    const match = ref.match(/url\(\s*#([^)\s]+)\s*\)/);
    if (!match) return null;
    const id = match[1];

    let clipEl = null;
    try {
      clipEl = this.svgEl.querySelector(`clipPath[id="${CSS.escape(id)}"]`);
    } catch (e) {
      clipEl = this.svgEl.querySelector(`clipPath[id="${id}"]`);
    }
    if (!clipEl) return null;

    const path = clipEl.querySelector("path");
    if (!path) return null;
    try {
      return path.getBBox();
    } catch (e) {
      return null;
    }
  }

  parseTranslate(transform) {
    const result = { x: 0, y: 0 };
    if (!transform) return result;

    const m = transform.match(/translate\(\s*([^,\s)]+)[\s,]*([^)]*)\)/);
    if (m) {
      result.x = parseFloat(m[1]) || 0;
      result.y = parseFloat(m[2]) || 0;
      return result;
    }

    const mat = transform.match(/matrix\(\s*([^)]+)\s*\)/);
    if (mat) {
      const parts = mat[1].split(/[\s,]+/).map(Number);
      if (parts.length >= 6) {
        result.x = parts[4] || 0;
        result.y = parts[5] || 0;
      }
    }
    return result;
  }

  cacheExplodeTargets() {
    const scale = this.scale || 1;
    const stageWidth = (this.stage && this.stage.offsetWidth) || 480;
    // ضبط نسبة الانتشار بدقة لتناسب الشاشات الضيقة
    const dispersion = Math.min(1, Math.max(0.65, stageWidth / 460));

    this.bones.forEach((bone) => {
      const offset = BONE_EXPLODE_OFFSETS[bone.key];
      let px;
      if (offset) {
        px = { x: offset.x * dispersion, y: offset.y * dispersion };
      } else {
        const i = this.bones.indexOf(bone);
        const n = Math.max(1, this.bones.length);
        const angle = (2 * Math.PI * i) / n;
        const radius = 55 * dispersion;
        px = { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
      }

      bone.target = { x: px.x / scale, y: px.y / scale };

      // موضع الشارة يتحرك بدقة مع العظمة مع إزاحة رأسية خفيفة لمنع التغطية
      const verticalGap = bone.meta.row === "proximal" ? 14 : -14;
      bone.badgeTarget = {
        x: px.x,
        y: px.y + verticalGap,
      };
    });
  }

  createBadgeLayer() {
    if (!this.stage) return;
    this.badgeLayer = document.createElement("div");
    this.badgeLayer.className = "anatomy-badge-layer";
    this.stage.appendChild(this.badgeLayer);

    this.bones.forEach((bone) => {
      const anchor = document.createElement("div");
      anchor.className = "anatomy-badge";

      const inner = document.createElement("div");
      inner.className = "anatomy-badge__inner";

      const en = document.createElement("span");
      en.className = "anatomy-badge__en";
      en.textContent = bone.meta.en;

      const ar = document.createElement("span");
      ar.className = "anatomy-badge__ar";
      ar.textContent = bone.meta.ar;

      inner.appendChild(en);
      inner.appendChild(ar);
      anchor.appendChild(inner);
      this.badgeLayer.appendChild(anchor);

      bone.badge = anchor;
      bone.badgeInner = inner;
    });
  }

  positionBadges() {
    if (!this.svgEl || !this.badgeLayer) return;
    const ctm = this.svgEl.getScreenCTM();
    if (!ctm) return;
    this.scale = ctm.a || ctm.d || 1;

    const layerRect = this.badgeLayer.getBoundingClientRect();

    this.bones.forEach((bone) => {
      if (!bone.center || !bone.badge) return;
      const p = this.svgEl.createSVGPoint();
      p.x = bone.center.x;
      p.y = bone.center.y;
      const sp = p.matrixTransform(ctm);
      const x = sp.x - layerRect.left;
      const y = sp.y - layerRect.top;
      bone.badgeBase = { x, y };
      bone.badge.style.left = `${x}px`;
      bone.badge.style.top = `${y}px`;
    });
  }

  bindControls() {
    const toggleTarget = this.container || this.svgEl;
    if (toggleTarget) {
      toggleTarget.addEventListener("click", () => this.toggleExploded());
    }

    this.bones.forEach((bone) => {
      bone.outer.addEventListener("mouseenter", () => this.showBadge(bone));
      bone.outer.addEventListener("mouseleave", () => {
        if (!this.isExploded) this.hideBadge(bone);
      });
      bone.outer.addEventListener("focus", () => this.showBadge(bone));
      bone.outer.addEventListener("blur", () => {
        if (!this.isExploded) this.hideBadge(bone);
      });
      bone.outer.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          this.toggleExploded();
        }
      });
    });

    window.addEventListener("resize", () => this.handleResize());
  }

  showBadge(bone) {
    if (bone.badgeInner) bone.badgeInner.classList.add("is-visible");
    if (bone.badge) bone.badge.classList.add("is-active");
  }

  hideBadge(bone) {
    if (bone.badgeInner) bone.badgeInner.classList.remove("is-visible");
    if (bone.badge) bone.badge.classList.remove("is-active");
  }

  showAllBadges() {
    this.bones.forEach((b) => this.showBadge(b));
  }

  hideAllBadges() {
    this.bones.forEach((b) => this.hideBadge(b));
  }

  toggleExploded() {
    if (this.isExploded) {
      this.assemble();
    } else {
      this.explode();
    }
  }

  explode() {
    if (!this.bones.length || !this.anime) return;
    this.stop();
    this.showAllBadges();

    const duration = 650;
    const easing = "easeOutExpo"; // بديل النوابض الفائق السرعة

    this.currentAnims = [
      this.anime({
        targets: this.bones.map((b) => b.outer),
        translateX: (_el, i) => this.bones[i].target.x,
        translateY: (_el, i) => this.bones[i].target.y,
        easing: easing,
        duration: duration,
      }),
      this.anime({
        targets: this.bones.map((b) => b.badgeInner),
        translateX: (_el, i) => this.bones[i].badgeTarget.x,
        translateY: (_el, i) => this.bones[i].badgeTarget.y,
        easing: easing,
        duration: duration,
      }),
    ];

    this.isExploded = true;
  }

  assemble() {
    if (!this.bones.length || !this.anime) return;
    this.stop();

    const duration = 500;
    const easing = "easeOutCubic";

    this.currentAnims = [
      this.anime({
        targets: this.bones.map((b) => b.outer),
        translateX: 0,
        translateY: 0,
        easing: easing,
        duration: duration,
      }),
      this.anime({
        targets: this.bones.map((b) => b.badgeInner),
        translateX: 0,
        translateY: 0,
        easing: easing,
        duration: duration,
      }),
    ];

    this.isExploded = false;
    this.hideAllBadges();
  }

  stop() {
    this.currentAnims.forEach((anim) => anim && anim.pause());
    this.currentAnims = [];
  }

  handleResize() {
    clearTimeout(this._resizeTimer);
    this._resizeTimer = setTimeout(() => {
      this.positionBadges();
      this.cacheExplodeTargets();
      this.bones.forEach((bone) => {
        if (!bone.badgeInner) return;
        if (this.isExploded) {
          bone.badgeInner.style.transform = `translate(${bone.badgeTarget.x}px, ${bone.badgeTarget.y}px)`;
        } else {
          bone.badgeInner.style.transform = "";
        }
      });
    }, 100);
  }

  renderMessage(text) {
    if (!this.container) return;
    this.container.innerHTML = "";
    const msg = document.createElement("p");
    msg.className = "interactive-stage__message";
    msg.textContent = text;
    this.container.appendChild(msg);
  }
}
