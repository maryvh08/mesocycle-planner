// ==============================
// SCROLL ANIMATIONS (Premium feel)
// ==============================

const animatedElements = document.querySelectorAll(
  ".fade-up, .fade-in"
);

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  },
  {
    threshold: 0.15
  }
);

animatedElements.forEach(el => observer.observe(el));

// ==============================
// HERO ENTRY (on load)
// ==============================

window.addEventListener("load", () => {
  document.body.classList.add("loaded");
});
