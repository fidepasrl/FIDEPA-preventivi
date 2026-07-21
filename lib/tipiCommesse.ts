export const TIPI_COMMESSA = [
  "Privata",
  "Pubblica",
  "Gara",
  "Concorso",
  "Urbanistica",
  "Pa.Ma",
  "Superbonus",
  "Validazione progetti",
] as const;

export type TipoCommessa = (typeof TIPI_COMMESSA)[number];

export const CODICE_TIPO_COMMESSA: Record<TipoCommessa, string> = {
  Privata: "PRV",
  Pubblica: "PUB",
  Gara: "GAR",
  Concorso: "CON",
  Urbanistica: "URB",
  "Pa.Ma": "PMA",
  Superbonus: "SBN",
  "Validazione progetti": "VAL",
};

export const SIMBOLO_TIPO_COMMESSA: Record<TipoCommessa, string> = {
  Privata: "\u25cf",
  Pubblica: "\u25a0",
  Gara: "\u25b2",
  Concorso: "\u2691",
  Urbanistica: "\u25c6",
  "Pa.Ma": "\u25c7",
  Superbonus: "\u2605",
  "Validazione progetti": "\u2713",
};

export const COLORE_TIPO_COMMESSA: Record<TipoCommessa, string> = {
  Privata: "text-[#D49324]",
  Pubblica: "text-[#2D80B3]",
  Gara: "text-[#2B2F5E]",
  Concorso: "text-[#64B445]",
  Urbanistica: "text-[#5E9AD3]",
  "Pa.Ma": "text-[#D79D06]",
  Superbonus: "text-[#D96F4B]",
  "Validazione progetti": "text-[#4B5563]",
};

export const COLORE_BG_TIPO_COMMESSA: Record<TipoCommessa, string> = {
  Privata: "bg-[#D49324]",
  Pubblica: "bg-[#2D80B3]",
  Gara: "bg-[#2B2F5E]",
  Concorso: "bg-[#64B445]",
  Urbanistica: "bg-[#5E9AD3]",
  "Pa.Ma": "bg-[#D79D06]",
  Superbonus: "bg-[#D96F4B]",
  "Validazione progetti": "bg-[#4B5563]",
};

export function isTipoCommessa(tipo: string | null | undefined): tipo is TipoCommessa {
  return Boolean(tipo && TIPI_COMMESSA.includes(tipo as TipoCommessa));
}

export function getCodiceTipoCommessa(tipo: string | null | undefined) {
  return isTipoCommessa(tipo) ? CODICE_TIPO_COMMESSA[tipo] : "GEN";
}

export function getSimboloTipoCommessa(tipo: string | null | undefined) {
  return isTipoCommessa(tipo) ? SIMBOLO_TIPO_COMMESSA[tipo] : "";
}

export function getColoreBgTipoCommessa(tipo: string | null | undefined) {
  return isTipoCommessa(tipo) ? COLORE_BG_TIPO_COMMESSA[tipo] : "bg-[#2D80B3]";
}
