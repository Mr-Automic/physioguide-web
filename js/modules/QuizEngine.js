// وحدة اختبار تفاعلية: تعمل على عرض الأسئلة وتصحيحها فورياً مع تتبع النتيجة
const FALLBACK_QUESTIONS = [
  {
    question:
      "ما هو الرباط المسؤول عن منع الانزلاق الأمامي لعظمة القصبة (Tibia)؟",
    options: [
      "الرباط الصليبي الخلفي (PCL)",
      "الرباط الصليبي الأمامي (ACL)",
      "الرباط الجانبي الإنسي (MCL)",
      "الرباط الجانبي الوحشي (LCL)",
    ],
    answer: 1,
    explanation:
      "يمنع الرباط الصليبي الأمامي (ACL) الانزلاق الأمامي لعظمة القصبة ويعتبر من أكثر أربطة الركبة عرضة للإصابة.",
  },
  {
    question: "ما نوع الغضروف الذي تتكون منه الغضاريف الهلالية (Menisci)؟",
    options: [
      "الغضروف الزجاجي (Hyaline Cartilage)",
      "الغضروف المرن (Elastic Cartilage)",
      "الغضروف الليفي (Fibrocartilage)",
      "نسيج عظمي مضغوط",
    ],
    answer: 2,
    explanation:
      "تتكون الغضاريف الهلالية من الغضروف الليفي (Fibrocartilage) الذي يوفر مقاومة عالية للضغط والشد.",
  },
  {
    question:
      "ما المدى الطبيعي التقريبي لحركة الثني (Flexion) في الركبة السليمة؟",
    options: ["0° إلى 60°", "0° إلى 90°", "0° إلى 135°", "0° إلى 180°"],
    answer: 2,
    explanation:
      "يبلغ المدى الطبيعي للثني في الركبة حوالي 0° إلى 135°، وهو مرجع أساسي في التقييم الحركي.",
  },
];

export default class QuizEngine {
  /**
   * @param {HTMLElement} container - الحاوية التي سيتم حقن الأسئلة فيها
   * @param {HTMLElement} scoreEl - عنصر عرض النتيجة
   * @param {Array} questions - مصفوفة الأسئلة (اختياري، مع بيانات احتياطية مدمجة)
   */
  constructor(container, scoreEl, questions) {
    if (!container) {
      console.warn("Quiz container not found in the DOM.");
      return;
    }

    this.container = container;
    this.scoreEl = scoreEl;
    this.questions =
      Array.isArray(questions) && questions.length > 0
        ? questions
        : FALLBACK_QUESTIONS;

    // حالة التتبع
    this.score = 0;
    this.answeredCount = 0;

    this.render();
  }

  // بناء واجهة الأسئلة ديناميكياً داخل الحاوية
  render() {
    this.container.innerHTML = "";

    this.questions.forEach((question, questionIndex) => {
      const block = document.createElement("div");
      block.className = "quiz-question";
      block.dataset.index = questionIndex;

      // نص السؤال
      const questionText = document.createElement("p");
      questionText.className = "quiz-question__text";
      questionText.textContent = `${questionIndex + 1}. ${question.question}`;
      block.appendChild(questionText);

      // خيارات الإجابة
      const optionsWrapper = document.createElement("div");
      optionsWrapper.className = "quiz-options";

      question.options.forEach((option, optionIndex) => {
        const optionBtn = document.createElement("button");
        optionBtn.type = "button";
        optionBtn.className = "quiz-option";
        optionBtn.textContent = option;

        optionBtn.addEventListener("click", () =>
          this.handleAnswer(questionIndex, optionIndex, optionBtn, block),
        );

        optionsWrapper.appendChild(optionBtn);
      });

      block.appendChild(optionsWrapper);

      // منطقة التغذية الراجعة الفورية
      const feedback = document.createElement("div");
      feedback.className = "quiz-feedback";
      feedback.setAttribute("aria-live", "polite");
      block.appendChild(feedback);

      this.container.appendChild(block);
    });

    this.updateScore();
  }

  // معالجة اختيار المستخدم وتصحيح الإجابة فورياً
  handleAnswer(questionIndex, optionIndex, clickedBtn, block) {
    // منع تكرار الإجابة على نفس السؤال
    if (block.dataset.answered === "true") return;
    block.dataset.answered = "true";

    const question = this.questions[questionIndex];
    const isCorrect = optionIndex === question.answer;

    // تعطيل كل الأزرار وتلوين الإجابة الصحيحة
    const optionButtons = block.querySelectorAll(".quiz-option");
    optionButtons.forEach((btn, index) => {
      btn.disabled = true;
      if (index === question.answer) {
        btn.classList.add("quiz-option--correct");
      }
    });

    // تلوين الاختيار الخاطئ إن وُجد
    if (!isCorrect) {
      clickedBtn.classList.add("quiz-option--wrong");
    } else {
      clickedBtn.classList.add("quiz-option--correct");
    }

    // عرض التفسير الفوري
    const feedback = block.querySelector(".quiz-feedback");
    feedback.textContent = `${isCorrect ? "✔️ صحيح!" : "❌ خطأ!"} ${
      question.explanation
    }`;
    feedback.classList.add(
      isCorrect ? "quiz-feedback--correct" : "quiz-feedback--wrong",
    );

    // تحديث النتيجة
    if (isCorrect) {
      this.score += 1;
    }
    this.answeredCount += 1;
    this.updateScore();
  }

  // عرض النتيجة الحالية وإجمالية عند الانتهاء
  updateScore() {
    if (!this.scoreEl) return;

    this.scoreEl.textContent = `النتيجة: ${this.score} من ${this.questions.length}`;

    // عند إتمام جميع الأسئلة، أضف رسالة ختامية
    if (this.answeredCount === this.questions.length) {
      const total = this.questions.length;
      const percent = Math.round((this.score / total) * 100);
      const grade =
        percent === 100
          ? "ممتاز! أداء رائع 🎯"
          : percent >= 66
            ? "جيد جداً! واصل التفوق 💪"
            : "راجع الدرس مرة أخرى ثم أعد المحاولة 📚";

      this.scoreEl.textContent += ` — ${grade}`;
    }
  }
}
