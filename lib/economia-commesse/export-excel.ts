import { parseImporto } from "@/lib/importi";
import type {
  CommessaEconomica,
  PersonaEconomica,
  PreventivoEconomico,
  ProfessionistaEconomico,
  ProfiloFiscale,
  RiepilogoEconomico,
  SchedaEconomica,
  SoggettoFiscale,
  WorkspaceEconomico,
} from "./types";
import type { Cell, Workbook, Worksheet } from "exceljs";

const COLORI = {
  blu: "2B2F5E",
  azzurro: "5E9AD3",
  azzurroChiaro: "EAF3FA",
  oro: "D79D06",
  oroChiaro: "FFF8E7",
  verde: "5DB642",
  verdeChiaro: "EAF6E6",
  rosso: "B42318",
  rossoChiaro: "FDECEC",
  grigio: "667085",
  grigioChiaro: "F2F4F7",
  bordo: "D9E2EC",
  bianco: "FFFFFF",
} as const;

const FONT = "Arial";
const FORMATO_EURO = '€ #,##0.00;[Red]-€ #,##0.00;–';
const FORMATO_PERCENTUALE = "0.00%";
const FORMATO_DATA = "dd/mm/yyyy";
const FORMATO_DATA_ORA = "dd/mm/yyyy hh:mm";

type TipoColonna =
  | "testo"
  | "data"
  | "dataOra"
  | "valuta"
  | "percentuale"
  | "numero"
  | "booleano";

type Colonna = {
  chiave: string;
  titolo: string;
  larghezza: number;
  tipo?: TipoColonna;
};

type ValoreTabella = string | number | boolean | Date | null;
type RigaTabella = Record<string, ValoreTabella>;

export type DatiExportCommessa = {
  commessa: CommessaEconomica;
  scheda: SchedaEconomica | null;
  workspace: WorkspaceEconomico;
  riepilogo: RiepilogoEconomico;
  preventivo: PreventivoEconomico | null;
  soggettoFiscale: SoggettoFiscale | null;
  personale: PersonaEconomica[];
  professionisti: ProfessionistaEconomico[];
  profili: ProfiloFiscale[];
};

function dataExcel(value: string | null | undefined): Date | string | null {
  if (!value) return null;
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2}))?/);
  if (iso) {
    return new Date(
      Number(iso[1]),
      Number(iso[2]) - 1,
      Number(iso[3]),
      Number(iso[4] || 12),
      Number(iso[5] || 0)
    );
  }

  const italiana = value.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);
  if (italiana) {
    return new Date(
      Number(italiana[3]),
      Number(italiana[2]) - 1,
      Number(italiana[1]),
      12
    );
  }

  return value;
}

function etichetta(value: string | null | undefined) {
  if (!value) return "Non indicato";
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (lettera) => lettera.toUpperCase());
}

function testo(value: unknown) {
  if (value === null || value === undefined || value === "") return "Non indicato";
  return String(value);
}

function valoreOggetto(
  oggetto: Record<string, unknown>,
  chiavi: string[],
  fallback: unknown = null
) {
  for (const chiave of chiavi) {
    const value = oggetto[chiave];
    if (value !== null && value !== undefined && value !== "") return value;
  }
  return fallback;
}

function nomeCollaboratore(
  collaboratore: DatiExportCommessa["workspace"]["collaboratori"][number] | undefined,
  input: DatiExportCommessa
) {
  if (!collaboratore) return "Non indicato";
  if (collaboratore.persona_id) {
    return (
      input.personale.find((item) => item.id === collaboratore.persona_id)?.nome ||
      "Personale non trovato"
    );
  }
  if (collaboratore.professionista_id) {
    const professionista = input.professionisti.find(
      (item) => item.id === collaboratore.professionista_id
    );
    const nominativo = [professionista?.nome, professionista?.cognome]
      .filter(Boolean)
      .join(" ");
    return nominativo || "Professionista non trovato";
  }
  return collaboratore.collaboratore_esterno_nome || "Collaboratore esterno";
}

function nomeProfilo(id: string | null, profili: ProfiloFiscale[]) {
  if (!id) return "Non indicato";
  const profilo = profili.find((item) => item.id === id);
  return profilo ? `${profilo.codice} - ${profilo.nome}` : "Profilo non trovato";
}

function stileTitolo(foglio: Worksheet, ultimaColonna: number, titolo: string, sottotitolo: string) {
  foglio.mergeCells(1, 1, 1, ultimaColonna);
  foglio.getCell(1, 1).value = titolo;
  foglio.getCell(1, 1).font = {
    name: FONT,
    size: 15,
    bold: true,
    color: { argb: COLORI.bianco },
  };
  foglio.getCell(1, 1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: COLORI.blu },
  };
  foglio.getCell(1, 1).alignment = { vertical: "middle", horizontal: "left" };
  foglio.getRow(1).height = 29;

  foglio.mergeCells(2, 1, 2, ultimaColonna);
  foglio.getCell(2, 1).value = sottotitolo;
  foglio.getCell(2, 1).font = {
    name: FONT,
    size: 9,
    italic: true,
    color: { argb: COLORI.oro },
  };
  foglio.getCell(2, 1).alignment = { vertical: "middle", horizontal: "left" };
  foglio.getRow(2).height = 21;
}

function stileIntestazione(cell: Cell) {
  cell.font = { name: FONT, size: 9, bold: true, color: { argb: COLORI.bianco } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORI.azzurro } };
  cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  cell.border = {
    left: { style: "thin", color: { argb: COLORI.bianco } },
    right: { style: "thin", color: { argb: COLORI.bianco } },
    bottom: { style: "thin", color: { argb: COLORI.blu } },
  };
}

function applicaFormatoCella(cell: Cell, colonna: Colonna, indiceRiga: number) {
  cell.font = { name: FONT, size: 9, color: { argb: COLORI.blu } };
  cell.alignment = {
    vertical: "middle",
    horizontal: ["valuta", "percentuale", "numero"].includes(colonna.tipo || "testo")
      ? "right"
      : colonna.tipo === "booleano"
        ? "center"
        : "left",
    wrapText: colonna.tipo === "testo",
  };
  cell.border = {
    bottom: { style: "hair", color: { argb: COLORI.bordo } },
  };

  if (indiceRiga % 2 === 0) {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: COLORI.grigioChiaro },
    };
  }

  if (colonna.tipo === "valuta") cell.numFmt = FORMATO_EURO;
  if (colonna.tipo === "percentuale") cell.numFmt = FORMATO_PERCENTUALE;
  if (colonna.tipo === "numero") cell.numFmt = "#,##0.00";
  if (colonna.tipo === "data") cell.numFmt = FORMATO_DATA;
  if (colonna.tipo === "dataOra") cell.numFmt = FORMATO_DATA_ORA;

  const stato = String(cell.value || "").toLowerCase();
  if (
    colonna.chiave.includes("stato") ||
    colonna.chiave === "direzione" ||
    colonna.chiave === "gravita"
  ) {
    if (/annull|scadut|critic|anomalia/.test(stato)) {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORI.rossoChiaro } };
      cell.font = { ...cell.font, bold: true, color: { argb: COLORI.rosso } };
    } else if (/apert|attenzione|parzial|da associare|da documentare|da verificare/.test(stato)) {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORI.oroChiaro } };
      cell.font = { ...cell.font, bold: true, color: { argb: COLORI.oro } };
    } else if (/pagat|riconciliat|risolt|entrata/.test(stato)) {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORI.verdeChiaro } };
      cell.font = { ...cell.font, bold: true, color: { argb: COLORI.verde } };
    }
  }
}

function impostaStampa(
  foglio: Worksheet,
  input: DatiExportCommessa,
  ultimaRiga: number,
  ultimaColonna: number,
  orientamento: "portrait" | "landscape" = "landscape",
  rigaTitoli?: number
) {
  foglio.pageSetup = {
    paperSize: 9,
    orientation: orientamento,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    horizontalCentered: false,
    verticalCentered: false,
    showGridLines: false,
    showRowColHeaders: false,
    printArea: `A1:${foglio.getColumn(ultimaColonna).letter}${Math.max(ultimaRiga, 5)}`,
    margins: {
      left: 0.3,
      right: 0.3,
      top: 0.55,
      bottom: 0.55,
      header: 0.2,
      footer: 0.25,
    },
  };
  if (rigaTitoli) foglio.pageSetup.printTitlesRow = `${rigaTitoli}:${rigaTitoli}`;
  foglio.headerFooter.oddHeader = "&L&BFIDEPA S.R.L.&R&9Report commessa";
  foglio.headerFooter.oddFooter = `&L&9${testo(input.commessa.codice)} - ${input.commessa.titolo}&C&9Pagina &P di &N&R&9${foglio.name}`;
}

function creaFoglioTabella(
  workbook: Workbook,
  input: DatiExportCommessa,
  configurazione: {
    nome: string;
    titolo: string;
    sottotitolo: string;
    colonne: Colonna[];
    righe: RigaTabella[];
    orientamento?: "portrait" | "landscape";
  }
) {
  const foglio = workbook.addWorksheet(configurazione.nome, {
    properties: { defaultRowHeight: 18 },
    views: [{ state: "frozen", ySplit: 4, activeCell: "A5", showGridLines: false }],
  });
  foglio.columns = configurazione.colonne.map((colonna) => ({
    key: colonna.chiave,
    width: colonna.larghezza,
  }));

  stileTitolo(foglio, configurazione.colonne.length, configurazione.titolo, configurazione.sottotitolo);
  const intestazione = foglio.getRow(4);
  intestazione.values = configurazione.colonne.map((colonna) => colonna.titolo);
  intestazione.height = 31;
  intestazione.eachCell(stileIntestazione);

  if (configurazione.righe.length === 0) {
    foglio.mergeCells(5, 1, 5, configurazione.colonne.length);
    const vuota = foglio.getCell(5, 1);
    vuota.value = "Nessun dato registrato.";
    vuota.font = { name: FONT, size: 10, italic: true, color: { argb: COLORI.grigio } };
    vuota.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORI.grigioChiaro } };
    vuota.alignment = { vertical: "middle", horizontal: "center" };
    foglio.getRow(5).height = 27;
  } else {
    configurazione.righe.forEach((dati, indice) => {
      const riga = foglio.addRow(dati);
      riga.height = 24;
      configurazione.colonne.forEach((colonna, indiceColonna) => {
        applicaFormatoCella(riga.getCell(indiceColonna + 1), colonna, indice);
      });
    });
    foglio.autoFilter = {
      from: { row: 4, column: 1 },
      to: { row: 4 + configurazione.righe.length, column: configurazione.colonne.length },
    };
  }

  impostaStampa(
    foglio,
    input,
    4 + Math.max(configurazione.righe.length, 1),
    configurazione.colonne.length,
    configurazione.orientamento,
    4
  );
  return foglio;
}

function creaRiepilogo(workbook: Workbook, input: DatiExportCommessa) {
  const foglio = workbook.addWorksheet("Riepilogo", {
    properties: { defaultRowHeight: 19 },
    views: [{ showGridLines: false }],
  });
  foglio.columns = [
    { width: 29 },
    { width: 20 },
    { width: 3 },
    { width: 31 },
    { width: 20 },
  ];
  stileTitolo(
    foglio,
    5,
    `Economia commessa ${input.commessa.codice || ""}`.trim(),
    `${input.commessa.titolo} · Esportato il ${new Intl.DateTimeFormat("it-IT", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date())}`
  );

  let rigaCorrente = 4;
  const sezione = (titolo: string) => {
    foglio.mergeCells(rigaCorrente, 1, rigaCorrente, 5);
    const cell = foglio.getCell(rigaCorrente, 1);
    cell.value = titolo;
    cell.font = { name: FONT, size: 10, bold: true, color: { argb: COLORI.bianco } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORI.azzurro } };
    cell.alignment = { vertical: "middle", horizontal: "left" };
    foglio.getRow(rigaCorrente).height = 23;
    rigaCorrente += 1;
  };

  const coppia = (
    sinistra: [string, ValoreTabella, TipoColonna?],
    destra?: [string, ValoreTabella, TipoColonna?],
    evidenza = false
  ) => {
    const valori = [sinistra, destra];
    const colonne = [1, 4];
    valori.forEach((voce, indice) => {
      if (!voce) return;
      const [label, valore, tipo = "testo"] = voce;
      const cellLabel = foglio.getCell(rigaCorrente, colonne[indice]);
      const cellValore = foglio.getCell(rigaCorrente, colonne[indice] + 1);
      cellLabel.value = label;
      cellValore.value = valore;
      cellLabel.font = { name: FONT, size: 9, bold: true, color: { argb: COLORI.grigio } };
      cellValore.font = {
        name: FONT,
        size: evidenza ? 11 : 9,
        bold: evidenza,
        color: { argb: COLORI.blu },
      };
      [cellLabel, cellValore].forEach((cell) => {
        cell.border = { bottom: { style: "hair", color: { argb: COLORI.bordo } } };
        cell.alignment = { vertical: "middle", horizontal: cell === cellValore && tipo === "valuta" ? "right" : "left" };
        if (evidenza) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORI.oroChiaro } };
        }
      });
      if (tipo === "valuta") cellValore.numFmt = FORMATO_EURO;
      if (tipo === "percentuale") cellValore.numFmt = FORMATO_PERCENTUALE;
      if (tipo === "data") cellValore.numFmt = FORMATO_DATA;
      if (typeof valore === "number" && valore < 0) {
        cellValore.font = { ...cellValore.font, color: { argb: COLORI.rosso } };
      }
    });
    foglio.getRow(rigaCorrente).height = evidenza ? 25 : 21;
    rigaCorrente += 1;
  };

  sezione("Dati commessa");
  coppia(
    ["Codice", input.commessa.codice || "Non indicato"],
    ["Cliente", input.commessa.cliente_nome || "Non indicato"]
  );
  coppia(["Titolo", input.commessa.titolo], ["Anno economico", input.scheda?.anno || new Date().getFullYear(), "numero"]);
  coppia(
    ["Inizio lavori", dataExcel(input.commessa.data_inizio), "data"],
    ["Fine lavori", dataExcel(input.commessa.data_fine), "data"]
  );
  coppia(
    ["Preventivo associato", input.scheda?.preventivo_numero || "Non associato"],
    ["Soggetto fiscale", input.soggettoFiscale?.nome || "Non indicato"]
  );
  coppia(
    ["Trattenuta FIDEPA fissa", parseImporto(input.scheda?.trattenuta_fisso_percentuale) / 100, "percentuale"],
    ["Trattenuta FIDEPA operativa", parseImporto(input.scheda?.trattenuta_operativo_percentuale) / 100, "percentuale"]
  );

  rigaCorrente += 1;
  sezione("Quadro economico");
  coppia(["Valore iniziale", input.riepilogo.valoreIniziale, "valuta"], ["Variazioni nette", input.riepilogo.variazioniNette, "valuta"]);
  coppia(["Valore aggiornato", input.riepilogo.valoreAggiornato, "valuta"], ["Costi previsti", input.riepilogo.costiPrevisti, "valuta"], true);
  coppia(["Margine previsto", input.riepilogo.marginePrevisto, "valuta"], ["Margine attuale", input.riepilogo.margineAttuale, "valuta"], true);
  coppia(["Aumenti", input.riepilogo.variazioniAumento, "valuta"], ["Diminuzioni", input.riepilogo.variazioniDiminuzione, "valuta"]);
  coppia(["Ricavi documentati", input.riepilogo.ricaviDocumentati, "valuta"], ["Costi documentati", input.riepilogo.costiDocumentati, "valuta"]);
  coppia(["Margine documentato", input.riepilogo.margineDocumentato, "valuta"], ["Residuo da fatturare", input.riepilogo.residuoDaFatturare, "valuta"]);
  coppia(["Costi pagati", input.riepilogo.costiPagati, "valuta"], ["Costi da pagare", input.riepilogo.costiDaPagare, "valuta"]);

  rigaCorrente += 1;
  sezione("Incassi, pagamenti e imposte");
  coppia(["Incassi totali", input.riepilogo.incassiTotali, "valuta"], ["Pagamenti totali", input.riepilogo.pagamentiTotali, "valuta"], true);
  coppia(["Da incassare", input.riepilogo.daIncassare, "valuta"], ["Saldo finanziario", input.riepilogo.saldoFinanziario, "valuta"], true);
  coppia(["Incassi riconciliati", input.riepilogo.incassiRiconciliati, "valuta"], ["Pagamenti riconciliati", input.riepilogo.pagamentiRiconciliati, "valuta"]);
  coppia(["Incassi da documentare", input.riepilogo.incassiDaDocumentare, "valuta"], ["Pagamenti da documentare", input.riepilogo.pagamentiDaDocumentare, "valuta"]);
  coppia(["Fatture da incassare", input.riepilogo.fattureDaIncassare, "valuta"], ["Documenti costi da pagare", input.riepilogo.documentiCollaboratoriDaPagare, "valuta"]);
  coppia(["Documenti costi da ricevere", input.riepilogo.documentiCollaboratoriDaRicevere, "valuta"], ["Pagato ai collaboratori", input.riepilogo.pagatoCollaboratori, "valuta"]);
  coppia(["Cassa incassata", input.riepilogo.cassaIncassata, "valuta"], ["Cassa pagata", input.riepilogo.cassaPagata, "valuta"]);
  coppia(["Cassa da versare", input.riepilogo.cassaDaVersare, "valuta"], ["IVA da versare", input.riepilogo.ivaDaVersare, "valuta"]);
  coppia(["IVA incassata", input.riepilogo.ivaIncassata, "valuta"], ["IVA pagata", input.riepilogo.ivaPagata, "valuta"]);

  if (!input.scheda) {
    rigaCorrente += 1;
    foglio.mergeCells(rigaCorrente, 1, rigaCorrente, 5);
    const avviso = foglio.getCell(rigaCorrente, 1);
    avviso.value = "Il quadro economico della commessa non è ancora configurato.";
    avviso.font = { name: FONT, size: 9, bold: true, color: { argb: COLORI.oro } };
    avviso.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORI.oroChiaro } };
    avviso.alignment = { vertical: "middle", horizontal: "center" };
  }

  impostaStampa(foglio, input, rigaCorrente, 5, "portrait");
}

function righeAttivita(preventivo: PreventivoEconomico | null): RigaTabella[] {
  return (preventivo?.lavorazioni || []).map((voce, indice) => ({
    ordine: indice + 1,
    macrocategoria: testo(valoreOggetto(voce, ["macrocategoria", "macro_categoria"], "Altro")),
    categoria: testo(valoreOggetto(voce, ["categoria"], "Non indicata")),
    attivita: testo(valoreOggetto(voce, ["nome", "titolo", "lavorazione"], `Attività ${indice + 1}`)),
    descrizione: testo(valoreOggetto(voce, ["descrizione", "note"], "")),
    importo: parseImporto(valoreOggetto(voce, ["importo", "prezzo", "totale"], 0) as string | number),
  }));
}

function righePagamento(preventivo: PreventivoEconomico | null): RigaTabella[] {
  const pagamento = preventivo?.pagamento;
  if (!pagamento) return [];
  const totale = parseImporto(preventivo?.totale);

  if (Array.isArray(pagamento)) {
    return pagamento.map((voce, indice) => {
      const percentuale = parseImporto(valoreOggetto(voce, ["percentuale", "quota"], 0) as string | number);
      return {
        ordine: indice + 1,
        fase: testo(valoreOggetto(voce, ["nome", "label", "titolo"], `Pagamento ${indice + 1}`)),
        percentuale: percentuale / 100,
        importo: (totale * percentuale) / 100,
      };
    });
  }

  return Object.entries(pagamento).map(([fase, value], indice) => {
    const percentuale = parseImporto(value as string | number);
    return {
      ordine: indice + 1,
      fase: etichetta(fase),
      percentuale: percentuale / 100,
      importo: (totale * percentuale) / 100,
    };
  });
}

function aggiungiFogli(workbook: Workbook, input: DatiExportCommessa) {
  const { commessa, scheda, workspace, preventivo } = input;
  const sottotitoloBase = `${commessa.codice || "Senza codice"} · ${commessa.titolo}`;

  creaFoglioTabella(workbook, input, {
    nome: "Dati commessa",
    titolo: "Dati generali della commessa",
    sottotitolo: sottotitoloBase,
    orientamento: "landscape",
    colonne: [
      { chiave: "codice", titolo: "Codice", larghezza: 14 },
      { chiave: "titolo", titolo: "Titolo", larghezza: 32 },
      { chiave: "cliente", titolo: "Cliente", larghezza: 28 },
      { chiave: "inizio", titolo: "Inizio lavori", larghezza: 14, tipo: "data" },
      { chiave: "fine", titolo: "Fine lavori", larghezza: 14, tipo: "data" },
      { chiave: "anno", titolo: "Anno", larghezza: 10, tipo: "numero" },
      { chiave: "preventivo", titolo: "Preventivo", larghezza: 15 },
      { chiave: "soggetto", titolo: "Soggetto fiscale", larghezza: 23 },
      { chiave: "compenso", titolo: "Imponibile iniziale", larghezza: 18, tipo: "valuta" },
      { chiave: "trattenutaFissa", titolo: "Trattenuta fissa", larghezza: 15, tipo: "percentuale" },
      { chiave: "trattenutaOperativa", titolo: "Trattenuta operativa", larghezza: 17, tipo: "percentuale" },
      { chiave: "note", titolo: "Note", larghezza: 32 },
      { chiave: "creata", titolo: "Creata il", larghezza: 17, tipo: "dataOra" },
      { chiave: "aggiornata", titolo: "Aggiornata il", larghezza: 17, tipo: "dataOra" },
    ],
    righe: [
      {
        codice: commessa.codice || "Non indicato",
        titolo: commessa.titolo,
        cliente: commessa.cliente_nome || "Non indicato",
        inizio: dataExcel(commessa.data_inizio),
        fine: dataExcel(commessa.data_fine),
        anno: scheda?.anno || new Date().getFullYear(),
        preventivo: scheda?.preventivo_numero || "Non associato",
        soggetto: input.soggettoFiscale?.nome || "Non indicato",
        compenso: parseImporto(scheda?.compenso_iniziale ?? scheda?.compenso),
        trattenutaFissa: parseImporto(scheda?.trattenuta_fisso_percentuale) / 100,
        trattenutaOperativa: parseImporto(scheda?.trattenuta_operativo_percentuale) / 100,
        note: scheda?.note || "",
        creata: dataExcel(scheda?.created_at || commessa.created_at),
        aggiornata: dataExcel(scheda?.updated_at),
      },
    ],
  });

  creaFoglioTabella(workbook, input, {
    nome: "Preventivo",
    titolo: "Preventivo associato",
    sottotitolo: sottotitoloBase,
    colonne: [
      { chiave: "numero", titolo: "Numero", larghezza: 15 },
      { chiave: "data", titolo: "Data", larghezza: 14, tipo: "data" },
      { chiave: "cliente", titolo: "Cliente", larghezza: 28 },
      { chiave: "oggetto", titolo: "Oggetto", larghezza: 42 },
      { chiave: "imponibile", titolo: "Imponibile", larghezza: 17, tipo: "valuta" },
      { chiave: "sconto", titolo: "Sconto", larghezza: 15, tipo: "valuta" },
      { chiave: "cassa", titolo: "Cassa", larghezza: 15, tipo: "valuta" },
      { chiave: "iva", titolo: "IVA", larghezza: 15, tipo: "valuta" },
      { chiave: "totale", titolo: "Totale", larghezza: 17, tipo: "valuta" },
    ],
    righe: preventivo
      ? [
          {
            numero: preventivo.numero,
            data: dataExcel(preventivo.data),
            cliente: preventivo.cliente || "Non indicato",
            oggetto: preventivo.oggetto || "Non indicato",
            imponibile: parseImporto(preventivo.imponibile),
            sconto: parseImporto(preventivo.sconto),
            cassa: parseImporto(preventivo.cassa),
            iva: parseImporto(preventivo.iva),
            totale: parseImporto(preventivo.totale),
          },
        ]
      : [],
  });

  creaFoglioTabella(workbook, input, {
    nome: "Attività lavorative",
    titolo: "Attività lavorative del preventivo",
    sottotitolo: preventivo ? `Preventivo ${preventivo.numero}` : `${sottotitoloBase} · Preventivo non associato`,
    colonne: [
      { chiave: "ordine", titolo: "N.", larghezza: 7, tipo: "numero" },
      { chiave: "macrocategoria", titolo: "Fase", larghezza: 22 },
      { chiave: "categoria", titolo: "Categoria", larghezza: 24 },
      { chiave: "attivita", titolo: "Attività", larghezza: 34 },
      { chiave: "descrizione", titolo: "Descrizione", larghezza: 55 },
      { chiave: "importo", titolo: "Importo", larghezza: 18, tipo: "valuta" },
    ],
    righe: righeAttivita(preventivo),
  });

  creaFoglioTabella(workbook, input, {
    nome: "Piano pagamenti",
    titolo: "Piano pagamenti del preventivo",
    sottotitolo: preventivo ? `Preventivo ${preventivo.numero}` : `${sottotitoloBase} · Preventivo non associato`,
    orientamento: "portrait",
    colonne: [
      { chiave: "ordine", titolo: "N.", larghezza: 9, tipo: "numero" },
      { chiave: "fase", titolo: "Fase di pagamento", larghezza: 38 },
      { chiave: "percentuale", titolo: "Percentuale", larghezza: 18, tipo: "percentuale" },
      { chiave: "importo", titolo: "Importo sul totale", larghezza: 22, tipo: "valuta" },
    ],
    righe: righePagamento(preventivo),
  });

  creaFoglioTabella(workbook, input, {
    nome: "Variazioni",
    titolo: "Variazioni del quadro economico",
    sottotitolo: sottotitoloBase,
    orientamento: "portrait",
    colonne: [
      { chiave: "data", titolo: "Data", larghezza: 15, tipo: "data" },
      { chiave: "tipologia", titolo: "Tipologia", larghezza: 18 },
      { chiave: "descrizione", titolo: "Descrizione", larghezza: 50 },
      { chiave: "importo", titolo: "Importo", larghezza: 20, tipo: "valuta" },
      { chiave: "creata", titolo: "Registrata il", larghezza: 18, tipo: "dataOra" },
    ],
    righe: workspace.variazioni.map((item) => ({
      data: dataExcel(item.data_variazione),
      tipologia: etichetta(item.tipologia),
      descrizione: item.descrizione,
      importo: (item.tipologia === "diminuzione" ? -1 : 1) * parseImporto(item.importo),
      creata: dataExcel(item.created_at),
    })),
  });

  creaFoglioTabella(workbook, input, {
    nome: "Collaboratori",
    titolo: "Collaboratori e compensi previsti",
    sottotitolo: sottotitoloBase,
    colonne: [
      { chiave: "nome", titolo: "Collaboratore", larghezza: 28 },
      { chiave: "tipo", titolo: "Tipo", larghezza: 14 },
      { chiave: "modalita", titolo: "Calcolo", larghezza: 24 },
      { chiave: "percentuale", titolo: "Percentuale", larghezza: 15, tipo: "percentuale" },
      { chiave: "compenso", titolo: "Compenso", larghezza: 18, tipo: "valuta" },
      { chiave: "profilo", titolo: "Profilo fiscale", larghezza: 26 },
      { chiave: "cassaAliquota", titolo: "Cassa %", larghezza: 12, tipo: "percentuale" },
      { chiave: "cassa", titolo: "Cassa", larghezza: 15, tipo: "valuta" },
      { chiave: "ivaAliquota", titolo: "IVA %", larghezza: 12, tipo: "percentuale" },
      { chiave: "iva", titolo: "IVA", larghezza: 15, tipo: "valuta" },
      { chiave: "note", titolo: "Note", larghezza: 32 },
      { chiave: "creato", titolo: "Inserito il", larghezza: 17, tipo: "dataOra" },
    ],
    righe: workspace.collaboratori.map((item) => ({
      nome: nomeCollaboratore(item, input),
      tipo: etichetta(item.tipo),
      modalita: etichetta(item.modalita_calcolo),
      percentuale: parseImporto(item.percentuale) / 100,
      compenso: parseImporto(item.compenso),
      profilo: nomeProfilo(item.profilo_fiscale_id, input.profili),
      cassaAliquota: parseImporto(item.cassa_aliquota) / 100,
      cassa: parseImporto(item.cassa),
      ivaAliquota: parseImporto(item.iva_aliquota) / 100,
      iva: parseImporto(item.iva),
      note: item.note || "",
      creato: dataExcel(item.created_at),
    })),
  });

  creaFoglioTabella(workbook, input, {
    nome: "Costi previsti",
    titolo: "Costi e spese previsti",
    sottotitolo: sottotitoloBase,
    orientamento: "portrait",
    colonne: [
      { chiave: "descrizione", titolo: "Descrizione", larghezza: 52 },
      { chiave: "importo", titolo: "Imponibile", larghezza: 20, tipo: "valuta" },
      { chiave: "cassa", titolo: "Cassa", larghezza: 18, tipo: "valuta" },
      { chiave: "iva", titolo: "IVA", larghezza: 18, tipo: "valuta" },
      { chiave: "totale", titolo: "Totale", larghezza: 20, tipo: "valuta" },
    ],
    righe: workspace.costiProgetto.map((item) => ({
      descrizione: item.descrizione,
      importo: parseImporto(item.importo),
      cassa: parseImporto(item.cassa),
      iva: parseImporto(item.iva),
      totale: parseImporto(item.importo) + parseImporto(item.cassa) + parseImporto(item.iva),
    })),
  });

  creaFoglioTabella(workbook, input, {
    nome: "Documenti ricavi",
    titolo: "Documenti attivi e ricavi",
    sottotitolo: sottotitoloBase,
    colonne: [
      { chiave: "data", titolo: "Data", larghezza: 13, tipo: "data" },
      { chiave: "numero", titolo: "Numero", larghezza: 14 },
      { chiave: "tipologia", titolo: "Tipologia", larghezza: 19 },
      { chiave: "cliente", titolo: "Cliente", larghezza: 24 },
      { chiave: "descrizione", titolo: "Descrizione", larghezza: 34 },
      { chiave: "imponibile", titolo: "Imponibile", larghezza: 16, tipo: "valuta" },
      { chiave: "cassa", titolo: "Cassa", larghezza: 14, tipo: "valuta" },
      { chiave: "iva", titolo: "IVA", larghezza: 14, tipo: "valuta" },
      { chiave: "ritenuta", titolo: "Ritenuta", larghezza: 14, tipo: "valuta" },
      { chiave: "bollo", titolo: "Bollo", larghezza: 12, tipo: "valuta" },
      { chiave: "totale", titolo: "Totale", larghezza: 16, tipo: "valuta" },
      { chiave: "scadenza", titolo: "Scadenza", larghezza: 14, tipo: "data" },
      { chiave: "stato", titolo: "Stato", larghezza: 19 },
      { chiave: "fiscale", titolo: "Rilevanza fiscale", larghezza: 16, tipo: "booleano" },
      { chiave: "note", titolo: "Note", larghezza: 28 },
      { chiave: "allegato", titolo: "Allegato", larghezza: 25 },
    ],
    righe: workspace.documentiAttivi.map((item) => ({
      data: dataExcel(item.data_documento),
      numero: item.numero || "Non indicato",
      tipologia: etichetta(item.tipologia),
      cliente: item.cliente,
      descrizione: item.descrizione,
      imponibile: parseImporto(item.imponibile),
      cassa: parseImporto(item.cassa),
      iva: parseImporto(item.iva),
      ritenuta: parseImporto(item.ritenuta),
      bollo: parseImporto(item.bollo),
      totale: parseImporto(item.totale),
      scadenza: dataExcel(item.scadenza),
      stato: etichetta(item.stato),
      fiscale: item.rilevanza_fiscale ? "Sì" : "No",
      note: item.note || "",
      allegato: item.allegato_nome || item.allegato_url || "",
    })),
  });

  creaFoglioTabella(workbook, input, {
    nome: "Righe documenti ricavi",
    titolo: "Dettaglio righe dei documenti attivi",
    sottotitolo: sottotitoloBase,
    colonne: [
      { chiave: "documento", titolo: "Documento", larghezza: 18 },
      { chiave: "data", titolo: "Data", larghezza: 14, tipo: "data" },
      { chiave: "ordine", titolo: "Riga", larghezza: 9, tipo: "numero" },
      { chiave: "descrizione", titolo: "Descrizione", larghezza: 44 },
      { chiave: "imponibile", titolo: "Imponibile", larghezza: 16, tipo: "valuta" },
      { chiave: "cassaAliquota", titolo: "Cassa %", larghezza: 12, tipo: "percentuale" },
      { chiave: "cassa", titolo: "Cassa", larghezza: 14, tipo: "valuta" },
      { chiave: "ivaAliquota", titolo: "IVA %", larghezza: 12, tipo: "percentuale" },
      { chiave: "iva", titolo: "IVA", larghezza: 14, tipo: "valuta" },
      { chiave: "ritenutaAliquota", titolo: "Ritenuta %", larghezza: 13, tipo: "percentuale" },
      { chiave: "ritenuta", titolo: "Ritenuta", larghezza: 14, tipo: "valuta" },
      { chiave: "bollo", titolo: "Bollo", larghezza: 12, tipo: "valuta" },
      { chiave: "totale", titolo: "Totale", larghezza: 16, tipo: "valuta" },
      { chiave: "override", titolo: "Valori modificati", larghezza: 16, tipo: "booleano" },
    ],
    righe: workspace.righeDocumentiAttivi.map((item) => {
      const documento = workspace.documentiAttivi.find((doc) => doc.id === item.documento_attivo_id);
      return {
        documento: documento?.numero || documento?.descrizione || "Non indicato",
        data: dataExcel(documento?.data_documento),
        ordine: item.ordine,
        descrizione: item.descrizione,
        imponibile: parseImporto(item.imponibile),
        cassaAliquota: parseImporto(item.cassa_aliquota) / 100,
        cassa: parseImporto(item.cassa),
        ivaAliquota: parseImporto(item.iva_aliquota) / 100,
        iva: parseImporto(item.iva),
        ritenutaAliquota: parseImporto(item.ritenuta_aliquota) / 100,
        ritenuta: parseImporto(item.ritenuta),
        bollo: parseImporto(item.bollo),
        totale: parseImporto(item.totale),
        override: item.override_fiscale ? "Sì" : "No",
      };
    }),
  });

  creaFoglioTabella(workbook, input, {
    nome: "Documenti costi",
    titolo: "Documenti di costo dei collaboratori",
    sottotitolo: sottotitoloBase,
    colonne: [
      { chiave: "data", titolo: "Data", larghezza: 13, tipo: "data" },
      { chiave: "numero", titolo: "Numero", larghezza: 14 },
      { chiave: "collaboratore", titolo: "Collaboratore", larghezza: 26 },
      { chiave: "tipologia", titolo: "Tipologia", larghezza: 18 },
      { chiave: "descrizione", titolo: "Descrizione", larghezza: 32 },
      { chiave: "imponibile", titolo: "Imponibile", larghezza: 16, tipo: "valuta" },
      { chiave: "cassa", titolo: "Cassa", larghezza: 14, tipo: "valuta" },
      { chiave: "iva", titolo: "IVA", larghezza: 14, tipo: "valuta" },
      { chiave: "ritenuta", titolo: "Ritenuta", larghezza: 14, tipo: "valuta" },
      { chiave: "bollo", titolo: "Bollo", larghezza: 12, tipo: "valuta" },
      { chiave: "totale", titolo: "Totale", larghezza: 16, tipo: "valuta" },
      { chiave: "stato", titolo: "Stato", larghezza: 18 },
      { chiave: "profilo", titolo: "Profilo fiscale", larghezza: 24 },
      { chiave: "override", titolo: "Valori modificati", larghezza: 16, tipo: "booleano" },
      { chiave: "note", titolo: "Note", larghezza: 27 },
      { chiave: "allegato", titolo: "Allegato", larghezza: 23 },
    ],
    righe: workspace.documentiCollaboratori.map((item) => {
      const collaboratore = workspace.collaboratori.find((value) => value.id === item.collaboratore_id);
      return {
        data: dataExcel(item.data_documento),
        numero: item.numero || "Non indicato",
        collaboratore: nomeCollaboratore(collaboratore, input),
        tipologia: etichetta(item.tipologia),
        descrizione: item.descrizione,
        imponibile: parseImporto(item.imponibile),
        cassa: parseImporto(item.cassa),
        iva: parseImporto(item.iva),
        ritenuta: parseImporto(item.ritenuta),
        bollo: parseImporto(item.bollo),
        totale: parseImporto(item.totale),
        stato: etichetta(item.stato),
        profilo: nomeProfilo(item.profilo_fiscale_id, input.profili),
        override: item.override_fiscale ? "Sì" : "No",
        note: item.note || "",
        allegato: item.allegato_nome || item.allegato_url || "",
      };
    }),
  });

  creaFoglioTabella(workbook, input, {
    nome: "Incassi e pagamenti",
    titolo: "Movimenti finanziari: incassi e pagamenti",
    sottotitolo: sottotitoloBase,
    colonne: [
      { chiave: "data", titolo: "Data", larghezza: 13, tipo: "data" },
      { chiave: "direzione", titolo: "Direzione", larghezza: 13 },
      { chiave: "tipologia", titolo: "Tipologia", larghezza: 24 },
      { chiave: "soggetto", titolo: "Soggetto", larghezza: 25 },
      { chiave: "causale", titolo: "Causale", larghezza: 33 },
      { chiave: "importo", titolo: "Importo", larghezza: 17, tipo: "valuta" },
      { chiave: "imponibile", titolo: "Imponibile", larghezza: 16, tipo: "valuta" },
      { chiave: "cassa", titolo: "Cassa", larghezza: 14, tipo: "valuta" },
      { chiave: "iva", titolo: "IVA", larghezza: 14, tipo: "valuta" },
      { chiave: "modalita", titolo: "Modalità", larghezza: 17 },
      { chiave: "conto", titolo: "Conto/Cassa", larghezza: 18 },
      { chiave: "stato", titolo: "Riconciliazione", larghezza: 24 },
      { chiave: "riferimento", titolo: "Collaboratore / Costo", larghezza: 29 },
      { chiave: "anticipo", titolo: "Anticipo da fatturare", larghezza: 17, tipo: "booleano" },
      { chiave: "note", titolo: "Note", larghezza: 28 },
      { chiave: "allegato", titolo: "Allegato", larghezza: 23 },
    ],
    righe: workspace.movimenti.map((item) => {
      const collaboratore = workspace.collaboratori.find((value) => value.id === item.collaboratore_id);
      const costo = workspace.costiProgetto.find((value) => value.id === item.costo_progetto_id);
      return {
        data: dataExcel(item.data_movimento),
        direzione: item.direzione === "entrata" ? "Entrata" : "Uscita",
        tipologia: etichetta(item.tipologia),
        soggetto: item.soggetto,
        causale: item.causale,
        importo: parseImporto(item.importo),
        imponibile: parseImporto(item.imponibile),
        cassa: parseImporto(item.cassa),
        iva: parseImporto(item.iva),
        modalita: etichetta(item.modalita),
        conto: item.conto_cassa,
        stato: etichetta(item.stato_riconciliazione),
        riferimento: collaboratore ? nomeCollaboratore(collaboratore, input) : costo?.descrizione || "",
        anticipo: item.anticipo_da_fatturare ? "Sì" : "No",
        note: item.note || "",
        allegato: item.allegato_nome || item.allegato_url || "",
      };
    }),
  });

  creaFoglioTabella(workbook, input, {
    nome: "Riconciliazioni",
    titolo: "Allocazioni e riconciliazioni dei movimenti",
    sottotitolo: sottotitoloBase,
    colonne: [
      { chiave: "data", titolo: "Data movimento", larghezza: 15, tipo: "data" },
      { chiave: "movimento", titolo: "Movimento", larghezza: 35 },
      { chiave: "direzione", titolo: "Direzione", larghezza: 13 },
      { chiave: "documento", titolo: "Documento associato", larghezza: 31 },
      { chiave: "tipoDocumento", titolo: "Tipo documento", larghezza: 20 },
      { chiave: "importo", titolo: "Importo allocato", larghezza: 20, tipo: "valuta" },
      { chiave: "eccedenza", titolo: "Eccedenza consentita", larghezza: 18, tipo: "booleano" },
      { chiave: "creata", titolo: "Registrata il", larghezza: 18, tipo: "dataOra" },
    ],
    righe: workspace.allocazioni.map((item) => {
      const movimento = workspace.movimenti.find((value) => value.id === item.movimento_id);
      const documentoAttivo = workspace.documentiAttivi.find((value) => value.id === item.documento_attivo_id);
      const documentoCosto = workspace.documentiCollaboratori.find(
        (value) => value.id === item.documento_collaboratore_id
      );
      return {
        data: dataExcel(movimento?.data_movimento),
        movimento: movimento ? `${movimento.causale} · ${movimento.soggetto}` : "Movimento non trovato",
        direzione: movimento?.direzione === "entrata" ? "Entrata" : "Uscita",
        documento:
          documentoAttivo?.numero ||
          documentoAttivo?.descrizione ||
          documentoCosto?.numero ||
          documentoCosto?.descrizione ||
          "Non indicato",
        tipoDocumento: documentoAttivo ? "Documento attivo" : documentoCosto ? "Documento costo" : "Non indicato",
        importo: parseImporto(item.importo),
        eccedenza: item.consenti_eccedenza ? "Sì" : "No",
        creata: dataExcel(item.created_at),
      };
    }),
  });

  creaFoglioTabella(workbook, input, {
    nome: "Anomalie",
    titolo: "Anomalie e verifiche economiche",
    sottotitolo: sottotitoloBase,
    colonne: [
      { chiave: "data", titolo: "Data", larghezza: 14, tipo: "data" },
      { chiave: "tipologia", titolo: "Tipologia", larghezza: 26 },
      { chiave: "gravita", titolo: "Gravità", larghezza: 15 },
      { chiave: "descrizione", titolo: "Descrizione", larghezza: 49 },
      { chiave: "stato", titolo: "Stato", larghezza: 18 },
      { chiave: "azione", titolo: "Azione suggerita", larghezza: 42 },
      { chiave: "motivazione", titolo: "Motivazione", larghezza: 34 },
      { chiave: "aggiornata", titolo: "Aggiornata il", larghezza: 18, tipo: "dataOra" },
    ],
    righe: workspace.anomalie.map((item) => ({
      data: dataExcel(item.data_anomalia),
      tipologia: etichetta(item.tipologia),
      gravita: etichetta(item.gravita),
      descrizione: item.descrizione,
      stato: etichetta(item.stato),
      azione: item.azione_suggerita || "",
      motivazione: item.motivazione_ignorata || "",
      aggiornata: dataExcel(item.updated_at || item.created_at),
    })),
  });
}

export async function creaFileExcelCommessa(input: DatiExportCommessa) {
  const excelJsModule = await import("exceljs");
  const ExcelJS =
    (excelJsModule as unknown as { default?: typeof import("exceljs") }).default ||
    excelJsModule;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "FIDEPA S.R.L.";
  workbook.company = "FIDEPA S.R.L.";
  workbook.subject = `Gestione economica commessa ${input.commessa.codice || input.commessa.titolo}`;
  workbook.title = `Economia commessa ${input.commessa.codice || input.commessa.titolo}`;
  workbook.description = "Riepilogo completo della gestione economica della commessa.";
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.calcProperties.fullCalcOnLoad = true;

  creaRiepilogo(workbook, input);
  aggiungiFogli(workbook, input);

  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer).buffer;
}

function nomeFile(input: DatiExportCommessa) {
  const riferimento = `${input.commessa.codice || "commessa"}-${input.commessa.titolo}`
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
  return `FIDEPA-${riferimento || "commessa"}-economia.xlsx`;
}

export async function esportaExcelCommessa(input: DatiExportCommessa) {
  const contenuto = await creaFileExcelCommessa(input);
  const blob = new Blob([contenuto], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeFile(input);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
