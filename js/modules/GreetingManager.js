/**
 * وحدة الترحيب الديناميكي حسب الوقت المحلي للمستخدم.
 * تحقن شارة الترحيب داخل قسم البطل (Hero) في الصفحة الرئيسية.
 */
export default class GreetingManager {
  constructor() {
    this.badge = document.getElementById("greeting-badge");

    if (!this.badge) {
      console.warn("Greeting badge element not found in the DOM.");
      return;
    }

    this.render();
  }

  /**
   * تحديد نص التحية ونوعها بناءً على الساعة الحالية.
   * @returns {{text: string, type: "morning" | "evening"}}
   */
  getGreeting() {
    const hour = new Date().getHours();

    // صباح الخير: من 05:00 صباحاً حتى 11:59 ظهراً
    if (hour >= 5 && hour < 12) {
      return { text: "صباح الخير ☀️ Good Morning", type: "morning" };
    }

    // مساء الخير: من 12:00 ظهراً حتى 04:59 فجراً
    return { text: "مساء الخير 🌙 Good Evening", type: "evening" };
  }

  render() {
    const { text, type } = this.getGreeting();

    this.badge.textContent = text;
    this.badge.classList.add(`greeting-badge--${type}`);
    this.badge.setAttribute("data-greeting", type);
  }
}
