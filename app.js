import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

/* ======================
   SUPABASE
====================== */
const SUPABASE_URL = "https://vhwfenefevzzksxrslkx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZod2ZlbmVmZXZ6emtzeHJzbGt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MTE3ODAsImV4cCI6MjA4MzQ4Nzc4MH0.CG1KzxpxGHifXsgBvH-4E4WvXbj6d-8WsagqaHAtVwo";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ======================
   STATE
====================== */
let selectedDaysPerWeek = null;
let editingMesocycleId = null;

/* ======================
   UI ELEMENTS
====================== */
const loginView = document.getElementById("login-view");
const appView = document.getElementById("app-view");
const message = document.getElementById("auth-message");

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const templateSelect = document.getElementById("template-select");
const mesocycleNameInput = document.getElementById("mesocycle-name");
const mesocycleWeeksInput = document.getElementById("mesocycle-weeks");
const createBtn = document.getElementById("create-mesocycle-btn");

const historyList = document.getElementById("history-list");
const registroSelect = document.getElementById("registro-select");
const registroEditor = document.getElementById("registro-editor");

/* ======================
   AUTH
====================== */
function initAuth() {
  document.getElementById("login-btn").onclick = login;
  document.getElementById("signup-btn").onclick = signup;
  document.getElementById("logout-btn").onclick = logout;

  supabase.auth.onAuthStateChange((_e, session) => {
    session ? showApp() : showLogin();
  });
}

async function login() {
  const { error } = await supabase.auth.signInWithPassword({
    email: emailInput.value,
    password: passwordInput.value
  });
  message.textContent = error?.message || "";
}

async function signup() {
  const { error } = await supabase.auth.signUp({
    email: emailInput.value,
    password: passwordInput.value
  });
  message.textContent = error ? error.message : "Usuario creado";
}

async function logout() {
  await supabase.auth.signOut();
}

/* ======================
   VIEW
====================== */
function showLogin() {
  loginView.classList.remove("hidden");
  appView.classList.add("hidden");
}

async function showApp() {
  loginView.classList.add("hidden");
  appView.classList.remove("hidden");

  setupTabs();
  initDaySelector();
  await loadTemplates();
  await loadMesocycles();
}

/* ======================
   TABS
====================== */
function setupTabs() {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(c => c.classList.add("hidden"));
      btn.classList.add("active");
      document.getElementById(btn.dataset.tab).classList.remove("hidden");
    };
  });
}

/* ======================
   DAY SELECTOR (CREAR)
====================== */
function initDaySelector() {
  document.querySelectorAll(".day-btn").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll(".day-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      selectedDaysPerWeek = Number(btn.dataset.days);
    };
  });
}

/* ======================
   MESOCYCLES
====================== */
createBtn.onclick = saveMesocycle;

async function saveMesocycle() {
  const name = mesocycleNameInput.value.trim();
  const weeks = Number(mesocycleWeeksInput.value);
  const templateId = templateSelect.value;

  if (!name || !weeks || !templateId || !selectedDaysPerWeek) {
    alert("Completa todos los campos");
    return;
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  const payload = {
    user_id: session.user.id,
    name,
    weeks,
    days_per_week: selectedDaysPerWeek,
    template_id: templateId
  };

  const { error } = editingMesocycleId
    ? await supabase.from("mesocycles").update(payload).eq("id", editingMesocycleId)
    : await supabase.from("mesocycles").insert(payload);

  if (error) {
    console.error(error);
    alert("Error al guardar");
    return;
  }

  resetMesocycleForm();
  loadMesocycles();
}

function resetMesocycleForm() {
  mesocycleNameInput.value = "";
  mesocycleWeeksInput.value = "";
  templateSelect.value = "";
  selectedDaysPerWeek = null;
  editingMesocycleId = null;

  document.querySelectorAll(".day-btn").forEach(b => b.classList.remove("active"));
}

/* ======================
   LOAD DATA
====================== */
async function loadTemplates() {
  const { data, error } = await supabase.from("templates").select("*").order("name");
  if (error) return console.error(error);

  templateSelect.innerHTML = `<option value="">Selecciona plantilla</option>`;
  data.forEach(t => {
    const opt = document.createElement("option");
    opt.value = t.id;
    opt.textContent = t.name;
    templateSelect.appendChild(opt);
  });
}

async function loadMesocycles() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  const { data, error } = await supabase
    .from("mesocycles")
     .select(`
       id,
       name,
       weeks,
       days_per_week,
       templates (
         name,
         emphasis
       )
     `)
     .eq("user_id", session.user.id)
     .order("created_at", { ascending: false });

  if (error) return console.error(error);

  historyList.innerHTML = "";
  registroSelect.innerHTML = `<option value="">Selecciona mesociclo</option>`;

  data.forEach(m => {
     const li = document.createElement("li");
     li.className = "mesocycle-history-card";
   
     li.innerHTML = `
       <h4>${m.name}</h4>
       <div class="muted">
         Plantilla: <strong>${m.templates?.name ?? "Sin plantilla"}</strong>
       </div>
       <div class="muted">
         ${m.weeks} semanas · ${m.days_per_week} días
       </div>
   
       <button class="toggle-history-btn">Ver historial</button>
       <div class="exercise-history hidden"></div>
     `;
   
     const historyContainer = li.querySelector(".exercise-history");
     const toggleBtn = li.querySelector(".toggle-history-btn");
   
     toggleBtn.onclick = async () => {
       if (!historyContainer.dataset.loaded) {
         await loadExerciseHistory(m.id, historyContainer);
         historyContainer.dataset.loaded = "true";
       }
       historyContainer.classList.toggle("hidden");
     };
   
     historyList.appendChild(li);
   });
}

async function loadExerciseHistory(mesocycleId, container) {
  container.innerHTML = "<p>Cargando historial...</p>";

  const { data, error } = await supabase
    .from("exercise_records")
    .select(`
      week_number,
      day_number,
      weight,
      reps,
      exercises (
        name,
        subgroup
      )
    `)
    .eq("mesocycle_id", mesocycleId)
    .order("week_number")
    .order("day_number");

  if (error) {
    console.error(error);
    container.innerHTML = "<p>Error cargando historial</p>";
    return;
  }

  if (!data.length) {
    container.innerHTML = "<p>No hay ejercicios registrados</p>";
    return;
  }

  // Agrupar por semana → día
  const grouped = {};

  data.forEach(r => {
    const w = `Semana ${r.week_number}`;
    const d = `Día ${r.day_number}`;

    if (!grouped[w]) grouped[w] = {};
    if (!grouped[w][d]) grouped[w][d] = [];

    grouped[w][d].push(r);
  });

  container.innerHTML = "";

  Object.entries(grouped).forEach(([week, days]) => {
    const weekDiv = document.createElement("div");
    weekDiv.className = "week-block";
    weekDiv.innerHTML = `<h5>${week}</h5>`;

    Object.entries(days).forEach(([day, rows]) => {
      const dayDiv = document.createElement("div");
      dayDiv.className = "day-block";
      dayDiv.innerHTML = `<strong>${day}</strong>`;

      rows.forEach(r => {
        const item = document.createElement("div");
        item.className = "exercise-history-row";
        item.textContent = `• ${r.exercises.name} (${r.exercises.subgroup}) — ${r.weight}kg x ${r.reps}`;
        dayDiv.appendChild(item);
      });

      weekDiv.appendChild(dayDiv);
    });

    container.appendChild(weekDiv);
  });
}

/* ======================
   REGISTRO
====================== */
registroSelect.onchange = () => {
  if (registroSelect.value) openRegistro(registroSelect.value);
};

async function openRegistro(mesocycleId) {
  // activar tab manualmente (seguro)
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".tab-content").forEach(c => c.classList.add("hidden"));

  const registroBtn = document.querySelector('[data-tab="registro-tab"]');
  const registroTab = document.getElementById("registro-tab");

  registroBtn?.classList.add("active");
  registroTab?.classList.remove("hidden");

  await renderRegistroEditor(mesocycleId);
}

/* ======================
   HELPERS
====================== */
function getAllowedSubgroups(emphasis) {
  if (!emphasis || emphasis === "Todos") return null;
  return emphasis.split(",").map(s => s.trim());
}

/* ======================
   REGISTRO EDITOR
====================== */
async function renderRegistroEditor(mesocycleId) {
  console.log("🟢 renderRegistroEditor", mesocycleId);
  registroEditor.innerHTML = "";

  /* ======================
     CARGAR MESOCICLO + TEMPLATE
  ====================== */
  // 1️⃣ cargar mesociclo
   const { data: mesocycle, error: mError } = await supabase
     .from("mesocycles")
     .select("id, name, weeks, days_per_week, template_id")
     .eq("id", mesocycleId)
     .single();
   
   if (mError || !mesocycle) {
     console.error(mError);
     registroEditor.textContent = "Error cargando mesociclo";
     return;
   }
   
   // 2️⃣ cargar template
   let allowedSubgroups = null;

   if (mesocycle.template_id) {
     const { data: template } = await supabase
       .from("templates")
       .select("emphasis")
       .eq("id", mesocycle.template_id)
       .single();
   
     allowedSubgroups = getAllowedSubgroups(template?.emphasis);
   }

  /* ======================
     CARGAR EJERCICIOS
  ====================== */
  const { data: exercises, error: eError } = await supabase
    .from("exercises")
    .select("id, name, subgroup")
    .order("name");

  if (eError) {
    console.error(eError);
    registroEditor.textContent = "Error cargando ejercicios";
    return;
  }

  const filteredExercises = allowedSubgroups
     ? exercises.filter(e => allowedSubgroups.includes(e.subgroup))
     : exercises;

  /* ======================
     TÍTULO
  ====================== */
  const title = document.createElement("h3");
  title.textContent = mesocycle.name;
  registroEditor.appendChild(title);

  /* ======================
     SELECT SEMANA
  ====================== */
  const weekSelect = document.createElement("select");
  for (let i = 1; i <= mesocycle.weeks; i++) {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = `Semana ${i}`;
    weekSelect.appendChild(opt);
  }
  registroEditor.appendChild(weekSelect);
   
   /* ======================
     CONTENEDOR REGISTROS
  ====================== */
  const registeredExercisesContainer = document.createElement("div");
  registeredExercisesContainer.id = "registered-exercises";
  registroEditor.appendChild(registeredExercisesContainer);

  registeredExercisesContainer.innerHTML =
    "<p>Selecciona una semana y un día</p>";

  weekSelect.onchange = () => {
    selectedDay = null;
    registeredExercisesContainer.innerHTML =
      "<p>Selecciona un día</p>";
    [...dayContainer.children].forEach(b => b.classList.remove("active"));
  };


  /* ======================
     BOTONES DE DÍA
  ====================== */
  const dayContainer = document.createElement("div");
  dayContainer.className = "day-buttons";
  registroEditor.appendChild(dayContainer);

  let selectedDay = null;

  for (let i = 1; i <= mesocycle.days_per_week; i++) {
    const btn = document.createElement("button");
    btn.className = "day-btn";
    btn.textContent = `Día ${i}`;

    btn.onclick = async () => {
      [...dayContainer.children].forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      selectedDay = i;

      await renderExercisesForDay({
        mesocycleId,
        week: Number(weekSelect.value),
        day: selectedDay,
        container: registeredExercisesContainer
      });
    };

    dayContainer.appendChild(btn);
  }

  /* ======================
     SELECT EJERCICIO
  ====================== */
  const exerciseSelect = document.createElement("select");
  exerciseSelect.innerHTML =
    `<option value="">Selecciona ejercicio</option>`;

  filteredExercises.forEach(ex => {
    const opt = document.createElement("option");
    opt.value = ex.id;
    opt.textContent = `${ex.name} (${ex.subgroup})`;
    exerciseSelect.appendChild(opt);
  });

  registroEditor.appendChild(exerciseSelect);

  /* ======================
     INPUTS
  ====================== */
  const weightInput = document.createElement("input");
  weightInput.type = "number";
  weightInput.placeholder = "Peso (kg)";

  const repsInput = document.createElement("input");
  repsInput.type = "number";
  repsInput.placeholder = "Repeticiones";

  registroEditor.appendChild(weightInput);
  registroEditor.appendChild(repsInput);

  /* ======================
     GUARDAR
  ====================== */
  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Guardar ejercicio";

  saveBtn.onclick = async () => {
    if (!selectedDay) return alert("Selecciona un día");
    if (!exerciseSelect.value) return alert("Selecciona un ejercicio");

    const payload = {
      mesocycle_id: mesocycleId,
      exercise_id: exerciseSelect.value,
      week_number: Number(weekSelect.value),
      day_number: selectedDay,
      weight: Number(weightInput.value),
      reps: Number(repsInput.value),
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from("exercise_records")
      .upsert(payload, {
        onConflict: "mesocycle_id,exercise_id,week_number,day_number"
      });

    if (error) {
      console.error(error);
      alert("Error al guardar");
      return;
    }

    weightInput.value = "";
    repsInput.value = "";

    await renderExercisesForDay({
      mesocycleId,
      week: Number(weekSelect.value),
      day: selectedDay,
      container: registeredExercisesContainer
    });
  };

  registroEditor.appendChild(saveBtn);

  console.log("✅ renderRegistroEditor completado");
}

/* ======================
   RENDER EJERCICIOS DÍA
====================== */
async function renderExercisesForDay(mesocycleId, week, day, container) {
  container.innerHTML = "";

  const { data } = await supabase
    .from("exercise_records")
    .select(`weight, reps, exercises(name, subgroup)`)
    .eq("mesocycle_id", mesocycleId)
    .eq("week_number", week)
    .eq("day_number", day)
    .order("updated_at", { ascending: false });

  if (!data.length) {
    container.innerHTML = "<p>No hay ejercicios registrados</p>";
    return;
  }

  data.forEach(r => {
    const div = document.createElement("div");
    div.className = "exercise-chip";
    div.textContent = `${r.exercises.name} — ${r.weight}kg x ${r.reps}`;
    container.appendChild(div);
  });
}

/* ======================
   INIT
====================== */
initAuth();
