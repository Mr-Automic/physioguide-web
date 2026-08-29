// استيراد الكلاس من ملف الوحدة
import ThemeManager from "./modules/ThemeManager.js";
import SidebarManager from "./modules/SidebarManager.js";
import ScrollBtn from "./modules/ScrollBtn.js";
// ننتظر حتى يقوم المتصفح ببناء شجرة الـ DOM بالكامل قبل تشغيل أي كود
document.addEventListener("DOMContentLoaded", () => {
  // أخذ نسخة (Instance) من الكائن لتشغيله
  new ThemeManager();
  new SidebarManager();
  new ScrollBtn();
  // إذا كان لديك مكونات أخرى مستقبلاً (مثل مشغل فيديو أو قائمة منبثقة)،
  // ستقوم باستيرادها وتشغيلها هنا بنفس الطريقة النظيفة.
});
