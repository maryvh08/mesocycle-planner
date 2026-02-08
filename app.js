console.log("🔥 app.js cargado  exitosamente");
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

/* ======================
   SUPABASE
====================== */
const SUPABASE_URL = "https://vhwfenefevzzksxrslkx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZod2ZlbmVmZXZ6emtzeHJzbGt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MTE3ODAsImV4cCI6MjA4MzQ4Nzc4MH0.CG1KzxpxGHifXsgBvH-4E4WvXbj6d-8WsagqaHAtVwo";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ======================
   ESTADOS
====================== */
let selectedDaysPerWeek = null;
let editingMesocycleId = null;
let statsChart = null;
let generalStrengthData = null;
let tutorialsData = [];
let swTime = 0;
let swInterval = null;
let timerInterval = null;
let timerTime = 0;      
let timerRunning = false; 
let miniChartInstance = null;
let alarmAudio = null;
let dashboardLoaded = false;

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

const tabs = document.querySelectorAll(".tab-btn");
const statsView = document.getElementById("stats");

const favorites_key = 'favorite_exercises';

const mesoSelectA = document.getElementById("mesoA");
const mesoSelectB = document.getElementById("mesoB");

/* ======================
   DOM CONTENT LOADED
====================== */
document.addEventListener("DOMContentLoaded", () => {
  /* ---------- AUTH HANDLERS ---------- */
  // Login / Logout
  document.getElementById("login-btn")?.addEventListener("click", login);
  document.getElementById("logout-btn")?.addEventListener("click", logout);
   createBtn?.addEventListener("click", saveMesocycle);

  // Signup
  const signupBtn = document.getElementById("signup-btn");
  if (signupBtn) {
    signupBtn.onclick = async () => {
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;
      const msg = document.getElementById("signup-msg");

      if (!email || !password) {
        msg.textContent = "Ingresa email y contraseña.";
        return;
      }

      msg.textContent = "Creando cuenta...";
      try {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        msg.textContent = "Cuenta creada. Redirigiendo...";
        setTimeout(() => (window.location.href = "app.html"), 1000);
      } catch (err) {
        console.error(err);
        msg.textContent = err.message;
      }
    };
  }

  // Reset password
  const resetBtn = document.getElementById("reset-btn");
  if (resetBtn) {
    resetBtn.onclick = async () => {
      const email = document.getElementById("reset-email").value;
      const msg = document.getElementById("reset-msg");

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo:
          "https://maryvh08.github.io/mesocycle-planner/update-password.html",
      });

      msg.textContent = error ? error.message : "Revisa tu email para continuar";
    };
  }

  // Update password
  const updateBtn = document.getElementById("update-btn");
  if (updateBtn) {
    updateBtn.onclick = async () => {
      const password = document.getElementById("new-password").value;
      const msg = document.getElementById("update-msg");

      const { error } = await supabase.auth.updateUser({ password });
      msg.textContent = error ? error.message : "Contraseña actualizada";
      if (!error) setTimeout(() => (location.href = "app.html"), 1500);
    };
  }

  /* ---------- INTERSECTION OBSERVER ---------- */
  const observer = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  const elements = document.querySelectorAll(".fade-up, .fade-in");
  if (elements.length) elements.forEach((el) => observer.observe(el));
});

/* ======================
   AUTH FUNCTIONS
====================== */
async function login() {
  const { error } = await supabase.auth.signInWithPassword({
    email: emailInput.value,
    password: passwordInput.value,
  });
  message.textContent = error?.message || "";
}

async function logout() {
  await supabase.auth.signOut();
}

async function signup() {
  const { error } = await supabase.auth.signUp({
    email: emailInput.value,
    password: passwordInput.value,
  });
  message.textContent = error ? error.message : "Usuario creado";
}

/* ======================
   VIEW FUNCTIONS
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

function showError(container, message) {
  container.innerHTML = `
    <div class="error-box">
      <strong>⚠️ Algo salió mal</strong>
      <p>${message}</p>
    </div>
  `;
}

/* ======================
   TABS
====================== */
function setupTabs() {
  document.querySelectorAll("[data-tab]").forEach(btn => {
    btn.onclick = () => {
      const tab = btn.dataset.tab;

      // Ocultar todos los tabs
      document.querySelectorAll(".tab-content").forEach(t =>
        t.classList.add("hidden")
      );

      // Mostrar el tab seleccionado
      document.getElementById(tab)?.classList.remove("hidden");

      // Cerrar menú en mobile después de seleccionar
      if (window.innerWidth < 768) {
        document.getElementById("side-menu")?.classList.remove("open");
      }

      if (tab === "stats") {
        renderStatsView();
      }
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
    ? await supabase
        .from("mesocycles")
        .update(payload)
        .eq("id", editingMesocycleId)
    : await supabase
        .from("mesocycles")
        .insert(payload);

  if (error) {
    console.error("❌ Error guardando mesociclo:", error);
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
    .select(`
      id,
      name,
      weeks,
      days_per_week,
      created_at,
      templates (
        name,
        emphasis
      )
    `)
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ Error cargando mesociclos", error);
    return;
  }

  /* ===============================
     LIMPIAR UI EXISTENTE
  =============================== */

  historyList.innerHTML = "";
  registroSelect.innerHTML = `<option value="">Selecciona mesociclo</option>`;

  if (mesoSelectA) {
    mesoSelectA.innerHTML = `<option value="">Mesociclo A</option>`;
    mesoSelectB.innerHTML = `<option value="">Mesociclo B</option>`;
  }

  /* ===============================
     RENDER
  =============================== */

  data.forEach((m, index) => {
    const template = Array.isArray(m.templates)
      ? m.templates[0]
      : m.templates;

    /* ===== HISTORIAL ===== */
    const li = document.createElement("li");
    li.className = "mesocycle-history-card";

    li.innerHTML = `
      <h4>${m.name}</h4>
      <div class="muted">
        Plantilla: <strong>${template?.name ?? "Sin plantilla"}</strong>
      </div>
      <div class="muted">
        ${m.weeks} semanas · ${m.days_per_week} días
      </div>

      <div class="history-actions">
        <button class="register-btn">Registrar</button>
        <button class="toggle-history-btn">Ver historial</button>
        <button class="delete-btn">Eliminar</button>
      </div>

      <div class="exercise-history hidden"></div>
    `;

    const historyContainer = li.querySelector(".exercise-history");

    li.querySelector(".toggle-history-btn").onclick = async () => {
      if (!historyContainer.dataset.loaded) {
        await loadExerciseHistory(m.id, historyContainer);
        historyContainer.dataset.loaded = "true";
      }
      historyContainer.classList.toggle("hidden");
    };

    li.querySelector(".register-btn").onclick = () => {
      registroSelect.value = m.id;
      openRegistro(m.id);
    };

    li.querySelector(".delete-btn").onclick = () => {
      deleteMesocycle(m.id);
    };

    historyList.appendChild(li);

    /* ===== SELECT REGISTRO ===== */
    const optRegistro = document.createElement("option");
    optRegistro.value = m.id;
    optRegistro.textContent = m.name;
    registroSelect.appendChild(optRegistro);

    /* ===== SELECT DASHBOARD ===== */
    if (mesoSelectA && mesoSelectB) {
      const optA = document.createElement("option");
      optA.value = m.id;
      optA.textContent = m.name;

      const optB = optA.cloneNode(true);

      mesoSelectA.appendChild(optA);
      mesoSelectB.appendChild(optB);
    }

    /* ===== AUTOLOAD DASHBOARD (último mesociclo) ===== */
    if (index === 0) {
      loadDashboard(m.id);
    }
  });
}

async function loadMesocycleSelectors() {
  const a = document.getElementById('mesoA');
  const b = document.getElementById('mesoB');

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data } = await supabase
    .from('mesocycles')
    .select('id, name')
    .eq('user_id', user.id);

  data.forEach(m => {
    const optA = new Option(m.name, m.id);
    const optB = new Option(m.name, m.id);
    a.add(optA);
    b.add(optB);
  });
}

async function loadMesocyclePRs(mesocycleId) {
  const { data, error } = await supabase
    .from("mesocycle_prs")
    .select("*")
    .eq("mesocycle_id", mesocycleId);

  if (error) {
    console.error("Error cargando PRs", error);
    return [];
  }

  return data;
}

async function loadExerciseHistory(mesocycleId, container) {
  container.innerHTML = "<p>Cargando historial...</p>";

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    container.innerHTML = "<p>Error de autenticación</p>";
    return;
  }

  const { data, error } = await supabase
    .from("exercise_records")
    .select(`
      id,
      exercise_name,
      weight,
      reps,
      week_number,
      day_number,
      updated_at
    `)
    .eq("user_id", user.id)
    .eq("mesocycle_id", mesocycleId)
    .order("week_number")
    .order("day_number")
    .order("updated_at");

  if (error) {
    console.error("❌ Error cargando historial", error);
    container.innerHTML = "<p>Error cargando historial</p>";
    return;
  }

  if (!data.length) {
    container.innerHTML = `
      <div class="empty-state">
        <p>📝 Sin registros</p>
        <small>Agrega ejercicios para comenzar</small>
      </div>
    `;
    return;
  }

  const grouped = {};

  data.forEach(r => {
    const w = `Semana ${r.week_number}`;
    const d = `Día ${r.day_number}`;

    if (!grouped[w]) grouped[w] = {};
    if (!grouped[w][d]) grouped[w][d] = [];

    grouped[w][d].push(r);
  });

  container.innerHTML = "";

  Object.entries(grouped).forEach(([week, days]) => {
    const weekDiv = document.createElement("div");
    weekDiv.className = "week-block";
    weekDiv.innerHTML = `<h5>${week}</h5>`;

    Object.entries(days).forEach(([day, rows]) => {
      const dayDiv = document.createElement("div");
      dayDiv.className = "day-block";
      dayDiv.innerHTML = `<strong>${day}</strong>`;

      rows.forEach(r => {
        const chip = document.createElement("div");
        chip.className = "exercise-chip";

        const label = document.createElement("span");
        label.textContent = `${r.exercise_name} — ${r.weight}kg × ${r.reps}`;
        label.onclick = () => editExerciseRecord(r);

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "chip-delete";
        deleteBtn.textContent = "✕";
        deleteBtn.onclick = async e => {
          e.stopPropagation();
          await deleteExerciseRecord(r.id);
          await loadExerciseHistory(mesocycleId, container);
        };

        chip.append(label, deleteBtn);
        dayDiv.appendChild(chip);
      });

      weekDiv.appendChild(dayDiv);
    });

    container.appendChild(weekDiv);
  });
}

async function deleteExerciseRecord(recordId) {
  if (!confirm("¿Eliminar este ejercicio?")) return;

  const { error } = await supabase
    .from("exercise_records")
    .delete()
    .eq("id", recordId);

  if (error) {
    console.error(error);
    alert("❌ Error eliminando ejercicio");
    return;
  }

  console.log("🗑️ Registro eliminado", recordId);
}

async function editExerciseRecord(record) {
  const newWeight = prompt(
    `Editar peso (${record.exercise_name})`,
    record.weight
  );
  if (newWeight === null) return;

  const newReps = prompt(
    `Editar reps (${record.exercise_name})`,
    record.reps
  );
  if (newReps === null) return;

  const { error } = await supabase
    .from("exercise_records")
    .update({
      weight: Number(newWeight),
      reps: Number(newReps),
      updated_at: new Date().toISOString()
    })
    .eq("id", record.id);

  if (error) {
    console.error("❌ Error actualizando registro", error);
    alert("Error actualizando registro");
    return;
  }

  alert("✅ Registro actualizado");
}

async function deleteMesocycle(mesocycleId) {
  const confirmDelete = confirm(
    "⚠️ Esto eliminará el mesociclo y TODOS sus registros. ¿Continuar?"
  );

  if (!confirmDelete) return;

  // 1️⃣ borrar registros
  const { error: recError } = await supabase
    .from("exercise_records")
    .delete()
    .eq("mesocycle_id", mesocycleId);

  if (recError) {
    console.error(recError);
    alert("Error eliminando registros");
    return;
  }

  // 2️⃣ borrar mesociclo
  const { error: mError } = await supabase
    .from("mesocycles")
    .delete()
    .eq("id", mesocycleId);

  if (mError) {
    console.error(mError);
    alert("Error eliminando mesociclo");
    return;
  }

  alert("Mesociclo eliminado");

  loadMesocycles();
  registroEditor.innerHTML = "";
}

/* ======================
   REGISTRO
====================== */
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
   REGISTRO EDITOR
====================== */
async function renderRegistroEditor(mesocycleId) {
  console.log("🟢 renderRegistroEditor", mesocycleId);

  const registroEditor = document.getElementById("registro-editor");
  const registeredContainer = document.getElementById("registered-exercises");

  registroEditor.innerHTML = "";
  registeredContainer.innerHTML = "";

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  /* ======================
     CARGAR MESOCICLO
  ====================== */
  const { data: mesocycle, error: mError } = await supabase
    .from("mesocycles")
    .select("id, name, weeks, days_per_week, template_id")
    .eq("id", mesocycleId)
    .single();

  if (mError || !mesocycle) {
    console.error(mError);
    registroEditor.textContent = "❌ Error cargando mesociclo";
    return;
  }

  /* ======================
     CARGAR EJERCICIOS
  ====================== */
  const { data: templateExercises, error: eError } = await supabase
    .from("template_exercises")
    .select(`
      exercise_id,
      exercises:template_exercises_exercise_id_fkey (
        id,
        name,
        subgroup
      )
    `)
    .eq("template_id", mesocycle.template_id);

  if (eError) {
    console.error(eError);
    registroEditor.innerHTML = "<p class='error'>Error cargando ejercicios</p>";
    return;
  }

  const exercises = templateExercises
    .map(te => te.exercises)
    .filter(e => e && e.id && e.name);

  if (!exercises.length) {
    registroEditor.innerHTML = `
      <p class="error">
        ⚠ La plantilla existe pero no tiene ejercicios válidos.
      </p>
    `;
    return;
  }

  const exercisesById = Object.fromEntries(
    exercises.map(ex => [ex.id, ex])
  );

  /* ======================
     UI
  ====================== */
  const title = document.createElement("h3");
  title.textContent = mesocycle.name;
  registroEditor.appendChild(title);

  const weekSelect = document.createElement("select");
  for (let i = 1; i <= mesocycle.weeks; i++) {
    weekSelect.append(new Option(`Semana ${i}`, i));
  }
  registroEditor.appendChild(weekSelect);

  const dayContainer = document.createElement("div");
  dayContainer.className = "day-buttons";
  registroEditor.appendChild(dayContainer);

  let selectedDay = null;

  for (let i = 1; i <= mesocycle.days_per_week; i++) {
    const btn = document.createElement("button");
    btn.textContent = `Día ${i}`;
    btn.onclick = () => {
      [...dayContainer.children].forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      selectedDay = i;

      renderExercisesForDay(
        mesocycleId,
        Number(weekSelect.value),
        selectedDay
      );
    };
    dayContainer.appendChild(btn);
  }

  const exerciseSelect = document.createElement("select");
  exerciseSelect.innerHTML = `<option value="">Selecciona ejercicio</option>`;
  exercises.forEach(ex =>
    exerciseSelect.append(new Option(ex.name, ex.id))
  );

  const weightInput = document.createElement("input");
  weightInput.type = "number";
  weightInput.placeholder = "Peso (kg)";

  const repsInput = document.createElement("input");
  repsInput.type = "number";
  repsInput.placeholder = "Reps";

  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Guardar";

  registroEditor.append(
    exerciseSelect,
    weightInput,
    repsInput,
    saveBtn
  );

  /* ======================
     GUARDAR
  ====================== */
  saveBtn.onclick = async () => {
    if (!selectedDay) return alert("Selecciona un día");
    if (!exerciseSelect.value) return alert("Selecciona un ejercicio");

    const exercise = exercisesById[exerciseSelect.value];
    if (!exercise) return alert("Ejercicio inválido");

    const payload = {
      user_id: session.user.id,
      mesocycle_id: mesocycleId,
      exercise_id: exercise.id,
      exercise_name: exercise.name,
      week_number: Number(weekSelect.value),
      day_number: selectedDay,
      weight: Number(weightInput.value),
      reps: Number(repsInput.value)
    };

    // 🚨 comprobar duplicado
    const { data: existing, error: checkError } = await supabase
      .from("exercise_records")
      .select("id")
      .eq("user_id", session.user.id)
      .eq("mesocycle_id", mesocycleId)
      .eq("exercise_id", exercise.id)
      .eq("week_number", payload.week_number)
      .eq("day_number", selectedDay)
      .limit(1);

    if (checkError) {
      console.error(checkError);
      alert("Error validando el ejercicio");
      return;
    }

    if (existing?.length) {
      alert("Ya ha registrado este ejercicio para este día");
      return;
    }

    const { error } = await supabase
      .from("exercise_records")
      .insert(payload);

    if (error) {
      console.error(error);
      alert("Error al guardar");
      return;
    }

    weightInput.value = "";
    repsInput.value = "";

    renderExercisesForDay(
      mesocycleId,
      payload.week_number,
      selectedDay
    );
  };

  console.log("✅ RegistroEditor renderizado correctamente");
}

/* ======================
   TENDENCIAS Y PROGRESO
====================== */

async function loadStrengthTrends(mesocycleId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  let query = supabase
    .from("exercise_records")
    .select("exercise_id, exercise_name, weight, week_number")
    .eq("user_id", user.id)
    .not("weight", "is", null);

  if (mesocycleId) {
    query = query.eq("mesocycle_id", mesocycleId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("❌ Error fuerza", error);
    return;
  }

  processStrengthData(data);
}

function processStrengthData(records) {
  const byExercise = {};

  records.forEach(r => {
    if (!byExercise[r.exercise_id]) {
      byExercise[r.exercise_id] = {
        name: r.exercise_name,
        weeks: {}
      };
    }

    if (!byExercise[r.exercise_id].weeks[r.week_number]) {
      byExercise[r.exercise_id].weeks[r.week_number] = [];
    }

    byExercise[r.exercise_id].weeks[r.week_number].push(r.weight);
  });

  renderStrengthTrends(byExercise);
}

function avg(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function calcTrend(start, end) {
  const diff = ((end - start) / start) * 100;

  if (diff > 2.5) return "up";
  if (diff < -2.5) return "down";
  return "flat";
}

function renderStrengthTrends(data) {
  const container = document.getElementById("strength-trends");
  container.innerHTML = "";

  Object.values(data).forEach(ex => {
    const weeks = Object.keys(ex.weeks).sort((a, b) => a - b);

    if (weeks.length < 2) return; // evita ruido

    const firstWeeks = weeks.slice(0, 2).flatMap(w => ex.weeks[w]);
    const lastWeeks = weeks.slice(-2).flatMap(w => ex.weeks[w]);

    const startAvg = avg(firstWeeks);
    const endAvg = avg(lastWeeks);
    const trend = calcTrend(startAvg, endAvg);

    const icon =
      trend === "up" ? "↑" :
      trend === "down" ? "↓" : "→";

    container.innerHTML += `
     <div class="strength-row clickable"
          data-exercise="${ex.name}"
          data-start="${startAvg}"
          data-end="${endAvg}">
       <span class="exercise">${ex.name}</span>
       <span class="avg">${Math.round(endAvg)} kg</span>
       <span class="trend ${trend}">${icon}</span>
     </div>
   `;
  });
}

async function openExerciseChart(exerciseName, start, end) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data, error } = await supabase
    .from("exercise_records")
    .select("week_number, weight")
    .eq("user_id", user.id)
    .eq("exercise_name", exerciseName)
    .order("week_number");

  if (error || !data.length) return;

  renderMiniChart(exerciseName, data, start, end);
}

function renderMiniChart(name, data, start, end) {
  document.getElementById("modal-title").textContent = name;
  document.getElementById("exercise-modal").classList.remove("hidden");

  const weeks = [...new Set(data.map(d => d.week_number))];

  const avgByWeek = weeks.map(w => {
    const arr = data.filter(d => d.week_number === w).map(d => d.weight);
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  });

  const pctChange = (((end - start) / start) * 100).toFixed(1);

  const ctx = document.getElementById("mini-chart");

  if (window.miniChart) window.miniChart.destroy();

  window.miniChart = new Chart(ctx, {
     type: "line",
     data: {
       labels: weeks.map(w => `Semana ${w}`),
       datasets: [{
         data: avgByWeek,
         borderWidth: 2,
         tension: 0.3
       }]
     },
     options: {
       plugins: {
         tooltip: {
           callbacks: {
             afterBody: () => `Cambio total: ${pctChange}%`
           }
         },
         legend: { display: false }
       },
       scales: {
         y: {
           title: {
             display: true,
             text: "kg"
           }
         }
       }
     }
   });
}

function closeModal() {
  const modal = document.getElementById("exercise-modal");
  modal.classList.add("hidden");

  if (window.miniChart) {
    window.miniChart.destroy();
    window.miniChart = null;
  }
}

function updateStatsMesocycleLabel() {
  const select = document.getElementById("stats-mesocycle");
  const label = document.getElementById("stats-mesocycle-label");

  if (!select || !label) return;

  const selectedOption = select.options[select.selectedIndex];

  if (!select.value) {
    label.textContent = "Todos los mesociclos";
  } else {
    label.textContent = selectedOption.textContent;
  }
}

/* ======================
   RENDER EJERCICIOS DÍA
====================== */
async function renderExercisesForDay(mesocycleId, week, day) {
  const container = document.getElementById("registered-exercises");
  if (!container) return;

  container.innerHTML = "Cargando...";

  const { data, error } = await supabase
    .from("exercise_records")
    .select("id, exercise_name, weight, reps")
    .eq("mesocycle_id", mesocycleId)
    .eq("week_number", week)
    .eq("day_number", day)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("❌ Error cargando ejercicios del día", error);
    container.innerHTML = "<p>Error cargando ejercicios</p>";
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = "<p>No hay ejercicios registrados</p>";
    return;
  }

  container.innerHTML = "";

  data.forEach(r => {
    const chip = document.createElement("div");
    chip.className = "exercise-chip";

    const label = document.createElement("span");
    label.textContent = `${r.exercise_name} — ${r.weight}kg × ${r.reps}`;

    // 👉 click para editar
    label.onclick = () => editExerciseRecord(r);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "chip-delete";
    deleteBtn.textContent = "✕";

    deleteBtn.onclick = async e => {
      e.stopPropagation();
      if (!confirm("¿Eliminar este ejercicio?")) return;

      const { error } = await supabase
        .from("exercise_records")
        .delete()
        .eq("id", r.id);

      if (error) {
        console.error("❌ Error eliminando", error);
        alert("Error al eliminar");
        return;
      }

      // 🔁 recargar lista
      renderExercisesForDay(mesocycleId, week, day);
    };

    chip.append(label, deleteBtn);
    container.appendChild(chip);
  });
}

/* ======================
   RELOJ
====================== */
function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  const centiseconds = Math.floor((ms % 1000) / 10).toString().padStart(2, "0");
  return `${minutes}:${seconds}.${centiseconds}`;
}

function initTools() {
  initClock();
  initStopwatch();
  initTimer();
  renderTimeHistory();
}

function initClock() {
  const clockEl = document.getElementById("clock");
  if (!clockEl) return;

  setInterval(() => {
    clockEl.textContent = new Date().toLocaleTimeString();
  }, 1000);
}

function initStopwatch() {
  const display = document.getElementById("stopwatch");
  const startBtn = document.getElementById("start-stopwatch");
  const stopBtn = document.getElementById("stop-stopwatch");
  const resetBtn = document.getElementById("reset-stopwatch");

  if (!display || !startBtn || !stopBtn || !resetBtn) return;

  display.textContent = formatTime(swTime);

  startBtn.onclick = () => {
    if (swInterval) return; // ya está corriendo
    swInterval = setInterval(() => {
      swTime += 100;
      display.textContent = formatTime(swTime);
    }, 100);
  };

  stopBtn.onclick = () => {
    if (!swInterval) return;
    clearInterval(swInterval);
    swInterval = null;
    saveTimeHistory("⏱️ Cronómetro", formatTime(swTime));
  };

  resetBtn.onclick = () => {
    clearInterval(swInterval);
    swInterval = null;
    swTime = 0;
    display.textContent = "00:00.00";
  };
}

function initTimer() {
  const minutesInput = document.getElementById("timer-minutes");
  const secondsInput = document.getElementById("timer-seconds");
  const display = document.getElementById("timer-display");
  const startBtn = document.getElementById("start-timer");
  const stopBtn = document.getElementById("stop-timer");

  if (!minutesInput || !secondsInput || !display || !startBtn || !stopBtn) return;

  let timerInterval = null;
  let timerTime = 0;
  let timerRunning = false;
  let alarmAudio = null;

  display.textContent = "00:00.00";

  startBtn.onclick = () => {
    // 🔔 Crear audio dentro del click (OBLIGATORIO en Android)
    if (!alarmAudio) {
      alarmAudio = new Audio("alarm.mp3"); // ruta correcta
      alarmAudio.preload = "auto";
    }

    // 🔓 Desbloquea el audio (fix Android)
    alarmAudio.pause();
    alarmAudio.currentTime = 0;
    alarmAudio.play()
      .then(() => {
        alarmAudio.pause();
        alarmAudio.currentTime = 0;
      })
      .catch(() => {});

    if (timerRunning) return;

    const minutes = parseInt(minutesInput.value) || 0;
    const seconds = parseInt(secondsInput.value) || 0;

    if (minutes === 0 && seconds === 0) return;
    if (seconds > 59) {
      alert("Los segundos deben ser entre 0 y 59");
      return;
    }

    timerTime = (minutes * 60 + seconds) * 1000;

    timerInterval = setInterval(() => {
      timerTime -= 100;

      if (timerTime <= 0) {
        clearInterval(timerInterval);
        timerInterval = null;
        timerRunning = false;
        timerTime = 0;

        display.textContent = "00:00.00";
        startBtn.textContent = "Iniciar";

        // 🔊 SONAR ALARMA
        alarmAudio.currentTime = 0;
        alarmAudio.loop = true;
        alarmAudio.play();

        saveTimeHistory("⏲️ Temporizador", formatTime(0));
      } else {
        display.textContent = formatTime(timerTime);
      }
    }, 100);

    timerRunning = true;
    startBtn.textContent = "Pausar";
  };

  stopBtn.onclick = () => {
    clearInterval(timerInterval);
    timerInterval = null;
    timerRunning = false;
    startBtn.textContent = "Reanudar";

    // 🔕 detener alarma
    if (alarmAudio) {
      alarmAudio.pause();
      alarmAudio.currentTime = 0;
      alarmAudio.loop = false;
    }
  };

  // 🔄 Reset
  const resetBtn = document.createElement("button");
  resetBtn.textContent = "Restablecer";

  resetBtn.onclick = () => {
    clearInterval(timerInterval);
    timerInterval = null;
    timerRunning = false;
    timerTime = 0;

    display.textContent = "00:00.00";
    startBtn.textContent = "Iniciar";

    if (alarmAudio) {
      alarmAudio.pause();
      alarmAudio.currentTime = 0;
      alarmAudio.loop = false;
    }
  };

  const parent = startBtn.parentNode;
  if (parent && !parent.querySelector(".timer-reset")) {
    resetBtn.classList.add("timer-reset");
    parent.appendChild(resetBtn);
  }
}

function startClock() {
  const clockEl = document.getElementById("clock");
  if (!clockEl) return;

  setInterval(() => {
    clockEl.textContent = new Date().toLocaleTimeString();
  }, 1000);
}

function getTimeHistory() {
  return JSON.parse(localStorage.getItem("timeHistory")) || [];
}

function saveTimeHistory(type, time) {
  const history = getTimeHistory();
  history.unshift({
    type,
    time,
    date: new Date().toLocaleString()
  });
  localStorage.setItem("timeHistory", JSON.stringify(history));
  renderTimeHistory();
}

function renderTimeHistory() {
  const container = document.getElementById("time-history");
  if (!container) return;

  const history = getTimeHistory();

  if (!history.length) {
    container.innerHTML = `<p class="placeholder">Aún no hay registros</p>`;
    return;
  }

  container.innerHTML = history
    .slice(0, 10)
    .map((h, index) => `
      <div class="time-entry">
        <div class="time-info">
          <span>${h.type} – <strong>${h.time}</strong></span>
          <small>${h.date}</small>
        </div>
        <button class="delete-time" data-index="${index}">✕</button>
      </div>
    `)
    .join("");

  // listeners para borrar individualmente
  container.querySelectorAll(".delete-time").forEach(btn => {
    btn.onclick = () => {
      deleteTimeEntry(btn.dataset.index);
    };
  });
}

function deleteTimeEntry(index) {
  const history = getTimeHistory();
  history.splice(index, 1); // elimina solo ese elemento
  localStorage.setItem("timeHistory", JSON.stringify(history));
  renderTimeHistory();
}

/* ======================
   RENDER VIEW
====================== */
function renderStatsView() {
  const statsView = document.getElementById("stats");
  if (!statsView) return;

  // 🔥 Primero cargar mesociclos
  loadStatsMesocycles();

  // 🔥 Stats globales (todos los datos)
   loadStatsOverview();
   loadPRTable();
   loadStrengthChart();
   loadExerciseVolumeList();
   loadMesocycleComparison();
   loadSessionsKPI();
   loadVolumeKPI();

  // 🔥 Filtro por mesociclo
  document.getElementById("stats-mesocycle").onchange = e => {
     const mesocycleId = e.target.value || null;
   
     updateStatsMesocycleLabel(); // 👈 NUEVO
   
     loadStatsOverview(mesocycleId);
     loadPRTable(mesocycleId);
     loadStrengthChart(mesocycleId);
     loadExerciseVolumeList(mesocycleId);
   
     if (mesocycleId) {
       loadVolumeKPI(mesocycleId);
       loadPRsKPI(mesocycleId);
       loadSessionsKPI(mesocycleId);
       loadStrengthTrends(mesocycleId);
     }
   };
}

/* ======================
   DASHBOARD
====================== */
function getTrend(weeks) {
  if (weeks.length < 2) {
    return { icon: '→', percent: '0.0' };
  }

  const first = weeks[0].avg_force;
  const last = weeks.at(-1).avg_force;

  const change = ((last - first) / first) * 100;

  return {
    icon: change > 2 ? '↑' : change < -2 ? '↓' : '→',
    percent: change.toFixed(1),
    value: change
  };
}

function normalizeMuscleName(name) {
  return name
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // quita tildes
    .replace(/\s+/g, '_');
}

// ===============================
// CONFIGURACIÓN RP HYPERTROPHY
// ===============================

const RP_RANGES = {
  cuadriceps: { MEV: 6, MAV: 12, MRV: 18 },
  isquiotibiales: { MEV: 6, MAV: 10, MRV: 16 },
  pecho: { MEV: 8, MAV: 14, MRV: 20 },
  espalda: { MEV: 10, MAV: 16, MRV: 22 },
  espalda_baja: { MEV: 4, MAV: 6, MRV: 10 },
  hombros: { MEV: 6, MAV: 12, MRV: 18 },
  biceps: { MEV: 6, MAV: 10, MRV: 16 },
  triceps: { MEV: 6, MAV: 10, MRV: 16 }
};

async function loadDashboard(mesocycleId) {
  // ======================
  // 1️⃣ TEXTO FIJO DE ESTADOS (solo UI)
  // ======================
  const statusGreen = document.getElementById('statusGreen');
  const statusYellow = document.getElementById('statusYellow');
  const statusRed = document.getElementById('statusRed');

  document.getElementById('statusGreen').textContent = '🟢 Progreso sólido';
  document.getElementById('statusYellow').textContent = '🟡 Progreso irregular';
  document.getElementById('statusRed').textContent = '🔴 Riesgo de estancamiento';
   
  // ======================
  // 2️⃣ DATA BASE
  // ======================
  const records = await fetchExerciseRecords(mesocycleId);
  if (!records.length) return;

  // ======================
  // 3️⃣ VOLUMEN
  // ======================
  const volumeData = calculateVolumeTrend(records);
  renderVolumeTable(volumeData);

  // ======================
  // 4️⃣ ESTADO GLOBAL (COACH)
  // ======================
  const status = overallProgress(volumeData);

  document.getElementById('globalProgressText').textContent =
    status === 'green'
      ? 'Progreso global positivo'
      : status === 'yellow'
      ? 'Progreso irregular'
      : 'Riesgo de estancamiento';

  ['statusGreen', 'statusYellow', 'statusRed'].forEach(id => {
    document.getElementById(id)?.classList.remove('active');
  });

  if (status === 'green') statusGreen?.classList.add('active');
  if (status === 'yellow') statusYellow?.classList.add('active');
  if (status === 'red') statusRed?.classList.add('active');

  // ======================
  // 5️⃣ MÚSCULOS (RP)
  // ======================
  const rawMuscle = calculateMuscleVolume(records);
  const muscleData = evaluateMuscleVolume(rawMuscle);
  renderMuscleTable(muscleData);

  console.log(
    muscleData.map(m => ({
      muscle: m.muscle,
      hasRP: !!RP_RANGES[m.muscle]
    }))
  );

  // ======================
  // 6️⃣ FATIGA POR MÚSCULO
  // ======================
  const fatigueByMuscle = muscleData.map(m => {
    const ranges = RP_RANGES[m.muscle];

    const score = evaluateMuscleFatigue({
      muscle: m.muscle,
      weekly: m,
      ranges,
      prevScore: m.prev_fatigue ?? 0,
      isDeload: false
    });

    return {
      ...m,
      fatigueScore: score,
      fatigueStatus: fatigueStatus(score)
    };
  });

  // ======================
  // 7️⃣ ALERTAS DE FATIGA
  // ======================
  const criticalDrops = volumeData.filter(v =>
     v.trend === '↓' && Number(v.percent) < -5
   );
   
   renderFatigueAlerts(criticalDrops);

  // ======================
  // 8️⃣ COACH (DELOAD / AJUSTE)
  // ======================
  const fatigued = fatigueByMuscle.filter(m =>
    m.fatigueStatus === 'high' || m.fatigueStatus === 'over'
  );

  const weak = fatigueByMuscle.filter(m => m.status === 'below');

  let coach;

  if (fatigued.length >= 2) {
    coach = {
      type: 'danger',
      message: 'Fatiga acumulada detectada. Deload recomendado (15–25%).'
    };
  } else if (weak.length >= 2) {
    coach = {
      type: 'warning',
      message: 'Algunos músculos subestimulados. Considera añadir 1–2 sets.'
    };
  } else {
    coach = {
      type: 'success',
      message: 'Distribución óptima. Mantén volumen e intensidad.'
    };
  }

  updateCoachCard(coach);

   if (coach.type === 'danger') {
     const container = document.getElementById('deloadPlan');
     if (container) {
       container.innerHTML = `
         <p>Reducir volumen total 15–25%</p>
         <ul>
           ${fatigued.map(m => `<li>${m.muscle}</li>`).join('')}
         </ul>
       `;
     }
   }
}

function safePercentChange(current, previous) {
  if (!previous || previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

function renderGlobalStatusCards(status) {
  const cards = {
    green: {
      el: 'statusGreen',
      text: 'Volumen y progreso bien distribuidos'
    },
    yellow: {
      el: 'statusYellow',
      text: 'Progreso irregular. Vigila recuperación'
    },
    red: {
      el: 'statusRed',
      text: 'Alta fatiga o estancamiento detectado'
    }
  };

  Object.values(cards).forEach(c => {
    const el = document.getElementById(c.el);
    if (!el) return;
    el.classList.remove('active');
    el.textContent = c.text;
  });

  if (cards[status]) {
    document.getElementById(cards[status].el).classList.add('active');
  }
}

function calculateMuscleVolume(records) {
  const byMuscle = {};

  records.forEach(r => {
    const key = `${r.muscle_group}-${r.week}`;

    if (!byMuscle[key]) {
      byMuscle[key] = {
        muscle: r.muscle_group,
        week: r.week,
        total_sets: 0
      };
    }

    byMuscle[key].total_sets += 1;
  });

  const grouped = {};
  Object.values(byMuscle).forEach(r => {
    if (!grouped[r.muscle]) grouped[r.muscle] = [];
    grouped[r.muscle].push(r);
  });

  return Object.entries(grouped).map(([muscle, weeks]) => {
    weeks.sort((a, b) => a.week - b.week);
    const last = weeks.at(-1);
    return { muscle, sets: last.total_sets };
  });
}

function evaluateMuscleVolume(data) {
  if (!Array.isArray(data)) return [];

  return data.map(d => {
    const key = normalizeMuscleName(d.muscle);
    const ranges = RP_RANGES[key];

    let status = 'unknown';

    if (ranges) {
      if (d.sets < ranges.MEV) status = 'below';
      else if (d.sets <= ranges.MAV) status = 'optimal';
      else if (d.sets <= ranges.MRV) status = 'high';
      else status = 'over';
    }

    return {
      ...d,
      muscleKey: key,
      ranges,
      status
    };
  });
   document.getElementById('exportDashboard').onclick = () => {
     exportDashboardToExcel({
       volumeData,
       muscleData,
       fatigueAlerts: criticalDrops,
       coach
     });
   };
}

async function fetchExerciseRecords(mesocycleId) {
  const { data, error } = await supabase
    .from('exercise_records')
    .select(`
      exercise_name,
      week_number,
      weight,
      reps,
      exercises (
        subgroup
      )
    `)
    .eq('mesocycle_id', mesocycleId)
    .order('week_number');

  if (error) {
    console.error(error);
    return [];
  }

  return data.map(r => ({
    exercise: r.exercise_name,
    week: r.week_number,
    volume: r.weight * r.reps,
    muscle_group: r.exercises?.subgroup ?? 'Otros'
  }));
}

function renderStrengthTable(grouped) {
  const container = document.getElementById('strength-table');
  container.innerHTML = '';

  Object.entries(grouped).forEach(([id, records]) => {
    const weeks = {};

    records.forEach(r => {
      if (!weeks[r.week]) weeks[r.week] = [];
      weeks[r.week].push(r.force);
    });

    const weeklyAvg = Object.entries(weeks).map(([week, forces]) => ({
      week,
      avg_force: forces.reduce((a,b)=>a+b,0)/forces.length
    }));

    const trend = getTrend(weeklyAvg);

    const row = document.createElement('div');
    row.className = 'strength-row';

    row.innerHTML = `
      <span>${records[0].exercise_name}</span>
      <span>${Math.round(weeklyAvg.at(-1).avg_force)} kg</span>
      <span class="trend ${trend.icon === '↑' ? 'up' : trend.icon === '↓' ? 'down' : 'flat'}">
        ${trend.icon} ${trend.percent}%
      </span>
    `;

    row.onclick = () => openMiniChart(weeklyAvg);

    container.appendChild(row);
  });
}

function normalizeMuscleVolume(rows) {
  const byMuscle = {};

  rows.forEach(r => {
    if (!byMuscle[r.muscle_group]) {
      byMuscle[r.muscle_group] = [];
    }
    byMuscle[r.muscle_group].push(r);
  });

  return Object.entries(byMuscle).map(([muscle, weeks]) => {
    weeks.sort((a, b) => b.week_number - a.week_number);
    const last = weeks[0];

    return {
      muscle,
      total_sets: last.total_sets,
      total_volume: last.total_volume
    };
  });
}

function openMiniChart(weeklyData) {
  const modal = document.getElementById("exercise-modal");
  const ctx = document.getElementById("mini-chart");

  if (!modal || !ctx) return;

  const labels = weeklyData.map(w => `Sem ${w.week}`);
  const values = weeklyData.map(w => w.avg_force);

  // destruir gráfico anterior si existe
  if (miniChartInstance) {
    miniChartInstance.destroy();
  }

  miniChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Fuerza promedio",
          data: values,
          borderColor: "#4ade80",
          backgroundColor: "rgba(74,222,128,0.15)",
          tension: 0.35,
          fill: true,
          pointRadius: 4,
          pointBackgroundColor: "#4ade80"
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: false
        }
      }
    }
  });

  // mostrar modal
  modal.classList.remove("hidden");
}

function getRecommendation({ trend, volumeChange }) {
  if (trend.value > 2 && volumeChange >= 0) {
    return { type: 'success', msg: 'Buen progreso. Mantén estímulo.' };
  }

  if (trend.value < 0 && volumeChange > 10) {
    return { type: 'warning', msg: 'Fatiga probable. Reduce volumen 15–20%.' };
  }

  if (trend.value < -3) {
    return { type: 'danger', msg: 'Sobreentrenamiento detectado. Deload recomendado.' };
  }

  return { type: 'neutral', msg: 'Progreso estable. Observa 1 semana más.' };
}

function updateCoachCard({ type, message }) {
  const card = document.getElementById('coachCard');
  const text = document.getElementById('coachMessage');

  card.classList.remove('success', 'warning', 'danger');
  card.classList.add(type, 'active');

  text.textContent = message;
}

function calculateVolumeTrend(records) {
  const byExercise = {};

  records.forEach(r => {
    const key = `${r.exercise}-${r.week}`;

    if (!byExercise[key]) {
      byExercise[key] = {
        exercise: r.exercise,
        week: r.week,
        total_volume: 0,
        total_sets: 0
      };
    }

    byExercise[key].total_volume += r.volume;
    byExercise[key].total_sets += 1;
  });

  // Agrupar por ejercicio
  const grouped = {};
  Object.values(byExercise).forEach(r => {
    if (!grouped[r.exercise]) grouped[r.exercise] = [];
    grouped[r.exercise].push(r);
  });

  // Tendencia real
  return Object.entries(grouped).map(([exercise, weeks]) => {
    weeks.sort((a, b) => a.week - b.week);

    const last = weeks.at(-1);
    const prev = weeks.at(-2);

    let percent = prev
      ? ((last.total_volume - prev.total_volume) / prev.total_volume) * 100
      : 0;

    const trend =
      percent > 3 ? '↑' :
      percent < -3 ? '↓' :
      '→';

    return {
     exercise,
     volume: Math.round(last.total_volume),
     sets: last.total_sets,
     trend,
     percent: prev
       ? Number(((last.total_volume - prev.total_volume) / prev.total_volume * 100).toFixed(1))
       : 0
   };
  });
}

function renderVolumeTable(data) {
  const container = document.getElementById('volumeTable');

  container.innerHTML = `
    <table class="volume-table">
      <thead>
        <tr>
          <th>Ejercicio</th>
          <th>Volumen</th>
          <th>Sets</th>
          <th>Tendencia</th>
        </tr>
      </thead>
      <tbody>
        ${data.map(d => `
          <tr>
            <td>${d.exercise}</td>
            <td>${d.volume}</td>
            <td>${d.sets}</td>
            <td class="trend ${trendClass(d.trend)}">
              ${d.trend} ${Math.abs(d.percent)}%
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function trendClass(trend) {
  if (trend === '↑') return 'up';
  if (trend === '↓') return 'down';
  return 'flat';
}

function updateCoachFromVolume(data) {
  const downs = data.filter(d => d.trend === '↓').length;

  if (downs >= 3) {
    updateCoachCard({
      type: 'warning',
      message: 'Caída de volumen detectada en varios ejercicios. Considera reducir fatiga o ajustar cargas.'
    });
  } else {
    updateCoachCard({
      type: 'success',
      message: 'Volumen estable o en progreso. Buen manejo del estímulo.'
    });
  }
}

function renderMuscleTable(data) {
  const container = document.getElementById('muscleTable');

  container.innerHTML = `
    <table class="muscle-table">
      <thead>
        <tr>
          <th>Músculo</th>
          <th>Sets</th>
          <th>Estado</th>
          <th>Rango RP</th>
        </tr>
      </thead>
      <tbody>
        ${data.map(d => `
          <tr>
            <td>${d.muscle}</td>
            <td>${d.sets}</td>
            <td class="status ${d.status}">
              ${statusLabel(d.status)}
            </td>
            <td>
              ${d.ranges?.MEV ?? '-'}–${d.ranges?.MRV ?? '-'}
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function statusLabel(status) {
  return {
    below: '⬇ Bajo',
    optimal: '🟢 Óptimo',
    high: '🟡 Alto',
    over: '🔴 Exceso'
  }[status] || '—';
}

function muscleCoachFeedback(data) {
  const over = data.filter(d => d.status === 'over');
  const below = data.filter(d => d.status === 'below');

  if (over.length >= 2) {
    return 'Exceso de volumen detectado. Riesgo de fatiga acumulada.';
  }

  if (below.length >= 2) {
    return 'Algunos músculos pueden estar subestimulados.';
  }

  return 'Distribución de volumen adecuada. Buen estímulo global.';
}

function buildMesocycleSummary(prs, strength, volume) {
  const map = {};

  prs.forEach(p => {
    map[p.mesocycle_id] = {
      mesocycle_id: p.mesocycle_id,
      pr_count: p.pr_count,
      exercises: {},
      volume: 0,
      sets: 0
    };
  });

  strength.forEach(s => {
    if (!map[s.mesocycle_id]) return;
    map[s.mesocycle_id].exercises[s.exercise] = s.avg_1rm;
  });

  volume.forEach(v => {
    if (!map[v.mesocycle_id]) return;
    map[v.mesocycle_id].volume = v.total_volume;
    map[v.mesocycle_id].sets = v.total_sets;
  });

  return Object.values(map);
}

function calculateEfficiency(mesocycles) {
  return mesocycles.map(m => {
    const strengthScore =
      Object.values(m.exercises).reduce((a, b) => a + b, 0) /
      Object.keys(m.exercises).length;

    return {
      ...m,
      strengthScore,
      efficiency: m.volume ? strengthScore / m.volume : 0
    };
  });
}

function safe(n, decimals = 1) {
  return Number.isFinite(n) ? n.toFixed(decimals) : "—";
}

function renderComparison(a, b) {
  const container = document.getElementById("compareResult");
  if (!container) return;

  container.innerHTML = `
    <div class="compare-grid">
      <div class="mesocycle-stat-card ${a.efficiency > b.efficiency ? 'winner' : ''}">
        <h4>${a.name}</h4>
         <p><strong>PRs:</strong> ${a.pr_count} ejercicios</p>
         <p><strong>Volumen:</strong> ${Math.round(a.total_volume)} kg</p>
         <p><strong>Fuerza media:</strong> ${a.avg_strength.toFixed(1)} kg</p>
       </div>

      <div class="mesocycle-stat-card ${b.efficiency > a.efficiency ? 'winner' : ''}">
        <h4>${b.name}</h4>
         <p><strong>PRs:</strong> ${b.pr_count} ejercicios</p>
         <p><strong>Volumen:</strong> ${Math.round(b.total_volume)} kg</p>
         <p><strong>Fuerza media:</strong> ${b.avg_strength.toFixed(1)} kg</p>
       </div>
    </div>
  `;
}

function renderMesocycleRecommendation(result) {
  let msg;
  let type = 'neutral';

  if (result.winner === 'A') {
    msg = 'El Mesociclo A fue más eficiente. Repite su estructura y progresiones.';
    type = 'success';
  } else if (result.winner === 'B') {
    msg = 'El Mesociclo B mostró mejor adaptación. Usa este como base.';
    type = 'success';
  } else {
    msg = 'Ambos mesociclos rindieron similar. Decide según fatiga percibida.';
    type = 'warning';
  }

  updateCoachCard({
    type,
    message: msg
  });
}

function mesocycleCoach(a, b) {
  if (a.efficiency > b.efficiency * 1.1) {
    return `${a.name} fue más eficiente. Mejor estímulo con menos fatiga.`;
  }

  if (b.efficiency > a.efficiency * 1.1) {
    return `${b.name} fue más eficiente. Replicar estructura y volumen.`;
  }

  return 'Ambos mesociclos tuvieron rendimiento similar.';
}

function overallProgress(exercises) {
  const up = exercises.filter(e => e.trend === 'up').length;
  const total = exercises.length;
  const ratio = up / total;

  if (ratio >= 0.6) return 'green';
  if (ratio >= 0.35) return 'yellow';
  return 'red';
}

function classifyExercise(e) {
  if (e.trend === 'up' && e.change > 3) return 'strong';
  if (e.trend === 'flat') return 'stalled';
  if (e.trend === 'down') return 'regressing';
}

function volumeResponse(ex) {
  return ex.strengthChange / ex.volume;
}

function fatigueAlerts(volumeData) {
  if (!Array.isArray(volumeData)) return [];

  return volumeData
    .filter(v =>
      typeof v.percent === 'number' &&
      v.percent < -10
    )
    .map(v => ({
      exercise: v.exercise,
      drop: Math.abs(v.percent).toFixed(1)
    }));
}

function coachAdvice(summary) {
  if (summary.fatigueZones.length > 0) {
    return 'Reduce volumen 10–20% o considera un deload.';
  }

  if (summary.greenExercises.length > summary.stalled.length) {
    return 'Buen momento para progresar cargas o añadir 1 set.';
  }

  return 'Mantén volumen y busca mejorar ejecución.';
}

function deloadAmount(ex) {
  if (ex.weeksDown >= 3 && ex.volumeSpike) return 0.35;
  if (ex.weeksDown >= 2) return 0.25;
  return 0.15;
}

async function getLastDeload(userId) {
  const { data } = await supabase
    .from('mesocycles')
    .select('*')
    .eq('user_id', userId)
    .eq('is_deload', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return data;
}

function rebuildTargetVolume({ muscle, prevSets, ranges }) {
  const mav = ranges.MAV;

  // si el músculo estaba fatigado → volver conservador
  if (prevSets > ranges.MAV) {
    return Math.round(mav * 0.85);
  }

  // si estaba bien → MAV limpio
  return mav;
}

function distributeSets(exercises, targetSets) {
  const total = exercises.reduce((a, e) => a + e.sets, 0);

  return exercises.map(e => ({
    ...e,
    newSets: Math.max(
      1,
      Math.round((e.sets / total) * targetSets)
    )
  }));
}

async function createPostDeloadMesocycle({
  deloadMesocycleId,
  userId
}) {
  const { data: deload } = await supabase
    .from('mesocycles')
    .select('*')
    .eq('id', deloadMesocycleId)
    .single();

  // 🔁 crear nuevo mesociclo
  const { data: newMeso } = await supabase
    .from('mesocycles')
    .insert({
      user_id: userId,
      name: deload.name.replace('(Deload)', '(Rebuild)'),
      weeks: 4,
      days_per_week: deload.days_per_week,
      template_id: deload.template_id,
      is_deload: false
    })
    .select()
    .single();

  // 🔍 obtener ejercicios del deload
  const { data: exercises } = await supabase
    .from('mesocycle_exercises')
    .select('*')
    .eq('mesocycle_id', deloadMesocycleId);

  // 🔧 agrupar por músculo
  const byMuscle = {};
  exercises.forEach(e => {
    if (!byMuscle[e.muscle_group]) byMuscle[e.muscle_group] = [];
    byMuscle[e.muscle_group].push(e);
  });

  const inserts = [];

  Object.entries(byMuscle).forEach(([muscle, exs]) => {
    const ranges = RP_RANGES[muscle];
    if (!ranges) return;

    const prevSets = exs.reduce((a, e) => a + e.sets, 0);
    const target = rebuildTargetVolume({
      muscle,
      prevSets,
      ranges
    });

    const distributed = distributeSets(exs, target);

    distributed.forEach(e => {
      inserts.push({
        ...e,
        mesocycle_id: newMeso.id,
        sets: e.newSets
      });
    });
  });

  await supabase
    .from('mesocycle_exercises')
    .insert(inserts);

  return newMeso.id;
}

function nextWeekSets(currentSets, range) {
  if (currentSets < range.mav) {
    return currentSets + 1; // overload
  }

  if (currentSets >= range.mav && currentSets < range.mrv) {
    return currentSets; // mantener
  }

  return range.mav - 2; // deload preventivo
}

function muscleFatigueScore({
  sets = 0,
  ranges,
  strengthTrend = 0,
  weeksWithoutPR = 0,
  volumeChange = 0
}) {
  if (!ranges || ranges.MAV == null || ranges.MRV == null) {
    console.warn('⚠️ RP ranges inválidos:', ranges);
    return 0; // ← sin score si no hay modelo
  }

  let score = 0;

  // 📦 Volumen relativo
  if (sets > ranges.MAV) score += 20;
  if (sets > ranges.MRV) score += 35;

  // 📉 Fuerza vs volumen
  if (strengthTrend < 0 && volumeChange > 0) score += 25;

  // 🧠 Tendencia de fuerza
  if (strengthTrend < -2) score += 20;
  else if (strengthTrend < 0) score += 10;

  // ⏳ Estancamiento
  if (weeksWithoutPR >= 5) score += 20;
  else if (weeksWithoutPR >= 3) score += 10;

  return Math.min(score, 100);
}

function accumulateFatigue(prev, current) {
  // se arrastra el 70% de la fatiga previa
  return Math.min(100, Math.round(prev * 0.7 + current));
}

function deloadRecovery(prevScore) {
  return Math.max(0, Math.round(prevScore * 0.4));
}

function evaluateMuscleFatigue({
  muscle,
  weekly,
  ranges,
  prevScore = 0,
  isDeload = false
}) {
  if (!ranges) {
    return 0;
  }

  const score = muscleFatigueScore({
    sets: weekly.sets,
    ranges,
    strengthTrend: weekly.strengthTrend ?? 0,
    weeksWithoutPR: weekly.weeksWithoutPR ?? 0,
    volumeChange: weekly.volumeChange ?? 0
  });

  return isDeload ? score * 0.6 : score;
}

const MUSCLE_MAP = {
  chest: 'Chest',
  pecho: 'Chest',

  back: 'Back',
  espalda: 'Back',

  quads: 'Quads',
  cuadriceps: 'Quads',

  hamstrings: 'Hamstrings',
  femorales: 'Hamstrings',

  shoulders: 'Shoulders',
  hombros: 'Shoulders',

  arms: 'Arms',
  brazos: 'Arms'
};

function fatigueStatus(score) {
  if (score >= 86) return 'critical';
  if (score >= 66) return 'overreached';
  if (score >= 46) return 'fatigued';
  if (score >= 26) return 'working';
  return 'fresh';
}


function muscleStatus(vol, mev, mav, mrv, strengthTrend) {
  if (vol < mev) return "under";
  if (vol <= mav && strengthTrend >= 0) return "productive";
  if (vol <= mav + 1 && strengthTrend > 0) return "optimal";
  if (vol < mrv && strengthTrend <= 0) return "fatigued";
  return "overreached";
}

async function loadVolumeSection(mesocycleId) {
  const { data, error } = await supabase
    .from('exercise_weekly_volume')
    .select('*')
    .eq('mesocycle_id', mesocycleId);

  if (error) return console.error(error);

  const volumeTrend = calculateVolumeTrend(data);
  renderVolumeTable(volumeTrend);
  updateCoachFromVolume(volumeTrend);
}

/* ======================
   CARGA STATS + GRAFICA
====================== */
async function loadStatsOverview(mesocycleId = null) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  let query = supabase
    .from("exercise_records")
    .select("weight, reps, exercise_name")
    .eq("user_id", user.id);

  // 👉 solo filtrar si se seleccionó un mesociclo
  if (mesocycleId) {
    query = query.eq("mesocycle_id", mesocycleId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Stats overview error", error);
    return;
  }

  let totalSets = 0;
  let totalVolume = 0;
  const exercises = new Set();

  data.forEach(r => {
    if (!r.exercise_name) return;

    totalSets++;
    totalVolume += (r.weight || 0) * (r.reps || 0);
    exercises.add(r.exercise_name);
  });

  const setsEl = document.getElementById("total-sets");
  const volumeEl = document.getElementById("total-volume");
  const exercisesEl = document.getElementById("total-exercises");

  if (!setsEl || !volumeEl || !exercisesEl) return;

  setsEl.textContent = totalSets;
  volumeEl.textContent = Math.round(totalVolume);
  exercisesEl.textContent = exercises.size;
}

async function loadPRTable(mesocycleId = null) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  let query = supabase
    .from("exercise_prs")
    .select("exercise_name, pr_weight, mesocycle_id")
    .eq("user_id", user.id);

  if (mesocycleId) {
    query = query.eq("mesocycle_id", mesocycleId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("PR error", error);
    return;
  }

  const container = document.getElementById("pr-table");
  container.innerHTML = "";

  data.forEach(r => {
    const row = document.createElement("div");
    row.className = "pr-row";
    row.innerHTML = `
     <strong>${r.exercise_name}</strong>
     <span>${r.pr_weight} kg</span>
     ${mesocycleId ? "" : `<small>mesociclo</small>`}
   `;
    container.appendChild(row);
  });
}

async function loadVolumeKPI(mesocycleId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  let query = supabase
    .from("exercise_records")
    .select("weight, reps")
    .eq("user_id", user.id);

  if (mesocycleId) {
    query = query.eq("mesocycle_id", mesocycleId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("❌ Error volumen", error);
    return;
  }

  const totalVolume = data.reduce(
    (sum, r) => sum + (r.weight || 0) * (r.reps || 0),
    0
  );

  document.getElementById("kpi-volume").innerHTML = `
    <h4>Volumen total</h4>
    <strong>${Math.round(totalVolume).toLocaleString()} kg</strong>
    <span class="kpi-sub">${mesocycleId ? "Mesociclo" : "Global"}</span>
  `;
}

async function loadPRsKPI(mesocycleId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !mesocycleId) return; // 👈 aquí SÍ es obligatorio

  const { data, error } = await supabase
    .from("mesocycle_prs")
    .select("pr_count")
    .eq("user_id", user.id)
    .eq("mesocycle_id", mesocycleId)
    .single();

  if (error) {
    console.error("❌ Error PRs", error);
    return;
  }

  document.getElementById("kpi-prs").innerHTML = `
    <h4>PRs</h4>
    <strong>${data?.pr_count || 0}</strong>
    <span class="kpi-sub">Récords personales</span>
  `;
}

async function loadSessionsKPI(mesocycleId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  let query = supabase
    .from("exercise_records")
    .select("week_number, day_number")
    .eq("user_id", user.id);

  if (mesocycleId) {
    query = query.eq("mesocycle_id", mesocycleId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("❌ Error sesiones", error);
    return;
  }

  const sessions = new Set(
    data.map(r => `${r.week_number}-${r.day_number}`)
  );

  document.getElementById("kpi-sessions").innerHTML = `
    <h4>Sesiones</h4>
    <strong>${sessions.size}</strong>
    <span class="kpi-sub">${mesocycleId ? "Mesociclo" : "Global"}</span>
  `;
}

async function loadInitialDashboard() {
  const { data, error } = await supabase
    .from('mesocycles')
    .select('id')
    .order('start_date', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    console.warn('No hay mesociclos');
    return;
  }

  await loadDashboard(data.id);
}

function setupMesocycleComparison() {
  const a = document.getElementById('mesoA');
  const b = document.getElementById('mesoB');

  const handler = () => {
    if (a.value && b.value && a.value !== b.value) {
      compareMesocycles(a.value, b.value);
    }
  };

  a.onchange = handler;
  b.onchange = handler;
}

async function loadMesocycleComparison() {
  const container = document.getElementById("mesocycle-comparison");
  if (!container) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: mesocycles } = await supabase
    .from("mesocycles")
    .select("id, name")
    .eq("user_id", user.id)
    .order("created_at");

  const { data: records } = await supabase
    .from("exercise_records")
    .select("mesocycle_id, exercise_name, weight, reps")
    .eq("user_id", user.id);

  const { data: prs } = await supabase
    .from("mesocycle_prs")
    .select("*")
    .eq("user_id", user.id);

  const prMap = {};
  prs.forEach(p => prMap[p.mesocycle_id] = p.pr_count);

  const statsByCycle = {};

  records.forEach(r => {
    if (!statsByCycle[r.mesocycle_id]) {
      statsByCycle[r.mesocycle_id] = {
        volume: 0,
        exercises: {}
      };
    }

    statsByCycle[r.mesocycle_id].volume +=
      (r.weight || 0) * (r.reps || 0);

    if (!statsByCycle[r.mesocycle_id].exercises[r.exercise_name]) {
      statsByCycle[r.mesocycle_id].exercises[r.exercise_name] = [];
    }

    statsByCycle[r.mesocycle_id].exercises[r.exercise_name].push(r.weight);
  });

  container.innerHTML = "";

  mesocycles.forEach(m => {
    const s = statsByCycle[m.id];
    if (!s) return;

    const exerciseAverages = Object.values(s.exercises)
      .map(arr => arr.reduce((a,b)=>a+b,0) / arr.length);

    const avgStrength =
      exerciseAverages.reduce((a,b)=>a+b,0) / exerciseAverages.length || 0;

    const div = document.createElement("div");
    div.className = "mesocycle-stat-card";

    div.innerHTML = `
      <h4>${m.name}</h4>
      <p>Volumen: <strong>${Math.round(s.volume)} kg</strong></p>
      <p>Record Personal: <strong>${prMap[m.id] || 0} ejercicios</strong></p>
      <p>Fuerza media: <strong>${avgStrength.toFixed(1)} kg</strong></p>
    `;

    container.appendChild(div);
  });
   
   const selectA = document.getElementById("mesoA");
   const selectB = document.getElementById("mesoB");
   
   selectA.innerHTML = `<option value="">Selecciona mesociclo A</option>`;
   selectB.innerHTML = `<option value="">Selecciona mesociclo B</option>`;
   
   mesocycles.forEach(m => {
     const optA = document.createElement("option");
     optA.value = m.id;
     optA.textContent = m.name;
   
     const optB = optA.cloneNode(true);
   
     selectA.appendChild(optA);
     selectB.appendChild(optB);
   });
}

async function compareMesocycles(mesoA, mesoB) {
  const { data, error } = await supabase
    .from('v_mesocycle_summary')
    .select('*')
    .in('mesocycle_id', [mesoA, mesoB]);

  if (error) {
    console.error(error);
    return;
  }

  console.log('COMPARE DATA', data); // 👈 DEBUG CLAVE

  const a = data.find(d => d.mesocycle_id == mesoA);
  const b = data.find(d => d.mesocycle_id == mesoB);

  console.log('A', a);
  console.log('B', b);

  if (!a || !b) return;

  renderComparison(a, b);
}

async function populateMesocycleSelectors() {
  const a = document.getElementById("mesoA");
  const b = document.getElementById("mesoB");
  if (!a || !b) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data, error } = await supabase
    .from("mesocycles")
    .select("id, name")
    .eq("user_id", user.id)
    .order("created_at");

  if (error) return console.error(error);

  a.innerHTML = `<option value="">Mesociclo A</option>`;
  b.innerHTML = `<option value="">Mesociclo B</option>`;

  data.forEach(m => {
    a.innerHTML += `<option value="${m.id}">${m.name}</option>`;
    b.innerHTML += `<option value="${m.id}">${m.name}</option>`;
  });
}

function initCoachStatusCards() {
  document.getElementById("statusGreen").innerHTML =
    "🟢 Progreso sólido";
  document.getElementById("statusYellow").innerHTML =
    "🟡 Progreso irregular";
  document.getElementById("statusRed").innerHTML =
    "🔴 Riesgo de estancamiento";
}

function calculateMesocycleScore(m) {
  const strength = m.strengthScore || 0;
  const prs = m.pr_count || 0;
  const efficiency = m.efficiency || 0;

  return (
    strength * 0.4 +
    prs * 5 * 0.3 +      // PRs pesan más
    efficiency * 100 * 0.3
  );
}

function evaluateMesocycles(a, b) {
  const scoreA = calculateMesocycleScore(a);
  const scoreB = calculateMesocycleScore(b);

  return {
    a: { ...a, score: scoreA },
    b: { ...b, score: scoreB },
    winner:
      scoreA > scoreB * 1.05
        ? 'A'
        : scoreB > scoreA * 1.05
        ? 'B'
        : 'tie'
  };
}

function needsDeload({ volumeData, muscleData, prs }) {
  let score = 0;

  // 1️⃣ Fuerza cayendo
  const downs = volumeData.filter(v => v.trend === '↓').length;
  if (downs >= 2) score++;

  // 2️⃣ Fatiga muscular RP
  const fatigued = muscleData.filter(
    m => m.status === 'high' || m.status === 'over'
  ).length;
  if (fatigued >= 2) score++;

  // 3️⃣ Estancamiento PRs
  if (prs === 0) score++;

  return score >= 2;
}

function deloadPercentage({ volumeData, muscleData }) {
  const downs = volumeData.filter(v => v.trend === '↓').length;
  const over = muscleData.filter(m => m.status === 'over').length;

  if (downs >= 3 || over >= 2) return 0.35; // severo
  if (downs >= 2) return 0.25;              // medio
  return 0.15;                              // preventivo
}

function generateDeloadPlan(records, deloadPct) {
  const plan = {};

  records.forEach(r => {
    if (!plan[r.exercise]) {
      plan[r.exercise] = {
        exercise: r.exercise,
        originalSets: 0
      };
    }
    plan[r.exercise].originalSets += 1;
  });

  return Object.values(plan).map(p => ({
    exercise: p.exercise,
    originalSets: p.originalSets,
    deloadSets: Math.max(1, Math.round(p.originalSets * (1 - deloadPct)))
  }));
}

function renderDeloadPlan(plan) {
  const section = document.getElementById('deloadSection');
  const container = document.getElementById('deloadTable');

  section.classList.remove('hidden');

  container.innerHTML = `
    <table class="deload-table">
      <thead>
        <tr>
          <th>Ejercicio</th>
          <th>Sets actuales</th>
          <th>Sets deload</th>
        </tr>
      </thead>
      <tbody>
        ${plan.map(p => `
          <tr>
            <td>${p.exercise}</td>
            <td>${p.originalSets}</td>
            <td><strong>${p.deloadSets}</strong></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

async function createDeloadMesocycle({
  baseMesocycleId,
  deloadPlan,
  userId
}) {
  // 1️⃣ Obtener mesociclo base
  const { data: base } = await supabase
    .from('mesocycles')
    .select('*')
    .eq('id', baseMesocycleId)
    .single();

  if (!base) return;

  // 2️⃣ Crear nuevo mesociclo
  const { data: newMeso } = await supabase
    .from('mesocycles')
    .insert({
      user_id: userId,
      name: `${base.name} (Deload)`,
      weeks: 1,
      days_per_week: base.days_per_week,
      template_id: base.template_id,
      is_deload: true
    })
    .select()
    .single();

  // 3️⃣ Copiar estructura con sets reducidos
  await applyDeloadToExercises(
    baseMesocycleId,
    newMeso.id,
    deloadPlan
  );

  return newMeso.id;
}

async function applyDeloadToExercises(
  baseMesocycleId,
  newMesocycleId,
  deloadPlan
) {
  const { data: exercises } = await supabase
    .from('mesocycle_exercises')
    .select('*')
    .eq('mesocycle_id', baseMesocycleId);

  const planMap = {};
  deloadPlan.forEach(p => {
    planMap[p.exercise] = p.deloadSets;
  });

  const inserts = [];

  exercises.forEach(ex => {
    const targetSets = planMap[ex.exercise_name] ?? ex.sets;

    inserts.push({
      mesocycle_id: newMesocycleId,
      exercise_id: ex.exercise_id,
      exercise_name: ex.exercise_name,
      sets: Math.max(1, targetSets),
      reps: ex.reps,
      rir: ex.rir,
      day: ex.day
    });
  });

  await supabase
    .from('mesocycle_exercises')
    .insert(inserts);
}

function showDeloadCTA(onConfirm) {
  const cta = document.getElementById('deloadCTA');
  const btn = document.getElementById('applyDeloadBtn');

  cta.classList.remove('hidden');
  btn.onclick = onConfirm;
}

async function loadMuscleVolumeRP(mesocycleId) {
  const { data, error } = await supabase
    .from('v_muscle_rp_status')
    .select('*')
    .eq('mesocycle_id', mesocycleId)
    .eq('user_id', user.id);

  if (error) {
    console.error(error);
    return;
  }

  renderMuscleTable(data);

  const coachMsg = muscleCoachFeedback(data);
  updateCoachCard({
    type: coachSeverity(data),
    message: coachMsg
  });
}

function showPRBadge(exercise, weight) {
  const badge = document.createElement("div");
  badge.className = "pr-toast";
  badge.innerHTML = `
    🏆 <strong>Nuevo PR</strong><br>
    ${exercise}<br>
    ${weight} kg
  `;

  document.body.appendChild(badge);

  setTimeout(() => badge.classList.add("show"), 50);
  setTimeout(() => badge.remove(), 3500);
}

async function loadStrengthChart(mesocycleId = null, exerciseName = "") {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const exerciseLabel = document.getElementById("strength-exercise-label");
  const ctx = document.getElementById("strength-chart");
  const backBtn = document.getElementById("back-to-general");

  // Mostrar el nombre del ejercicio y el badge solo si es ejercicio individual
  if (exerciseLabel) {
    if (exerciseName) {
      exerciseLabel.textContent = exerciseName;
      exerciseLabel.classList.remove("hidden");
      backBtn.classList.remove("hidden");
      backBtn.classList.add("visible");
    } else {
      exerciseLabel.textContent = "";
      exerciseLabel.classList.add("hidden");
      backBtn.classList.remove("visible");
      backBtn.classList.add("hidden");
    }
  }

  // Consulta de datos
  let query = supabase
    .from("exercise_progress_chart")
    .select("day, total_volume")
    .eq("user_id", user.id)
    .order("day", { ascending: true });

  if (mesocycleId) query = query.eq("mesocycle_id", mesocycleId);

  const { data, error } = await query;
  if (error) {
    console.error(error);
    return;
  }
  if (!data || data.length === 0) return;

  // Guardar datos generales
  if (!exerciseName) generalStrengthData = data;

  const labels = data.map(r => r.day);
  const values = data.map(r => r.total_volume);

  if (window.statsChart) window.statsChart.destroy();

  window.statsChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Volumen total",
        data: values,
        tension: 0.35,
        fill: true,
        borderColor: "#b11226",
        backgroundColor: "rgba(177,18,38,0.25)",
        pointBackgroundColor: "#ff3b3b",
        pointBorderColor: "#120b0f",
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: true, position: "top" } },
      scales: { y: { beginAtZero: true } }
    }
  });
}

// Evento para volver a la evolución general
document.addEventListener("click", (e) => {
  if (e.target.id === "back-to-general") {
    if (!generalStrengthData) return;

    const ctx = document.getElementById("strength-chart");
    if (window.statsChart) window.statsChart.destroy();

    const labels = generalStrengthData.map(r => r.day);
    const values = generalStrengthData.map(r => r.total_volume);

    window.statsChart = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: "Volumen total",
          data: values,
          tension: 0.35,
          fill: true,
          borderColor: "#b11226",
          backgroundColor: "rgba(177,18,38,0.25)",
          pointBackgroundColor: "#ff3b3b",
          pointBorderColor: "#120b0f",
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: true, position: "top" } },
        scales: { y: { beginAtZero: true } }
      }
    });

    // Ocultar label y botón al volver
    const exerciseLabel = document.getElementById("strength-exercise-label");
    const backBtn = document.getElementById("back-to-general");

    if (exerciseLabel) exerciseLabel.classList.add("hidden");
    if (backBtn) {
      backBtn.classList.remove("visible");
      backBtn.classList.add("hidden");
    }
  }
});

async function loadExerciseVolumeList(mesocycleId = null) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  let query = supabase
    .from("exercise_volume_totals")
    .select("exercise_name, lifetime_volume, lifetime_sets")
    .eq("user_id", user.id);

  if (mesocycleId) {
    query = query.eq("mesocycle_id", mesocycleId);
  }

  const { data, error } = await query;
  if (error) {
    console.error(error);
    return;
  }

  const container = document.getElementById("exercise-volume-list");
  container.innerHTML = "";

  data
    .sort((a, b) => b.lifetime_volume - a.lifetime_volume)
    .forEach(r => {
      const div = document.createElement("div");
      div.className = "exercise-volume-card";
      div.innerHTML = `
        <strong>${r.exercise_name}</strong>
        <span>${r.lifetime_volume.toFixed(0)} kg</span>
        <small>${r.lifetime_sets} sets</small>
      `;
      
      div.onclick = () => {
        loadExerciseProgress(r.exercise_name);
      };
      
      container.appendChild(div);
    });
}

async function loadExerciseProgress(exerciseName) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const exerciseLabel = document.getElementById("strength-exercise-label");
  const backBtn = document.getElementById("back-to-general");
  const ctx = document.getElementById("strength-chart");

  // Mostrar nombre del ejercicio y el botón de volver
  if (exerciseLabel) {
    exerciseLabel.textContent = exerciseName;
    exerciseLabel.classList.remove("hidden");
  }
  if (backBtn) backBtn.classList.remove("hidden");

  // Traer datos del ejercicio
  const { data, error } = await supabase
    .from("exercise_progress_chart")
    .select("day, max_weight, total_volume")
    .eq("user_id", user.id)
    .eq("exercise_name", exerciseName)
    .order("day");

  // Si hay error o no hay datos
  if (error || !data.length) {
    showExerciseWarning("No se tienen suficientes datos para graficar");
    return;
  }

  // Si hay menos de 2 registros, mostrar advertencia y no graficar
  if (data.length < 2) {
    showExerciseWarning("No se tienen suficientes datos para graficar");
    return;
  }

  // Limpiar cualquier mensaje previo
  hideExerciseWarning();

  const labels = data.map(d => d.day);
  const weights = data.map(d => d.max_weight);
  const volumes = data.map(d => d.total_volume);

  if (!ctx) return;

  if (window.statsChart) window.statsChart.destroy();

  window.statsChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Peso máximo",
          data: weights,
          tension: 0.3,
          borderColor: "#b11226",
          backgroundColor: "rgba(177,18,38,0.25)",
          yAxisID: "y"
        },
        {
          label: "Volumen",
          data: volumes,
          tension: 0.3,
          yAxisID: "y1",
          borderColor: "white",
          backgroundColor: "rgba(0,0,0,0.1)"
        }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: true, position: "top" } },
      scales: {
        y: { title: { display: true, text: "Peso (kg)" } },
        y1: {
          position: "right",
          grid: { drawOnChartArea: false },
          title: { display: true, text: "Volumen" }
        }
      }
    }
  });
}

/* ================= BADGE FUNCIONES ================= */
function showExerciseWarning(message) {
  const exerciseLabel = document.getElementById("strength-exercise-label");
  const backBtn = document.getElementById("back-to-general");
  const ctx = document.getElementById("strength-chart");

  // Ocultar gráfico
  if (ctx) ctx.style.display = "none";

  // Mostrar mensaje de advertencia
  if (exerciseLabel) {
    exerciseLabel.textContent = message;
    exerciseLabel.classList.remove("hidden");
    exerciseLabel.classList.add("warning"); // puedes agregar estilo rojo
  }

  // Mantener botón de volver visible
  if (backBtn) backBtn.classList.remove("hidden");
}

function hideExerciseWarning() {
  const exerciseLabel = document.getElementById("strength-exercise-label");
  const ctx = document.getElementById("strength-chart");

  if (exerciseLabel) {
    exerciseLabel.classList.remove("warning");
  }

  if (ctx) ctx.style.display = "block";
}

async function loadStatsMesocycles() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data, error } = await supabase
    .from("mesocycles")
    .select("id, name")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  const select = document.getElementById("stats-mesocycle");
  select.innerHTML = `<option value="">Selecciona mesociclo</option>`;

  data.forEach(m => {
    const opt = document.createElement("option");
    opt.value = m.id;
    opt.textContent = m.name;
    select.appendChild(opt);
  });
}

function updateCoachDashboard(exercises) {
  const status = overallProgress(exercises);

  document.querySelector('.coach-grid').innerHTML = `
    <div class="coach-card ${status === 'green' ? 'green' : ''}">📈 Progreso sólido</div>
    <div class="coach-card ${status === 'yellow' ? 'yellow' : ''}">⚠️ Estancamientos</div>
    <div class="coach-card ${status === 'red' ? 'red' : ''}">🚨 Fatiga</div>
  `;

   if (lastMesocycle.is_deload) {
     showRebuildCTA(async () => {
       const { data: { user } } = await supabase.auth.getUser();
   
       await createPostDeloadMesocycle({
         deloadMesocycleId: lastMesocycle.id,
         userId: user.id
       });
   
       alert('Mesociclo de rebuild creado');
       loadMesocycles();
     });
   }
}

function renderFatigueAlerts(data) {
  const container = document.getElementById('fatigueAlerts');
  if (!container) return;

  container.innerHTML = '';

  if (!Array.isArray(data) || data.length === 0) {
    container.innerHTML = `<p class="muted">Sin alertas críticas</p>`;
    return;
  }

  data.forEach(v => {
    const pct = Number(v.percent);

    if (isNaN(pct)) return;

    const div = document.createElement('div');
    div.className = 'alert-card';

    div.textContent = `⚠️ ${v.exercise}: caída de ${Math.abs(pct)}%`;

    container.appendChild(div);
  });
}

function renderDeloadAdvice(exercises) {
  const deloads = exercises.filter(needsDeload);

  if (!deloads.length) return;

  document.querySelector('.coach-alert').innerHTML = `
    🔴 Deload recomendado
    <p>${deloads.map(e => e.exercise).join(', ')}</p>
  `;
}

function getCoachInsight(trend) {
  if (trend === "up") return "💪 Excelente progresión, sigue así";
  if (trend === "flat") return "⚠️ Considera subir carga o volumen";
  return "🛑 Posible fatiga, revisa descanso";
}

// =====================
//EXPORTAR
// =====================
async function exportHistoryToExcel() {
  const { data: records, error } = await supabase
    .from('exercise_records')
    .select(`
      created_at,
      week_number,
      exercise_name,
      weight,
      reps,
      mesocycles ( name )
    `)
    .order('created_at');

  if (error) {
    console.error(error);
    return;
  }

  const rows = records.map(r => ({
    Fecha: new Date(r.created_at).toLocaleDateString(),
    Semana: r.week_number,
    Ejercicio: r.exercise_name,
    Peso: r.weight,
    Reps: r.reps,
    Volumen: r.weight * r.reps,
    Mesociclo: r.mesocycles?.name ?? '-'
  }));

  const wb = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(rows);

  XLSX.utils.book_append_sheet(wb, sheet, 'Historial');
  XLSX.writeFile(wb, 'historial_entrenamiento.xlsx');
}

function exportDashboardToExcel({
  volumeData,
  muscleData,
  fatigueAlerts,
  coach
}) {
  const wb = XLSX.utils.book_new();

  // 1️⃣ Volumen por ejercicio
  const volumeSheet = XLSX.utils.json_to_sheet(
    volumeData.map(v => ({
      Ejercicio: v.exercise,
      Volumen: v.volume,
      Sets: v.sets,
      Tendencia: v.trend,
      Cambio: `${v.percent}%`
    }))
  );
  XLSX.utils.book_append_sheet(wb, volumeSheet, 'Volumen');

  // 2️⃣ Volumen por músculo
  const muscleSheet = XLSX.utils.json_to_sheet(
    muscleData.map(m => ({
      Músculo: m.muscle,
      Sets: m.sets,
      Estado: m.status,
      'Rango RP': `${m.ranges?.MEV ?? '-'}–${m.ranges?.MRV ?? '-'}`
    }))
  );
  XLSX.utils.book_append_sheet(wb, muscleSheet, 'Músculos');

  // 3️⃣ Alertas de fatiga
  const fatigueSheet = XLSX.utils.json_to_sheet(
    fatigueAlerts.map(f => ({
      Ejercicio: f.exercise,
      Tendencia: f.trend,
      Cambio: `${f.percent}%`
    }))
  );
  XLSX.utils.book_append_sheet(wb, fatigueSheet, 'Alertas');

  // 4️⃣ Coach
  const coachSheet = XLSX.utils.json_to_sheet([{
    Estado: coach.type,
    Recomendación: coach.message
  }]);
  XLSX.utils.book_append_sheet(wb, coachSheet, 'Coach');

  XLSX.writeFile(wb, 'dashboard_entrenamiento.xlsx');
}

// =====================
//TUTORIALES
// =====================
async function loadTutorials() {
  const { data, error } = await supabase
    .from('exercises')
    .select(`
      id,
      name,
      type,
      subgroup,
      exercise_tutorials (
        video_url,
        cues
      )
    `);

  if (error) {
    console.error(error);
    return;
  }

  tutorialsData = data;
  populateFilters(tutorialsData);
  renderTutorials(data);
}

function applyFilters() {
  const search = document.getElementById('tutorial-search').value.toLowerCase();
  const selectedTypes = getSelectedValues('type-options');
  const selectedSubgroups = getSelectedValues('subgroup-options');
  const onlyFavorites = document.getElementById('filter-favorites')?.checked;
  const sortBy = document.getElementById('sort-by').value;

  let filtered = tutorialsData.filter(ex => {
    if (!ex.exercise_tutorials?.length) return false;

    if (onlyFavorites && !isFavorite(ex.id)) return false;

    const matchesSearch = ex.name.toLowerCase().includes(search);
    const matchesType = !selectedTypes.length || selectedTypes.includes(ex.type);
    const matchesSubgroup = !selectedSubgroups.length || selectedSubgroups.includes(ex.subgroup);

    return matchesSearch && matchesType && matchesSubgroup;
  });

  if (sortBy) {
    const [field, direction] = sortBy.split('-');
    filtered.sort((a, b) => {
      const aVal = (a[field] || '').toLowerCase();
      const bVal = (b[field] || '').toLowerCase();
      return direction === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    });
  }

  renderTutorials(filtered);
}

function renderTutorials(exercises){
  const list = document.getElementById('tutorial-list');
  list.innerHTML = '';
  exercises.forEach(ex=>{
    if(!ex.exercise_tutorials?.length) return;
    const favorite = isFavorite(ex.id);
    const card = document.createElement('div');
    card.className='tutorial-card';
    card.innerHTML=`
      <div class="tutorial-info">
        <h4>${ex.name}</h4>
        <span>${ex.subgroup} · ${ex.type}</span>
      </div>
      <div class="tutorial-actions">
        <button class="fav-btn ${favorite?'active':''}" title="Favorito"><span class="star">★</span></button>
        <button class="play-btn">▶ Ver</button>
      </div>`;
    card.querySelector('.play-btn').onclick = ()=>openTutorial(ex.name, ex.exercise_tutorials[0]);
    card.querySelector('.fav-btn').onclick = (e)=>{
      e.stopPropagation();
      toggleFavorite(ex.id);
      applyFilters();
    };
    list.appendChild(card);
  });
}

function handleTutorialSelect(e) {
  const exerciseId = e.target.value;
  if (!exerciseId) return;

  const exercise = tutorialsData.find(ex => ex.id === exerciseId);
  if (!exercise || !exercise.exercise_tutorials.length) return;

  openTutorial(exercise.name, exercise.exercise_tutorials[0]);
}

function openTutorial(name, tutorial) {
  const embedUrl = toEmbedUrl(tutorial.video_url);
  if (!embedUrl) {
    alert('URL de video inválida');
    return;
  }

  document.getElementById('tutorial-title').textContent = name;
  document.getElementById('tutorial-video').src = embedUrl;
  document.getElementById('tutorial-cues').innerHTML =
    `<strong>Consejo:</strong> ${tutorial.cues}`;

  document.getElementById('tutorial-modal').classList.remove('hidden');
}

function closeTutorial() {
  const modal = document.getElementById('tutorial-modal');
  const iframe = document.getElementById('tutorial-video');
  modal.classList.add('hidden');
  iframe.src = '';
}

function toEmbedUrl(url) {
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.hostname.includes('youtube.com')) {
      const videoId = parsedUrl.searchParams.get('v');
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;
    }
    if (parsedUrl.hostname === 'youtu.be') {
      const videoId = parsedUrl.pathname.slice(1);
      return `https://www.youtube.com/embed/${videoId}`;
    }
  } catch(e){ console.error('URL inválida:', url); }
  return '';
}

function getFavorites() { return JSON.parse(localStorage.getItem(favorites_key)) || []; }
function isFavorite(id) { return getFavorites().includes(id); }
function toggleFavorite(id) {
  let favorites = getFavorites();
  favorites = favorites.includes(id) ? favorites.filter(f=>f!==id) : [...favorites, id];
  localStorage.setItem(favorites_key, JSON.stringify(favorites));
}

function populateFilters(exercises) {
  const typeContainer = document.getElementById('type-options');
  const subgroupContainer = document.getElementById('subgroup-options');
  if (!typeContainer || !subgroupContainer) return;

  typeContainer.innerHTML = '';
  subgroupContainer.innerHTML = '';

  const types = [...new Set(exercises.map(e => e.type).filter(Boolean))];
  const subgroups = [...new Set(exercises.map(e => e.subgroup).filter(Boolean))];

  types.forEach(type => {
    const label = document.createElement('label');
    label.className = 'filter-option';
    label.innerHTML = `<input type="checkbox" value="${type}"> ${type}`;
    typeContainer.appendChild(label);
  });

  subgroups.forEach(subgroup => {
    const label = document.createElement('label');
    label.className = 'filter-option';
    label.innerHTML = `<input type="checkbox" value="${subgroup}"> ${subgroup}`;
    subgroupContainer.appendChild(label);
  });
}

function getSelectedValues(containerId) {
  return Array.from(document.querySelectorAll(`#${containerId} input:checked`)).map(i=>i.value);
}

// =====================
// LISTENERS
// =====================
supabase.auth.onAuthStateChange((_e, session) => {
  session ? showApp() : showLogin();
});

registroSelect.addEventListener("change", () => {
  const mesocycleId = registroSelect.value;
  if (!mesocycleId) return;

  openRegistro(mesocycleId);
});

document.addEventListener("click", e => {
  const row = e.target.closest(".strength-row");
  if (!row) return;

  const exercise = row.dataset.exercise;
  const start = Number(row.dataset.start);
  const end = Number(row.dataset.end);

  openExerciseChart(exercise, start, end);
});

document.getElementById("exercise-modal")
  .addEventListener("click", e => {
    if (e.target.id === "exercise-modal") {
      closeModal();
    }
  });

document.getElementById('tutorial-search')?.addEventListener('input', applyFilters);
document.getElementById('sort-by')?.addEventListener('change', applyFilters);
document.getElementById('filter-favorites')?.addEventListener('change', applyFilters);
document.getElementById('clear-filters')?.addEventListener('click', () => {
  document.getElementById('tutorial-search').value = '';
  document.getElementById('sort-by').value = '';
  document.getElementById('filter-favorites').checked = false;
  document.querySelectorAll('#type-options input, #subgroup-options input').forEach(cb=>cb.checked=false);
  renderTutorials(tutorialsData);
});

document.querySelectorAll('.filter-btn').forEach(btn=>{
  btn.addEventListener('click', e=>{
    e.stopPropagation();
    btn.parentElement.classList.toggle('open');
  });
});

document.addEventListener('click', ()=>{
  document.querySelectorAll('.multi-filter').forEach(f=>f.classList.remove('open'));
});

document.addEventListener('change', e=>{
  if(e.target.closest('.filter-dropdown')) applyFilters();
});

document.getElementById('close-tutorial-modal-btn').addEventListener('click', closeTutorial);
document.getElementById('tutorial-modal').addEventListener('click', e=>{
  if(e.target.id==='tutorial-modal') closeTutorial();
});

// Cargar tutoriales al inicio
loadTutorials();

document.getElementById("start-stopwatch").onclick = () => {
  if (swInterval) return;
  swInterval = setInterval(() => {
    swTime += 100;
    document.getElementById("stopwatch").textContent =
      (swTime / 1000).toFixed(1);
  }, 100);
};

document.getElementById("stop-stopwatch").onclick = () => {
  if (!swInterval) return;

  clearInterval(swInterval);
  swInterval = null;

  saveTimeHistory({
    type: "⏱️ Cronómetro",
    time: (swTime / 1000).toFixed(1) + " s",
    date: new Date().toLocaleString()
  });
};

document.getElementById("reset-stopwatch").onclick = () => {
  swTime = 0;
  document.getElementById("stopwatch").textContent = "00:00.0";
};

document.getElementById("start-timer").onclick = () => {
  let seconds = parseInt(document.getElementById("timer-input").value);
  if (!seconds || seconds <= 0) return;

  clearInterval(timerInterval);

  timerInterval = setInterval(() => {
    seconds--;
    document.getElementById("timer-display").textContent =
      `00:${String(seconds).padStart(2, "0")}`;

    if (seconds <= 0) {
      clearInterval(timerInterval);
      alert("⏰ Tiempo terminado");
       saveTimeHistory({
        type: "⏲️ Temporizador",
        time: document.getElementById("timer-input").value + " s",
        date: new Date().toLocaleString()
      });
    }
  }, 1000);
};

document.getElementById("stop-timer").onclick = () => {
  clearInterval(timerInterval);
};

document.getElementById("clear-history")?.addEventListener("click", () => {
  if (!confirm("¿Borrar historial completo?")) return;
  localStorage.removeItem("timeHistory");
  renderTimeHistory();
});

document.addEventListener("DOMContentLoaded", () => {
  initTools();
});

startClock();
renderTimeHistory();

document.addEventListener('DOMContentLoaded', () => {
  const mesocycleId = localStorage.getItem('active_mesocycle');
  if (mesocycleId) {
    loadDashboard(mesocycleId);
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const menuToggle = document.getElementById("menu-toggle");
  const sideMenu = document.getElementById("side-menu");

  // Abrir / cerrar con botón
  menuToggle.addEventListener("click", (e) => {
    e.stopPropagation(); // evita que el click cierre el menú
    sideMenu.classList.toggle("open");
  });

  // Evitar cierre al hacer click dentro del sidebar
  sideMenu.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  // Cerrar al hacer click fuera
  document.addEventListener("click", () => {
    if (sideMenu.classList.contains("open")) {
      sideMenu.classList.remove("open");
    }
  });
   // Selección de tab y estado activo
   const menuItems = document.querySelectorAll(".menu-item");
   
   menuItems.forEach(item => {
     item.addEventListener("click", () => {
       // Quitar active de todos
       menuItems.forEach(i => i.classList.remove("active"));
       
       // Marcar el clickeado como activo
       item.classList.add("active");
   
       // Mostrar el tab correspondiente
       const tabId = item.getAttribute("data-tab");
       document.querySelectorAll(".tab-content").forEach(tab => {
         tab.classList.add("hidden");
       });
       document.getElementById(tabId).classList.remove("hidden");
   
       // Opcional: cerrar sidebar en mobile
       sideMenu.classList.remove("open");
     });
   });
});


document.addEventListener("DOMContentLoaded", async () => {
   await loadMesocycles();
   await loadMesocycleComparison();
});

populateMesocycleSelectors();
setupMesocycleComparison();
initCoachStatusCards();

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.parentElement.classList.toggle('faq-open');
    });
  });
});

const mesocycleSelect = document.getElementById('stats-mesocycle');

const analysisDashboard = document.getElementById('analysisDashboard');
const exerciseAnalysis = document.getElementById('exerciseAnalysis');

function updateStatsSections() {
  const selected = mesocycleSelect.value;

  const isAll = selected === '';

  // 🧠 ANÁLISIS / DASHBOARD
  analysisDashboard.classList.toggle('hidden', !isAll);

  // 🧠 SELECCIÓN DE MESOCICLO
  exerciseAnalysis.classList.toggle('hidden', isAll);

  // 🧠 GRÁFICA DE FUERZA
  // 👉 NO SE TOCA: siempre visible
}

// Al cambiar el select
mesocycleSelect.addEventListener('change', () => {
  updateStatsSections();
});

// Estado inicial
updateStatsSections();

const dashboardState = {
  volumeData: [],
  muscleData: [],
  fatigueAlerts: [],
  coach: null
};

document
  .getElementById('exportHistory')
  .addEventListener('click', exportHistoryToExcel);

document
  .getElementById('exportDashboard')
  .addEventListener('click', () => {

    if (!dashboardLoaded) {
      alert('Primero carga un mesociclo');
      return;
    }

    exportDashboardToExcel(dashboardState);
  });
