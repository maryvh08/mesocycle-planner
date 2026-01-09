import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://vhwfenefevzzksxrslkx.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZodWdlbnQib25fb2tlbiIsImV4cCI6MjA4MzQ4Nzc4MH0.CG1KzxpxGHifXsgBvH-4E4WvXbj6d-8WsagqaHAtVwo";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ======================
   UI ELEMENTS
====================== */
const loginView = document.getElementById("login-view");
const appView = document.getElementById("app-view");
const message = document.getElementById("auth-message");

const templateSelect = document.getElementById("template-select");
const mesocycleList = document.getElementById("mesocycle-list"); // Historial
const historyList = document.getElementById("history-list"); 
const registroSelect = document.getElementById("registro-select"); // Selector mesociclo en Registro
const registroEditor = document.getElementById("registro-editor"); // Panel para editar y registrar

/* ======================
   AUTH
====================== */
document.getElementById("login-btn").onclick = async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  message.textContent = error ? error.message : "";
};

document.getElementById("signup-btn").onclick = async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const { error } = await supabase.auth.signUp({ email, password });
  message.textContent = error ? error.message : "Usuario creado. Inicia sesión.";
};

document.getElementById("logout-btn").onclick = async () => {
  await supabase.auth.signOut();
  showLogin();
};

/* ======================
   SESSION
====================== */
async function checkSession() {
  const { data } = await supabase.auth.getSession();
  data.session ? showApp() : showLogin();
}

supabase.auth.onAuthStateChange((_e, session) => {
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
  loadHistory();
  setupTabs();
}

function showLogin() {
  loginView.style.display = "block";
  appView.style.display = "none";
}

/* ======================
   TABS
====================== */
function setupTabs() {
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  tabButtons.forEach(btn => {
    btn.onclick = () => {
      tabButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const target = btn.dataset.tab;
      tabContents.forEach(tab => tab.classList.add("hidden"));
      document.getElementById(target).classList.remove("hidden");
    };
  });
}

/* ======================
   LOAD TEMPLATES
====================== */
async function loadTemplates() {
  const { data, error } = await supabase.from("templates").select("*").order("name");
  if (error) return console.error(error);

  templateSelect.innerHTML = '<option value="">Selecciona una plantilla</option>';
  data.forEach(t => {
    const opt = document.createElement("option");
    opt.value = t.id;
    opt.textContent = t.name;
    templateSelect.appendChild(opt);
  });
}

async function getTemplateById(id) {
  const { data } = await supabase.from("templates").select("*").eq("id", id).single();
  return data;
}

/* ======================
   LOAD MESOCYCLES
====================== */
async function loadMesocycles() {
  const { data, error } = await supabase.from("mesocycles")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return console.error(error);

  // HISTORIAL
  historyList.innerHTML = "";
  registroSelect.innerHTML = '<option value="">Selecciona un mesociclo</option>';

  for (const m of data) {
    const template = await getTemplateById(m.template_id);

    // 1️⃣ Historial
    const li = document.createElement("li");
    li.className = "history-card";
    li.innerHTML = `
      <p class="template-name">Plantilla: ${template.name}</p>
      <h4>${m.name} · ${m.weeks} semanas · ${m.days_per_week} días</h4>
      <button class="edit-mesocycle-btn">Editar mesociclo</button>
    `;
    const editBtn = li.querySelector(".edit-mesocycle-btn");
    editBtn.onclick = () => openRegistroEditor(m.id);
    historyList.appendChild(li);

    // 2️⃣ Registro select
    const opt = document.createElement("option");
    opt.value = m.id;
    opt.textContent = m.name;
    registroSelect.appendChild(opt);
  }
}

/* ======================
   REGISTRO TAB
====================== */
registroSelect.onchange = async () => {
  const id = registroSelect.value;
  if (!id) return registroEditor.innerHTML = "";
  await renderRegistroEditor(id);
};

async function openRegistroEditor(id) {
  registroSelect.value = id;
  await renderRegistroEditor(id);
}

async function renderRegistroEditor(mesocycleId) {
  registroEditor.innerHTML = "";
  const mesocycle = await supabase.from("mesocycles").select("*").eq("id", mesocycleId).single().then(r => r.data);
  const template = await getTemplateById(mesocycle.template_id);

  // Semana
  const weekSelect = document.createElement("select");
  weekSelect.className = "week-select";
  for (let w = 1; w <= mesocycle.weeks; w++) {
    const opt = document.createElement("option");
    opt.value = w;
    opt.textContent = `Semana ${w}`;
    weekSelect.appendChild(opt);
  }
  registroEditor.appendChild(weekSelect);

  // Días
  const dayDiv = document.createElement("div");
  for (let i = 1; i <= mesocycle.days_per_week; i++) {
    const btn = document.createElement("button");
    btn.className = "day-mini-btn";
    btn.textContent = `Día ${i}`;
    btn.onclick = async () => {
      dayDiv.querySelectorAll(".day-mini-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      await renderExercisesForRegistro(mesocycleId, i, parseInt(weekSelect.value), template);
    };
    dayDiv.appendChild(btn);
  }
  registroEditor.appendChild(dayDiv);

  // Cambiar semana
  weekSelect.onchange = async () => {
    const activeDay = dayDiv.querySelector(".day-mini-btn.active");
    if (activeDay) {
      const day = parseInt(activeDay.textContent.replace("Día ", ""));
      await renderExercisesForRegistro(mesocycleId, day, parseInt(weekSelect.value), template);
    }
  };

  // Contenedor ejercicios + botón registrar
  const select = document.createElement("select");
  select.multiple = true;
  select.size = 10;
  select.style.width = "100%";
  select.className = "exercise-select";

  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Registrar mesociclo";
  saveBtn.onclick = async () => {
    const activeDay = dayDiv.querySelector(".day-mini-btn.active");
    if (!activeDay) return alert("Selecciona un día");
    const day = parseInt(activeDay.textContent.replace("Día ", ""));
    const week = parseInt(weekSelect.value);
    await saveDayExercises(select, mesocycleId, day, week);
    await renderExercisesForRegistro(mesocycleId, day, week, template);
  };

  const list = document.createElement("div");
  list.className = "day-exercise-list";

  registroEditor.appendChild(select);
  registroEditor.appendChild(saveBtn);
  registroEditor.appendChild(list);
}

/* ======================
   RENDER + SAVE EXERCISES REGISTRO
====================== */
async function renderExercisesForRegistro(mesocycleId, day, week, template) {
  const select = registroEditor.querySelector(".exercise-select");
  const list = registroEditor.querySelector(".day-exercise-list");
  select.innerHTML = "";
  list.innerHTML = "";

  let query = supabase.from("exercises").select("id,name,subgroup").order("name");
  if (template.emphasis && template.emphasis !== "Todos") query = query.in("subgroup", template.emphasis.split(","));
  const { data: exercises } = await query;

  if (!exercises.length) return select.innerHTML = "<option>No hay ejercicios</option>";

  exercises.forEach(ex => {
    const opt = document.createElement("option");
    opt.value = ex.id;
    opt.textContent = `${ex.name} (${ex.subgroup})`;
    select.appendChild(opt);
  });

  const { data: saved } = await supabase.from("mesocycle_exercises")
    .select("exercise_id")
    .eq("mesocycle_id", mesocycleId)
    .eq("day_number", day)
    .eq("week_number", week);

  const savedIds = saved.map(r => r.exercise_id);
  [...select.options].forEach(o => o.selected = savedIds.includes(o.value));

  saved.forEach(r => {
    const ex = exercises.find(e => e.id === r.exercise_id);
    if (ex) {
      const chip = document.createElement("div");
      chip.className = "exercise-chip";
      chip.textContent = `${ex.name} (${ex.subgroup})`;
      list.appendChild(chip);
    }
  });
}

async function saveDayExercises(select, mesocycleId, day, week) {
  const values = [...select.selectedOptions].map(o => ({
    mesocycle_id: mesocycleId,
    exercise_id: o.value,
    day_number: day,
    week_number: week
  }));

  await supabase.from("mesocycle_exercises")
    .delete()
    .eq("mesocycle_id", mesocycleId)
    .eq("day_number", day)
    .eq("week_number", week);

  if (values.length) await supabase.from("mesocycle_exercises").insert(values);
}

/* ======================
   INIT
====================== */
checkSession();
