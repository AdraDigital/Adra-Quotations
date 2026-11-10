import { supabase } from "./config.js";

const form = document.getElementById("login-form");
const button = document.getElementById("login-button");
const error = document.getElementById("login-error");

let isLoggingIn = false;

// Comprobar si ya existe una sesión
async function checkSession() {
  const { data, error: sessionError } =
    await supabase.auth.getSession();

  if (sessionError) {
    console.error(sessionError);
    return;
  }

  if (data.session) {
    window.location.replace("./dashboard.html");
  }
}

checkSession();

// Iniciar sesión
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (isLoggingIn) return;
  isLoggingIn = true;

  error.textContent = "";
  button.disabled = true;
  button.querySelector("span").textContent = "Verificando...";

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    const { data, error: loginError } =
      await supabase.auth.signInWithPassword({
        email,
        password
      });

    if (loginError) throw loginError;

    if (!data.session) {
      throw new Error("No se pudo establecer la sesión.");
    }

    // Verificar que la sesión esté disponible
    const { data: verification, error: verificationError } =
      await supabase.auth.getSession();

    if (verificationError || !verification.session) {
      throw new Error("No se pudo verificar la sesión.");
    }

    window.location.replace("./dashboard.html");

  } catch (err) {
    console.error("Error de acceso:", err);

    error.textContent =
      "No se pudo iniciar sesión. Verifica tus credenciales.";

    button.disabled = false;
    button.querySelector("span").textContent = "Iniciar sesión";
    isLoggingIn = false;
  }
});
