document.addEventListener("DOMContentLoaded", () => {
  console.log("script.js cargado correctamente ✅");
  let currentSession = null;

  // =======================
  // ELEMENTOS
  // =======================
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");

  const signupBtn = document.getElementById("signup-btn");
  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");

  const authInputs = document.getElementById("auth-inputs");
  const userInfo = document.getElementById("user-info");
  const userEmail = document.getElementById("user-email");

  const templateSelect = document.getElementById("template-select");

  // =======================
  // AUTH BUTTONS
  // =======================
  signupBtn.addEventListener("click", async () => {
    const email = emailInput.value;
    const password = passwordInput.value;

    const { error } = await supabaseClient.auth.signUp({ email, password });
    if (error) {
      alert(error.message);
    } else {
      alert("Usuario registrado. Revisa tu correo.");
    }
  });

  loginBtn.addEventListener("click", async () => {
    const email = emailInput.value;
    const password = passwordInput.value;

    const { error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) alert(error.message);
  });

  logoutBtn.addEventListener("click", async () => {
    console.log("Click en salir");
    const { error } = await supabaseClient.auth.signOut();
    if (error) alert(error.message);
  });

  // =======================
  // AUTH STATE (UNO SOLO)
  // =======================
  supabaseClient.auth.onAuthStateChange((_event, session) => {
    currentSession = session;
  
    if (!session) {
      renderLoggedOut();
      return;
    }
  
    renderLoggedIn(session);
    loadMesocycleTemplates();
    loadMesocycles().then(loadActiveMesocycle);
  });

  // =======================
  // UI STATES
  // =======================
  function renderLoggedOut() {
    authInputs.style.display = "block";
    userInfo.style.display = "none";
    logoutBtn.style.display = "none";

    if (templateSelect) {
      templateSelect.innerHTML =
        `<option value="">Inicia sesión</option>`;
    }
  }

  function renderLoggedIn(session) {
    authInputs.style.display = "none";
    userInfo.style.display = "block";
    logoutBtn.style.display = "inline-block";
    userEmail.textContent = session.user.email;
  }

  // =======================
  // PLANTILLAS
  // =======================
  async function loadMesocycleTemplates() {
    if (!templateSelect) return;

    templateSelect.innerHTML =
      `<option value="">Cargando plantillas...</option>`;

    const { data, error } = await supabaseClient
      .from("mesocycle_templates")
      .select("id, name")
      .order("name");

    if (error) {
      console.error("Error plantillas:", error);
      templateSelect.innerHTML =
        `<option value="">Error al cargar</option>`;
      return;
    }

    if (!data || data.length === 0) {
      templateSelect.innerHTML =
        `<option value="">No hay plantillas</option>`;
      return;
    }

    templateSelect.innerHTML =
      `<option value="">Selecciona plantilla</option>`;

    data.forEach(t => {
      const opt = document.createElement("option");
      opt.value = t.id;
      opt.textContent = t.name;
      templateSelect.appendChild(opt);
    });
  }
  document
    .getElementById("create-mesocycle-btn")
    .addEventListener("click", async () => {
  
      if (!currentSession) {
        alert("Sesión no disponible");
        return;
      }
  
      const templateId = document.getElementById("template-select").value;
      const startDate = document.getElementById("mesocycle-start").value;
      const endDate = document.getElementById("mesocycle-end").value;
  
      if (!templateId || !startDate || !endDate) {
        alert("Completa todos los campos");
        return;
      }
  
      const userId = currentSession.user.id; // ✅ SIEMPRE válido
  
      // Desactivar mesociclo activo
      await supabaseClient
        .from("mesocycles")
        .update({ is_active: false })
        .eq("user_id", userId);
  
      // Crear nuevo mesociclo
      const { data, error } = await supabaseClient
        .from("mesocycles")
        .insert({
          user_id: user.id,
          template_id: templateId,
          start_date: startDate,
          end_date: endDate,
          is_active: true
        })
        .select()
        .single();
  
      if (error) {
        console.error("ERROR CREANDO MESOCICLO:", error);
        alert(error.message);
        return;
      }
  
      activeMesocycle = data;
  
      await loadMesocycles();
      await loadExercisesForMesocycle();
      loadWorkouts();
  
      alert("Mesociclo creado y activado ✅");
    });
});
