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

  // بحث مباشر + روابط الفلترة داخل شبكة الأقسام الأكاديمية
  initCategorySearch();
});

/**
 * تصفية بطاقات الأقسام الأكاديمية بناءً على نص البحث،
 * مع دعم روابط الفلترة في القائمة الجانبية (أناتومي / فسيولوجي / تمارين).
 */
function initCategorySearch() {
  const searchInput = document.getElementById("category-search");
  const grid = document.getElementById("categories-grid");

  if (!searchInput || !grid) return;

  const cards = Array.from(grid.querySelectorAll(".category-card"));

  const applyFilter = (query) => {
    const q = query.trim().toLowerCase();

    cards.forEach((card) => {
      const haystack = (
        card.dataset.search || card.textContent || ""
      ).toLowerCase();
      const isMatch = q === "" || haystack.includes(q);

      card.classList.toggle("category-card--hidden", !isMatch);
    });
  };

  searchInput.addEventListener("input", () => applyFilter(searchInput.value));

  // روابط الفلترة داخل القائمة الجانبية
  document.querySelectorAll("[data-filter]").forEach((link) => {
    link.addEventListener("click", () => {
      const term = link.getAttribute("data-filter") || "";
      searchInput.value = term;
      applyFilter(term);
    });
  });
}
