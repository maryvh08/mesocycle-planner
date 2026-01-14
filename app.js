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
      document
        .querySelectorAll(".tab-btn")
        .forEach(b => b.classList.remove("active"));

      document
        .querySelectorAll(".tab-content")
        .forEach(c => c.classList.add("hidden"));

      btn.classList.add("active");

      const tabId = btn.dataset.tab;
      const tabEl = document.getElementById(tabId);

      if (!tabEl) {
        console.error("❌ Tab no existe:", tabId);
        return;
      }

      tabEl.classList.remove("hidden");

      if (tabId === "stats-tab") {
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
    console.error(error);
    return;
  }

  historyList.innerHTML = "";
  registroSelect.innerHTML = `<option value="">Selecciona mesociclo</option>`;

  data.forEach(m => {
    const template = Array.isArray(m.templates)
      ? m.templates[0]
      : m.templates;

    /* ======================
       HISTORIAL
    ====================== */
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

    /* ======================
       SELECT REGISTRO  ✅
    ====================== */
    const opt = document.createElement("option");
    opt.value = m.id;
    opt.textContent = m.name;
    registroSelect.appendChild(opt);
  });
}

async function loadExerciseHistory(mesocycleId, container) {
  container.innerHTML = "<p>Cargando historial...</p>";

  const { data, error } = await supabase
    .from("exercise_records")
    .select(`
     id,
     week_number,
     day_number,
     weight,
     reps,
     exercises (
       name,
       subgroup
     )
   `)
    .eq("mesocycle_id", mesocycleId)
    .order("week_number")
    .order("day_number");

  if (error) {
    console.error(error);
    container.innerHTML = "<p>Error cargando historial</p>";
    return;
  }

  if (!data.length) {
    container.innerHTML = "<p>No hay ejercicios registrados</p>";
    return;
  }

  // Agrupar por semana → día
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
        label.textContent =
          `${r.exercises.name} — ${r.weight}kg × ${r.reps}`;
      
        // ✏️ click para editar
        label.onclick = () => editExerciseRecord(r);
      
        // ❌ botón borrar
        const deleteBtn = document.createElement("button");
        deleteBtn.className = "chip-delete";
        deleteBtn.textContent = "✕";
      
        deleteBtn.onclick = async (e) => {
          e.stopPropagation();
          await deleteExerciseRecord(r.id);
          await loadExerciseHistory(mesocycleId, container);
        };
      
        chip.appendChild(label);
        chip.appendChild(deleteBtn);
        dayDiv.appendChild(chip);
      });

      weekDiv.appendChild(dayDiv);
    });

    container.appendChild(weekDiv);
  });
}

async function editExerciseRecord(record) {
  const newWeight = prompt(
    `Editar peso (${record.exercises.name})`,
    record.weight
  );
  if (newWeight === null) return;

  const newReps = prompt(
    `Editar reps (${record.exercises.name})`,
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
    console.error(error);
    alert("Error actualizando registro");
    return;
  }

  alert("Registro actualizado");
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
function getAllowedSubgroups(emphasis) {
  if (!emphasis || emphasis === "Todos") return null;
  return emphasis.split(",").map(s => s.trim());
}

/* ======================
   REGISTRO EDITOR
====================== */
async function renderRegistroEditor(mesocycleId) {
  console.log("🟢 renderRegistroEditor", mesocycleId);
  registroEditor.innerHTML = "";

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
    registroEditor.textContent = "Error cargando mesociclo";
    return;
  }

  /* ======================
     CARGAR TEMPLATE
  ====================== */
  let allowedSubgroups = null;

  if (mesocycle.template_id) {
    const { data: template } = await supabase
      .from("templates")
      .select("emphasis")
      .eq("id", mesocycle.template_id)
      .single();

    allowedSubgroups = getAllowedSubgroups(template?.emphasis);
  }

  /* ======================
     CARGAR EJERCICIOS
  ====================== */
  const { data: exercises, error: eError } = await supabase
    .from("exercises")
    .select("id, name, subgroup")
    .order("name");

  if (eError) {
    console.error(eError);
    registroEditor.textContent = "Error cargando ejercicios";
    return;
  }

  const filteredExercises = allowedSubgroups
    ? exercises.filter(e => allowedSubgroups.includes(e.subgroup))
    : exercises;

  /* ======================
     UI BÁSICA
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

  /* ======================
     ESTADO
  ====================== */
  let selectedDay = null;

  /* ======================
     CONTENEDOR REGISTROS
  ====================== */
  const registeredExercisesContainer = document.createElement("div");
  registeredExercisesContainer.id = "registered-exercises";
  registeredExercisesContainer.innerHTML = "<p>Selecciona un día</p>";
  registroEditor.appendChild(registeredExercisesContainer);

  /* ======================
     BOTONES DE DÍA
  ====================== */
  const dayContainer = document.createElement("div");
  dayContainer.className = "day-buttons";
  registroEditor.appendChild(dayContainer);

  for (let i = 1; i <= mesocycle.days_per_week; i++) {
    const btn = document.createElement("button");
    btn.className = "day-btn";
    btn.textContent = `Día ${i}`;

    btn.onclick = async () => {
      [...dayContainer.children].forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      selectedDay = i;

      await renderExercisesForDay({
        mesocycleId,
        week: Number(weekSelect.value),
        day: selectedDay,
        container: registeredExercisesContainer
      });
    };

    dayContainer.appendChild(btn);
  }

  weekSelect.onchange = () => {
    selectedDay = null;
    registeredExercisesContainer.innerHTML = "<p>Selecciona un día</p>";
    [...dayContainer.children].forEach(b => b.classList.remove("active"));
  };

  /* ======================
     SELECT EJERCICIO
  ====================== */
  const exerciseSelect = document.createElement("select");
  exerciseSelect.innerHTML = `<option value="">Selecciona ejercicio</option>`;

  filteredExercises.forEach(ex => {
    const opt = document.createElement("option");
    opt.value = ex.id;
    opt.textContent = `${ex.name} (${ex.subgroup})`;
    exerciseSelect.appendChild(opt);
  });

  registroEditor.appendChild(exerciseSelect);

  /* ======================
     INPUTS
  ====================== */
  const weightInput = document.createElement("input");
  weightInput.type = "number";
  weightInput.placeholder = "Peso (kg)";

  const repsInput = document.createElement("input");
  repsInput.type = "number";
  repsInput.placeholder = "Reps";

  registroEditor.appendChild(weightInput);
  registroEditor.appendChild(repsInput);

  /* ======================
     GUARDAR
  ====================== */
  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Guardar ejercicio";

  saveBtn.onclick = async () => {
    if (!selectedDay) return alert("Selecciona un día");
    if (!exerciseSelect.value) return alert("Selecciona un ejercicio");

    const payload = {
      mesocycle_id: mesocycleId,
      exercise_id: exerciseSelect.value,
      week_number: Number(weekSelect.value),
      day_number: selectedDay,
      weight: Number(weightInput.value),
      reps: Number(repsInput.value)
    };

    const { error } = await supabase
      .from("exercise_records")
      .upsert(payload, {
        onConflict: "mesocycle_id,exercise_id,week_number,day_number"
      });

    if (error) {
      console.error(error);
      alert("Error al guardar");
      return;
    }

    weightInput.value = "";
    repsInput.value = "";

    await renderExercisesForDay({
      mesocycleId,
      week: Number(weekSelect.value),
      day: selectedDay,
      container: registeredExercisesContainer
    });
  };

  registroEditor.appendChild(saveBtn);

  console.log("✅ renderRegistroEditor completado");
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

async function deleteExerciseRecord(recordId) {
  if (!confirm("¿Eliminar este ejercicio?")) return;

  const { error } = await supabase
    .from("exercise_records")
    .delete()
    .eq("id", recordId);

  if (error) {
    console.error(error);
    alert("Error eliminando ejercicio");
    return;
  }

  console.log("🗑️ Registro eliminado", recordId);
}

/* ======================
   ESTADISTICAS
====================== */
async function renderStatsView() {
  const statsView = document.getElementById("stats-view");
  if (!statsView) {
    console.error("❌ stats-view no existe");
    return;
  }

  statsView.innerHTML = `
    <h2>📊 Estadísticas</h2>

    <select id="stats-exercise-select">
      <option value="">Selecciona ejercicio</option>
    </select>

    <div class="stats-metrics">
      <div>Último peso: <strong id="metric-last">-</strong></div>
      <div>Máximo peso: <strong id="metric-max">-</strong></div>
      <div>Promedio: <strong id="metric-avg">-</strong></div>
    </div>

    <canvas id="progressChart" height="120"></canvas>
  `;

  await loadStatsExerciseSelector();
}

async function renderStatsExerciseSelector(statsView) {
  statsView.innerHTML = "<p>Cargando ejercicios...</p>";

  const { data, error } = await supabase
    .from("exercise_records")
    .select(`
      exercise_id,
      exercises!inner (
        id,
        name
      )
    `);

  if (error) {
    console.error("❌ Stats selector error", error);
    statsView.innerHTML = "<p>Error cargando ejercicios</p>";
    return;
  }

  if (!data.length) {
    statsView.innerHTML = "<p>No hay registros todavía</p>";
    return;
  }

  const unique = {};
  data.forEach(r => {
    unique[r.exercise_id] = r.exercises;
  });

  statsView.innerHTML = "";

  const select = document.createElement("select");
  select.innerHTML = `<option value="">Selecciona ejercicio</option>`;

  Object.values(unique).forEach(ex => {
    const opt = document.createElement("option");
    opt.value = ex.id;
    opt.textContent = ex.name;
    select.appendChild(opt);
  });

  const container = document.createElement("div");
  container.id = "exercise-stats-container";

  select.onchange = () => {
    if (!select.value) return;
    loadExerciseStats(select.value);
  };

  statsView.appendChild(select);
  statsView.appendChild(container);
}

async function loadExercisesForStats(select) {
  const { data, error } = await supabase
    .from("exercise_records")
    .select(`
      exercise_id,
      exercises (
        name
      )
    `)
    .order("exercise_id");

  if (error) {
    console.error(error);
    return;
  }

  const unique = {};
  data.forEach(r => {
    if (!unique[r.exercise_id]) {
      unique[r.exercise_id] = r.exercises.name;
    }
  });

  Object.entries(unique).forEach(([id, name]) => {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = name;
    select.appendChild(opt);
  });
}

aasync function loadStatsExerciseSelector() {
  const select = document.getElementById("stats-exercise-select");
  if (!select) {
    console.error("❌ stats-exercise-select no existe");
    return;
  }

  const { data, error } = await supabase
    .from("exercise_records")
    .select(`
      exercise_id,
      exercises (
        name
      )
    `)
    .order("exercise_id");

  if (error) {
    console.error("❌ Error cargando selector stats", error);
    return;
  }

  // eliminar duplicados
  const unique = {};
  data.forEach(r => {
    if (r.exercises && !unique[r.exercise_id]) {
      unique[r.exercise_id] = r.exercises.name;
    }
  });

  Object.entries(unique).forEach(([id, name]) => {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = name;
    select.appendChild(opt);
  });

  select.onchange = () => {
    if (!select.value) return;
    loadExerciseStats(select.value);
  };
}

let statsChart = null;

async function loadExerciseStats(exerciseId) {
  console.log("📈 Cargando stats de", exerciseId);

  const statsContainer = document.getElementById("exercise-stats-container");
  if (!statsContainer) {
    console.error("❌ stats container no existe");
    return;
  }

  statsContainer.innerHTML = "<p>Cargando estadísticas...</p>";

  const { data, error } = await supabase
    .from("exercise_records")
    .select("weight, reps, updated_at")
    .eq("exercise_id", exerciseId)
    .order("updated_at", { ascending: true });

  if (error) {
    console.error("❌ Error stats", error);
    statsContainer.innerHTML = "<p>Error cargando estadísticas</p>";
    return;
  }

  if (!data || data.length === 0) {
    statsContainer.innerHTML = "<p>No hay registros para este ejercicio</p>";
    return;
  }

  // 📊 métricas
  const weights = data.map(r => r.weight);
  const last = weights.at(-1);
  const max = Math.max(...weights);
  const avg = (weights.reduce((a, b) => a + b, 0) / weights.length).toFixed(1);

  statsContainer.innerHTML = `
    <div class="stats-metrics">
      <div><strong>Último:</strong> ${last} kg</div>
      <div><strong>Máximo:</strong> ${max} kg</div>
      <div><strong>Promedio:</strong> ${avg} kg</div>
      <canvas id="progressChart"></canvas>
    </div>
  `;

  // 📈 gráfica
  const ctx = document.getElementById("progressChart").getContext("2d");

  if (window.statsChart) window.statsChart.destroy();

  window.statsChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: data.map(r =>
        new Date(r.updated_at).toLocaleDateString()
      ),
      datasets: [{
        label: "Peso (kg)",
        data: weights,
        tension: 0.3
      }]
    },
    options: {
      responsive: true
    }
  });
}

function renderProgressTable(data, container) {
  const table = document.createElement("table");
  table.className = "stats-table";

  table.innerHTML = `
    <tr>
      <th>Fecha</th>
      <th>Peso</th>
      <th>Reps</th>
      <th>Volumen</th>
    </tr>
  `;

  data.forEach(r => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${new Date(r.updated_at).toLocaleDateString()}</td>
      <td>${r.weight}</td>
      <td>${r.reps}</td>
      <td>${r.weight * r.reps}</td>
    `;
    table.appendChild(tr);
  });

  container.appendChild(table);
}

let progressChart = null;

async function loadExerciseProgressChart(exerciseId) {
  const canvas = document.getElementById("progressChart");
  if (!canvas) {
    console.error("❌ Canvas no existe");
    return;
  }

  const { data, error } = await supabase
    .from("exercise_records")
    .select("weight, created_at")
    .eq("exercise_id", exerciseId)
    .order("created_at", { ascending: true });

  if (error || !data.length) {
    console.error(error);
    return;
  }

  const labels = data.map(r =>
    new Date(r.created_at).toLocaleDateString()
  );

  const values = data.map(r => r.weight);

  const ctx = canvas.getContext("2d");

  if (progressChart) progressChart.destroy();

  progressChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Peso (kg)",
        data: values,
        borderWidth: 2,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true }
      }
    }
  });
}

async function testStatsQuery() {
  const { data, error } = await supabase
    .from("exercise_records")
    .select("id, exercise_id")
    .limit(5);

  console.log("🧪 exercise_records test", data, error);
}

async function testStatsJoin() {
  const { data, error } = await supabase
    .from("exercise_records")
    .select(`
      exercise_id,
      exercises (
        id,
        name
      )
    `)
    .limit(5);

  console.log("🧪 join test", data, error);
}

/* ======================
   INIT
====================== */
initAuth();
