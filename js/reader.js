// نقطة دخول مخصصة لصفحة القارئ الاكاديمي
import ThemeManager from "./modules/ThemeManager.js";
import SidebarManager from "./modules/SidebarManager.js";
import ScrollBtn from "./modules/ScrollBtn.js";
import TocManager from "./modules/TocManager.js";
import QuizEngine from "./modules/QuizEngine.js";
import AnatomyExploder from "./modules/AnatomyExploder.js";

document.addEventListener("DOMContentLoaded", () => {
  // المكونات المشتركة مع بقية صفحات الموقع
  new ThemeManager();
  new SidebarManager();
  new ScrollBtn();

  // تهيئة الفهرس الجانبي التلقائي (مع طبقة معتمة مستقلة خاصة بالفهرس)
  new TocManager(
    document.getElementById("toc-nav"),
    document.getElementById("toc-sidebar"),
    document.getElementById("reader-content"),
    document.getElementById("toc-toggle-btn"),
    document.getElementById("toc-close-btn"),
    document.getElementById("toc-overlay"),
  );

  // تهيئة محرك الاختبار مع محاولة جلب البيانات من ملف JSON
  const quizContainer = document.getElementById("quiz-container");
  const quizScore = document.getElementById("quiz-score");

  if (quizContainer) {
    fetch("data/sample-lesson.json")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        // تمرير أسئلة القارئ من البيانات، مع بيانات احتياطية داخل المحرك
        new QuizEngine(quizContainer, quizScore, data.quiz);
      })
      .catch((error) => {
        console.warn("Failed to load sample lesson data:", error);
        // في حال تعذر التحميل، يعمل المحرك ببياناته المدمجة
        new QuizEngine(quizContainer, quizScore);
      });
  }

  // تهيئة مختبر التفكيك التفاعلي (عظام اليد والرسغ)
  const svgContainer = document.getElementById("svg-container");
  if (svgContainer) {
    new AnatomyExploder("#svg-container", {
      svgUrl: "images/carpal_hand.svg",
      explodeButton: "#btn-explode",
      assembleButton: "#btn-assemble",
    });
  }
});
