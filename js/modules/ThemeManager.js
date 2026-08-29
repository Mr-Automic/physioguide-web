export default class ThemeManager {
  constructor() {
    // 1. تحديد العناصر (Encapsulated Properties)
    this.toggleBtn = document.getElementById("theme-toggle");
    this.icon = document.getElementById("theme-icon");

    // 2. التحقق المسبق لمنع انهيار السكريبت إذا لم تكن الأزرار موجودة بالصفحة
    if (!this.toggleBtn || !this.icon) {
      console.warn("Theme toggle button or icon not found in the DOM.");
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

    // ربط الحدث (Event Listener)
    // استخدام Arrow Function هنا ضروري للحفاظ على سياق 'this' العائد للـ Class
    this.toggleBtn.addEventListener("click", () => this.handleToggle());
  }

  enableDarkTheme() {
    document.documentElement.setAttribute("data-theme", "dark");
    localStorage.setItem("theme", "dark");
    this.icon.textContent = "☀️";
  }

  enableLightTheme() {
    document.documentElement.removeAttribute("data-theme");
    localStorage.setItem("theme", "light");
    this.icon.textContent = "🌙";
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
