document.addEventListener("DOMContentLoaded", () => {
  console.log("JS cargado");

  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");

  const signupBtn = document.getElementById("signup-btn");
  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");

  const authInputs = document.getElementById("auth-inputs");
  const userInfo = document.getElementById("user-info");
  const userEmail = document.getElementById("user-email");

  // ---------- BOTONES ----------
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
    const { error } = await supabaseClient.auth.signOut();
    if (error) alert(error.message);
  };

  // ---------- ESTADO ----------
  supabaseClient.auth.onAuthStateChange((_event, session) => {
    console.log("Auth state:", _event);

    if (!session) {
      authInputs.style.display = "block";
      userInfo.style.display = "none";
      logoutBtn.style.display = "none";
      return;
    }

    authInputs.style.display = "none";
    userInfo.style.display = "block";
    logoutBtn.style.display = "inline-block";
    userEmail.textContent = session.user.email;
  });
});

  // =======================
  // SESSION STATE
  // =======================

  supabaseClient.auth.onAuthStateChange(async (_event, session) => {
    console.log("Auth event:", _event);
  
    renderAuthState(session);
  
    if (!session) return;
  
    await loadMesocycleTemplates();
    await loadMesocycles();
  
    const m = await loadActiveMesocycle();
    if (!m) return;
  
    await loadExercisesForMesocycle();
    await loadWorkouts();
  });

    // ✅ LOGIN
    authInputs.style.display = "none";
    logoutBtn.style.display = "inline-block";
    userInfo.style.display = "block";
    userEmail.textContent = session.user.email;

    await loadMesocycleTemplates();
    await loadMesocycles();

    const m = await loadActiveMesocycle();
    if (!m) return;

    await loadExercisesForMesocycle();
    loadWorkouts();
  });

  // =======================
  // MESOCYCLES
  // =======================

  async function loadMesocycles() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    const { data } = await supabaseClient
      .from("mesocycles")
      .select("id, is_active, mesocycle_templates(name)")
      .eq("user_id", user.id);

    mesocycleSelect.innerHTML = "";

    data.forEach(m => {
      const opt = document.createElement("option");
      opt.value = m.id;
      opt.textContent = m.mesocycle_templates.name;
      if (m.is_active) opt.selected = true;
      mesocycleSelect.appendChild(opt);
    });
  }

  async function loadActiveMesocycle() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return null;

    const { data } = await supabaseClient
      .from("mesocycles")
      .select("id, mesocycle_templates(name)")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (!data) return null;

    activeMesocycle = data;
    document.getElementById("active-mesocycle-name").textContent =
      data.mesocycle_templates.name;

    return data;
  }

  mesocycleSelect.addEventListener("change", async e => {
    const id = e.target.value;
    const { data: { user } } = await supabaseClient.auth.getUser();

    await supabaseClient
      .from("mesocycles")
      .update({ is_active: false })
      .eq("user_id", user.id);

    await supabaseClient
      .from("mesocycles")
      .update({ is_active: true })
      .eq("id", id);

    await loadActiveMesocycle();
    await loadExercisesForMesocycle();
    loadWorkouts();
  });

  // =======================
  // MESOCYCLES TEMPLATES
  // =======================

  async function loadMesocycleTemplates() {
    const select = document.getElementById("template-select");
    if (!select) return;
  
    select.innerHTML = `<option value="">Cargando plantillas...</option>`;

    console.log("Templates data:", data, "error:", error);
  
    const { data, error } = await supabaseClient
      .from("mesocycle_templates")
      .select("id, name, emphasis")
      .order("name");
  
    if (error) {
      console.error("Error cargando plantillas:", error);
      select.innerHTML = `<option value="">Error al cargar</option>`;
      return;
    }
  
    if (!data || data.length === 0) {
      select.innerHTML = `<option value="">No hay plantillas</option>`;
      return;
    }
  
    select.innerHTML = `<option value="">Selecciona plantilla</option>`;
  
    data.forEach(t => {
      const option = document.createElement("option");
      option.value = t.id;                  // ✅ debe existir
      option.textContent = `${t.name} — ${t.emphasis}`;
      select.appendChild(option);
    });
  }

  // =======================
  // EXERCISES
  // =======================

  async function loadExercisesForMesocycle() {
    if (!activeMesocycle) {
      exerciseSelect.innerHTML =
        `<option value="">Selecciona un mesociclo</option>`;
      return;
    }
  
    exerciseSelect.innerHTML =
      `<option value="">Cargando ejercicios...</option>`;
  
    const { data, error } = await supabaseClient.rpc(
      "get_exercises_for_mesocycle",
      { p_mesocycle_id: activeMesocycle.id }
    );
  
    if (error) {
      console.error("RPC get_exercises_for_mesocycle:", error);
      exerciseSelect.innerHTML =
        `<option value="">Error al cargar ejercicios</option>`;
      return;
    }
  
    if (!data || data.length === 0) {
      exerciseSelect.innerHTML =
        `<option value="">No hay ejercicios para este mesociclo</option>`;
      return;
    }
  
    exerciseSelect.innerHTML =
      `<option value="">Selecciona ejercicio</option>`;
  
    data.forEach(ex => {
      const option = document.createElement("option");
      option.value = ex.id;
      option.textContent = ex.name;
      exerciseSelect.appendChild(option);
    });
  }

  // =======================
  // WORKOUTS
  // =======================

  async function loadWorkouts() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user || !activeMesocycle) return;

    const { data } = await supabaseClient
      .from("workouts")
      .select("reps, weight, exercises(name)")
      .eq("user_id", user.id)
      .eq("mesocycle_id", activeMesocycle.id);

    workoutList.innerHTML = "";

    if (data.length === 0) {
      emptyMessage.style.display = "block";
      return;
    }

    emptyMessage.style.display = "none";

    data.forEach(w => {
      const li = document.createElement("li");
      li.textContent = `${w.exercises.name} — ${w.reps} x ${w.weight}kg`;
      workoutList.appendChild(li);
    });
  }
document
  .getElementById("create-mesocycle-btn")
  .addEventListener("click", async () => {

    const templateId = document.getElementById("template-select").value;
    const startDate = document.getElementById("mesocycle-start").value;
    const endDate = document.getElementById("mesocycle-end").value;

    if (!templateId || !startDate || !endDate) {
      alert("Completa todos los campos");
      return;
    }

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    // Desactivar mesociclo activo
    await supabaseClient
      .from("mesocycles")
      .update({ is_active: false })
      .eq("user_id", user.id);

    // Crear nuevo
    const { data, error } = await supabaseClient
      .from("mesocycles")
      .insert({
        user_id: user.id,
        template_id: templateId,
        start_date: startDate,
        end_date: endDate,
        is_active: true
      })
      .select("id, mesocycle_templates(name)")
      .single();

    if (error) {
      console.error(error);
      alert("Error creando mesociclo");
      return;
    }

    activeMesocycle = data;

    await loadMesocycles();
    await loadExercisesForMesocycle();
    loadWorkouts();

    alert("Mesociclo creado y activado ✅");
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
  
    const reps = Number(document.getElementById("reps").value);
    const weight = Number(document.getElementById("weight").value);
    const exerciseId = exerciseSelect.value;
  
    if (!exerciseId || !activeMesocycle) {
      alert("Selecciona mesociclo y ejercicio");
      return;
    }
  
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;
  
    const { error } = await supabaseClient
      .from("workouts")
      .insert({
        user_id: user.id,
        exercise_id: exerciseId,
        reps,
        weight,
        mesocycle_id: activeMesocycle.id
      });
  
    if (error) {
      console.error(error);
      alert("Error al guardar");
      return;
    }
  
    form.reset();
    loadWorkouts();
  });
  function renderAuthState(session) {
    if (!session) {
      authInputs.style.display = "block";
      userInfo.style.display = "none";
      logoutBtn.style.display = "none";
  
      mesocycleSelect.innerHTML = "";
      exerciseSelect.innerHTML = "";
      workoutList.innerHTML = "";
      emptyMessage.style.display = "block";
  
      activeMesocycle = null;
      return;
    }
  
    authInputs.style.display = "none";
    userInfo.style.display = "block";
    logoutBtn.style.display = "inline-block";
    userEmail.textContent = session.user.email;
  }
  
});
