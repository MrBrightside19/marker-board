/** Normaliza nombre de cancha para URL y almacenamiento (ej. "Cancha 1" → "cancha-1"). */
export function normalizeCourt(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "1";

  const slug = trimmed
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "");

  return slug || "1";
}

export function formatCourtLabel(court: string): string {
  const c = court.trim() || "1";
  return c.charAt(0).toUpperCase() + c.slice(1);
}

export function courtFromRouteParam(param: string | string[] | undefined): string {
  const raw = Array.isArray(param) ? param[0] : param;
  return normalizeCourt(raw ?? "1");
}
