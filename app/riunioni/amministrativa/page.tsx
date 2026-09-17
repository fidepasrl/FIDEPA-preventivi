"use client";

import { useEffect, useMemo, useState } from "react";
import AdminDeveloperAccessGuard from "@/components/AdminDeveloperAccessGuard";
import AppIcon from "@/components/AppIcon";
import LayoutApp from "@/components/LayoutApp";
import {
  formattaIntervalloSettimana,
  normalizzaArgomenti,
  riferimentiSettimanaIso,
  type ArgomentoAmministrativo,
  type RiferimentoSettimana,
} from "@/lib/riunioniAmministrative";
import { supabase } from "@/lib/supabase";

type VerbaleAmministrativo = {
  id: string;
  anno: number;
  settimana: number;
  data_inizio_settimana: string;
  argomenti: ArgomentoAmministrativo[];
  created_at: string;
  updated_at: string;
};

type VerbaleSelezionato = Omit<VerbaleAmministrativo, "id"> & {
  id: string | null;
};

function creaIdArgomento() {
  return globalThis.crypto?.randomUUID?.() ??
    `argomento-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function creaArgomento(): ArgomentoAmministrativo {
  return {
    id: creaIdArgomento(),
    titolo: "",
    discusso: "",
  };
}

function creaBozzaSettimana(
  riferimento: RiferimentoSettimana
): VerbaleSelezionato {
  return {
    id: null,
    anno: riferimento.anno,
    settimana: riferimento.settimana,
    data_inizio_settimana: riferimento.dataInizio,
    argomenti: [],
    created_at: "",
    updated_at: "",
  };
}

function ordinaVerbali(verbali: VerbaleAmministrativo[]) {
  return [...verbali].sort((a, b) =>
    b.data_inizio_settimana.localeCompare(a.data_inizio_settimana)
  );
}

export default function RiunioneAmministrativaPage() {
  return (
    <LayoutApp>
      <AdminDeveloperAccessGuard nomeSezione="La riunione amministrativa">
        <RiunioneAmministrativa />
      </AdminDeveloperAccessGuard>
    </LayoutApp>
  );
}

function RiunioneAmministrativa() {
  const settimanaCorrente = useMemo(() => riferimentiSettimanaIso(), []);
  const [verbali, setVerbali] = useState<VerbaleAmministrativo[]>([]);
  const [selezionato, setSelezionato] = useState<VerbaleSelezionato>(() =>
    creaBozzaSettimana(settimanaCorrente)
  );
  const [argomenti, setArgomenti] = useState<ArgomentoAmministrativo[]>([
    creaArgomento(),
  ]);
  const [caricamento, setCaricamento] = useState(true);
  const [salvataggio, setSalvataggio] = useState(false);
  const [modificato, setModificato] = useState(false);
  const [errore, setErrore] = useState("");
  const [conferma, setConferma] = useState("");

  useEffect(() => {
    let componenteAttivo = true;

    async function caricaVerbali() {
      const { data, error } = await supabase
        .from("riunioni_amministrative")
        .select(
          "id, anno, settimana, data_inizio_settimana, argomenti, created_at, updated_at"
        )
        .order("data_inizio_settimana", { ascending: false });

      if (!componenteAttivo) return;

      if (error) {
        console.error(error);
        setErrore(
          "Impossibile caricare le riunioni amministrative. Verifica che la configurazione dati sia stata applicata."
        );
        setCaricamento(false);
        return;
      }

      const elenco: VerbaleAmministrativo[] = (data || []).map((item) => ({
        ...item,
        argomenti: normalizzaArgomenti(item.argomenti),
      }));
      const verbaleCorrente = elenco.find(
        (item) =>
          item.data_inizio_settimana === settimanaCorrente.dataInizio
      );
      const apertura =
        verbaleCorrente ?? creaBozzaSettimana(settimanaCorrente);
      const righeApertura = apertura.argomenti.length
        ? apertura.argomenti
        : [creaArgomento()];

      setVerbali(elenco);
      setSelezionato(apertura);
      setArgomenti(righeApertura);
      setCaricamento(false);
    }

    caricaVerbali();

    return () => {
      componenteAttivo = false;
    };
  }, [settimanaCorrente]);

  const settimaneDisponibili = useMemo(() => {
    const correnteSalvata = verbali.some(
      (item) => item.data_inizio_settimana === settimanaCorrente.dataInizio
    );

    if (correnteSalvata) return verbali;

    return [creaBozzaSettimana(settimanaCorrente), ...verbali];
  }, [settimanaCorrente, verbali]);

  function apriVerbale(verbale: VerbaleSelezionato) {
    if (
      modificato &&
      !window.confirm(
        "Ci sono modifiche non salvate. Vuoi cambiare settimana e perderle?"
      )
    ) {
      return;
    }

    setSelezionato(verbale);
    setArgomenti(
      verbale.argomenti.length
        ? verbale.argomenti.map((item) => ({ ...item }))
        : [creaArgomento()]
    );
    setModificato(false);
    setErrore("");
    setConferma("");
  }

  function aggiornaArgomento(
    id: string,
    campo: "titolo" | "discusso",
    valore: string
  ) {
    setArgomenti((correnti) =>
      correnti.map((item) =>
        item.id === id ? { ...item, [campo]: valore } : item
      )
    );
    setModificato(true);
    setConferma("");
  }

  function aggiungiArgomento() {
    setArgomenti((correnti) => [...correnti, creaArgomento()]);
    setModificato(true);
    setConferma("");
  }

  function rimuoviArgomento(id: string) {
    setArgomenti((correnti) => {
      const rimanenti = correnti.filter((item) => item.id !== id);
      return rimanenti.length ? rimanenti : [creaArgomento()];
    });
    setModificato(true);
    setConferma("");
  }

  async function salvaVerbale() {
    setErrore("");
    setConferma("");

    const righeUsate = argomenti.filter(
      (item) => item.titolo.trim() || item.discusso.trim()
    );
    const rigaIncompleta = righeUsate.some(
      (item) => !item.titolo.trim() || !item.discusso.trim()
    );

    if (righeUsate.length === 0) {
      setErrore("Inserisci almeno un argomento e quanto discusso.");
      return;
    }

    if (rigaIncompleta) {
      setErrore(
        "Completa sia il titolo sia il testo discusso per ogni argomento."
      );
      return;
    }

    const argomentiPuliti = righeUsate.map((item) => ({
      ...item,
      titolo: item.titolo.trim(),
      discusso: item.discusso.trim(),
    }));

    setSalvataggio(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setErrore("Sessione non disponibile. Accedi nuovamente e riprova.");
      setSalvataggio(false);
      return;
    }

    const dati = {
      anno: selezionato.anno,
      settimana: selezionato.settimana,
      data_inizio_settimana: selezionato.data_inizio_settimana,
      argomenti: argomentiPuliti,
      updated_by: user.id,
    };

    const richiesta = selezionato.id
      ? supabase
          .from("riunioni_amministrative")
          .update(dati)
          .eq("id", selezionato.id)
      : supabase.from("riunioni_amministrative").insert({
          ...dati,
          created_by: user.id,
        });

    const { data, error } = await richiesta
      .select(
        "id, anno, settimana, data_inizio_settimana, argomenti, created_at, updated_at"
      )
      .single();

    if (error || !data) {
      console.error(error);
      setErrore("Errore durante il salvataggio del verbale amministrativo.");
      setSalvataggio(false);
      return;
    }

    const salvato: VerbaleAmministrativo = {
      ...data,
      argomenti: normalizzaArgomenti(data.argomenti),
    };

    setVerbali((correnti) =>
      ordinaVerbali([
        salvato,
        ...correnti.filter((item) => item.id !== salvato.id),
      ])
    );
    setSelezionato(salvato);
    setArgomenti(salvato.argomenti.map((item) => ({ ...item })));
    setModificato(false);
    setSalvataggio(false);
    setConferma("Riunione amministrativa salvata.");
  }

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#5E9AD3]/12 text-[#2D80B3]">
              <AppIcon name="fileText" size={21} />
            </span>
            <div>
              <h1 className="page-title">Riunione amministrativa</h1>
              <p className="mt-1 text-[15px] text-[#D79D06]">
                Verbale settimanale riservato ad ADMIN e DEVELOPER
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={salvaVerbale}
          disabled={caricamento || salvataggio}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#64B445] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#58A13D] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <AppIcon
            name={salvataggio ? "refresh" : "checkSquare"}
            size={17}
            className={salvataggio ? "animate-spin" : ""}
          />
          {salvataggio ? "Salvataggio..." : "Salva settimana"}
        </button>
      </div>

      {errore ? (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {errore}
        </div>
      ) : null}

      {conferma ? (
        <div
          role="status"
          className="mb-5 flex items-center gap-2 rounded-xl border border-[#64B445]/25 bg-[#64B445]/10 px-4 py-3 text-sm font-medium text-[#3F7C2C]"
        >
          <AppIcon name="checkSquare" size={17} />
          {conferma}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="self-start rounded-2xl border border-white bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)] xl:sticky xl:top-[92px]">
          <div className="mb-4 flex items-start justify-between gap-3 px-1">
            <div>
              <h2 className="font-semibold text-[#2B2F5E]">Settimane</h2>
              <p className="mt-0.5 text-xs text-[#2B2F5E]/50">
                Corrente e archivio
              </p>
            </div>
            <span className="rounded-full bg-[#D79D06]/10 px-2.5 py-1 text-[11px] font-bold text-[#A67600]">
              {verbali.length}
            </span>
          </div>

          {caricamento ? (
            <div className="flex items-center gap-2 px-3 py-6 text-sm text-gray-400">
              <AppIcon name="refresh" size={16} className="animate-spin" />
              Caricamento...
            </div>
          ) : (
            <div className="max-h-[620px] space-y-2 overflow-y-auto pr-1">
              {settimaneDisponibili.map((verbale) => {
                const attivo =
                  selezionato.data_inizio_settimana ===
                  verbale.data_inizio_settimana;
                const corrente =
                  verbale.data_inizio_settimana ===
                  settimanaCorrente.dataInizio;

                return (
                  <button
                    key={verbale.data_inizio_settimana}
                    type="button"
                    onClick={() => apriVerbale(verbale)}
                    className={`w-full rounded-xl border px-3.5 py-3 text-left transition ${
                      attivo
                        ? "border-[#5E9AD3]/35 bg-[#EAF3FA] shadow-sm"
                        : "border-transparent hover:border-[#2B2F5E]/8 hover:bg-[#F7F8FA]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-[#2B2F5E]">
                        Week {String(verbale.settimana).padStart(2, "0")} ·{" "}
                        {verbale.anno}
                      </span>
                      {corrente ? (
                        <span className="rounded-full bg-[#64B445]/12 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#4A8D34]">
                          Corrente
                        </span>
                      ) : null}
                    </div>
                    <span className="mt-1 block text-[11px] leading-relaxed text-[#2B2F5E]/50">
                      {formattaIntervalloSettimana(
                        verbale.data_inizio_settimana
                      )}
                    </span>
                    {!verbale.id ? (
                      <span className="mt-1.5 block text-[10px] font-semibold text-[#D79D06]">
                        Da compilare
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        <section className="min-w-0">
          <div className="mb-4 flex flex-col justify-between gap-3 rounded-2xl border border-white bg-white px-5 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)] sm:flex-row sm:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold text-[#2B2F5E]">
                  Week {String(selezionato.settimana).padStart(2, "0")} ·{" "}
                  {selezionato.anno}
                </h2>
                {modificato ? (
                  <span className="rounded-full bg-[#D79D06]/12 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#A67600]">
                    Modifiche non salvate
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-[#D79D06]">
                {formattaIntervalloSettimana(
                  selezionato.data_inizio_settimana
                )}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#2B2F5E]/45">
              <AppIcon name="calendar" size={15} />
              {selezionato.id
                ? "Verbale salvato e sempre modificabile"
                : "Nuovo verbale settimanale"}
            </div>
          </div>

          <div className="relative min-h-[680px] overflow-hidden rounded-2xl border border-[#E5DDC9] bg-[#FFFDF5] p-5 shadow-[0_12px_34px_rgba(43,47,94,0.08)] sm:p-8">
            <div
              className="pointer-events-none absolute inset-0 opacity-55"
              style={{
                backgroundImage:
                  "linear-gradient(#E8DFC8 1px, transparent 1px)",
                backgroundSize: "100% 34px",
              }}
            />

            <div className="relative z-10 space-y-6">
              {argomenti.map((argomento, index) => (
                <article
                  key={argomento.id}
                  className="rounded-2xl border border-[#2B2F5E]/8 bg-white/90 p-4 shadow-sm backdrop-blur-[2px] sm:p-5"
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#2B2F5E] text-xs font-bold text-white">
                      {index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => rimuoviArgomento(argomento.id)}
                      className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                      title="Rimuovi argomento"
                      aria-label={`Rimuovi argomento ${index + 1}`}
                    >
                      <AppIcon name="trash" size={17} />
                    </button>
                  </div>

                  <label className="block">
                    <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#D79D06]">
                      Argomento
                    </span>
                    <input
                      type="text"
                      value={argomento.titolo}
                      onChange={(event) =>
                        aggiornaArgomento(
                          argomento.id,
                          "titolo",
                          event.target.value
                        )
                      }
                      placeholder="Inserisci il titolo dell’argomento"
                      className="mt-2 w-full border-0 border-b border-[#2B2F5E]/15 bg-transparent px-0 pb-3 text-lg font-semibold text-[#2B2F5E] outline-none placeholder:font-normal placeholder:text-[#2B2F5E]/30 focus:border-[#5E9AD3]"
                    />
                  </label>

                  <label className="mt-5 block">
                    <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#5E9AD3]">
                      Quanto discusso
                    </span>
                    <textarea
                      value={argomento.discusso}
                      onChange={(event) =>
                        aggiornaArgomento(
                          argomento.id,
                          "discusso",
                          event.target.value
                        )
                      }
                      placeholder="Scrivi decisioni, osservazioni e prossimi passi..."
                      rows={6}
                      className="mt-2 w-full resize-y border-0 bg-transparent p-0 text-[15px] leading-8 text-[#2B2F5E] outline-none placeholder:text-[#2B2F5E]/30"
                    />
                  </label>
                </article>
              ))}

              <button
                type="button"
                onClick={aggiungiArgomento}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#5E9AD3]/35 bg-white/55 px-4 py-4 text-sm font-semibold text-[#2D80B3] transition hover:border-[#5E9AD3] hover:bg-white"
              >
                <AppIcon name="plus" size={18} />
                Aggiungi argomento
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
