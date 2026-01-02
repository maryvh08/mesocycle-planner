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
  const exerciseSelect = document.getElementById("exercise");

  let editingWorkoutId = null;
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
    if (session) {
      authInputs.style.display = "none";
      logoutBtn.style.display = "inline-block";
      userInfo.style.display = "block";
      userEmail.textContent = session.user.email;

      await loadActiveMesocycle();

      if (!activeMesocycle) {
        alert("No tienes mesociclo activo");
        workoutList.innerHTML = "";
        emptyMessage.style.display = "block";
        return;
      }

      await loadExercisesForMesocycle();
      await loadMesocycles();
      await loadWorkouts();

    } else {
      authInputs.style.display = "block";
      logoutBtn.style.display = "none";
      userInfo.style.display = "none";

      workoutList.innerHTML = "";
      emptyMessage.style.display = "block";

      activeMesocycle = null;
    }
  });

  // =======================
  // MESOCYCLES
  // =======================

  async function loadActiveMesocycle() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    const { data, error } = await supabaseClient
      .from("mesocycles")
      .select("id, name")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (error) {
      activeMesocycle = null;
      return;
    }

    activeMesocycle = data;
    document.getElementById("active-mesocycle-name").textContent = data.name;
  }

  async function loadMesocycles() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    const { data, error } = await supabaseClient
      .from("mesocycles")
      .select("id, name, is_active")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) return;

    mesocycleSelect.innerHTML = "";

    data.forEach(m => {
      const option = document.createElement("option");
      option.value = m.id;
      option.textContent = m.name;
      if (m.is_active) option.selected = true;
      mesocycleSelect.appendChild(option);
    });
  }

  mesocycleSelect.addEventListener("change", async (e) => {
    const newId = e.target.value;

    await supabaseClient
      .from("mesocycles")
      .update({ is_active: false })
      .eq("is_active", true);

    await supabaseClient
      .from("mesocycles")
      .update({ is_active: true })
      .eq("id", newId);

    await loadActiveMesocycle();
    await loadExercisesForMesocycle();
    await loadWorkouts();
  });

  // =======================
  // EXERCISES (RPC)
  // =======================

  async function loadExercisesForMesocycle() {
    if (!activeMesocycle) return;

    const { data, error } = await supabaseClient
      .rpc("get_exercises_for_mesocycle", {
        mesocycle_id: activeMesocycle.id
      });

    if (error) {
      console.error(error);
      return;
    }

    exerciseSelect.innerHTML = "";

    data.forEach(e => {
      const option = document.createElement("option");
      option.value = e.id;
      option.textContent = e.name;
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
      .select(`
        id,
        reps,
        weight,
        created_at,
        exercises ( name )
      `)
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
        ${w.reps} reps · ${w.weight} kg<br>
        <small>${new Date(w.created_at).toLocaleDateString()}</small><br>
        <button class="delete-btn">Eliminar</button>
      `;

      li.querySelector(".delete-btn").addEventListener("click", async () => {
        if (!confirm("¿Eliminar entrenamiento?")) return;

        await supabaseClient
          .from("workouts")
          .delete()
          .eq("id", w.id);

        loadWorkouts();
      });

      workoutList.appendChild(li);
    });
  }

  // =======================
  // INSERT
  // =======================

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const reps = Number(document.getElementById("reps").value);
    const weight = Number(document.getElementById("weight").value);
    const exerciseId = exerciseSelect.value;

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user || !activeMesocycle) return;

    const { error } = await supabaseClient
      .from("workouts")
      .insert({
        user_id: user.id,
        exercise_id: exerciseId,
        reps,
        weight,
        mesocycle_id: activeMesocycle.id,
      });

    if (error) {
      alert("Error al guardar");
      return;
    }

    form.reset();
    loadWorkouts();
  });

  console.log("script.js cargado correctamente ✅");

  async function loadMesocycleTemplates() {
    const { data, error } = await supabaseClient
      .from("mesocycle_templates")
      .select("id, name, emphasis")
      .order("name");
  
    if (error) {
      console.error("Error cargando plantillas:", error);
      return;
    }
  
    const select = document.getElementById("template-select");
    select.innerHTML = "";
  
    data.forEach(t => {
      const option = document.createElement("option");
      option.value = t.id;
      option.textContent = `${t.name} (${t.emphasis})`;
      select.appendChild(option);
    });
  }
});
