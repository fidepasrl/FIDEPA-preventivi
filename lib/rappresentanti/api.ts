import { supabase } from "@/lib/supabase";
import type {
  AllegatoRappresentante,
  AssociazioneAzienda,
  AssociazioneAziendaForm,
  AziendaRappresentata,
  CategoriaRappresentante,
  ContattoRappresentante,
  NotaRappresentante,
  ProdottoRappresentato,
  Rappresentante,
  RappresentanteFormData,
  TagRappresentante,
  TipoContatto,
} from "@/lib/rappresentanti/types";
import {
  normalizzaTelefono,
  normalizzaUrl,
  slugCategoria,
} from "@/lib/rappresentanti/utils";

type DbRecord = Record<string, unknown>;

function record(valore: unknown): DbRecord | null {
  if (!valore || typeof valore !== "object" || Array.isArray(valore)) return null;
  return valore as DbRecord;
}

function relazioneSingola(valore: unknown) {
  return record(Array.isArray(valore) ? valore[0] : valore);
}

function records(valore: unknown) {
  return Array.isArray(valore)
    ? valore.map(record).filter((item): item is DbRecord => Boolean(item))
    : [];
}

function categorieDaJoin(valore: unknown) {
  return records(valore)
    .map((item) => relazioneSingola(item.categorie_rappresentanti))
    .filter((item): item is DbRecord => Boolean(item))
    .map((item) => item as unknown as CategoriaRappresentante);
}

function normalizzaAzienda(row: DbRecord): AziendaRappresentata {
  return {
    ...(row as unknown as AziendaRappresentata),
    categorie: categorieDaJoin(row.aziende_categorie_rappresentanti),
  };
}

function normalizzaProdotto(row: DbRecord): ProdottoRappresentato {
  const aziendaRow = relazioneSingola(row.aziende_rappresentate);
  return {
    ...(row as unknown as ProdottoRappresentato),
    azienda: aziendaRow ? normalizzaAzienda(aziendaRow) : null,
    categorie: categorieDaJoin(row.prodotti_categorie_rappresentanti),
  };
}

function deduplicaPerId<T extends { id: string }>(elementi: T[]) {
  return Array.from(new Map(elementi.map((item) => [item.id, item])).values());
}

function normalizzaRappresentante(row: DbRecord): Rappresentante {
  const aziende: AssociazioneAzienda[] = records(row.rappresentanti_aziende).map(
    (associazione) => {
      const aziendaRow = relazioneSingola(associazione.aziende_rappresentate);
      const azienda = aziendaRow
        ? normalizzaAzienda(aziendaRow)
        : ({} as AziendaRappresentata);
      const prodotti = records(
        associazione.rappresentanti_aziende_prodotti
      )
        .map((item) => relazioneSingola(item.prodotti_rappresentati))
        .filter((item): item is DbRecord => Boolean(item))
        .map(normalizzaProdotto);

      return {
        ...(associazione as unknown as AssociazioneAzienda),
        azienda_id: String(associazione.azienda_id || azienda.id || ""),
        azienda,
        prodotti,
        prodotto_ids: prodotti.map((item) => item.id),
      };
    }
  );
  const prodotti = deduplicaPerId(aziende.flatMap((item) => item.prodotti));
  const categorie = deduplicaPerId([
    ...aziende.flatMap((item) => item.azienda.categorie || []),
    ...prodotti.flatMap((item) => item.categorie),
  ]);
  const tag = records(row.rappresentanti_tag)
    .map((item) => relazioneSingola(item.tag_rappresentanti))
    .filter((item): item is DbRecord => Boolean(item))
    .map((item) => item as unknown as TagRappresentante);

  return {
    ...(row as unknown as Rappresentante),
    province_servite: Array.isArray(row.province_servite)
      ? row.province_servite.map(String)
      : [],
    aziende,
    prodotti,
    categorie,
    tag,
  };
}

const SELECT_AZIENDA = `
  *,
  aziende_categorie_rappresentanti (
    categorie_rappresentanti (*)
  )
`;

const SELECT_PRODOTTO = `
  *,
  aziende_rappresentate (${SELECT_AZIENDA}),
  prodotti_categorie_rappresentanti (
    categorie_rappresentanti (*)
  )
`;

const SELECT_RAPPRESENTANTE = `
  *,
  rappresentanti_aziende (
    *,
    aziende_rappresentate (${SELECT_AZIENDA}),
    rappresentanti_aziende_prodotti (
      prodotto_id,
      prodotti_rappresentati (${SELECT_PRODOTTO})
    )
  ),
  rappresentanti_tag (
    tag_rappresentanti (*)
  )
`;

export async function caricaCategorie(includeDisattive = true) {
  let query = supabase
    .from("categorie_rappresentanti")
    .select("*")
    .is("deleted_at", null)
    .order("ordine", { ascending: true })
    .order("nome", { ascending: true });
  if (!includeDisattive) query = query.eq("active", true);
  const { data, error } = await query;
  if (error) throw error;

  const categorie = (data || []) as CategoriaRappresentante[];
  const [prodotti, aziende, associazioni] = await Promise.all([
    supabase.from("prodotti_categorie_rappresentanti").select("categoria_id, prodotto_id"),
    supabase.from("aziende_categorie_rappresentanti").select("categoria_id, azienda_id"),
    caricaRappresentanti(),
  ]);

  return categorie.map((categoria) => ({
    ...categoria,
    conteggio_prodotti: new Set(
      (prodotti.data || [])
        .filter((item) => item.categoria_id === categoria.id)
        .map((item) => item.prodotto_id)
    ).size,
    conteggio_aziende: new Set(
      (aziende.data || [])
        .filter((item) => item.categoria_id === categoria.id)
        .map((item) => item.azienda_id)
    ).size,
    conteggio_rappresentanti: associazioni.filter((rappresentante) =>
      rappresentante.categorie.some((item) => item.id === categoria.id)
    ).length,
  }));
}

export async function caricaAziende() {
  const { data, error } = await supabase
    .from("aziende_rappresentate")
    .select(SELECT_AZIENDA)
    .is("deleted_at", null)
    .order("ragione_sociale", { ascending: true });
  if (error) throw error;
  return records(data).map(normalizzaAzienda);
}

export async function caricaProdotti() {
  const { data, error } = await supabase
    .from("prodotti_rappresentati")
    .select(SELECT_PRODOTTO)
    .is("deleted_at", null)
    .order("nome", { ascending: true });
  if (error) throw error;
  return records(data).map(normalizzaProdotto);
}

export async function caricaTag() {
  const { data, error } = await supabase
    .from("tag_rappresentanti")
    .select("*")
    .is("deleted_at", null)
    .order("nome", { ascending: true });
  if (error) throw error;
  return (data || []) as TagRappresentante[];
}

export async function caricaRappresentanti() {
  const { data, error } = await supabase
    .from("rappresentanti")
    .select(SELECT_RAPPRESENTANTE)
    .is("deleted_at", null)
    .order("cognome", { ascending: true })
    .order("nome", { ascending: true });
  if (error) throw error;
  return records(data).map(normalizzaRappresentante);
}

export async function caricaRappresentante(id: string) {
  const { data, error } = await supabase
    .from("rappresentanti")
    .select(SELECT_RAPPRESENTANTE)
    .eq("id", id)
    .is("deleted_at", null)
    .single();
  if (error) throw error;
  return normalizzaRappresentante(record(data) || {});
}

export async function trovaPossibiliDuplicati(
  form: Pick<RappresentanteFormData, "nome" | "cognome" | "email" | "cellulare">,
  ignoraId?: string
) {
  const rappresentanti = await caricaRappresentanti();
  const nome = `${form.nome} ${form.cognome}`.trim().toLocaleLowerCase("it-IT");
  const telefono = normalizzaTelefono(form.cellulare);
  const email = form.email.trim().toLocaleLowerCase("it-IT");
  return rappresentanti.filter((item) => {
    if (item.id === ignoraId) return false;
    return (
      `${item.nome} ${item.cognome}`.trim().toLocaleLowerCase("it-IT") === nome ||
      Boolean(email && item.email?.toLocaleLowerCase("it-IT") === email) ||
      Boolean(telefono && normalizzaTelefono(item.cellulare || "") === telefono)
    );
  });
}

function payloadRappresentante(form: RappresentanteFormData) {
  const valore = (testo: string) => testo.trim() || null;
  return {
    nome: form.nome.trim(),
    cognome: form.cognome.trim(),
    ruolo: valore(form.ruolo),
    azienda_personale: valore(form.azienda_personale),
    avatar_url: normalizzaUrl(form.avatar_url),
    active: form.active,
    cellulare: valore(normalizzaTelefono(form.cellulare)),
    telefono_secondario: valore(normalizzaTelefono(form.telefono_secondario)),
    email: valore(form.email.toLocaleLowerCase("it-IT")),
    email_secondaria: valore(form.email_secondaria.toLocaleLowerCase("it-IT")),
    sito_web: normalizzaUrl(form.sito_web),
    linkedin_url: normalizzaUrl(form.linkedin_url),
    indirizzo: valore(form.indirizzo),
    comune: valore(form.comune),
    provincia: valore(form.provincia),
    regione: valore(form.regione),
    cap: valore(form.cap),
    area_competenza: valore(form.area_competenza),
    zona_commerciale: valore(form.zona_commerciale),
    province_servite: form.province_servite
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    condizioni_commerciali: valore(form.condizioni_commerciali),
    sconto_abituale: form.sconto_abituale
      ? Number(form.sconto_abituale.replace(",", "."))
      : null,
    tempi_consegna: valore(form.tempi_consegna),
    modalita_contatto_preferita: valore(form.modalita_contatto_preferita),
    disponibilita_sopralluoghi: form.disponibilita_sopralluoghi,
    note_commerciali: valore(form.note_commerciali),
    livello_interesse: form.livello_interesse,
    priorita: form.priorita,
    note_generali: valore(form.note_generali),
  };
}

async function sincronizzaAziende(
  rappresentanteId: string,
  aziende: AssociazioneAziendaForm[]
) {
  const { data: correnti, error } = await supabase
    .from("rappresentanti_aziende")
    .select("id, azienda_id")
    .eq("rappresentante_id", rappresentanteId);
  if (error) throw error;

  const idsConservati = aziende.map((item) => item.azienda_id);
  const daEliminare = (correnti || [])
    .filter((item) => !idsConservati.includes(item.azienda_id))
    .map((item) => item.id);
  if (daEliminare.length > 0) {
    const risultato = await supabase
      .from("rappresentanti_aziende")
      .delete()
      .in("id", daEliminare);
    if (risultato.error) throw risultato.error;
  }

  for (const associazione of aziende) {
    const { data, error: upsertError } = await supabase
      .from("rappresentanti_aziende")
      .upsert(
        {
          rappresentante_id: rappresentanteId,
          azienda_id: associazione.azienda_id,
          referente_interno: associazione.referente_interno.trim() || null,
          note: associazione.note.trim() || null,
          area_territoriale: associazione.area_territoriale.trim() || null,
          data_inizio: associazione.data_inizio || null,
          data_fine: associazione.data_fine || null,
          stato_collaborazione: associazione.stato_collaborazione,
          active: associazione.active,
          deleted_at: null,
        },
        { onConflict: "rappresentante_id,azienda_id" }
      )
      .select("id")
      .single();
    if (upsertError) throw upsertError;

    const cancellazione = await supabase
      .from("rappresentanti_aziende_prodotti")
      .delete()
      .eq("rappresentante_azienda_id", data.id);
    if (cancellazione.error) throw cancellazione.error;

    if (associazione.prodotto_ids.length > 0) {
      const inserimento = await supabase
        .from("rappresentanti_aziende_prodotti")
        .insert(
          associazione.prodotto_ids.map((prodottoId) => ({
            rappresentante_azienda_id: data.id,
            prodotto_id: prodottoId,
          }))
        );
      if (inserimento.error) throw inserimento.error;
    }
  }
}

async function sincronizzaTag(rappresentanteId: string, tagIds: string[]) {
  const cancellazione = await supabase
    .from("rappresentanti_tag")
    .delete()
    .eq("rappresentante_id", rappresentanteId);
  if (cancellazione.error) throw cancellazione.error;
  if (tagIds.length === 0) return;
  const inserimento = await supabase.from("rappresentanti_tag").insert(
    tagIds.map((tagId) => ({
      rappresentante_id: rappresentanteId,
      tag_id: tagId,
    }))
  );
  if (inserimento.error) throw inserimento.error;
}

export async function salvaRappresentante(
  form: RappresentanteFormData,
  id?: string
) {
  const payload = payloadRappresentante(form);
  const query = id
    ? supabase.from("rappresentanti").update(payload).eq("id", id)
    : supabase.from("rappresentanti").insert(payload);
  const { data, error } = await query.select("id").single();
  if (error) throw error;
  await Promise.all([
    sincronizzaAziende(data.id, form.aziende),
    sincronizzaTag(data.id, form.tag_ids),
  ]);
  return data.id as string;
}

export async function cambiaStatoRappresentante(id: string, active: boolean) {
  const { error } = await supabase
    .from("rappresentanti")
    .update({ active })
    .eq("id", id);
  if (error) throw error;
}

export async function eliminaRappresentante(id: string) {
  const { error } = await supabase
    .from("rappresentanti")
    .update({ active: false, deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function duplicaRappresentante(rappresentante: Rappresentante) {
  const form = rappresentanteToForm(rappresentante);
  form.nome = `${form.nome} (copia)`;
  form.email = "";
  form.email_secondaria = "";
  form.cellulare = "";
  form.telefono_secondario = "";
  return salvaRappresentante(form);
}

export function rappresentanteToForm(
  rappresentante: Rappresentante
): RappresentanteFormData {
  const testo = (valore: string | null) => valore || "";
  return {
    nome: rappresentante.nome,
    cognome: rappresentante.cognome,
    ruolo: testo(rappresentante.ruolo),
    azienda_personale: testo(rappresentante.azienda_personale),
    avatar_url: testo(rappresentante.avatar_url),
    active: rappresentante.active,
    cellulare: testo(rappresentante.cellulare),
    telefono_secondario: testo(rappresentante.telefono_secondario),
    email: testo(rappresentante.email),
    email_secondaria: testo(rappresentante.email_secondaria),
    sito_web: testo(rappresentante.sito_web),
    linkedin_url: testo(rappresentante.linkedin_url),
    indirizzo: testo(rappresentante.indirizzo),
    comune: testo(rappresentante.comune),
    provincia: testo(rappresentante.provincia),
    regione: testo(rappresentante.regione),
    cap: testo(rappresentante.cap),
    area_competenza: testo(rappresentante.area_competenza),
    zona_commerciale: testo(rappresentante.zona_commerciale),
    province_servite: rappresentante.province_servite.join(", "),
    condizioni_commerciali: testo(rappresentante.condizioni_commerciali),
    sconto_abituale:
      rappresentante.sconto_abituale === null
        ? ""
        : String(rappresentante.sconto_abituale),
    tempi_consegna: testo(rappresentante.tempi_consegna),
    modalita_contatto_preferita: testo(
      rappresentante.modalita_contatto_preferita
    ),
    disponibilita_sopralluoghi:
      rappresentante.disponibilita_sopralluoghi,
    note_commerciali: testo(rappresentante.note_commerciali),
    livello_interesse: rappresentante.livello_interesse,
    priorita: rappresentante.priorita,
    note_generali: testo(rappresentante.note_generali),
    tag_ids: rappresentante.tag.map((item) => item.id),
    aziende: rappresentante.aziende.map((item) => ({
      id: item.id,
      azienda_id: item.azienda_id,
      referente_interno: item.referente_interno || "",
      note: item.note || "",
      area_territoriale: item.area_territoriale || "",
      data_inizio: item.data_inizio || "",
      data_fine: item.data_fine || "",
      stato_collaborazione: item.stato_collaborazione,
      active: item.active,
      prodotto_ids: item.prodotti.map((prodotto) => prodotto.id),
    })),
  };
}

export async function salvaCategoria(
  categoria: Pick<
    CategoriaRappresentante,
    "nome" | "descrizione" | "colore" | "parent_id" | "ordine" | "active"
  >,
  id?: string
) {
  const payload = {
    ...categoria,
    nome: categoria.nome.trim(),
    slug: `${slugCategoria(categoria.nome)}${id ? `-${id.slice(0, 6)}` : ""}`,
    descrizione: categoria.descrizione?.trim() || null,
  };
  const query = id
    ? supabase.from("categorie_rappresentanti").update(payload).eq("id", id)
    : supabase.from("categorie_rappresentanti").insert(payload);
  const { error } = await query;
  if (error) throw error;
}

export async function riordinaCategorie(categorie: CategoriaRappresentante[]) {
  for (let indice = 0; indice < categorie.length; indice += 1) {
    const { error } = await supabase
      .from("categorie_rappresentanti")
      .update({ ordine: (indice + 1) * 10 })
      .eq("id", categorie[indice].id);
    if (error) throw error;
  }
}

export async function eliminaCategoria(
  categoriaId: string,
  sostituzioneId?: string
) {
  const tabelle = [
    { nome: "prodotti_categorie_rappresentanti", chiave: "prodotto_id" },
    { nome: "aziende_categorie_rappresentanti", chiave: "azienda_id" },
  ];
  for (const tabella of tabelle) {
    const { data, error } = await supabase
      .from(tabella.nome)
      .select(`${tabella.chiave}, categoria_id`)
      .eq("categoria_id", categoriaId);
    if (error) throw error;
    if (sostituzioneId && (data || []).length > 0) {
      const inserimento = await supabase.from(tabella.nome).upsert(
        (data || []).map((item) => ({
          [tabella.chiave]: (item as unknown as Record<string, unknown>)[
            tabella.chiave
          ],
          categoria_id: sostituzioneId,
        })),
        { onConflict: `${tabella.chiave},categoria_id`, ignoreDuplicates: true }
      );
      if (inserimento.error) throw inserimento.error;
    }
    const cancellazione = await supabase
      .from(tabella.nome)
      .delete()
      .eq("categoria_id", categoriaId);
    if (cancellazione.error) throw cancellazione.error;
  }
  const { error } = await supabase
    .from("categorie_rappresentanti")
    .update({ active: false, deleted_at: new Date().toISOString() })
    .eq("id", categoriaId);
  if (error) throw error;
}

export async function salvaAzienda(
  dati: Partial<AziendaRappresentata> & { ragione_sociale: string },
  categoriaIds: string[],
  id?: string
) {
  const payload = {
    ragione_sociale: dati.ragione_sociale.trim(),
    nome_commerciale: dati.nome_commerciale?.trim() || null,
    logo_url: normalizzaUrl(dati.logo_url || ""),
    partita_iva: dati.partita_iva?.trim() || null,
    codice_fiscale: dati.codice_fiscale?.trim() || null,
    sito_web: normalizzaUrl(dati.sito_web || ""),
    email: dati.email?.trim().toLocaleLowerCase("it-IT") || null,
    pec: dati.pec?.trim().toLocaleLowerCase("it-IT") || null,
    telefono: normalizzaTelefono(dati.telefono || "") || null,
    indirizzo: dati.indirizzo?.trim() || null,
    comune: dati.comune?.trim() || null,
    provincia: dati.provincia?.trim() || null,
    regione: dati.regione?.trim() || null,
    nazione: dati.nazione?.trim() || "Italia",
    descrizione: dati.descrizione?.trim() || null,
    note: dati.note?.trim() || null,
    active: dati.active ?? true,
  };
  const query = id
    ? supabase.from("aziende_rappresentate").update(payload).eq("id", id)
    : supabase.from("aziende_rappresentate").insert(payload);
  const { data, error } = await query.select("id").single();
  if (error) throw error;
  const aziendaId = data.id as string;
  const cancellazione = await supabase
    .from("aziende_categorie_rappresentanti")
    .delete()
    .eq("azienda_id", aziendaId);
  if (cancellazione.error) throw cancellazione.error;
  if (categoriaIds.length > 0) {
    const inserimento = await supabase
      .from("aziende_categorie_rappresentanti")
      .insert(
        categoriaIds.map((categoriaId) => ({
          azienda_id: aziendaId,
          categoria_id: categoriaId,
        }))
      );
    if (inserimento.error) throw inserimento.error;
  }
  return aziendaId;
}

export async function eliminaAzienda(id: string) {
  const { count } = await supabase
    .from("rappresentanti_aziende")
    .select("id", { count: "exact", head: true })
    .eq("azienda_id", id);
  if ((count || 0) > 0)
    throw new Error(
      `L'azienda è collegata a ${count} rappresentanti e non può essere eliminata.`
    );
  const { error } = await supabase
    .from("aziende_rappresentate")
    .update({ active: false, deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function salvaProdotto(
  dati: Partial<ProdottoRappresentato> & { nome: string; azienda_id: string },
  categoriaIds: string[],
  id?: string
) {
  const payload = {
    azienda_id: dati.azienda_id,
    nome: dati.nome.trim(),
    descrizione: dati.descrizione?.trim() || null,
    codice: dati.codice?.trim() || null,
    immagine_url: normalizzaUrl(dati.immagine_url || ""),
    link_prodotto: normalizzaUrl(dati.link_prodotto || ""),
    scheda_tecnica_url: normalizzaUrl(dati.scheda_tecnica_url || ""),
    catalogo_url: normalizzaUrl(dati.catalogo_url || ""),
    note: dati.note?.trim() || null,
    active: dati.active ?? true,
  };
  const query = id
    ? supabase.from("prodotti_rappresentati").update(payload).eq("id", id)
    : supabase.from("prodotti_rappresentati").insert(payload);
  const { data, error } = await query.select("id").single();
  if (error) throw error;
  const prodottoId = data.id as string;
  const cancellazione = await supabase
    .from("prodotti_categorie_rappresentanti")
    .delete()
    .eq("prodotto_id", prodottoId);
  if (cancellazione.error) throw cancellazione.error;
  if (categoriaIds.length > 0) {
    const inserimento = await supabase
      .from("prodotti_categorie_rappresentanti")
      .insert(
        categoriaIds.map((categoriaId) => ({
          prodotto_id: prodottoId,
          categoria_id: categoriaId,
        }))
      );
    if (inserimento.error) throw inserimento.error;
  }
  return prodottoId;
}

export async function eliminaProdotto(id: string) {
  const { count } = await supabase
    .from("rappresentanti_aziende_prodotti")
    .select("id", { count: "exact", head: true })
    .eq("prodotto_id", id);
  if ((count || 0) > 0)
    throw new Error(
      `Il prodotto è collegato a ${count} rappresentanti e non può essere eliminato.`
    );
  const { error } = await supabase
    .from("prodotti_rappresentati")
    .update({ active: false, deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function caricaContatti(rappresentanteId: string) {
  const { data, error } = await supabase
    .from("cronologia_contatti_rappresentanti")
    .select("*")
    .eq("rappresentante_id", rappresentanteId)
    .is("deleted_at", null)
    .order("data_contatto", { ascending: false });
  if (error) throw error;
  return (data || []) as ContattoRappresentante[];
}

export async function registraContatto(
  rappresentanteId: string,
  dati: {
    data_contatto: string;
    tipo: TipoContatto;
    oggetto: string;
    descrizione: string;
    esito: string;
    prossima_azione: string;
    prossimo_ricontatto_at: string;
  }
) {
  const { data: utente } = await supabase.auth.getUser();
  const payload = {
    rappresentante_id: rappresentanteId,
    data_contatto: dati.data_contatto,
    tipo: dati.tipo,
    oggetto: dati.oggetto.trim(),
    descrizione: dati.descrizione.trim() || null,
    esito: dati.esito.trim() || null,
    prossima_azione: dati.prossima_azione.trim() || null,
    prossimo_ricontatto_at: dati.prossimo_ricontatto_at || null,
    utente_nome: utente.user?.email || null,
  };
  const { error } = await supabase
    .from("cronologia_contatti_rappresentanti")
    .insert(payload);
  if (error) throw error;
  const aggiornamento = await supabase
    .from("rappresentanti")
    .update({
      ultimo_contatto_at: dati.data_contatto,
      prossimo_ricontatto_at: dati.prossimo_ricontatto_at || null,
    })
    .eq("id", rappresentanteId);
  if (aggiornamento.error) throw aggiornamento.error;
}

export async function caricaNote(rappresentanteId: string) {
  const { data, error } = await supabase
    .from("note_rappresentanti")
    .select("*")
    .eq("rappresentante_id", rappresentanteId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as NotaRappresentante[];
}

export async function aggiungiNota(rappresentanteId: string, testo: string) {
  const { error } = await supabase.from("note_rappresentanti").insert({
    rappresentante_id: rappresentanteId,
    testo: testo.trim(),
  });
  if (error) throw error;
}

export async function eliminaNota(id: string) {
  const { error } = await supabase
    .from("note_rappresentanti")
    .update({ active: false, deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function caricaAllegati(
  proprietario: { rappresentante_id?: string; azienda_id?: string; prodotto_id?: string }
) {
  const campo = proprietario.rappresentante_id
    ? "rappresentante_id"
    : proprietario.azienda_id
      ? "azienda_id"
      : "prodotto_id";
  const valore =
    proprietario.rappresentante_id ||
    proprietario.azienda_id ||
    proprietario.prodotto_id ||
    "";
  const { data, error } = await supabase
    .from("allegati_rappresentanti")
    .select("*")
    .eq(campo, valore)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as AllegatoRappresentante[];
}

export async function caricaAllegato(
  file: File,
  proprietario: { rappresentante_id?: string; azienda_id?: string; prodotto_id?: string },
  categoriaDocumento: string
) {
  const proprietarioId =
    proprietario.rappresentante_id ||
    proprietario.azienda_id ||
    proprietario.prodotto_id;
  if (!proprietarioId) throw new Error("Proprietario allegato non valido.");
  const nomeSicuro = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `${proprietarioId}/${crypto.randomUUID()}-${nomeSicuro}`;
  const upload = await supabase.storage
    .from("rappresentanti-allegati")
    .upload(path, file, { upsert: false });
  if (upload.error) throw upload.error;
  const { error } = await supabase.from("allegati_rappresentanti").insert({
    ...proprietario,
    nome: file.name,
    tipo_mime: file.type || null,
    dimensione: file.size,
    storage_path: path,
    categoria_documento: categoriaDocumento,
  });
  if (error) {
    await supabase.storage.from("rappresentanti-allegati").remove([path]);
    throw error;
  }
}

export async function apriAllegato(allegato: AllegatoRappresentante) {
  const { data, error } = await supabase.storage
    .from("rappresentanti-allegati")
    .createSignedUrl(allegato.storage_path, 60);
  if (error) throw error;
  window.open(data.signedUrl, "_blank", "noopener,noreferrer");
}

export async function eliminaAllegato(allegato: AllegatoRappresentante) {
  const rimozione = await supabase.storage
    .from("rappresentanti-allegati")
    .remove([allegato.storage_path]);
  if (rimozione.error) throw rimozione.error;
  const { error } = await supabase
    .from("allegati_rappresentanti")
    .update({ active: false, deleted_at: new Date().toISOString() })
    .eq("id", allegato.id);
  if (error) throw error;
}

export async function creaTag(nome: string) {
  const { data, error } = await supabase
    .from("tag_rappresentanti")
    .insert({ nome: nome.trim() })
    .select("*")
    .single();
  if (error) throw error;
  return data as TagRappresentante;
}
