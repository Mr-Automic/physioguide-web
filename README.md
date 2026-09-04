# 🩺 PhysioGuide — Mobile-First Academic Platform for Physical Therapy

> An interactive, responsive web platform tailored for 1st and 2nd-year Physical Therapy students. Engineered with zero external framework dependencies to deliver high-performance anatomical vector breakdowns, structured academic summaries, and instant client-side self-assessments.

---

## 🌟 Key Features

* **📱 Mobile & Tablet First Design:** Tailored specifically for touch interfaces, accommodating dynamic viewports (phones and tablets) with zero layout shifts and responsive drawer navigation.
* **🦴 Interactive SVG Anatomy Exploder:** Targeted DOM manipulation over medical vectors (`carpal_hand.svg`) allowing students to inspect, isolate, and understand bone and muscle relationships dynamically.
* **⚡ 60fps GPU-Accelerated Interactions:** Optimized rendering pipeline utilizing hardware acceleration (`transform: translate3d`, `will-change`) to eliminate frame drops and lag on constrained mobile browsers.
* **📝 Client-Side Quiz Engine:** Built-in modular state machine (`QuizEngine.js`) that handles randomized self-evaluations, immediate visual feedback, and score aggregation without server roundtrips.
* **📖 Adaptive Reading Experience:** Reader mode featuring an interactive Table of Contents (`TocManager.js`), smooth viewport scrolling, and persistent theme states (Dark/Light).

---

## 🛠️ Tech Stack & Philosophy

* **Core Engine:** Vanilla JavaScript (ES6+ Modules) — No React/Vue bloat, ensuring instant cold starts on mobile networks.
* **Styling & Layout:** Modern CSS3 (Grid, Flexbox, Custom Variables, Modular Component Architecture).
* **Assets & Graphics:** Clean SVG vector paths, high-resolution optimized medical plates.
* **State Management:** Native browser Session & LocalStorage APIs.

---

## 📂 Repository Structure

```text
├── css/
│   ├── components/       # Scoped styling (quiz, reader, interactive, sidebar, hero)
│   ├── base.css          # Foundational resets and cross-browser normalizations
│   ├── layout.css        # Responsive mobile/tablet grid definitions
│   └── variables.css     # CSS Custom Properties (design tokens & theming)
├── data/
│   └── sample-lesson.json # Decoupled syllabus and modular study units
├── images/               # High-precision vector plates (SVG) & anatomical media
├── js/
│   ├── modules/          # Discrete business logic units
│   │   ├── AnatomyExploder.js  # Vector path event delegation & animation
│   │   ├── QuizEngine.js       # Assessment lifecycle & state verification
│   │   ├── TocManager.js       # Dynamic syllabus index synchronization
│   │   └── ThemeManager.js     # Client preference synchronization
│   ├── reader.js         # Reader workspace coordinator
│   └── script.js         # Core application bootstrapper
├── index.html            # Main academic portal directory
├── interactive-demo.html # Dedicated interactive vector exploration view
└── reader.html           # Structured lesson reading environment
