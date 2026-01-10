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

/* ======================
   DÍAS (CREAR MESOCICLO)
====================== */
function setupDayButtons() {
  document.querySelectorAll(".day-btn").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll(".day-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      selectedDays = parseInt(btn.dataset.days);
    };
  });
}

/* ======================
   CREATE / EDIT MESOCYCLE
====================== */
createBtn.onclick = async () => {
  const name = mesocycleNameInput.value.trim();
  const weeks = parseInt(mesocycleWeeksInput.value);
  const template_id = templateSelect.value;

  if (!name || !weeks || !template_id || !selectedDays) {
    return alert("Completa todos los campos");
  }

  const { data: session } = await supabase.auth.getSession();
  if (!session?.user) return alert("Usuario no autenticado");

  const payload = {
    name,
    weeks,
    template_id,
    days_per_week: selectedDays,
    user_id: session.user.id
  };

  const query = editingMesocycleId
    ? supabase.from("mesocycles").update(payload).eq("id", editingMesocycleId)
    : supabase.from("mesocycles").insert(payload);

  const { error } = await query;
  if (error) return alert(error.message);

  editingMesocycleId = null;
  mesocycleNameInput.value = "";
  mesocycleWeeksInput.value = "";
  templateSelect.value = "";
  selectedDays = 0;
  document.querySelectorAll(".day-btn").forEach(b => b.classList.remove("active"));

  await loadMesocycles();
  alert("Mesociclo guardado");
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

  const { data: m } = await supabase.from("mesocycles").select("*").eq("id", mesocycleId).single();
  const template = await getTemplateById(m.template_id);

  const container = document.createElement("div");
  container.className = "registro-container";

  container.innerHTML = `<h3>${m.name}</h3>`;

  const weekSelect = document.createElement("select");
  for (let w = 1; w <= m.weeks; w++) {
    weekSelect.innerHTML += `<option value="${w}">Semana ${w}</option>`;
  }

  const dayDiv = document.createElement("div");
  for (let d = 1; d <= m.days_per_week; d++) {
    const b = document.createElement("button");
    b.textContent = `Día ${d}`;
    b.onclick = () => loadDay(container, mesocycleId, d, weekSelect.value, template);
    dayDiv.appendChild(b);
  }

  container.appendChild(weekSelect);
  container.appendChild(dayDiv);

  registroEditor.appendChild(container);
}

/* ======================
   INIT
====================== */
checkSession();
