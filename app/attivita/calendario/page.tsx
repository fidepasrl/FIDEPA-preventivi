"use client";

import { useEffect, useMemo, useRef, useState, type WheelEvent } from "react";
import LayoutApp from "@/components/LayoutApp";
import { supabase } from "@/lib/supabase";
import { getSimboloTipoCommessa } from "@/lib/tipiCommesse";

type Commessa = {
  id: string;
  titolo: string;
  codice: string | null;
};

type Persona = {
  id: string;
  nome: string;
  email: string | null;
  colore: string;
  attivo: boolean;
};

type RelazioneSupabase<T> = T | T[] | null | undefined;

type Attivita = {
  id: string;
  titolo: string;
  commessa_id: string | null;
  tipo_commessa: string | null;
  titolo_commessa?: string | null;
  data_inizio: string;
  giorni: number;
  persone: Persona[];
};

type Appuntamento = {
  id: string;
  commessa_id: string | null;
  tipo_commessa: string | null;
  titolo_commessa: string | null;
  data: string;
  ora: string;
  posizione: string | null;
  descrizione: string;
  persone: Persona[];
};

type AttivitaRow = {
  id: string;
  titolo: string;
  commessa_id: string | null;
  data_inizio: string;
  giorni: number;
  commesse?: {
    titolo: string | null;
    tipo_commessa: string | null;
  }[] | {
    titolo: string | null;
    tipo_commessa: string | null;
  } | null;
  attivita_personale?: {
    personale: RelazioneSupabase<Persona>;
  }[] | null;
};

type AppuntamentoRow = {
  id: string;
  commessa_id: string | null;
  data: string;
  ora: string;
  posizione: string | null;
  descrizione: string;
  commesse?: {
    titolo: string | null;
    tipo_commessa: string | null;
  }[] | {
    titolo: string | null;
    tipo_commessa: string | null;
  } | null;
  appuntamenti_personale?: {
    personale: RelazioneSupabase<Persona>;
  }[] | null;
};

type SegmentoCalendario = {
  tipo: "attivita";
  attivita: Attivita;
  start: number;
  end: number;
  riga: number;
} | {
  tipo: "appuntamento";
  appuntamento: Appuntamento;
  start: number;
  end: number;
  riga: number;
};

const FORM_INIZIALE = {
  titolo: "",
  commessa_id: "",
  data_inizio: new Date().toISOString().slice(0, 10),
  giorni: "1",
  persone_ids: [] as string[],
};

const VALORE_APPUNTAMENTO_LIBERO = "__attivita_libera__";

const FORM_APPUNTAMENTO_INIZIALE = {
  commessa_id: VALORE_APPUNTAMENTO_LIBERO,
  data: new Date().toISOString().slice(0, 10),
  ora: "09:00",
  posizione: "",
  descrizione: "",
  persone_ids: [] as string[],
};

const COLONNE_CALENDARIO =
  "44px repeat(5, minmax(0, 1fr)) 44px 44px";
const COLONNE_GIORNI_CALENDARIO = "repeat(5, minmax(0, 1fr)) 44px 44px";
const INTERVALLO_CAMBIO_MESE_WHEEL = 650;
const SOGLIA_CAMBIO_MESE_WHEEL = 40;

function getRelazioneSingola<T>(valore: RelazioneSupabase<T>) {
  if (Array.isArray(valore)) {
    return valore[0] || null;
  }

  return valore || null;
}

function ordinaCommesseAlfabeticamente(lista: Commessa[]) {
  return [...lista].sort((a, b) => {
    const codiceA = a.codice?.trim();
    const codiceB = b.codice?.trim();

    if (codiceA && codiceB) {
      const confrontoCodice = codiceB.localeCompare(codiceA, "it", {
        numeric: true,
        sensitivity: "base",
      });

      if (confrontoCodice !== 0) {
        return confrontoCodice;
      }
    }

    if (codiceA && !codiceB) return -1;
    if (!codiceA && codiceB) return 1;

    return a.titolo.localeCompare(b.titolo, "it", {
      numeric: true,
      sensitivity: "base",
    });
  });
}

function getEtichettaCommessa(commessa: Commessa) {
  return commessa.codice
    ? `${commessa.codice} | ${commessa.titolo}`
    : commessa.titolo;
}

export default function CalendarioAttivitaPage() {
  const [meseCorrente, setMeseCorrente] = useState(new Date());
  const [commesse, setCommesse] = useState<Commessa[]>([]);
  const [personale, setPersonale] = useState<Persona[]>([]);
  const [attivita, setAttivita] = useState<Attivita[]>([]);
  const [appuntamenti, setAppuntamenti] = useState<Appuntamento[]>([]);
  const [form, setForm] = useState(FORM_INIZIALE);
  const [formAppuntamento, setFormAppuntamento] = useState(
    FORM_APPUNTAMENTO_INIZIALE
  );

  const [modaleAperta, setModaleAperta] = useState(false);
  const [attivitaInModifica, setAttivitaInModifica] =
    useState<Attivita | null>(null);
  const [modaleAppuntamentoAperta, setModaleAppuntamentoAperta] =
    useState(false);
  const [appuntamentoInModifica, setAppuntamentoInModifica] =
    useState<Appuntamento | null>(null);
  const [salvataggioAppuntamento, setSalvataggioAppuntamento] = useState(false);

  const [caricamento, setCaricamento] = useState(true);
  const ultimoCambioMeseWheel = useRef(0);

  const anno = meseCorrente.getFullYear();
  const mese = meseCorrente.getMonth();

  const giorniMese = useMemo(() => {
    const primoGiorno = new Date(anno, mese, 1);
    const ultimoGiorno = new Date(anno, mese + 1, 0);
    const giorni: Date[] = [];

    const offset = primoGiorno.getDay() === 0 ? 6 : primoGiorno.getDay() - 1;

    for (let i = 0; i < offset; i++) {
      giorni.push(new Date(anno, mese, i - offset + 1));
    }

    for (let giorno = 1; giorno <= ultimoGiorno.getDate(); giorno++) {
      giorni.push(new Date(anno, mese, giorno));
    }

    const giorniMancanti = giorni.length % 7 === 0 ? 0 : 7 - (giorni.length % 7);

    for (let giorno = 1; giorno <= giorniMancanti; giorno++) {
      giorni.push(new Date(anno, mese + 1, giorno));
    }

    return giorni;
  }, [anno, mese]);

  const settimaneCalendario = useMemo(() => {
    const settimane: Date[][] = [];

    for (let index = 0; index < giorniMese.length; index += 7) {
      settimane.push(giorniMese.slice(index, index + 7));
    }

    return settimane;
  }, [giorniMese]);

  useEffect(() => {
    caricaDati();
  }, []);

  async function caricaDati() {
    setCaricamento(true);

    const [{ data: commesseData }, { data: personaleData }] =
      await Promise.all([
        supabase
          .from("commesse")
          .select("id, titolo, codice")
          .order("titolo", { ascending: true }),
        supabase
          .from("personale")
          .select("*")
          .eq("attivo", true)
          .order("nome"),
      ]);

    setCommesse(ordinaCommesseAlfabeticamente(commesseData || []));
    setPersonale(personaleData || []);

    await Promise.all([caricaAttivita(), caricaAppuntamenti()]);
    setCaricamento(false);
  }
  
  async function caricaAttivita() {
    const { data, error } = await supabase
      .from("attivita_commesse")
      .select(
        `
        id,
        titolo,
        commessa_id,
        data_inizio,
        giorni,
        commesse (
            titolo,
            tipo_commessa
        ),
        attivita_personale (
            personale (
            id,
            nome,
            colore,
            attivo
          )
        )
      `
      )
      .order("data_inizio", { ascending: true });

    if (error) {
      console.error(error);
      setAttivita([]);
      return;
    }

    const righe = (data || []) as AttivitaRow[];

    const normalizzate = righe.map((item) => {
      const commessa = getRelazioneSingola(item.commesse);

      return {
        id: item.id,
        titolo: item.titolo,
        commessa_id: item.commessa_id,
        tipo_commessa: commessa?.tipo_commessa || null,
        titolo_commessa: commessa?.titolo || null,
        data_inizio: item.data_inizio,
        giorni: item.giorni,
        persone:
          item.attivita_personale
            ?.map((rel) => getRelazioneSingola(rel.personale))
            .filter((persona): persona is Persona => Boolean(persona)) || [],
      };
    });

    setAttivita(normalizzate);
  }

  async function caricaAppuntamenti() {
    const { data, error } = await supabase
      .from("appuntamenti_commesse")
      .select(
        `
        id,
        commessa_id,
        data,
        ora,
        posizione,
        descrizione,
        commesse (
          titolo,
          tipo_commessa
        ),
        appuntamenti_personale (
          personale (
            id,
            nome,
            email,
            colore,
            attivo
          )
        )
      `
      )
      .order("data", { ascending: true })
      .order("ora", { ascending: true });

    if (error) {
      console.error(error);
      setAppuntamenti([]);
      return;
    }

    const righe = (data || []) as AppuntamentoRow[];

    const normalizzati = righe.map((item) => {
      const commessa = getRelazioneSingola(item.commesse);

      return {
        id: item.id,
        commessa_id: item.commessa_id,
        tipo_commessa: commessa?.tipo_commessa || null,
        titolo_commessa: commessa?.titolo || null,
        data: item.data,
        ora: item.ora,
        posizione: item.posizione,
        descrizione: item.descrizione,
        persone:
          item.appuntamenti_personale
            ?.map((rel) => getRelazioneSingola(rel.personale))
            .filter((persona): persona is Persona => Boolean(persona)) || [],
      };
    });

    setAppuntamenti(normalizzati);
  }

  function cambiaMese(delta: number) {
    setMeseCorrente(new Date(anno, mese + delta, 1));
  }

  function gestisciCambioMeseWheel(event: WheelEvent<HTMLDivElement>) {
    if (Math.abs(event.deltaY) < SOGLIA_CAMBIO_MESE_WHEEL) {
      return;
    }

    event.preventDefault();

    const adesso = Date.now();
    if (adesso - ultimoCambioMeseWheel.current < INTERVALLO_CAMBIO_MESE_WHEEL) {
      return;
    }

    ultimoCambioMeseWheel.current = adesso;
    cambiaMese(event.deltaY > 0 ? 1 : -1);
  }

  function aggiornaCampo<TCampo extends keyof typeof FORM_INIZIALE>(
    campo: TCampo,
    valore: (typeof FORM_INIZIALE)[TCampo]
  ) {
    setForm((corrente) => ({
      ...corrente,
      [campo]: valore,
    }));
  }

  function aggiornaCampoAppuntamento<
    TCampo extends keyof typeof FORM_APPUNTAMENTO_INIZIALE
  >(campo: TCampo, valore: (typeof FORM_APPUNTAMENTO_INIZIALE)[TCampo]) {
    setFormAppuntamento((corrente) => ({
      ...corrente,
      [campo]: valore,
    }));
  }

  function togglePersona(id: string) {
    setForm((corrente) => {
      const presente = corrente.persone_ids.includes(id);

      return {
        ...corrente,
        persone_ids: presente
          ? corrente.persone_ids.filter((item) => item !== id)
          : [...corrente.persone_ids, id],
      };
    });
  }

  function apriNuovaAttivita() {
    setForm(FORM_INIZIALE);
    setAttivitaInModifica(null);
    setModaleAperta(true);
  }

  function togglePersonaAppuntamento(id: string) {
    setFormAppuntamento((corrente) => {
      const presente = corrente.persone_ids.includes(id);

      return {
        ...corrente,
        persone_ids: presente
          ? corrente.persone_ids.filter((item) => item !== id)
          : [...corrente.persone_ids, id],
      };
    });
  }

  function apriNuovoAppuntamento() {
    setFormAppuntamento(FORM_APPUNTAMENTO_INIZIALE);
    setAppuntamentoInModifica(null);
    setModaleAppuntamentoAperta(true);
  }

  function apriModificaAttivita(item: Attivita) {
    setAttivitaInModifica(item);

    setForm({
      titolo: item.titolo,
      commessa_id: item.commessa_id || "",
      data_inizio: item.data_inizio,
      giorni: String(item.giorni || 1),
      persone_ids: item.persone.map((persona) => persona.id),
    });

    setModaleAperta(true);
  }

  function apriModificaAppuntamento(item: Appuntamento) {
    setAppuntamentoInModifica(item);

    setFormAppuntamento({
      commessa_id: item.commessa_id || VALORE_APPUNTAMENTO_LIBERO,
      data: item.data,
      ora: item.ora.slice(0, 5),
      posizione: item.posizione || "",
      descrizione: item.descrizione,
      persone_ids: item.persone.map((persona) => persona.id),
    });

    setModaleAppuntamentoAperta(true);
  }

  async function salvaAttivita() {
    if (!form.titolo.trim() && !form.commessa_id) {
      alert("Inserisci una commessa o un titolo attività.");
      return;
    }

    if (form.persone_ids.length === 0) {
      alert("Seleziona almeno una persona.");
      return;
    }

    const titolo = form.titolo.trim() || "Attività senza descrizione";

    if (attivitaInModifica) {
      const { error } = await supabase
        .from("attivita_commesse")
        .update({
          titolo,
          commessa_id: form.commessa_id || null,
          data_inizio: form.data_inizio,
          giorni: Number(form.giorni || 1),
        })
        .eq("id", attivitaInModifica.id);

      if (error) {
        console.error(error);
        alert("Errore durante la modifica dell’attività.");
        return;
      }

      await supabase
        .from("attivita_personale")
        .delete()
        .eq("attivita_id", attivitaInModifica.id);

      const righePersonale = form.persone_ids.map((personaId) => ({
        attivita_id: attivitaInModifica.id,
        persona_id: personaId,
      }));

      const { error: errorePersonale } = await supabase
        .from("attivita_personale")
        .insert(righePersonale);

      if (errorePersonale) {
        console.error(errorePersonale);
        alert("Attività modificata, ma errore nell’assegnazione del personale.");
        return;
      }
    } else {
      const { data, error } = await supabase
        .from("attivita_commesse")
        .insert({
          titolo,
          commessa_id: form.commessa_id || null,
          data_inizio: form.data_inizio,
          giorni: Number(form.giorni || 1),
        })
        .select()
        .single();

      if (error || !data) {
        console.error(error);
        alert("Errore durante la creazione dell’attività.");
        return;
      }

      const righePersonale = form.persone_ids.map((personaId) => ({
        attivita_id: data.id,
        persona_id: personaId,
      }));

      const { error: errorePersonale } = await supabase
        .from("attivita_personale")
        .insert(righePersonale);

      if (errorePersonale) {
        console.error(errorePersonale);
        alert("Attività creata, ma errore nell’assegnazione del personale.");
        return;
      }
    }

    setForm(FORM_INIZIALE);
    setAttivitaInModifica(null);
    setModaleAperta(false);
    await caricaAttivita();
  }

  async function eliminaAttivita() {
    if (!attivitaInModifica) return;

    const conferma = window.confirm("Eliminare questa attività?");
    if (!conferma) return;

    const { error } = await supabase
      .from("attivita_commesse")
      .delete()
      .eq("id", attivitaInModifica.id);

    if (error) {
      console.error(error);
      alert("Errore durante l’eliminazione dell’attività.");
      return;
    }

    setForm(FORM_INIZIALE);
    setAttivitaInModifica(null);
    setModaleAperta(false);
    await caricaAttivita();
  }

  async function salvaAppuntamento() {
    if (!formAppuntamento.commessa_id) {
      alert("Seleziona una commessa per l'appuntamento.");
      return;
    }

    if (!formAppuntamento.data || !formAppuntamento.ora) {
      alert("Inserisci data e ora dell'appuntamento.");
      return;
    }

    if (!formAppuntamento.descrizione.trim()) {
      alert("Inserisci una descrizione per l'appuntamento.");
      return;
    }

    const appuntamentoLibero =
      formAppuntamento.commessa_id === VALORE_APPUNTAMENTO_LIBERO;

    const payload = {
      commessa_id: appuntamentoLibero ? null : formAppuntamento.commessa_id,
      data: formAppuntamento.data,
      ora: formAppuntamento.ora,
      posizione: formAppuntamento.posizione.trim() || null,
      descrizione: formAppuntamento.descrizione.trim(),
    };

    setSalvataggioAppuntamento(true);

    let appuntamentoId = appuntamentoInModifica?.id || "";
    let tipoNotifica: "creato" | "modificato" | "spostato" = "creato";
    let personeRimosseIds: string[] = [];

    if (appuntamentoInModifica) {
      const { error } = await supabase
        .from("appuntamenti_commesse")
        .update(payload)
        .eq("id", appuntamentoInModifica.id);

      if (error) {
        console.error(error);
        alert(
          `Errore durante la modifica dell'appuntamento: ${error.message}`
        );
        setSalvataggioAppuntamento(false);
        return;
      }

      personeRimosseIds = appuntamentoInModifica.persone
        .map((persona) => persona.id)
        .filter((id) => !formAppuntamento.persone_ids.includes(id));
      tipoNotifica =
        appuntamentoInModifica.data !== payload.data ||
        appuntamentoInModifica.ora.slice(0, 5) !== payload.ora
          ? "spostato"
          : "modificato";
    } else {
      const { data, error } = await supabase
        .from("appuntamenti_commesse")
        .insert(payload)
        .select("id")
        .single();

      if (error || !data) {
        console.error(error);
        alert(
          `Errore durante la creazione dell'appuntamento: ${
            error?.message || "identificativo non disponibile"
          }`
        );
        setSalvataggioAppuntamento(false);
        return;
      }

      appuntamentoId = data.id;
    }

    const errorePersonale = await salvaPersonaleAppuntamento(
      appuntamentoId,
      formAppuntamento.persone_ids
    );

    if (errorePersonale) {
      alert(
        `Appuntamento salvato, ma errore nell'assegnazione del personale: ${errorePersonale}`
      );
      setSalvataggioAppuntamento(false);
      return;
    }

    const esitoNotifica = await inviaNotificaAppuntamento({
      tipo: tipoNotifica,
      appuntamentoId,
      personaIds: formAppuntamento.persone_ids,
      personaRimossiIds: personeRimosseIds,
      commessaTitolo: appuntamentoLibero
        ? "Attivita libera"
        : commesse.find((commessa) => commessa.id === payload.commessa_id)
            ?.titolo || "Commessa",
      data: payload.data,
      ora: payload.ora,
      posizione: payload.posizione || "",
      descrizione: payload.descrizione,
    });

    setFormAppuntamento(FORM_APPUNTAMENTO_INIZIALE);
    setAppuntamentoInModifica(null);
    setModaleAppuntamentoAperta(false);
    setSalvataggioAppuntamento(false);
    await caricaAppuntamenti();

    if (esitoNotifica) {
      alert(`Appuntamento salvato. ${esitoNotifica}`);
    }
  }

  async function salvaPersonaleAppuntamento(
    appuntamentoId: string,
    personaIds: string[]
  ) {
    const { error: deleteError } = await supabase
      .from("appuntamenti_personale")
      .delete()
      .eq("appuntamento_id", appuntamentoId);

    if (deleteError) return deleteError.message;
    if (personaIds.length === 0) return null;

    const { error: insertError } = await supabase
      .from("appuntamenti_personale")
      .insert(
        personaIds.map((personaId) => ({
          appuntamento_id: appuntamentoId,
          persona_id: personaId,
        }))
      );

    return insertError?.message || null;
  }

  async function eliminaAppuntamento() {
    if (!appuntamentoInModifica) return;

    const conferma = window.confirm("Eliminare questo appuntamento?");
    if (!conferma) return;

    setSalvataggioAppuntamento(true);

    const personeIds = appuntamentoInModifica.persone.map(
      (persona) => persona.id
    );
    const appuntamentoEliminato = appuntamentoInModifica;
    const { error } = await supabase
      .from("appuntamenti_commesse")
      .delete()
      .eq("id", appuntamentoInModifica.id);

    if (error) {
      console.error(error);
      alert("Errore durante l'eliminazione dell'appuntamento.");
      setSalvataggioAppuntamento(false);
      return;
    }

    const esitoNotifica = await inviaNotificaAppuntamento({
      tipo: "eliminato",
      appuntamentoId: appuntamentoEliminato.id,
      personaIds: personeIds,
      personaRimossiIds: [],
      commessaTitolo:
        appuntamentoEliminato.titolo_commessa || "Attivita libera",
      data: appuntamentoEliminato.data,
      ora: appuntamentoEliminato.ora.slice(0, 5),
      posizione: appuntamentoEliminato.posizione || "",
      descrizione: appuntamentoEliminato.descrizione,
    });

    setFormAppuntamento(FORM_APPUNTAMENTO_INIZIALE);
    setAppuntamentoInModifica(null);
    setModaleAppuntamentoAperta(false);
    setSalvataggioAppuntamento(false);
    await caricaAppuntamenti();

    if (esitoNotifica) {
      alert(`Appuntamento eliminato. ${esitoNotifica}`);
    }
  }

  async function inviaNotificaAppuntamento(payload: {
    tipo: "creato" | "modificato" | "spostato" | "eliminato";
    appuntamentoId: string;
    personaIds: string[];
    personaRimossiIds: string[];
    commessaTitolo: string;
    data: string;
    ora: string;
    posizione: string;
    descrizione: string;
  }) {
    const destinatari = new Set([
      ...payload.personaIds,
      ...payload.personaRimossiIds,
    ]);
    if (destinatari.size === 0) return null;

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) return "Notifiche email non inviate: sessione non valida.";

    try {
      const response = await fetch("/api/appuntamenti/notifica", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          ...payload,
          requestId: crypto.randomUUID(),
        }),
      });
      const risultato = (await response.json()) as {
        error?: string;
        senzaEmail?: number;
      };

      if (!response.ok) {
        return `Notifiche email non inviate: ${
          risultato.error || "servizio non disponibile"
        }`;
      }

      if (risultato.senzaEmail) {
        return `${risultato.senzaEmail} persone non hanno un indirizzo email configurato.`;
      }

      return null;
    } catch (error) {
      console.error("Errore invio notifiche appuntamento:", error);
      return "Notifiche email non inviate: servizio non raggiungibile.";
    }
  }

  function isWeekend(data: Date) {
    const giorno = data.getDay();
    return giorno === 0 || giorno === 6;
  }

  function isMeseCorrente(data: Date) {
    return data.getFullYear() === anno && data.getMonth() === mese;
  }

  function isOggi(data: Date) {
    const oggi = new Date();

    return (
      data.getFullYear() === oggi.getFullYear() &&
      data.getMonth() === oggi.getMonth() &&
      data.getDate() === oggi.getDate()
    );
  }

  function getChiaveData(data: Date) {
    const annoData = data.getFullYear();
    const meseData = String(data.getMonth() + 1).padStart(2, "0");
    const giornoData = String(data.getDate()).padStart(2, "0");

    return `${annoData}-${meseData}-${giornoData}`;
  }

  function getNumeroSettimana(data: Date) {
    const dataUtc = new Date(
      Date.UTC(data.getFullYear(), data.getMonth(), data.getDate())
    );
    const giornoSettimana = dataUtc.getUTCDay() || 7;

    dataUtc.setUTCDate(dataUtc.getUTCDate() + 4 - giornoSettimana);

    const inizioAnno = new Date(Date.UTC(dataUtc.getUTCFullYear(), 0, 1));
    const differenzaGiorni =
      (dataUtc.getTime() - inizioAnno.getTime()) / 86400000 + 1;

    return Math.ceil(differenzaGiorni / 7);
  }

  function getNumeroSettimanaCalendario(settimana: (Date | null)[]) {
    const primoGiorno = settimana.find(
      (giorno): giorno is Date => Boolean(giorno)
    );

    return primoGiorno ? getNumeroSettimana(primoGiorno) : null;
  }

  function getGiorniLavorativiAttivita(item: Attivita) {
    const giorniTotali = Math.max(1, Number(item.giorni || 1));
    const giorni: Date[] = [];
    const corrente = normalizzaData(new Date(item.data_inizio));

    while (giorni.length < giorniTotali) {
      if (!isWeekend(corrente)) {
        giorni.push(new Date(corrente));
      }

      corrente.setDate(corrente.getDate() + 1);
    }

    return giorni;
  }

  function creaSegmentiSettimana(settimana: (Date | null)[]) {
    const chiaviSettimana = settimana.map((giorno) =>
      giorno ? getChiaveData(giorno) : null
    );

    const segmentiAttivita = attivita
      .map((item) => {
        const indici = getGiorniLavorativiAttivita(item)
          .map((giorno) => chiaviSettimana.indexOf(getChiaveData(giorno)))
          .filter((indice) => indice >= 0);

        if (indici.length === 0) {
          return null;
        }

        return {
          tipo: "attivita" as const,
          attivita: item,
          start: Math.min(...indici),
          end: Math.max(...indici),
          riga: 0,
        };
      })
      .filter(Boolean) as SegmentoCalendario[];

    const segmentiAppuntamenti = appuntamenti
      .map((item) => {
        const indice = chiaviSettimana.indexOf(item.data);

        if (indice < 0) {
          return null;
        }

        return {
          tipo: "appuntamento" as const,
          appuntamento: item,
          start: indice,
          end: indice,
          riga: 0,
        };
      })
      .filter(Boolean) as SegmentoCalendario[];

    const segmenti = [...segmentiAttivita, ...segmentiAppuntamenti];

    const righeOccupate: boolean[][] = [];

    return segmenti
      .sort((primo, secondo) => {
        if (primo.start !== secondo.start) return primo.start - secondo.start;
        return secondo.end - secondo.start - (primo.end - primo.start);
      })
      .map((segmento) => {
        let riga = 0;

        while (
          righeOccupate[riga]?.some(
            (occupata, indice) =>
              occupata && indice >= segmento.start && indice <= segmento.end
          )
        ) {
          riga++;
        }

        if (!righeOccupate[riga]) {
          righeOccupate[riga] = [];
        }

        for (let indice = segmento.start; indice <= segmento.end; indice++) {
          righeOccupate[riga][indice] = true;
        }

        return { ...segmento, riga };
      });
  }

  function getPartecipanti(item: Attivita) {
    return item.persone.map((persona) => persona.nome).join(", ");
  }

  function getTitoloCommessa(item: Attivita) {
    if (!item.commessa_id || !item.tipo_commessa) {
      return "Attivita libera";
    }

    const simbolo = getSimboloTipoCommessa(item.tipo_commessa);
    return `${simbolo} ${item.titolo_commessa || ""}`.trim();
  }

  function getTitoloCommessaAppuntamento(item: Appuntamento) {
    if (!item.commessa_id) {
      return item.descrizione;
    }

    const simbolo = getSimboloTipoCommessa(item.tipo_commessa);
    return `${simbolo} ${item.titolo_commessa || "Commessa"}`.trim();
  }

  function getOraAppuntamento(item: Appuntamento) {
    return item.ora.slice(0, 5);
  }

  function getSfondoAttivita(item: Attivita) {
    const colori = item.persone
      .map((persona) => persona.colore)
      .filter(Boolean);

    if (colori.length === 0) {
      return "#5E9AD3";
    }

    if (colori.length === 1) {
      return colori[0];
    }

    const ampiezza = 100 / colori.length;
    const stop = colori.flatMap((colore, index) => {
      const inizio = Math.round(index * ampiezza);
      const fine = Math.round((index + 1) * ampiezza);

      return [`${colore} ${inizio}%`, `${colore} ${fine}%`];
    });

    return `linear-gradient(135deg, ${stop.join(", ")})`;
  }

  function normalizzaData(data: Date) {
    return new Date(data.getFullYear(), data.getMonth(), data.getDate());
  }

  function formattaMese(data: Date) {
    return data.toLocaleDateString("it-IT", {
      month: "long",
      year: "numeric",
    });
  }

  return (
    <LayoutApp>
      <div>
        <div className="flex justify-between items-center gap-4 mb-6">
          <div>
            <h2 className="page-title">Calendario attività</h2>

            <p className="text-[15px] text-[#D79D06] mt-1">
              Programmazione mensile del lavoro per commessa e personale
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={apriNuovoAppuntamento}
              className="bg-[#D79D06] text-white w-12 h-12 rounded-md text-sm font-semibold hover:bg-[#B78305] hover:scale-105 transition flex items-center justify-center shadow-sm cursor-pointer"
              title="Nuovo appuntamento"
            >
              APP
            </button>

            <button
              type="button"
              onClick={apriNuovaAttivita}
              className="bg-[#64B445] text-white w-12 h-12 rounded-md text-2xl font-light hover:bg-[#5AA03E] hover:scale-105 transition flex items-center justify-center shadow-sm cursor-pointer"
              title="Nuova attività"
            >
              +
            </button>
          </div>
        </div>

        <div
          className="bg-white border border-gray-200 shadow-sm rounded-sm overflow-hidden"
          onWheel={gestisciCambioMeseWheel}
        >
          <div className="px-4 py-3 border-b border-gray-200 bg-[#FAFAFA] flex justify-between items-center">
            <button
              type="button"
              onClick={() => cambiaMese(-1)}
              className="border border-gray-300 text-[#2B2F5E] w-10 h-10 rounded-md bg-transparent hover:bg-[#e8e8e8] transition cursor-pointer"
            >
              ‹
            </button>

            <h3 className="text-[22px] font-semibold text-[#2B2F5E] capitalize">
              {formattaMese(meseCorrente)}
            </h3>

            <button
              type="button"
              onClick={() => cambiaMese(1)}
              className="border border-gray-300 text-[#2B2F5E] w-10 h-10 rounded-md bg-transparent hover:bg-[#e8e8e8] transition cursor-pointer"
            >
              ›
            </button>
          </div>

          {caricamento ? (
            <p className="text-center text-gray-500 py-10">
              Caricamento calendario...
            </p>
          ) : (
            <div className="p-4">
              <div className="border-t border-l border-gray-200">
                <div
                  className="grid"
                  style={{
                    gridTemplateColumns: COLONNE_CALENDARIO,
                  }}
                >
                  <div className="border-r border-b border-gray-200 bg-[#FAFAFA] px-1 py-2" />
                  {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map(
                    (giorno) => (
                      <div
                        key={giorno}
                        className="border-r border-b border-gray-200 bg-[#FAFAFA] px-2 py-2 text-[11px] uppercase text-gray-400 font-medium"
                      >
                        {giorno}
                      </div>
                    )
                  )}
                </div>

                {settimaneCalendario.map((settimana, settimanaIndex) => {
                  const segmenti = creaSegmentiSettimana(settimana);
                  const numeroSettimana =
                    getNumeroSettimanaCalendario(settimana);
                  const numeroRighe =
                    segmenti.length > 0
                      ? Math.max(...segmenti.map((segmento) => segmento.riga)) + 1
                      : 1;
                  const altezzaSettimana = Math.max(145, 48 + numeroRighe * 58);

                  return (
                    <div
                      key={settimanaIndex}
                      className="grid"
                      style={{
                        gridTemplateColumns: COLONNE_CALENDARIO,
                        minHeight: altezzaSettimana,
                      }}
                    >
                      <div className="flex items-center justify-center overflow-hidden border-r border-b border-gray-200 bg-[#FAFAFA] text-[#2B2F5E]">
                        {numeroSettimana && (
                          <span className="block rotate-90 text-[28px] font-semibold leading-none">
                            {numeroSettimana}
                          </span>
                        )}
                      </div>

                      <div
                        className="relative grid"
                        style={{
                          gridColumn: "2 / span 7",
                          gridTemplateColumns: COLONNE_GIORNI_CALENDARIO,
                          minHeight: altezzaSettimana,
                        }}
                      >
                        {settimana.map((giorno, giornoIndex) => {
                          const giornoMeseCorrente = isMeseCorrente(giorno);
                          const giornoCorrente = isOggi(giorno);

                          return (
                            <div
                              key={`${settimanaIndex}-${giornoIndex}`}
                              className={`border-r border-b border-gray-200 p-2 ${
                                !giornoMeseCorrente
                                  ? "bg-[#FAFAFA]"
                                  : isWeekend(giorno)
                                    ? "bg-gray-100"
                                    : "bg-white"
                              } ${
                                giornoCorrente
                                  ? "relative"
                                  : ""
                              }`}
                            >
                              {giornoCorrente && (
                                <span className="pointer-events-none absolute inset-0 z-20 border-2 border-[#D79D06]" />
                              )}

                              <p
                                className={`text-[13px] font-medium ${
                                  giornoCorrente
                                    ? "text-[#D79D06]"
                                    : !giornoMeseCorrente
                                    ? "text-gray-300"
                                    : isWeekend(giorno)
                                      ? "text-gray-400"
                                      : "text-[#2B2F5E]"
                                }`}
                              >
                                {giorno.getDate()}
                              </p>
                            </div>
                          );
                        })}

                        <div
                          className="pointer-events-none absolute left-0 right-0 top-9 grid gap-y-1 px-2"
                          style={{
                            gridTemplateColumns: COLONNE_GIORNI_CALENDARIO,
                            gridTemplateRows: `repeat(${numeroRighe}, 54px)`,
                          }}
                        >
                          {segmenti.map((segmento) => {
                            if (segmento.tipo === "appuntamento") {
                              const appuntamentoLibero =
                                !segmento.appuntamento.commessa_id;
                              const titoloCommessa = getTitoloCommessaAppuntamento(
                                segmento.appuntamento
                              );

                              return (
                                <button
                                  type="button"
                                  key={`${segmento.appuntamento.id}-${settimanaIndex}`}
                                  onClick={() =>
                                    apriModificaAppuntamento(segmento.appuntamento)
                                  }
                                  className="pointer-events-auto mx-1 h-[52px] overflow-hidden rounded-sm border-2 border-[#D79D06] bg-[#FFF8E7] px-2 py-1 text-left text-[11px] leading-tight text-[#2B2F5E] shadow-sm transition hover:bg-[#FFF1C2] cursor-pointer"
                                  style={{
                                    gridColumn: `${segmento.start + 1} / ${
                                      segmento.end + 2
                                    }`,
                                    gridRow: `${segmento.riga + 1}`,
                                  }}
                                  title={`${getOraAppuntamento(
                                    segmento.appuntamento
                                  )} - ${titoloCommessa}${
                                    appuntamentoLibero
                                      ? ""
                                      : ` - ${segmento.appuntamento.descrizione}`
                                  }`}
                                >
                                  <span className="block truncate font-semibold text-[#D79D06]">
                                    {getOraAppuntamento(segmento.appuntamento)} ·{" "}
                                    {titoloCommessa}
                                  </span>
                                  {!appuntamentoLibero && (
                                    <span className="block truncate">
                                      {segmento.appuntamento.descrizione}
                                    </span>
                                  )}
                                </button>
                              );
                            }

                            const partecipanti =
                              getPartecipanti(segmento.attivita) ||
                              "Senza assegnazione";
                            const titoloCommessa = getTitoloCommessa(segmento.attivita);

                            return (
                              <button
                                type="button"
                                key={`${segmento.attivita.id}-${settimanaIndex}`}
                                onClick={() =>
                                  apriModificaAttivita(segmento.attivita)
                                }
                                className="pointer-events-auto mx-1 h-[52px] overflow-hidden rounded-sm px-2 py-1 text-left text-[11px] leading-tight text-white shadow-sm transition hover:opacity-85 cursor-pointer"
                                style={{
                                  gridColumn: `${segmento.start + 1} / ${
                                    segmento.end + 2
                                  }`,
                                  gridRow: `${segmento.riga + 1}`,
                                  background: getSfondoAttivita(segmento.attivita),
                                  textShadow: "0 1px 1px rgba(0, 0, 0, 0.35)",
                                }}
                                title={`${partecipanti} - ${titoloCommessa} - ${segmento.attivita.titolo}`}
                              >
                                <span className="block truncate font-semibold">
                                  {partecipanti}
                                </span>
                                <span className="block truncate">
                                  {titoloCommessa}
                                </span>
                                <span className="block truncate">
                                  {segmento.attivita.titolo}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          {personale.map((persona) => (
            <div key={persona.id} className="flex items-center gap-2 text-sm">
              <span
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: persona.colore }}
              />
              <span className="text-[#2B2F5E]">{persona.nome}</span>
            </div>
          ))}
        </div>
      </div>

      {modaleAperta && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-md shadow-2xl w-full max-w-3xl p-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-semibold text-[#2B2F5E]">
                  {attivitaInModifica ? "Modifica attività" : "Nuova attività"}
                </h3>

                <p className="text-sm text-gray-500 mt-1">
                  {attivitaInModifica
                    ? "Modifica la programmazione dell’attività."
                    : "Programma un’attività sul calendario dello studio."}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setModaleAperta(false);
                  setAttivitaInModifica(null);
                  setForm(FORM_INIZIALE);
                }}
                className="text-2xl text-gray-400 hover:text-[#2B2F5E] cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-[#2B2F5E]">
                  Commessa
                </label>

                <select
                  value={form.commessa_id}
                  onChange={(e) => aggiornaCampo("commessa_id", e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-4 py-3 bg-transparent outline-none transition focus:bg-white focus:border-[#64B445] focus:shadow-sm cursor-pointer"
                >
                  <option value="">Attività libera</option>

                  {commesse.map((commessa) => (
                    <option key={commessa.id} value={commessa.id}>
                      {commessa.codice
                        ? `${commessa.codice} | ${commessa.titolo}`
                        : commessa.titolo}
                    </option>
                  ))}
                </select>
              </div>

              <Campo
                label="Descrizione attività"
                value={form.titolo}
                onChange={(value) => aggiornaCampo("titolo", value)}
              />

              <Campo
                label="Data inizio"
                type="date"
                value={form.data_inizio}
                onChange={(value) => aggiornaCampo("data_inizio", value)}
              />

              <Campo
                label="Numero giorni"
                type="number"
                value={form.giorni}
                onChange={(value) => aggiornaCampo("giorni", value)}
              />

              <div className="md:col-span-2">
                <p className="block text-sm font-medium mb-2 text-[#2B2F5E]">
                  Personale assegnato
                </p>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {personale.map((persona) => {
                    const selezionata = form.persone_ids.includes(persona.id);

                    return (
                      <button
                        key={persona.id}
                        type="button"
                        onClick={() => togglePersona(persona.id)}
                        className={`border rounded-md px-4 py-3 text-left transition cursor-pointer ${
                          selezionata
                            ? "bg-white shadow-sm border-[#64B445]"
                            : "border-gray-300 hover:bg-[#e8e8e8]"
                        }`}
                      >
                        <span
                          className="inline-block w-3 h-3 rounded-sm mr-2"
                          style={{ backgroundColor: persona.colore }}
                        />
                        <span className="text-[#2B2F5E]">{persona.nome}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-between gap-3 mt-8">
              <div>
                {attivitaInModifica && (
                  <button
                    type="button"
                    onClick={eliminaAttivita}
                    className="text-red-500 hover:text-red-700 text-xl font-semibold transition cursor-pointer px-2"
                    title="Elimina attività"
                  >
                    ×
                  </button>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setModaleAperta(false);
                    setAttivitaInModifica(null);
                    setForm(FORM_INIZIALE);
                  }}
                  className="border border-gray-300 text-[#2B2F5E] px-5 py-3 rounded-md text-sm font-medium bg-transparent hover:bg-[#e8e8e8] transition cursor-pointer"
                >
                  Annulla
                </button>

                <button
                  type="button"
                  onClick={salvaAttivita}
                  className="bg-[#64B445] text-white px-5 py-3 rounded-md text-sm font-medium hover:bg-[#5AA03E] transition cursor-pointer"
                >
                  {attivitaInModifica ? "Salva modifiche" : "Crea attività"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modaleAppuntamentoAperta && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-md shadow-2xl w-full max-w-3xl p-8 border-t-4 border-[#D79D06]">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-semibold text-[#2B2F5E]">
                  {appuntamentoInModifica
                    ? "Modifica appuntamento"
                    : "Nuovo appuntamento"}
                </h3>

                <p className="text-sm text-gray-500 mt-1">
                  Programma una visita, un sopralluogo o un incontro collegato a
                  una commessa.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setModaleAppuntamentoAperta(false);
                  setAppuntamentoInModifica(null);
                  setFormAppuntamento(FORM_APPUNTAMENTO_INIZIALE);
                }}
                className="text-2xl text-gray-400 hover:text-[#2B2F5E] cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2 text-[#2B2F5E]">
                  Commessa
                </label>

                <select
                  value={formAppuntamento.commessa_id}
                  onChange={(e) =>
                    aggiornaCampoAppuntamento("commessa_id", e.target.value)
                  }
                  className="w-full border border-gray-300 rounded-md px-4 py-3 bg-transparent outline-none transition focus:bg-white focus:border-[#D79D06] focus:shadow-sm cursor-pointer"
                >
                  <option value={VALORE_APPUNTAMENTO_LIBERO}>
                    Attivit&agrave; libera
                  </option>

                  {commesse.map((commessa) => (
                    <option key={commessa.id} value={commessa.id}>
                      {getEtichettaCommessa(commessa)}
                    </option>
                  ))}
                </select>
              </div>

              <Campo
                label="Data"
                type="date"
                value={formAppuntamento.data}
                onChange={(value) => aggiornaCampoAppuntamento("data", value)}
              />

              <Campo
                label="Ora"
                type="time"
                value={formAppuntamento.ora}
                onChange={(value) => aggiornaCampoAppuntamento("ora", value)}
              />

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2 text-[#2B2F5E]">
                  Posizione
                </label>

                <input
                  value={formAppuntamento.posizione}
                  onChange={(e) =>
                    aggiornaCampoAppuntamento("posizione", e.target.value)
                  }
                  placeholder="Indirizzo, sede o collegamento online"
                  className="w-full border border-gray-300 rounded-md px-4 py-3 bg-transparent outline-none transition focus:bg-white focus:border-[#D79D06] focus:shadow-sm"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2 text-[#2B2F5E]">
                  Descrizione
                </label>

                <textarea
                  value={formAppuntamento.descrizione}
                  onChange={(e) =>
                    aggiornaCampoAppuntamento("descrizione", e.target.value)
                  }
                  rows={4}
                  className="w-full border border-gray-300 rounded-md px-4 py-3 bg-transparent outline-none transition focus:bg-white focus:border-[#D79D06] focus:shadow-sm resize-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2 text-[#2B2F5E]">
                  Personale da avvisare
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {personale.map((persona) => {
                    const selezionata =
                      formAppuntamento.persone_ids.includes(persona.id);

                    return (
                      <label
                        key={persona.id}
                        className={`flex items-center gap-3 border px-3 py-2 rounded-sm cursor-pointer transition ${
                          selezionata
                            ? "border-[#D79D06] bg-[#FFF9E8]"
                            : "border-gray-200 bg-white hover:bg-[#FAFAFA]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selezionata}
                          onChange={() =>
                            togglePersonaAppuntamento(persona.id)
                          }
                          className="accent-[#D79D06]"
                        />

                        <span className="min-w-0">
                          <span className="block text-[14px] font-medium text-[#2B2F5E]">
                            {persona.nome}
                          </span>
                          <span
                            className={`block text-[12px] truncate ${
                              persona.email ? "text-gray-500" : "text-red-500"
                            }`}
                          >
                            {persona.email || "Email non configurata"}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-between gap-3 mt-8">
              <div>
                {appuntamentoInModifica && (
                  <button
                    type="button"
                    onClick={eliminaAppuntamento}
                    className="text-red-500 hover:text-red-700 text-xl font-semibold transition cursor-pointer px-2"
                    title="Elimina appuntamento"
                  >
                    ×
                  </button>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setModaleAppuntamentoAperta(false);
                    setAppuntamentoInModifica(null);
                    setFormAppuntamento(FORM_APPUNTAMENTO_INIZIALE);
                  }}
                  className="border border-gray-300 text-[#2B2F5E] px-5 py-3 rounded-md text-sm font-medium bg-transparent hover:bg-[#e8e8e8] transition cursor-pointer"
                >
                  Annulla
                </button>

                <button
                  type="button"
                  onClick={salvaAppuntamento}
                  disabled={salvataggioAppuntamento}
                  className="bg-[#D79D06] text-white px-5 py-3 rounded-md text-sm font-medium hover:bg-[#B78305] transition cursor-pointer disabled:bg-gray-300 disabled:cursor-wait"
                >
                  {salvataggioAppuntamento
                    ? "Salvataggio..."
                    : appuntamentoInModifica
                      ? "Salva modifiche"
                      : "Crea appuntamento"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </LayoutApp>
  );
}

function Campo({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2 text-[#2B2F5E]">
        {label}
      </label>

      <input
        type={type}
        value={value}
        min={type === "number" ? 1 : undefined}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-md px-4 py-3 bg-transparent outline-none transition focus:bg-white focus:border-[#64B445] focus:shadow-sm"
      />
    </div>
  );
}
