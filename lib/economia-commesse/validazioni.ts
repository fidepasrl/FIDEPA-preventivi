import { inCentesimi } from "./calcoli";
import type {
  AllocazioneMovimento,
  DocumentoAttivo,
  DocumentoCollaboratore,
  MovimentoFinanziario,
  MoneyValue,
} from "./types";

export type ErroreValidazione = { campo: string; messaggio: string };

function dataValida(value: string | null | undefined) {
  return Boolean(value && !Number.isNaN(new Date(`${value}T00:00:00`).getTime()));
}

export function validaAliquota(value: MoneyValue, campo: string) {
  const aliquota = Number(value || 0);
  if (!Number.isFinite(aliquota) || aliquota < 0 || aliquota > 100) {
    return { campo, messaggio: "Inserisci un'aliquota compresa tra 0 e 100." };
  }
  return null;
}

export function validaMovimento(
  movimento: Pick<
    MovimentoFinanziario,
    | "importo"
    | "data_movimento"
    | "causale"
    | "soggetto"
    | "conto_cassa"
    | "stato_riconciliazione"
  >,
  totaleAllocato = 0
) {
  const errori: ErroreValidazione[] = [];
  if (inCentesimi(movimento.importo) <= 0) {
    errori.push({ campo: "importo", messaggio: "L'importo deve essere maggiore di zero." });
  }
  if (!dataValida(movimento.data_movimento)) {
    errori.push({ campo: "data_movimento", messaggio: "Inserisci una data valida." });
  }
  if (!movimento.causale.trim()) {
    errori.push({ campo: "causale", messaggio: "La causale è obbligatoria." });
  }
  if (!movimento.soggetto.trim()) {
    errori.push({ campo: "soggetto", messaggio: "Indica il soggetto del movimento." });
  }
  if (!movimento.conto_cassa.trim()) {
    errori.push({ campo: "conto_cassa", messaggio: "Indica il conto o la cassa." });
  }
  if (movimento.stato_riconciliazione === "riconciliato" && totaleAllocato <= 0) {
    errori.push({
      campo: "stato_riconciliazione",
      messaggio: "Un movimento riconciliato deve essere associato a un documento.",
    });
  }
  return errori;
}

export function validaDocumento(input: {
  data: string;
  descrizione: string;
  imponibile: MoneyValue;
  totale: MoneyValue;
  stato: string;
}) {
  const errori: ErroreValidazione[] = [];
  if (!dataValida(input.data)) {
    errori.push({ campo: "data", messaggio: "Inserisci una data valida." });
  }
  if (!input.descrizione.trim()) {
    errori.push({ campo: "descrizione", messaggio: "La descrizione è obbligatoria." });
  }
  if (inCentesimi(input.imponibile) <= 0 && input.stato !== "annullato") {
    errori.push({ campo: "imponibile", messaggio: "L'imponibile deve essere maggiore di zero." });
  }
  if (inCentesimi(input.totale) <= 0 && input.stato !== "annullato") {
    errori.push({ campo: "totale", messaggio: "Il totale deve essere maggiore di zero." });
  }
  return errori;
}

export function validaAllocazioni(input: {
  movimento: MovimentoFinanziario;
  allocazioni: Array<Pick<AllocazioneMovimento, "importo" | "documento_attivo_id" | "documento_collaboratore_id" | "consenti_eccedenza">>;
  documentiAttivi: DocumentoAttivo[];
  documentiCollaboratori: DocumentoCollaboratore[];
  allocazioniEsistenti: AllocazioneMovimento[];
}) {
  const errori: ErroreValidazione[] = [];
  const totale = input.allocazioni.reduce(
    (somma, item) => somma + inCentesimi(item.importo),
    0
  );
  if (totale > inCentesimi(input.movimento.importo)) {
    errori.push({
      campo: "allocazioni",
      messaggio: "La somma delle allocazioni supera l'importo del movimento.",
    });
  }

  input.allocazioni.forEach((allocazione, indice) => {
    if (inCentesimi(allocazione.importo) <= 0) {
      errori.push({
        campo: `allocazioni.${indice}.importo`,
        messaggio: "L'importo allocato deve essere maggiore di zero.",
      });
    }
    const destinazioni = [
      allocazione.documento_attivo_id,
      allocazione.documento_collaboratore_id,
    ].filter(Boolean);
    if (destinazioni.length !== 1) {
      errori.push({
        campo: `allocazioni.${indice}.documento`,
        messaggio: "Seleziona un solo documento da associare.",
      });
      return;
    }

    const documento = allocazione.documento_attivo_id
      ? input.documentiAttivi.find(
          (item) => item.id === allocazione.documento_attivo_id
        )
      : input.documentiCollaboratori.find(
          (item) => item.id === allocazione.documento_collaboratore_id
        );
    if (!documento) return;

    const giaAllocato = input.allocazioniEsistenti
      .filter(
        (item) =>
          item.movimento_id !== input.movimento.id &&
          !item.deleted_at &&
          (item.documento_attivo_id === allocazione.documento_attivo_id ||
            item.documento_collaboratore_id ===
              allocazione.documento_collaboratore_id)
      )
      .reduce((somma, item) => somma + inCentesimi(item.importo), 0);
    const eccedenza =
      giaAllocato + inCentesimi(allocazione.importo) > inCentesimi(documento.totale);
    if (eccedenza && !allocazione.consenti_eccedenza) {
      errori.push({
        campo: `allocazioni.${indice}.importo`,
        messaggio:
          "L'associazione supera il residuo del documento. Conferma esplicitamente l'eccedenza.",
      });
    }
  });
  return errori;
}

export function validaMotivazioneAnomalia(stato: string, motivazione: string) {
  if (stato === "ignorata" && !motivazione.trim()) {
    return {
      campo: "motivazione_ignorata",
      messaggio: "Inserisci una motivazione per ignorare l'anomalia.",
    };
  }
  return null;
}
