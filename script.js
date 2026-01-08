console.log("🔥 script.js cargado correctamente");

// =======================
// GLOBAL STATE
// =======================
let currentSession = null;
let activeMesocycle = null;

// =======================
// DOM READY
// =======================
document.addEventListener("DOMContentLoaded", async () => {

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
  const mesocycleSelect = document.getElementById("mesocycle-select");
  const createBtn = document.getElementById("create-mesocycle-btn");

  // =======================
  // INIT AUTH
  // =======================
  async function initAuth() {
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (session) {
      currentSession = session;
      renderLoggedIn(session);
      await loadMesocycleTemplates();
      await loadMesocycles();
      await loadActiveMesocycle();
    } else {
      renderLoggedOut();
    }
  }

  // =======================
  // AUTH ACTIONS
  // =======================
  signupBtn.onclick = async () => {
    const { error } = await supabaseClient.auth.signUp({
      email: emailInput.value,
      password: passwordInput.value
    });
    if (error) alert(error.message);
  };

  loginBtn.onclick = async () => {
    const { error } = await supabaseClient.auth.signInWithPassword({
      email: emailInput.value,
      password: passwordInput.value
    });
    if (error) alert(error.message);
  };

  logoutBtn.onclick = async () => {
    await supabaseClient.auth.signOut();
  };

  // =======================
  // AUTH STATE
  // =======================
  supabaseClient.auth.onAuthStateChange(async (_event, session) => {
    currentSession = session;

    if (!session) {
      renderLoggedOut();
      return;
    }

    renderLoggedIn(session);
    await loadMesocycleTemplates();
    await loadMesocycles();
    await loadActiveMesocycle();
  });

  // =======================
  // UI STATES
  // =======================
  function renderLoggedOut() {
    currentSession = null;
    activeMesocycle = null;

    authInputs.style.display = "block";
    userInfo.style.display = "none";
    logoutBtn.style.display = "none";

    mesocycleSelect.innerHTML = `<option>Inicia sesión</option>`;
    mesocycleSelect.disabled = true;

    templateSelect.innerHTML = `<option>Inicia sesión</option>`;
    templateSelect.disabled = true;

    createBtn.disabled = true;
  }

  function renderLoggedIn(session) {
    authInputs.style.display = "none";
    userInfo.style.display = "block";
    logoutBtn.style.display = "inline-block";

    userEmail.textContent = session.user.email;

    mesocycleSelect.disabled = false;
    templateSelect.disabled = false;
    createBtn.disabled = false;
  }

  // =======================
  // PLANTILLAS
  // =======================
  async function loadMesocycleTemplates() {
    templateSelect.innerHTML = `<option>Cargando plantillas...</option>`;

    const { data, error } = await supabaseClient
      .from("mesocycle_templates")
      .select("id, name")
      .order("name");

    if (error) {
      console.error("Error cargando plantillas:", error);
      templateSelect.innerHTML = `<option>Error</option>`;
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

  // =======================
  // MESOCICLOS
  // =======================
  async function loadMesocycles() {
    const userId = currentSession.user.id;

    const { error } = await supabaseClient
      .from("mesocycles")
      .insert({
        user_id: userId,
        template_id: templateId,   // FK válido
        name: mesocycleName,       // NOT NULL
        goal: null,                // o string si quieres
        start_date: startDate,
        end_date: endDate,
        is_date: true              // 👈 ESTA ES LA COLUMNA REAL
      });


    mesocycleSelect.innerHTML = "";

    if (!data || data.length === 0) {
      mesocycleSelect.innerHTML =
        `<option>No hay mesociclos</option>`;
      return;
    }

    data.forEach(m => {
      const opt = document.createElement("option");
      opt.value = m.id;
      opt.textContent = m.name;
      if (m.is_active) opt.selected = true;
      mesocycleSelect.appendChild(opt);
    });
  }

  async function loadActiveMesocycle() {
    const userId = currentSession.user.id;

    const { data } = await supabaseClient
      .from("mesocycles")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .single();

    activeMesocycle = data || null;
  }

  // =======================
  // CREAR MESOCICLO (FIX DEFINITIVO)
  // =======================
  createBtn.addEventListener("click", async () => {
    try {
      if (!currentSession) {
        alert("No hay sesión activa");
        return;
      }
  
      const templateId = templateSelect.value;
      const startDate = document.getElementById("mesocycle-start").value;
      const endDate = document.getElementById("mesocycle-end").value;
  
      if (!templateId) {
        alert("Selecciona una plantilla");
        return;
      }
  
      if (!startDate || !endDate) {
        alert("Selecciona fechas válidas");
        return;
      }
  
      const userId = currentSession.user.id;
  
      // Obtener plantilla
      const { data: template, error: tplError } = await supabaseClient
        .from("mesocycle_templates")
        .select("name")
        .eq("id", templateId)
        .single();
  
      if (tplError || !template) {
        console.error("Error plantilla:", tplError);
        alert("No se pudo cargar la plantilla");
        return;
      }
  
      const mesocycleName =
        `${template.name} (${startDate} → ${endDate})`;
  
      // Desactivar mesociclos activos
      await supabaseClient
        .from("mesocycles")
        .update({ is_active: false })
        .eq("user_id", userId);
  
      // Crear mesociclo
      const { error } = await supabaseClient
        .from("mesocycles")
        .insert({
          user_id: userId,
          template_id: templateId,
          name: mesocycleName,
          start_date: startDate,
          end_date: endDate,
          is_active: true
        });
  
      if (error) {
        console.error("Error creando mesociclo:", error);
        alert(error.message);
        return;
      }
  
      await loadMesocycles();
      await loadActiveMesocycle();
  
      alert("Mesociclo creado correctamente ✅");
  
    } catch (err) {
      console.error("CRASH capturado:", err);
      alert("Error crítico al crear el mesociclo");
    }
  });

  // =======================
  // START
  // =======================
  await initAuth();
});
