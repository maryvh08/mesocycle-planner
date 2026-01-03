// =======================
// GLOBAL STATE
// =======================
let activeMesocycle = null;

// =======================
// DOM READY
// =======================
document.addEventListener("DOMContentLoaded", () => {
  console.log("JS cargado");

  // ---------- AUTH ELEMENTS ----------
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");

  const signupBtn = document.getElementById("signup-btn");
  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");

  const authInputs = document.getElementById("auth-inputs");
  const userInfo = document.getElementById("user-info");
  const userEmail = document.getElementById("user-email");

  // ---------- UI ELEMENTS ----------
  const templateSelect = document.getElementById("template-select");
  const mesocycleSelect = document.getElementById("mesocycle-select");
  const exerciseSelect = document.getElementById("exercise-select");

  const workoutList = document.getElementById("workout-list");
  const emptyMessage = document.getElementById("empty-message");

  const form = document.getElementById("workout-form");

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

  logoutBtn.addEventListener("click", async (e) => {
    e.preventDefault(); // 🔒 bloquea submit
    await supabaseClient.auth.signOut();
  });


  // =======================
  // AUTH STATE (ÚNICO)
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

  // =======================
  // CREATE MESOCYCLE
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

      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) return;

      await supabaseClient
        .from("mesocycles")
        .update({ is_active: false })
        .eq("user_id", user.id);

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
      await loadWorkouts();

      alert("Mesociclo creado y activado ✅");
    });

  // =======================
  // WORKOUT SUBMIT
  // =======================
  form.addEventListener("submit", async e => {
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

  // =======================
  // UI HELPERS
  // =======================
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

  // =======================
  // LOAD TEMPLATES
  // =======================
  async function loadMesocycleTemplates() {
    templateSelect.innerHTML =
      `<option value="">Cargando plantillas...</option>`;

    const { data, error } = await supabaseClient
      .from("mesocycle_templates")
      .select("id, name")
      .order("name");

    if (error || !data || data.length === 0) {
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

  // =======================
  // LOAD MESOCYCLES
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

  // =======================
  // ACTIVE MESOCYCLE
  // =======================
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
    await loadWorkouts();
  });

  // =======================
  // EXERCISES
  // =======================
  async function loadExercisesForMesocycle() {
    if (!activeMesocycle) return;

    exerciseSelect.innerHTML =
      `<option value="">Cargando ejercicios...</option>`;

    const { data, error } = await supabaseClient.rpc(
      "get_exercises_for_mesocycle",
      { p_mesocycle_id: activeMesocycle.id }
    );

    if (error || !data || data.length === 0) {
      exerciseSelect.innerHTML =
        `<option value="">No hay ejercicios</option>`;
      return;
    }

    exerciseSelect.innerHTML =
      `<option value="">Selecciona ejercicio</option>`;

    data.forEach(ex => {
      const opt = document.createElement("option");
      opt.value = ex.id;
      opt.textContent = ex.name;
      exerciseSelect.appendChild(opt);
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

    if (!data || data.length === 0) {
      emptyMessage.style.display = "block";
      return;
    }

    emptyMessage.style.display = "none";

    data.forEach(w => {
      const li = document.createElement("li");
      li.textContent =
        `${w.exercises.name} — ${w.reps} x ${w.weight} kg`;
      workoutList.appendChild(li);
    });
  }
});
