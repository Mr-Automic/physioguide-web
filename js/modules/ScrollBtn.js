export default class ScrollBtn {
  constructor() {
    // جلب العنصر من شجرة الـ DOM
    this.scrollBtn = document.getElementById("smartScrollBtn");

    // التحقق المنطقي: إذا لم يكن الزر موجوداً في الصفحة، أوقف التنفيذ لمنع الأخطاء
    if (!this.scrollBtn) {
      console.warn("ScrollBtn element not found in the DOM.");
      return;
    }

    // تشغيل الأحداث
    this.init();
  }

  init() {
    // نستخدم الدوال السهمية (Arrow Functions) لضمان أن 'this' تشير إلى الكلاس وليس إلى العنصر الذي أطلق الحدث
    window.addEventListener("scroll", () => this.handleScroll());
    this.scrollBtn.addEventListener("click", () => this.handleClick());
  }

  handleScroll() {
    // مراقبة التمرير لتغيير حالة الزر (أعلى/أسفل)
    // العتبة 400px: يظهر الزر فقط بعد تجاوزها لئلا يحجب بداية المقال
    if (
      document.body.scrollTop > 400 ||
      document.documentElement.scrollTop > 400
    ) {
      this.scrollBtn.classList.remove("scroll-btn--hidden");
      this.scrollBtn.classList.add("scroll-up");
    } else {
      this.scrollBtn.classList.remove("scroll-up");
      this.scrollBtn.classList.add("scroll-btn--hidden");
    }
  }

  handleClick() {
    // الصعود للأعلى (الزر يظهر فقط بعد التمرير 400px)
    if (this.scrollBtn.classList.contains("scroll-up")) {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  }
}
