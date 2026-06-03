export type SportId = "hockey" | "futbol" | "basquet" | "tenis";

export interface SportDefinition {
  id: SportId;
  name: string;
  description: string;
  /** Marcador disponible en la app */
  available: boolean;
}

export const SPORTS: SportDefinition[] = [
  {
    id: "hockey",
    name: "Hockey Inline",
    description: "Hockey sobre patines en línea — periodos y cronómetro",
    available: true,
  },
  {
    id: "futbol",
    name: "Fútbol",
    description: "Próximamente",
    available: false,
  },
  {
    id: "basquet",
    name: "Básquet",
    description: "Marcador con puntos, faltas y periodos",
    available: true,
  },
  {
    id: "tenis",
    name: "Tenis",
    description: "Próximamente",
    available: false,
  },
];

export const DEFAULT_SPORT_ID: SportId = "hockey";

export function getSportById(id: string | null | undefined): SportDefinition | undefined {
  return SPORTS.find((sport) => sport.id === id);
}

export function isSportId(value: string | null | undefined): value is SportId {
  return SPORTS.some((sport) => sport.id === value);
}

export function resolveSportId(value: string | null | undefined): SportId {
  if (value && isSportId(value)) return value;
  return DEFAULT_SPORT_ID;
}
