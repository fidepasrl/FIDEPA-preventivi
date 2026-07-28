export type StatoCollaborazione = "attiva" | "sospesa" | "terminata";
export type LivelloInteresse = "basso" | "medio" | "alto";
export type PrioritaRappresentante = "bassa" | "normale" | "alta" | "urgente";
export type TipoContatto =
  | "telefonata"
  | "email"
  | "riunione"
  | "visita"
  | "videoconferenza"
  | "messaggio"
  | "altro";

export type CategoriaRappresentante = {
  id: string;
  nome: string;
  slug: string;
  descrizione: string | null;
  colore: string;
  parent_id: string | null;
  ordine: number;
  active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  conteggio_rappresentanti?: number;
  conteggio_aziende?: number;
  conteggio_prodotti?: number;
};

export type AziendaRappresentata = {
  id: string;
  ragione_sociale: string;
  nome_commerciale: string | null;
  logo_url: string | null;
  partita_iva: string | null;
  codice_fiscale: string | null;
  sito_web: string | null;
  email: string | null;
  pec: string | null;
  telefono: string | null;
  indirizzo: string | null;
  comune: string | null;
  provincia: string | null;
  regione: string | null;
  nazione: string | null;
  descrizione: string | null;
  note: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  categorie: CategoriaRappresentante[];
  prodotti?: ProdottoRappresentato[];
  rappresentanti?: RappresentanteSintetico[];
};

export type ProdottoRappresentato = {
  id: string;
  azienda_id: string;
  nome: string;
  descrizione: string | null;
  codice: string | null;
  immagine_url: string | null;
  link_prodotto: string | null;
  scheda_tecnica_url: string | null;
  catalogo_url: string | null;
  note: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  azienda: AziendaRappresentata | null;
  categorie: CategoriaRappresentante[];
  rappresentanti?: RappresentanteSintetico[];
};

export type AssociazioneAziendaForm = {
  id?: string;
  azienda_id: string;
  referente_interno: string;
  note: string;
  area_territoriale: string;
  data_inizio: string;
  data_fine: string;
  stato_collaborazione: StatoCollaborazione;
  active: boolean;
  prodotto_ids: string[];
};

export type AssociazioneAzienda = AssociazioneAziendaForm & {
  id: string;
  rappresentante_id: string;
  azienda: AziendaRappresentata;
  prodotti: ProdottoRappresentato[];
};

export type RappresentanteSintetico = {
  id: string;
  nome: string;
  cognome: string;
  ruolo: string | null;
  cellulare: string | null;
  email: string | null;
  regione: string | null;
  active: boolean;
};

export type Rappresentante = RappresentanteSintetico & {
  azienda_personale: string | null;
  avatar_url: string | null;
  telefono_secondario: string | null;
  email_secondaria: string | null;
  sito_web: string | null;
  linkedin_url: string | null;
  indirizzo: string | null;
  comune: string | null;
  provincia: string | null;
  cap: string | null;
  area_competenza: string | null;
  zona_commerciale: string | null;
  province_servite: string[];
  condizioni_commerciali: string | null;
  sconto_abituale: number | null;
  tempi_consegna: string | null;
  modalita_contatto_preferita: string | null;
  disponibilita_sopralluoghi: boolean;
  note_commerciali: string | null;
  livello_interesse: LivelloInteresse;
  priorita: PrioritaRappresentante;
  note_generali: string | null;
  ultimo_contatto_at: string | null;
  prossimo_ricontatto_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  aziende: AssociazioneAzienda[];
  categorie: CategoriaRappresentante[];
  prodotti: ProdottoRappresentato[];
  tag: TagRappresentante[];
};

export type RappresentanteFormData = {
  nome: string;
  cognome: string;
  ruolo: string;
  azienda_personale: string;
  avatar_url: string;
  active: boolean;
  cellulare: string;
  telefono_secondario: string;
  email: string;
  email_secondaria: string;
  sito_web: string;
  linkedin_url: string;
  indirizzo: string;
  comune: string;
  provincia: string;
  regione: string;
  cap: string;
  area_competenza: string;
  zona_commerciale: string;
  province_servite: string;
  condizioni_commerciali: string;
  sconto_abituale: string;
  tempi_consegna: string;
  modalita_contatto_preferita: string;
  disponibilita_sopralluoghi: boolean;
  note_commerciali: string;
  livello_interesse: LivelloInteresse;
  priorita: PrioritaRappresentante;
  note_generali: string;
  tag_ids: string[];
  aziende: AssociazioneAziendaForm[];
};

export type ContattoRappresentante = {
  id: string;
  rappresentante_id: string;
  data_contatto: string;
  tipo: TipoContatto;
  oggetto: string;
  descrizione: string | null;
  esito: string | null;
  prossima_azione: string | null;
  prossimo_ricontatto_at: string | null;
  utente_nome: string | null;
  created_at: string;
};

export type NotaRappresentante = {
  id: string;
  rappresentante_id: string;
  testo: string;
  created_at: string;
  updated_at: string;
};

export type AllegatoRappresentante = {
  id: string;
  rappresentante_id: string | null;
  azienda_id: string | null;
  prodotto_id: string | null;
  nome: string;
  tipo_mime: string | null;
  dimensione: number;
  storage_path: string;
  categoria_documento: string;
  created_at: string;
};

export type TagRappresentante = {
  id: string;
  nome: string;
  colore: string;
  active: boolean;
};

export type FiltriRappresentanti = {
  categoria_id: string;
  azienda_id: string;
  prodotto_id: string;
  regione: string;
  provincia: string;
  stato: "tutti" | "attivi" | "non_attivi";
  email: "tutti" | "presente" | "assente";
  telefono: "tutti" | "presente" | "assente";
  ultimo_contatto: "tutti" | "30" | "90" | "oltre_90" | "mai";
};

export type OrdinamentoRappresentanti =
  | "nome"
  | "azienda"
  | "ultimo_contatto"
  | "created_at"
  | "updated_at";

export const FILTRI_RAPPRESENTANTI_INIZIALI: FiltriRappresentanti = {
  categoria_id: "",
  azienda_id: "",
  prodotto_id: "",
  regione: "",
  provincia: "",
  stato: "tutti",
  email: "tutti",
  telefono: "tutti",
  ultimo_contatto: "tutti",
};

export const RAPPRESENTANTE_FORM_INIZIALE: RappresentanteFormData = {
  nome: "",
  cognome: "",
  ruolo: "",
  azienda_personale: "",
  avatar_url: "",
  active: true,
  cellulare: "",
  telefono_secondario: "",
  email: "",
  email_secondaria: "",
  sito_web: "",
  linkedin_url: "",
  indirizzo: "",
  comune: "",
  provincia: "",
  regione: "",
  cap: "",
  area_competenza: "",
  zona_commerciale: "",
  province_servite: "",
  condizioni_commerciali: "",
  sconto_abituale: "",
  tempi_consegna: "",
  modalita_contatto_preferita: "",
  disponibilita_sopralluoghi: false,
  note_commerciali: "",
  livello_interesse: "medio",
  priorita: "normale",
  note_generali: "",
  tag_ids: [],
  aziende: [],
};
