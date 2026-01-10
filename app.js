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
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const templateSelect = document.getElementById("template-select");
const mesocycleNameInput = document.getElementById("mesocycle-name");
const mesocycleWeeksInput = document.getElementById("mesocycle-weeks");
const createBtn = document.getElementById("create-mesocycle-btn");

const historyList = document.getElementById("history-list");
const registroSelect = document.getElementById("registro-select");
const registroEditor = document.getElementById("registro-editor");

let selectedDays = 0;
let editingMesocycleId = null;

/* ======================
   AUTH
====================== */
document.getElementById("login-btn").onclick = async () => {
  const email = emailInput.value;
  const password = passwordInput.value;
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  message.textContent = error?.message || "";
};

document.getElementById("signup-btn").onclick = async () => {
  const email = emailInput.value;
  const password = passwordInput.value;
  const { error } = await supabase.auth.signUp({ email, password });
  message.textContent = error ? error.message : "Usuario creado";
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
   VIEW
====================== */
function showApp() {
  loginView.style.display = "none";
  appView.style.display = "block";
  setupTabs();
  setupDayButtons();
  loadTemplates();
  loadMesocycles();
}

function showLogin() {
  loginView.style.display = "block";
  appView.style.display = "none";
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
   DÍAS (CREAR MESOCICLO)
====================== */
function setupDayButtons() {
  const buttons = document.querySelectorAll(".day-btn");

  buttons.forEach(btn => {
    btn.onclick = () => {
      buttons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      selectedDays = Number(btn.dataset.days);
      console.log("Días seleccionados:", selectedDays);
    };
  });
}

async function loadExercisesForSelect(select, template) {
  select.innerHTML = "";

  let query = supabase
    .from("exercises")
    .select("id, name, subgroup")
    .order("name");

  if (template?.emphasis && template.emphasis !== "Todos") {
    query = query.in("subgroup", template.emphasis.split(","));
  }

  const { data, error } = await query;
  if (error) {
    console.error(error);
    return;
  }

  data.forEach(ex => {
    const opt = document.createElement("option");
    opt.value = ex.id;
    opt.textContent = `${ex.name} (${ex.subgroup})`;
    select.appendChild(opt);
  });
}

/* ======================
   CREATE / EDIT MESOCYCLE
====================== */
createBtn.onclick = async () => {
  const name = mesocycleNameInput.value.trim();
  const template_id = templateSelect.value;
  const weeks = parseInt(mesocycleWeeksInput.value);

  if (!name || !template_id || !weeks || !selectedDays) return alert("Completa todos los campos");

  // Obtener ID de usuario correctamente
  const { data: { session } } = await supabase.auth.getSession();
  const user_id = session?.user?.id;
  if (!user_id) return alert("No hay usuario autenticado");

  try {
    if (editingMesocycleId) {
      const { error } = await supabase
        .from("mesocycles")
        .update({ name, template_id, weeks, days_per_week: selectedDays, user_id })
        .eq("id", editingMesocycleId);
      if (error) throw error;
      editingMesocycleId = null;
    } else {
      const { error } = await supabase
        .from("mesocycles")
        .insert({ name, template_id, weeks, days_per_week: selectedDays, user_id });
      if (error) throw error;
    }

    mesocycleNameInput.value = "";
    templateSelect.value = "";
    mesocycleWeeksInput.value = "";
    selectedDays = 0;
    renderDayButtons();

    await loadMesocycles();
    alert("Mesociclo guardado correctamente!");
  } catch (err) {
    console.error(err);
    alert("Error al guardar el mesociclo: " + err.message);
  }
};

/* ======================
   LOAD TEMPLATES
====================== */
async function loadTemplates() {
  const { data } = await supabase.from("templates").select("*").order("name");
  templateSelect.innerHTML = `<option value="">Selecciona plantilla</option>`;
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
  const { data } = await supabase.from("mesocycles").select("*").order("created_at", { ascending: false });

  historyList.innerHTML = "";
  registroSelect.innerHTML = `<option value="">Selecciona mesociclo</option>`;

  for (const m of data) {
    const template = await getTemplateById(m.template_id);

    const card = document.createElement("li");
    card.className = "history-card";
    card.innerHTML = `
      <p>Plantilla: ${template.name}</p>
      <h4>${m.name} · ${m.weeks} semanas · ${m.days_per_week} días</h4>
      <button class="edit-btn">Editar</button>
      <button class="register-btn">Registrar</button>
    `;

    card.querySelector(".edit-btn").onclick = () => {
      editingMesocycleId = m.id;
      mesocycleNameInput.value = m.name;
      mesocycleWeeksInput.value = m.weeks;
      templateSelect.value = m.template_id;
      selectedDays = m.days_per_week;

      document.querySelectorAll(".day-btn").forEach(b => {
        b.classList.toggle("active", parseInt(b.dataset.days) === selectedDays);
      });

      document.querySelector('[data-tab="crear-tab"]').click();
    };

    card.querySelector(".register-btn").onclick = () => openRegistro(m.id);

    historyList.appendChild(card);

    const opt = document.createElement("option");
    opt.value = m.id;
    opt.textContent = m.name;
    registroSelect.appendChild(opt);
  }
}

async function openExerciseModal(
  mesocycleId,
  exerciseId,
  day,
  week,
  exerciseName
) {
  const { data: session } = await supabase.auth.getSession();
  const userId = session.user.id;

  const modal = document.createElement("div");
  modal.className = "exercise-modal";

  /* =====================
     CARGAR HISTORIAL
  ===================== */
  const { data: history } = await supabase
    .from("exercise_records")
    .select("week_number, day_number, weight_kg, reps, created_at")
    .eq("user_id", userId)
    .eq("exercise_id", exerciseId)
    .order("created_at", { ascending: false });

  modal.innerHTML = `
    <h3>${exerciseName}</h3>

    <div class="last-entry">
      <label>Peso (kg)</label>
      <input id="modal-weight" type="number" step="0.5" />
      
      <label>Reps</label>
      <input id="modal-reps" type="number" />
    </div>

    <button id="save-record-btn">Guardar registro</button>

    <hr />

    <h4>Historial</h4>
    <div class="history-table">
      ${
        history.length
          ? history
              .map(
                r => `
                <div class="history-row">
                  <span>Sem ${r.week_number} · Día ${r.day_number}</span>
                  <strong>${r.weight_kg} kg x ${r.reps}</strong>
                </div>`
              )
              .join("")
          : "<p>No hay registros previos</p>"
      }
    </div>

    <button id="close-modal">Cerrar</button>
  `;

  document.body.appendChild(modal);

  /* =====================
     GUARDAR
  ===================== */
  modal.querySelector("#save-record-btn").onclick = async () => {
    const weight = Number(modal.querySelector("#modal-weight").value);
    const reps = Number(modal.querySelector("#modal-reps").value);

    if (!weight || !reps) {
      return alert("Completa peso y repeticiones");
    }

    await supabase.from("exercise_records").insert({
      user_id: userId,
      mesocycle_id: mesocycleId,
      exercise_id: exerciseId,
      week_number: week,
      day_number: day,
      weight_kg: weight,
      reps: reps
    });

    modal.remove();
    alert("Registro guardado");
  };

  modal.querySelector("#close-modal").onclick = () => modal.remove();
}

/* ======================
   REGISTRO
====================== */
registroSelect.onchange = () => {
  if (registroSelect.value) openRegistro(registroSelect.value);
};

async function openRegistro(id) {
  document.querySelector('[data-tab="registro-tab"]').click();
  await renderRegistroEditor(id);
}

async function renderRegistroEditor(mesocycleId) {
  registroEditor.innerHTML = "";

  const { data: mesocycle } = await supabase
    .from("mesocycles")
    .select("*")
    .eq("id", mesocycleId)
    .single();

  const template = await getTemplateById(mesocycle.template_id);

  const container = document.createElement("div");
  container.className = "registro-container";

  /* =====================
     TÍTULO
  ===================== */
  const title = document.createElement("h3");
  title.textContent = `Mesociclo: ${mesocycle.name}`;
  container.appendChild(title);

  /* =====================
     SEMANA
  ===================== */
  const weekSelect = document.createElement("select");
  weekSelect.className = "week-select";

  for (let i = 1; i <= mesocycle.weeks; i++) {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = `Semana ${i}`;
    weekSelect.appendChild(opt);
  }
  container.appendChild(weekSelect);

  /* =====================
     LABEL DÍAS
  ===================== */
  const dayLabel = document.createElement("label");
  dayLabel.textContent = "Días de entrenamiento";
  container.appendChild(dayLabel);

  /* =====================
     BOTONES DE DÍA
  ===================== */
  const dayDiv = document.createElement("div");
  dayDiv.className = "day-mini-buttons";

  let selectedDay = null;

  for (let i = 1; i <= mesocycle.days_per_week; i++) {
    const btn = document.createElement("button");
    btn.textContent = `Día ${i}`;
    btn.onclick = () => {
      [...dayDiv.children].forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      selectedDay = i;
    };
    dayDiv.appendChild(btn);
  }
  container.appendChild(dayDiv);

  /* =====================
     SELECTOR DE EJERCICIOS ✅
  ===================== */
  const exerciseSelect = document.createElement("select");
  exerciseSelect.multiple = true;
  exerciseSelect.size = 8;
  exerciseSelect.className = "exercise-select";
  container.appendChild(exerciseSelect);

  await loadExercisesForSelect(exerciseSelect, template);

  /* =====================
     BOTÓN GUARDAR
  ===================== */
  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Registrar ejercicios";
  saveBtn.className = "register-btn";

  saveBtn.onclick = async () => {
    if (!selectedDay) return alert("Selecciona un día");

    const week = Number(weekSelect.value);

    const selectedExercises = [...exerciseSelect.selectedOptions].map(o => ({
      mesocycle_id: mesocycleId,
      exercise_id: o.value,
      day_number: selectedDay,
      week_number: week
    }));

    await supabase
      .from("mesocycle_exercises")
      .delete()
      .eq("mesocycle_id", mesocycleId)
      .eq("day_number", selectedDay)
      .eq("week_number", week);

    if (selectedExercises.length) {
      await supabase
        .from("mesocycle_exercises")
        .insert(selectedExercises);
    }

    alert("Ejercicios registrados");
  };

  container.appendChild(saveBtn);
  registroEditor.appendChild(container);
}

/* ======================
   INIT
====================== */
checkSession();
