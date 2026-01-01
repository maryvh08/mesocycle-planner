const form = document.getElementById("workout-form");
const workoutList = document.getElementById("workout-list");

<script>
  const supabaseClient = supabase.createClient(
    "https://TU-PROYECTO.supabase.co",
    "TU_PUBLIC_ANON_KEY"
  );
</script>

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
    form.querySelector("button").textContent = "Guardado ✔";
    setTimeout(() => {
      form.querySelector("button").textContent = "Guardar";
    }, 1000);
    form.reset();
    loadWorkouts();
  }
});

loadWorkouts();

console.log("SCRIPT CARGADO COMPLETO");

