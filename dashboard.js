
import { supabase } from "./config.js";
import { generateQuotationPDF } from "./pdf.js";

const { data: { session }, error: sessionError } =
  await supabase.auth.getSession();

if (sessionError || !session) {
  window.location.replace("./index.html");
  throw new Error("Sesión no autorizada");
}

document.getElementById("admin-email").textContent =
  session.user.email;

document.getElementById("logout-button")
  .addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.replace("./index.html");
  });

document.getElementById("new-quotation")
  .addEventListener("click", () => {
    window.location.href = "./cotizacion.html";
  });

const list = document.getElementById("quotation-list");
const searchInput = document.getElementById("search-input");

let quotations = [];

function formatCurrency(value) {
  return Number(value).toLocaleString("es-GT", {
    style: "currency",
    currency: "GTQ"
  });
}

function createButton(label, callback) {
  const button = document.createElement("button");

  button.type = "button";
  button.textContent = label;

  button.style.cssText = `
    border: 0;
    background: none;
    cursor: pointer;
    font: inherit;
    color: #111;
    margin-right: 10px;
    padding: 5px 0;
  `;

  button.addEventListener("click", callback);

  return button;
}

function updateStats() {
  document.getElementById("total-count").textContent =
    quotations.length;

  const total = quotations.reduce(
    (sum, item) => sum + Number(item.costo),
    0
  );

  document.getElementById("total-value").textContent =
    formatCurrency(total);
}

function renderQuotations(items) {
  list.replaceChildren();

  if (!items.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");

    td.colSpan = 6;
    td.className = "empty";
    td.textContent = "No se encontraron cotizaciones.";

    tr.appendChild(td);
    list.appendChild(tr);
    return;
  }

  items.forEach(item => {
    const tr = document.createElement("tr");

    [
      item.numero_cotizacion,
      item.nombre_cliente,
      item.nombre_empresa,
      item.fecha,
      formatCurrency(item.costo)
    ].forEach(value => {
      const td = document.createElement("td");
      td.textContent = value;
      tr.appendChild(td);
    });

    const action = document.createElement("td");

    // Editar
    const editButton = createButton("Editar", () => {
      window.location.href =
        "./cotizacion.html?id=" + encodeURIComponent(item.id);
    });

    // Descargar PDF
    const pdfButton = createButton("PDF", async () => {
      pdfButton.disabled = true;
      pdfButton.textContent = "Generando...";

      try {
        await generateQuotationPDF(item.id);
      } catch (error) {
        console.error("Error generando PDF:", error);
        alert("No se pudo generar el PDF.");
      } finally {
        pdfButton.disabled = false;
        pdfButton.textContent = "PDF";
      }
    });

    // Eliminar
    const deleteButton = createButton("Eliminar", async () => {
      const confirmed = window.confirm(
        `¿Eliminar la cotización ${item.numero_cotizacion}?\n\nEsta acción no se puede deshacer.`
      );

      if (!confirmed) return;

      deleteButton.disabled = true;
      deleteButton.textContent = "Eliminando...";

      const { error } = await supabase
        .from("cotizaciones")
        .delete()
        .eq("id", item.id)
        .eq("created_by", session.user.id);

      if (error) {
        console.error("Error eliminando:", error);
        alert("No se pudo eliminar la cotización.");

        deleteButton.disabled = false;
        deleteButton.textContent = "Eliminar";
        return;
      }

      quotations = quotations.filter(
        quotation => quotation.id !== item.id
      );

      updateStats();

      renderQuotations(
        filterQuotations(searchInput.value)
      );
    });

    action.append(
      editButton,
      pdfButton,
      deleteButton
    );

    tr.appendChild(action);
    list.appendChild(tr);
  });
}

function filterQuotations(value) {
  const term = value.toLowerCase().trim();

  return quotations.filter(item =>
    [
      item.numero_cotizacion,
      item.nombre_cliente,
      item.nombre_empresa
    ].some(value =>
      (value || "").toLowerCase().includes(term)
    )
  );
}

async function loadQuotations() {
  list.innerHTML =
    '<tr><td colspan="6" class="empty">Cargando cotizaciones...</td></tr>';

  const { data, error } = await supabase
    .from("cotizaciones")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error cargando:", error);

    list.innerHTML =
      '<tr><td colspan="6" class="empty">No se pudieron cargar los registros.</td></tr>';

    return;
  }

  quotations = data || [];

  updateStats();
  renderQuotations(quotations);
}

searchInput.addEventListener("input", () => {
  renderQuotations(
    filterQuotations(searchInput.value)
  );
});

await loadQuotations();
