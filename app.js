import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

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

  if (data.session) {
    showApp();
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

  if (error) {
    console.error(error);
    return;
  }

  mesocycleList.innerHTML = "";

  data.forEach((m) => {
    const li = document.createElement("li");
    li.textContent = `${m.name} – ${m.weeks} semanas – ${m.days_per_week} días`;
    mesocycleList.appendChild(li);
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

  const { error } = await supabase.from("mesocycles").insert({
    name,
    weeks,
    days_per_week: selectedDays,
    template_id: templateId,
    user_id: user.id
  });

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
const muscleConfig = document.getElementById("muscle-config");

let activeMesocycle = null;

async function openMesocycleConfig(mesocycle) {
  activeMesocycle = mesocycle;
  configTitle.textContent = `Configurar: ${mesocycle.name}`;
  configView.style.display = "block";

  const daySelect = document.getElementById("day-select");
  const exerciseConfig = document.getElementById("exercise-config");
  
  function loadDays(mesocycle) {
    daySelect.innerHTML = "";
    for (let i = 1; i <= mesocycle.days_per_week; i++) {
      const opt = document.createElement("option");
      opt.value = i;
      opt.textContent = `Día ${i}`;
      daySelect.appendChild(opt);
    }
  }

  const { data: template } = await supabase
    .from("templates")
    .select("emphasis")
    .eq("id", mesocycle.template_id)
    .single();

  let muscles =
    template.emphasis === "Todos"
      ? await getAllMuscles()
      : template.emphasis.split(",");

  renderMuscleSelectors(muscles);
}

async function getAllMuscles() {
  const { data } = await supabase
    .from("exercises")
    .select("subgroup");

  return [...new Set(data.map((e) => e.subgroup))];
}

async function renderMuscleSelectors(muscles) {
  muscleConfig.innerHTML = "";

  for (const muscle of muscles) {
    const { data: exercises } = await supabase
      .from("exercises")
      .select("id, name")
      .eq("subgroup", muscle);

    const div = document.createElement("div");
    const label = document.createElement("label");
    const select = document.createElement("select");

    label.textContent = muscle;

    exercises.forEach((e) => {
      const opt = document.createElement("option");
      opt.value = e.id;
      opt.textContent = e.name;
      select.appendChild(opt);
    });

    div.appendChild(label);
    div.appendChild(select);
    muscleConfig.appendChild(div);
  }
}

async function getAllMuscles() {
  const { data } = await supabase
    .from("exercises")
    .select("subgroup");

  return [...new Set(data.map((e) => e.subgroup))];
}

async function renderMuscleSelectors(muscles) {
  muscleConfig.innerHTML = "";

  for (const muscle of muscles) {
    const { data: exercises } = await supabase
      .from("exercises")
      .select("id, name")
      .eq("subgroup", muscle);

    const div = document.createElement("div");
    const label = document.createElement("label");
    const select = document.createElement("select");

    label.textContent = muscle;

    exercises.forEach((e) => {
      const opt = document.createElement("option");
      opt.value = e.id;
      opt.textContent = e.name;
      select.appendChild(opt);
    });

    div.appendChild(label);
    div.appendChild(select);
    muscleConfig.appendChild(div);
  }
}

document.getElementById("save-config-btn").onclick = async () => {
  const rows = [];

  muscleConfig.querySelectorAll("div").forEach((div) => {
    const muscle = div.querySelector("label").textContent;
    const exerciseId = div.querySelector("select").value;

    rows.push({
      mesocycle_id: activeMesocycle.id,
      muscle,
      exercise_id: exerciseId
    });
  });

  await supabase
    .from("mesocycle_exercises")
    .delete()
    .eq("mesocycle_id", activeMesocycle.id);

  const { error } = await supabase
    .from("mesocycle_exercises")
    .insert(rows);

  if (!error) alert("Configuración guardada ✅");
};

async function loadExercisesForTemplate(templateId) {
  const { data: template } = await supabase
    .from("templates")
    .select("enfasis")
    .eq("id", templateId)
    .single();

  if (template.enfasis === "Todos") {
    return supabase.from("exercises").select("*");
  }

  const groups = template.enfasis.split(",");

  return supabase
    .from("exercises")
    .select("*")
    .in("subgroup", groups);
}

async function renderExerciseChecklist(mesocycle) {
  const { data: exercises } =
    await loadExercisesForTemplate(mesocycle.template_id);

  exerciseConfig.innerHTML = "";

  exercises.forEach((e) => {
    const label = document.createElement("label");
    const checkbox = document.createElement("input");

    checkbox.type = "checkbox";
    checkbox.value = e.id;

    label.appendChild(checkbox);
    label.append(` ${e.name}`);
    exerciseConfig.appendChild(label);
    exerciseConfig.appendChild(document.createElement("br"));
  });
}

document.getElementById("save-day-btn").onclick = async () => {
  const day = parseInt(daySelect.value);

  const selected = [
    ...exerciseConfig.querySelectorAll("input:checked")
  ].map((cb) => ({
    mesocycle_id: activeMesocycle.id,
    exercise_id: cb.value,
    day_number: day
  }));

  await supabase
    .from("mesocycle_exercises")
    .delete()
    .eq("mesocycle_id", activeMesocycle.id)
    .eq("day_number", day);

  const { error } = await supabase
    .from("mesocycle_exercises")
    .insert(selected);

  if (!error) alert(`Día ${day} guardado ✅`);
};


/* ======================
   INIT
====================== */
checkSession();
