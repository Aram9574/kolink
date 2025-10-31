import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import Papa from "papaparse";

export type ExportFormat = "json" | "csv" | "pdf";

export interface ExportData {
  posts?: Array<{
    id: string;
    prompt: string;
    generated_text: string;
    created_at: string;
    viral_score?: number;
  }>;
  profile?: {
    email: string;
    plan: string;
    credits: number;
    full_name?: string;
    created_at: string;
  };
  stats?: {
    total_posts: number;
    average_viral_score: number;
    posts_this_month: number;
  };
}

/**
 * Exports data as JSON file
 */
export function exportAsJSON(data: ExportData, filename: string = "kolink-data"): void {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  downloadBlob(blob, `${filename}.json`);
}

/**
 * Exports data as CSV file
 */
export function exportAsCSV(data: ExportData, filename: string = "kolink-data"): void {
  // Prepare posts data for CSV
  if (data.posts && data.posts.length > 0) {
    const postsData = data.posts.map((post) => ({
      ID: post.id,
      "Fecha de Creación": new Date(post.created_at).toLocaleString("es-ES"),
      "Prompt": post.prompt,
      "Contenido Generado": post.generated_text,
      "Viral Score": post.viral_score || "N/A",
    }));

    const csv = Papa.unparse(postsData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    downloadBlob(blob, `${filename}-posts.csv`);
  }

  // Export profile data separately if available
  if (data.profile) {
    const profileData = [
      {
        "Email": data.profile.email,
        "Plan": data.profile.plan,
        "Créditos": data.profile.credits,
        "Nombre": data.profile.full_name || "N/A",
        "Fecha de Registro": new Date(data.profile.created_at).toLocaleString("es-ES"),
      },
    ];

    const csv = Papa.unparse(profileData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    downloadBlob(blob, `${filename}-profile.csv`);
  }

  // Export stats if available
  if (data.stats) {
    const statsData = [
      {
        "Total de Posts": data.stats.total_posts,
        "Viral Score Promedio": data.stats.average_viral_score,
        "Posts Este Mes": data.stats.posts_this_month,
      },
    ];

    const csv = Papa.unparse(statsData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    downloadBlob(blob, `${filename}-stats.csv`);
  }
}

/**
 * Exports data as PDF file
 */
export function exportAsPDF(data: ExportData, filename: string = "kolink-data"): void {
  const doc = new jsPDF();
  let yPosition = 20;

  // Add title
  doc.setFontSize(20);
  doc.text("Kolink - Exportación de Datos", 20, yPosition);
  yPosition += 10;

  // Add date
  doc.setFontSize(10);
  doc.setTextColor(128);
  doc.text(`Fecha de exportación: ${new Date().toLocaleString("es-ES")}`, 20, yPosition);
  yPosition += 15;

  // Add profile information
  if (data.profile) {
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text("Información de Perfil", 20, yPosition);
    yPosition += 8;

    doc.setFontSize(10);
    doc.text(`Email: ${data.profile.email}`, 20, yPosition);
    yPosition += 6;
    doc.text(`Plan: ${data.profile.plan}`, 20, yPosition);
    yPosition += 6;
    doc.text(`Créditos: ${data.profile.credits}`, 20, yPosition);
    yPosition += 6;
    if (data.profile.full_name) {
      doc.text(`Nombre: ${data.profile.full_name}`, 20, yPosition);
      yPosition += 6;
    }
    doc.text(
      `Fecha de registro: ${new Date(data.profile.created_at).toLocaleString("es-ES")}`,
      20,
      yPosition
    );
    yPosition += 15;
  }

  // Add stats
  if (data.stats) {
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text("Estadísticas", 20, yPosition);
    yPosition += 8;

    doc.setFontSize(10);
    doc.text(`Total de Posts: ${data.stats.total_posts}`, 20, yPosition);
    yPosition += 6;
    doc.text(`Viral Score Promedio: ${data.stats.average_viral_score.toFixed(1)}`, 20, yPosition);
    yPosition += 6;
    doc.text(`Posts Este Mes: ${data.stats.posts_this_month}`, 20, yPosition);
    yPosition += 15;
  }

  // Add posts table
  if (data.posts && data.posts.length > 0) {
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text("Historial de Posts", 20, yPosition);
    yPosition += 10;

    const tableData = data.posts.map((post) => [
      new Date(post.created_at).toLocaleDateString("es-ES"),
      post.prompt.substring(0, 50) + (post.prompt.length > 50 ? "..." : ""),
      post.generated_text.substring(0, 100) + (post.generated_text.length > 100 ? "..." : ""),
      post.viral_score?.toFixed(0) || "N/A",
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [["Fecha", "Prompt", "Contenido", "Score"]],
      body: tableData,
      theme: "striped",
      headStyles: { fillColor: [37, 99, 235] },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 50 },
        2: { cellWidth: 90 },
        3: { cellWidth: 20 },
      },
    });
  }

  // Save the PDF
  doc.save(`${filename}.pdf`);
}

/**
 * Helper function to download a blob as a file
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Main export function that handles all formats
 */
export async function exportData(
  data: ExportData,
  format: ExportFormat,
  filename: string = "kolink-data"
): Promise<void> {
  try {
    switch (format) {
      case "json":
        exportAsJSON(data, filename);
        break;
      case "csv":
        exportAsCSV(data, filename);
        break;
      case "pdf":
        exportAsPDF(data, filename);
        break;
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  } catch (error) {
    console.error("Error exporting data:", error);
    throw new Error(`Failed to export data as ${format}`);
  }
}
