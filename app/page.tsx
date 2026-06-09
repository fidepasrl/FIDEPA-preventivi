"use client";

import { useEffect, useMemo, useState } from "react";
import LayoutApp from "@/components/LayoutApp";
import { supabase } from "@/lib/supabase";
import dynamic from "next/dynamic";
import DashboardActivityCalendar from "@/components/DashboardActivityCalendar";

type TipoCommessa = "Pubblica" | "Privata" | "Gara" | "Concorso";

type Aggiornamento = {
  id: string;
  testo: string;
  data_nota: string | null;
  created_at: string;
  commesse: {
    titolo: string;
    codice: string | null;
    tipo_commessa: TipoCommessa | null;
  } | null;
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

type CommessaMappa = {
  id: string;
  titolo: string;
  posizione: string | null;
  latitudine: number | null;
  longitudine: number | null;
  tipo_commessa: TipoCommessa | null;
};

const SIMBOLO_TIPO: Record<string, string> = {
  Pubblica: "■",
  Privata: "●",
  Gara: "▲",
  Concorso: "⚑",
};

export default function Home() {
  const [aggiornamenti, setAggiornamenti] = useState<Aggiornamento[]>([]);
  const [attivita, setAttivita] = useState<Attivita[]>([]);
  const [argomenti, setArgomenti] = useState<ArgomentoRiunione[]>([]);
  const [listaStudio, setListaStudio] = useState<VoceStudio[]>([]);
  const [commesseMappa, setCommesseMappa] = useState<CommessaMappa[]>([]);

  const DashboardMap = dynamic(
    () => import("@/components/DashboardMap").then((mod) => mod.default),
    {
      ssr: false,
    }
  );

  const [nuovoArgomento, setNuovoArgomento] = useState("");
  const [nuovaVoceStudio, setNuovaVoceStudio] = useState("");

  const [caricamento, setCaricamento] = useState(true);

  const oggi = new Date().toISOString().slice(0, 10);

  const prossimiGiorni = useMemo(() => {
    const giorni: Date[] = [];
    const base = new Date();
    base.setHours(0, 0, 0, 0);

    for (let i = 0; i < 14; i++) {
      const giorno = new Date(base);
      giorno.setDate(base.getDate() + i);
      giorni.push(giorno);
    }

    return giorni;
  }, []);

  useEffect(() => {
    caricaDashboard();
  }, []);

  async function caricaDashboard() {
    setCaricamento(true);

    await Promise.all([
      caricaAggiornamenti(),
      caricaAttivita(),
      caricaArgomenti(),
      caricaListaStudio(),
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

    const aggiornamentiNormalizzati: Aggiornamento[] = (data || []).map(
      (item: any) => ({
        id: item.id,
        testo: item.testo,
        data_nota: item.data_nota,
        created_at: item.created_at,
        commesse: Array.isArray(item.commesse)
          ? item.commesse[0] || null
          : item.commesse,
      })
    );

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
      data?.map((item: any) => ({
        id: item.id,
        titolo: item.titolo,
        data_inizio: item.data_inizio,
        giorni: item.giorni,
        commessa_id: item.commessa_id,
        tipo_commessa: item.commesse?.tipo_commessa || null,
        titolo_commessa: item.commesse?.titolo || null,
        persone:
          item.attivita_personale
            ?.map((rel: any) => rel.personale)
            .filter(Boolean) || [],
      })) || [];

    setAttivita(normalizzate);
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

  async function caricaCommesseMappa() {
    const { data, error } = await supabase
      .from("commesse")
      .select("id, titolo, posizione, latitudine, longitudine, tipo_commessa")
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

  async function toggleVoceStudio(item: VoceStudio) {
    const nuovoValore = !item.completato;

    const { error } = await supabase
      .from("lista_studio")
      .update({ completato: nuovoValore })
      .eq("id", item.id);

    if (error) {
      alert("Errore durante l'aggiornamento della voce.");
      return;
    }

    setListaStudio((correnti) =>
      correnti.map((voce) =>
        voce.id === item.id ? { ...voce, completato: nuovoValore } : voce
      )
    );
  }

  async function eliminaVoceStudio(id: string) {
    const { error } = await supabase.from("lista_studio").delete().eq("id", id);

    if (error) {
      alert("Errore durante l'eliminazione della voce.");
      return;
    }

    setListaStudio((correnti) => correnti.filter((item) => item.id !== id));
  }

  function formattaData(data: string | null) {
    if (!data) return "-";
    return new Date(data).toLocaleDateString("it-IT");
  }

  function isWeekend(data: Date) {
    const giorno = data.getDay();
    return giorno === 0 || giorno === 6;
  }

  function normalizzaData(data: Date) {
    return new Date(data.getFullYear(), data.getMonth(), data.getDate());
  }

  function aggiungiGiorniLavorativi(
    dataInizio: Date,
    giorniLavorativi: number
  ) {
    const data = new Date(dataInizio);
    let giorniConteggiati = isWeekend(data) ? 0 : 1;

    while (giorniConteggiati < giorniLavorativi) {
      data.setDate(data.getDate() + 1);

      if (!isWeekend(data)) {
        giorniConteggiati++;
      }
    }

    return data;
  }

  function attivitaNelGiorno(giorno: Date) {
    if (isWeekend(giorno)) return [];

    return attivita.filter((item) => {
      const inizio = new Date(item.data_inizio);
      const fine = aggiungiGiorniLavorativi(
        inizio,
        Number(item.giorni || 1)
      );

      return (
        normalizzaData(giorno) >= normalizzaData(inizio) &&
        normalizzaData(giorno) <= normalizzaData(fine)
      );
    });
  }

  return (
    <LayoutApp>
      <div className="space-y-6">

        {caricamento ? (
          <p className="text-center text-gray-500 py-10">
            Caricamento dashboard...
          </p>
        ) : (
          <>

            <Card title="Calendario attività in corso">
              <DashboardActivityCalendar attivita={attivita} />
            </Card>

            <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-4 items-stretch">
              <Card title="Ultimi aggiornamenti attività">
                <div className="space-y-3">
                  {aggiornamenti.length === 0 ? (
                    <p className="text-sm text-gray-400">
                      Nessun aggiornamento presente.
                    </p>
                  ) : (
                    aggiornamenti.map((item) => {
                      const tipo = item.commesse?.tipo_commessa || "";
                      const simbolo = tipo ? SIMBOLO_TIPO[tipo] || "" : "";

                      return (
                        <div
                          key={item.id}
                          className="border-b border-gray-100 pb-3 last:border-b-0 last:pb-0"
                        >
                          <p className="text-[13px] text-[#D79D06]">
                            {new Date(item.created_at).toLocaleDateString("it-IT")}{" "}
                            {new Date(item.created_at).toLocaleTimeString("it-IT", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>

                          <p className="text-[14px] text-[#2B2F5E] leading-snug">
                            <span className="font-semibold">
                              {simbolo} {item.commesse?.titolo || "Commessa"}
                            </span>{" "}
                            - {item.testo}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>
              </Card>

              <div className="grid grid-rows-[250px_auto] gap-4">

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[250px]">
                  <Card title="Argomenti prossima riunione">
                    <div className="flex gap-2 mb-4">
                      <input
                        value={nuovoArgomento}
                        onChange={(e) => setNuovoArgomento(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") aggiungiArgomento();
                        }}
                        placeholder="Aggiungi argomento..."
                        className="flex-1 border border-gray-300 rounded-md px-4 py-3 bg-transparent outline-none transition focus:bg-white focus:border-[#64B445] focus:shadow-sm text-[14px] text-[#2B2F5E]"
                      />

                      <button
                        type="button"
                        onClick={aggiungiArgomento}
                        className="bg-[#64B445] text-white w-12 h-12 rounded-md text-2xl font-light hover:bg-[#5AA03E] hover:scale-105 transition flex items-center justify-center shadow-sm cursor-pointer"
                      >
                        +
                      </button>
                    </div>

                    <div className="space-y-2">
                      {argomenti.length === 0 ? (
                        <p className="text-sm text-gray-400">
                          Nessun argomento inserito.
                        </p>
                      ) : (
                        argomenti.map((item) => (
                          <div
                            key={item.id}
                            className="flex justify-between items-start gap-3 border-b border-gray-100 pb-2 last:border-b-0"
                          >
                            <p className="text-[14px] text-[#2B2F5E]">
                              {item.testo}
                            </p>

                            <button
                              type="button"
                              onClick={() => eliminaArgomento(item.id)}
                              className="text-red-500 hover:text-red-700 text-lg font-semibold transition cursor-pointer"
                            >
                              ×
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </Card>

                  <Card title="To Do">
                    <div className="flex gap-2 mb-4">
                      <input
                        value={nuovaVoceStudio}
                        onChange={(e) => setNuovaVoceStudio(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") aggiungiVoceStudio();
                        }}
                        placeholder="Es. comprare carta, toner, cancelleria..."
                        className="flex-1 border border-gray-300 rounded-md px-4 py-3 bg-transparent outline-none transition focus:bg-white focus:border-[#64B445] focus:shadow-sm text-[14px] text-[#2B2F5E]"
                      />

                      <button
                        type="button"
                        onClick={aggiungiVoceStudio}
                        className="bg-[#64B445] text-white w-12 h-12 rounded-md text-2xl font-light hover:bg-[#5AA03E] hover:scale-105 transition flex items-center justify-center shadow-sm cursor-pointer"
                      >
                        +
                      </button>
                    </div>

                    <div className="space-y-2">
                      {listaStudio.length === 0 ? (
                        <p className="text-sm text-gray-400">
                          Nessuna voce inserita.
                        </p>
                      ) : (
                        listaStudio.map((item) => (
                          <div
                            key={item.id}
                            className="flex justify-between items-center gap-3 border-b border-gray-100 pb-2 last:border-b-0"
                          >
                            <button
                              type="button"
                              onClick={() => toggleVoceStudio(item)}
                              className={`text-left flex-1 text-[14px] cursor-pointer ${
                                item.completato
                                  ? "text-gray-400 line-through"
                                  : "text-[#2B2F5E]"
                              }`}
                            >
                              {item.testo}
                            </button>

                            <button
                              type="button"
                              onClick={() => eliminaVoceStudio(item.id)}
                              className="text-red-500 hover:text-red-700 text-lg font-semibold transition cursor-pointer"
                            >
                              ×
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </Card>

                </div>  

                <Card title="Mappa commesse" bodyClassName="h-full">
                  <DashboardMap commesse={commesseMappa} />
                </Card>

              </div>

            </div>

            <Card title="Spotify studio">
              <div className="h-[180px] bg-[#FAFAFA] border border-dashed border-gray-300 rounded-sm flex flex-col items-center justify-center text-center">
                <p className="text-[13px] uppercase tracking-[0.2em] text-gray-400">
                  Spotify web player
                </p>

                <p className="mt-2 text-[15px] text-[#2B2F5E]">
                  Integrazione da sviluppare
                </p>
              </div>
            </Card>
          </>
        )}
      </div>
    </LayoutApp>
  );
}

function Card({
  title,
  children,
  bodyClassName = "",
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  bodyClassName?: string;
  className?: string;
}) {
  return (
    <div className={`bg-white border border-gray-200 shadow-sm rounded-sm overflow-hidden ${className}`}>
      <div className="bg-white border border-gray-200 shadow-sm rounded-sm overflow-hidden h-full">
        <div className="px-4 py-3 border-b border-gray-200 bg-[#FAFAFA]">
          <h3 className="text-[17px] font-normal text-[#2B2F5E]">{title}</h3>
        </div>

        <div className={`p-4 ${bodyClassName}`}>{children}</div>
      </div>
    </div> 
  );
}