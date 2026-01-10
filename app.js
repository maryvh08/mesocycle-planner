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
const dayButtons = document.querySelectorAll(".day-btn");
let selectedDays = 0;
let editingMesocycleId = null;

const historyList = document.getElementById("history-list");
const registroSelect = document.getElementById("registro-select");
const registroEditor = document.getElementById("registro-editor");
const createBtn = document.getElementById("create-mesocycle-btn");

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
  setupDayButtons(); 
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
   DÍAS DE ENTRENAMIENTO
====================== */
function setupDayButtons() {
  const dayButtons = document.querySelectorAll(".day-btn");

  dayButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      dayButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      selectedDays = parseInt(btn.dataset.days);
    });
  });
}

// Selector de ejercicios
const exerciseSelect = document.createElement("select");
exerciseSelect.className = "exercise-select";
exerciseSelect.multiple = true;
exerciseSelect.size = 8;

container.appendChild(exerciseSelect);

// Botón guardar
const saveBtn = document.createElement("button");
saveBtn.className = "register-btn";
saveBtn.textContent = "Registrar mesociclo";

container.appendChild(saveBtn);

// Lista visible
const list = document.createElement("div");
list.className = "day-exercise-list";
container.appendChild(list);

/* ======================
   CREATE / EDIT MESOCYCLE
====================== */
createBtn.onclick = async () => {
  const name = mesocycleNameInput.value.trim();
  const template_id = templateSelect.value;
  const weeks = parseInt(mesocycleWeeksInput.value);
  const days_per_week = selectedDays;

  if (!name || !template_id || !weeks || !days_per_week) return alert("Completa todos los campos");

  const { data: session } = await supabase.auth.getSession();
  const user_id = session?.user?.id;
  if (!user_id) return alert("Usuario no autenticado");

  try {
    if (editingMesocycleId) {
      // Editar existente
      const { error } = await supabase.from("mesocycles")
        .update({ name, template_id, weeks, days_per_week, user_id })
        .eq("id", editingMesocycleId);
      if (error) throw error;
      editingMesocycleId = null;
    } else {
      // Crear nuevo
      const { error } = await supabase.from("mesocycles")
        .insert({ name, template_id, weeks, days_per_week, user_id });
      if (error) throw error;
    }

    // Limpiar
    mesocycleNameInput.value = "";
    mesocycleWeeksInput.value = "";
    templateSelect.value = "";
    dayButtons.forEach(b => b.classList.remove("active"));
    selectedDays = 0;

    await loadMesocycles();
    alert("Mesociclo guardado correctamente");
  } catch (err) {
    console.error(err);
    alert("Error al guardar el mesociclo: " + err.message);
  }
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

async function loadExercisesForSelect(select, template) {
  select.innerHTML = "";

  let query = supabase
    .from("exercises")
    .select("id, name, subgroup")
    .order("name");

  if (template.emphasis && template.emphasis !== "Todos") {
    query = query.in("subgroup", template.emphasis.split(","));
  }

  const { data } = await query;

  data.forEach(ex => {
    const opt = document.createElement("option");
    opt.value = ex.id;
    opt.textContent = `${ex.name} (${ex.subgroup})`;
    select.appendChild(opt);
  });
}

/* ======================
   LOAD MESOCYCLES
====================== */
async function loadMesocycles() {
  const { data, error } = await supabase.from("mesocycles").select("*").order("created_at", { ascending: false });
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

    // Editar → Crear tab
    li.querySelector(".edit-btn").onclick = () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(c => c.classList.add("hidden"));
      document.querySelector('.tab-btn[data-tab="crear-tab"]').classList.add("active");
      document.getElementById("crear-tab").classList.remove("hidden");

      mesocycleNameInput.value = m.name;
      mesocycleWeeksInput.value = m.weeks;
      templateSelect.value = m.template_id;

      dayButtons.forEach(b => b.classList.remove("active"));
      const btnDias = document.querySelector(`.day-btn[data-days="${m.days_per_week}"]`);
      if (btnDias) btnDias.classList.add("active");
      selectedDays = m.days_per_week;

      editingMesocycleId = m.id;
    };

    li.querySelector(".register-btn").onclick = () => openRegistroEditor(m.id);

    historyList.appendChild(li);

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
   REGISTRO EJERCICIOS
====================== */
async function renderRegistroEditor(mesocycleId) {
  registroEditor.innerHTML = "";
  const { data: mesocycle } = await supabase.from("mesocycles").select("*").eq("id", mesocycleId).single();
  const template = await getTemplateById(mesocycle.template_id);

  const container = document.createElement("div");
  container.className = "registro-container";

  // Nombre mesociclo
  const title = document.createElement("h3");
  title.textContent = `Mesociclo: ${mesocycle.name}`;
  container.appendChild(title);

  // Semana
  const weekSelect = document.createElement("select");
  weekSelect.className = "week-select";
  for (let w = 1; w <= mesocycle.weeks; w++) {
    const opt = document.createElement("option");
    opt.value = w;
    opt.textContent = `Semana ${w}`;
    weekSelect.appendChild(opt);
  }
  container.appendChild(weekSelect);

  // Label días
  const dayLabel = document.createElement("label");
  dayLabel.textContent = "Días de entrenamiento";
  container.appendChild(dayLabel);

  // Botones días
  const dayDiv = document.createElement("div");
  dayDiv.className = "day-buttons";
  for (let i = 1; i <= mesocycle.days_per_week; i++) {
    const btn = document.createElement("button");
    btn.className = "day-mini-btn";
    btn.textContent = `Día ${i}`;
    saveBtn.onclick = async () => {
     const activeDay = dayDiv.querySelector(".day-mini-btn.active");
     if (!activeDay) return alert("Selecciona un día");
   
     const day = parseInt(activeDay.textContent.replace("Día ", ""));
     const week = parseInt(weekSelect.value);
   
     const selected = [...exerciseSelect.selectedOptions].map(o => ({
       mesocycle_id: mesocycleId,
       exercise_id: o.value,
       day_number: day,
       week_number: week
     }));
   
     await supabase
       .from("mesocycle_exercises")
       .delete()
       .eq("mesocycle_id", mesocycleId)
       .eq("day_number", day)
       .eq("week_number", week);
   
     if (selected.length) {
       await supabase.from("mesocycle_exercises").insert(selected);
     }
   
     await renderExercisesForRegistro(container, mesocycleId, day, week, template);
   };

  registroEditor.appendChild(container);
}

/* ======================
   EJERCICIOS Y REGISTRO PESO/REPS
====================== */
async function renderExercisesForRegistro(container, mesocycleId, day, week, template) {
  const list = container.querySelector(".day-exercise-list") || document.createElement("div");
  list.className = "day-exercise-list";
  list.innerHTML = "";
  container.appendChild(list);

  let { data: exercises } = await supabase.from("exercises").select("*").order("name");
  if (template.emphasis && template.emphasis !== "Todos") exercises = exercises.filter(e => template.emphasis.split(",").includes(e.subgroup));

  const { data: saved } = await supabase.from("exercise_records")
    .select("*")
    .eq("mesocycle_id", mesocycleId)
    .eq("day_number", day)
    .eq("week_number", week);

  saved.forEach(r => {
    const ex = exercises.find(e => e.id === r.exercise_id);
    if (!ex) return;

    const chip = document.createElement("div");
    chip.className = "exercise-chip";
    chip.textContent = `${ex.name} (${ex.subgroup}) - ${r.weight_kg ?? "-"} kg x ${r.reps ?? "-"}`;

    chip.onclick = async () => {
      openExerciseModal(mesocycleId, r.exercise_id, day, week, ex.name, r.weight_kg, r.reps);
    };

    list.appendChild(chip);
  });
}

function openExerciseModal(mesocycleId, exerciseId, day, week, exerciseName, weight = "", reps = "") {
  const modal = document.createElement("div");
  modal.className = "exercise-modal";
  Object.assign(modal.style, {
    position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
    background: "#222", color: "#fff", padding: "20px", borderRadius: "10px", zIndex: "1000", boxShadow: "0 0 10px rgba(0,0,0,0.5)"
  });

  modal.innerHTML = `
    <h4>${exerciseName}</h4>
    <label>Peso (kg)</label>
    <input type="number" step="0.1" value="${weight}" id="modal-weight" />
    <label>Repeticiones</label>
    <input type="number" value="${reps}" id="modal-reps" />
    <div style="margin-top:10px; display:flex; gap:10px; justify-content:flex-end;">
      <button id="modal-save-btn">Guardar</button>
      <button id="modal-cancel-btn">Cancelar</button>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector("#modal-save-btn").onclick = async () => {
    const newWeight = parseFloat(modal.querySelector("#modal-weight").value);
    const newReps = parseInt(modal.querySelector("#modal-reps").value);
    if (!newWeight || !newReps) return alert("Completa peso y repeticiones");

    await supabase.from("exercise_records").upsert({
      mesocycle_id: mesocycleId,
      exercise_id: exerciseId,
      day_number: day,
      week_number: week,
      weight_kg: newWeight,
      reps: newReps
    }, { onConflict: ["mesocycle_id","exercise_id","day_number","week_number"] });

    modal.remove();
    const template = await getTemplateById((await supabase.from("mesocycles").select("template_id").eq("id", mesocycleId).single()).data.template_id);
    await renderExercisesForRegistro(document.querySelector(".registro-container"), mesocycleId, day, week, template);
  };

  modal.querySelector("#modal-cancel-btn").onclick = () => modal.remove();
}

/* ======================
   INIT
====================== */
checkSession();
