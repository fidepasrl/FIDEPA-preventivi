export const RUOLI_ORGANIGRAMMA = [
  "amministratore",
  "project_manager",
  "collaboratore",
] as const;

export type RuoloOrganigramma = (typeof RUOLI_ORGANIGRAMMA)[number];

export function normalizzaRuoloOrganigramma(
  value: string | null | undefined
): RuoloOrganigramma {
  return RUOLI_ORGANIGRAMMA.includes(value as RuoloOrganigramma)
    ? (value as RuoloOrganigramma)
    : "collaboratore";
}

export function inizialiPersona(nome: string) {
  const parti = nome
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  return parti.map((parte) => parte[0]?.toLocaleUpperCase("it-IT") || "").join("");
}
