document.addEventListener("DOMContentLoaded", () => {
  console.log("JS cargado correctamente");

  // ===== ELEMENTOS =====
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");

  const signupBtn = document.getElementById("signup-btn");
  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");

  const authInputs = document.getElementById("auth-inputs");
  const userInfo = document.getElementById("user-info");
  const userEmail = document.getElementById("user-email");

  // ===== BOTONES AUTH =====
  signupBtn.addEventListener("click", async () => {
    const { error } = await supabaseClient.auth.signUp({
      email: emailInput.value,
      password: passwordInput.value
    });
    if (error) alert(error.message);
  });

  loginBtn.addEventListener("click", async () => {
    const { error } = await supabaseClient.auth.signInWithPassword({
      email: emailInput.value,
      password: passwordInput.value
    });
    if (error) alert(error.message);
  });

  logoutBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    console.log("Intentando cerrar sesión...");
    const { error } = await supabaseClient.auth.signOut();
    if (error) alert(error.message);
  });

  // ===== ESTADO DE SESIÓN (UNA SOLA VEZ) =====
  supabaseClient.auth.onAuthStateChange((_event, session) => {
    console.log("Auth event:", _event);

    if (!session) {
      // 🔴 USUARIO FUERA
      authInputs.style.display = "block";
      userInfo.style.display = "none";
      logoutBtn.style.display = "none";
      userEmail.textContent = "";
      return;
    }

    // 🟢 USUARIO DENTRO
    authInputs.style.display = "none";
    userInfo.style.display = "block";
    logoutBtn.style.display = "inline-block";
    userEmail.textContent = session.user.email;
  });
});
