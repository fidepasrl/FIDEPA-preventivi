import type {
  FiltriProfessionisti,
  OrdinamentoProfessionisti,
  Professionista,
  ProfessionistaForm,
} from "./types";

export function professionistaToForm(
  professionista: Professionista
): ProfessionistaForm {
  return {
    nome: professionista.nome || "",
    cognome: professionista.cognome || "",
    professione: professionista.professione || "",
    data_nascita: professionista.data_nascita || "",
    luogo_nascita: professionista.luogo_nascita || "",
    codice_fiscale: professionista.codice_fiscale || "",
    residenza: professionista.residenza || "",
    domicilio_fiscale: professionista.domicilio_fiscale || "",
    albo: professionista.albo || "",
    provincia: professionista.provincia || "",
    sezione: professionista.sezione || "",
    numero: professionista.numero || "",
    prima_iscrizione: professionista.prima_iscrizione || "",
    partita_iva: professionista.partita_iva || "",
    pec: professionista.pec || "",
    abilitazioni: professionista.abilitazioni || "",
  };
}

export function formattaDataProfessionista(value: string | null | undefined) {
  if (!value) return "—";
  const [anno, mese, giorno] = value.slice(0, 10).split("-");
  return anno && mese && giorno ? `${giorno}/${mese}/${anno}` : "—";
}

export function inizialiProfessionista(
  nome: string | null,
  cognome: string | null
) {
  return `${nome?.charAt(0) || ""}${cognome?.charAt(0) || ""}`.toUpperCase() || "P";
}

export function filtraProfessionisti(
  professionisti: Professionista[],
  ricerca: string,
  filtri: FiltriProfessionisti
) {
  const termine = ricerca.trim().toLocaleLowerCase("it-IT");

  return professionisti.filter((item) => {
    const testo = [
      item.nome,
      item.cognome,
      item.professione,
      item.codice_fiscale,
      item.partita_iva,
      item.pec,
      item.albo,
      item.provincia,
      item.sezione,
      item.numero,
      item.residenza,
      item.domicilio_fiscale,
      item.luogo_nascita,
      item.abilitazioni,
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("it-IT");

    if (termine && !testo.includes(termine)) return false;
    if (filtri.professione && item.professione !== filtri.professione)
      return false;
    if (filtri.albo && item.albo !== filtri.albo) return false;
    if (filtri.provincia && item.provincia !== filtri.provincia) return false;
    if (filtri.sezione && item.sezione !== filtri.sezione) return false;
    if (filtri.pec === "presente" && !item.pec) return false;
    if (filtri.pec === "assente" && item.pec) return false;
    if (filtri.partita_iva === "presente" && !item.partita_iva) return false;
    if (filtri.partita_iva === "assente" && item.partita_iva) return false;
    if (filtri.abilitazioni === "presente" && !item.abilitazioni) return false;
    if (filtri.abilitazioni === "assente" && item.abilitazioni) return false;
    return true;
  });
}

export function ordinaProfessionisti(
  professionisti: Professionista[],
  ordine: OrdinamentoProfessionisti
) {
  const collator = new Intl.Collator("it", {
    numeric: true,
    sensitivity: "base",
  });

  return [...professionisti].sort((a, b) => {
    if (ordine === "prima_iscrizione") {
      return String(b.prima_iscrizione || "").localeCompare(
        String(a.prima_iscrizione || "")
      );
    }
    if (ordine === "nome") {
      return collator.compare(
        `${a.nome || ""} ${a.cognome || ""}`,
        `${b.nome || ""} ${b.cognome || ""}`
      );
    }
    if (ordine === "professione") {
      return (
        collator.compare(a.professione || "", b.professione || "") ||
        collator.compare(a.cognome || "", b.cognome || "")
      );
    }
    if (ordine === "provincia") {
      return (
        collator.compare(a.provincia || "", b.provincia || "") ||
        collator.compare(a.cognome || "", b.cognome || "")
      );
    }
    return collator.compare(
      `${a.cognome || ""} ${a.nome || ""}`,
      `${b.cognome || ""} ${b.nome || ""}`
    );
  });
}

function csvCell(value: string | null | undefined) {
  return `"${String(value || "").replace(/"/g, '""')}"`;
}

const CSV_COLUMNS: Array<[string, keyof ProfessionistaForm]> = [
  ["Nome", "nome"],
  ["Cognome", "cognome"],
  ["Professione", "professione"],
  ["Data nascita", "data_nascita"],
  ["Luogo nascita", "luogo_nascita"],
  ["Codice fiscale", "codice_fiscale"],
  ["Residenza", "residenza"],
  ["Domicilio fiscale", "domicilio_fiscale"],
  ["Albo", "albo"],
  ["Provincia", "provincia"],
  ["Sezione", "sezione"],
  ["Numero", "numero"],
  ["Prima iscrizione", "prima_iscrizione"],
  ["Partita IVA", "partita_iva"],
  ["PEC", "pec"],
  ["Abilitazioni", "abilitazioni"],
];

export function esportaProfessionistiCsv(professionisti: Professionista[]) {
  const righe = professionisti.map((item) =>
    CSV_COLUMNS.map(([, campo]) => csvCell(item[campo]))
  );
  const contenuto = [
    CSV_COLUMNS.map(([label]) => csvCell(label)),
    ...righe,
  ]
    .map((riga) => riga.join(","))
    .join("\r\n");
  const blob = new Blob(["\uFEFF", contenuto], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `rubrica-professionisti-${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function normalizzaIntestazione(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("it-IT")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function normalizzaDataCsv(value: string) {
  const pulito = value.trim();
  const italiana = pulito.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (italiana) {
    return `${italiana[3]}-${italiana[2].padStart(2, "0")}-${italiana[1].padStart(2, "0")}`;
  }
  return /^\d{4}-\d{2}-\d{2}$/.test(pulito) ? pulito : "";
}

export function leggiCsvProfessionisti(testo: string) {
  const righe = testo
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((riga) => riga.trim());
  if (righe.length < 2) return [];
  const separatore =
    (righe[0].match(/;/g)?.length || 0) > (righe[0].match(/,/g)?.length || 0)
      ? ";"
      : ",";

  function parseRiga(riga: string) {
    const valori: string[] = [];
    let corrente = "";
    let virgolette = false;
    for (let indice = 0; indice < riga.length; indice += 1) {
      const carattere = riga[indice];
      if (carattere === '"') {
        if (virgolette && riga[indice + 1] === '"') {
          corrente += '"';
          indice += 1;
        } else {
          virgolette = !virgolette;
        }
      } else if (carattere === separatore && !virgolette) {
        valori.push(corrente.trim());
        corrente = "";
      } else {
        corrente += carattere;
      }
    }
    valori.push(corrente.trim());
    return valori;
  }

  const intestazioni = parseRiga(righe[0]).map(normalizzaIntestazione);
  const indiceCampo = new Map(
    CSV_COLUMNS.map(([label, campo]) => [
      campo,
      intestazioni.indexOf(normalizzaIntestazione(label)),
    ])
  );

  return righe.slice(1).map((riga) => {
    const valori = parseRiga(riga);
    const risultato = Object.fromEntries(
      CSV_COLUMNS.map(([, campo]) => [
        campo,
        valori[indiceCampo.get(campo) ?? -1] || "",
      ])
    ) as ProfessionistaForm;
    risultato.data_nascita = normalizzaDataCsv(risultato.data_nascita);
    risultato.prima_iscrizione = normalizzaDataCsv(risultato.prima_iscrizione);
    return risultato;
  });
}

export function chiaveProfessionista(
  value: Professionista | ProfessionistaForm
) {
  const codiceFiscale = value.codice_fiscale?.trim().toUpperCase();
  if (codiceFiscale) return `cf:${codiceFiscale}`;
  const partitaIva = value.partita_iva?.trim().toUpperCase();
  if (partitaIva) return `piva:${partitaIva}`;
  return `nome:${value.cognome?.trim().toLocaleLowerCase("it-IT")}|${value.nome
    ?.trim()
    .toLocaleLowerCase("it-IT")}|${value.data_nascita || ""}`;
}
