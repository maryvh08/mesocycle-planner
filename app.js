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
   DAY SELECTOR
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
   TEMPLATES
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
   MESOCYCLES
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
   REGISTRO
====================== */
async function openRegistro(mesocycleId) {
  document.querySelector('[data-tab="registro-tab"]').click();
  await renderRegistroEditor(mesocycleId);
}

/* ======================
   SUBGRUPOS
====================== */
function getAllowedSubgroups(enfasis) {
  if (!enfasis || enfasis === "Todos") return null;
  return enfasis.split(",").map(s => s.trim());
}

/* ======================
   RENDER EJERCICIOS DÍA
====================== */
async function renderExercisesForDay({ mesocycleId, week, day, container }) {
  container.innerHTML = "";

  const { data: mesocycle } = await supabase
    .from("mesocycles")
    .select(`templates ( Enfasis )`)
    .eq("id", mesocycleId)
    .single();

  const allowed = getAllowedSubgroups(mesocycle.templates?.Enfasis);

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
    .eq("mesocycle_id", mesocycleId)
    .eq("week_number", week)
    .eq("day_number", day)
    .order("updated_at", { ascending: false });

  if (error || !data.length) {
    container.innerHTML = "<p>No hay ejercicios registrados</p>";
    return;
  }

  const filtered = allowed
    ? data.filter(r => allowed.includes(r.exercises.Subgrupo))
    : data;

  const grouped = {};
  filtered.forEach(r => {
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

/* ======================
   REGISTRO EDITOR
====================== */
async function renderRegistroEditor(mesocycleId) {
  registroEditor.innerHTML = "";

  const { data: mesocycle } = await supabase
    .from("mesocycles")
    .select("*")
    .eq("id", mesocycleId)
    .single();

  const title = document.createElement("h3");
  title.textContent = mesocycle.name;
  registroEditor.appendChild(title);

  const registeredExercisesContainer = document.createElement("div");
  registroEditor.appendChild(registeredExercisesContainer);

  const dayContainer = document.createElement("div");
  dayContainer.className = "day-buttons";

  let selectedDay = null;

  for (let i = 1; i <= mesocycle.days_per_week; i++) {
    const btn = document.createElement("button");
    btn.textContent = `Día ${i}`;
    btn.className = "day-btn";

    btn.onclick = async () => {
      [...dayContainer.children].forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      selectedDay = i;

      await renderExercisesForDay({
        mesocycleId,
        week: 1,
        day: selectedDay,
        container: registeredExercisesContainer
      });
    };

    dayContainer.appendChild(btn);
  }

  registroEditor.appendChild(dayContainer);
}

/* ======================
   INIT
====================== */
initAuth();
