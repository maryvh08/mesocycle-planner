import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabase = createClient(
  "https://vhwfenefevzzksxrslkx.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZod2ZlbmVmZXZ6emtzeHJzbGt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MTE3ODAsImV4cCI6MjA4MzQ4Nzc4MH0.CG1KzxpxGHifXsgBvH-4E4WvXbj6d-8WsagqaHAtVwo"
);

document.getElementById("signup-btn").onclick = async () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  const msg = document.getElementById("signup-msg");

  if (!email || !password) {
    msg.textContent = "Ingresa email y contraseña.";
    return;
  }

  msg.textContent = "Creando cuenta...";

  const { error } = await supabase.auth.signUp({ email, password });

  if (error) {
    msg.textContent = error.message;
    return;
  }

  msg.textContent = "Cuenta creada. Redirigiendo...";
  setTimeout(() => {
    window.location.href = "app.html";
  }, 1000);
};

// Crée un nouvel IntersectionObserver
const observer = new IntersectionObserver(
  (entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Ajoute la classe "visible" quand l'élément apparaît
        entry.target.classList.add("visible");
        // Arrête d'observer cet élément
        observer.unobserve(entry.target);
      }
    });
  },
  {
    threshold: 0.15 // Déclenchement quand 15% de l'élément est visible
  }
);

// Sélectionne tous les éléments à observer
const elements = document.querySelectorAll(".fade-up, .fade-in");

// Vérifie que des éléments existent avant d'observer
if (elements.length) {
  elements.forEach(el => observer.observe(el));
}
