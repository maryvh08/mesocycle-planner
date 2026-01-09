import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://vhwfenefevzzksxrslkx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZod2VmZXZ6emtzeHJzbGt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MTE3ODAsImV4cCI6MjA4MzQ4Nzc4MH0.CG1KzxpxGHifXsgBvH-4E4WvXbj6d-8WsagqaHAtVwo";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ======================
   UI ELEMENTS
====================== */
const loginView = document.getElementById("login-view");
const appView = document.getElementById("app-view");
const message = document.getElementById("auth-message");

const templateSelect = document.getElementById("template-select");
const mesocycleList = document.getElementById("mesocycle-list");

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
   CREATE MESOCYCLE
====================== */
let selectedDays = null;

document.querySelectorAll(".day-btn").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".day-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    selectedDays = parseInt(btn.dataset.days);
  };
});

document.getElementById("create-mesocycle-btn").onclick = async () => {
  const name = document.getElementById("mesocycle-name").value;
  const weeks = parseInt(document.getElementById("mesocycle-weeks").value);
  const templateId = templateSelect.value;

  if (!name || !weeks || !templateId || !selectedDays) {
    alert("Completa todos los campos");
    return;
  }

  const { data: { user } } = await supabase.auth.getUser();

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
  loadMesocycles();
};

/* ======================
   LOAD MESOCYCLES
====================== */
async function loadMesocycles() {
  const { data, error } = await supabase
    .from("mesocycles")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return console.error(error);

  mesocycleList.innerHTML = "";

  data.forEach(m => {
    const li = document.createElement("li");
    li.className = "mesocycle-card";

    li.innerHTML = `
      <header>
        <h3>${m.name}</h3>
        <span>${m.weeks} semanas · ${m.days_per_week} días</span>
      </header>
      <button class="edit-btn">Editar</button>
      <button class="delete-btn">Eliminar</button>
      <div class="editor hidden"></div>
    `;

    mesocycleList.appendChild(li);
    setupMesocycleCard(li, m);
  });
}

/* ======================
   MESOCYCLE CARD LOGIC
====================== */
function setupMesocycleCard(card, mesocycle) {
  const editBtn = card.querySelector(".edit-btn");
  const deleteBtn = card.querySelector(".delete-btn");
  const editor = card.querySelector(".editor");

  // Editar
  editBtn.onclick = async () => {
    editor.classList.toggle("hidden");
    if (!editor.innerHTML.trim()) await renderCardEditor(editor, mesocycle);
  };

  // Eliminar
  deleteBtn.onclick = async () => {
    if (!confirm("¿Eliminar mesociclo?")) return;
    const { error } = await supabase.from("mesocycles").delete().eq("id", mesocycle.id);
    if (error) return alert(error.message);
    loadMesocycles();
  };
}

async function renderCardEditor(editor, mesocycle) {
  // Limpiar editor
  editor.innerHTML = "";

  const template = await getTemplateById(mesocycle.template_id);

  // SELECTOR DE SEMANA
  const weekSelect = document.createElement("select");
  weekSelect.id = "week-select";
  weekSelect.style.marginBottom = "1rem";
  for (let w = 1; w <= mesocycle.weeks; w++) {
    const opt = document.createElement("option");
    opt.value = w;
    opt.textContent = `Semana ${w}`;
    weekSelect.appendChild(opt);
  }
  editor.appendChild(weekSelect);

  // CONTENEDOR DE BOTONES DE DÍA
  const dayButtonsDiv = document.createElement("div");
  dayButtonsDiv.style.marginBottom = "1rem";
  for (let i = 1; i <= mesocycle.days_per_week; i++) {
    const btn = document.createElement("button");
    btn.textContent = `Día ${i}`;
    btn.className = "day-mini-btn";
    btn.style.marginRight = "0.5rem";
    btn.onclick = async () => {
      editor.querySelectorAll(".day-mini-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const selectedWeek = parseInt(weekSelect.value);
      await renderExercisesForDay(editor, mesocycle, i, selectedWeek, template);
    };
    dayButtonsDiv.appendChild(btn);
  }
  editor.appendChild(dayButtonsDiv);

  // SELECT DE EJERCICIOS
  const exerciseSelect = document.createElement("select");
  exerciseSelect.multiple = true;
  exerciseSelect.size = 10;
  exerciseSelect.style.width = "100%";
  exerciseSelect.className = "exercise-select";
  editor.appendChild(exerciseSelect);

  // BOTÓN GUARDAR DÍA
  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Guardar día";
  saveBtn.style.marginTop = "0.5rem";
  saveBtn.onclick = async () => {
    const activeDayBtn = editor.querySelector(".day-mini-btn.active");
    if (!activeDayBtn) return alert("Selecciona un día");

    const day = parseInt(activeDayBtn.textContent.replace("Día ", ""));
    const week = parseInt(weekSelect.value);

    await saveDayExercises(exerciseSelect, mesocycle.id, day, week);

    const hint = editor.querySelector(".day-hint");
    hint.textContent = `Día ${day}, Semana ${week} guardado ✅`;

    await renderExercisesForDay(editor, mesocycle, day, week, template);
  };
  editor.appendChild(saveBtn);

  // HINT
  const hint = document.createElement("p");
  hint.className = "day-hint";
  hint.style.marginTop = "0.5rem";
  hint.textContent = "Selecciona un día y semana para configurar ejercicios";
  editor.appendChild(hint);

  // LISTA DE CHIPS DE EJERCICIOS
  const list = document.createElement("div");
  list.className = "day-exercise-list";
  list.style.marginTop = "0.5rem";
  editor.appendChild(list);
}

/* ======================
   RENDER EXERCISES
====================== */
async function renderExercisesForDay(editor, mesocycle, day, week, template) {
  const select = editor.querySelector(".exercise-select");
  const list = editor.querySelector(".day-exercise-list");
  select.innerHTML = "";
  list.innerHTML = "";

  // Filtrar subgrupos según plantilla
  let subgroups = [];
  if (template.emphasis && template.emphasis !== "Todos") {
    subgroups = template.emphasis.split(",").map(s => s.trim());
  }

  // Cargar ejercicios desde Supabase
  let query = supabase.from("exercises").select("id,name,subgroup").order("name");
  if (subgroups.length) query = query.in("subgroup", subgroups);

  const { data: exercises, error } = await query;
  if (error) {
    console.error(error);
    select.innerHTML = "<option>Error cargando ejercicios</option>";
    return;
  }

  if (!exercises || exercises.length === 0) {
    select.innerHTML = "<option>No hay ejercicios disponibles</option>";
    return;
  }

  // Crear opciones en el select
  exercises.forEach(ex => {
    const opt = document.createElement("option");
    opt.value = ex.id;
    opt.textContent = `${ex.name} (${ex.subgroup})`;
    select.appendChild(opt);
  });

  // Cargar ejercicios ya guardados para este día y semana
  const { data: saved } = await supabase
    .from("mesocycle_exercises")
    .select("exercise_id")
    .eq("mesocycle_id", mesocycle.id)
    .eq("day_number", day)
    .eq("week_number", week);

  const savedIds = saved.map(r => r.exercise_id);
  [...select.options].forEach(o => o.selected = savedIds.includes(o.value));

  // Mostrar chips de ejercicios guardados
  saved.forEach(r => {
    const ex = exercises.find(e => e.id === r.exercise_id);
    if (ex) {
      const chip = document.createElement("div");
      chip.className = "exercise-chip";
      chip.textContent = `${ex.name} (${ex.subgroup})`;

      const delBtn = document.createElement("button");
      delBtn.textContent = "×";
      delBtn.onclick = async () => {
        await supabase
          .from("mesocycle_exercises")
          .delete()
          .eq("mesocycle_id", mesocycle.id)
          .eq("day_number", day)
          .eq("week_number", week)
          .eq("exercise_id", ex.id);

        chip.remove();
        const option = [...select.options].find(o => o.value == ex.id);
        if (option) option.selected = false;
      };

      chip.appendChild(delBtn);
      list.appendChild(chip);
    }
  });
}

/* ======================
   SAVE EXERCISES
====================== */
async function saveDayExercises(select, mesocycleId, day, week) {
  // Tomar los ejercicios seleccionados del select
  const values = [...select.selectedOptions].map(o => ({
    mesocycle_id: mesocycleId,
    exercise_id: o.value,
    day_number: day,
    week_number: week
  }));

  // Primero eliminar los ejercicios anteriores de ese día y semana
  await supabase
    .from("mesocycle_exercises")
    .delete()
    .eq("mesocycle_id", mesocycleId)
    .eq("day_number", day)
    .eq("week_number", week);

  // Insertar los nuevos seleccionados
  if (values.length > 0) {
    const { error } = await supabase
      .from("mesocycle_exercises")
      .insert(values);
    if (error) console.error("Error guardando ejercicios:", error);
  }
}

/* ======================
   INIT
====================== */
checkSession();
