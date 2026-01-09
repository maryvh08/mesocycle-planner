import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://vhwfenefevzzksxrslkx.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZod2ZlbmVmZXZ6emtzeHJzbGt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MTE3ODAsImV4cCI6MjA4MzQ4Nzc4MH0.CG1KzxpxGHifXsgBvH-4E4WvXbj6d-8WsagqaHAtVwo";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ======================
   UI ELEMENTS
====================== */
const loginView = document.getElementById("login-view");
const appView = document.getElementById("app-view");
const message = document.getElementById("auth-message");

const templateSelect = document.getElementById("template-select");
const mesocycleNameInput = document.getElementById("mesocycle-name");
const mesocycleWeeksInput = document.getElementById("mesocycle-weeks");
let selectedDays = 0;
let editingMesocycleId = null;

const historyList = document.getElementById("history-list");
const registroSelect = document.getElementById("registro-select");
const registroEditor = document.getElementById("registro-editor");

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
   DAYS SELECT
====================== */
function setupDayButtons() {
  const dayButtons = document.querySelectorAll(".day-btn");
  dayButtons.forEach(btn => {
    btn.onclick = () => {
      dayButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      selectedDays = parseInt(btn.dataset.days);
    };
  });
}

/* ======================
   CREATE MESOCYCLE
====================== */
const createBtn = document.getElementById("create-mesocycle-btn");
createBtn.onclick = async () => {
  const name = mesocycleNameInput.value;
  const template_id = templateSelect.value;
  const weeks = parseInt(mesocycleWeeksInput.value);
  const days_per_week = selectedDays;

  if (!name || !template_id || !weeks || !days_per_week)
    return alert("Completa todos los campos");

  if (editingMesocycleId) {
    // Actualizar mesociclo
    await supabase.from("mesocycles")
      .update({ name, template_id, weeks, days_per_week })
      .eq("id", editingMesocycleId);
    editingMesocycleId = null;
  } else {
    await supabase.from("mesocycles")
      .insert({ name, template_id, weeks, days_per_week });
  }

  // Limpiar
  mesocycleNameInput.value = "";
  mesocycleWeeksInput.value = "";
  templateSelect.value = "";
  setupDayButtons(); // limpiar botones
  document.querySelectorAll(".day-btn").forEach(b => b.classList.remove("active"));
  selectedDays = 0;

  await loadMesocycles();
};

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

  historyList.innerHTML = "";
  registroSelect.innerHTML = '<option value="">Selecciona un mesociclo</option>';

  for (const m of data) {
    const template = await getTemplateById(m.template_id);

    const li = document.createElement("li");
    li.className = "history-card";
    li.innerHTML = `
      <p class="template-name">Plantilla: ${template.name}</p>
      <h4>${m.name} · ${m.weeks} semanas · ${m.days_per_week} días</h4>
      <button class="edit-btn">Editar</button>
      <button class="register-btn">Registrar ejercicios</button>
    `;

    // Editar → pestaña Crear Mesociclo
    li.querySelector(".edit-btn").onclick = () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(c => c.classList.add("hidden"));
      document.querySelector('.tab-btn[data-tab="crear-tab"]').classList.add("active");
      document.getElementById("crear-tab").classList.remove("hidden");

      // Rellenar formulario
      mesocycleNameInput.value = m.name;
      mesocycleWeeksInput.value = m.weeks;
      templateSelect.value = m.template_id;

      // Activar botón correcto
      const btnDias = document.querySelector(`.day-btn[data-days="${m.days_per_week}"]`);
      if (btnDias) {
        document.querySelectorAll(".day-btn").forEach(b => b.classList.remove("active"));
        btnDias.classList.add("active");
        selectedDays = m.days_per_week;
      }

      editingMesocycleId = m.id;
      setupDayButtons(); // asegurar listeners
    };

    // Registrar → pestaña Registro
    li.querySelector(".register-btn").onclick = () => openRegistroEditor(m.id);

    historyList.appendChild(li);

    // Registro select
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
  await openRegistroEditor(id);
};

async function openRegistroEditor(id) {
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".tab-content").forEach(c => c.classList.add("hidden"));
  document.querySelector('.tab-btn[data-tab="registro-tab"]').classList.add("active");
  document.getElementById("registro-tab").classList.remove("hidden");

  registroSelect.value = id;
  await renderRegistroEditor(id);
}

/* ======================
   RENDER REGISTRO
====================== */
async function renderRegistroEditor(mesocycleId) {
  registroEditor.innerHTML = "";
  const { data: mesocycle } = await supabase.from("mesocycles").select("*").eq("id", mesocycleId).single();
  const template = await getTemplateById(mesocycle.template_id);

  const container = document.createElement("div");
  container.className = "registro-container";

  // Nombre del mesociclo
  const h3 = document.createElement("h3");
  h3.textContent = `Mesociclo: ${mesocycle.name}`;
  container.appendChild(h3);

  // Selector semana
  const weekSelect = document.createElement("select");
  weekSelect.className = "week-select";
  for (let w = 1; w <= mesocycle.weeks; w++) {
    const opt = document.createElement("option");
    opt.value = w;
    opt.textContent = `Semana ${w}`;
    weekSelect.appendChild(opt);
  }
  container.appendChild(weekSelect);

  // Botones días
  const dayDiv = document.createElement("div");
  dayDiv.className = "day-buttons";
  for (let i = 1; i <= mesocycle.days_per_week; i++) {
    const btn = document.createElement("button");
    btn.className = "day-mini-btn";
    btn.textContent = `${i}`; // solo número
    btn.onclick = async () => {
      dayDiv.querySelectorAll(".day-mini-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      await renderExercisesForRegistro(container, mesocycleId, i, parseInt(weekSelect.value), template);
    };
    dayDiv.appendChild(btn);
  }
  container.appendChild(dayDiv);

  // Activar primer día
  const firstDay = dayDiv.querySelector(".day-mini-btn");
  if (firstDay) firstDay.click();

  weekSelect.onchange = async () => {
    const activeDay = dayDiv.querySelector(".day-mini-btn.active");
    if (activeDay) {
      const day = parseInt(activeDay.textContent);
      await renderExercisesForRegistro(container, mesocycleId, day, parseInt(weekSelect.value), template);
    }
  };

  const select = document.createElement("select");
  select.multiple = true;
  select.size = 10;
  select.style.width = "100%";
  select.className = "exercise-select";

  const list = document.createElement("div");
  list.className = "day-exercise-list";

  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Registrar mesociclo";
  saveBtn.className = "register-btn";
  saveBtn.onclick = async () => {
    const activeDay = dayDiv.querySelector(".day-mini-btn.active");
    if (!activeDay) return alert("Selecciona un día");
    const day = parseInt(activeDay.textContent);
    const week = parseInt(weekSelect.value);
    await saveDayExercises(select, mesocycleId, day, week);
    await renderExercisesForRegistro(container, mesocycleId, day, week, template);
  };

  container.appendChild(select);
  container.appendChild(list);
  container.appendChild(saveBtn);
  registroEditor.appendChild(container);
}

/* ======================
   RENDER EJERCICIOS
====================== */
async function renderExercisesForRegistro(container, mesocycleId, day, week, template) {
  const select = container.querySelector(".exercise-select");
  const list = container.querySelector(".day-exercise-list");
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

      const delBtn = document.createElement("button");
      delBtn.textContent = "×";
      delBtn.onclick = async () => {
        await supabase.from("mesocycle_exercises")
          .delete()
          .eq("mesocycle_id", mesocycleId)
          .eq("day_number", day)
          .eq("week_number", week)
          .eq("exercise_id", ex.id);
        chip.remove();
        const opt = [...select.options].find(o => o.value == ex.id);
        if (opt) opt.selected = false;
      };
      chip.appendChild(delBtn);
      list.appendChild(chip);
    }
  });
}

/* ======================
   SAVE DAY EXERCISES
====================== */
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
setupDayButtons();
checkSession();
