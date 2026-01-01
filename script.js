const form = document.getElementById("workout-form");

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
  }
});
