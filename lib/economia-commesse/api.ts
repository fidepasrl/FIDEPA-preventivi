import { supabase } from "@/lib/supabase";
import type {
  AllocazioneMovimento,
  AnomaliaEconomica,
  CollaboratoreAssegnato,
  CommessaEconomica,
  CostoProgettoLegacy,
  DocumentoAttivo,
  DocumentoCollaboratore,
  MovimentoFinanziario,
  PersonaEconomica,
  ProfessionistaEconomico,
  PreventivoEconomico,
  ProfiloFiscale,
  RigaDocumentoAttivo,
  SchedaEconomica,
  SoggettoFiscale,
  StatoAnomalia,
  VariazioneEconomica,
  WorkspaceEconomico,
} from "./types";
import { sommaImporti } from "./calcoli";

export type RigaDocumentoDaSalvare = Omit<
  RigaDocumentoAttivo,
  "id" | "documento_attivo_id" | "deleted_at"
>;

const WORKSPACE_VUOTO: WorkspaceEconomico = {
  variazioni: [],
  documentiAttivi: [],
  righeDocumentiAttivi: [],
  collaboratori: [],
  documentiCollaboratori: [],
  movimenti: [],
  allocazioni: [],
  anomalie: [],
  costiProgetto: [],
};

function assicuratiNessunErrore(error: { message: string } | null, contesto: string) {
  if (error) throw new Error(`${contesto}: ${error.message}`);
}

export async function caricaAllegatoEconomico(
  file: File,
  economiaId: string,
  categoria: "documenti-attivi" | "documenti-collaboratori" | "movimenti"
) {
  if (file.size > 20 * 1024 * 1024) {
    throw new Error("L'allegato non può superare 20 MB.");
  }
  const nomeSicuro = file.name
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "allegato";
  const percorso = `${economiaId}/${categoria}/${crypto.randomUUID()}-${nomeSicuro}`;
  const { error } = await supabase.storage
    .from("economia-documenti")
    .upload(percorso, file, { upsert: false });
  assicuratiNessunErrore(error, "Caricamento allegato");
  return { nome: file.name, percorso };
}

export async function creaUrlAllegatoEconomico(percorso: string) {
  if (/^https?:\/\//i.test(percorso)) return percorso;
  const { data, error } = await supabase.storage
    .from("economia-documenti")
    .createSignedUrl(percorso, 60);
  assicuratiNessunErrore(error, "Apertura allegato");
  if (!data?.signedUrl) throw new Error("Apertura allegato: URL temporaneo non disponibile.");
  return data.signedUrl;
}

export async function aggiornaAllegatoMovimento(
  id: string,
  allegatoNome: string,
  allegatoUrl: string
) {
  const userId = await utenteCorrente();
  const { error } = await supabase
    .from("economia_movimenti_finanziari")
    .update({
      allegato_nome: allegatoNome,
      allegato_url: allegatoUrl,
      updated_by: userId,
    })
    .eq("id", id);
  assicuratiNessunErrore(error, "Salvataggio allegato incasso");
}

async function utenteCorrente() {
  const { data, error } = await supabase.auth.getUser();
  assicuratiNessunErrore(error, "Impossibile identificare l'utente");
  return data.user?.id || null;
}

export async function caricaIndiceEconomia(anno: number) {
  const [commesseRes, economiaRes] = await Promise.all([
    supabase
      .from("commesse")
      .select("id, titolo, codice, cliente_nome, data_inizio, data_fine, created_at")
      .eq("lavoro_privato_non_fidepa", false)
      .order("codice", { ascending: false, nullsFirst: false }),
    supabase
      .from("economia_commesse")
      .select("*")
      .eq("anno", anno)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
  ]);
  assicuratiNessunErrore(commesseRes.error, "Caricamento commesse");
  assicuratiNessunErrore(economiaRes.error, "Caricamento schede economiche");
  return {
    commesse: (commesseRes.data || []) as CommessaEconomica[],
    schede: (economiaRes.data || []) as SchedaEconomica[],
  };
}

export async function caricaOpzioniEconomia() {
  const [
    personaleRes,
    professionistiRes,
    soggettiRes,
    profiliRes,
    preventiviRes,
  ] = await Promise.all([
    supabase
      .from("personale")
      .select("id, nome, email, colore, attivo, economia_cassa_attiva, economia_cassa_aliquota, economia_iva_attiva, economia_iva_aliquota")
      .eq("attivo", true)
      .order("nome"),
    supabase
      .from("professionisti")
      .select("id, nome, cognome, professione, partita_iva, pec")
      .order("cognome")
      .order("nome"),
    supabase
      .from("economia_soggetti_fiscali")
      .select("*")
      .eq("attivo", true)
      .is("deleted_at", null)
      .order("nome"),
    supabase
      .from("economia_profili_fiscali")
      .select("*")
      .eq("attivo", true)
      .is("deleted_at", null)
      .order("nome"),
    supabase
      .from("preventivi")
      .select("numero, cliente, oggetto, imponibile, cassa, iva, sconto, totale, data, lavorazioni, pagamento")
      .order("created_at", { ascending: false })
      .limit(200),
  ]);
  assicuratiNessunErrore(personaleRes.error, "Caricamento personale");
  assicuratiNessunErrore(
    professionistiRes.error,
    "Caricamento rubrica professionisti"
  );
  assicuratiNessunErrore(soggettiRes.error, "Caricamento soggetti fiscali");
  assicuratiNessunErrore(profiliRes.error, "Caricamento profili fiscali");
  assicuratiNessunErrore(preventiviRes.error, "Caricamento preventivi");
  return {
    personale: (personaleRes.data || []) as PersonaEconomica[],
    professionisti: (professionistiRes.data || []) as ProfessionistaEconomico[],
    soggetti: (soggettiRes.data || []) as SoggettoFiscale[],
    profili: (profiliRes.data || []) as ProfiloFiscale[],
    preventivi: (preventiviRes.data || []) as PreventivoEconomico[],
  };
}

export async function caricaWorkspaceEconomico(economiaId: string) {
  if (!economiaId) return { ...WORKSPACE_VUOTO };

  const [
    variazioniRes,
    documentiRes,
    collaboratoriRes,
    movimentiRes,
    anomalieRes,
    costiRes,
  ] = await Promise.all([
    supabase
      .from("economia_commesse_variazioni")
      .select("*")
      .eq("economia_commessa_id", economiaId)
      .is("deleted_at", null)
      .order("data_variazione"),
    supabase
      .from("economia_documenti_attivi")
      .select("*")
      .eq("economia_commessa_id", economiaId)
      .is("deleted_at", null)
      .order("data_documento", { ascending: false }),
    supabase
      .from("economia_commesse_collaboratori")
      .select("*")
      .eq("economia_commessa_id", economiaId)
      .is("deleted_at", null)
      .order("created_at"),
    supabase
      .from("economia_movimenti_finanziari")
      .select("*")
      .eq("economia_commessa_id", economiaId)
      .is("deleted_at", null)
      .order("data_movimento", { ascending: false }),
    supabase
      .from("economia_anomalie")
      .select("*")
      .eq("economia_commessa_id", economiaId)
      .is("deleted_at", null)
      .order("data_anomalia", { ascending: false }),
    supabase
      .from("economia_commesse_costi")
      .select("id, economia_commessa_id, descrizione, importo, cassa, iva")
      .eq("economia_commessa_id", economiaId)
      .is("deleted_at", null)
      .order("created_at"),
  ]);

  [
    [variazioniRes.error, "Caricamento variazioni"],
    [documentiRes.error, "Caricamento documenti attivi"],
    [collaboratoriRes.error, "Caricamento collaboratori"],
    [movimentiRes.error, "Caricamento movimenti"],
    [anomalieRes.error, "Caricamento anomalie"],
    [costiRes.error, "Caricamento costi progetto"],
  ].forEach(([error, contesto]) =>
    assicuratiNessunErrore(error as { message: string } | null, contesto as string)
  );

  const documenti = (documentiRes.data || []) as DocumentoAttivo[];
  const collaboratori = (collaboratoriRes.data || []) as CollaboratoreAssegnato[];
  const movimenti = (movimentiRes.data || []) as MovimentoFinanziario[];
  const documentoIds = documenti.map((item) => item.id);
  const collaboratoreIds = collaboratori.map((item) => item.id);
  const movimentoIds = movimenti.map((item) => item.id);

  const [righeRes, documentiCollaboratoriRes, allocazioniRes] = await Promise.all([
    documentoIds.length
      ? supabase
          .from("economia_documenti_attivi_righe")
          .select("*")
          .in("documento_attivo_id", documentoIds)
          .is("deleted_at", null)
          .order("ordine")
      : Promise.resolve({ data: [], error: null }),
    collaboratoreIds.length
      ? supabase
          .from("economia_documenti_collaboratori")
          .select("*")
          .in("collaboratore_id", collaboratoreIds)
          .is("deleted_at", null)
          .order("data_documento", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    movimentoIds.length
      ? supabase
          .from("economia_allocazioni_movimenti")
          .select("*")
          .in("movimento_id", movimentoIds)
          .is("deleted_at", null)
          .order("created_at")
      : Promise.resolve({ data: [], error: null }),
  ]);
  assicuratiNessunErrore(righeRes.error, "Caricamento righe documenti");
  assicuratiNessunErrore(
    documentiCollaboratoriRes.error,
    "Caricamento documenti collaboratori"
  );
  assicuratiNessunErrore(allocazioniRes.error, "Caricamento riconciliazioni");

  return {
    variazioni: (variazioniRes.data || []) as VariazioneEconomica[],
    documentiAttivi: documenti,
    righeDocumentiAttivi: (righeRes.data || []) as RigaDocumentoAttivo[],
    collaboratori,
    documentiCollaboratori: (documentiCollaboratoriRes.data || []) as DocumentoCollaboratore[],
    movimenti,
    allocazioni: (allocazioniRes.data || []) as AllocazioneMovimento[],
    anomalie: (anomalieRes.data || []) as AnomaliaEconomica[],
    costiProgetto: (costiRes.data || []) as CostoProgettoLegacy[],
  } satisfies WorkspaceEconomico;
}

export async function salvaSchedaEconomica(input: {
  id?: string;
  commessa_id: string;
  anno: number;
  compenso_iniziale: number;
  compenso_legacy: number;
  preventivo_numero: string | null;
  rimborso_spese: number;
  trattenuta_fisso_percentuale: number;
  trattenuta_operativo_percentuale: number;
  soggetto_fiscale_id: string | null;
  note: string | null;
}) {
  const userId = await utenteCorrente();
  const comune = {
    anno: input.anno,
    compenso: input.compenso_legacy,
    compenso_iniziale: input.compenso_iniziale,
    preventivo_numero: input.preventivo_numero,
    rimborso_spese: input.rimborso_spese,
    trattenuta_percentuale: sommaImporti([
      input.trattenuta_fisso_percentuale,
      input.trattenuta_operativo_percentuale,
    ]),
    trattenuta_fisso_percentuale: input.trattenuta_fisso_percentuale,
    trattenuta_operativo_percentuale: input.trattenuta_operativo_percentuale,
    soggetto_fiscale_id: input.soggetto_fiscale_id,
    note: input.note,
    updated_by: userId,
    updated_at: new Date().toISOString(),
  };

  const richiesta = input.id
    ? supabase
        .from("economia_commesse")
        .update(comune)
        .eq("id", input.id)
        .select()
        .single()
    : supabase
        .from("economia_commesse")
        .insert({
          ...comune,
          commessa_id: input.commessa_id,
          created_by: userId,
        })
        .select()
        .single();
  const { data, error } = await richiesta;
  assicuratiNessunErrore(error, "Salvataggio quadro economico");
  return data as SchedaEconomica;
}

export async function salvaVariazione(
  input: Omit<
    VariazioneEconomica,
    "id" | "created_at" | "updated_at" | "deleted_at" | "created_by"
  > & { id?: string }
) {
  const userId = await utenteCorrente();
  const payload = {
    economia_commessa_id: input.economia_commessa_id,
    data_variazione: input.data_variazione,
    descrizione: input.descrizione.trim(),
    importo: input.importo,
    tipologia: input.tipologia,
    documento_attivo_id: input.documento_attivo_id || null,
    updated_by: userId,
  };
  const richiesta = input.id
    ? supabase
        .from("economia_commesse_variazioni")
        .update(payload)
        .eq("id", input.id)
        .select()
        .single()
    : supabase
        .from("economia_commesse_variazioni")
        .insert({ ...payload, created_by: userId })
        .select()
        .single();
  const { data, error } = await richiesta;
  assicuratiNessunErrore(error, "Salvataggio variazione");
  const tipologiaAnomalia = "variazione_non_documentata";
  const { data: anomalie, error: anomalieError } = await supabase
    .from("economia_anomalie")
    .select("id, stato")
    .eq("tipologia", tipologiaAnomalia)
    .eq("entita_tipo", "variazione_economica")
    .eq("entita_id", data.id)
    .is("deleted_at", null);
  assicuratiNessunErrore(anomalieError, "Controllo anomalia variazione");
  const anomalia = anomalie?.[0];
  if (!data.documento_attivo_id && !anomalia) {
    const { error: inserimentoAnomaliaError } = await supabase
      .from("economia_anomalie")
      .insert({
        economia_commessa_id: data.economia_commessa_id,
        tipologia: tipologiaAnomalia,
        gravita: "attenzione",
        descrizione: "Variazione economica non ancora collegata a un documento.",
        data_anomalia: data.data_variazione,
        entita_tipo: "variazione_economica",
        entita_id: data.id,
        stato: "aperta",
        azione_suggerita: "Associa la variazione al documento che la giustifica.",
      });
    assicuratiNessunErrore(
      inserimentoAnomaliaError,
      "Creazione anomalia variazione"
    );
  } else if (data.documento_attivo_id && anomalia && anomalia.stato !== "risolta") {
    const { error: risoluzioneError } = await supabase
      .from("economia_anomalie")
      .update({ stato: "risolta", updated_by: userId })
      .eq("id", anomalia.id);
    assicuratiNessunErrore(risoluzioneError, "Risoluzione anomalia variazione");
  }
}

export async function eliminaVariazione(id: string) {
  const userId = await utenteCorrente();
  const { error } = await supabase
    .from("economia_commesse_variazioni")
    .update({ deleted_at: new Date().toISOString(), updated_by: userId })
    .eq("id", id);
  assicuratiNessunErrore(error, "Archiviazione variazione");
}

export async function salvaDocumentoAttivo(input: {
  documento: Omit<DocumentoAttivo, "created_at" | "updated_at" | "deleted_at"> & {
    id?: string;
  };
  righe: RigaDocumentoDaSalvare[];
}) {
  const userId = await utenteCorrente();
  const duplicatoQuery = supabase
    .from("economia_documenti_attivi")
    .select("id")
    .eq("economia_commessa_id", input.documento.economia_commessa_id)
    .eq("soggetto_fiscale_id", input.documento.soggetto_fiscale_id || "00000000-0000-0000-0000-000000000000")
    .eq("numero", input.documento.numero || "")
    .is("deleted_at", null);
  const { data: duplicati, error: duplicatiError } = await duplicatoQuery;
  if (duplicatiError && duplicatiError.code !== "22P02") {
    assicuratiNessunErrore(duplicatiError, "Controllo duplicati documento");
  }
  if (
    input.documento.numero &&
    (duplicati || []).some((item) => item.id !== input.documento.id)
  ) {
    throw new Error("Esiste già un documento con lo stesso numero e soggetto fiscale.");
  }

  const { id, ...campiDocumento } = input.documento;
  const richiesta = id
    ? supabase
        .from("economia_documenti_attivi")
        .update({ ...campiDocumento, updated_by: userId })
        .eq("id", id)
        .select()
        .single()
    : supabase
        .from("economia_documenti_attivi")
        .insert({ ...campiDocumento, created_by: userId, updated_by: userId })
        .select()
        .single();
  const { data, error } = await richiesta;
  assicuratiNessunErrore(error, "Salvataggio documento attivo");
  const documentoId = data.id as string;

  if (id) {
    const { error: righeVecchieError } = await supabase
      .from("economia_documenti_attivi_righe")
      .update({ deleted_at: new Date().toISOString(), updated_by: userId })
      .eq("documento_attivo_id", documentoId)
      .is("deleted_at", null);
    assicuratiNessunErrore(righeVecchieError, "Archiviazione righe precedenti");
  }
  if (input.righe.length) {
    const { error: righeError } = await supabase
      .from("economia_documenti_attivi_righe")
      .insert(
        input.righe.map((riga) => ({
          ...riga,
          documento_attivo_id: documentoId,
          created_by: userId,
          updated_by: userId,
        }))
      );
    assicuratiNessunErrore(righeError, "Salvataggio righe documento");
  }
  return data as DocumentoAttivo;
}

export async function annullaDocumentoAttivo(id: string) {
  const userId = await utenteCorrente();
  const { error } = await supabase
    .from("economia_documenti_attivi")
    .update({ stato: "annullato", updated_by: userId })
    .eq("id", id);
  assicuratiNessunErrore(error, "Annullamento documento");
}

export async function salvaCollaboratore(
  input: Omit<CollaboratoreAssegnato, "created_at" | "updated_at" | "deleted_at"> & {
    id?: string;
  }
) {
  const userId = await utenteCorrente();
  const { id, ...campi } = input;
  const richiesta = id
    ? supabase
        .from("economia_commesse_collaboratori")
        .update({ ...campi, updated_by: userId })
        .eq("id", id)
        .select()
        .single()
    : supabase
        .from("economia_commesse_collaboratori")
        .insert({ ...campi, created_by: userId, updated_by: userId })
        .select()
        .single();
  const { data, error } = await richiesta;
  assicuratiNessunErrore(error, "Salvataggio collaboratore");
  return data as CollaboratoreAssegnato;
}

export async function archiviaCollaboratore(id: string) {
  const userId = await utenteCorrente();
  const { error } = await supabase
    .from("economia_commesse_collaboratori")
    .update({ deleted_at: new Date().toISOString(), updated_by: userId })
    .eq("id", id);
  assicuratiNessunErrore(error, "Archiviazione collaboratore");
}

export async function salvaCostoProgetto(
  input: Omit<CostoProgettoLegacy, "id"> & { id?: string }
) {
  const userId = await utenteCorrente();
  const { id, ...campi } = input;
  const richiesta = id
    ? supabase
        .from("economia_commesse_costi")
        .update({ ...campi, updated_by: userId })
        .eq("id", id)
    : supabase
        .from("economia_commesse_costi")
        .insert({ ...campi, created_by: userId, updated_by: userId });
  const { error } = await richiesta;
  assicuratiNessunErrore(error, "Salvataggio costo progetto");
}

export async function archiviaCostoProgetto(id: string) {
  const userId = await utenteCorrente();
  const { error } = await supabase
    .from("economia_commesse_costi")
    .update({ deleted_at: new Date().toISOString(), updated_by: userId })
    .eq("id", id);
  assicuratiNessunErrore(error, "Archiviazione costo progetto");
}

export async function salvaDocumentoCollaboratore(
  input: Omit<DocumentoCollaboratore, "created_at" | "updated_at" | "deleted_at"> & {
    id?: string;
  }
) {
  const userId = await utenteCorrente();
  if (input.numero) {
    const { data: duplicati, error: duplicatiError } = await supabase
      .from("economia_documenti_collaboratori")
      .select("id")
      .eq("collaboratore_id", input.collaboratore_id)
      .eq("numero", input.numero)
      .is("deleted_at", null);
    assicuratiNessunErrore(duplicatiError, "Controllo duplicati documento collaboratore");
    if ((duplicati || []).some((item) => item.id !== input.id)) {
      throw new Error("Esiste già un documento con lo stesso numero per questo collaboratore.");
    }
  }
  const { id, ...campi } = input;
  const payload = {
    ...campi,
    override_fiscale_by: campi.override_fiscale ? userId : null,
    override_fiscale_at: campi.override_fiscale
      ? campi.override_fiscale_at || new Date().toISOString()
      : null,
  };
  const richiesta = id
    ? supabase
        .from("economia_documenti_collaboratori")
        .update({ ...payload, updated_by: userId })
        .eq("id", id)
        .select()
        .single()
    : supabase
        .from("economia_documenti_collaboratori")
        .insert({ ...payload, created_by: userId, updated_by: userId })
        .select()
        .single();
  const { data, error } = await richiesta;
  assicuratiNessunErrore(error, "Salvataggio documento collaboratore");
  const documentoId = data.id as string;
  if (id) {
    const { error: righeVecchieError } = await supabase
      .from("economia_documenti_collaboratori_righe")
      .update({ deleted_at: new Date().toISOString(), updated_by: userId })
      .eq("documento_collaboratore_id", documentoId)
      .is("deleted_at", null);
    assicuratiNessunErrore(
      righeVecchieError,
      "Archiviazione riga documento collaboratore"
    );
  }
  const { error: rigaError } = await supabase
    .from("economia_documenti_collaboratori_righe")
    .insert({
      documento_collaboratore_id: documentoId,
      descrizione: payload.descrizione,
      imponibile: payload.imponibile,
      cassa_aliquota: payload.cassa_aliquota,
      cassa: payload.cassa,
      iva_aliquota: payload.iva_aliquota,
      iva: payload.iva,
      ritenuta_aliquota: payload.ritenuta_aliquota,
      ritenuta: payload.ritenuta,
      bollo: payload.bollo,
      totale: payload.totale,
      ordine: 0,
      override_fiscale: payload.override_fiscale,
      created_by: userId,
      updated_by: userId,
    });
  assicuratiNessunErrore(rigaError, "Salvataggio riga documento collaboratore");

  if (payload.override_fiscale) {
    const collaboratore = await supabase
      .from("economia_commesse_collaboratori")
      .select("economia_commessa_id")
      .eq("id", payload.collaboratore_id)
      .single();
    assicuratiNessunErrore(
      collaboratore.error,
      "Caricamento commessa del collaboratore"
    );
    if (!collaboratore.data) {
      throw new Error("Collaboratore non trovato durante la registrazione dell'override fiscale.");
    }
    const { data: anomaliaEsistente, error: anomaliaError } = await supabase
      .from("economia_anomalie")
      .select("id")
      .eq("tipologia", "override_fiscale_manual")
      .eq("entita_tipo", "documento_collaboratore")
      .eq("entita_id", documentoId)
      .is("deleted_at", null);
    assicuratiNessunErrore(anomaliaError, "Controllo anomalia override fiscale");
    if (!anomaliaEsistente?.length) {
      const { error: insertAnomaliaError } = await supabase
        .from("economia_anomalie")
        .insert({
          economia_commessa_id: collaboratore.data.economia_commessa_id,
          tipologia: "override_fiscale_manual",
          gravita: "informativa",
          descrizione: "Il trattamento fiscale del documento è stato modificato manualmente.",
          data_anomalia: payload.data_documento,
          entita_tipo: "documento_collaboratore",
          entita_id: documentoId,
          stato: "aperta",
          azione_suggerita: "Verifica le aliquote impostate rispetto al profilo fiscale.",
        });
      assicuratiNessunErrore(
        insertAnomaliaError,
        "Creazione anomalia override fiscale"
      );
    }
  }
  return data as DocumentoCollaboratore;
}

export async function annullaDocumentoCollaboratore(id: string) {
  const userId = await utenteCorrente();
  const { error } = await supabase
    .from("economia_documenti_collaboratori")
    .update({ stato: "annullato", updated_by: userId })
    .eq("id", id);
  assicuratiNessunErrore(error, "Annullamento documento collaboratore");
}

async function sincronizzaAnomaliaMovimento(movimento: MovimentoFinanziario) {
  const aperta = !["riconciliato", "annullato"].includes(
    movimento.stato_riconciliazione
  );
  const tipologia =
    movimento.direzione === "entrata"
      ? "incasso_senza_documento"
      : "pagamento_senza_documento";
  const { data: esistenti, error } = await supabase
    .from("economia_anomalie")
    .select("id, stato")
    .eq("entita_tipo", "movimento_finanziario")
    .eq("entita_id", movimento.id)
    .eq("tipologia", tipologia)
    .is("deleted_at", null);
  assicuratiNessunErrore(error, "Controllo anomalia movimento");
  const esistente = esistenti?.[0];
  if (aperta && !esistente) {
    const { error: insertError } = await supabase.from("economia_anomalie").insert({
      economia_commessa_id: movimento.economia_commessa_id,
      tipologia,
      gravita: "attenzione",
      descrizione:
        movimento.direzione === "entrata"
          ? "Incasso senza documento completamente associato."
          : "Documento di costo mancante o pagamento non completamente associato.",
      data_anomalia: movimento.data_movimento,
      entita_tipo: "movimento_finanziario",
      entita_id: movimento.id,
      stato: "aperta",
      azione_suggerita:
        movimento.direzione === "entrata"
          ? "Associa a documento esistente, crea il documento o classifica come anticipo."
          : "Associa a documento, inserisci il documento o classifica come anticipo.",
    });
    assicuratiNessunErrore(insertError, "Creazione anomalia movimento");
  } else if (aperta && esistente && !["aperta", "in_lavorazione"].includes(esistente.stato)) {
    const { error: reopenError } = await supabase
      .from("economia_anomalie")
      .update({ stato: "aperta", motivazione_ignorata: null })
      .eq("id", esistente.id);
    assicuratiNessunErrore(reopenError, "Riapertura anomalia movimento");
  } else if (!aperta && esistente && esistente.stato !== "risolta") {
    const { error: updateError } = await supabase
      .from("economia_anomalie")
      .update({ stato: "risolta", updated_at: new Date().toISOString() })
      .eq("id", esistente.id);
    assicuratiNessunErrore(updateError, "Risoluzione anomalia movimento");
  }
}

export async function salvaMovimento(
  input: Omit<MovimentoFinanziario, "created_at" | "updated_at" | "deleted_at"> & {
    id?: string;
  }
) {
  const userId = await utenteCorrente();
  const { id, ...campi } = input;
  const richiesta = id
    ? supabase
        .from("economia_movimenti_finanziari")
        .update({ ...campi, updated_by: userId })
        .eq("id", id)
        .select()
        .single()
    : supabase
        .from("economia_movimenti_finanziari")
        .insert({ ...campi, created_by: userId, updated_by: userId })
        .select()
        .single();
  const risultato = await richiesta;
  assicuratiNessunErrore(
    risultato.error,
    "Salvataggio movimento finanziario"
  );
  let data = risultato.data;
  const { data: allocazioni, error: allocazioniError } = await supabase
    .from("economia_allocazioni_movimenti")
    .select("importo")
    .eq("movimento_id", data.id)
    .is("deleted_at", null);
  assicuratiNessunErrore(allocazioniError, "Controllo allocazioni movimento");
  const totaleAllocato = (allocazioni || []).reduce(
    (totale, item) => totale + Number(item.importo || 0),
    0
  );
  const importoMovimento = Number(data.importo || 0);
  const statoCorretto =
    data.stato_riconciliazione === "annullato"
      ? "annullato"
      : data.direzione === "entrata" && data.imponibile != null
        ? "riconciliato"
      : totaleAllocato <= 0
        ? data.anticipo_da_fatturare
          ? "da_associare"
          : "da_documentare"
        : totaleAllocato < importoMovimento
          ? "parzialmente_riconciliato"
          : "riconciliato";
  if (statoCorretto !== data.stato_riconciliazione) {
    const aggiornamento = await supabase
      .from("economia_movimenti_finanziari")
      .update({ stato_riconciliazione: statoCorretto, updated_by: userId })
      .eq("id", data.id)
      .select()
      .single();
    assicuratiNessunErrore(
      aggiornamento.error,
      "Aggiornamento stato del movimento"
    );
    data = aggiornamento.data;
  }
  await sincronizzaAnomaliaMovimento(data as MovimentoFinanziario);
  return data as MovimentoFinanziario;
}

export async function annullaMovimento(id: string) {
  const userId = await utenteCorrente();
  const { error: allocazioniError } = await supabase.rpc(
    "economia_sostituisci_allocazioni",
    { p_movimento_id: id, p_allocazioni: [] }
  );
  assicuratiNessunErrore(
    allocazioniError,
    "Scollegamento documenti dal movimento annullato"
  );
  const { data, error } = await supabase
    .from("economia_movimenti_finanziari")
    .update({ stato_riconciliazione: "annullato", updated_by: userId })
    .eq("id", id)
    .select()
    .single();
  assicuratiNessunErrore(error, "Annullamento movimento");
  await sincronizzaAnomaliaMovimento(data as MovimentoFinanziario);
}

export async function sostituisciAllocazioniMovimento(
  movimento: MovimentoFinanziario,
  allocazioni: Array<
    Pick<
      AllocazioneMovimento,
      | "documento_attivo_id"
      | "documento_collaboratore_id"
      | "importo"
      | "consenti_eccedenza"
    >
  >
) {
  const { error: rpcError } = await supabase.rpc(
    "economia_sostituisci_allocazioni",
    {
      p_movimento_id: movimento.id,
      p_allocazioni: allocazioni,
    }
  );
  assicuratiNessunErrore(rpcError, "Salvataggio riconciliazioni");
  const { data, error } = await supabase
    .from("economia_movimenti_finanziari")
    .select("*")
    .eq("id", movimento.id)
    .single();
  assicuratiNessunErrore(error, "Ricaricamento movimento riconciliato");
  await sincronizzaAnomaliaMovimento(data as MovimentoFinanziario);
}

export async function aggiornaStatoAnomalia(
  anomalia: AnomaliaEconomica,
  stato: StatoAnomalia,
  motivazione: string
) {
  const userId = await utenteCorrente();
  const { error } = await supabase
    .from("economia_anomalie")
    .update({
      stato,
      motivazione_ignorata: stato === "ignorata" ? motivazione.trim() : null,
      updated_by: userId,
    })
    .eq("id", anomalia.id);
  assicuratiNessunErrore(error, "Aggiornamento anomalia");
}
