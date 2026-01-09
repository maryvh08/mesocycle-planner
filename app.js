import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
let activeMesocycle = null;
const daySelect = document.getElementById("day-select");
const exerciseSelect = document.getElementById("exercise-select");
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

  if (error) {
    console.error(error);
    return;
  }

  mesocycleList.innerHTML = "";

  data.forEach((m) => {
    const li = document.createElement("li");
    li.style.display = "flex";
    li.style.justifyContent = "space-between";
    li.style.alignItems = "center";
  
    const info = document.createElement("span");
    info.textContent = `${m.name} – ${m.weeks} semanas – ${m.days_per_week} días`;
  
    const editBtn = document.createElement("button");
    editBtn.textContent = "✏️ Editar";
    editBtn.onclick = () => openMesocycleConfig(m);
  
    li.appendChild(info);
    li.appendChild(editBtn);
  
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

async function loadExercisesForTemplate(templateId) {
  const { data: template } = await supabase
    .from("templates")
    .select("emphasis")
    .eq("id", templateId)
    .single();

  if (template.emphasis === "Todos") {
    return supabase.from("exercises").select("*");
  }

  return supabase
    .from("exercises")
    .select("*")
    .in("subgroup", template.emphasis.split(","));
}

async function renderExerciseSelect(mesocycle) {
  const { data: exercises } =
    await loadExercisesForTemplate(mesocycle.template_id);

  exerciseSelect.innerHTML = "";

  exercises.forEach(e => {
    const opt = document.createElement("option");
    opt.value = e.id;
    opt.textContent = e.name;
    exerciseSelect.appendChild(opt);
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

daySelect.onchange = async () => {
  if (!daySelect.value || !activeMesocycle) return;

  await loadDayExercises(
    activeMesocycle.id,
    parseInt(daySelect.value)
  );
};

async function openMesocycleConfig(mesocycle) {
  activeMesocycle = mesocycle;
  configTitle.textContent = `Configurar: ${mesocycle.name}`;
  configView.style.display = "block";

  loadDays(mesocycle);
  await renderExerciseSelect(mesocycle);
}

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

  const selectedExercises = [...exerciseSelect.selectedOptions].map(
    opt => ({
      mesocycle_id: activeMesocycle.id,
      exercise_id: opt.value,
      day_number: day
    })
  );

  await supabase
    .from("mesocycle_exercises")
    .delete()
    .eq("mesocycle_id", activeMesocycle.id)
    .eq("day_number", day);

  const { error } = await supabase
    .from("mesocycle_exercises")
    .insert(selectedExercises);

  if (!error) alert(`Día ${day} guardado ✅`);
};

/* ======================
   INIT
====================== */
checkSession();
