// =======================
// SUPABASE
// =======================
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://vhwfenefevzzksxrslkx.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZod2ZlbmVmZXZ6emtzeHJzbGt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MTE3ODAsImV4cCI6MjA4MzQ4Nzc4MH0.CG1KzxpxGHifXsgBvH-4E4WvXbj6d-8WsagqaHAtVwo";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =======================
// DOM
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

// MODAL
const exerciseModal = document.getElementById("exercise-modal");
const modalName = document.getElementById("modal-exercise-name");
const modalWeight = document.getElementById("modal-weight");
const modalReps = document.getElementById("modal-reps");
const saveModalBtn = document.getElementById("save-exercise-log");
const closeModalBtn = document.getElementById("close-modal");
const modalBackdrop = document.querySelector(".modal-backdrop");

// =======================
// STATE
// =======================
let modalContext = null;
let modalOpen = false;

// =======================
// AUTH
// =======================
loginBtn.onclick = async () => {
  const { error } = await supabase.auth.signInWithPassword({
    email: emailInput.value,
    password: passwordInput.value
  });
  if (error) authMessage.textContent = error.message;
};

signupBtn.onclick = async () => {
  const { error } = await supabase.auth.signUp({
    email: emailInput.value,
    password: passwordInput.value
  });
  authMessage.textContent = error ? error.message : "Revisa tu correo";
};

logoutBtn.onclick = async () => {
  await supabase.auth.signOut();
};

supabase.auth.onAuthStateChange((_, session) => {
  session ? showApp() : showLogin();
});

function showLogin() {
  loginView.classList.remove("hidden");
  appView.classList.add("hidden");
}

function showApp() {
  loginView.classList.add("hidden");
  appView.classList.remove("hidden");
  loadMesocycles();
}

// =======================
// REGISTRO
// =======================
async function loadMesocycles() {
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
  registroEditor.innerHTML = "";
  if (registroSelect.value) renderRegistro(registroSelect.value);
};

async function renderRegistro(mesocycleId) {
  const { data: meso } = await supabase
    .from("mesocycles")
    .select("*")
    .eq("id", mesocycleId)
    .single();

  const weekSelect = document.createElement("select");
  for (let i = 1; i <= meso.weeks; i++) {
    weekSelect.innerHTML += `<option value="${i}">Semana ${i}</option>`;
  }

  const daysDiv = document.createElement("div");
  let selectedDay = null;

  for (let i = 1; i <= meso.days_per_week; i++) {
    const btn = document.createElement("button");
    btn.textContent = `Día ${i}`;
    btn.onclick = () => {
      selectedDay = i;
      loadExercises(mesocycleId, weekSelect.value, i);
    };
    daysDiv.appendChild(btn);
  }

  const list = document.createElement("div");
  list.id = "exercise-list";

  registroEditor.append(weekSelect, daysDiv, list);
}

async function loadExercises(mesocycleId, week, day) {
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
      openModal({
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
// MODAL (FIX DEFINITIVO)
// =======================
function openModal(ctx) {
  if (modalOpen) return;

  modalOpen = true;
  modalContext = ctx;

  modalName.textContent = ctx.exerciseName;
  modalWeight.value = "";
  modalReps.value = "";

  exerciseModal.classList.remove("hidden");
}

function closeModal() {
  modalOpen = false;
  modalContext = null;
  exerciseModal.classList.add("hidden");
}

closeModalBtn.onclick = (e) => {
  e.stopPropagation();
  closeModal();
};

modalBackdrop.onclick = () => {
  closeModal();
};

saveModalBtn.onclick = async (e) => {
  e.stopPropagation();

  if (!modalContext) return;

  await supabase.from("exercise_logs").insert({
    mesocycle_id: modalContext.mesocycleId,
    exercise_id: modalContext.exerciseId,
    week_number: modalContext.week,
    day_number: modalContext.day,
    weight: modalWeight.value,
    reps: modalReps.value
  });

  closeModal();
};
