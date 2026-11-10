
import { supabase } from "./config.js";

const form = document.getElementById("quotation-form");
const saveButton = document.getElementById("save-button");
const message = document.getElementById("form-message");

const numberInput = document.getElementById("quotation-number");
const dateInput = document.getElementById("quotation-date");
const clientInput = document.getElementById("client-name");
const phoneInput = document.getElementById("client-phone");
const companyInput = document.getElementById("company-name");
const descriptionInput = document.getElementById("description");
const costInput = document.getElementById("cost");

const pageTitle = document.getElementById("page-title");

let currentUser = null;
let editingId = null;
let isSaving = false;

const params = new URLSearchParams(window.location.search);
editingId = params.get("id");

function today() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function showMessage(text, type = "") {
  message.textContent = text;
  message.className = type;
}

function setSavingState(saving) {
  saveButton.disabled = saving;

  saveButton.querySelector("span").textContent = saving
    ? "Guardando..."
    : editingId
      ? "Actualizar cotización"
      : "Guardar cotización";
}

async function loadQuotation() {
  const { data, error } = await supabase
    .from("cotizaciones")
    .select("*")
    .eq("id", editingId)
    .single();

  if (error) throw error;

  numberInput.value = data.numero_cotizacion;
  dateInput.value = data.fecha;
  clientInput.value = data.nombre_cliente;
  phoneInput.value = data.telefono_cliente || "";
  companyInput.value = data.nombre_empresa;
  descriptionInput.value = data.descripcion;
  costInput.value = data.costo;

  pageTitle.textContent = "Editar cotización";

  document.title = "Editar cotización | ADRA";
}

async function initialize() {
  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session) {
    window.location.replace("./index.html");
    return;
  }

  currentUser = data.session.user;

  dateInput.value = today();

  if (editingId) {
    await loadQuotation();
  } else {
    numberInput.value = "Se asignará al guardar";
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentUser || isSaving) return;

  isSaving = true;
  setSavingState(true);
  showMessage("");

  const quotation = {
    nombre_cliente: clientInput.value.trim(),
    telefono_cliente: phoneInput.value.trim() || null,
    nombre_empresa: companyInput.value.trim(),
    descripcion: descriptionInput.value.trim(),
    costo: Number(costInput.value),
    fecha: dateInput.value
  };

  try {
    let result;

    if (editingId) {
      result = await supabase
        .from("cotizaciones")
        .update(quotation)
        .eq("id", editingId)
        .select()
        .single();
    } else {
      result = await supabase
        .from("cotizaciones")
        .insert({
          ...quotation,
          created_by: currentUser.id
        })
        .select()
        .single();
    }

    if (result.error) throw result.error;

    numberInput.value = result.data.numero_cotizacion;

    showMessage(
      editingId
        ? "Cotización actualizada correctamente."
        : "Cotización guardada correctamente.",
      "success"
    );

    saveButton.querySelector("span").textContent = "Guardado ✓";

    setTimeout(() => {
      window.location.href = "./dashboard.html";
    }, 1200);

  } catch (error) {
    console.error("Error guardando cotización:", error);

    showMessage(
      "No se pudo guardar la cotización. Inténtalo nuevamente.",
      "error"
    );

    setSavingState(false);
    isSaving = false;
  }
});

try {
  await initialize();
} catch (error) {
  console.error("Error inicializando formulario:", error);

  showMessage(
    "No se pudo cargar la cotización. Regresa al dashboard e inténtalo nuevamente.",
    "error"
  );
}
