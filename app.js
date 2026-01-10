// =======================
// SUPABASE
// =======================
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://vhwfenefevzzksxrslkx.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZod2ZlbmVmZXZ6emtzeHJzbGt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MTE3ODAsImV4cCI6MjA4MzQ4Nzc4MH0.CG1KzxpxGHifXsgBvH-4E4WvXbj6d-8WsagqaHAtVwo";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =======================
// DOM ELEMENTS
// =======================
const loginView = document.getElementById("login-view");
const appView = document.getElementById("app-view");

const loginBtn = document.getElementById("login-btn");
const signupBtn = document.getElementById("signup-btn");
const logoutBtn = document.getElementById("logout-btn");

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const authMessage = document.getElementById("auth-message");

const registroSelect = document.getElementById("registro-select");
const registroEditor = document.getElementById("registro-editor");

// Modal
const exerciseModal = document.getElementById("exercise-modal");
const modalExerciseName = document.getElementById("modal-exercise-name");
const modalWeight = document.getElementById("modal-weight");
const modalReps = document.getElementById("modal-reps");

// =======================
// GLOBAL STATE
// =======================
let modalContext = null;

// =======================
// AUTH
// =======================
loginBtn.onclick = async () => {
  const { error } = await supabase.auth.signInWithPassword({
    email: emailInput.value,
    password: passwordInput.value
  });

  if (error) {
    authMessage.textContent = error.message;
  }
};

signupBtn.onclick = async () => {
  const { error } = await supabase.auth.signUp({
    email: emailInput.value,
    password: passwordInput.value
  });

  if (error) {
    authMessage.textContent = error.message;
  } else {
    authMessage.textContent = "Revisa tu correo para confirmar";
  }
};

logoutBtn.onclick = async () => {
  await supabase.auth.signOut();
  showLogin();
};

supabase.auth.onAuthStateChange((_, session) => {
  if (session) showApp();
  else showLogin();
});

// =======================
// VIEW CONTROL
// =======================
function showLogin() {
  loginView.classList.remove("hidden");
  appView.classList.add("hidden");
}

async function showApp() {
  loginView.classList.add("hidden");
  appView.classList.remove("hidden");

  setupExerciseModal();
  loadMesocyclesForRegistro();
}

// =======================
// REGISTRO
// =======================
async function loadMesocyclesForRegistro() {
  registroSelect.innerHTML = `<option value="">Selecciona un mesociclo</option>`;

  const { data } = await supabase
    .from("mesocycles")
    .select("id,name")
    .order("created_at", { ascending: false });

  data.forEach(m => {
    const opt = document.createElement("option");
    opt.value = m.id;
    opt.textContent = m.name;
    registroSelect.appendChild(opt);
  });
}

registroSelect.onchange = () => {
  if (registroSelect.value) {
    renderRegistroEditor(registroSelect.value);
  } else {
    registroEditor.innerHTML = "";
  }
};

// =======================
// REGISTRO EDITOR
// =======================
async function renderRegistroEditor(mesocycleId) {
  registroEditor.innerHTML = "";

  const { data: mesocycle } = await supabase
    .from("mesocycles")
    .select("*")
    .eq("id", mesocycleId)
    .single();

  const title = document.createElement("h3");
  title.textContent = `Mesociclo: ${mesocycle.name}`;
  registroEditor.appendChild(title);

  const weekSelect = document.createElement("select");
  for (let i = 1; i <= mesocycle.weeks; i++) {
    weekSelect.innerHTML += `<option value="${i}">Semana ${i}</option>`;
  }
  registroEditor.appendChild(weekSelect);

  const dayContainer = document.createElement("div");
  let selectedDay = null;

  for (let i = 1; i <= mesocycle.days_per_week; i++) {
    const btn = document.createElement("button");
    btn.textContent = `Día ${i}`;
    btn.onclick = () => {
      [...dayContainer.children].forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      selectedDay = i;
      renderRegisteredExercises(mesocycleId, weekSelect.value, selectedDay);
    };
    dayContainer.appendChild(btn);
  }

  registroEditor.appendChild(dayContainer);

  weekSelect.onchange = () => {
    if (selectedDay) {
      renderRegisteredExercises(mesocycleId, weekSelect.value, selectedDay);
    }
  };

  const list = document.createElement("div");
  list.id = "exercise-list";
  registroEditor.appendChild(list);
}

// =======================
// RENDER EXERCISES
// =======================
async function renderRegisteredExercises(mesocycleId, week, day) {
  const list = document.getElementById("exercise-list");
  list.innerHTML = "";

  const { data } = await supabase
    .from("mesocycle_exercises")
    .select("exercise_id, exercises(name)")
    .eq("mesocycle_id", mesocycleId)
    .eq("week_number", week)
    .eq("day_number", day);

  data.forEach(row => {
    const chip = document.createElement("span");
    chip.className = "exercise-chip";
    chip.textContent = row.exercises.name;

    chip.onclick = (e) => {
      e.stopPropagation();
    
      openExerciseModal({
        mesocycleId,
        exerciseId: row.exercise_id,
        exerciseName: row.exercises.name,
        week,
        day
      });
    };

    list.appendChild(chip);
  });
}

// =======================
// MODAL
// =======================
function openExerciseModal(context) {
  if (exerciseModal.classList.contains("hidden") === false) return;

  modalContext = context;

  modalExerciseName.textContent = context.exerciseName;
  modalWeight.value = "";
  modalReps.value = "";

  exerciseModal.classList.remove("hidden");
}

function setupExerciseModal() {
  const saveBtn = document.getElementById("save-exercise-log");
  const closeBtn = document.getElementById("close-modal");

  closeBtn.onclick = () => {
    exerciseModal.classList.add("hidden");
    modalContext = null;
  };  
}

