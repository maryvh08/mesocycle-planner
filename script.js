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
  const emptyMessage = document.getElementById("empty-message");

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
      <small>${new Date(workout.created_at).toLocaleDateString()}</small>
      <br>
      <button class="delete-btn">Eliminar</button>
    `;

    li.querySelector(".delete-btn").addEventListener("click", async () => {
      const confirmDelete = confirm("¿Eliminar este entrenamiento?");
      if (!confirmDelete) return;

      const { error } = await supabaseClient
        .from("workouts")
        .delete()
        .eq("id", workout.id);

      if (error) {
        console.error(error);
        alert("Error al eliminar");
      } else {
        loadWorkouts();
      }
    });

    workoutList.appendChild(li);
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

console.log("SCRIPT CARGADO COMPLETO");

