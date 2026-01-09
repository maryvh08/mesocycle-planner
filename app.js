import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://vhwfenefevzzksxrslkx.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZod2ZvbWV2dXJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MTE3ODAsImV4cCI6MjA4MzQ4Nzc4MH0.CG1KzxpxGHifXsgBvH-4E4WvXbj6d-8WsagqaHAtVwo";

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
  if (error) message.textContent = error.message;
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
}

function showLogin() {
  loginView.style.display = "block";
  appView.style.display = "none";
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
  const editor = card.querySelector(".editor");

  editBtn.onclick = async () => {
    editor.classList.toggle("hidden");
    if (!editor.innerHTML.trim()) {
      // Crear contenido del editor solo una vez
      await renderCardEditor(editor, mesocycle);
    }
  };
}

async function renderCardEditor(editor, mesocycle) {
  const template = await getTemplateById(mesocycle.template_id);
  const exercises = template.emphasis !== "Todos"
    ? template.emphasis.split(",")
    : [];

  // Crear mini-botones de días
  const dayButtonsDiv = document.createElement("div");
  for (let i = 1; i <= mesocycle.days_per_week; i++) {
    const btn = document.createElement("button");
    btn.textContent = `Día ${i}`;
    btn.className = "day-mini-btn";
    btn.onclick = async () => {
      editor.querySelectorAll(".day-mini-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      await renderExercisesForDay(editor, mesocycle, i, template);
    };
    dayButtonsDiv.appendChild(btn);
  }

  editor.appendChild(dayButtonsDiv);

  // Contenedor de ejercicios
  const exerciseSelect = document.createElement("select");
  exerciseSelect.multiple = true;
  exerciseSelect.size = 10;
  exerciseSelect.style.width = "100%";
  exerciseSelect.className = "exercise-select";

  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Guardar día";
  saveBtn.onclick = async () => {
    const activeDayBtn = editor.querySelector(".day-mini-btn.active");
    if (!activeDayBtn) return alert("Selecciona un día");

    const day = parseInt(activeDayBtn.textContent.replace("Día ", ""));
    await saveDayExercises(exerciseSelect, mesocycle.id, day);

    const hint = editor.querySelector(".day-hint");
    hint.textContent = `Día ${day} guardado ✅`;

    await renderExercisesForDay(editor, mesocycle, day, template);
  };

  const hint = document.createElement("p");
  hint.className = "day-hint";
  hint.textContent = "Selecciona un día para configurar ejercicios";

  const list = document.createElement("ul");
  list.className = "day-exercise-list";

  editor.appendChild(exerciseSelect);
  editor.appendChild(saveBtn);
  editor.appendChild(hint);
  editor.appendChild(list);
}

async function renderExercisesForDay(editor, mesocycle, day, template) {
  const select = editor.querySelector(".exercise-select");
  const list = editor.querySelector(".day-exercise-list");
  select.innerHTML = "";
  list.innerHTML = "";

  // Cargar ejercicios de la plantilla
  let query = supabase.from("exercises").select("id,name,subgroup").order("name");
  if (template.emphasis !== "Todos") {
    query = query.in("subgroup", template.emphasis.split(","));
  }
  const { data: exercises } = await query;

  if (!exercises.length) {
    select.innerHTML = "<option>No hay ejercicios</option>";
    return;
  }

  exercises.forEach(ex => {
    const opt = document.createElement("option");
    opt.value = ex.id;
    opt.textContent = `${ex.name} (${ex.subgroup})`;
    select.appendChild(opt);
  });

  // Seleccionar los ya guardados
  const { data: saved } = await supabase
    .from("mesocycle_exercises")
    .select("exercise_id")
    .eq("mesocycle_id", mesocycle.id)
    .eq("day_number", day);

  const savedIds = saved.map(r => r.exercise_id);
  [...select.options].forEach(o => o.selected = savedIds.includes(o.value));

  // Mostrar lista
  saved.forEach(r => {
    const ex = exercises.find(e => e.id === r.exercise_id);
    if (ex) {
      const li = document.createElement("li");
      li.textContent = `${ex.name} (${ex.subgroup})`;
      list.appendChild(li);
    }
  });
}

async function saveDayExercises(select, mesocycleId, day) {
  const values = [...select.selectedOptions].map(o => ({
    mesocycle_id: mesocycleId,
    exercise_id: o.value,
    day_number: day
  }));

  await supabase
    .from("mesocycle_exercises")
    .delete()
    .eq("mesocycle_id", mesocycleId)
    .eq("day_number", day);

  if (values.length) {
    await supabase.from("mesocycle_exercises").insert(values);
  }
}

/* ======================
   INIT
====================== */
checkSession();
