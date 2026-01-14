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
   DAY SELECTOR (CREAR)
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
   MESOCYCLES
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
  if (!session) return;

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
    alert("Error al guardar");
    return;
  }

  resetMesocycleForm();
  loadMesocycles();
}

function resetMesocycleForm() {
  mesocycleNameInput.value = "";
  mesocycleWeeksInput.value = "";
  templateSelect.value = "";
  selectedDaysPerWeek = null;
  editingMesocycleId = null;

  document.querySelectorAll(".day-btn").forEach(b => b.classList.remove("active"));
}

/* ======================
   LOAD DATA
====================== */
async function loadTemplates() {
  const { data, error } = await supabase.from("templates").select("*").order("name");
  if (error) return console.error(error);

  templateSelect.innerHTML = `<option value="">Selecciona plantilla</option>`;
  data.forEach(t => {
    const opt = document.createElement("option");
    opt.value = t.id;
    opt.textContent = t.name;
    templateSelect.appendChild(opt);
  });
}

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
      <button class="register-btn">Registrar</button>
    `;

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
registroSelect.onchange = () => {
  if (registroSelect.value) openRegistro(registroSelect.value);
};

async function openRegistro(mesocycleId) {
  // activar tab manualmente (seguro)
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".tab-content").forEach(c => c.classList.add("hidden"));

  const registroBtn = document.querySelector('[data-tab="registro-tab"]');
  const registroTab = document.getElementById("registro-tab");

  registroBtn?.classList.add("active");
  registroTab?.classList.remove("hidden");

  await renderRegistroEditor(mesocycleId);
}

/* ======================
   HELPERS
====================== */
function getAllowedSubgroups(enfasis) {
  if (!enfasis || enfasis === "Todos") return null;
  return enfasis.split(",").map(s => s.trim());
}

/* ======================
   REGISTRO EDITOR
====================== */
async function renderRegistroEditor(mesocycleId) {
  try {
    console.log("🟢 renderRegistroEditor", mesocycleId);

    const registroEditor = document.getElementById("registro-editor");
    if (!registroEditor) {
      console.error("❌ No existe #registro-editor");
      return;
    }

    registroEditor.innerHTML = "";

    /* =========================
       CONTENEDORES BASE
    ========================= */
    const weekSelect = document.createElement("select");
    weekSelect.id = "week-select";

    const dayButtons = document.createElement("div");
    dayButtons.className = "day-buttons";

    const registeredExercisesContainer = document.createElement("div");
    registeredExercisesContainer.id = "registered-exercises";

    registroEditor.appendChild(weekSelect);
    registroEditor.appendChild(dayButtons);
    registroEditor.appendChild(registeredExercisesContainer);

    /* =========================
       SEMANAS (1 a 4)
    ========================= */
    for (let w = 1; w <= 4; w++) {
      const opt = document.createElement("option");
      opt.value = w;
      opt.textContent = `Semana ${w}`;
      weekSelect.appendChild(opt);
    }

    let currentWeek = 1;
    let currentDay = 1;

    /* =========================
       DÍAS (1 a 7)
    ========================= */
    function renderDays() {
      dayButtons.innerHTML = "";
      for (let d = 1; d <= 7; d++) {
        const btn = document.createElement("button");
        btn.textContent = `Día ${d}`;
        btn.className = "day-mini-btn";
        if (d === currentDay) btn.classList.add("active");

        btn.onclick = () => {
          currentDay = d;
          document
            .querySelectorAll(".day-mini-btn")
            .forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          loadRegisteredExercises();
        };

        dayButtons.appendChild(btn);
      }
    }

    renderDays();

    /* =========================
       CAMBIO DE SEMANA
    ========================= */
    weekSelect.onchange = () => {
      currentWeek = Number(weekSelect.value);
      loadRegisteredExercises();
    };

    /* =========================
       CARGAR EJERCICIOS REGISTRADOS
    ========================= */
    async function loadRegisteredExercises() {
      registeredExercisesContainer.innerHTML = "<p>Cargando ejercicios...</p>";

      const { data: records, error } = await supabase
        .from("exercise_records")
        .select(`
          id,
          exercise_id,
          exercises (
            ejercicio,
            subgrupo
          )
        `)
        .eq("mesocycle_id", mesocycleId)
        .eq("week_number", currentWeek)
        .eq("day_number", currentDay);

      if (error) {
        console.error("❌ Error cargando exercise_records", error);
        registeredExercisesContainer.innerHTML =
          "<p>Error cargando ejercicios</p>";
        return;
      }

      registeredExercisesContainer.innerHTML = "";

      if (!records || records.length === 0) {
        registeredExercisesContainer.innerHTML =
          "<p>No hay ejercicios registrados para este día</p>";
        return;
      }

      /* =========================
         AGRUPAR POR SUBGRUPO
      ========================= */
      const grouped = {};

      records.forEach(r => {
        const sub = r.exercises?.subgrupo || "Otros";
        if (!grouped[sub]) grouped[sub] = [];
        grouped[sub].push(r);
      });

      Object.keys(grouped).forEach(subgroup => {
        const section = document.createElement("div");
        section.className = "subgroup-section";

        const title = document.createElement("h4");
        title.textContent = subgroup;
        section.appendChild(title);

        grouped[subgroup].forEach(r => {
          const chip = document.createElement("div");
          chip.className = "exercise-chip";
          chip.textContent = r.exercises?.ejercicio || "Ejercicio";

          section.appendChild(chip);
        });

        registeredExercisesContainer.appendChild(section);
      });
    }

    /* =========================
       CARGA INICIAL
    ========================= */
    await loadRegisteredExercises();

    console.log("✅ renderRegistroEditor completado");

  } catch (err) {
    console.error("🔥 Error en renderRegistroEditor", err);
    alert("Error cargando el registro. Revisa la consola.");
  }
}

/* ======================
   RENDER EJERCICIOS DÍA
====================== */
async function renderExercisesForDay(mesocycleId, week, day, container) {
  container.innerHTML = "";

  const { data } = await supabase
    .from("exercise_records")
    .select(`weight, reps, exercises(name, subgroup)`)
    .eq("mesocycle_id", mesocycleId)
    .eq("week_number", week)
    .eq("day_number", day)
    .order("updated_at", { ascending: false });

  if (!data.length) {
    container.innerHTML = "<p>No hay ejercicios registrados</p>";
    return;
  }

  data.forEach(r => {
    const div = document.createElement("div");
    div.className = "exercise-chip";
    div.textContent = `${r.exercises.name} — ${r.weight}kg x ${r.reps}`;
    container.appendChild(div);
  });
}

/* ======================
   INIT
====================== */
initAuth();
