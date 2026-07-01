import { parseImporto } from "@/lib/importi";

export const PRESTAZIONI_GARA = [
  { id: "pfte", label: "PFTE" },
  { id: "progetto_definitivo", label: "Progetto Definitivo" },
  { id: "progetto_esecutivo", label: "Progetto Esecutivo" },
  { id: "csp", label: "CSP" },
  { id: "cse", label: "CSE" },
  { id: "verifica_progetto", label: "Verifica del progetto" },
  { id: "direzione_lavori", label: "Direzione Lavori" },
] as const;

export type LavoroGaraCalcolo = {
  id: string;
  percentuale_prestazione: number | null;
};

export type ImportoCategoriaGara = {
  lavoro_id: string;
  categoria_codice: string;
  importo: number | string;
};

export function fattorePrestazione(percentuale: number | null | undefined) {
  const valore = Number(percentuale || 0);

  if (valore <= 0) return 0;
  if (valore <= 1) return valore;

  return valore / 100;
}

export function percentualeVisibile(percentuale: number | null | undefined) {
  const valore = Number(percentuale || 0);

  if (valore > 0 && valore <= 1) {
    return valore * 100;
  }

  return valore;
}

export function calcolaImportoPrestazione(
  importo: number | string | null | undefined,
  percentuale: number | null | undefined
) {
  return parseImporto(importo) * fattorePrestazione(percentuale);
}

export function aggiungiImportiFidepa<
  T extends { codice: string },
  L extends LavoroGaraCalcolo,
  I extends ImportoCategoriaGara
>(categorie: T[], lavori: L[], importi: I[]) {
  const lavoriById = new Map(lavori.map((lavoro) => [lavoro.id, lavoro]));
  const importiByCategoria = new Map<string, number>();

  for (const riga of importi) {
    const lavoro = lavoriById.get(riga.lavoro_id);
    if (!lavoro) continue;

    const importoCalcolato = calcolaImportoPrestazione(
      riga.importo,
      lavoro.percentuale_prestazione
    );

    importiByCategoria.set(
      riga.categoria_codice,
      (importiByCategoria.get(riga.categoria_codice) || 0) + importoCalcolato
    );
  }

  return categorie.map((categoria) => ({
    ...categoria,
    importo_fidepa: importiByCategoria.get(categoria.codice) || 0,
  }));
}
