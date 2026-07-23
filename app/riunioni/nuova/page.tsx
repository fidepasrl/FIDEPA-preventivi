"use client";

import { useEffect, useMemo, useState } from "react";
import LayoutApp from "@/components/LayoutApp";
import { supabase } from "@/lib/supabase";
import {
  SIMBOLO_TIPO_COMMESSA,
  type TipoCommessa,
} from "@/lib/tipiCommesse";

type Priorita = "Urgente" | "Alta" | "Normale" | "Bassa" | "Terminato";

type Commessa = {
  id: string;
  titolo: string;
  codice: string | null;
  priorita: Priorita;
  tipo_commessa: TipoCommessa;
};

type NotaRiunione = {
  commessa_id: string | null;
  argomento_id?: string | null;
  titolo: string;
  data: string;
  testo: string;
  tipo: "commessa" | "libera" | "argomento";
};

type ArgomentoRiunione = {
  id: string;
  testo: string;
  completato: boolean;
  inserito_in_riunione: boolean;
  created_at: string;
};

type AggiornamentoCommessa = {
  id: string;
  testo: string;
  data_nota: string | null;
  created_at: string;
};

const PRIORITA: Priorita[] = [
  "Urgente",
  "Alta",
  "Normale",
  "Bassa",
  "Terminato",
];

export default function NuovaRiunionePage() {
  const [commesse, setCommesse] = useState<Commessa[]>([]);
  const [note, setNote] = useState<NotaRiunione[]>([]);
  const [commessaSelezionata, setCommessaSelezionata] =
    useState<Commessa | null>(null);

  const [salvataggioOk, setSalvataggioOk] = useState(false);

  const [argomenti, setArgomenti] = useState<ArgomentoRiunione[]>([]);
  const [aggiornamentiCommesse, setAggiornamentiCommesse] = useState<
    Partial<Record<string, AggiornamentoCommessa[]>>
  >({});
  const [caricamentoAggiornamenti, setCaricamentoAggiornamenti] = useState<
    string[]
  >([]);

  const oggi = new Date().toISOString().slice(0, 10);

  const settimana = useMemo(() => {
    const data = new Date();
    const primoGennaio = new Date(data.getFullYear(), 0, 1);
    const giorni = Math.floor(
      (data.getTime() - primoGennaio.getTime()) / 86400000
    );

    return Math.ceil((giorni + primoGennaio.getDay() + 1) / 7);
  }, []);

  const titoloRiunione = `Riunione Week ${settimana}`;

  useEffect(() => {
    caricaCommesse();
    caricaArgomenti();
  }, []);

  async function caricaCommesse() {
    const { data, error } = await supabase
      .from("commesse")
      .select("id, titolo, codice, priorita, tipo_commessa")
      .eq("lavoro_privato_non_fidepa", false)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setCommesse([]);
      return;
    }

    setCommesse(data || []);
  }

  function selezionaCommessa(commessa: Commessa) {
    setCommessaSelezionata(commessa);
    caricaUltimiAggiornamenti(commessa.id);

    const giaPresente = note.some(
      (nota) => nota.tipo === "commessa" && nota.commessa_id === commessa.id
    );

    if (!giaPresente) {
      setNote((correnti) => [
        ...correnti,
        {
          commessa_id: commessa.id,
          titolo: commessa.titolo,
          data: oggi,
          testo: "",
          tipo: "commessa",
        },
      ]);
    }
  }

  async function caricaUltimiAggiornamenti(commessaId: string) {
    setCaricamentoAggiornamenti((correnti) =>
      correnti.includes(commessaId) ? correnti : [...correnti, commessaId]
    );

    const { data, error } = await supabase
      .from("commesse_note")
      .select("id, testo, data_nota, created_at")
      .eq("commessa_id", commessaId)
      .order("data_nota", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(3);

    if (error) {
      console.error("Errore caricamento aggiornamenti commessa:", error);
      setAggiornamentiCommesse((correnti) => ({
        ...correnti,
        [commessaId]: [],
      }));
    } else {
      setAggiornamentiCommesse((correnti) => ({
        ...correnti,
        [commessaId]: data || [],
      }));
    }

    setCaricamentoAggiornamenti((correnti) =>
      correnti.filter((id) => id !== commessaId)
    );
  }

  async function caricaArgomenti() {
    const { data, error } = await supabase
      .from("argomenti_riunione")
      .select("*")
      .eq("completato", false)
      .eq("inserito_in_riunione", false)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Errore caricamento argomenti:", error);
      setArgomenti([]);
      return;
    }

    setArgomenti(data || []);
  }

  function selezionaArgomento(argomento: ArgomentoRiunione) {
    const giaPresente = note.some(
      (nota) => nota.tipo === "argomento" && nota.argomento_id === argomento.id
    );

    if (giaPresente) return;

    setNote((correnti) => [
      ...correnti,
      {
        commessa_id: null,
        argomento_id: argomento.id,
        titolo: argomento.testo,
        data: oggi,
        testo: "",
        tipo: "argomento",
      },
    ]);

    setArgomenti((correnti) =>
      correnti.filter((item) => item.id !== argomento.id)
    );

    setCommessaSelezionata(null);
  }

  function aggiungiNotaLibera() {
    setNote((correnti) => [
      ...correnti,
      {
        commessa_id: null,
        titolo: "Nota libera",
        data: oggi,
        testo: "",
        tipo: "libera",
      },
    ]);

    setCommessaSelezionata(null);
  }

  function rimuoviNotaDallaRiunione(indexDaRimuovere: number) {
    const notaRimossa = note[indexDaRimuovere];

    setNote((correnti) =>
      correnti.filter((_, index) => index !== indexDaRimuovere)
    );

    if (
      notaRimossa?.commessa_id &&
      commessaSelezionata?.id === notaRimossa.commessa_id
    ) {
      setCommessaSelezionata(null);
    }

    if (notaRimossa?.tipo === "argomento" && notaRimossa.argomento_id) {
      setArgomenti((correnti) => [
        {
          id: notaRimossa.argomento_id!,
          testo: notaRimossa.titolo,
          completato: false,
          inserito_in_riunione: false,
          created_at: new Date().toISOString(),
        },
        ...correnti,
      ]);
    }
  }

  function aggiornaNota(
    indexNota: number,
    campo: keyof NotaRiunione,
    valore: string
  ) {
    setNote((correnti) =>
      correnti.map((nota, index) =>
        index === indexNota
          ? {
              ...nota,
              [campo]: valore,
            }
          : nota
      )
    );
  }

  async function salvaRiunione() {
    const noteCompilate = note.filter((nota) => nota.testo.trim());

    const { error: erroreRiunione } = await supabase.from("riunioni").insert({
      titolo: titoloRiunione,
      settimana,
      data_riunione: oggi,
      contenuto: noteCompilate,
    });

    if (erroreRiunione) {
      alert("Errore durante il salvataggio della riunione.");
      return;
    }

    for (const nota of noteCompilate) {
      if (nota.tipo !== "commessa" || !nota.commessa_id) continue;

      await supabase.from("commesse_note").insert({
        commessa_id: nota.commessa_id,
        testo: nota.testo.trim(),
        origine: "riunione",
        data_nota: nota.data,
      });
    }

    const argomentiInseriti = noteCompilate
      .filter((nota) => nota.tipo === "argomento" && nota.argomento_id)
      .map((nota) => nota.argomento_id);

    if (argomentiInseriti.length > 0) {
      await supabase
        .from("argomenti_riunione")
        .update({
          completato: true,
          inserito_in_riunione: true,
        })
        .in("id", argomentiInseriti);
    }

    setSalvataggioOk(true);
  }

  return (
    <LayoutApp>
      <div className="grid grid-cols-[260px_1fr] gap-6">
        <aside className="border-r border-gray-300 pr-4">
          <div className="space-y-5">
            {PRIORITA.map((priorita) => {
              const commessePriorita = commesse.filter(
                (commessa) => commessa.priorita === priorita
              );

              if (commessePriorita.length === 0) return null;

              return (
                <div key={priorita}>
                  <p
                    className={`text-[11px] uppercase tracking-[0.12em] font-semibold mb-2 ${
                      priorita === "Urgente"
                        ? "text-[#D96F4B]"
                        : priorita === "Alta"
                        ? "text-[#D79D06]"
                        : priorita === "Normale"
                        ? "text-[#5E9AD3]"
                        : priorita === "Bassa"
                        ? "text-[#64B445]"
                        : "text-gray-400"
                    }`}
                  >
                    {priorita}
                  </p>

                  <div className="space-y-1">
                    {commessePriorita.map((commessa) => {
                      const attiva =
                        commessaSelezionata?.id === commessa.id;

                      return (
                        <button
                          key={commessa.id}
                          type="button"
                          onClick={() => selezionaCommessa(commessa)}
                          className={`w-full text-left px-3 py-2 rounded-sm text-[13px] transition cursor-pointer ${
                            attiva
                              ? "bg-white text-[#2B2F5E] font-semibold shadow-sm border border-gray-200"
                              : "text-[#2B2F5E] hover:bg-[#e8e8e8]"
                          }`}
                        >
                          <span className="mr-2">
                            {SIMBOLO_TIPO_COMMESSA[commessa.tipo_commessa]}
                          </span>

                          {commessa.titolo}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            <div className="pt-4 border-t border-gray-300">
              <p className="text-[11px] uppercase tracking-[0.12em] font-semibold mb-2 text-[#D79D06]">
                Argomenti suggeriti
              </p>

              <div className="space-y-1">
                {argomenti.length === 0 ? (
                  <p className="text-[13px] text-gray-400 px-3 py-2">
                    Nessun argomento disponibile.
                  </p>
                ) : (
                  argomenti.map((argomento) => (
                    <button
                      key={argomento.id}
                      type="button"
                      onClick={() => selezionaArgomento(argomento)}
                      className="w-full text-left px-3 py-2 rounded-sm text-[13px] text-[#2B2F5E] hover:bg-[#e8e8e8] transition cursor-pointer"
                    >
                      {argomento.testo}
                    </button>
                  ))
                )}
              </div>
            </div>

          </div>
        </aside>

        <section>
          <div className="flex justify-end mb-4">
            <div className="text-right">
              <h2 className="text-[24px] font-semibold text-[#2B2F5E]">
                {titoloRiunione}
              </h2>

              <p className="text-[15px] text-[#D79D06] mt-1">
                {new Date(oggi).toLocaleDateString("it-IT")}
              </p>
            </div>
          </div>

          <div className="bg-[#FFFDF5] border border-gray-200 shadow-sm rounded-sm min-h-[720px] p-10 relative overflow-hidden">
            <div
              className="absolute inset-0 pointer-events-none opacity-60"
              style={{
                backgroundImage:
                  "linear-gradient(#e8dfc8 1px, transparent 1px)",
                backgroundSize: "100% 34px",
              }}
            />

            <div className="relative z-10 space-y-8">
              {note.length === 0 ? (
                <p className="text-gray-400 text-[15px]">
                  Seleziona una commessa dall’elenco a sinistra oppure aggiungi
                  una nota libera.
                </p>
              ) : (
                note.map((nota, index) => (
                  <div
                    key={`${nota.commessa_id || "libera"}-${index}`}
                    className="relative space-y-3"
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex items-center gap-3">
                        <h3 className="text-[20px] font-semibold text-[#2B2F5E]">
                          {nota.titolo}
                        </h3>

                        {nota.tipo !== "commessa" && (
                          <span className="text-[11px] uppercase tracking-[0.12em] text-gray-400 font-medium">
                            {nota.tipo === "argomento" ? "Argomento riunione" : "Nota libera"}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => rimuoviNotaDallaRiunione(index)}
                        className="text-red-500 hover:text-red-700 text-lg font-semibold transition cursor-pointer"
                        title="Rimuovi dal foglio riunione"
                      >
                        ×
                      </button>
                    </div>

                    {nota.tipo === "commessa" && nota.commessa_id && (
                      <div className="border-l-2 border-[#D79D06] bg-white/70 px-4 py-3">
                        <p className="text-[11px] uppercase tracking-[0.12em] font-semibold text-gray-500 mb-2">
                          Ultimi aggiornamenti
                        </p>

                        {caricamentoAggiornamenti.includes(
                          nota.commessa_id
                        ) ? (
                          <p className="text-[13px] text-gray-400">
                            Caricamento aggiornamenti...
                          </p>
                        ) : (aggiornamentiCommesse[nota.commessa_id] || [])
                            .length === 0 ? (
                          <p className="text-[13px] text-gray-400">
                            Nessun aggiornamento precedente.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {aggiornamentiCommesse[nota.commessa_id]?.map(
                              (aggiornamento) => (
                                <div
                                  key={aggiornamento.id}
                                  className="grid grid-cols-[90px_minmax(0,1fr)] gap-3 text-[13px]"
                                >
                                  <span className="text-[#D79D06]">
                                    {formattaDataAggiornamento(
                                      aggiornamento.data_nota ||
                                        aggiornamento.created_at
                                    )}
                                  </span>
                                  <span className="text-[#2B2F5E] leading-snug">
                                    {aggiornamento.testo}
                                  </span>
                                </div>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    <input
                      type="date"
                      value={nota.data}
                      onChange={(e) =>
                        aggiornaNota(index, "data", e.target.value)
                      }
                      className="border-0 bg-transparent text-[14px] text-[#D79D06] focus:outline-none cursor-pointer"
                    />

                    <textarea
                      value={nota.testo}
                      onChange={(e) =>
                        aggiornaNota(index, "testo", e.target.value)
                      }
                      placeholder="Testo della nota..."
                      rows={5}
                      className="w-full bg-transparent border-0 outline-none resize-none text-[16px] leading-[34px] text-[#2B2F5E]"
                    />
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={aggiungiNotaLibera}
              className="border border-gray-300 text-[#2B2F5E] px-5 py-3 rounded-md text-sm font-medium bg-transparent hover:bg-[#e8e8e8] transition cursor-pointer"
            >
              Nota libera
            </button>

            <button
              type="button"
              onClick={salvaRiunione}
              disabled={note.filter((nota) => nota.testo.trim()).length === 0}
              className="bg-[#64B445] text-white px-5 py-3 rounded-md text-sm font-medium hover:bg-[#5AA03E] transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Salva riunione
            </button>
          </div>
        </section>
      </div>

      {salvataggioOk && (
        <Popup title="Riunione salvata" onClose={() => setSalvataggioOk(false)}>
          <p className="text-sm text-gray-600 mb-8">
            Il foglio riunione è stato salvato in archivio e le note collegate
            alle commesse sono state aggiunte alle rispettive schede.
          </p>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setSalvataggioOk(false)}
              className="bg-[#64B445] text-white px-5 py-3 rounded-md text-sm font-medium hover:bg-[#5AA03E] transition cursor-pointer"
            >
              OK
            </button>
          </div>
        </Popup>
      )}
    </LayoutApp>
  );
}

function formattaDataAggiornamento(value: string) {
  const data = value.includes("T") ? new Date(value) : new Date(`${value}T00:00:00`);

  return data.toLocaleDateString("it-IT");
}

function Popup({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-md shadow-2xl w-full max-w-md p-8">
        <div className="flex justify-between items-start mb-6">
          <h3 className="text-xl font-semibold text-[#2B2F5E]">{title}</h3>

          <button
            type="button"
            onClick={onClose}
            className="text-2xl text-gray-400 hover:text-[#2B2F5E] cursor-pointer"
          >
            ×
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}
