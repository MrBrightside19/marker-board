import type { TournamentMatchImportRow } from "../types/tournament";

export const TOURNAMENT_CSV_TEMPLATE_FILE = "plantilla-partidos-torneo.csv";

/** URL publica de la plantilla (archivo en /public) */
export function getTournamentTemplateUrl(): string {
  const base = import.meta.env.BASE_URL.endsWith("/")
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;
  return `${base}${TOURNAMENT_CSV_TEMPLATE_FILE}`;
}

function detectDelimiter(headerLine: string): "," | ";" {
  const commas = (headerLine.match(/,/g) || []).length;
  const semicolons = (headerLine.match(/;/g) || []).length;
  return semicolons > commas ? ";" : ",";
}

function splitLine(line: string, delimiter: "," | ";"): string[] {
  return line.split(delimiter).map((cell) => cell.trim().replace(/^"|"$/g, ""));
}

function normalizeTimeGame(raw: string): string {
  const value = raw.trim();
  if (!value) {
    throw new Error("tiempo_juego es obligatorio (ej. 20:00, 15:00)");
  }

  if (/^\d{1,2}:\d{2}$/.test(value)) {
    const [m, s] = value.split(":").map(Number);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  if (/^\d{1,2}$/.test(value)) {
    return `${String(Number(value)).padStart(2, "0")}:00`;
  }

  throw new Error(`Tiempo invalido "${raw}" (usa mm:ss, ej. 20:00)`);
}

function parseScheduledAt(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;

  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Fecha invalida "${raw}" (usa yyyy-MM-dd HH:mm)`);
  }
  return date.toISOString();
}

function mapHeaderIndex(headers: string[]): Record<string, number> {
  const index: Record<string, number> = {};
  headers.forEach((header, i) => {
    const key = header
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .replace(/\s+/g, "_");
    index[key] = i;
  });
  return index;
}

function pickCell(cells: string[], index: Record<string, number>, keys: string[]): string {
  for (const key of keys) {
    if (index[key] !== undefined) {
      return cells[index[key]] ?? "";
    }
  }
  return "";
}

export function parseTournamentCsv(content: string): {
  rows: TournamentMatchImportRow[];
  errors: { line: number; message: string }[];
} {
  const lines = content
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const errors: { line: number; message: string }[] = [];
  const rows: TournamentMatchImportRow[] = [];

  if (lines.length < 2) {
    return {
      rows: [],
      errors: [{ line: 1, message: "El archivo debe incluir encabezado y al menos un partido." }],
    };
  }

  const delimiter = detectDelimiter(lines[0]);
  const headerIndex = mapHeaderIndex(splitLine(lines[0], delimiter));

  const hasLocal =
    headerIndex.local !== undefined ||
    headerIndex.equipo_local !== undefined ||
    headerIndex.local_team !== undefined;
  const hasVisit =
    headerIndex.visita !== undefined ||
    headerIndex.visitante !== undefined ||
    headerIndex.equipo_visita !== undefined;
  const hasTime =
    headerIndex.tiempo_juego !== undefined ||
    headerIndex.tiempo !== undefined ||
    headerIndex.time_game !== undefined;

  if (!hasLocal || !hasVisit || !hasTime) {
    return {
      rows: [],
      errors: [
        {
          line: 1,
          message:
            "Encabezado invalido. Columnas requeridas: local, visita, tiempo_juego (opcional: fecha_programada)",
        },
      ],
    };
  }

  for (let i = 1; i < lines.length; i++) {
    const lineNumber = i + 1;
    const cells = splitLine(lines[i], delimiter);

    try {
      const localTeam = pickCell(cells, headerIndex, [
        "local",
        "equipo_local",
        "local_team",
        "team_local",
      ]);
      const visitTeam = pickCell(cells, headerIndex, [
        "visita",
        "visitante",
        "equipo_visita",
        "visit_team",
        "team_visita",
      ]);
      const timeRaw = pickCell(cells, headerIndex, [
        "tiempo_juego",
        "tiempo",
        "time_game",
        "duracion",
      ]);
      const dateRaw = pickCell(cells, headerIndex, [
        "fecha_programada",
        "fecha_hora",
        "scheduled_at",
        "fecha",
      ]);

      if (!localTeam || !visitTeam) {
        throw new Error("local y visita son obligatorios.");
      }

      rows.push({
        localTeam,
        visitTeam,
        timeGame: normalizeTimeGame(timeRaw),
        scheduledAt: parseScheduledAt(dateRaw),
        lineNumber,
      });
    } catch (error) {
      errors.push({
        line: lineNumber,
        message: error instanceof Error ? error.message : "Fila invalida",
      });
    }
  }

  return { rows, errors };
}
