import { parseImporto } from "@/lib/importi";
import type {
  AllocazioneMovimento,
  CollaboratoreAssegnato,
  DocumentoAttivo,
  DocumentoCollaboratore,
  MovimentoFinanziario,
  MoneyValue,
  PersonaEconomica,
  ProfiloFiscale,
  RigaFiscaleInput,
  RiepilogoEconomico,
  SchedaEconomica,
  VariazioneEconomica,
  CostoProgettoLegacy,
} from "./types";

export function inCentesimi(value: MoneyValue) {
  return Math.round(parseImporto(value) * 100);
}

export function daCentesimi(value: number) {
  return Math.round(value) / 100;
}

export function arrotondaImporto(value: MoneyValue) {
  return daCentesimi(inCentesimi(value));
}

export function sommaImporti(values: MoneyValue[]) {
  return daCentesimi(
    values.reduce<number>((totale, value) => totale + inCentesimi(value), 0)
  );
}

export function percentualeImporto(base: MoneyValue, aliquota: MoneyValue) {
  const baseCentesimi = inCentesimi(base);
  const aliquotaBasisPoint = Math.round(parseImporto(aliquota) * 100);
  return daCentesimi(Math.round((baseCentesimi * aliquotaBasisPoint) / 10_000));
}

export function calcolaQuoteTrattenutaFidepa(input: {
  valoreTotale: MoneyValue;
  fissoPercentuale: MoneyValue;
  operativoPercentuale: MoneyValue;
}) {
  const quotaFisso = percentualeImporto(
    input.valoreTotale,
    input.fissoPercentuale
  );
  const quotaOperativo = percentualeImporto(
    input.valoreTotale,
    input.operativoPercentuale
  );

  return {
    quotaFisso,
    quotaOperativo,
    quotaTotale: sommaImporti([quotaFisso, quotaOperativo]),
  };
}

export function aliquotePagamentoCollaboratore(input: {
  tipo: CollaboratoreAssegnato["tipo"];
  conFattura: boolean;
  cassaSalvata: MoneyValue;
  ivaSalvata: MoneyValue;
  persona?: Pick<
    PersonaEconomica,
    | "economia_cassa_attiva"
    | "economia_cassa_aliquota"
    | "economia_iva_attiva"
    | "economia_iva_aliquota"
  > | null;
  profilo?: Pick<ProfiloFiscale, "cassa_aliquota" | "iva_aliquota"> | null;
}) {
  if (!input.conFattura) {
    return { cassaAliquota: 0, ivaAliquota: 0 };
  }

  if (input.tipo === "personale") {
    if (input.persona) {
      return {
        cassaAliquota: input.persona.economia_cassa_attiva
          ? parseImporto(input.persona.economia_cassa_aliquota)
          : 0,
        ivaAliquota: input.persona.economia_iva_attiva
          ? parseImporto(input.persona.economia_iva_aliquota)
          : 0,
      };
    }

    return {
      cassaAliquota: parseImporto(input.cassaSalvata),
      ivaAliquota: parseImporto(input.ivaSalvata),
    };
  }

  return {
    cassaAliquota: parseImporto(input.profilo?.cassa_aliquota),
    ivaAliquota: parseImporto(input.profilo?.iva_aliquota),
  };
}

export function calcolaRigaFiscale(input: RigaFiscaleInput) {
  const imponibile = inCentesimi(input.imponibile);
  const aliquotaCassa = Math.round(parseImporto(input.cassaAliquota) * 100);
  const aliquotaIva = Math.round(parseImporto(input.ivaAliquota) * 100);
  const aliquotaRitenuta = Math.round(parseImporto(input.ritenutaAliquota) * 100);
  const cassaBase = input.cassaBase || "imponibile";
  const ivaBase = input.ivaBase || "imponibile_cassa";
  const ritenutaBase = input.ritenutaBase || "imponibile";
  const cassa =
    cassaBase === "nessuna"
      ? 0
      : Math.round((imponibile * aliquotaCassa) / 10_000);
  const baseIva =
    ivaBase === "nessuna"
      ? 0
      : imponibile + (ivaBase === "imponibile_cassa" ? cassa : 0);
  const iva = Math.round((baseIva * aliquotaIva) / 10_000);
  const baseRitenuta =
    ritenutaBase === "nessuna"
      ? 0
      : imponibile + (ritenutaBase === "imponibile_cassa" ? cassa : 0);
  const ritenuta = Math.round((baseRitenuta * aliquotaRitenuta) / 10_000);
  const bollo = inCentesimi(input.bollo);

  return {
    imponibile: daCentesimi(imponibile),
    cassa: daCentesimi(cassa),
    iva: daCentesimi(iva),
    ritenuta: daCentesimi(ritenuta),
    bollo: daCentesimi(bollo),
    totale: daCentesimi(imponibile + cassa + iva - ritenuta + bollo),
  };
}

export function documentoFiscalmenteRilevante(documento: DocumentoAttivo) {
  return (
    documento.rilevanza_fiscale &&
    !["bozza", "da_emettere", "annullato"].includes(documento.stato)
  );
}

export function documentoCollaboratoreRilevante(
  documento: DocumentoCollaboratore
) {
  return !["bozza", "da_emettere", "annullato"].includes(documento.stato);
}

function segnoDocumento(documento: DocumentoAttivo) {
  return documento.tipologia === "nota_credito" ? -1 : 1;
}

function movimentoAttivo(movimento: MovimentoFinanziario) {
  return movimento.stato_riconciliazione !== "annullato" && !movimento.deleted_at;
}

function allocatoMovimento(
  movimentoId: string,
  allocazioni: AllocazioneMovimento[]
) {
  return allocazioni
    .filter((item) => item.movimento_id === movimentoId && !item.deleted_at)
    .reduce((totale, item) => totale + inCentesimi(item.importo), 0);
}

function componentiFiscaliMovimento(
  movimento: MovimentoFinanziario,
  allocazioni: AllocazioneMovimento[],
  documentiAttivi: DocumentoAttivo[],
  documentiCollaboratori: DocumentoCollaboratore[]
) {
  if (movimento.imponibile != null) {
    return {
      cassa: inCentesimi(movimento.cassa),
      iva: inCentesimi(movimento.iva),
    };
  }

  let cassa = 0;
  let iva = 0;
  allocazioni
    .filter((item) => item.movimento_id === movimento.id && !item.deleted_at)
    .forEach((allocazione) => {
      const documento = movimento.direzione === "entrata"
        ? documentiAttivi.find(
            (item) =>
              item.id === allocazione.documento_attivo_id &&
              documentoFiscalmenteRilevante(item)
          )
        : documentiCollaboratori.find(
            (item) =>
              item.id === allocazione.documento_collaboratore_id &&
              documentoCollaboratoreRilevante(item)
          );
      if (!documento) return;
      const totaleDocumento = inCentesimi(documento.totale);
      if (totaleDocumento <= 0) return;
      const importoAllocato = Math.min(
        totaleDocumento,
        inCentesimi(allocazione.importo)
      );
      cassa += Math.round(
        (inCentesimi(documento.cassa) * importoAllocato) / totaleDocumento
      );
      iva += Math.round(
        (inCentesimi(documento.iva) * importoAllocato) / totaleDocumento
      );
    });

  return { cassa, iva };
}

export function calcolaRiepilogoEconomico(input: {
  scheda: SchedaEconomica;
  variazioni: VariazioneEconomica[];
  documentiAttivi: DocumentoAttivo[];
  collaboratori: CollaboratoreAssegnato[];
  documentiCollaboratori: DocumentoCollaboratore[];
  movimenti: MovimentoFinanziario[];
  allocazioni: AllocazioneMovimento[];
  costiProgetto: CostoProgettoLegacy[];
}): RiepilogoEconomico {
  const variazioniAttive = input.variazioni.filter((item) => !item.deleted_at);
  const aumento = variazioniAttive
    .filter((item) => item.tipologia === "aumento")
    .reduce((totale, item) => totale + inCentesimi(item.importo), 0);
  const diminuzione = variazioniAttive
    .filter((item) => item.tipologia === "diminuzione")
    .reduce((totale, item) => totale + inCentesimi(item.importo), 0);
  // I vecchi rimborsi vengono assorbiti nell'imponibile per mantenere invariati
  // i totali delle schede già salvate dopo la semplificazione del quadro.
  const valoreIniziale =
    inCentesimi(input.scheda.compenso_iniziale ?? input.scheda.compenso) +
    inCentesimi(input.scheda.rimborso_spese);
  const rimborsi = 0;
  const valoreAggiornato = valoreIniziale + aumento - diminuzione;

  const costiCollaboratori = input.collaboratori
    .filter((item) => !item.deleted_at)
    .reduce((totale, item) => totale + inCentesimi(item.compenso), 0);
  const costiProgetto = input.costiProgetto.reduce(
    (totale, item) =>
      totale + inCentesimi(item.importo) + inCentesimi(item.cassa),
    0
  );
  const costiPrevisti = costiCollaboratori + costiProgetto;

  const ricaviDocumentati = input.documentiAttivi
    .filter(documentoFiscalmenteRilevante)
    .reduce(
      (totale, item) => totale + segnoDocumento(item) * inCentesimi(item.imponibile),
      0
    );
  const totaleDocumentiAttivi = input.documentiAttivi
    .filter(documentoFiscalmenteRilevante)
    .reduce(
      (totale, item) => totale + segnoDocumento(item) * inCentesimi(item.totale),
      0
    );
  const costiDocumentati = input.documentiCollaboratori
    .filter(documentoCollaboratoreRilevante)
    .reduce((totale, item) => totale + inCentesimi(item.imponibile), 0);
  const totaleDocumentiCollaboratori = input.documentiCollaboratori
    .filter(documentoCollaboratoreRilevante)
    .reduce((totale, item) => totale + inCentesimi(item.totale), 0);

  let incassiTotali = 0;
  let pagamentiTotali = 0;
  let incassiRiconciliati = 0;
  let pagamentiRiconciliati = 0;
  let pagatoCollaboratori = 0;
  let cassaIncassata = 0;
  let cassaPagata = 0;
  let ivaIncassata = 0;
  let ivaPagata = 0;

  input.movimenti.filter(movimentoAttivo).forEach((movimento) => {
    const importo = inCentesimi(movimento.importo);
    const incassoSemplificato =
      movimento.direzione === "entrata" && movimento.imponibile != null;
    const allocato = incassoSemplificato
      ? importo
      : Math.min(importo, allocatoMovimento(movimento.id, input.allocazioni));
    const componentiFiscali = componentiFiscaliMovimento(
      movimento,
      input.allocazioni,
      input.documentiAttivi,
      input.documentiCollaboratori
    );

    if (movimento.direzione === "entrata") {
      incassiTotali += importo;
      incassiRiconciliati += allocato;
      cassaIncassata += componentiFiscali.cassa;
      ivaIncassata += componentiFiscali.iva;
    } else {
      pagamentiTotali += importo;
      pagamentiRiconciliati += allocato;
      cassaPagata += componentiFiscali.cassa;
      ivaPagata += componentiFiscali.iva;
      if (movimento.collaboratore_id) pagatoCollaboratori += importo;
    }
  });

  const movimentiAttiviIds = new Set(
    input.movimenti.filter(movimentoAttivo).map((item) => item.id)
  );
  const documentiAttiviAllocati = input.allocazioni
    .filter(
      (item) =>
        item.documento_attivo_id &&
        !item.deleted_at &&
        movimentiAttiviIds.has(item.movimento_id)
    )
    .reduce((totale, item) => totale + inCentesimi(item.importo), 0);
  const documentiCollaboratoriAllocati = input.allocazioni
    .filter(
      (item) =>
        item.documento_collaboratore_id &&
        !item.deleted_at &&
        movimentiAttiviIds.has(item.movimento_id)
    )
    .reduce((totale, item) => totale + inCentesimi(item.importo), 0);

  return {
    valoreIniziale: daCentesimi(valoreIniziale),
    variazioniAumento: daCentesimi(aumento),
    variazioniDiminuzione: daCentesimi(diminuzione),
    variazioniNette: daCentesimi(aumento - diminuzione),
    rimborsiPrevisti: daCentesimi(rimborsi),
    valoreAggiornato: daCentesimi(valoreAggiornato),
    costiPrevisti: daCentesimi(costiPrevisti),
    costiPagati: daCentesimi(pagamentiTotali),
    costiDaPagare: daCentesimi(Math.max(0, costiPrevisti - pagamentiTotali)),
    marginePrevisto: daCentesimi(valoreAggiornato - costiPrevisti),
    margineAttuale: daCentesimi(valoreAggiornato - pagamentiTotali),
    ricaviDocumentati: daCentesimi(ricaviDocumentati),
    costiDocumentati: daCentesimi(costiDocumentati),
    residuoDaFatturare: daCentesimi(valoreAggiornato - ricaviDocumentati),
    fattureDaIncassare: daCentesimi(
      Math.max(0, totaleDocumentiAttivi - documentiAttiviAllocati)
    ),
    documentiCollaboratoriDaRicevere: daCentesimi(
      Math.max(0, costiCollaboratori - costiDocumentati)
    ),
    documentiCollaboratoriDaPagare: daCentesimi(
      Math.max(0, totaleDocumentiCollaboratori - documentiCollaboratoriAllocati)
    ),
    margineDocumentato: daCentesimi(ricaviDocumentati - costiDocumentati),
    incassiTotali: daCentesimi(incassiTotali),
    daIncassare: daCentesimi(Math.max(0, valoreAggiornato - incassiTotali)),
    pagamentiTotali: daCentesimi(pagamentiTotali),
    incassiRiconciliati: daCentesimi(incassiRiconciliati),
    incassiDaDocumentare: daCentesimi(Math.max(0, incassiTotali - incassiRiconciliati)),
    pagamentiRiconciliati: daCentesimi(pagamentiRiconciliati),
    pagamentiDaDocumentare: daCentesimi(
      Math.max(0, pagamentiTotali - pagamentiRiconciliati)
    ),
    pagatoCollaboratori: daCentesimi(pagatoCollaboratori),
    cassaIncassata: daCentesimi(cassaIncassata),
    cassaPagata: daCentesimi(cassaPagata),
    cassaDaVersare: daCentesimi(cassaIncassata - cassaPagata),
    ivaIncassata: daCentesimi(ivaIncassata),
    ivaPagata: daCentesimi(ivaPagata),
    ivaDaVersare: daCentesimi(ivaIncassata - ivaPagata),
    saldoFinanziario: daCentesimi(incassiTotali - pagamentiTotali),
  };
}

export function calcolaCompensoCollaboratore(input: {
  modalita: CollaboratoreAssegnato["modalita_calcolo"];
  importo: MoneyValue;
  percentuale: MoneyValue;
  valoreCommessa: MoneyValue;
  quotaFidepa: MoneyValue;
}) {
  if (input.modalita === "percentuale_compenso") {
    return percentualeImporto(input.valoreCommessa, input.percentuale);
  }
  if (input.modalita === "percentuale_quota_fidepa") {
    return percentualeImporto(input.quotaFidepa, input.percentuale);
  }
  return arrotondaImporto(input.importo);
}
