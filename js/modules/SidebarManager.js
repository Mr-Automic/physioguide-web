export default class SidebarManager {
  constructor() {
    this.toggleBtn = document.getElementById("mobile-menu-toggle");
    this.sidebar = document.getElementById("mobile-sidebar");
    this.overlay = document.getElementById("sidebar-overlay");
    this.isOpen = false;

    if (!this.toggleBtn || !this.sidebar || !this.overlay) {
      console.warn("Sidebar elements not found in the DOM.");
      return;
    }

    this.init();
  }

  init() {
    // فتح/إغلاق عند ضغط الزر
    this.toggleBtn.addEventListener("click", () => this.toggle());

    // إغلاق عند النقر على الطبقة المعتمة
    this.overlay.addEventListener("click", () => this.close());

    // إغلاق عند الضغط على زر Esc في لوحة المفاتيح (Accessibility)
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.isOpen) this.close();
    });
  }

  toggle() {
    this.isOpen ? this.close() : this.open();
  }

  open() {
    this.sidebar.classList.add("mobile-sidebar--open");
    this.overlay.classList.add("overlay--visible");
    // قفل التمرير (Scroll) في الصفحة الخلفية
    document.body.style.overflow = "hidden";
    this.isOpen = true;
  }

  close() {
    this.sidebar.classList.remove("mobile-sidebar--open");
    this.overlay.classList.remove("overlay--visible");
    // إعادة التمرير للصفحة الخلفية
    document.body.style.overflow = "";
    this.isOpen = false;
  }
}
