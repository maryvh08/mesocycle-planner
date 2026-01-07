document.addEventListener("DOMContentLoaded", () => {
  console.log("script.js cargado correctamente ✅");

  let currentSession = null;
  let activeMesocycle = null;

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

  // =======================
  // AUTH
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
    authInputs.style.display = "block";
    userInfo.style.display = "none";
    logoutBtn.style.display = "none";

    mesocycleSelect.innerHTML = "";
    templateSelect.innerHTML = "";
    activeMesocycle = null;
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
    templateSelect.innerHTML =
      `<option value="">Cargando plantillas...</option>`;

    const { data, error } = await supabaseClient
      .from("mesocycle_templates")
      .select("id, name")
      .order("name");

    if (error) {
      console.error(error);
      templateSelect.innerHTML =
        `<option value="">Error</option>`;
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
  // MESOCYCLES
  // =======================
  async function loadMesocycles() {
    const userId = currentSession.user.id;

    const { data, error } = await supabaseClient
      .from("mesocycles")
      .select("id, is_active, template_id")
      .eq("user_id", userId);

    if (error) {
      console.error(error);
      return;
    }

    mesocycleSelect.innerHTML = "";

    for (const m of data) {
      const { data: tpl } = await supabaseClient
        .from("mesocycle_templates")
        .select("name")
        .eq("id", m.template_id)
        .single();

      const opt = document.createElement("option");
      opt.value = m.id;
      opt.textContent = tpl?.name ?? "Mesociclo";
      if (m.is_active) opt.selected = true;

      mesocycleSelect.appendChild(opt);
    }
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
  // CREAR MESOCICLO
  // =======================
  document
    .getElementById("create-mesocycle-btn")
    .addEventListener("click", async () => {

      const templateId = templateSelect.value;
      const startDate = document.getElementById("mesocycle-start").value;
      const endDate = document.getElementById("mesocycle-end").value;

      if (!templateId || !startDate || !endDate) {
        alert("Completa todos los campos");
        return;
      }

      const userId = currentSession.user.id;

      await supabaseClient
        .from("mesocycles")
        .update({ is_active: false })
        .eq("user_id", userId);

      const { error } = await supabaseClient
        .from("mesocycles")
        .insert({
          user_id: userId,
          template_id: templateId,
          start_date: startDate,
          end_date: endDate,
          is_active: true
        });

      if (error) {
        console.error(error);
        alert(error.message);
        return;
      }

      await loadMesocycles();
      await loadActiveMesocycle();

      alert("Mesociclo creado y activado ✅");
    });
});
