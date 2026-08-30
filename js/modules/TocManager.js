// وحدة الفهرس الجانبي + تحسينات القارئ (شريط التقدم وشارات المصطلحات الطبية)
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
    this.initProgressBar();
    this.applyTermBadges();
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

  // شريط تقدم القراءة العلوي: يمتلئ أفقياً أثناء التمرير داخل الدرس
  initProgressBar() {
    this.progressBar = document.getElementById("reader-progress-bar");
    if (!this.progressBar || !this.contentRoot) return;

    const update = () => {
      const rect = this.contentRoot.getBoundingClientRect();
      const viewportHeight =
        window.innerHeight || document.documentElement.clientHeight;
      const total = this.contentRoot.offsetHeight - viewportHeight;

      let scrolled = -rect.top;
      if (scrolled < 0) scrolled = 0;
      if (total > 0 && scrolled > total) scrolled = total;

      const progress = total > 0 ? scrolled / total : 0;
      this.progressBar.style.transform = `scaleX(${progress})`;
    };

    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    update();
  }

  // تحويل المصطلحات/الاختصارات الطبية الإنجليزية داخل الأقواس إلى شارات صغيرة
  applyTermBadges() {
    if (!this.contentRoot) return;

    const targets = this.contentRoot.querySelectorAll(
      ".reader-section p, .article__list-item",
    );

    targets.forEach((el) => this.wrapLatinParentheses(el));
  }

  wrapLatinParentheses(el) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    let node;
    while ((node = walker.nextNode())) {
      textNodes.push(node);
    }

    // فقط المصطلحات اللاتينية داخل الأقواس (تجاهل الأقواس العربية التوضيحية)
    const pattern = /\([A-Za-z][^()]*\)/g;

    textNodes.forEach((textNode) => {
      const text = textNode.textContent;
      if (!pattern.test(text)) {
        pattern.lastIndex = 0;
        return;
      }
      pattern.lastIndex = 0;

      const fragment = document.createDocumentFragment();
      let lastIndex = 0;
      let match;

      while ((match = pattern.exec(text)) !== null) {
        if (match.index > lastIndex) {
          fragment.appendChild(
            document.createTextNode(text.slice(lastIndex, match.index)),
          );
        }

        const badge = document.createElement("span");
        badge.className = "term-badge";
        badge.textContent = match[0];
        fragment.appendChild(badge);

        lastIndex = pattern.lastIndex;
      }

      if (lastIndex < text.length) {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
      }

      textNode.parentNode.replaceChild(fragment, textNode);
    });
  }
}
