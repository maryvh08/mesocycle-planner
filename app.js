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
const dayButtonsContainer = document.getElementById("day-buttons-container");

const historyList = document.getElementById("history-list");
const registroSelect = document.getElementById("registro-select");
const registroEditor = document.getElementById("registro-editor");

/* ======================
   STATE
====================== */
let selectedDays = 0;
let editingMesocycleId = null;

/* ======================
   AUTH
====================== */
document.getElementById("login-btn").onclick = async () => {
  const { error } = await supabase.auth.signInWithPassword({
    email: emailInput.value,
    password: passwordInput.value
  });
  message.textContent = error?.message || "";
};

document.getElementById("signup-btn").onclick = async () => {
  const { error } = await supabase.auth.signUp({
    email: emailInput.value,
    password: passwordInput.value
  });
  message.textContent = error ? error.message : "Usuario creado";
};

document.getElementById("logout-btn").onclick = async () => {
  await supabase.auth.signOut();
};

/* ======================
   SESSION
====================== */
supabase.auth.onAuthStateChange((_e, session) => {
  session ? showApp() : showLogin();
});

async function checkSession() {
  const { data } = await supabase.auth.getSession();
  data.session ? showApp() : showLogin();
}

/* ======================
   VIEW
====================== */
async function showApp() {
  loginView.style.display = "none";
  appView.style.display = "block";

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  setupTabs();
  renderDayButtons();

  await loadTemplates();
  await loadMesocycles();
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
   DAY BUTTONS (CREAR)
====================== */
function renderDayButtons() {
  if (!dayButtonsContainer) {
    console.warn("day-buttons-container no existe en el DOM");
    return;
  }

  dayButtonsContainer.innerHTML = "";
  selectedDays = 0;

  for (let i = 1; i <= 7; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    btn.dataset.days = i;
    btn.className = "day-btn";

    btn.onclick = () => {
      dayButtonsContainer
        .querySelectorAll("button")
        .forEach(b => b.classList.remove("active"));

      btn.classList.add("active");
      selectedDays = i;
    };

    dayButtonsContainer.appendChild(btn);
  }
}

/* ======================
   LOAD TEMPLATES
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

  templateSelect.innerHTML = `<option value="">Selecciona plantilla</option>`;
  data.forEach(t => {
    const opt = document.createElement("option");
    opt.value = t.id;
    opt.textContent = t.name;
    templateSelect.appendChild(opt);
  });
}

/* ======================
   LOAD MESOCYCLES
====================== */
async function loadMesocycles() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  const { data, error } = await supabase
    .from("mesocycles")
    .select("*")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  historyList.innerHTML = "";
  registroSelect.innerHTML = `<option value="">Selecciona mesociclo</option>`;

  data.forEach(m => {
    const li = document.createElement("li");
    li.className = "mesocycle-card";
    li.innerHTML = `
      <strong>${m.name}</strong>
      <div>${m.weeks} semanas · ${m.days_per_week} días</div>
      <button class="edit-btn">Editar mesociclo</button>
      <button class="register-btn">Registrar</button>
    `;

    li.querySelector(".edit-btn").onclick = () => editMesocycle(m);
    li.querySelector(".register-btn").onclick = () => openRegistro(m.id);

    historyList.appendChild(li);

    const opt = document.createElement("option");
    opt.value = m.id;
    opt.textContent = m.name;
    registroSelect.appendChild(opt);
  });
}

/* ======================
   EDIT MESOCYCLE
====================== */
function editMesocycle(m) {
  editingMesocycleId = m.id;
  mesocycleNameInput.value = m.name;
  mesocycleWeeksInput.value = m.weeks;
  templateSelect.value = m.template_id;
  selectedDays = m.days_per_week;

  [...dayButtonsContainer.children].forEach(b => {
    b.classList.toggle("active", Number(b.textContent) === selectedDays);
  });

  document.querySelector('[data-tab="crear-tab"]').click();
}

/* ======================
   CREATE / UPDATE
====================== */
createBtn.onclick = async () => {
  const name = mesocycleNameInput.value.trim();
  const template_id = templateSelect.value;
  const weeks = Number(mesocycleWeeksInput.value);

  if (!name || !template_id || !weeks || !selectedDays) {
    return alert("Completa todos los campos");
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return alert("No autenticado");

  const payload = {
    name,
    template_id,
    weeks,
    days_per_week: selectedDays,
    user_id: session.user.id
  };

  let error;
  if (editingMesocycleId) {
    ({ error } = await supabase
      .from("mesocycles")
      .update(payload)
      .eq("id", editingMesocycleId));
    editingMesocycleId = null;
  } else {
    ({ error } = await supabase.from("mesocycles").insert(payload));
  }

  if (error) {
    console.error(error);
    alert("Error al guardar");
    return;
  }

  mesocycleNameInput.value = "";
  mesocycleWeeksInput.value = "";
  templateSelect.value = "";
  selectedDays = 0;
  renderDayButtons();

  loadMesocycles();
  alert("Mesociclo guardado");
};

/* ======================
   REGISTRO
====================== */
registroSelect.onchange = () => {
  if (registroSelect.value) openRegistro(registroSelect.value);
};

async function openRegistro(id) {
  document.querySelector('[data-tab="registro-tab"]').click();
  renderRegistroEditor(id);
}

async function renderRegistroEditor(mesocycleId) {
  registroEditor.innerHTML = "";

  const { data: mesocycle } = await supabase
    .from("mesocycles")
    .select("*")
    .eq("id", mesocycleId)
    .single();

  const { data: exercises } = await supabase
    .from("exercises")
    .select("*")
    .order("name");

  const title = document.createElement("h3");
  title.textContent = `Mesociclo: ${mesocycle.name}`;
  registroEditor.appendChild(title);

  const weekSelect = document.createElement("select");
  for (let i = 1; i <= mesocycle.weeks; i++) {
    weekSelect.innerHTML += `<option value="${i}">Semana ${i}</option>`;
  }
  registroEditor.appendChild(weekSelect);

  const dayLabel = document.createElement("label");
  dayLabel.textContent = "Días de entrenamiento";
  registroEditor.appendChild(dayLabel);

  const dayDiv = document.createElement("div");
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
  registroEditor.appendChild(dayDiv);

  const exerciseSelect = document.createElement("select");
  exerciseSelect.multiple = true;
  exerciseSelect.size = 8;
  exercises.forEach(ex => {
    const opt = document.createElement("option");
    opt.value = ex.id;
    opt.textContent = ex.name;
    exerciseSelect.appendChild(opt);
  });
  registroEditor.appendChild(exerciseSelect);

  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Registrar ejercicios";
  saveBtn.onclick = async () => {
    if (!selectedDay) return alert("Selecciona un día");

    await supabase
      .from("mesocycle_exercises")
      .delete()
      .eq("mesocycle_id", mesocycleId)
      .eq("day_number", selectedDay)
      .eq("week_number", weekSelect.value);

    const rows = [...exerciseSelect.selectedOptions].map(o => ({
      mesocycle_id: mesocycleId,
      exercise_id: o.value,
      day_number: selectedDay,
      week_number: weekSelect.value
    }));

    if (rows.length) {
      await supabase.from("mesocycle_exercises").insert(rows);
    }

    alert("Ejercicios registrados");
  };

  registroEditor.appendChild(saveBtn);
}

/* ======================
   INIT
====================== */
checkSession();
