import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

/* ======================
   SUPABASE
====================== */
const SUPABASE_URL = "https://vhwfenefevzzksxrslkx.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZod2ZlbmVmZXZ6emtzeHJzbGt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MTE3ODAsImV4cCI6MjA4MzQ4Nzc4MH0.CG1KzxpxGHifXsgBvH-4E4WvXbj6d-8WsagqaHAtVwo";


const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ======================
   AUTH UI
====================== */
const loginView = document.getElementById("login-view");
const appView = document.getElementById("app-view");
const message = document.getElementById("auth-message");

/* ======================
   LOGIN / SIGNUP / LOGOUT
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
  message.textContent = error
    ? error.message
    : "Usuario creado. Inicia sesión.";
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
   VIEWS
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
   TEMPLATES
====================== */
const templateSelect = document.getElementById("template-select");

async function loadTemplates() {
  const { data, error } = await supabase
    .from("templates")
    .select("*")
    .order("name");

  if (error) return console.error(error);

  templateSelect.innerHTML =
    '<option value="">Selecciona una plantilla</option>';

  data.forEach(t => {
    const opt = document.createElement("option");
    opt.value = t.id;
    opt.textContent = t.name;
    templateSelect.appendChild(opt);
  });
}

/* ======================
   CREATE MESOCYCLE
====================== */
let selectedDays = null;

document.querySelectorAll(".day-btn").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".day-btn")
      .forEach(b => b.classList.remove("active"));
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
   MESOCYCLES LIST
====================== */
const mesocycleList = document.getElementById("mesocycle-list");

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

      <section class="editor hidden">
        <label>Día</label>
        <select class="day-select"></select>

        <label>Ejercicios</label>
        <select class="exercise-select" multiple></select>

        <button class="save-day-btn">Guardar día</button>
        <p class="day-hint"></p>

        <h4>Ejercicios del día</h4>
        <ul class="day-exercise-list"></ul>
      </section>
    `;

    mesocycleList.appendChild(li);
    setupMesocycleEditor(li, m);
  });
}

/* ======================
   MESOCYCLE CARD LOGIC
====================== */
function setupMesocycleEditor(card, mesocycle) {
  const editBtn = card.querySelector(".edit-btn");
  const editor = card.querySelector(".editor");
  const daySelect = card.querySelector(".day-select");
  const exerciseSelect = card.querySelector(".exercise-select");
  const saveBtn = card.querySelector(".save-day-btn");
  const hint = card.querySelector(".day-hint");
  const list = card.querySelector(".day-exercise-list");

  editBtn.onclick = () => {
    editor.classList.toggle("hidden");
    loadDaysForCard(daySelect, mesocycle.days_per_week);
  };

  daySelect.onchange = async () => {
    const day = parseInt(daySelect.value);
    if (!day) return;

    const template = await getTemplateById(mesocycle.template_id);
    await renderExerciseSelectorForCard(exerciseSelect, template);
    await loadSelectedExercises(exerciseSelect, mesocycle.id, day);
    await renderDayExercises(list, mesocycle.id, day);
  };

  saveBtn.onclick = async () => {
    const day = parseInt(daySelect.value);
    if (!day) return;

    await saveDayExercises(exerciseSelect, mesocycle.id, day);
    hint.textContent = `Día ${day} guardado ✅`;
    await renderDayExercises(list, mesocycle.id, day);
  };
}

/* ======================
   HELPERS
====================== */
function loadDaysForCard(select, totalDays) {
  select.innerHTML = `<option value="">Selecciona un día</option>`;
  for (let i = 1; i <= totalDays; i++) {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = `Día ${i}`;
    select.appendChild(opt);
  }
}

async function getTemplateById(id) {
  const { data } = await supabase
    .from("templates")
    .select("*")
    .eq("id", id)
    .single();
  return data;
}

async function renderExerciseSelectorForCard(select, template) {
  select.innerHTML = "";

  let query = supabase.from("exercises").select("id,name,subgroup").order("name");

  if (template.emphasis !== "Todos") {
    query = query.in("subgroup", template.emphasis.split(","));
  }

  const { data } = await query;

  if (!data.length) {
    select.innerHTML = `<option>No hay ejercicios</option>`;
    return;
  }

  data.forEach(ex => {
    const opt = document.createElement("option");
    opt.value = ex.id;
    opt.textContent = `${ex.name} (${ex.subgroup})`;
    select.appendChild(opt);
  });
}

async function loadSelectedExercises(select, mesocycleId, day) {
  const { data } = await supabase
    .from("mesocycle_exercises")
    .select("exercise_id")
    .eq("mesocycle_id", mesocycleId)
    .eq("day_number", day);

  const selected = data.map(r => r.exercise_id);
  [...select.options].forEach(o => {
    o.selected = selected.includes(o.value);
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

async function renderDayExercises(list, mesocycleId, day) {
  list.innerHTML = "";

  const { data } = await supabase
    .from("mesocycle_exercises")
    .select("exercises(name)")
    .eq("mesocycle_id", mesocycleId)
    .eq("day_number", day);

  if (!data.length) {
    list.innerHTML = "<li>No hay ejercicios</li>";
    return;
  }

  data.forEach(r => {
    const li = document.createElement("li");
    li.textContent = r.exercises.name;
    list.appendChild(li);
  });
}

/* ======================
   INIT
====================== */
checkSession();
