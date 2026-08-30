// استيراد الوحدات (Modules) الخاصة بالصفحة الرئيسية
import ThemeManager from "./modules/ThemeManager.js";
import SidebarManager from "./modules/SidebarManager.js";
import ScrollBtn from "./modules/ScrollBtn.js";
import GreetingManager from "./modules/GreetingManager.js";

// ننتظر بناء شجرة الـ DOM بالكامل قبل تشغيل أي كود
document.addEventListener("DOMContentLoaded", () => {
  new ThemeManager();
  new SidebarManager();
  new ScrollBtn();
  new GreetingManager();

  // بحث مباشر داخل شبكة الأقسام الأكاديمية
  initCategorySearch();
});

/**
 * تصفية بطاقات الأقسام الأكاديمية بناءً على نص البحث.
 */
function initCategorySearch() {
  const searchInput = document.getElementById("category-search");
  const grid = document.getElementById("categories-grid");

  if (!searchInput || !grid) return;

  const cards = Array.from(grid.querySelectorAll(".category-card"));

  searchInput.addEventListener("input", () => {
    const query = searchInput.value.trim().toLowerCase();

    cards.forEach((card) => {
      const haystack = (
        card.dataset.search || card.textContent || ""
      ).toLowerCase();
      const isMatch = query === "" || haystack.includes(query);

      card.classList.toggle("category-card--hidden", !isMatch);
    });
  });
}
