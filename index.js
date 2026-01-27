import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabase = createClient(
  "https://TU_PROYECTO.supabase.co",
  "PUBLIC_ANON_KEY"
);

document.getElementById("signup-btn").onclick = async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const msg = document.getElementById("signup-msg");
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
