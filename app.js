import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://vhwfenefevzzksxrslkx.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZod2ZlbmVmZXZ6emtzeHJzbGt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MTE3ODAsImV4cCI6MjA4MzQ4Nzc4MH0.CG1KzxpxGHifXsgBvH-4E4WvXbj6d-8WsagqaHAtVwo";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ======================
   GLOBAL STATE
====================== */
let selectedDays = null;
let editingMesocycleId = null;

/* ======================
   ELEMENTS
====================== */
const loginView = document.getElementById("login-view");
const appView = document.getElementById("app-view");

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
   AUTH
====================== */
document.getElementById("login-btn").onclick = async () => {
  await supabase.auth.signInWithPassword({
    email: emailInput.value,
    password: passwordInput.value
  });
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
function showApp() {
  loginView.style.display = "none";
  appView.style.display = "block";
  setupTabs();
  renderDayButtons();
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
   DAYS SELECTOR (FIXED)
====================== */
function renderDayButtons() {
  dayButtonsContainer.innerHTML = "";
  selectedDays = null;

  for (let i = 1; i <= 7; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    btn.className = "day-btn";

    btn.onclick = () => {
      [...dayButtonsContainer.children].forEach(b => b.classList.remove("active"));
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
  const { data } = await supabase.from("templates").select("*").order("name");
  templateSelect.innerHTML = `<option value="">Selecciona plantilla</option>`;
  data.forEach(t => {
    const opt = document.createElement("option");
    opt.value = t.id;
    opt.textContent = t.name;
    templateSelect.appendChild(opt);
  });
}

/* ======================
   MESOCYCLES
====================== */
async function loadMesocycles() {
  const { data } = await supabase.from("mesocycles").select("*").order("created_at", { ascending: false });

  historyList.innerHTML = "";
  registroSelect.innerHTML = `<option value="">Selecciona mesociclo</option>`;

  data.forEach(m => {
    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${m.name}</strong><br>
      ${m.weeks} semanas · ${m.days_per_week} días<br>
      <button class="edit-btn">Editar</button>
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

  renderDayButtons();
  [...dayButtonsContainer.children].forEach(btn => {
    if (Number(btn.textContent) === m.days_per_week) {
      btn.classList.add("active");
      selectedDays = m.days_per_week;
    }
  });

  document.querySelector('[data-tab="crear-tab"]').click();
}

/* ======================
   CREATE / UPDATE
====================== */
createBtn.onclick = async () => {
  if (!selectedDays) return alert("Selecciona días");

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return alert("No autenticado");

  const payload = {
    name: mesocycleNameInput.value,
    weeks: Number(mesocycleWeeksInput.value),
    days_per_week: selectedDays,
    template_id: templateSelect.value,
    user_id: session.user.id
  };

  if (!payload.name || !payload.weeks || !payload.template_id) {
    return alert("Campos incompletos");
  }

  if (editingMesocycleId) {
    await supabase.from("mesocycles").update(payload).eq("id", editingMesocycleId);
    editingMesocycleId = null;
  } else {
    await supabase.from("mesocycles").insert(payload);
  }

  mesocycleNameInput.value = "";
  mesocycleWeeksInput.value = "";
  templateSelect.value = "";
  renderDayButtons();

  await loadMesocycles();
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

  const { data: m } = await supabase.from("mesocycles").select("*").eq("id", mesocycleId).single();
  const { data: exercises } = await supabase.from("exercises").select("*").order("name");

  registroEditor.innerHTML = `
    <h3>Mesociclo: ${m.name}</h3>

    <label>Días de entrenamiento</label>
    <select id="registro-day">
      ${[...Array(m.days_per_week)].map((_, i) => `<option value="${i+1}">Día ${i+1}</option>`).join("")}
    </select>

    <label>Ejercicios</label>
    <select id="exercise-select" multiple size="8">
      ${exercises.map(e => `<option value="${e.id}">${e.name}</option>`).join("")}
    </select>

    <button id="save-exercises">Guardar</button>
  `;

  document.getElementById("save-exercises").onclick = async () => {
    alert("Ejercicios listos para registrar por día (siguiente paso)");
  };
}

/* ======================
   INIT
====================== */
checkSession();

