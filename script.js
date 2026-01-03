document.addEventListener("DOMContentLoaded", () => {
  console.log("script.js iniciado ✅");

  // =======================
  // ELEMENTOS
  // =======================

  const form = document.getElementById("workout-form");
  const workoutList = document.getElementById("workout-list");
  const emptyMessage = document.getElementById("empty-message");

  const signupBtn = document.getElementById("signup-btn");
  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");

  const authInputs = document.getElementById("auth-inputs");
  const userInfo = document.getElementById("user-info");
  const userEmail = document.getElementById("user-email");

  const mesocycleSelect = document.getElementById("mesocycle-select");
  const exerciseSelect = document.getElementById("exercise-select");

  let activeMesocycle = null;

  // =======================
  // AUTH
  // =======================

  signupBtn.addEventListener("click", async () => {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const { error } = await supabaseClient.auth.signUp({ email, password });

    if (error) alert(error.message);
    else alert("Usuario registrado. Revisa tu correo.");
  });

  loginBtn.addEventListener("click", async () => {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const { error } =
      await supabaseClient.auth.signInWithPassword({ email, password });

    if (error) alert(error.message);
  });

  logoutBtn.addEventListener("click", async () => {
    const { error } = await supabaseClient.auth.signOut();
    if (error) alert(error.message);
  });

  // =======================
  // SESSION STATE
  // =======================

  supabaseClient.auth.onAuthStateChange(async (_event, session) => {
    if (!session) {
      // 🔒 LOGOUT
      activeMesocycle = null;

      authInputs.style.display = "block";
      logoutBtn.style.display = "none";
      userInfo.style.display = "none";

      mesocycleSelect.innerHTML = "";
      exerciseSelect.innerHTML = "";
      workoutList.innerHTML = "";
      emptyMessage.style.display = "block";

      return;
    }

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

    data.forEach(t => {
      const option = document.createElement("option");
      option.value = t.id;                  // ✅ debe existir
      option.textContent = `${t.name} — ${t.emphasis}`;
      select.appendChild(option);
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
      option.value = t.id;
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
    exerciseSelect.disabled = false;
    form.querySelector("button[type='submit']").disabled = false;
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
  console.log("Mesocycle templates:", data);
});
