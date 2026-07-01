// Ordine Tavola Z-1, DM 143/2013, Allegato, prime tre pagine.
export const ORDINE_CATEGORIE_GARA = [
  "E.01",
  "E.02",
  "E.03",
  "E.04",
  "E.05",
  "E.06",
  "E.07",
  "E.08",
  "E.09",
  "E.10",
  "E.11",
  "E.12",
  "E.13",
  "E.14",
  "E.15",
  "E.16",
  "E.17",
  "E.18",
  "E.19",
  "E.20",
  "E.21",
  "E.22",
  "S.01",
  "S.02",
  "S.03",
  "S.04",
  "S.05",
  "S.06",
  "IA.01",
  "IA.02",
  "IA.03",
  "IA.04",
  "IB.04",
  "IB.05",
  "IB.06",
  "IB.07",
  "IB.08",
  "IB.09",
  "IB.10",
  "IB.11",
  "IB.12",
  "V.01",
  "V.02",
  "V.03",
  "D.01",
  "D.02",
  "D.03",
  "D.04",
  "D.05",
  "T.01",
  "T.02",
  "T.03",
  "P.01",
  "P.02",
  "P.03",
  "P.04",
  "P.05",
  "P.06",
  "U.01",
  "U.02",
  "U.03",
] as const;

const indiceCategorieGara = new Map<string, number>(
  ORDINE_CATEGORIE_GARA.map((codice, indice) => [codice, indice])
);

export function ordinaCategorieGara<T extends { codice: string }>(
  categorie: T[]
) {
  return [...categorie].sort((a, b) => {
    const ordineA = indiceCategorieGara.get(a.codice) ?? 9999;
    const ordineB = indiceCategorieGara.get(b.codice) ?? 9999;

    if (ordineA !== ordineB) return ordineA - ordineB;

    return a.codice.localeCompare(b.codice, "it-IT", {
      numeric: true,
      sensitivity: "base",
    });
  });
}
