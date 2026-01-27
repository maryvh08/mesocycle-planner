import { supabase } from "./supabase.js";

const signupBtn = document.getElementById("signup-btn");
const msg = document.getElementById("signup-msg");

signupBtn.addEventListener("click", async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  msg.textContent = "Creando cuenta...";

  const { error } = await supabase.auth.signUp({
    email,
    password
  });

  if (error) {
    msg.textContent = error.message;
    return;
  }

  window.location.href = "app.html";
});
