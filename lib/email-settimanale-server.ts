import type { SupabaseClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import {
  creaEmailSettimanaleHtml,
  creaEmailSettimanaleTesto,
  creaOggettoEmail,
  intervalloSettimana,
  limitaAttivitaAllaSettimana,
  scegliFraseMotivazionale,
  type AttivitaEmailSettimanale,
  type PersonaEmailSettimanale,
  type VoceProfiloSettimanale,
} from "@/lib/email-settimanale";

type CommessaRelazione = {
  titolo: string | null;
  codice: string | null;
  priorita: string | null;
  lavoro_privato_non_fidepa: boolean | null;
};

type AttivitaRow = {
  id: string;
  titolo: string;
  data_inizio: string;
  giorni: number;
  commesse: CommessaRelazione | CommessaRelazione[] | null;
};

type AppuntamentoRow = {
  id: string;
  data: string;
  ora: string | null;
  posizione: string | null;
  descrizione: string;
  commesse: CommessaRelazione | CommessaRelazione[] | null;
};

type AssegnazioneAttivita = { attivita_id: string; persona_id: string };
type AssegnazioneAppuntamento = { appuntamento_id: string; persona_id: string };

export type EsitoInvioSettimanale = {
  inviate: number;
  senzaEmail: number;
  giaInviate: number;
  fallite: number;
  destinatari: string[];
};

function relazioneSingola<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] || null : value || null;
}

function commessaVisibile(value: CommessaRelazione | CommessaRelazione[] | null) {
  return !relazioneSingola(value)?.lavoro_privato_non_fidepa;
}

function raggruppaPerPersona<T extends { persona_id: string }>(
  righe: T[],
  idCampo: keyof T
) {
  const risultato = new Map<string, string[]>();
  for (const riga of righe) {
    const id = String(riga[idCampo]);
    const correnti = risultato.get(riga.persona_id) || [];
    correnti.push(id);
    risultato.set(riga.persona_id, correnti);
  }
  return risultato;
}

async function leggiDatiSettimana(
  supabase: SupabaseClient,
  dataInizioRichiesta: string,
  personaId?: string
) {
  const settimana = intervalloSettimana(dataInizioRichiesta);
  let queryPersone = supabase
    .from("personale")
    .select(
      "id, nome, email, attivo, ruolo_organigramma, titolo_ruolo, descrizione, foto_url"
    )
    .eq("attivo", true)
    .order("nome");
  if (personaId) queryPersone = queryPersone.eq("id", personaId);

  const [personeRes, profiloRes, attivitaRes, appuntamentiRes] =
    await Promise.all([
      queryPersone,
      supabase
        .from("personale_attivita_organizzative")
        .select("persona_id, titolo, tipo, completata")
        .order("tipo", { ascending: false })
        .order("created_at"),
      supabase
        .from("attivita_commesse")
        .select(
          "id, titolo, data_inizio, giorni, commesse(titolo, codice, priorita, lavoro_privato_non_fidepa)"
        )
        .lte("data_inizio", settimana.dataFine),
      supabase
        .from("appuntamenti_commesse")
        .select(
          "id, data, ora, posizione, descrizione, commesse(titolo, codice, priorita, lavoro_privato_non_fidepa)"
        )
        .gte("data", settimana.dataInizio)
        .lte("data", settimana.dataFine),
    ]);

  const errore =
    personeRes.error ||
    profiloRes.error ||
    attivitaRes.error ||
    appuntamentiRes.error;
  if (errore) throw new Error(`Lettura dati settimanali: ${errore.message}`);

  const persone = (personeRes.data || []) as PersonaEmailSettimanale[];
  const attivita = ((attivitaRes.data || []) as unknown as AttivitaRow[]).filter(
    (item) => commessaVisibile(item.commesse)
  );
  const appuntamenti = (
    (appuntamentiRes.data || []) as unknown as AppuntamentoRow[]
  ).filter((item) => commessaVisibile(item.commesse));
  const attivitaIds = attivita.map((item) => item.id);
  const appuntamentiIds = appuntamenti.map((item) => item.id);

  const [assegnazioniAttivitaRes, assegnazioniAppuntamentiRes] =
    await Promise.all([
      attivitaIds.length
        ? supabase
            .from("attivita_personale")
            .select("attivita_id, persona_id")
            .in("attivita_id", attivitaIds)
        : Promise.resolve({ data: [], error: null }),
      appuntamentiIds.length
        ? supabase
            .from("appuntamenti_personale")
            .select("appuntamento_id, persona_id")
            .in("appuntamento_id", appuntamentiIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
  if (assegnazioniAttivitaRes.error || assegnazioniAppuntamentiRes.error) {
    throw new Error(
      `Lettura assegnazioni: ${
        assegnazioniAttivitaRes.error?.message ||
        assegnazioniAppuntamentiRes.error?.message
      }`
    );
  }

  const attivitaPerPersona = raggruppaPerPersona(
    (assegnazioniAttivitaRes.data || []) as AssegnazioneAttivita[],
    "attivita_id"
  );
  const appuntamentiPerPersona = raggruppaPerPersona(
    (assegnazioniAppuntamentiRes.data || []) as AssegnazioneAppuntamento[],
    "appuntamento_id"
  );
  const profilo = (profiloRes.data || []) as Array<
    VoceProfiloSettimanale & { persona_id: string }
  >;

  return persone.map((persona) => {
    const idsAttivita = new Set(attivitaPerPersona.get(persona.id) || []);
    const idsAppuntamenti = new Set(
      appuntamentiPerPersona.get(persona.id) || []
    );
    const voci: AttivitaEmailSettimanale[] = [];

    for (const item of attivita) {
      if (!idsAttivita.has(item.id)) continue;
      const intervallo = limitaAttivitaAllaSettimana(
        item.data_inizio,
        item.giorni,
        settimana.dataInizio,
        settimana.dataFine
      );
      if (!intervallo) continue;
      const commessa = relazioneSingola(item.commesse);
      voci.push({
        tipo: "attivita",
        titolo: item.titolo,
        commessaTitolo: commessa?.titolo || null,
        commessaCodice: commessa?.codice || null,
        priorita: commessa?.priorita || null,
        dataInizio: intervallo.dataInizio,
        dataFine: intervallo.dataFine,
      });
    }
    for (const item of appuntamenti) {
      if (!idsAppuntamenti.has(item.id)) continue;
      const commessa = relazioneSingola(item.commesse);
      voci.push({
        tipo: "appuntamento",
        titolo: item.descrizione,
        commessaTitolo: commessa?.titolo || null,
        commessaCodice: commessa?.codice || null,
        priorita: commessa?.priorita || null,
        dataInizio: item.data,
        dataFine: item.data,
        ora: item.ora,
        posizione: item.posizione,
      });
    }
    voci.sort(
      (a, b) =>
        a.dataInizio.localeCompare(b.dataInizio) ||
        (a.ora || "").localeCompare(b.ora || "") ||
        a.titolo.localeCompare(b.titolo, "it")
    );

    return {
      persona,
      ...settimana,
      attivita: voci,
      profilo: profilo.filter((item) => item.persona_id === persona.id),
      fraseMotivazionale: scegliFraseMotivazionale(
        persona.id,
        settimana.numeroSettimana,
        settimana.dataInizio
      ),
    };
  });
}

export async function inviaEmailSettimana(input: {
  supabase: SupabaseClient;
  dataInizio: string;
  personaId?: string;
  automatico: boolean;
}) {
  const contenuti = await leggiDatiSettimana(
    input.supabase,
    input.dataInizio,
    input.personaId
  );
  if (input.personaId && !contenuti.length) {
    throw new Error("Persona non trovata o non attiva.");
  }

  const gmailUser = process.env.GMAIL_USER || "fidepasrl@gmail.com";
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, "");
  if (!gmailAppPassword) throw new Error("Configura GMAIL_APP_PASSWORD sul server.");

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: gmailUser, pass: gmailAppPassword },
  });
  const esito: EsitoInvioSettimanale = {
    inviate: 0,
    senzaEmail: 0,
    giaInviate: 0,
    fallite: 0,
    destinatari: [],
  };

  for (const contenuto of contenuti) {
    if (!contenuto.persona.email?.trim()) {
      esito.senzaEmail += 1;
      continue;
    }

    let logId: string | null = null;
    if (input.automatico) {
      const prenotazione = await input.supabase
        .from("email_settimanali_personale")
        .insert({
          persona_id: contenuto.persona.id,
          data_inizio_settimana: contenuto.dataInizio,
          numero_settimana: contenuto.numeroSettimana,
          tipo_invio: "automatico",
          stato: "in_corso",
        })
        .select("id")
        .single();
      if (prenotazione.error?.code === "23505") {
        esito.giaInviate += 1;
        continue;
      }
      if (prenotazione.error || !prenotazione.data) {
        throw new Error(
          `Registro email settimanali non disponibile: ${
            prenotazione.error?.message || "configurazione incompleta"
          }`
        );
      }
      logId = String(prenotazione.data.id);
    }

    try {
      await transporter.sendMail({
        from: `FIDEPA Studio <${gmailUser}>`,
        to: contenuto.persona.email,
        subject: creaOggettoEmail(contenuto.numeroSettimana),
        html: creaEmailSettimanaleHtml(contenuto),
        text: creaEmailSettimanaleTesto(contenuto),
      });
      esito.inviate += 1;
      esito.destinatari.push(contenuto.persona.nome);

      if (logId) {
        await input.supabase
          .from("email_settimanali_personale")
          .update({ stato: "inviata", inviata_at: new Date().toISOString() })
          .eq("id", logId);
      } else {
        await input.supabase.from("email_settimanali_personale").insert({
          persona_id: contenuto.persona.id,
          data_inizio_settimana: contenuto.dataInizio,
          numero_settimana: contenuto.numeroSettimana,
          tipo_invio: "manuale",
          stato: "inviata",
          inviata_at: new Date().toISOString(),
        });
      }
    } catch (error) {
      esito.fallite += 1;
      console.error("Errore invio email settimanale:", error);
      if (logId) {
        await input.supabase
          .from("email_settimanali_personale")
          .update({
            stato: "fallita",
            errore:
              error instanceof Error
                ? error.message.slice(0, 1000)
                : "Errore provider email",
          })
          .eq("id", logId);
      }
    }
  }

  return esito;
}
