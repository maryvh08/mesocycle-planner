const form = document.getElementById("workout-form");

const workoutList = document.getElementById("workout-list");

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

  data.forEach(workout => {
    const li = document.createElement("li");
    const date = new Date(workout.created_at).toLocaleDateString();
    li.innerHTML = `
      <strong>${workout.exercise}</strong><br>
      ${workout.reps} reps · ${workout.weight} kg<br>
      <small>${date}</small>
    `;
    workoutList.appendChild(li);
  });
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const inputs = form.querySelectorAll("input");

  const { error } = await supabaseClient
    .from("workouts")
    .insert([
      {
        exercise: inputs[0].value,
        reps: Number(inputs[1].value),
        weight: Number(inputs[2].value)
      }
    ]);

  if (error) {
    console.error(error);
    alert("Error al guardar");
  } else {
    alert("Entrenamiento guardado 💪");
    form.reset();
    loadWorkouts();
  }
});

loadWorkouts();

