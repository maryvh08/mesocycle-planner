const form = document.getElementById("workout-form");
const workoutList = document.getElementById("workout-list");
const signupBtn = document.getElementById("signup-btn");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");

signupBtn.addEventListener("click", async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { error } = await supabaseClient.auth.signUp({
    email,
    password,
  });

  if (error) {
    alert(error.message);
  } else {
    alert("Usuario registrado. Ahora puedes entrar.");
  }
});

loginBtn.addEventListener("click", async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    alert(error.message);
  } else {
    loadWorkouts();
  }
});

logoutBtn.addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  workoutList.innerHTML = "";
});

async function loadWorkouts() {
  const { data, error } = await supabaseClient
    .from("workouts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  workoutList.innerHTML = "";

  if (!data || data.length === 0) {
    document.getElementById("empty-message").style.display = "block";
    return;
  }

  document.getElementById("empty-message").style.display = "none";

  data.forEach(workout => {
    // igual que ahora
  });
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const {
    data: { user },
    error: userError
  } = await supabaseClient.auth.getUser();

  if (userError || !user) {
    alert("Debes iniciar sesión");
    return;
  }

  const inputs = form.querySelectorAll("input");

  const { error } = await supabaseClient
    .from("workouts")
    .insert([
      {
        exercise: inputs[0].value,
        reps: Number(inputs[1].value),
        weight: Number(inputs[2].value),
        user_id: user.id
      }
    ]);

  if (error) {
    console.error(error);
    alert(error.message);
  } else {
    form.reset();
    loadWorkouts();
  }
});

supabaseClient.auth.onAuthStateChange((_event, session) => {
  if (session) {
    loginBtn.style.display = "none";
    logoutBtn.style.display = "block";
    signupBtn.style.display = "none";
    loadWorkouts();
  } else {
    loginBtn.style.display = "block";
    signupBtn.style.display = "block";
    logoutBtn.style.display = "none";
    workoutList.innerHTML = "";
  }
});

async function loadStats() {
  const { data, error } = await supabaseClient
    .from("workouts")
    .select("exercise, reps, weight");

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

  const topExercise = Object.entries(exerciseCount)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

  document.getElementById("stat-volume").textContent = totalVolume;
  document.getElementById("stat-count").textContent = data.length;
  document.getElementById("stat-max").textContent = maxWeight;
  document.getElementById("stat-top").textContent = topExercise;
}

console.log("SCRIPT CARGADO COMPLETO");

