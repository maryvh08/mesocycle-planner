import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://vhwfenefevzzksxrslkx.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZod2ZlbmVmZXZ6emtzeHJzbGt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MTE3ODAsImV4cCI6MjA4MzQ4Nzc4MH0.CG1KzxpxGHifXsgBvH-4E4WvXbj6d-8WsagqaHAtVwo";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ======================
   AUTH UI REFERENCES
====================== */
const loginView = document.getElementById("login-view");
const appView = document.getElementById("app-view");
const message = document.getElementById("auth-message");

/* ======================
   LOGIN
====================== */
document.getElementById("login-btn").onclick = async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    message.textContent = error.message;
    return;
  }

  if (data.session) {
    showApp();
  }
};

/* ======================
   SIGNUP
====================== */
document.getElementById("signup-btn").onclick = async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { error } = await supabase.auth.signUp({
    email,
    password
  });

  message.textContent = error
    ? error.message
    : "Usuario creado. Ahora inicia sesión.";
};

/* ======================
   LOGOUT
====================== */
document.getElementById("logout-btn").onclick = async () => {
  await supabase.auth.signOut();
  showLogin();
};

/* ======================
   SESSION CHECK
====================== */
async function checkSession() {
  const {
    data: { session }
  } = await supabase.auth.getSession();

  session ? showApp() : showLogin();
}

supabase.auth.onAuthStateChange((_event, session) => {
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
}

function showLogin() {
  loginView.style.display = "block";
  appView.style.display = "none";
}

/* ======================
   MESOCYCLES
====================== */
const mesocycleList = document.getElementById("mesocycle-list");

async function loadMesocycles() {
  const { data, error } = await supabase
    .from("mesocycles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  mesocycleList.innerHTML = "";

  data.forEach((m) => {
    const li = document.createElement("li");
    li.textContent = `${m.name} – ${m.weeks} semanas – ${m.days_per_week} días`;
    mesocycleList.appendChild(li);
  });
}

/* ======================
   CREATE MESOCYCLE
====================== */
const templateSelect = document.getElementById("template-select");
let selectedDays = null;

async function createMesocycle() {
  const name = document.getElementById("mesocycle-name").value;
  const weeks = parseInt(document.getElementById("mesocycle-weeks").value);
  const templateId = templateSelect.value;

  if (!name || !weeks || !selectedDays || !templateId) {
    alert("Completa todos los campos");
    return;
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("mesocycles").insert({
    name,
    weeks,
    days_per_week: selectedDays,
    template_id: templateId,
    user_id: user.id
  });

  if (error) {
    alert(error.message);
    return;
  }

  alert("Mesociclo creado ✅");

  document.getElementById("mesocycle-name").value = "";
  document.getElementById("mesocycle-weeks").value = "";
  templateSelect.value = "";
  selectedDays = null;
  document
    .querySelectorAll(".day-btn")
    .forEach((b) => b.classList.remove("active"));

  loadMesocycles();
}

document
  .getElementById("create-mesocycle-btn")
  .addEventListener("click", createMesocycle);

/* ======================
   TEMPLATES
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

  templateSelect.innerHTML =
    '<option value="">Selecciona una plantilla</option>';

  data.forEach((t) => {
    const option = document.createElement("option");
    option.value = t.id;
    option.textContent = t.name;
    templateSelect.appendChild(option);
  });
}

/* ======================
   DAYS SELECTOR
====================== */
document.querySelectorAll(".day-btn").forEach((btn) => {
  btn.onclick = () => {
    document
      .querySelectorAll(".day-btn")
      .forEach((b) => b.classList.remove("active"));

    btn.classList.add("active");
    selectedDays = parseInt(btn.dataset.days);
  };
});

/* ======================
   INIT
====================== */
checkSession();
