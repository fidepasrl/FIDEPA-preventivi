import type {
  Cliente,
  ClienteForm,
  FiltriClienti,
  OrdinamentoClienti,
} from "./types";

export function clienteToForm(cliente: Cliente): ClienteForm {
  return {
    tipo_cliente: cliente.tipo_cliente || "persona_fisica",
    cliente: cliente.cliente || "",
    piva: cliente.piva || "",
    codice_fiscale: cliente.codice_fiscale || "",
    forma_giuridica: cliente.forma_giuridica || "",
    rea: cliente.rea || "",
    indirizzo: cliente.indirizzo || "",
    comune: cliente.comune || "",
    cap: cliente.cap || "",
    provincia: cliente.provincia || "",
    nazione: cliente.nazione || "",
    codice_sdi: cliente.codice_sdi || "",
    sito_web: cliente.sito_web || "",
    pec: cliente.pec || "",
    email: cliente.email || "",
    telefono: cliente.telefono || "",
    referente: cliente.referente || "",
    referente_qualifica: cliente.referente_qualifica || "",
    referente_codice_fiscale: cliente.referente_codice_fiscale || "",
    referente_data_nascita: cliente.referente_data_nascita || "",
    referente_luogo_nascita: cliente.referente_luogo_nascita || "",
    referente_residenza: cliente.referente_residenza || "",
    referente_email: cliente.referente_email || "",
    referente_telefono: cliente.referente_telefono || "",
  };
}

export function inizialiCliente(nome: string | null) {
  const parole = (nome || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return (
    parole
      .slice(0, 2)
      .map((parola) => parola.charAt(0))
      .join("")
      .toUpperCase() || "C"
  );
}

export function formattaDataCliente(value: string | null | undefined) {
  if (!value) return "—";
  const [anno, mese, giorno] = value.slice(0, 10).split("-");
  return anno && mese && giorno ? `${giorno}/${mese}/${anno}` : "—";
}

function verificaPresenza(
  valore: string | null | undefined,
  filtro: "tutti" | "presente" | "assente"
) {
  if (filtro === "presente") return Boolean(valore?.trim());
  if (filtro === "assente") return !valore?.trim();
  return true;
}

export function filtraClienti(
  clienti: Cliente[],
  ricerca: string,
  filtri: FiltriClienti
) {
  const termine = ricerca.trim().toLocaleLowerCase("it-IT");

  return clienti.filter((item) => {
    const testo = [
      item.cliente,
      item.piva,
      item.codice_fiscale,
      item.forma_giuridica,
      item.rea,
      item.indirizzo,
      item.comune,
      item.cap,
      item.provincia,
      item.nazione,
      item.codice_sdi,
      item.sito_web,
      item.pec,
      item.email,
      item.telefono,
      item.referente,
      item.referente_qualifica,
      item.referente_codice_fiscale,
      item.referente_luogo_nascita,
      item.referente_residenza,
      item.referente_email,
      item.referente_telefono,
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("it-IT");

    if (termine && !testo.includes(termine)) return false;
    if (
      filtri.tipo_cliente !== "tutti" &&
      item.tipo_cliente !== filtri.tipo_cliente
    )
      return false;
    if (filtri.comune && item.comune !== filtri.comune) return false;
    if (!verificaPresenza(item.email, filtri.email)) return false;
    if (!verificaPresenza(item.pec, filtri.pec)) return false;
    if (!verificaPresenza(item.telefono, filtri.telefono)) return false;
    if (!verificaPresenza(item.piva, filtri.piva)) return false;
    if (!verificaPresenza(item.referente, filtri.referente)) return false;
    return true;
  });
}

export function ordinaClienti(
  clienti: Cliente[],
  ordine: OrdinamentoClienti
) {
  const collator = new Intl.Collator("it", {
    numeric: true,
    sensitivity: "base",
  });

  return [...clienti].sort((a, b) => {
    if (ordine === "cliente_desc") {
      return collator.compare(b.cliente || "", a.cliente || "");
    }
    if (ordine === "comune") {
      return (
        collator.compare(a.comune || "", b.comune || "") ||
        collator.compare(a.cliente || "", b.cliente || "")
      );
    }
    if (ordine === "referente") {
      return (
        collator.compare(a.referente || "", b.referente || "") ||
        collator.compare(a.cliente || "", b.cliente || "")
      );
    }
    if (ordine === "inserimento") {
      return String(b.created_at || "").localeCompare(
        String(a.created_at || "")
      );
    }
    return collator.compare(a.cliente || "", b.cliente || "");
  });
}

function csvCell(value: string | null | undefined) {
  return `"${String(value || "").replace(/"/g, '""')}"`;
}

const CSV_COLUMNS: Array<[string, keyof ClienteForm]> = [
  ["Tipo cliente", "tipo_cliente"],
  ["Cliente", "cliente"],
  ["Partita IVA o codice fiscale", "piva"],
  ["Codice fiscale azienda", "codice_fiscale"],
  ["Forma giuridica", "forma_giuridica"],
  ["REA", "rea"],
  ["Indirizzo", "indirizzo"],
  ["Comune", "comune"],
  ["CAP", "cap"],
  ["Provincia", "provincia"],
  ["Nazione", "nazione"],
  ["Codice SDI", "codice_sdi"],
  ["Sito web", "sito_web"],
  ["PEC", "pec"],
  ["Email", "email"],
  ["Telefono", "telefono"],
  ["Referente", "referente"],
  ["Qualifica referente", "referente_qualifica"],
  ["Codice fiscale referente", "referente_codice_fiscale"],
  ["Data nascita referente", "referente_data_nascita"],
  ["Luogo nascita referente", "referente_luogo_nascita"],
  ["Residenza referente", "referente_residenza"],
  ["Email referente", "referente_email"],
  ["Telefono referente", "referente_telefono"],
];

export function esportaClientiCsv(clienti: Cliente[]) {
  const contenuto = [
    CSV_COLUMNS.map(([label]) => csvCell(label)),
    ...clienti.map((item) =>
      CSV_COLUMNS.map(([, campo]) => csvCell(item[campo]))
    ),
  ]
    .map((riga) => riga.join(","))
    .join("\r\n");
  const blob = new Blob(["\uFEFF", contenuto], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `rubrica-clienti-${new Date().toISOString().slice(0, 10)}.csv`;
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

function parseCsvRiga(riga: string, separatore: string) {
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

export function leggiCsvClienti(testo: string) {
  const righe = testo
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((riga) => riga.trim());
  if (righe.length < 2) return [];
  const separatore =
    (righe[0].match(/;/g)?.length || 0) >
    (righe[0].match(/,/g)?.length || 0)
      ? ";"
      : ",";
  const intestazioni = parseCsvRiga(righe[0], separatore).map(
    normalizzaIntestazione
  );
  const indiceCampo = new Map(
    CSV_COLUMNS.map(([label, campo]) => [
      campo,
      intestazioni.indexOf(normalizzaIntestazione(label)),
    ])
  );

  return righe.slice(1).map((riga) => {
    const valori = parseCsvRiga(riga, separatore);
    const risultato = Object.fromEntries(
      CSV_COLUMNS.map(([, campo]) => [
        campo,
        valori[indiceCampo.get(campo) ?? -1] || "",
      ])
    ) as ClienteForm;
    const tipo = risultato.tipo_cliente
      .trim()
      .toLocaleLowerCase("it-IT")
      .replace(/\s+/g, "_");
    risultato.tipo_cliente = tipo === "azienda" ? "azienda" : "persona_fisica";
    risultato.referente_data_nascita = normalizzaDataCsv(
      risultato.referente_data_nascita
    );
    return risultato;
  });
}

export function chiaveCliente(value: Cliente | ClienteForm) {
  const piva = value.piva?.trim().toUpperCase();
  if (piva) return `piva:${piva}`;
  const codiceFiscale = value.codice_fiscale?.trim().toUpperCase();
  if (codiceFiscale) return `cf:${codiceFiscale}`;
  const email = value.email?.trim().toLocaleLowerCase("it-IT");
  if (email) return `email:${email}`;
  return `nome:${value.cliente?.trim().toLocaleLowerCase("it-IT")}|${
    value.comune?.trim().toLocaleLowerCase("it-IT") || ""
  }`;
}

function normalizzaDataCsv(value: string) {
  const pulito = value.trim();
  const italiana = pulito.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (italiana) {
    return `${italiana[3]}-${italiana[2].padStart(2, "0")}-${italiana[1].padStart(2, "0")}`;
  }
  return /^\d{4}-\d{2}-\d{2}$/.test(pulito) ? pulito : "";
}
