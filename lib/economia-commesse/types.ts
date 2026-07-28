export type MoneyValue = number | string | null | undefined;

export type TipoVariazione = "aumento" | "diminuzione";
export type TipoDocumentoAttivo =
  | "proforma"
  | "fattura"
  | "fattura_acconto"
  | "nota_credito"
  | "richiesta_pagamento"
  | "rimborso_spese"
  | "altro";
export type StatoDocumento =
  | "bozza"
  | "da_emettere"
  | "emesso"
  | "parzialmente_pagato"
  | "pagato"
  | "annullato"
  | "scaduto";
export type DirezioneMovimento = "entrata" | "uscita";
export type TipoMovimento =
  | "incasso_cliente"
  | "pagamento_collaboratore"
  | "rimborso"
  | "anticipo"
  | "storno"
  | "altro";
export type ModalitaPagamento =
  | "bonifico"
  | "contanti"
  | "carta"
  | "assegno"
  | "compensazione"
  | "altro";
export type StatoRiconciliazione =
  | "riconciliato"
  | "parzialmente_riconciliato"
  | "da_associare"
  | "da_documentare"
  | "anomalia"
  | "annullato"
  | "da_verificare";
export type ModalitaCalcoloCollaboratore =
  | "importo_fisso"
  | "percentuale_compenso"
  | "percentuale_quota_fidepa"
  | "importo_sal"
  | "altro";
export type StatoAnomalia =
  | "aperta"
  | "in_lavorazione"
  | "risolta"
  | "ignorata";
export type GravitaAnomalia = "informativa" | "attenzione" | "critica";

export type CommessaEconomica = {
  id: string;
  titolo: string;
  codice: string | null;
  cliente_nome: string | null;
  data_inizio: string | null;
  data_fine: string | null;
  created_at: string;
};

export type PersonaEconomica = {
  id: string;
  nome: string;
  email: string | null;
  colore: string;
  attivo: boolean;
  economia_cassa_attiva: boolean;
  economia_cassa_aliquota: MoneyValue;
  economia_iva_attiva: boolean;
  economia_iva_aliquota: MoneyValue;
};

export type PreventivoEconomico = {
  numero: string;
  cliente: string | null;
  oggetto: string | null;
  imponibile: MoneyValue;
  cassa: MoneyValue;
  iva: MoneyValue;
  sconto: MoneyValue;
  totale: MoneyValue;
  data: string | null;
  lavorazioni: Array<Record<string, unknown>>;
  pagamento: Record<string, unknown> | null;
};

export type SchedaEconomica = {
  id: string;
  commessa_id: string;
  anno: number;
  compenso: MoneyValue;
  compenso_iniziale: MoneyValue;
  preventivo_numero: string | null;
  rimborso_spese: MoneyValue;
  trattenuta_percentuale: MoneyValue;
  trattenuta_fisso_percentuale: MoneyValue;
  trattenuta_operativo_percentuale: MoneyValue;
  cassa: MoneyValue;
  iva: MoneyValue;
  fatturato_come_ing_pascale: boolean | null;
  soggetto_fiscale_id: string | null;
  note: string | null;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
};

export type SoggettoFiscale = {
  id: string;
  nome: string;
  intestazione: string | null;
  cassa_aliquota: MoneyValue;
  iva_aliquota: MoneyValue;
  ritenuta_aliquota: MoneyValue;
  attivo: boolean;
};

export type ProfiloFiscale = {
  id: string;
  codice: string;
  nome: string;
  cassa_aliquota: MoneyValue;
  iva_aliquota: MoneyValue;
  ritenuta_aliquota: MoneyValue;
  bollo: MoneyValue;
  cassa_base: "imponibile" | "nessuna";
  iva_base: "imponibile" | "imponibile_cassa" | "nessuna";
  ritenuta_base: "imponibile" | "imponibile_cassa" | "nessuna";
  descrizione_regime: string | null;
  attivo: boolean;
};

export type VariazioneEconomica = {
  id: string;
  economia_commessa_id: string;
  data_variazione: string;
  descrizione: string;
  importo: MoneyValue;
  tipologia: TipoVariazione;
  documento_attivo_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
};

export type RigaDocumentoAttivo = {
  id: string;
  documento_attivo_id: string;
  descrizione: string;
  imponibile: MoneyValue;
  cassa_aliquota: MoneyValue;
  cassa: MoneyValue;
  iva_aliquota: MoneyValue;
  iva: MoneyValue;
  ritenuta_aliquota: MoneyValue;
  ritenuta: MoneyValue;
  bollo: MoneyValue;
  totale: MoneyValue;
  ordine: number;
  override_fiscale: boolean;
  deleted_at: string | null;
};

export type DocumentoAttivo = {
  id: string;
  economia_commessa_id: string;
  numero: string | null;
  data_documento: string;
  tipologia: TipoDocumentoAttivo;
  soggetto_fiscale_id: string | null;
  cliente: string;
  descrizione: string;
  imponibile: MoneyValue;
  cassa: MoneyValue;
  iva: MoneyValue;
  ritenuta: MoneyValue;
  bollo: MoneyValue;
  totale: MoneyValue;
  scadenza: string | null;
  stato: StatoDocumento;
  rilevanza_fiscale: boolean;
  note: string | null;
  allegato_nome: string | null;
  allegato_url: string | null;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
};

export type CollaboratoreAssegnato = {
  id: string;
  economia_commessa_id: string;
  persona_id: string | null;
  collaboratore_esterno_nome: string | null;
  tipo: "personale" | "esterno";
  compenso: MoneyValue;
  percentuale: MoneyValue;
  modalita_calcolo: ModalitaCalcoloCollaboratore;
  profilo_fiscale_id: string | null;
  cassa_aliquota: MoneyValue;
  iva_aliquota: MoneyValue;
  cassa: MoneyValue;
  iva: MoneyValue;
  note: string | null;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
};

export type DocumentoCollaboratore = {
  id: string;
  collaboratore_id: string;
  data_documento: string;
  numero: string | null;
  tipologia: string;
  descrizione: string;
  imponibile: MoneyValue;
  cassa_aliquota: MoneyValue;
  cassa: MoneyValue;
  iva_aliquota: MoneyValue;
  iva: MoneyValue;
  ritenuta_aliquota: MoneyValue;
  ritenuta: MoneyValue;
  bollo: MoneyValue;
  totale: MoneyValue;
  stato: StatoDocumento;
  profilo_fiscale_id: string | null;
  override_fiscale: boolean;
  override_fiscale_by: string | null;
  override_fiscale_at: string | null;
  valori_fiscali_precedenti: Record<string, unknown> | null;
  allegato_nome: string | null;
  allegato_url: string | null;
  note: string | null;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
};

export type MovimentoFinanziario = {
  id: string;
  economia_commessa_id: string;
  direzione: DirezioneMovimento;
  tipologia: TipoMovimento;
  collaboratore_id: string | null;
  costo_progetto_id: string | null;
  data_movimento: string;
  importo: MoneyValue;
  imponibile?: MoneyValue;
  cassa_aliquota?: MoneyValue;
  cassa?: MoneyValue;
  iva_aliquota?: MoneyValue;
  iva?: MoneyValue;
  modalita: ModalitaPagamento;
  soggetto: string;
  conto_cassa: string;
  causale: string;
  note: string | null;
  stato_riconciliazione: StatoRiconciliazione;
  anticipo_da_fatturare: boolean;
  allegato_nome?: string | null;
  allegato_url?: string | null;
  legacy_source: string | null;
  legacy_id: string | null;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
};

export type AllocazioneMovimento = {
  id: string;
  movimento_id: string;
  documento_attivo_id: string | null;
  documento_collaboratore_id: string | null;
  importo: MoneyValue;
  consenti_eccedenza: boolean;
  created_at: string;
  deleted_at: string | null;
};

export type AnomaliaEconomica = {
  id: string;
  economia_commessa_id: string;
  tipologia: string;
  gravita: GravitaAnomalia;
  descrizione: string;
  data_anomalia: string;
  entita_tipo: string;
  entita_id: string | null;
  stato: StatoAnomalia;
  azione_suggerita: string | null;
  motivazione_ignorata: string | null;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
};

export type CostoProgettoLegacy = {
  id: string;
  economia_commessa_id: string;
  descrizione: string;
  importo: MoneyValue;
  cassa: MoneyValue;
  iva: MoneyValue;
};

export type WorkspaceEconomico = {
  variazioni: VariazioneEconomica[];
  documentiAttivi: DocumentoAttivo[];
  righeDocumentiAttivi: RigaDocumentoAttivo[];
  collaboratori: CollaboratoreAssegnato[];
  documentiCollaboratori: DocumentoCollaboratore[];
  movimenti: MovimentoFinanziario[];
  allocazioni: AllocazioneMovimento[];
  anomalie: AnomaliaEconomica[];
  costiProgetto: CostoProgettoLegacy[];
};

export type RigaFiscaleInput = {
  imponibile: MoneyValue;
  cassaAliquota: MoneyValue;
  ivaAliquota: MoneyValue;
  ritenutaAliquota: MoneyValue;
  bollo?: MoneyValue;
  cassaBase?: ProfiloFiscale["cassa_base"];
  ivaBase?: ProfiloFiscale["iva_base"];
  ritenutaBase?: ProfiloFiscale["ritenuta_base"];
};

export type RiepilogoEconomico = {
  valoreIniziale: number;
  variazioniAumento: number;
  variazioniDiminuzione: number;
  variazioniNette: number;
  rimborsiPrevisti: number;
  valoreAggiornato: number;
  costiPrevisti: number;
  costiPagati: number;
  costiDaPagare: number;
  marginePrevisto: number;
  margineAttuale: number;
  ricaviDocumentati: number;
  costiDocumentati: number;
  residuoDaFatturare: number;
  fattureDaIncassare: number;
  documentiCollaboratoriDaRicevere: number;
  documentiCollaboratoriDaPagare: number;
  margineDocumentato: number;
  incassiTotali: number;
  daIncassare: number;
  pagamentiTotali: number;
  incassiRiconciliati: number;
  incassiDaDocumentare: number;
  pagamentiRiconciliati: number;
  pagamentiDaDocumentare: number;
  pagatoCollaboratori: number;
  cassaIncassata: number;
  cassaPagata: number;
  cassaDaVersare: number;
  ivaIncassata: number;
  ivaPagata: number;
  ivaDaVersare: number;
  saldoFinanziario: number;
};
