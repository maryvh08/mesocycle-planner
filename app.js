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
const dayButtonsContainer = document.getElementById("day-buttons-container"); // contenedor de botones
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
  setupDayButtons(); // botones funcionales
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
   DÍAS DE ENTRENAMIENTO (Crear Mesociclo)
====================== */
function setupDayButtons() {
  dayButtonsContainer.innerHTML = ""; // limpiar contenedor

  for (let i = 1; i <= 7; i++) {
    const btn = document.createElement("button");
    btn.className = "day-btn";
    btn.textContent = i;
    btn.dataset.days = i;
    btn.onclick = () => {
      dayButtonsContainer.querySelectorAll(".day-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      selectedDays = i;
    };
    dayButtonsContainer.appendChild(btn);
  }
}

/* ======================
   CREATE / EDIT MESOCYCLE
====================== */
createBtn.onclick = async () => {
  const name = mesocycleNameInput.value.trim();
  const template_id = templateSelect.value;
  const weeks = parseInt(mesocycleWeeksInput.value);
  const days_per_week = selectedDays;

  if (!name || !template_id || !weeks || !days_per_week) {
    return alert("Completa todos los campos");
  }

  const { data: session } = await supabase.auth.getSession();
  const user_id = session?.user?.id;
  if (!user_id) return alert("No hay usuario autenticado");

  try {
    if (editingMesocycleId) {
      const { error } = await supabase.from("mesocycles")
        .update({ name, template_id, weeks, days_per_week })
        .eq("id", editingMesocycleId)
        .eq("user_id", user_id);
      if (error) throw error;
      editingMesocycleId = null;
    } else {
      const { error } = await supabase.from("mesocycles")
        .insert({ name, template_id, weeks, days_per_week, user_id });
      if (error) throw error;
    }

    mesocycleNameInput.value = "";
    templateSelect.value = "";
    mesocycleWeeksInput.value = "";
    selectedDays = 0;
    dayButtonsContainer.querySelectorAll(".day-btn").forEach(b => b.classList.remove("active"));

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

    li.querySelector(".edit-btn").onclick = () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(c => c.classList.add("hidden"));
      document.querySelector('.tab-btn[data-tab="crear-tab"]').classList.add("active");
      document.getElementById("crear-tab").classList.remove("hidden");

      mesocycleNameInput.value = m.name;
      mesocycleWeeksInput.value = m.weeks;
      templateSelect.value = m.template_id;

      dayButtonsContainer.querySelectorAll(".day-btn").forEach(b => b.classList.remove("active"));
      const btnDias = dayButtonsContainer.querySelector(`.day-btn[data-days="${m.days_per_week}"]`);
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
   REGISTRO TAB y demás funciones
   (Se mantiene igual que antes)
====================== */
// ... (aquí iría el código de registro y renderExercisesForRegistro idéntico a tu versión anterior)

checkSession();
