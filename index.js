// Espera a que el DOM esté completamente cargado
document.addEventListener("DOMContentLoaded", () => {

  // ===== Fade-in / Fade-up Animations =====
  const observerOptions = {
    threshold: 0.1
  };

  const fadeElements = document.querySelectorAll(".fade-up, .fade-in");

  const fadeObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target); // animar solo una vez
      }
    });
  }, observerOptions);

  fadeElements.forEach(el => fadeObserver.observe(el));

  // ===== Smooth Scroll for Hero Buttons =====
  const heroButtons = document.querySelectorAll(".cta-btn");
  heroButtons.forEach(btn => {
    btn.addEventListener("click", e => {
      const targetId = btn.getAttribute("href");
      if (targetId.startsWith("#")) {
        e.preventDefault();
        const targetSection = document.querySelector(targetId);
        if (targetSection) {
          targetSection.scrollIntoView({ behavior: "smooth" });
        }
      }
    });
  });

  // ===== Optional: Mobile menu toggle =====
  const menuToggle = document.querySelector(".menu-toggle");
  const navMenu = document.querySelector(".nav-menu");
  if (menuToggle && navMenu) {
    menuToggle.addEventListener("click", () => {
      navMenu.classList.toggle("active");
    });
  }

});
