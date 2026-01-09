import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
let activeMesocycle = null;
console.log("daySelect:", daySelect);
console.log("exerciseSelect:", exerciseSelect);
console.log("exerciseConfig:", exerciseConfig);
console.log("exerciseSelect:", exerciseSelect);
const SUPABASE_URL = "https://vhwfenefevzzksxrslkx.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZod2ZlbmVmZXZ6emtzeHJzbGt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MTE3ODAsImV4cCI6MjA4MzQ4Nzc4MH0.CG1KzxpxGHifXsgBvH-4E4WvXbj6d-8WsagqaHAtVwo";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ======================
   AUTH UI REFERENCES
====================== */
const loginView = document.getElementById("login-view");
const appView = document.getElementById("app-view");
const message = document.getElementById("auth-message");

/* ======================
   LOGIN
====================== */
document.getElementById("login-btn").onclick = async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    message.textContent = error.message;
    return;
  }
};

/* ======================
   SIGNUP
====================== */
document.getElementById("signup-btn").onclick = async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { error } = await supabase.auth.signUp({
    email,
    password
  });

  message.textContent = error
    ? error.message
    : "Usuario creado. Ahora inicia sesión.";
};

/* ======================
   LOGOUT
====================== */
document.getElementById("logout-btn").onclick = async () => {
  await supabase.auth.signOut();
  showLogin();
};

/* ======================
   SESSION CHECK
====================== */
async function checkSession() {
  const {
    data: { session }
  } = await supabase.auth.getSession();

  session ? showApp() : showLogin();
}

supabase.auth.onAuthStateChange((_event, session) => {
  session ? showApp() : showLogin();
});

/* ======================
   VIEW HELPERS
====================== */
function showApp() {
  loginView.style.display = "none";
  appView.style.display = "block";
  loadTemplates();
  loadMesocycles();
}

function showLogin() {
  loginView.style.display = "block";
  appView.style.display = "none";
}

/* ======================
   MESOCYCLES
====================== */
const mesocycleList = document.getElementById("mesocycle-list");

async function loadMesocycles() {
  const { data, error } = await supabase
    .from("mesocycles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return console.error(error);

  mesocycleList.innerHTML = "";

  data.forEach(m => {
    const li = document.createElement("li");
    li.className = "mesocycle-card";

    li.innerHTML = `
      <header>
        <h3>${m.name}</h3>
        <span>${m.weeks} semanas · ${m.days_per_week} días</span>
      </header>

      <button class="edit-btn">Editar</button>

      <section class="editor hidden">
        <label>Día</label>
        <select class="day-select"></select>

        <label>Ejercicios</label>
        <select class="exercise-select" multiple></select>

        <button class="save-day-btn">Guardar día</button>
        <p class="day-hint"></p>

        <h4>Ejercicios del día</h4>
        <ul class="day-exercise-list"></ul>
      </section>
    `;

    mesocycleList.appendChild(li);

    setupMesocycleEditor(li, m);
  });
}

/* ======================
   CREATE MESOCYCLE
====================== */
const templateSelect = document.getElementById("template-select");
let selectedDays = null;

async function createMesocycle() {
  const name = document.getElementById("mesocycle-name").value;
  const weeks = parseInt(document.getElementById("mesocycle-weeks").value);
  const templateId = templateSelect.value;

  if (!name || !weeks || !selectedDays || !templateId) {
    alert("Completa todos los campos");
    return;
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("mesocycles")
    .insert({
      name,
      weeks,
      days_per_week: selectedDays,
      template_id: templateId,
      user_id: user.id
    })
    .select()
    .single();

  if (error) {
    alert(error.message);
    return;
  }

  alert("Mesociclo creado ✅");

  document.getElementById("mesocycle-name").value = "";
  document.getElementById("mesocycle-weeks").value = "";
  templateSelect.value = "";
  selectedDays = null;
  document
    .querySelectorAll(".day-btn")
    .forEach((b) => b.classList.remove("active"));

  loadMesocycles();
  const { data: fullMesocycle } = await supabase
    .from("mesocycles")
    .select("*")
    .eq("id", data.id)
    .single();
  
  openMesocycleConfig(fullMesocycle);

}

document
  .getElementById("create-mesocycle-btn")
  .addEventListener("click", createMesocycle);

/* ======================
   TEMPLATES
====================== */
async function loadTemplates() {
  const { data, error } = await supabase
    .from("templates")
    .select("*")
    .order("name");

  if (error) {
    console.error(error);
    return;
  }

  templateSelect.innerHTML =
    '<option value="">Selecciona una plantilla</option>';

  data.forEach((t) => {
    const option = document.createElement("option");
    option.value = t.id;
    option.textContent = t.name;
    templateSelect.appendChild(option);
  });
}

/* ======================
   DAYS SELECTOR
====================== */
document.querySelectorAll(".day-btn").forEach((btn) => {
  btn.onclick = () => {
    document
      .querySelectorAll(".day-btn")
      .forEach((b) => b.classList.remove("active"));

    btn.classList.add("active");
    selectedDays = parseInt(btn.dataset.days);
  };
});

const configView = document.getElementById("config-view");
const configTitle = document.getElementById("config-title");

async function loadExercisesByTemplate(template) {
  let query = supabase
    .from("exercises")
    .select("id, name, subgroup")
    .order("name");

  if (template.emphasis !== "Todos") {
    const emphasisList = template.emphasis.split(",");

    query = query.in("subgroup", emphasisList);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error cargando ejercicios:", error);
    return [];
  }

  return data;
}

function setupMesocycleEditor(card, mesocycle) {
  const editBtn = card.querySelector(".edit-btn");
  const editor = card.querySelector(".editor");
  const daySelect = card.querySelector(".day-select");
  const exerciseSelect = card.querySelector(".exercise-select");
  const saveBtn = card.querySelector(".save-day-btn");
  const hint = card.querySelector(".day-hint");
  const list = card.querySelector(".day-exercise-list");

  editBtn.onclick = () => {
    editor.classList.toggle("hidden");
    loadDaysForCard(daySelect, mesocycle.days_per_week);
  };

  daySelect.onchange = async () => {
    const day = parseInt(daySelect.value);
    if (!day) return;

    const template = await getTemplateById(mesocycle.template_id);
    await renderExerciseSelectorForCard(exerciseSelect, template);
    await loadDayExercisesForCard(exerciseSelect, mesocycle.id, day);
    await renderDayExercisesForCard(list, mesocycle.id, day);
  };

  saveBtn.onclick = async () => {
    const day = parseInt(daySelect.value);
    if (!day) return;

    await saveDayExercisesForCard(exerciseSelect, mesocycle.id, day);
    hint.textContent = `Día ${day} guardado ✅`;
    await renderDayExercisesForCard(list, mesocycle.id, day);
  };
}

async function renderExerciseSelector(template) {
  const select = document.getElementById("exercise-select");
  select.innerHTML = "";

  const exercises = await loadExercisesByTemplate(template);

  if (exercises.length === 0) {
    select.innerHTML = `<option value="">No hay ejercicios</option>`;
    return;
  }

  exercises.forEach(ex => {
    const option = document.createElement("option");
    option.value = ex.id;
    option.textContent = `${ex.name} (${ex.subgroup})`;
    select.appendChild(option);
  });
}

function loadDays(mesocycle) {
  if (!mesocycle.days_per_week) {
    console.warn("Mesocycle sin days_per_week", mesocycle);
    return;
  }

  daySelect.innerHTML = `<option value="">Selecciona un día</option>`;

  for (let i = 1; i <= mesocycle.days_per_week; i++) {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = `Día ${i}`;
    daySelect.appendChild(opt);
  }
}

const dayHint = document.getElementById("day-hint");

async function openMesocycleConfig(mesocycle) {
  activeMesocycle = mesocycle;

  configTitle.textContent = `Configurando: ${mesocycle.name}`;
  configView.style.display = "block";

  loadDays(mesocycle);

  // reset visual
  daySelect.value = "";
  exerciseSelect.innerHTML = "";
  exerciseConfig.style.display = "none"; // 👈 correcto
}

async function getTemplateById(templateId) {
  const { data, error } = await supabase
    .from("templates")
    .select("*")
    .eq("id", templateId)
    .single();

  if (error) {
    console.error("Error cargando template:", error);
    return null;
  }

  return data;
  exerciseConfig.style.display = "block";
  await renderAllExercisesForDebug();
}

async function renderDayExercises(mesocycleId, day) {
  const list = document.getElementById("day-exercise-list");
  list.innerHTML = "";

  const { data, error } = await supabase
    .from("mesocycle_exercises")
    .select("exercise_id, exercises(name)")
    .eq("mesocycle_id", mesocycleId)
    .eq("day_number", day);

  if (error) {
    console.error(error);
    list.innerHTML = "<li>Error cargando ejercicios</li>";
    return;
  }

  if (data.length === 0) {
    list.innerHTML = "<li>No hay ejercicios asignados</li>";
    return;
  }

  data.forEach(row => {
    const li = document.createElement("li");
    li.textContent = row.exercises.name;
    list.appendChild(li);
  });
}

daySelect.onchange = async () => {
  if (!daySelect.value || !activeMesocycle) return;

  exerciseConfig.style.display = "block";

  const template = await getTemplateById(activeMesocycle.template_id);
  if (!template) return;

  await renderExerciseSelector(template);
  await loadDayExercises(
    activeMesocycle.id,
    parseInt(daySelect.value)
  );
};

async function loadDayExercises(mesocycleId, day) {
  const { data, error } = await supabase
    .from("mesocycle_exercises")
    .select("exercise_id")
    .eq("mesocycle_id", mesocycleId)
    .eq("day_number", day);

  if (error) {
    console.error(error);
    return;
  }

  const selected = data.map(r => r.exercise_id);

  [...exerciseSelect.options].forEach(opt => {
    opt.selected = selected.includes(opt.value);
  });
}

document.getElementById("save-day-btn").onclick = async () => {
  if (!activeMesocycle || !daySelect.value) {
    alert("Selecciona mesociclo y día");
    return;
  }

  const day = parseInt(daySelect.value);

  const selectedExercises = [...exerciseSelect.selectedOptions].map(opt => ({
    mesocycle_id: activeMesocycle.id,
    exercise_id: opt.value,
    day_number: day
  }));

  if (selectedExercises.length === 0) {
    alert("Selecciona al menos un ejercicio");
    return;
  }

  await supabase
    .from("mesocycle_exercises")
    .delete()
    .eq("mesocycle_id", activeMesocycle.id)
    .eq("day_number", day);

  const { error } = await supabase
    .from("mesocycle_exercises")
    .insert(selectedExercises);

  if (!error) {
    dayHint.textContent = `Día ${day} guardado correctamente ✅`;
    await renderDayExercises(activeMesocycle.id, day);
  }
};

/* ======================
   INIT
====================== */
checkSession();
