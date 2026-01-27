console.log("🔥 app.js cargado");
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
let selectedDay = null;
let editingMesocycleId = null;
let allowedSubgroups = null;
let statsChart = null;

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

const { data: profile } = await supabase
  .from("user_profiles")
  .select("onboarding_completed")
  .eq("id", user.id)
  .single();

if (!profile || !profile.onboarding_completed) {
  showView("onboarding-view");
} else {
  showView("app-view");
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
  document.querySelectorAll(".tab-btn").forEach(btn => {
     btn.onclick = () => {
       const tab = btn.dataset.tab;
   
       document.querySelectorAll(".tab-content").forEach(t =>
         t.classList.add("hidden")
       );
   
       document.getElementById(tab).classList.remove("hidden");
   
       if (tab === "stats") {
         renderStatsView(); // 👈 aquí y solo aquí
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
    .select(`
      id,
      name,
      weeks,
      days_per_week,
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

  // 🔥 Limpiar UI
  historyList.innerHTML = "";
  registroSelect.innerHTML = `<option value="">Selecciona mesociclo</option>`;

  data.forEach(m => {
    const template = Array.isArray(m.templates)
      ? m.templates[0]
      : m.templates;

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

    // 🔥 También al selector de registro
    const opt = document.createElement("option");
    opt.value = m.id;
    opt.textContent = m.name;
    registroSelect.appendChild(opt);
  });
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
   UTILIDADES
====================== */
function getAllowedSubgroups(emphasis) {
  if (!emphasis || emphasis === "Todos") return null;
  return emphasis.split(",").map(s => s.trim());
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
   REGISTRO EDITOR
====================== */
async function renderRegistroEditor(mesocycleId) {
  console.log("🟢 renderRegistroEditor", mesocycleId);
  registroEditor.innerHTML = "";

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
     CARGAR EJERCICIOS DE PLANTILLA
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
    console.error("❌ Error cargando ejercicios de plantilla", eError);
    registroEditor.innerHTML = "<p class='error'>Error cargando ejercicios</p>";
    return;
  }

  // Blindaje contra relaciones rotas
  const exercises = templateExercises
     .map(te => te.exercises)
     .filter(e => e && e.id && e.name);

  if (!exercises.length) {
     registroEditor.innerHTML = `
       <p class="error">
         ⚠ La plantilla existe pero no tiene ejercicios válidos.
         Revisa la relación en Supabase.
       </p>
     `;
     return;
   }

  const exercisesById = {};
  exercises.forEach(ex => exercisesById[ex.id] = ex);

  /* ======================
     UI
  ====================== */
  const title = document.createElement("h3");
  title.textContent = mesocycle.name;
  registroEditor.appendChild(title);

  const weekSelect = document.createElement("select");
  for (let i = 1; i <= mesocycle.weeks; i++) {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = `Semana ${i}`;
    weekSelect.appendChild(opt);
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
      renderExercisesForDay(mesocycleId, Number(weekSelect.value), selectedDay);
    };
    dayContainer.appendChild(btn);
  }

  const exerciseSelect = document.createElement("select");
  exerciseSelect.innerHTML = `<option value="">Selecciona ejercicio</option>`;

  exercises.forEach(ex => {
    const opt = document.createElement("option");
    opt.value = ex.id;
    opt.textContent = ex.name;
    exerciseSelect.appendChild(opt);
  });

  const weightInput = document.createElement("input");
  weightInput.placeholder = "Peso (kg)";
  weightInput.type = "number";

  const repsInput = document.createElement("input");
  repsInput.placeholder = "Reps";
  repsInput.type = "number";

  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Guardar";

  const registeredContainer = document.createElement("div");
  registeredContainer.id = "registered-exercises";

  registroEditor.append(
    exerciseSelect,
    weightInput,
    repsInput,
    saveBtn,
    registeredContainer
  );

  /* ======================
     GUARDAR
  ====================== */
  saveBtn.onclick = async () => {
    if (!selectedDay) return alert("Selecciona un día");
    if (!exerciseSelect.value) return alert("Selecciona un ejercicio");

    const exercise = exercisesById[exerciseSelect.value];
      if (!exercise || !exercise.name) {
        alert("Ejercicio inválido o mal vinculado");
        return;
      }

    const payload = {
      user_id: session.user.id,
      mesocycle_id: mesocycleId,
      exercise_id: exercise.id,
      exercise_name: exercise.name, // 🔥 CLAVE para stats y vistas
      week_number: Number(weekSelect.value),
      day_number: selectedDay,
      weight: Number(weightInput.value),
      reps: Number(repsInput.value)
    };

    const { error } = await supabase
      .from("exercise_records")
      .insert(payload);

    if (error) {
      console.error("❌ Error guardando", error);
      alert("Error al guardar");
      return;
    }

    weightInput.value = "";
    repsInput.value = "";

      // 🏆 comprobar si fue PR
      const { data: prRows } = await supabase
        .from("exercise_prs")
        .select("pr_weight")
        .eq("user_id", session.user.id)
        .eq("exercise_name", exercise.name)
        .single();
      
      if (prRows && payload.weight >= prRows.pr_weight) {
        showPRBadge(exercise.name, payload.weight);
      }
   // 🔄 refrescar stats si están visibles
   if (!document.getElementById("stats").classList.contains("hidden")) {
     const select = document.getElementById("stats-mesocycle");
     const id = select?.value || null;
     applyStatsFilter(id);
     loadMesocycleComparison();
   }
    renderExercisesForDay(mesocycleId, Number(weekSelect.value), selectedDay);
  };

  console.log("✅ RegistroEditor listo y blindado");
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
   RENDER VIEW
====================== */
function renderStatsView() {
  const statsView = document.getElementById("stats");
  if (!statsView) return;

  statsView.innerHTML = `
    <h2>📊 Estadísticas</h2>

    <div class="stats-control">
      <label>Mesociclo</label>
      <select id="stats-mesocycle">
        <option value="">Todos</option>
      </select>
    </div>

    <div id="stats-summary" class="stats-grid">
      <div class="stat-card">
        <strong id="total-sets">–</strong>
        <span>Series totales</span>
      </div>
      <div class="stat-card">
        <strong id="total-volume">–</strong>
        <span>Volumen total (kg)</span>
      </div>
      <div class="stat-card">
        <strong id="total-exercises">–</strong>
        <span>Ejercicios únicos</span>
      </div>
    </div>

      <h3>🏆 Mejores marcas</h3>
      <div id="pr-table" class="pr-table"></div>
      
      <h3>📈 Progreso de fuerza</h3>
      <canvas id="strength-chart"></canvas>
      
      <h3>📦 Volumen por ejercicio</h3>
      <div id="exercise-volume-list"></div>
      
      <h3>🔄 Comparación de mesociclos</h3>
      <div id="mesocycle-comparison"></div>
  `;

  // 🔥 Primero cargar mesociclos
  loadStatsMesocycles();

  // 🔥 Stats globales (todos los datos)
  loadStatsOverview();
  loadPRTable();
  loadStrengthChart();
  loadExerciseVolumeList();
   loadMesocycleComparison();

  // 🔥 Filtro por mesociclo
  document.getElementById("stats-mesocycle").onchange = e => {
    const mesocycleId = e.target.value || null;

    loadStatsOverview(mesocycleId);
    loadPRTable(mesocycleId);
    loadStrengthChart(mesocycleId);
    loadExerciseVolumeList(mesocycleId);
  };
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

async function loadMesocycleComparison() {
  const container = document.getElementById("mesocycle-comparison");
  if (!container) {
    console.warn("⏳ mesocycle-comparison aún no está en el DOM");
    return;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Mesociclos
  const { data: mesocycles, error: mError } = await supabase
    .from("mesocycles")
    .select("id, name")
    .eq("user_id", user.id);

  if (mError || !mesocycles) {
    console.error("❌ Error cargando mesociclos", mError);
    return;
  }

  // Stats por mesociclo
  const { data: stats, error: sError } = await supabase
    .from("mesocycle_stats")
    .select("*")
    .eq("user_id", user.id);

  if (sError) {
    console.error("❌ Error cargando mesocycle_stats", sError);
  }

  // PRs por mesociclo
  const { data: prs, error: pError } = await supabase
    .from("mesocycle_prs")
    .select("*")
    .eq("user_id", user.id);

  if (pError) {
    console.error("❌ Error cargando mesocycle_prs", pError);
  }

  // Mapear PRs por mesociclo
  const prMap = {};
  (prs || []).forEach(p => {
    prMap[p.mesocycle_id] = p.pr_count;
  });

  container.innerHTML = "";

  mesocycles.forEach(m => {
    const s = (stats || []).find(x => x.mesocycle_id === m.id);
    const pr = prMap[m.id] || 0;

    const div = document.createElement("div");
    div.className = "mesocycle-stat-card";

    div.innerHTML = `
      <h4>${m.name}</h4>
      <p>Volumen: <strong>${(s?.total_volume || 0).toFixed(0)} kg</strong></p>
      <p>Record Personal: <strong>${pr}</strong></p>
      <p>Ejercicios: <strong>${s?.exercises || 0}</strong></p>
    `;

    container.appendChild(div);
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

async function loadStrengthChart(mesocycleId = null) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  let query = supabase
    .from("exercise_progress_chart")
    .select("day, total_volume")
    .eq("user_id", user.id)
    .order("day");

  if (mesocycleId) {
    query = query.eq("mesocycle_id", mesocycleId);
  }

  const { data, error } = await query;
  if (error) {
    console.error(error);
    return;
  }

  const labels = data.map(r => r.day);
  const values = data.map(r => r.total_volume);

  const ctx = document.getElementById("strength-chart");
  if (!ctx) return;

  if (window.statsChart) window.statsChart.destroy();

  window.statsChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Volumen total",
        data: values,
        tension: 0.3,
        fill: true
      }]
    }
  });
}

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

  const { data, error } = await supabase
    .from("exercise_progress_chart")
    .select("day, max_weight, total_volume")
    .eq("user_id", user.id)
    .eq("exercise_name", exerciseName)
    .order("day");

  if (error || !data.length) {
    console.warn("Sin datos", error);
    return;
  }

  const labels = data.map(d => d.day);
  const weights = data.map(d => d.max_weight);
  const volumes = data.map(d => d.total_volume);

  const ctx = document.getElementById("strength-chart");
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
          tension: 0.3
        },
        {
          label: "Volumen",
          data: volumes,
          tension: 0.3,
          yAxisID: "y1"
        }
      ]
    },
    options: {
      scales: {
        y: { title: { display: true, text: "Peso (kg)" }},
        y1: {
          position: "right",
          grid: { drawOnChartArea: false },
          title: { display: true, text: "Volumen" }
        }
      }
    }
  });
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

function getCoachInsight(trend) {
  if (trend === "up") return "💪 Excelente progresión, sigue así";
  if (trend === "flat") return "⚠️ Considera subir carga o volumen";
  return "🛑 Posible fatiga, revisa descanso";
}

// =====================
// INIT
// =====================
document.addEventListener("DOMContentLoaded", () => {
  initAuth();        
});
