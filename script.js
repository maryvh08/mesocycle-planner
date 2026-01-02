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
    if (!session) return;
  
    await loadMesocycleTemplates();
    await loadMesocycles();          // 🔥 ESTO FALTABA
    await loadActiveMesocycle();
  
    if (activeMesocycle) {
      await loadExercisesForMesocycle();
      loadWorkouts();
      loadStats();
      loadVolumeChart();
      loadPRs();
    }
  });


    authInputs.style.display = "none";
    logoutBtn.style.display = "inline-block";
    userInfo.style.display = "block";
    userEmail.textContent = session.user.email;

    await loadMesocycleTemplates();
    await loadMesocycles();
    await loadActiveMesocycle();

    if (activeMesocycle) {
      await loadExercisesForMesocycle();
      loadWorkouts();
    }
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
      .select("id, start_date, end_date, is_active, mesocycle_templates(name)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
  
    if (error) {
      console.error(error);
      return;
    }
  
    mesocycleSelect.innerHTML = "";
  
    data.forEach(m => {
      const option = document.createElement("option");
      option.value = m.id;
      option.textContent = m.mesocycle_templates.name;
      if (m.is_active) option.selected = true;
      mesocycleSelect.appendChild(option);
    });
  }
  
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
  
    const { data, error } = await supabaseClient
      .rpc("get_exercises_for_mesocycle", {
        p_mesocycle_id: activeMesocycle.id
      });
  
    if (error) {
      console.error("RPC error:", error);
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
  // INSERT WORKOUT
  // =======================

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const reps = Number(document.getElementById("reps").value);
    const weight = Number(document.getElementById("weight").value);
    const exerciseId = exerciseSelect.value;

    if (!exerciseId) {
      alert("Selecciona un ejercicio");
      return;
    }

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
      console.error(error);
      return;
    }

    form.reset();
    loadWorkouts();
  });

  // =======================
  // MESOCYCLE TEMPLATES
  // =======================

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
    if (!select) return;

    select.innerHTML = `<option value="">Selecciona plantilla</option>`;

    data.forEach(t => {
      const option = document.createElement("option");
      option.value = t.id;
      option.textContent = `${t.name} (${t.emphasis})`;
      select.appendChild(option);
    });
  }

  // =======================
  // CREAR MESOCICLO
  // =======================

  document.getElementById("create-mesocycle-btn")
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

      await supabaseClient
        .from("mesocycles")
        .update({ is_active: false })
        .eq("user_id", user.id)
        .eq("is_active", true);

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
        alert("Error creando mesociclo");
        console.error(error);
        return;
      }

      activeMesocycle = data;

      await loadMesocycles();
      await loadActiveMesocycle();
      await loadExercisesForMesocycle();
      loadWorkouts();

      alert("Mesociclo creado y activado");
    });

  console.log("script.js cargado correctamente ✅");
});
