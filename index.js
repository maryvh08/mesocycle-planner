// index.js

document.addEventListener("DOMContentLoaded", () => {

  // ===== Fade-in / Fade-up Animations =====
  const fadeElements = document.querySelectorAll(".fade-up, .fade-in");

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  fadeElements.forEach(el => observer.observe(el));

  // ===== Smooth Scroll for Hero Buttons =====
  const heroButtons = document.querySelectorAll(".cta-btn");
  heroButtons.forEach(btn => {
    btn.addEventListener("click", e => {
      const href = btn.getAttribute("href");
      if (href.startsWith("#")) {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) target.scrollIntoView({ behavior: "smooth" });
      }
    });
  });

  // ===== Signup / Auth Form Handling =====
  const signupForm = document.querySelector(".signup-card");
  const signupMsg = document.querySelector("#signup-msg");

  if (signupForm) {
    signupForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const email = signupForm.querySelector("input[type='email']").value.trim();
      const password = signupForm.querySelector("input[type='password']").value.trim();

      // Validación básica
      if (!email || !password) {
        showMessage("Por favor completa todos los campos", "error");
        return;
      }

      if (!validateEmail(email)) {
        showMessage("Correo electrónico inválido", "error");
        return;
      }

      if (password.length < 6) {
        showMessage("La contraseña debe tener al menos 6 caracteres", "error");
        return;
      }

      // Simular registro exitoso
      showMessage("¡Registro exitoso! Redirigiendo...", "success");

      setTimeout(() => {
        window.location.href = "app.html"; // Redirigir a la app
      }, 1500);
    });
  }

  // ===== Generic Auth Form Handling (login/signup) =====
  const authCard = document.querySelector(".auth-card");
  const authMsg = authCard ? authCard.querySelector(".auth-message") : null;

  if (authCard) {
    authCard.addEventListener("submit", e => {
      e.preventDefault();

      const email = authCard.querySelector("input[type='email']").value.trim();
      const password = authCard.querySelector("input[type='password']").value.trim();

      if (!email || !password) {
        showAuthMessage("Completa todos los campos", "error");
        return;
      }

      if (!validateEmail(email)) {
        showAuthMessage("Correo electrónico inválido", "error");
        return;
      }

      if (password.length < 6) {
        showAuthMessage("La contraseña debe tener al menos 6 caracteres", "error");
        return;
      }

      // Simular login exitoso
      showAuthMessage("¡Bienvenido! Redirigiendo...", "success");
      setTimeout(() => {
        window.location.href = "app.html";
      }, 1200);
    });
  }

  // ===== Helper Functions =====
  function showMessage(msg, type) {
    if (!signupMsg) return;
    signupMsg.textContent = msg;
    signupMsg.style.color = type === "success" ? "#5cff8d" : "#ff4d4d";
    signupMsg.classList.add("visible");
  }

  function showAuthMessage(msg, type) {
    if (!authMsg) return;
    authMsg.textContent = msg;
    authMsg.classList.remove("success", "error");
    authMsg.classList.add(type === "success" ? "success" : "error");
  }

  function validateEmail(email) {
    // Expresión regular simple para email
    return /^\S+@\S+\.\S+$/.test(email);
  }

});
