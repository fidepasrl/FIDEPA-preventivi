import type { TipoCommessa } from "@/lib/tipiCommesse";

export const PRIORITA_COMMESSA = [
  "Urgente",
  "Alta",
  "Normale",
  "Bassa",
  "Terminato",
] as const;

export type PrioritaCommessa = (typeof PRIORITA_COMMESSA)[number];

export type CommessaElenco = {
  id: string;
  titolo: string;
  codice: string | null;
  descrizione: string | null;
  cliente_id: string | null;
  cliente_nome: string | null;
  posizione: string | null;
  tipo_commessa: TipoCommessa;
  priorita: PrioritaCommessa;
  url: string | null;
  data_inizio: string | null;
  data_fine: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  ultimaNota?: string;
  dataUltimaNota?: string | null;
};

export type FiltriCommesse = {
  priorita: "" | PrioritaCommessa;
  tipo: "" | TipoCommessa;
  posizione: string;
  cliente: string;
  stato: "tutte" | "attive" | "terminate";
};

export type OrdinamentoCommesse =
  | "priorita"
  | "titolo"
  | "codice"
  | "posizione"
  | "tipo"
  | "ultimo_aggiornamento";

export const FILTRI_COMMESSE_INIZIALI: FiltriCommesse = {
  priorita: "",
  tipo: "",
  posizione: "",
  cliente: "",
  stato: "tutte",
};

const indicePriorita = new Map(
  PRIORITA_COMMESSA.map((priorita, indice) => [priorita, indice])
);

function confrontaTesto(a: string | null | undefined, b: string | null | undefined) {
  return (a || "").localeCompare(b || "", "it", { sensitivity: "base" });
}

export function filtraCommesse(
  commesse: CommessaElenco[],
  ricerca: string,
  filtri: FiltriCommesse
) {
  const termine = ricerca.trim().toLocaleLowerCase("it-IT");

  return commesse.filter((commessa) => {
    const testo = [
      commessa.codice,
      commessa.titolo,
      commessa.cliente_nome,
      commessa.posizione,
      commessa.tipo_commessa,
      commessa.priorita,
      commessa.descrizione,
      commessa.ultimaNota,
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("it-IT");

    if (termine && !testo.includes(termine)) return false;
    if (filtri.priorita && commessa.priorita !== filtri.priorita) return false;
    if (filtri.tipo && commessa.tipo_commessa !== filtri.tipo) return false;
    if (filtri.posizione && commessa.posizione !== filtri.posizione) return false;
    if (filtri.cliente && commessa.cliente_nome !== filtri.cliente) return false;
    if (filtri.stato === "attive" && commessa.priorita === "Terminato") return false;
    if (filtri.stato === "terminate" && commessa.priorita !== "Terminato") return false;
    return true;
  });
}

export function ordinaCommesse(
  commesse: CommessaElenco[],
  ordine: OrdinamentoCommesse
) {
  return [...commesse].sort((a, b) => {
    if (ordine === "priorita") {
      const differenza =
        (indicePriorita.get(a.priorita) ?? 99) -
        (indicePriorita.get(b.priorita) ?? 99);
      return differenza || confrontaTesto(a.titolo, b.titolo);
    }
    if (ordine === "titolo") return confrontaTesto(a.titolo, b.titolo);
    if (ordine === "codice") return confrontaTesto(a.codice, b.codice);
    if (ordine === "posizione") return confrontaTesto(a.posizione, b.posizione);
    if (ordine === "tipo") return confrontaTesto(a.tipo_commessa, b.tipo_commessa);

    const dataA = a.dataUltimaNota || a.updated_at || a.created_at || "";
    const dataB = b.dataUltimaNota || b.updated_at || b.created_at || "";
    return dataB.localeCompare(dataA) || confrontaTesto(a.titolo, b.titolo);
  });
}

function valoreCsv(valore: unknown) {
  const testo = String(valore ?? "");
  return `"${testo.replaceAll('"', '""')}"`;
}

export function creaCsvCommesse(commesse: CommessaElenco[]) {
  const intestazioni = [
    "Codice",
    "Titolo",
    "Cliente",
    "Posizione",
    "Tipo commessa",
    "Priorita",
    "Data inizio",
    "Data fine",
    "Descrizione",
  ];
  const righe = commesse.map((commessa) =>
    [
      commessa.codice,
      commessa.titolo,
      commessa.cliente_nome,
      commessa.posizione,
      commessa.tipo_commessa,
      commessa.priorita,
      commessa.data_inizio,
      commessa.data_fine,
      commessa.descrizione,
    ]
      .map(valoreCsv)
      .join(";")
  );
  return `\uFEFF${intestazioni.map(valoreCsv).join(";")}\n${righe.join("\n")}`;
}

function separaRigaCsv(riga: string, separatore: string) {
  const valori: string[] = [];
  let corrente = "";
  let traVirgolette = false;
  for (let indice = 0; indice < riga.length; indice += 1) {
    const carattere = riga[indice];
    if (carattere === '"' && traVirgolette && riga[indice + 1] === '"') {
      corrente += '"';
      indice += 1;
    } else if (carattere === '"') {
      traVirgolette = !traVirgolette;
    } else if (carattere === separatore && !traVirgolette) {
      valori.push(corrente.trim());
      corrente = "";
    } else {
      corrente += carattere;
    }
  }
  valori.push(corrente.trim());
  return valori;
}

function normalizzaIntestazione(valore: string) {
  return valore
    .replace(/^\uFEFF/, "")
    .trim()
    .toLocaleLowerCase("it-IT")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export type RigaImportazioneCommessa = {
  codice: string;
  titolo: string;
  cliente_nome: string;
  posizione: string;
  tipo_commessa: string;
  priorita: string;
  data_inizio: string;
  data_fine: string;
  descrizione: string;
};

export function leggiCsvCommesse(contenuto: string): RigaImportazioneCommessa[] {
  const righe = contenuto.split(/\r?\n/).filter((riga) => riga.trim());
  if (righe.length < 2) return [];
  const separatore = (righe[0].match(/;/g) || []).length >= (righe[0].match(/,/g) || []).length ? ";" : ",";
  const intestazioni = separaRigaCsv(righe[0], separatore).map(normalizzaIntestazione);
  const indice = (nomi: string[]) => intestazioni.findIndex((item) => nomi.includes(item));
  const mappa = {
    codice: indice(["codice"]),
    titolo: indice(["titolo", "commessa"]),
    cliente_nome: indice(["cliente", "committente", "cliente_nome"]),
    posizione: indice(["posizione", "localita"]),
    tipo_commessa: indice(["tipo_commessa", "tipo", "tipologia"]),
    priorita: indice(["priorita"]),
    data_inizio: indice(["data_inizio"]),
    data_fine: indice(["data_fine"]),
    descrizione: indice(["descrizione", "note"]),
  };
  const valore = (campi: string[], posizione: number) =>
    posizione >= 0 ? campi[posizione]?.trim() || "" : "";

  return righe.slice(1).map((riga) => {
    const campi = separaRigaCsv(riga, separatore);
    return {
      codice: valore(campi, mappa.codice),
      titolo: valore(campi, mappa.titolo),
      cliente_nome: valore(campi, mappa.cliente_nome),
      posizione: valore(campi, mappa.posizione),
      tipo_commessa: valore(campi, mappa.tipo_commessa),
      priorita: valore(campi, mappa.priorita),
      data_inizio: valore(campi, mappa.data_inizio),
      data_fine: valore(campi, mappa.data_fine),
      descrizione: valore(campi, mappa.descrizione),
    };
  });
}
