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
    .eq("user_id", user.id)
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
      const confirmDelete = confirm("¿Eliminar este entrenamiento?");
      if (!confirmDelete) return;

      const { error } = await supabaseClient
        .from("workouts")
        .delete()
        .eq("id", workout.id)
        .eq("user_id", user.id);

      if (error) {
        alert("Error al eliminar");
        console.error(error);
      } else {
        loadWorkouts();
        loadStats();
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
        weight: Number(inputs[2].value)
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
        user_id: user.id
      }]);

    if (error) {
      alert("Error al guardar");
      console.error(error);
      return;
    }
  }

  const user = (await supabaseClient.auth.getUser()).data.user;

const { error } = await supabaseClient
  .from("workouts")
  .insert([{
    exercise: inputs[0].value,
    reps: Number(inputs[1].value),
    weight: Number(inputs[2].value),
    user_id: user.id
  }]);

  form.reset();
  loadWorkouts();
  loadStats();
});

// =======================
// SESSION STATE
// =======================

supabaseClient.auth.onAuthStateChange((_event, session) => {
  const userInfo = document.getElementById("user-info");
  const userEmail = document.getElementById("user-email");

  if (session) {
    loginBtn.style.display = "none";
    signupBtn.style.display = "none";
    logoutBtn.style.display = "block";

    userInfo.style.display = "block";
    userEmail.textContent = session.user.email;

    loadWorkouts();
    loadStats();
  } else {
    loginBtn.style.display = "block";
    signupBtn.style.display = "block";
    logoutBtn.style.display = "none";

    userInfo.style.display = "none";
    workoutList.innerHTML = "";
  }
});

console.log("SCRIPT CARGADO COMPLETO");
