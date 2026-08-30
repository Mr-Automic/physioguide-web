/**
 * زر التمرير الدائري (Circular Scroll-to-Top):
 * زر عائم بخلفية زجاجية (Glassmorphism) مع حلقة SVG تُعبّأ تدريجياً
 * (0% → 100%) حسب نسبة التمرير الكلية في الصفحة.
 */
export default class ScrollBtn {
  constructor() {
    this.btn = document.getElementById("smartScrollBtn");

    if (!this.btn) {
      console.warn("ScrollBtn element not found in the DOM.");
      return;
    }

    this.ring = null;
    this.circumference = 0;

    this.buildMarkup();
    this.bindEvents();
    this.update();
  }

  // بناء البنية الداخلية للزر (حلقة التقدم + سهم الصعود) بشكل ديناميكي
  buildMarkup() {
    const ringRadius = 20;

    // إعادة بناء الهيكل بشكل موحّد ليعمل على جميع الصفحات
    this.btn.innerHTML = `
      <svg class="scroll-btn__svg" viewBox="0 0 48 48" aria-hidden="true">
        <circle class="scroll-btn__track" cx="24" cy="24" r="${ringRadius}"></circle>
        <circle class="scroll-btn__ring" cx="24" cy="24" r="${ringRadius}"></circle>
      </svg>
      <svg
        class="scroll-btn__arrow"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <polyline points="18 15 12 9 6 15"></polyline>
      </svg>
    `;

    this.ring = this.btn.querySelector(".scroll-btn__ring");
    this.circumference = 2 * Math.PI * ringRadius;

    if (this.ring) {
      this.ring.style.strokeDasharray = `${this.circumference}`;
      this.ring.style.strokeDashoffset = `${this.circumference}`;
    }
  }

  bindEvents() {
    window.addEventListener("scroll", () => this.update(), { passive: true });
    window.addEventListener("resize", () => this.update(), { passive: true });
    this.btn.addEventListener("click", () => this.scrollToTop());
  }

  // حساب نسبة التمرير وتحديث الحلقة وحالة الظهور
  update() {
    const scrollTop =
      window.scrollY ||
      document.documentElement.scrollTop ||
      document.body.scrollTop ||
      0;

    const doc = document.documentElement;
    const scrollable = doc.scrollHeight - doc.clientHeight;
    const progress =
      scrollable > 0 ? Math.min(1, Math.max(0, scrollTop / scrollable)) : 0;

    if (this.ring) {
      this.ring.style.strokeDashoffset = `${this.circumference * (1 - progress)}`;
    }

    // يظهر الزر فقط بعد تجاوز 200px
    if (scrollTop > 200) {
      this.btn.classList.remove("scroll-btn--hidden");
    } else {
      this.btn.classList.add("scroll-btn--hidden");
    }
  }

  scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}
