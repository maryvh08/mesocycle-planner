// =======================
// ELEMENTOS
// =======================

const form = document.getElementById("workout-form");
const workoutList = document.getElementById("workout-list");
const signupBtn = document.getElementById("signup-btn");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const emptyMessage = document.getElementById("empty-message");

let editingWorkoutId = null;

// =======================
// AUTH
// =======================

signupBtn.addEventListener("click", async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { error } = await supabaseClient.auth.signUp({ email, password });

  if (error) {
    alert(error.message);
  } else {
    alert("Usuario registrado. Revisa tu correo y luego inicia sesión.");
  }
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
  workoutList.innerHTML = "";
  emptyMessage.style.display = "block";
});

// =======================
// WORKOUTS
// =======================

async function loadWorkouts() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) return;

  const { data, error } = await supabaseClient
    .from("workouts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  workoutList.innerHTML = "";

  if (data.length === 0) {
    emptyMessage.style.display = "block";
    return;
  } else {
    emptyMessage.style.display = "none";
  }

  data.forEach(workout => {
    const li = document.createElement("li");

    li.innerHTML = `
      <strong>${workout.exercise}</strong><br>
      ${workout.reps} reps · ${workout.weight} kg<br>
      <small>${new Date(workout.created_at).toLocaleDateString()}</small><br>
      <button class="edit-btn">Editar</button>
      <button class="delete-btn">Eliminar</button>
    `;

    // EDITAR
    li.querySelector(".edit-btn").addEventListener("click", () => {
      const inputs = form.querySelectorAll("input");
      inputs[0].value = workout.exercise;
      inputs[1].value = workout.reps;
      inputs[2].value = workout.weight;

      editingWorkoutId = workout.id;
      form.querySelector("button").textContent = "Actualizar ✏️";
    });

    // ELIMINAR
    li.querySelector(".delete-btn").addEventListener("click", async () => {
      if (!confirm("¿Eliminar este entrenamiento?")) return;

      const { error } = await supabaseClient
        .from("workouts")
        .delete()
        .eq("id", workout.id);

      if (error) {
        alert("Error al eliminar");
        console.error(error);
      } else {
        loadWorkouts();
        loadStats();
        loadVolumeChart();
        loadExerciseSelector();
        loadPRs();

      }
    });

    workoutList.appendChild(li);
  });
}

// =======================
// STATS
// =======================

async function loadStats() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) return;

  const { data, error } = await supabaseClient
    .from("workouts")
    .select("exercise, reps, weight")
    .eq("user_id", user.id);

  if (error) {
    console.error(error);
    return;
  }

  let totalVolume = 0;
  let maxWeight = 0;
  const exerciseCount = {};

  data.forEach(w => {
    totalVolume += w.reps * w.weight;
    maxWeight = Math.max(maxWeight, w.weight);
    exerciseCount[w.exercise] = (exerciseCount[w.exercise] || 0) + 1;
  });

  const topExercise =
    Object.entries(exerciseCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

  document.getElementById("stat-volume").textContent = totalVolume;
  document.getElementById("stat-count").textContent = data.length;
  document.getElementById("stat-max").textContent = maxWeight;
  document.getElementById("stat-top").textContent = topExercise;
}

// =======================
// INSERT / UPDATE
// =======================

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const inputs = form.querySelectorAll("input");
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) return;

  if (editingWorkoutId) {
    // UPDATE
    const { error } = await supabaseClient
      .from("workouts")
      .update({
        exercise: inputs[0].value,
        reps: Number(inputs[1].value),
        weight: Number(inputs[2].value),
      })
      .eq("id", editingWorkoutId)
      .eq("user_id", user.id);

    if (error) {
      alert("Error al actualizar");
      console.error(error);
      return;
    }

    editingWorkoutId = null;
    form.querySelector("button").textContent = "Guardar";
  } else {
    // INSERT
    const { error } = await supabaseClient
      .from("workouts")
      .insert([{
        exercise: inputs[0].value,
        reps: Number(inputs[1].value),
        weight: Number(inputs[2].value),
        user_id: user.id,
      }]);

    if (error) {
      alert("Error al guardar");
      console.error(error);
      return;
    }
  }

  form.reset();
  loadWorkouts();
  loadStats();
});

// =======================
// SESSION STATE
// =======================

supabaseClient.auth.onAuthStateChange((_event, session) => {
  const authInputs = document.getElementById("auth-inputs");
  const userInfo = document.getElementById("user-info");
  const userEmail = document.getElementById("user-email");

  if (session) {
    authInputs.style.display = "none";
    logoutBtn.style.display = "inline-block";
  
    userInfo.style.display = "block";
    userEmail.textContent = session.user.email;
  
    loadWorkouts();
    loadStats();
    loadVolumeChart();
    loadExerciseSelector();
    loadPRs();
  } else {
    authInputs.style.display = "block";
    logoutBtn.style.display = "none";

    userInfo.style.display = "none";
    workoutList.innerHTML = "";
    emptyMessage.style.display = "block";
  }
});

let volumeChart = null;

async function loadVolumeChart() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) return;

  const { data, error } = await supabaseClient
    .from("workouts")
    .select("exercise, reps, weight")
    .eq("user_id", user.id);
  
  console.log("Datos workouts para gráfica:", data);


  if (error) {
    console.error(error);
    return;
  }

  // Agrupar volumen por ejercicio
  const volumeByExercise = {};

  data.forEach(w => {
    const volume = w.reps * w.weight;
    volumeByExercise[w.exercise] =
      (volumeByExercise[w.exercise] || 0) + volume;
  });

  const labels = Object.keys(volumeByExercise);
  const values = Object.values(volumeByExercise);

  const canvas = document.getElementById("volumeChart");
  if (!canvas) return;
  
  const ctx = canvas.getContext("2d");


  if (volumeChart) {
    volumeChart.destroy();
  }

  volumeChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Volumen total (kg)",
        data: values,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

async function loadExerciseSelector() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) return;

  const { data, error } = await supabaseClient
    .from("workouts")
    .select("exercise")
    .eq("user_id", user.id);

  if (error) return;

  const select = document.getElementById("exercise-select");
  const exercises = [...new Set(data.map(w => w.exercise))];

  select.innerHTML = `<option value="">Selecciona un ejercicio</option>`;
  exercises.forEach(ex => {
    select.innerHTML += `<option value="${ex}">${ex}</option>`;
  });
}

let progressChart = null;

async function loadProgressChart(exercise) {
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user || !exercise) return;

  const { data, error } = await supabaseClient
    .from("workouts")
    .select("reps, weight, created_at")
    .eq("user_id", user.id)
    .eq("exercise", exercise)
    .order("created_at");

  if (error) return;

  const volumeByDate = {};

  data.forEach(w => {
    const date = new Date(w.created_at).toLocaleDateString();
    volumeByDate[date] =
      (volumeByDate[date] || 0) + w.reps * w.weight;
  });

  const labels = Object.keys(volumeByDate);
  const values = Object.values(volumeByDate);

  const ctx = document.getElementById("progressChart").getContext("2d");

  if (progressChart) progressChart.destroy();

  progressChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: `Progreso de ${exercise}`,
        data: values,
        tension: 0.3,
        fill: false
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

async function loadPRs() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) return;

  const { data, error } = await supabaseClient
    .from("workouts")
    .select("exercise, weight")
    .eq("user_id", user.id);

  if (error) return;

  const prs = {};

  data.forEach(w => {
    prs[w.exercise] = Math.max(prs[w.exercise] || 0, w.weight);
  });

  const list = document.getElementById("pr-list");
  list.innerHTML = "";

  Object.entries(prs).forEach(([exercise, weight]) => {
    list.innerHTML += `<li>🏆 ${exercise}: ${weight} kg</li>`;
  });
}

document
  .getElementById("exercise-select")
  .addEventListener("change", (e) => {
    loadProgressChart(e.target.value);
  });

async function loadMesocycles() {
  const { data, error } = await supabaseClient
    .from("mesocycles")
    .select("id, name, is_active")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  const select = document.getElementById("mesocycle-select");
  select.innerHTML = "";

  data.forEach(m => {
    const option = document.createElement("option");
    option.value = m.id;
    option.textContent = m.name;
    if (m.is_active) option.selected = true;
    select.appendChild(option);
  });
}

document
  .getElementById("mesocycle-select")
  .addEventListener("change", async e => {

    const newId = e.target.value;

    // 1. Desactivar actual
    await supabaseClient
      .from("mesocycles")
      .update({ is_active: false })
      .eq("is_active", true);

    // 2. Activar nuevo
    await supabaseClient
      .from("mesocycles")
      .update({ is_active: true })
      .eq("id", newId);

    loadWorkouts(); // refresca UI
  });

console.log("SCRIPT CARGADO COMPLETO");
