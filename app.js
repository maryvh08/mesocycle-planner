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
let currentMesocycleId = null;
let currentWeek = 1;
let currentDay = null;

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
initAuth();
checkSession();

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

async function checkSession() {
  const { data } = await supabase.auth.getSession();
  data.session ? showApp() : showLogin();
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
   DAY SELECTOR (CREAR MESOCICLO)
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
   LOAD TEMPLATES
====================== */
async function loadTemplates() {
  const { data, error } = await supabase
    .from("templates")
    .select("*")
    .order("Nombre_Plantilla");

  if (error) return console.error(error);

  templateSelect.innerHTML = `<option value="">Selecciona plantilla</option>`;
  data.forEach(t => {
    const opt = document.createElement("option");
    opt.value = t.id;
    opt.textContent = t.Nombre_Plantilla;
    templateSelect.appendChild(opt);
  });
}

/* ======================
   SAVE MESOCYCLE
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
  if (!session) return alert("No autenticado");

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
    alert("Error al guardar mesociclo");
    return;
  }

  resetMesocycleForm();
  loadMesocycles();
}

/* ======================
   RESET FORM
====================== */
function resetMesocycleForm() {
  mesocycleNameInput.value = "";
  mesocycleWeeksInput.value = "";
  templateSelect.value = "";
  selectedDaysPerWeek = null;
  editingMesocycleId = null;

  document.querySelectorAll(".day-btn").forEach(b => b.classList.remove("active"));
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

  if (error) return console.error(error);

  historyList.innerHTML = "";
  registroSelect.innerHTML = `<option value="">Selecciona mesociclo</option>`;

  data.forEach(m => {
    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${m.name}</strong>
      <div>${m.weeks} semanas · ${m.days_per_week} días</div>
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
  selectedDaysPerWeek = m.days_per_week;

  document.querySelectorAll(".day-btn").forEach(b =>
    b.classList.toggle("active", Number(b.dataset.days) === selectedDaysPerWeek)
  );

  document.querySelector('[data-tab="crear-tab"]').click();
}

/* ======================
   REGISTRO
====================== */
registroSelect.onchange = () => {
  if (registroSelect.value) openRegistro(registroSelect.value);
};

async function openRegistro(mesocycleId) {
  currentMesocycleId = mesocycleId;
  document.querySelector('[data-tab="registro-tab"]').click();
  await renderRegistroEditor(mesocycleId);
}

/* ======================
   SUBGROUP FILTER
====================== */
function getAllowedSubgroups(enfasis) {
  if (!enfasis || enfasis === "Todos") return null;
  return enfasis.split(",").map(s => s.trim());
}

/* ======================
   RENDER REGISTRO EDITOR
====================== */
async function renderRegistroEditor(mesocycleId) {
  registroEditor.innerHTML = "";

  const { data: mesocycle } = await supabase
    .from("mesocycles")
    .select(`
      *,
      templates (
        Enfasis
      )
    `)
    .eq("id", mesocycleId)
    .single();

  const title = document.createElement("h3");
  title.textContent = mesocycle.name;
  registroEditor.appendChild(title);

  /* SEMANAS */
  const weekSelect = document.createElement("select");
  for (let i = 1; i <= mesocycle.weeks; i++) {
    weekSelect.innerHTML += `<option value="${i}">Semana ${i}</option>`;
  }
  weekSelect.onchange = () => {
    currentWeek = Number(weekSelect.value);
    if (currentDay) loadExercisesForDay();
  };
  registroEditor.appendChild(weekSelect);

  /* DÍAS */
  const dayContainer = document.createElement("div");
  dayContainer.className = "day-buttons";

  for (let i = 1; i <= mesocycle.days_per_week; i++) {
    const btn = document.createElement("button");
    btn.textContent = `Día ${i}`;
    btn.onclick = () => {
      [...dayContainer.children].forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentDay = i;
      loadExercisesForDay();
    };
    dayContainer.appendChild(btn);
  }
  registroEditor.appendChild(dayContainer);

  /* CONTENEDOR */
  const container = document.createElement("div");
  container.id = "registered-exercises";
  registroEditor.appendChild(container);
}

/* ======================
   LOAD EXERCISES PER DAY
====================== */
async function loadExercisesForDay() {
  const container = document.getElementById("registered-exercises");
  container.innerHTML = "";

  const { data, error } = await supabase
    .from("exercise_records")
    .select(`
      id,
      weight,
      reps,
      exercises (
        Ejercicio,
        Subgrupo
      )
    `)
    .eq("mesocycle_id", currentMesocycleId)
    .eq("week_number", currentWeek)
    .eq("day_number", currentDay)
    .order("updated_at", { ascending: false });

  if (error || !data.length) {
    container.innerHTML = "<p>No hay ejercicios registrados</p>";
    return;
  }

  const grouped = {};
  data.forEach(r => {
    grouped[r.exercises.Subgrupo] ??= [];
    grouped[r.exercises.Subgrupo].push(r);
  });

  Object.entries(grouped).forEach(([subgroup, rows]) => {
    const section = document.createElement("section");
    section.className = "subgroup-section";
    section.innerHTML = `<h4>${subgroup}</h4>`;

    rows.forEach(r => {
      const chip = document.createElement("div");
      chip.className = "exercise-chip";
      chip.innerHTML = `
        <strong>${r.exercises.Ejercicio}</strong>
        <div>${r.weight} kg · ${r.reps} reps</div>
      `;
      section.appendChild(chip);
    });

    container.appendChild(section);
  });
}

 
