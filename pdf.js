
import { supabase } from "./config.js";
import { jsPDF } from "https://esm.sh/jspdf@2.5.2";

export async function generateQuotationPDF(quotationId) {
  const { data: { session }, error: sessionError } =
    await supabase.auth.getSession();

  if (sessionError || !session) {
    throw new Error("Sesión no autorizada.");
  }

  const { data: quotation, error } = await supabase
    .from("cotizaciones")
    .select("*")
    .eq("id", quotationId)
    .single();

  if (error) throw error;

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const pageWidth = 210;
  const margin = 20;

  // Colores
  const black = [17, 17, 17];
  const gray = [115, 115, 115];
  const light = [235, 235, 235];

  // Fondo
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, pageWidth, 297, "F");

  // Encabezado
  pdf.setTextColor(...black);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(23);
  pdf.text("ADRA", margin, 25);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(...gray);
  pdf.text("DIGITAL BUSINESS SOLUTIONS", margin, 31);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(...black);
  pdf.text("COTIZACIÓN", 190, 23, { align: "right" });

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(...gray);
  pdf.text(quotation.numero_cotizacion, 190, 30, {
    align: "right"
  });

  pdf.setDrawColor(...light);
  pdf.line(margin, 42, 190, 42);

  // Datos generales
  pdf.setTextColor(...gray);
  pdf.setFontSize(8);
  pdf.text("PREPARADO PARA", margin, 56);
  pdf.text("FECHA DE EMISIÓN", 125, 56);

  pdf.setTextColor(...black);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.text(quotation.nombre_cliente, margin, 64);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text(quotation.nombre_empresa, margin, 71);

  if (quotation.telefono_cliente) {
    pdf.setTextColor(...gray);
    pdf.setFontSize(9);
    pdf.text(quotation.telefono_cliente, margin, 78);
  }

  pdf.setTextColor(...black);
  pdf.setFontSize(10);
  pdf.text(quotation.fecha, 125, 64);

  // Línea de separación
  pdf.setDrawColor(...light);
  pdf.line(margin, 94, 190, 94);

  // Descripción
  pdf.setTextColor(...gray);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.text("DESCRIPCIÓN DEL SERVICIO", margin, 108);

  pdf.setTextColor(...black);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);

  const description = pdf.splitTextToSize(
    quotation.descripcion,
    170
  );

  pdf.text(description, margin, 119);

  // Precio
  const descriptionHeight = description.length * 5;
  const priceY = Math.max(155, 119 + descriptionHeight + 25);

  pdf.setDrawColor(...light);
  pdf.line(margin, priceY, 190, priceY);

  pdf.setTextColor(...gray);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.text("INVERSIÓN TOTAL", margin, priceY + 15);

  pdf.setTextColor(...black);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(22);

  const total = Number(quotation.costo).toLocaleString("es-GT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  pdf.text(`Q ${total}`, 190, priceY + 27, {
    align: "right"
  });

  // Pie de página
  pdf.setDrawColor(...light);
  pdf.line(margin, 265, 190, 265);

  pdf.setTextColor(...gray);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);

  pdf.text("ADRA DIGITAL", margin, 275);
  pdf.text("PROPUESTA COMERCIAL", 190, 275, {
    align: "right"
  });

  pdf.setFontSize(7);
  pdf.text(
    "Documento generado digitalmente.",
    margin,
    282
  );

  // Descarga
  pdf.save(`${quotation.numero_cotizacion}.pdf`);

  return quotation;
}
