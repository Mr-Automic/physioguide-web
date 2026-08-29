export default class ThemeManager {
  constructor() {
    // 1. تحديد العناصر (Encapsulated Properties)
    // ندعم أكثر من زر تبديل (شريط التنقل + القائمة الجانبية) عبر فئة موحدة
    this.toggleButtons = document.querySelectorAll(".theme-toggle-btn");
    this.icons = document.querySelectorAll(".theme-icon");

    // 2. التحقق المسبق لمنع انهيار السكريبت إذا لم تكن الأزرار موجودة بالصفحة
    if (this.toggleButtons.length === 0) {
      console.warn("Theme toggle button not found in the DOM.");
      return;
    }

    // 3. جلب الحالة المحفوظة
    this.currentTheme = localStorage.getItem("theme");

    // 4. تشغيل النظام
    this.init();
  }

  init() {
    // تطبيق الوضع الليلي فوراً إذا كان محفوظاً
    if (this.currentTheme === "dark") {
      this.enableDarkTheme();
    }

    // ربط الحدث لكل أزرار التبديل الموجودة في الصفحة
    this.toggleButtons.forEach((btn) => {
      btn.addEventListener("click", () => this.handleToggle());
    });
  }

  enableDarkTheme() {
    document.documentElement.setAttribute("data-theme", "dark");
    localStorage.setItem("theme", "dark");
    this.icons.forEach((icon) => (icon.textContent = "☀️"));
  }

  enableLightTheme() {
    document.documentElement.removeAttribute("data-theme");
    localStorage.setItem("theme", "light");
    this.icons.forEach((icon) => (icon.textContent = "🌙"));
  }

  handleToggle() {
    const isDark =
      document.documentElement.getAttribute("data-theme") === "dark";

    if (isDark) {
      this.enableLightTheme();
    } else {
      this.enableDarkTheme();
    }
  }
}
