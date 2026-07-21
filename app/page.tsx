"use client";

import { useEffect, useState, type ReactNode } from "react";
import LayoutApp from "@/components/LayoutApp";
import { supabase } from "@/lib/supabase";
import dynamic from "next/dynamic";
import Link from "next/link";
import AppIcon, { type AppIconName } from "@/components/AppIcon";
import DashboardActivityCalendar from "@/components/DashboardActivityCalendar";
import {
  getColoreBgTipoCommessa,
  type TipoCommessa,
} from "@/lib/tipiCommesse";

type Priorita = "Urgente" | "Alta" | "Normale" | "Bassa" | "Terminato";

type Aggiornamento = {
  id: string;
  testo: string;
  data_nota: string | null;
  created_at: string;
  commesse: {
    id: string;
    titolo: string;
    codice: string | null;
    tipo_commessa: TipoCommessa | null;
  } | null;
};

type AggiornamentoRow = Omit<Aggiornamento, "commesse"> & {
  commesse:
    | Aggiornamento["commesse"]
    | NonNullable<Aggiornamento["commesse"]>[]
    | null;
};

type Persona = {
  id: string;
  nome: string;
  colore: string;
};

type Attivita = {
  id: string;
  titolo: string;
  data_inizio: string;
  giorni: number;
  commessa_id: string | null;
  tipo_commessa: string | null;
  titolo_commessa: string | null;
  persone: Persona[];
};

type AttivitaRow = {
  id: string;
  titolo: string;
  data_inizio: string;
  giorni: number;
  commessa_id: string | null;
  commesse:
    | { titolo: string | null; tipo_commessa: string | null }
    | { titolo: string | null; tipo_commessa: string | null }[]
    | null;
  attivita_personale:
    | {
        personale: Persona | Persona[] | null;
      }[]
    | null;
};

type Appuntamento = {
  id: string;
  commessa_id: string | null;
  tipo_commessa: string | null;
  titolo_commessa: string | null;
  data: string;
  ora: string;
  descrizione: string;
};

type AppuntamentoRow = {
  id: string;
  commessa_id: string | null;
  data: string;
  ora: string;
  descrizione: string;
  commesse?: {
    titolo: string | null;
    tipo_commessa: string | null;
  }[] | {
    titolo: string | null;
    tipo_commessa: string | null;
  } | null;
};

type ArgomentoRiunione = {
  id: string;
  testo: string;
  completato: boolean;
  inserito_in_riunione: boolean;
  created_at: string;
};

type VoceStudio = {
  id: string;
  testo: string;
  completato: boolean;
  created_at: string;
};

type PersonaTodo = {
  id: string;
  nome: string;
  email: string | null;
  attivo: boolean;
};

type CommessaMappa = {
  id: string;
  titolo: string;
  posizione: string | null;
  latitudine: number | null;
  longitudine: number | null;
  tipo_commessa: TipoCommessa | null;
  priorita: Priorita | null;
};

const COLLEGAMENTI_RAPIDI = [
  {
    nome: "Agenzia delle Entrate",
    icona: "building" as AppIconName,
    href: "https://www.agenziaentrate.gov.it/portale/",
    colore: "bg-[#256B8F]",
  },
  {
    nome: "Geoportale Salerno",
    icona: "map" as AppIconName,
    href: "https://geoportale.provincia.salerno.it/gfmaplet/?token=NULLNULLNULLNULL",
    colore: "bg-[#4F7C3A]",
  },
  {
    nome: "Inarcassa",
    icona: "briefcase" as AppIconName,
    href: "https://www.inarcassa.it/group/iol/homeiol",
    colore: "bg-[#9B3E4F]",
  },
  {
    nome: "Ordine Ingegneri Salerno",
    icona: "users" as AppIconName,
    href: "https://ordineingsa.it/",
    colore: "bg-[#40529B]",
  },
  {
    nome: "NAS FIDEPA",
    icona: "fileText" as AppIconName,
    href: "https://fidepa.quickconnect.to/",
    colore: "bg-[#237F8D]",
  },
] as const;

const DashboardMap = dynamic(
  () => import("@/components/DashboardMap").then((mod) => mod.default),
  {
    ssr: false,
  }
);

function getRelazioneSingola<T>(valore: T | T[] | null | undefined) {
  if (Array.isArray(valore)) {
    return valore[0] || null;
  }

  return valore || null;
}

export default function Home() {
  const [aggiornamenti, setAggiornamenti] = useState<Aggiornamento[]>([]);
  const [attivita, setAttivita] = useState<Attivita[]>([]);
  const [appuntamenti, setAppuntamenti] = useState<Appuntamento[]>([]);
  const [argomenti, setArgomenti] = useState<ArgomentoRiunione[]>([]);
  const [listaStudio, setListaStudio] = useState<VoceStudio[]>([]);
  const [personaleTodo, setPersonaleTodo] = useState<PersonaTodo[]>([]);
  const [commesseMappa, setCommesseMappa] = useState<CommessaMappa[]>([]);
  const [mostraTutteVoci, setMostraTutteVoci] = useState(false);
  const [todoDaInviare, setTodoDaInviare] = useState<VoceStudio | null>(null);
  const [destinatarioTodo, setDestinatarioTodo] = useState("");
  const [invioTodo, setInvioTodo] = useState(false);
  const [messaggioTodo, setMessaggioTodo] = useState("");
  const [offsetCalendarioDashboard, setOffsetCalendarioDashboard] =
    useState(0);

  const [nuovoArgomento, setNuovoArgomento] = useState("");
  const [nuovaVoceStudio, setNuovaVoceStudio] = useState("");

  const [caricamento, setCaricamento] = useState(true);

  async function caricaDashboard() {
    setCaricamento(true);

    await Promise.all([
      caricaAggiornamenti(),
      caricaAttivita(),
      caricaAppuntamenti(),
      caricaArgomenti(),
      caricaListaStudio(),
      caricaPersonaleTodo(),
      caricaCommesseMappa(),
    ]);

    setCaricamento(false);
  }

  async function caricaAggiornamenti() {
    const { data, error } = await supabase
      .from("commesse_note")
      .select(
        `
        id,
        testo,
        data_nota,
        created_at,
        commesse (
          id,
          titolo,
          codice,
          tipo_commessa
        )
      `
      )
      .order("data_nota", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(12);

    if (error) {
      console.error(error);
      setAggiornamenti([]);
      return;
    }

    const aggiornamentiNormalizzati: Aggiornamento[] = (
      (data || []) as AggiornamentoRow[]
    ).map((item) => ({
        id: item.id,
        testo: item.testo,
        data_nota: item.data_nota,
        created_at: item.created_at,
        commesse: getRelazioneSingola(item.commesse),
      }));

    setAggiornamenti(aggiornamentiNormalizzati);
  }

  async function caricaAttivita() {
    const { data, error } = await supabase
      .from("attivita_commesse")
      .select(
        `
        id,
        titolo,
        data_inizio,
        giorni,
        commessa_id,
        commesse (
          titolo,
          tipo_commessa
        ),
        attivita_personale (
          personale (
            id,
            nome,
            colore
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

    const normalizzate =
      (data as AttivitaRow[] | null)?.map((item) => {
        const commessa = getRelazioneSingola(item.commesse);

        return {
        id: item.id,
        titolo: item.titolo,
        data_inizio: item.data_inizio,
        giorni: item.giorni,
        commessa_id: item.commessa_id,
        tipo_commessa: commessa?.tipo_commessa || null,
        titolo_commessa: commessa?.titolo || null,
        persone:
          item.attivita_personale
            ?.map((rel) => getRelazioneSingola(rel.personale))
            .filter(Boolean) || [],
        };
      }) || [];

    setAttivita(normalizzate as Attivita[]);
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
        descrizione,
        commesse (
          titolo,
          tipo_commessa
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
        descrizione: item.descrizione,
      };
    });

    setAppuntamenti(normalizzati);
  }

  async function caricaArgomenti() {
    const { data, error } = await supabase
      .from("argomenti_riunione")
      .select("*")
      .eq("completato", false)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setArgomenti([]);
      return;
    }

    setArgomenti(data || []);
  }

  async function caricaListaStudio() {
    const { data, error } = await supabase
      .from("lista_studio")
      .select("*")
      .order("completato", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setListaStudio([]);
      return;
    }

    setListaStudio(data || []);
  }

  async function caricaPersonaleTodo() {
    const { data, error } = await supabase
      .from("personale")
      .select("id, nome, email, attivo")
      .eq("attivo", true)
      .order("nome", { ascending: true });

    if (error) {
      console.error(error);
      setPersonaleTodo([]);
      return;
    }

    setPersonaleTodo((data || []) as PersonaTodo[]);
  }

  async function caricaCommesseMappa() {
    const { data, error } = await supabase
      .from("commesse")
      .select(
        "id, titolo, posizione, latitudine, longitudine, tipo_commessa, priorita"
      )
      .not("latitudine", "is", null)
      .not("longitudine", "is", null)
      .order("titolo", { ascending: true });

    if (error) {
      console.error(error);
      setCommesseMappa([]);
      return;
    }

    setCommesseMappa(data || []);
  }

  async function aggiungiArgomento() {
    if (!nuovoArgomento.trim()) return;

    const { data, error } = await supabase
      .from("argomenti_riunione")
      .insert({
        testo: nuovoArgomento.trim(),
        completato: false,
        inserito_in_riunione: false,
      })
      .select()
      .single();

    if (error) {
      alert("Errore durante l'inserimento dell'argomento.");
      return;
    }

    if (data) {
      setArgomenti((correnti) => [data, ...correnti]);
    }

    setNuovoArgomento("");
  }

  async function eliminaArgomento(id: string) {
    const { error } = await supabase
      .from("argomenti_riunione")
      .delete()
      .eq("id", id);

    if (error) {
      alert("Errore durante l'eliminazione dell'argomento.");
      return;
    }

    setArgomenti((correnti) => correnti.filter((item) => item.id !== id));
  }

  async function aggiungiVoceStudio() {
    if (!nuovaVoceStudio.trim()) return;

    const { data, error } = await supabase
      .from("lista_studio")
      .insert({
        testo: nuovaVoceStudio.trim(),
        completato: false,
      })
      .select()
      .single();

    if (error) {
      alert("Errore durante l'inserimento della voce.");
      return;
    }

    if (data) {
      setListaStudio((correnti) => [data, ...correnti]);
    }

    setNuovaVoceStudio("");
  }

  async function eliminaVoceStudio(id: string) {
    const { error } = await supabase.from("lista_studio").delete().eq("id", id);

    if (error) {
      alert("Errore durante l'eliminazione della voce.");
      return;
    }

    setListaStudio((correnti) => correnti.filter((item) => item.id !== id));
  }

  async function inviaPromemoriaTodo() {
    if (!todoDaInviare || !destinatarioTodo) return;

    setInvioTodo(true);
    setMessaggioTodo("");

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setInvioTodo(false);
      setMessaggioTodo("Sessione non valida. Effettua nuovamente l'accesso.");
      return;
    }

    try {
      const response = await fetch("/api/todo/notifica", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          personaId: destinatarioTodo,
          testo: todoDaInviare.testo,
        }),
      });
      const risultato = (await response.json()) as {
        error?: string;
        destinatario?: string;
      };

      if (!response.ok) {
        throw new Error(risultato.error || "Invio non riuscito.");
      }

      setMessaggioTodo(
        `Promemoria inviato a ${risultato.destinatario || "destinatario"}.`
      );
    } catch (error) {
      setMessaggioTodo(
        error instanceof Error ? error.message : "Invio non riuscito."
      );
    } finally {
      setInvioTodo(false);
    }
  }

  useEffect(() => {
    // I dati della dashboard vengono richiesti dopo il primo rendering.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    caricaDashboard();
    // Il caricamento iniziale deve avvenire una sola volta all'apertura.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const vociStudioVisibili = mostraTutteVoci
    ? listaStudio
    : listaStudio.slice(0, 5);
  const destinatariTodo = personaleTodo.filter((persona) =>
    Boolean(persona.email?.trim())
  );

  return (
    <LayoutApp>
      <div className="space-y-5 xl:space-y-6">
        {caricamento ? (
          <div className="min-h-[50vh] flex items-center justify-center">
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span className="h-8 w-8 rounded-xl bg-white shadow-sm flex items-center justify-center text-[#5E9AD3]">
                <AppIcon name="refresh" size={17} className="animate-spin" />
              </span>
              Caricamento dashboard...
            </div>
          </div>
        ) : (
          <>
            <nav
              aria-label="Collegamenti rapidi"
              className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3"
            >
              {COLLEGAMENTI_RAPIDI.map((collegamento) => (
                <a
                  key={collegamento.nome}
                  href={collegamento.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group min-h-[78px] bg-white border border-white shadow-[0_8px_24px_rgba(15,23,42,0.06)] rounded-2xl p-3.5 flex items-center gap-3 text-[#2B2F5E] hover:-translate-y-0.5 hover:border-[#D79D06]/35 hover:shadow-[0_14px_30px_rgba(43,47,94,0.12)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D79D06] transition"
                  title={"Apri " + collegamento.nome}
                >
                  <span
                    aria-hidden="true"
                    className={
                      collegamento.colore +
                      " w-12 h-12 shrink-0 rounded-xl flex items-center justify-center text-white shadow-sm group-hover:scale-[1.04] transition"
                    }
                  >
                    <AppIcon name={collegamento.icona} size={21} />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-semibold leading-tight">
                      {collegamento.nome}
                    </span>
                  </span>

                  <span
                    aria-hidden="true"
                    className="h-8 w-8 shrink-0 rounded-xl bg-[#F2F2F2] flex items-center justify-center text-gray-400 group-hover:bg-[#D79D06]/10 group-hover:text-[#D79D06] transition"
                  >
                    <AppIcon name="externalLink" size={15} />
                  </span>
                </a>
              ))}
            </nav>

            <Card
              className="shadow-[0_12px_32px_rgba(43,47,94,0.08)]"
              bodyClassName="p-4 sm:p-5"
              title={
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Link
                    href="/attivita/calendario"
                    className="flex items-center gap-3 hover:text-[#D79D06] transition"
                  >
                    <span className="h-9 w-9 rounded-xl bg-[#5E9AD3]/12 text-[#2D80B3] flex items-center justify-center">
                      <AppIcon name="calendar" size={18} />
                    </span>
                    <span className="font-semibold">
                      Calendario attività in corso
                    </span>
                  </Link>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setOffsetCalendarioDashboard(0)}
                      className="h-9 px-3 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-[#2B2F5E] hover:border-[#5E9AD3] hover:text-[#2D80B3] cursor-pointer"
                    >
                      Oggi
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setOffsetCalendarioDashboard((corrente) => corrente - 1)
                      }
                      className="h-9 w-9 rounded-xl border border-gray-200 bg-white text-[#2B2F5E] text-xl flex items-center justify-center hover:border-[#D79D06] hover:text-[#D79D06] cursor-pointer"
                      aria-label="Giorni precedenti"
                      title="Giorni precedenti"
                    >
                      {"\u2039"}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setOffsetCalendarioDashboard((corrente) => corrente + 1)
                      }
                      className="h-9 w-9 rounded-xl border border-gray-200 bg-white text-[#2B2F5E] text-xl flex items-center justify-center hover:border-[#D79D06] hover:text-[#D79D06] cursor-pointer"
                      aria-label="Giorni successivi"
                      title="Giorni successivi"
                    >
                      {"\u203a"}
                    </button>
                  </div>
                </div>
              }
            >
              <Link href="/attivita/calendario" className="block">
                <DashboardActivityCalendar
                  attivita={attivita}
                  appuntamenti={appuntamenti}
                  offsetGiorni={offsetCalendarioDashboard}
                  setOffsetGiorni={setOffsetCalendarioDashboard}
                />
              </Link>
            </Card>

            <div className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1.04fr)_minmax(0,0.96fr)] gap-5 items-stretch">
              <Card
                title={
                  <span className="flex items-center gap-3 font-semibold">
                    <span className="h-9 w-9 rounded-xl bg-[#5E9AD3]/12 text-[#2D80B3] flex items-center justify-center">
                      <AppIcon name="activity" size={18} />
                    </span>
                    Ultimi aggiornamenti attività
                  </span>
                }
                bodyClassName="p-5"
              >
                <div className="relative max-h-[840px] overflow-y-auto pr-2">
                  {aggiornamenti.length === 0 ? (
                    <p className="text-sm text-gray-400">
                      Nessun aggiornamento presente.
                    </p>
                  ) : (
                    aggiornamenti.map((item) => {
                      const tipo = item.commesse?.tipo_commessa || "";
                      const markerClass = getColoreBgTipoCommessa(tipo);

                      const contenuto = (
                        <div className="relative pl-9 pb-5 last:pb-0">
                          <span className="absolute left-[11px] top-5 bottom-0 w-px bg-gray-200" />
                          <span
                            className={
                              "absolute left-1 top-1 h-4 w-4 rounded-full border-[3px] border-white shadow-sm " +
                              markerClass
                            }
                          />
                          <p className="text-[11px] font-semibold uppercase text-[#D79D06]">
                            {new Date(item.created_at).toLocaleDateString("it-IT")}{" "}
                            {new Date(item.created_at).toLocaleTimeString("it-IT", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                          <p className="mt-1 text-[14px] font-semibold text-[#2B2F5E] leading-snug">
                            {item.commesse?.titolo || "Commessa"}
                          </p>
                          <p className="mt-1 text-[13px] text-gray-500 leading-relaxed">
                            {item.testo}
                          </p>
                        </div>
                      );

                      return item.commesse?.id ? (
                        <Link
                          key={item.id}
                          href={"/commesse/" + item.commesse.id}
                          className="block rounded-xl hover:bg-[#F2F2F2]/65 transition"
                        >
                          {contenuto}
                        </Link>
                      ) : (
                        <div
                          key={item.id}
                          className="rounded-xl"
                        >
                          {contenuto}
                        </div>
                      );
                    })
                  )}
                </div>
              </Card>

              <div className="flex min-w-0 flex-col gap-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Card
                    title={
                      <span className="flex items-center gap-3 font-semibold">
                        <span className="h-9 w-9 rounded-xl bg-[#D79D06]/12 text-[#D79D06] flex items-center justify-center">
                          <AppIcon name="message" size={18} />
                        </span>
                        Prossima riunione
                      </span>
                    }
                  >
                    <div className="flex gap-2 mb-4">
                      <input
                        value={nuovoArgomento}
                        onChange={(e) => setNuovoArgomento(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") aggiungiArgomento();
                        }}
                        placeholder="Aggiungi argomento..."
                        className="min-w-0 flex-1 border border-gray-200 rounded-xl px-4 py-3 bg-[#F2F2F2]/70 outline-none focus:bg-white focus:border-[#64B445] focus:ring-4 focus:ring-[#64B445]/10 text-[13px] text-[#2B2F5E]"
                      />

                      <button
                        type="button"
                        onClick={aggiungiArgomento}
                        className="bg-[#64B445] text-white w-11 h-11 shrink-0 rounded-xl hover:bg-[#5AA03E] hover:-translate-y-0.5 flex items-center justify-center shadow-sm cursor-pointer"
                        aria-label="Aggiungi argomento"
                        title="Aggiungi"
                      >
                        <AppIcon name="plus" size={19} />
                      </button>
                    </div>

                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                      {argomenti.length === 0 ? (
                        <p className="text-sm text-gray-400">
                          Nessun argomento inserito.
                        </p>
                      ) : (
                        argomenti.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-2.5 rounded-xl bg-[#F2F2F2]/75 px-3 py-2.5"
                          >
                            <span className="text-[#D79D06] shrink-0">
                              <AppIcon name="message" size={15} />
                            </span>
                            <p className="min-w-0 flex-1 text-[13px] text-[#2B2F5E] leading-snug">
                              {item.testo}
                            </p>
                            <button
                              type="button"
                              onClick={() => eliminaArgomento(item.id)}
                              className="h-7 w-7 shrink-0 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                              aria-label="Rimuovi argomento"
                              title="Rimuovi"
                            >
                              <AppIcon name="x" size={14} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </Card>

                  <Card
                    title={
                      <span className="flex items-center gap-3 font-semibold">
                        <span className="h-9 w-9 rounded-xl bg-[#64B445]/12 text-[#64B445] flex items-center justify-center">
                          <AppIcon name="listTodo" size={18} />
                        </span>
                        To Do
                      </span>
                    }
                  >
                    <div className="flex gap-2 mb-4">
                      <input
                        value={nuovaVoceStudio}
                        onChange={(e) => setNuovaVoceStudio(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") aggiungiVoceStudio();
                        }}
                        placeholder="Es. comprare carta, toner, cancelleria..."
                        className="min-w-0 flex-1 border border-gray-200 rounded-xl px-4 py-3 bg-[#F2F2F2]/70 outline-none focus:bg-white focus:border-[#64B445] focus:ring-4 focus:ring-[#64B445]/10 text-[13px] text-[#2B2F5E]"
                      />

                      <button
                        type="button"
                        onClick={aggiungiVoceStudio}
                        className="bg-[#64B445] text-white w-11 h-11 shrink-0 rounded-xl hover:bg-[#5AA03E] hover:-translate-y-0.5 flex items-center justify-center shadow-sm cursor-pointer"
                        aria-label="Aggiungi attività"
                        title="Aggiungi"
                      >
                        <AppIcon name="plus" size={19} />
                      </button>
                    </div>

                    <div className="space-y-2">
                      {listaStudio.length === 0 ? (
                        <p className="text-sm text-gray-400">
                          Nessuna voce inserita.
                        </p>
                      ) : (
                        vociStudioVisibili.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-[#F2F2F2]/75"
                          >
                            <span className="h-7 w-7 shrink-0 rounded-lg bg-[#64B445]/10 text-[#64B445] flex items-center justify-center">
                              <AppIcon name="listTodo" size={14} />
                            </span>
                            <span className="min-w-0 flex-1 text-[13px] leading-snug text-[#2B2F5E]">
                              {item.testo}
                            </span>

                            <button
                              type="button"
                              onClick={() => {
                                setTodoDaInviare(item);
                                setDestinatarioTodo("");
                                setMessaggioTodo("");
                              }}
                              className="h-8 w-8 shrink-0 rounded-lg flex items-center justify-center text-[#2D80B3] hover:bg-[#5E9AD3]/10 cursor-pointer"
                              aria-label={"Invia promemoria per " + item.testo}
                              title="Invia promemoria email"
                            >
                              <AppIcon name="mail" size={15} />
                            </button>

                            <button
                              type="button"
                              onClick={() => eliminaVoceStudio(item.id)}
                              className="h-7 w-7 shrink-0 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                              aria-label="Elimina voce"
                              title="Elimina"
                            >
                              <AppIcon name="x" size={14} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    {listaStudio.length > 5 && (
                      <button
                        type="button"
                        onClick={() =>
                          setMostraTutteVoci((corrente) => !corrente)
                        }
                        className="mt-3 text-xs font-semibold text-[#2D80B3] hover:text-[#D79D06] cursor-pointer"
                      >
                        {mostraTutteVoci ? "Mostra meno" : "Vedi tutte"}
                      </button>
                    )}
                  </Card>

                </div>

                <Card
                  title={
                    <span className="flex items-center gap-3 font-semibold">
                      <span className="h-9 w-9 rounded-xl bg-[#5E9AD3]/12 text-[#2D80B3] flex items-center justify-center">
                        <AppIcon name="map" size={18} />
                      </span>
                      Mappa commesse
                    </span>
                  }
                  bodyClassName="p-3 sm:p-4"
                >
                  <DashboardMap commesse={commesseMappa} />
                </Card>
              </div>
            </div>
          </>
        )}
      </div>

      {todoDaInviare && (
        <div className="fixed inset-0 z-[1200] bg-[#2B2F5E]/45 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-[0_24px_60px_rgba(43,47,94,0.22)]">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="h-11 w-11 shrink-0 rounded-xl bg-[#5E9AD3]/12 text-[#2D80B3] flex items-center justify-center">
                  <AppIcon name="mail" size={20} />
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-[#2B2F5E]">
                    Invia promemoria
                  </h2>
                  <p className="mt-1 text-sm text-gray-500 leading-relaxed">
                    Seleziona la persona a cui ricordare questa attivit&agrave;.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTodoDaInviare(null)}
                className="h-9 w-9 rounded-xl flex items-center justify-center text-gray-400 hover:bg-[#F2F2F2] hover:text-[#2B2F5E] cursor-pointer"
                aria-label="Chiudi"
              >
                <AppIcon name="x" size={18} />
              </button>
            </div>

            <div className="mt-5 rounded-xl border border-gray-100 bg-[#F2F2F2]/70 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#D79D06]">
                Promemoria
              </p>
              <p className="mt-1 text-sm font-medium text-[#2B2F5E] leading-relaxed">
                {todoDaInviare.testo}
              </p>
            </div>

            <label className="mt-5 block text-sm font-semibold text-[#2B2F5E]">
              Destinatario
              <select
                value={destinatarioTodo}
                onChange={(event) => setDestinatarioTodo(event.target.value)}
                className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-normal text-[#2B2F5E] outline-none focus:border-[#5E9AD3] focus:ring-4 focus:ring-[#5E9AD3]/10"
              >
                <option value="">Seleziona una persona</option>
                {destinatariTodo.map((persona) => (
                  <option key={persona.id} value={persona.id}>
                    {persona.nome} - {persona.email}
                  </option>
                ))}
              </select>
            </label>

            {destinatariTodo.length === 0 && (
              <p className="mt-3 text-sm text-[#D79D06]">
                Nessuna persona attiva ha un indirizzo email configurato.
              </p>
            )}

            {messaggioTodo && (
              <p
                className={
                  "mt-4 rounded-xl px-4 py-3 text-sm " +
                  (messaggioTodo.startsWith("Promemoria inviato")
                    ? "bg-[#64B445]/10 text-[#4F7C3A]"
                    : "bg-red-50 text-red-600")
                }
              >
                {messaggioTodo}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setTodoDaInviare(null)}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#2B2F5E] hover:bg-[#F2F2F2] cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={inviaPromemoriaTodo}
                disabled={!destinatarioTodo || invioTodo}
                className="rounded-xl bg-[#5E9AD3] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#2D80B3] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
              >
                <AppIcon name="mail" size={16} />
                {invioTodo ? "Invio..." : "Invia promemoria"}
              </button>
            </div>
          </div>
        </div>
      )}
    </LayoutApp>
  );
}

function Card({
  title,
  children,
  bodyClassName = "",
  className = "",
}: {
  title: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
  className?: string;
}) {
  return (
    <section
      className={
        "h-full overflow-hidden rounded-2xl border border-white bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)] " +
        className
      }
    >
      <div className="px-4 sm:px-5 py-3.5 border-b border-gray-100 bg-white">
        <div className="text-[15px] sm:text-[16px] font-medium text-[#2B2F5E]">
          {title}
        </div>
      </div>
      <div className={"p-4 " + bodyClassName}>{children}</div>
    </section>
  );
}
