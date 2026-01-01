const form = document.getElementById("workout-form");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const inputs = form.querySelectorAll("input");

  const { error } = await supabase
    .from("workouts")
    .insert([
      {
        exercise: inputs[0].value,
        reps: inputs[1].value,
        weight: inputs[2].value
      }
    ]);

  if (error) {
    alert("Error al guardar");
    console.error(error);
  } else {
    alert("Entrenamiento guardado 💪");
    form.reset();
  }
});
