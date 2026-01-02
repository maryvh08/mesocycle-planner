document.addEventListener("DOMContentLoaded", () => {

  // =======================
  // ELEMENTOS
  // =======================

  const form = document.getElementById("workout-form");
  const workoutList = document.getElementById("workout-list");
  const signupBtn = document.getElementById("signup-btn");
  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const emptyMessage = document.getElementById("empty-message");

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

    const { error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) alert(error.message);
  });

  logoutBtn.addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
  });

  // =======================
  // SESSION STATE
  // =======================

  supabaseClient.auth.onAuthStateChange(async (_event, session) => {
    if (!session) {
      activeMesocycle = null;
      return;
    }

    userEmail.textContent = session.user.email;
    authInputs.style.display = "none";
    logoutBtn.style.display = "inline-block";
    userInfo.style.display = "block";

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

  async function loadActiveMesocycle() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabaseClient
      .from("mesocycles")
      .select(`
        id,
        start_date,
        end_date,
        mesocycle_templates ( name )
      `)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (error) {
      activeMesocycle = null;
      return null;
    }

    activeMesocycle = data;

    document.getElementById("active-mesocycle-name").textContent =
      data.mesocycle_templates.name;

    document.getElementById("active-mesocycle-dates").textContent =
      `${data.start_date} → ${data.end_date}`;

    return data;
  }

  async function loadMesocycles() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    const { data, error } = await supabaseClient
      .from("mesocycles")
      .select("id, is_active, mesocycle_templates(name)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) return;

    mesocycleSelect.innerHTML = "";

    data.forEach(m => {
      const option = document.createElement("option");
      option.value = m.id;
      option.textContent = m.mesocycle_templates.name;
      if (m.is_active) option.selected = true;
      mesocycleSelect.appendChild(option);
    });
  }

  // =======================
  // EXERCISES (RPC)
  // =======================

  async function loadExercisesForMesocycle() {
    if (!activeMesocycle) return;

    const { data, error } = await supabaseClient.rpc(
      "get_exercises_for_mesocycle",
      { p_mesocycle_id: activeMesocycle.id }
    );

    if (error) {
      console.error(error);
      return;
    }

    exerciseSelect.innerHTML = "";

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

    const { data, error } = await supabaseClient
      .from("workouts")
      .select("id, reps, weight, created_at, exercises(name)")
      .eq("user_id", user.id)
      .eq("mesocycle_id", activeMesocycle.id)
      .order("created_at", { ascending: false });

    if (error) return;

    workoutList.innerHTML = "";

    if (data.length === 0) {
      emptyMessage.style.display = "block";
      return;
    }

    emptyMessage.style.display = "none";

    data.forEach(w => {
      const li = document.createElement("li");
      li.innerHTML = `
        <strong>${w.exercises.name}</strong><br>
        ${w.reps} reps · ${w.weight} kg
      `;
      workoutList.appendChild(li);
    });
  }

  console.log("script.js cargado correctamente ✅");
});
