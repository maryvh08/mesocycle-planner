import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabase = createClient(
  "https://vhwfenefevzzksxrslkx.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZod2ZlbmVmZXZ6emtzeHJzbGt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MTE3ODAsImV4cCI6MjA4MzQ4Nzc4MH0.CG1KzxpxGHifXsgBvH-4E4WvXbj6d-8WsagqaHAtVwo"
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
