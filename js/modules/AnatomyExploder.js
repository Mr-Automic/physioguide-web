/**
 * AnatomyExploder — محمّل SVG ديناميكي + عرض تفجيري (Exploded View) لعظام الرسغ.
 *
 * يجلب ملف images/carpal_hand.svg ويحقنه داخل الحاوية، ثم يلتقط العظام الفردية
 * (عناصر تحمل inkscape:label يبدأ بـ "bone-") ويحرّكها باستخدام Anime.js:
 *  - تفكيك (Explode): تشتيت نصف قطري بفيزياء النوابض.
 *  - تجميع (Assemble): إعادة سلسة إلى الموضع الأصلي (0, 0).
 *  - شارات عائمة (Floating Badges): تعرض الاسم الإنجليزي والعربي لكل عظمة
 *    عند التمرير/اللمس أو أثناء حالة التفكيك.
 */
const SVG_NS = "http://www.w3.org/2000/svg";
const SHAPE_SELECTOR = "g, path, image, ellipse, circle, rect, polygon, polyline";
const SHAPE_TAGS = new Set(["path", "ellipse", "circle", "rect", "polygon", "polyline"]);
const BONE_LABEL_PREFIX = "bone-";

// بيانات الأسماء ثنائية اللغة لعظام الرسغ الثمانية
const BONE_META = {
  scaphoid: { en: "Scaphoid", ar: "العظم الزورقي", row: "proximal" },
  lunate: { en: "Lunate", ar: "العظم الهلالي", row: "proximal" },
  triquetrum: { en: "Triquetrum", ar: "العظم المثلثي", row: "proximal" },
  pisiform: { en: "Pisiform", ar: "العظم الحمصي", row: "proximal" },
  trapezium: { en: "Trapezium", ar: "العظم المربعي", row: "distal" },
  trapezoid: { en: "Trapezoid", ar: "العظم المربعي الصغير", row: "distal" },
  capitate: { en: "Capitate", ar: "العظم الرأسي", row: "distal" },
  hamate: { en: "Hamate", ar: "العظم الخطافي", row: "distal" },
};

const ROW_AR_LABEL = { proximal: "الصف القريب", distal: "الصف البعيد" };

export default class AnatomyExploder {
  /**
   * @param {string} containerSelector - محدد الحاوية التي سيُحقن فيها SVG
   * @param {object} options - { svgUrl, explodeButton, assembleButton }
   */
  constructor(containerSelector, options = {}) {
    this.container = document.querySelector(containerSelector);
    this.svgUrl = options.svgUrl || "images/carpal_hand.svg";
    this.explodeButton = document.querySelector(options.explodeButton || "#btn-explode");
    this.assembleButton = document.querySelector(options.assembleButton || "#btn-assemble");

    this.anime = window.anime;
    this.svgEl = null;
    this.stage = this.container ? this.container.closest(".interactive-stage") || this.container : null;
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
      console.warn("[AnatomyExploder] Anime.js not loaded. تحقق من وسم الـ CDN.");
    }

    this.init();
  }

  async init() {
    this.renderMessage("جارِ تحميل النموذج…");
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
      this.updateButtons();
    } catch (error) {
      console.error("[AnatomyExploder] فشل تحميل SVG:", error);
      this.renderMessage(`تعذّر تحميل النموذج من المسار: ${this.svgUrl}`);
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

    // تأمين viewBox إن لم يكن موجوداً (لعرض صحيح داخل الحاوية)
    if (!this.svgEl.getAttribute("viewBox")) {
      try {
        const bb = this.svgEl.getBBox();
        this.svgEl.setAttribute("viewBox", `${bb.x} ${bb.y} ${bb.width} ${bb.height}`);
      } catch (e) {
        /* تجاهل */
      }
    }

    this.container.appendChild(this.svgEl);
  }

  collectBones() {
    const candidates = Array.from(this.svgEl.querySelectorAll(SHAPE_SELECTOR));

    // 1) الأساسي: عناصر تحمل inkscape:label يبدأ بـ "bone-"
    let bones = candidates.filter((el) =>
      (el.getAttribute("inkscape:label") || "").toLowerCase().startsWith(BONE_LABEL_PREFIX),
    );
    bones = this.keepOutermost(bones);

    // 2) بديل: معرّفات تطابق أسماء العظام المعروفة
    if (!bones.length) {
      bones = candidates.filter((el) =>
        Object.keys(BONE_META).some((name) => (el.id || "").toLowerCase().includes(name)),
      );
      bones = this.keepOutermost(bones);
    }

    // 3) أخير: عناصر مرئية ذات معرّف خارج defs/clipPath
    if (!bones.length) {
      bones = candidates.filter((el) => el.id && !this.isInsideDefs(el));
      bones = this.keepOutermost(bones);
    }

    this.bones = bones;
  }

  /** يُبقي العنصر الخارجي فقط لكل عظمة (يتجاهل الأبناء المتداخلة المسمّاة أيضاً). */
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

  /** يستخرج مفتاح العظمة من inkscape:label (bone-scaphoid -> scaphoid) أو من id. */
  resolveBoneKey(el) {
    const label = (el.getAttribute("inkscape:label") || "").toLowerCase();
    if (label.startsWith(BONE_LABEL_PREFIX)) {
      return label.slice(BONE_LABEL_PREFIX.length).trim();
    }
    const id = (el.id || "").toLowerCase();
    return Object.keys(BONE_META).find((name) => id.includes(name)) || null;
  }

  /**
   * يغلف كل عظمة في مجموعتين:
   *  - خارجية (.bone) يتحركها Anime.js (ترجمة فقط).
   *  - داخلية (.bone__shape) للتأثيرات البصرية عند التمرير (تكبير/توهج).
   */
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
        pinned: false,
      };
    });
  }

  /** يحسب مركز كل عظمة في وحدات SVG (user units). */
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

      // صورة بحجم اللوحة كاملة مع clip-path => نعتمد صندوق مسار القصّ
      if (w && h && w >= fullW * 0.6 && h >= fullH * 0.6) {
        const clip = this.getClipPathBBox(el);
        if (clip) return { x: clip.x + clip.width / 2, y: clip.y + clip.height / 2 };
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

  /**
   * يحسب أهداف التفكيك الشعاعي: يدفع كل عظمة بعيداً عن مركز اليد
   * باتجاه موقعها الحقيقي، مع انتشار دائري احتياطي عند غياب المراكز.
   */
  cacheExplodeTargets() {
    const n = this.bones.length;
    const vb = this.svgEl.viewBox && this.svgEl.viewBox.baseVal;
    const vbWidth = (vb && vb.width) || this.svgEl.getBoundingClientRect().width || 6000;
    const basePush = vbWidth * 0.14;

    const centers = this.bones.map((b) => b.center).filter(Boolean);
    let handCenter = null;
    if (centers.length) {
      handCenter = {
        x: centers.reduce((sum, c) => sum + c.x, 0) / centers.length,
        y: centers.reduce((sum, c) => sum + c.y, 0) / centers.length,
      };
    }

    this.bones.forEach((bone, i) => {
      let dx;
      let dy;
      if (handCenter && bone.center) {
        dx = bone.center.x - handCenter.x;
        dy = bone.center.y - handCenter.y;
        const dist = Math.hypot(dx, dy) || 1;
        dx /= dist;
        dy /= dist;
      } else {
        // انتشار قطري منتظم (احتياطي)
        const angle = (2 * Math.PI * i) / n;
        dx = Math.cos(angle);
        dy = Math.sin(angle);
      }

      const push = basePush * (0.85 + (i % 3) * 0.12);
      bone.target = { x: dx * push, y: dy * push };
      bone.badgeTarget = { x: bone.target.x * this.scale, y: bone.target.y * this.scale };
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

  /** يموضع الشارات العائمة فوق مركز كل عظمة (بالوحدات الشاشية). */
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
    if (this.explodeButton) {
      this.explodeButton.addEventListener("click", () => this.explode());
    }
    if (this.assembleButton) {
      this.assembleButton.addEventListener("click", () => this.assemble());
    }

    this.bones.forEach((bone) => {
      bone.outer.addEventListener("mouseenter", () => this.showBadge(bone));
      bone.outer.addEventListener("mouseleave", () => {
        if (!this.isExploded && !bone.pinned) this.hideBadge(bone);
      });
      bone.outer.addEventListener("focus", () => this.showBadge(bone));
      bone.outer.addEventListener("blur", () => {
        if (!this.isExploded && !bone.pinned) this.hideBadge(bone);
      });
      bone.outer.addEventListener("click", () => this.togglePin(bone));
      bone.outer.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          this.togglePin(bone);
        }
      });
    });

    window.addEventListener("resize", () => this.handleResize());
    this.updateButtons();
  }

  showBadge(bone) {
    if (bone.badgeInner) bone.badgeInner.classList.add("is-visible");
  }

  hideBadge(bone) {
    if (bone.badgeInner) bone.badgeInner.classList.remove("is-visible");
  }

  togglePin(bone) {
    bone.pinned = !bone.pinned;
    if (bone.pinned) {
      this.showBadge(bone);
    } else if (!this.isExploded) {
      this.hideBadge(bone);
    }
  }

  showAllBadges() {
    this.bones.forEach((b) => this.showBadge(b));
  }

  hideAllBadges() {
    this.bones.forEach((b) => {
      b.pinned = false;
      this.hideBadge(b);
    });
  }

  explode() {
    if (!this.bones.length || !this.anime) return;
    this.stop();
    this.showAllBadges();

    const timing = { easing: "spring(1, 80, 12, 0)", duration: 1100 };
    const stagger = this.anime.stagger(18);

    this.currentAnims = [
      this.anime({
        targets: this.bones.map((b) => b.outer),
        translateX: (_el, i) => this.bones[i].target.x,
        translateY: (_el, i) => this.bones[i].target.y,
        easing: timing.easing,
        duration: timing.duration,
        delay: stagger,
      }),
      this.anime({
        targets: this.bones.map((b) => b.badgeInner),
        translateX: (_el, i) => this.bones[i].badgeTarget.x,
        translateY: (_el, i) => this.bones[i].badgeTarget.y,
        easing: timing.easing,
        duration: timing.duration,
        delay: stagger,
      }),
    ];

    this.isExploded = true;
    this.updateButtons();
  }

  assemble() {
    if (!this.bones.length || !this.anime) return;
    this.stop();

    const timing = { easing: "easeOutCubic", duration: 900 };
    const stagger = this.anime.stagger(14);

    this.currentAnims = [
      this.anime({
        targets: this.bones.map((b) => b.outer),
        translateX: 0,
        translateY: 0,
        easing: timing.easing,
        duration: timing.duration,
        delay: stagger,
      }),
      this.anime({
        targets: this.bones.map((b) => b.badgeInner),
        translateX: 0,
        translateY: 0,
        easing: timing.easing,
        duration: timing.duration,
        delay: stagger,
      }),
    ];

    this.isExploded = false;
    this.hideAllBadges();
    this.updateButtons();
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
    }, 120);
  }

  updateButtons() {
    if (this.explodeButton) {
      this.explodeButton.disabled = false;
      this.explodeButton.classList.toggle("is-active", this.isExploded);
      this.explodeButton.setAttribute("aria-pressed", String(this.isExploded));
    }
    if (this.assembleButton) {
      this.assembleButton.disabled = false;
    }
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
