"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import LayoutApp from "@/components/LayoutApp";
import { supabase } from "@/lib/supabase";

type Persona = {
  id: string;
  nome: string;
  colore: string;
  attivo: boolean;
};

type RelazioneSupabase<T> = T | T[] | null | undefined;

type AttivitaPersona = {
  id: string;
  titolo: string;
  data_inizio: string;
  giorni: number;
  persona_id: string;
  persona_nome: string;
  persona_colore: string;
  tipo_commessa: string | null;
  titolo_commessa: string | null;
};

type SegmentoAttivitaPersona = {
  start: number;
  end: number;
  left: number;
  width: number;
};

type AttivitaVisibilePersona = {
  item: AttivitaPersona;
  segmento: SegmentoAttivitaPersona;
};

const FORM_INIZIALE = {
  nome: "",
  colore: "#5E9AD3",
};

const NUMERO_GIORNI = 11;
const INDICE_GIORNO_CORRENTE = Math.floor(NUMERO_GIORNI / 2);
const LARGHEZZA_GIORNO = 120;
const ALTEZZA_RIGA_ATTIVITA = 38;
const ALTEZZA_BARRA_ATTIVITA = 34;
const INTERVALLO_CAMBIO_GIORNI_WHEEL = 450;
const SOGLIA_CAMBIO_GIORNI_WHEEL = 35;

const SIMBOLO_TIPO: Record<string, string> = {
  Pubblica: "■",
  Privata: "●",
  Gara: "▲",
  Concorso: "⚑",
};

function getRelazioneSingola<T>(valore: RelazioneSupabase<T>) {
  if (Array.isArray(valore)) {
    return valore[0] || null;
  }

  return valore || null;
}

function giorniLavorativiCentrati(numeroGiorni: number, offsetGiorni: number) {
  const centro = spostaGiorniLavorativi(new Date(), offsetGiorni);
  const precedenti: Date[] = [];
  let cursore = centro;

  while (precedenti.length < INDICE_GIORNO_CORRENTE) {
    cursore = spostaGiorniLavorativi(cursore, -1);
    precedenti.unshift(cursore);
  }

  const giorni = [...precedenti, centro];
  cursore = centro;

  while (giorni.length < numeroGiorni) {
    cursore = spostaGiorniLavorativi(cursore, 1);
    giorni.push(cursore);
  }

  return giorni;
}

function spostaGiorniLavorativi(dataInizio: Date, delta: number) {
  const data = normalizzaData(dataInizio);
  const passo = delta >= 0 ? 1 : -1;
  let rimanenti = Math.abs(delta);

  while (rimanenti > 0) {
    data.setDate(data.getDate() + passo);

    if (!isWeekend(data)) {
      rimanenti--;
    }
  }

  return new Date(data);
}

function getGiorniLavorativiAttivita(item: AttivitaPersona) {
  const giorniTotali = Math.max(1, Number(item.giorni || 1));
  const giorni: Date[] = [];
  const corrente = parseDataLocale(item.data_inizio);

  while (giorni.length < giorniTotali) {
    if (!isWeekend(corrente)) {
      giorni.push(new Date(corrente));
    }

    corrente.setDate(corrente.getDate() + 1);
  }

  return giorni;
}

function indiceGiorno(data: Date, giorni: Date[]) {
  const chiave = normalizzaData(data).getTime();
  return giorni.findIndex((giorno) => giorno.getTime() === chiave);
}

function parseDataLocale(data: string) {
  const [anno, mese, giorno] = data.split("-").map(Number);
  return new Date(anno, mese - 1, giorno);
}

function normalizzaData(data: Date) {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate());
}

function isWeekend(data: Date) {
  const giorno = data.getDay();
  return giorno === 0 || giorno === 6;
}

function isOggi(data: Date) {
  const oggi = normalizzaData(new Date());
  return normalizzaData(data).getTime() === oggi.getTime();
}

function assegnaRigheAttivitaPersonale(voci: AttivitaVisibilePersona[]) {
  const righe: { start: number; end: number }[][] = [];

  return [...voci]
    .sort(
      (a, b) =>
        a.segmento.start - b.segmento.start ||
        b.segmento.end - a.segmento.end
    )
    .map((voce) => {
      let riga = 0;

      while (
        righe[riga]?.some(
          (esistente) =>
            voce.segmento.start <= esistente.end &&
            voce.segmento.end >= esistente.start
        )
      ) {
        riga++;
      }

      if (!righe[riga]) righe[riga] = [];

      righe[riga].push({
        start: voce.segmento.start,
        end: voce.segmento.end,
      });

      return {
        ...voce,
        riga,
      };
    });
}

export default function PersonalePage() {
  const [personale, setPersonale] = useState<Persona[]>([]);
  const [attivita, setAttivita] = useState<AttivitaPersona[]>([]);
  const [form, setForm] = useState(FORM_INIZIALE);
  const [modaleAperta, setModaleAperta] = useState(false);
  const [caricamento, setCaricamento] = useState(true);
  const [personaDaEliminare, setPersonaDaEliminare] =
    useState<Persona | null>(null);
  const [offsetGiorni, setOffsetGiorni] = useState(0);
  const contenitoreTabelleRef = useRef<HTMLDivElement | null>(null);
  const ultimoCambioGiorniWheel = useRef(0);

  const giorniVisualizzati = useMemo(
    () => giorniLavorativiCentrati(NUMERO_GIORNI, offsetGiorni),
    [offsetGiorni]
  );

  const indiceOggi = giorniVisualizzati.findIndex((giorno) => isOggi(giorno));

  useEffect(() => {
    caricaDati();
  }, []);

  useEffect(() => {
    const contenitore = contenitoreTabelleRef.current;
    if (!contenitore) return;

    function gestisciCambioGiorniWheel(event: WheelEvent) {
      event.preventDefault();
      event.stopPropagation();

      if (Math.abs(event.deltaY) < SOGLIA_CAMBIO_GIORNI_WHEEL) {
        return;
      }

      const adesso = Date.now();
      if (
        adesso - ultimoCambioGiorniWheel.current <
        INTERVALLO_CAMBIO_GIORNI_WHEEL
      ) {
        return;
      }

      ultimoCambioGiorniWheel.current = adesso;
      setOffsetGiorni((corrente) => corrente + (event.deltaY > 0 ? 1 : -1));
    }

    contenitore.addEventListener("wheel", gestisciCambioGiorniWheel, {
      passive: false,
    });

    return () => {
      contenitore.removeEventListener("wheel", gestisciCambioGiorniWheel);
    };
  }, []);

  async function caricaDati() {
    setCaricamento(true);

    const { data: personaleData } = await supabase
      .from("personale")
      .select("*")
      .order("nome");

    setPersonale(personaleData || []);

    const { data: attivitaData } = await supabase
      .from("attivita_personale")
      .select(
        `
        persona_id,
        personale (
          nome,
          colore
        ),
        attivita_commesse (
            id,
            titolo,
            data_inizio,
            giorni,
            commesse (
                titolo,
                tipo_commessa
            )
        )
      `
    );

    const normalizzate =
      attivitaData
        ?.map((item: any) => {
          const persona = getRelazioneSingola(item.personale);
          const attivitaCommessa = getRelazioneSingola(item.attivita_commesse);
          const commessa = getRelazioneSingola(attivitaCommessa?.commesse);

          if (!attivitaCommessa?.id || !attivitaCommessa?.data_inizio) {
            return null;
          }

          return {
            id: attivitaCommessa.id,
            titolo: attivitaCommessa.titolo,
            data_inizio: attivitaCommessa.data_inizio,
            giorni: attivitaCommessa.giorni,
            persona_id: item.persona_id,
            persona_nome: persona?.nome,
            persona_colore: persona?.colore,
            tipo_commessa: commessa?.tipo_commessa || null,
            titolo_commessa: commessa?.titolo || null,
          };
        })
        .filter((item): item is AttivitaPersona => Boolean(item)) || [];

    setAttivita(normalizzate);
    setCaricamento(false);
  }

  async function creaPersona() {
    if (!form.nome.trim()) {
      alert("Inserisci il nome della persona.");
      return;
    }

    const { error } = await supabase.from("personale").insert({
      nome: form.nome.trim(),
      colore: form.colore,
      attivo: true,
    });

    if (error) {
      alert("Errore durante la creazione della persona.");
      return;
    }

    setForm(FORM_INIZIALE);
    setModaleAperta(false);
    await caricaDati();
  }

    async function aggiornaPersona(
        persona: Persona,
        campo: keyof Persona,
        valore: string | boolean
        ) {
        const personaAggiornata = {
            ...persona,
            [campo]: valore,
        };

        const { error } = await supabase
            .from("personale")
            .update({
            nome: personaAggiornata.nome,
            colore: personaAggiornata.colore,
            attivo: personaAggiornata.attivo,
            })
            .eq("id", persona.id);

        if (error) {
            console.error("Errore aggiornamento persona:", error);
            alert(error.message);
            return;
        }

        setPersonale((correnti) =>
            correnti.map((item) =>
            item.id === persona.id ? personaAggiornata : item
            )
        );
    }

    async function eliminaPersona() {
        if (!personaDaEliminare) return;

        const { error } = await supabase
            .from("personale")
            .delete()
            .eq("id", personaDaEliminare.id);

        if (error) {
            console.error("Errore eliminazione persona:", error);
            alert("Errore durante l'eliminazione della persona.");
            return;
        }

        setPersonale((correnti) =>
            correnti.filter((item) => item.id !== personaDaEliminare.id)
        );

        setPersonaDaEliminare(null);
    }

    function spostaVistaGiorni(delta: number) {
        setOffsetGiorni((corrente) => corrente + delta);
    }

    function getSegmentoAttivita(item: AttivitaPersona) {
        const indici = getGiorniLavorativiAttivita(item)
            .map((giorno) => indiceGiorno(giorno, giorniVisualizzati))
            .filter((indice) => indice >= 0);

        if (indici.length === 0) {
            return null;
        }

        const start = Math.min(...indici);
        const end = Math.max(...indici);

        return {
            start,
            end,
            left: start * LARGHEZZA_GIORNO,
            width: (end - start + 1) * LARGHEZZA_GIORNO,
        };
    }

    function formattaGiorno(data: Date) {
        return data.toLocaleDateString("it-IT", {
            day: "2-digit",
            month: "2-digit",
        });
        }

  return (
    <LayoutApp>
      <div>
        <div className="flex justify-between items-center gap-4 mb-6">
          <div>
            <h2 className="page-title">Personale</h2>

            <p className="text-[15px] text-[#D79D06] mt-1">
              Gestione persone e visualizzazione attività assegnate
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => spostaVistaGiorni(-1)}
              className="border border-gray-300 text-[#2B2F5E] w-10 h-10 rounded-md bg-white hover:bg-[#e8e8e8] hover:text-[#D79D06] transition cursor-pointer text-2xl leading-none"
              aria-label="Giorni precedenti"
            >
              &lsaquo;
            </button>

            <button
              type="button"
              onClick={() => spostaVistaGiorni(1)}
              className="border border-gray-300 text-[#2B2F5E] w-10 h-10 rounded-md bg-white hover:bg-[#e8e8e8] hover:text-[#D79D06] transition cursor-pointer text-2xl leading-none"
              aria-label="Giorni successivi"
            >
              &rsaquo;
            </button>

            <button
              type="button"
              onClick={() => setModaleAperta(true)}
              className="bg-[#64B445] text-white w-12 h-12 rounded-md text-2xl font-light hover:bg-[#5AA03E] hover:scale-105 transition flex items-center justify-center shadow-sm cursor-pointer"
            >
              +
            </button>
          </div>
        </div>

        {caricamento ? (
          <p className="text-center text-gray-500 py-10">
            Caricamento personale...
          </p>
        ) : (
          <div ref={contenitoreTabelleRef} className="space-y-4">
            {personale.map((persona) => {
              const attivitaPersona = attivita.filter(
                (item) => item.persona_id === persona.id
              );
              const attivitaVisibiliPersona = attivitaPersona
                .map((item) => ({
                  item,
                  segmento: getSegmentoAttivita(item),
                }))
                .filter(
                  (
                    voce
                  ): voce is {
                    item: AttivitaPersona;
                    segmento: NonNullable<
                      ReturnType<typeof getSegmentoAttivita>
                    >;
                  } => Boolean(voce.segmento)
                );
              const barrePersona = assegnaRigheAttivitaPersonale(
                attivitaVisibiliPersona
              );
              const numeroRighePersona =
                barrePersona.length > 0
                  ? Math.max(...barrePersona.map((voce) => voce.riga)) + 1
                  : 1;
              const altezzaCorpoPersona =
                numeroRighePersona * ALTEZZA_RIGA_ATTIVITA;

              return (
                <div
                  key={persona.id}
                  className={`bg-white border border-gray-200 shadow-sm rounded-sm overflow-hidden ${
                    persona.attivo ? "" : "opacity-50"
                  }`}
                >
                  <div className="px-4 py-3 border-b border-gray-200 bg-[#FAFAFA] flex justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={persona.colore}
                        onChange={(e) =>
                          aggiornaPersona(persona, "colore", e.target.value)
                        }
                        className="w-9 h-9 cursor-pointer bg-transparent border-0"
                      />

                      <input
                        value={persona.nome}
                        onChange={(e) =>
                          aggiornaPersona(persona, "nome", e.target.value)
                        }
                        className="border-0 bg-transparent outline-none text-[18px] font-semibold text-[#2B2F5E]"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() =>
                            aggiornaPersona(persona, "attivo", !persona.attivo)
                            }
                            className="border border-gray-300 text-[#2B2F5E] px-4 py-2 rounded-md text-sm font-medium bg-transparent hover:bg-[#e8e8e8] transition cursor-pointer"
                        >
                            {persona.attivo ? "Attivo" : "Disattivato"}
                        </button>

                        <button
                            type="button"
                            onClick={() => setPersonaDaEliminare(persona)}
                            className="text-red-500 hover:text-red-700 text-xl font-semibold transition cursor-pointer px-2"
                            title="Elimina persona"
                        >
                            ×
                        </button>
                    </div>
                  </div>

                  <div className="px-4 py-3 overflow-x-auto">
                    {attivitaPersona.length === 0 ? (
                        <p className="text-sm text-gray-400">
                        Nessuna attività assegnata.
                        </p>
                    ) : attivitaVisibiliPersona.length === 0 ? (
                        <p className="text-sm text-gray-400">
                        Nessuna attivit&agrave; nei giorni visualizzati.
                        </p>
                    ) : (
                        <div
                        className="relative"
                        style={{
                            minWidth: `${NUMERO_GIORNI * LARGHEZZA_GIORNO}px`,
                        }}
                        >
                        <div
                            className="grid border-b border-gray-200 mb-2"
                            style={{
                                gridTemplateColumns: `repeat(${NUMERO_GIORNI}, minmax(0, 1fr))`,
                            }}
                        >
                            {giorniVisualizzati.map((giorno) => (
                            <div
                                key={giorno.toISOString()}
                                className={`text-[11px] uppercase tracking-[0.08em] font-medium py-2 border-r border-gray-100 text-center ${
                                  isOggi(giorno)
                                    ? "border-2 border-[#D79D06] text-[#D79D06]"
                                    : "text-gray-400"
                                }`}
                            >
                                {formattaGiorno(giorno)}
                            </div>
                            ))}
                        </div>

                        <div
                            className="relative"
                            style={{ height: altezzaCorpoPersona }}
                        >
                            {indiceOggi >= 0 && (
                                <div
                                    className="pointer-events-none absolute top-0 bottom-0 z-0 border-2 border-[#D79D06]"
                                    style={{
                                        left: indiceOggi * LARGHEZZA_GIORNO,
                                        width: LARGHEZZA_GIORNO,
                                    }}
                                />
                            )}

                            <div
                                className="relative z-10"
                                style={{ height: altezzaCorpoPersona }}
                            >
                            {barrePersona.map(({ item, segmento, riga }) => {
                            return (
                                <div
                                key={`${persona.id}-${item.id}`}
                                    className="absolute rounded-sm text-white text-[12px] px-3 flex items-center truncate shadow-sm"
                                    style={{
                                    left: segmento.left,
                                    width: Math.max(
                                        LARGHEZZA_GIORNO,
                                        segmento.width
                                    ),
                                    top: riga * ALTEZZA_RIGA_ATTIVITA,
                                    height: ALTEZZA_BARRA_ATTIVITA,
                                    backgroundColor: persona.colore,
                                    }}
                                    title={`${item.titolo} - ${item.giorni} giorni`}
                                >
                                    <div className="leading-tight">
                                        <p>
                                            {item.tipo_commessa
                                            ? `${SIMBOLO_TIPO[item.tipo_commessa] || ""} ${
                                                item.titolo_commessa || ""
                                                }`
                                            : "Attività libera"}
                                        </p>

                                        <p className="opacity-90">
                                            {item.titolo}
                                        </p>
                                    </div>
                                </div>
                            );
                            })}
                        </div>
                    </div>
                    </div>
                    )}
                    </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modaleAperta && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-md shadow-2xl w-full max-w-md p-8">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-2xl font-semibold text-[#2B2F5E]">
                Nuova persona
              </h3>

              <button
                type="button"
                onClick={() => setModaleAperta(false)}
                className="text-2xl text-gray-400 hover:text-[#2B2F5E] cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <Campo
                label="Nome"
                value={form.nome}
                onChange={(value) =>
                  setForm((corrente) => ({ ...corrente, nome: value }))
                }
              />

              <div>
                <label className="block text-sm font-medium mb-2 text-[#2B2F5E]">
                  Colore
                </label>

                <input
                  type="color"
                  value={form.colore}
                  onChange={(e) =>
                    setForm((corrente) => ({
                      ...corrente,
                      colore: e.target.value,
                    }))
                  }
                  className="w-16 h-12 cursor-pointer bg-transparent border-0"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button
                type="button"
                onClick={() => setModaleAperta(false)}
                className="border border-gray-300 text-[#2B2F5E] px-5 py-3 rounded-md text-sm font-medium bg-transparent hover:bg-[#e8e8e8] transition cursor-pointer"
              >
                Annulla
              </button>

              <button
                type="button"
                onClick={creaPersona}
                className="bg-[#64B445] text-white px-5 py-3 rounded-md text-sm font-medium hover:bg-[#5AA03E] transition cursor-pointer"
              >
                Crea
              </button>
            </div>
          </div>
        </div>
      )}

      {personaDaEliminare && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6">
            <div className="bg-white rounded-md shadow-2xl w-full max-w-md p-8">
            <div className="flex justify-between items-start mb-6">
                <h3 className="text-xl font-semibold text-[#2B2F5E]">
                Elimina persona
                </h3>

                <button
                type="button"
                onClick={() => setPersonaDaEliminare(null)}
                className="text-2xl text-gray-400 hover:text-[#2B2F5E] cursor-pointer"
                >
                ×
                </button>
            </div>

            <p className="text-sm text-gray-600 mb-8">
                Vuoi eliminare{" "}
                <span className="font-semibold text-[#2B2F5E]">
                {personaDaEliminare.nome}
                </span>
                ?
            </p>

            <div className="flex justify-end gap-3">
                <button
                type="button"
                onClick={() => setPersonaDaEliminare(null)}
                className="border border-gray-300 text-[#2B2F5E] px-5 py-3 rounded-md text-sm font-medium bg-transparent hover:bg-[#e8e8e8] transition cursor-pointer"
                >
                Annulla
                </button>

                <button
                type="button"
                onClick={eliminaPersona}
                className="bg-red-600 hover:bg-red-700 text-white px-5 py-3 rounded-md text-sm font-medium transition cursor-pointer"
                >
                Elimina
                </button>
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2 text-[#2B2F5E]">
        {label}
      </label>

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-md px-4 py-3 bg-transparent outline-none transition focus:bg-white focus:border-[#64B445] focus:shadow-sm"
      />
    </div>
  );
}
