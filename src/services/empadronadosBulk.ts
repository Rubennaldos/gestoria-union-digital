import * as XLSX from "xlsx";
import { getEmpadronados, updateEmpadronado } from "@/services/empadronados";

/** util: timestamp -> YYYY-MM-DD */
const tsToISO = (ts?: number) => {
  if (!ts && ts !== 0) return "";
  const d = new Date(ts);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

/** util: normaliza "DD/MM/YYYY" o fechas Excel a YYYY-MM-DD */
const normalizeToISO = (v: any): string | null => {
  if (v === undefined || v === null || v === "") return null;

  // 1) Número excel (serial)
  if (typeof v === "number") {
    // Excel epoch 1899-12-30
    const jsDate = new Date(Math.round((v - 25569) * 86400 * 1000));
    if (isNaN(jsDate.getTime())) return null;
    const yyyy = jsDate.getFullYear();
    const mm = String(jsDate.getMonth() + 1).padStart(2, "0");
    const dd = String(jsDate.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  const s = String(v).trim();
  if (!s) return null;

  // 2) ISO ya válido
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // 3) DD/MM/YYYY
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;

  // 4) Intento con Date()
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  return null;
};

const isoToTs = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).getTime();
};

/** EXPORTA: crea Excel con 2 hojas: Datos + Instrucciones */
export async function exportEmpadronadosTemplateXLSX() {
  const rows = await getEmpadronados();

  // --- Hoja "Datos" ---
  const data = [
    [
      "id",
      "numeroPadron",
      "nombreCompleto",
      "dni",
      "fechaIngreso (YYYY-MM-DD o DD/MM/YYYY)",
    ],
    ...rows.map((e) => [
      e.id,
      e.numeroPadron ?? "",
      `${e?.nombre ?? ""} ${e?.apellidos ?? ""}`.trim(),
      e.dni ?? "",
      tsToISO(e.fechaIngreso),
    ]),
  ];

  const wsDatos = XLSX.utils.aoa_to_sheet(data);
  wsDatos["!cols"] = [
    { wch: 26 },
    { wch: 16 },
    { wch: 36 },
    { wch: 14 },
    { wch: 30 },
  ];
  // encabezado congelado
  (wsDatos["!freeze"] as any) = { xSplit: 0, ySplit: 1 };

  // --- Hoja "Instrucciones" ---
  const instrucciones = [
    ["INSTRUCCIONES"],
    [""],
    ["1) Edite solo las columnas DNI y fechaIngreso en la hoja 'Datos'."],
    ["   - Acepte cualquiera de estos formatos de fecha:"],
    ["     • YYYY-MM-DD   (ej. 2025-01-10)"],
    ["     • DD/MM/YYYY   (ej. 10/01/2025)"],
    [""],
    ["2) NO cambie, borre ni reordene la columna 'id'."],
    ["   Ese identificador es el que usaremos para actualizar cada registro."],
    [""],
    ["3) Puede dejar una celda vacía si no desea cambiar ese campo."],
    [""],
    ["4) Guarde el archivo y use el botón 'Importar cambios (Excel)' en la vista del Padrón."],
    [""],
    ["Notas:"],
    [
      "- Si una fila tiene 'fechaIngreso' con formato inválido, esa fila se omite y se reporta el error.",
    ],
    [
      "- 'fechaIngreso' se guarda como timestamp (ms) internamente, pero aquí edítela como fecha.",
    ],
  ];
  const wsInfo = XLSX.utils.aoa_to_sheet(instrucciones);
  wsInfo["!cols"] = [{ wch: 120 }];

  // --- Libro y descarga ---
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsDatos, "Datos");
  XLSX.utils.book_append_sheet(wb, wsInfo, "Instrucciones");

  XLSX.writeFile(wb, "empadronados_plantilla.xlsx");
}

/** IMPORTA: lee 'Datos' y actualiza por id las columnas dni/fechaIngreso */
export async function importEmpadronadosXLSX(file: File, actorUid: string) {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });

  const ws = wb.Sheets["Datos"] || wb.Sheets[wb.SheetNames[0]];
  if (!ws) throw new Error("No se encontró la hoja 'Datos'.");

  type Row = {
    id?: any;
    numeroPadron?: any;
    nombreCompleto?: any;
    dni?: any;
    ["fechaIngreso (YYYY-MM-DD o DD/MM/YYYY)"]?: any;
    fechaIngreso?: any; // por si alguien renombra
  };

  const json: Row[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

  let ok = 0,
    fail = 0;
  const errors: string[] = [];

  for (let i = 0; i < json.length; i++) {
    const r = json[i];
    const id = String(r.id || "").trim();
    if (!id) {
      fail++;
      errors.push(`Fila ${i + 2}: falta 'id'.`);
      continue;
    }

    const rawDni = (r.dni ?? "").toString().trim();
    const rawFecha =
      r["fechaIngreso (YYYY-MM-DD o DD/MM/YYYY)"] ?? r["fechaIngreso"] ?? "";

    const updates: any = {};
    if (rawDni !== "") updates.dni = rawDni;

    if (rawFecha !== "") {
      const iso = normalizeToISO(rawFecha);
      if (!iso) {
        fail++;
        errors.push(
          `Fila ${i + 2}: 'fechaIngreso' inválida ("${rawFecha}"). Use YYYY-MM-DD o DD/MM/YYYY.`
        );
        continue;
      }
      updates.fechaIngreso = isoToTs(iso);
    }

    if (Object.keys(updates).length === 0) continue;

    try {
      const okUpd = await updateEmpadronado(id, updates, actorUid);
      if (okUpd) ok++;
      else {
        fail++;
        errors.push(`Fila ${i + 2}: no se pudo actualizar id=${id}.`);
      }
    } catch (e: any) {
      fail++;
      errors.push(`Fila ${i + 2}: ${e?.message ?? "error desconocido"}`);
    }
  }

  return { ok, fail, errors };
}
