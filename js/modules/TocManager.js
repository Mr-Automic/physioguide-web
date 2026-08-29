// وحدة الفهرس الجانبي: توليد روابط تلقائية من عناوين الأقسام داخل منطقة القراءة
export default class TocManager {
  /**
   * @param {HTMLElement} navContainer - عنصر الـ <nav> الذي سيحتوي الروابط
   * @param {HTMLElement} sidebar - الحاوية الجانبية للفهرس
   * @param {HTMLElement} contentRoot - الجذر الذي يحتوي الأقسام القابلة للفهرسة
   * @param {HTMLElement} toggleBtn - زر فتح الفهرس على الجوال
   * @param {HTMLElement} closeBtn - زر إغلاق الفهرس على الجوال
   * @param {HTMLElement} overlay - الطبقة المعتمة (اختياري)
   */
  constructor(
    navContainer,
    sidebar,
    contentRoot,
    toggleBtn,
    closeBtn,
    overlay,
  ) {
    this.navContainer = navContainer;
    this.sidebar = sidebar;
    this.contentRoot = contentRoot;
    this.toggleBtn = toggleBtn;
    this.closeBtn = closeBtn;
    this.overlay = overlay;

    if (!this.navContainer || !this.contentRoot) {
      console.warn("TOC nav container or content root not found.");
      return;
    }

    this.buildToc();
    this.initScrollSpy();
    this.initControls();
  }

  // بناء الفهرس: استخراج عناوين الأقسام وإعطاء معرفات تلقائية للمقاطع بدون معرف
  buildToc() {
    this.navContainer.innerHTML = "";

    // نجمع كل العناوين h2 داخل الأقسام الدراسية
    const sections = this.contentRoot.querySelectorAll(".reader-section");

    sections.forEach((section, index) => {
      const heading = section.querySelector("h2");
      if (!heading) return;

      // إذا لم يكن للقسم معرف صريح، ننشئ معرّفاً تلقائياً من رقمه
      if (!section.id) {
        section.id = `toc-section-${index + 1}`;
      }

      const link = document.createElement("a");
      link.className = "toc-nav__link";
      link.href = `#${section.id}`;
      link.textContent = heading.textContent;

      // تمرير سلس مع مراعاة ارتفاع شريط التنقل الثابت
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const target = document.getElementById(section.id);
        if (!target) return;

        const navOffset = 80;
        const top =
          target.getBoundingClientRect().top + window.scrollY - navOffset;

        window.scrollTo({ top, behavior: "smooth" });

        // إغلاق الفهرس تلقائياً على الجوال بعد الاختيار
        this.close();
      });

      this.navContainer.appendChild(link);
    });

    this.links = Array.from(
      this.navContainer.querySelectorAll(".toc-nav__link"),
    );
  }

  // تتبع التمرير لتمييز القسم النشط حالياً
  initScrollSpy() {
    if (!this.links || this.links.length === 0) return;

    const sections = Array.from(
      this.contentRoot.querySelectorAll(".reader-section"),
    );

    window.addEventListener(
      "scroll",
      () => {
        let currentId = "";

        sections.forEach((section) => {
          const top = section.getBoundingClientRect().top;
          if (top <= 120) {
            currentId = section.id;
          }
        });

        this.links.forEach((link) => {
          const href = link.getAttribute("href").replace("#", "");
          if (href === currentId) {
            link.classList.add("toc-nav__link--active");
          } else {
            link.classList.remove("toc-nav__link--active");
          }
        });
      },
      { passive: true },
    );
  }

  // ربط أزرار الفتح والإغلاق (خاصة على الجوال)
  initControls() {
    if (this.toggleBtn) {
      this.toggleBtn.addEventListener("click", () => this.open());
    }
    if (this.closeBtn) {
      this.closeBtn.addEventListener("click", () => this.close());
    }
    if (this.overlay) {
      this.overlay.addEventListener("click", () => this.close());
    }
  }

  open() {
    if (!this.sidebar) return;
    this.sidebar.classList.add("toc-sidebar--open");
    if (this.overlay) this.overlay.classList.add("overlay--visible");
    document.body.style.overflow = "hidden";
  }

  close() {
    if (!this.sidebar) return;
    this.sidebar.classList.remove("toc-sidebar--open");
    if (this.overlay) this.overlay.classList.remove("overlay--visible");
    document.body.style.overflow = "";
  }
}
