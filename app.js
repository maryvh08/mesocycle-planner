import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
const SUPABASE_URL = "https://vhwfenefevzzksxrslkx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZod2ZlbmVmZXZ6emtzeHJzbGt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MTE3ODAsImV4cCI6MjA4MzQ4Nzc4MH0.CG1KzxpxGHifXsgBvH-4E4WvXbj6d-8WsagqaHAtVwo";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const loginView = document.getElementById("login-view");
const appView = document.getElementById("app-view");
const message = document.getElementById("auth-message");

document.getElementById("login-btn").onclick = async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  console.log("LOGIN DATA:", data);
  console.log("LOGIN ERROR:", error);

  if (error) {
    message.textContent = error.message;
    return;
  }

  if (data?.session) {
    showApp();
  }
};

document.getElementById("signup-btn").onclick = async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { error } = await supabase.auth.signUp({
    email,
    password
  });

  if (error) {
    message.textContent = error.message;
  } else {
    message.textContent = "Usuario creado. Ahora inicia sesión.";
  }
};

document.getElementById("logout-btn").onclick = async () => {
  await supabase.auth.signOut();
};

async function checkSession() {
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (session) {
    showApp();
  } else {
    showLogin();
  }
}

function showApp() {
  loginView.style.display = "none";
  appView.style.display = "block";
  loadMesocycles();
}

function showLogin() {
  loginView.style.display = "block";
  appView.style.display = "none";
}

supabase.auth.onAuthStateChange((event, session) => {
  if (session) {
    loginView.style.display = "none";
    appView.style.display = "block";
  } else {
    loginView.style.display = "block";
    appView.style.display = "none";
  }
});

// Verifica sesión al cargar la app
checkSession();

const mesocycleList = document.getElementById("mesocycle-list");

document.getElementById("create-mesocycle-btn").onclick = async () => {
  const name = document.getElementById("mesocycle-name").value;
  const weeks = parseInt(document.getElementById("mesocycle-weeks").value);

  if (!name || !weeks) {
    alert("Completa todos los campos");
    return;
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("mesocycles").insert({
    name,
    weeks,
    user_id: user.id
  });

  if (error) {
    alert(error.message);
    return;
  }

  document.getElementById("mesocycle-name").value = "";
  document.getElementById("mesocycle-weeks").value = "";

  loadMesocycles();
};

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
    li.textContent = `${m.name} – ${m.weeks} semanas`;
    mesocycleList.appendChild(li);
  });
}



