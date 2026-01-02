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

    if (!session) {
      activeMesocycle = null;
      allowedExercises = [];
      return;
    }
  
    await loadMesocycleTemplates();
    await loadActiveMesocycle();
  
    if (activeMesocycle) {
      await loadExercisesForMesocycle();
      loadWorkouts();
      loadStats();
      loadVolumeChart();
      loadPRs();
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
  
      // 1️⃣ Desactivar mesociclo activo
      await supabaseClient
        .from("mesocycles")
        .update({ is_active: false })
        .eq("user_id", user.id)
        .eq("is_active", true);
  
      // 2️⃣ Crear nuevo mesociclo
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
        alert("Errortoggle creando mesociclo");
        console.error(error);
        return;
      }
  
      // 3️⃣ Refrescar estado global
      activeMesocycle = data;
  
      // 4️⃣ Recargar UI dependiente
      await loadExercisesForMesocycle();
      loadMesocycles();
      loadWorkouts();
      loadStats();
      loadVolumeChart();
      loadPRs();
  
      alert("Mesociclo creado y activado");
    });
  document
    .getElementById("mesocycle-select")
    .addEventListener("change", async (e) => {
  
      const mesocycleId = e.target.value;
  
      const { error } = await supabaseClient
        .rpc("set_active_mesocycle", {
          p_mesocycle_id: mesocycleId
        });
  
      if (error) {
        alert("Error al cambiar mesociclo");
        console.error(error);
        return;
      }
  
      await loadActiveMesocycle();
      await loadExercisesForMesocycle();
  
      loadWorkouts();
      loadStats();
      loadVolumeChart();
      loadPRs();
    });
  async function loadActiveMesocycle() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return null;
  
    const { data, error } = await supabaseClient
      .from("mesocycles")
      .select(`
        id,
        start_date,
        end_date,
        mesocycle_templates ( name, emphasis )
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
  console.log("Supabase:", supabaseClient);
});
