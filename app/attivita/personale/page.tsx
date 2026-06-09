"use client";

import { useEffect, useState } from "react";
import LayoutApp from "@/components/LayoutApp";
import { supabase } from "@/lib/supabase";

type Persona = {
  id: string;
  nome: string;
  colore: string;
  attivo: boolean;
};

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

const FORM_INIZIALE = {
  nome: "",
  colore: "#5E9AD3",
};

const SIMBOLO_TIPO: Record<string, string> = {
  Pubblica: "■",
  Privata: "●",
  Gara: "▲",
  Concorso: "⚑",
};

export default function PersonalePage() {
  const [personale, setPersonale] = useState<Persona[]>([]);
  const [attivita, setAttivita] = useState<AttivitaPersona[]>([]);
  const [form, setForm] = useState(FORM_INIZIALE);
  const [modaleAperta, setModaleAperta] = useState(false);
  const [caricamento, setCaricamento] = useState(true);
  const [personaDaEliminare, setPersonaDaEliminare] =
    useState<Persona | null>(null);

  useEffect(() => {
    caricaDati();
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
      attivitaData?.map((item: any) => ({
        id: item.attivita_commesse?.id,
        titolo: item.attivita_commesse?.titolo,
        data_inizio: item.attivita_commesse?.data_inizio,
        giorni: item.attivita_commesse?.giorni,
        persona_id: item.persona_id,
        persona_nome: item.personale?.nome,
        persona_colore: item.personale?.colore,
        tipo_commessa:
        item.attivita_commesse?.commesse?.tipo_commessa || null,
        titolo_commessa:
        item.attivita_commesse?.commesse?.titolo || null,
      })) || [];

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

    function prossimiGiorni() {
        const oggi = new Date();
        oggi.setHours(0, 0, 0, 0);

        const giorni: Date[] = [];
        const giorno = new Date(oggi);

        while (giorni.length < 11) {
            const giornoSettimana = giorno.getDay();

            if (giornoSettimana !== 0 && giornoSettimana !== 6) {
            giorni.push(new Date(giorno));
            }

            giorno.setDate(giorno.getDate() + 1);
        }

        return giorni;
    }

    function formattaGiorno(data: Date) {
        return data.toLocaleDateString("it-IT", {
            day: "2-digit",
            month: "2-digit",
        });
        }

        function differenzaGiorni(dataInizio: string) {
        const oggi = new Date();
        oggi.setHours(0, 0, 0, 0);

        const data = new Date(dataInizio);
        data.setHours(0, 0, 0, 0);

        return Math.round((data.getTime() - oggi.getTime()) / 86400000);
    }

    function differenzaGiorniLavorativi(dataInizio: string) {
        const giorni = prossimiGiorni();
        const target = new Date(dataInizio);
        target.setHours(0, 0, 0, 0);

        return giorni.findIndex(
            (giorno) => giorno.getTime() === target.getTime()
        );
    }

  function giorniDaOggi(dataInizio: string) {
    const oggi = new Date();
    const data = new Date(dataInizio);

    const base = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate());
    const target = new Date(data.getFullYear(), data.getMonth(), data.getDate());

    return Math.round((target.getTime() - base.getTime()) / 86400000);
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

          <button
            type="button"
            onClick={() => setModaleAperta(true)}
            className="bg-[#64B445] text-white w-12 h-12 rounded-md text-2xl font-light hover:bg-[#5AA03E] hover:scale-105 transition flex items-center justify-center shadow-sm cursor-pointer"
          >
            +
          </button>
        </div>

        {caricamento ? (
          <p className="text-center text-gray-500 py-10">
            Caricamento personale...
          </p>
        ) : (
          <div className="space-y-6">
            {personale.map((persona) => {
              const attivitaPersona = attivita.filter(
                (item) => item.persona_id === persona.id
              );

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

                  <div className="p-4 overflow-x-auto">
                    {attivitaPersona.length === 0 ? (
                        <p className="text-sm text-gray-400">
                        Nessuna attività assegnata.
                        </p>
                    ) : (
                        <div
                        className="relative"
                        style={{
                            minWidth: `${11 * 120}px`,
                        }}
                        >
                        <div className="grid grid-cols-11 border-b border-gray-200 mb-3">
                            {prossimiGiorni().map((giorno) => (
                            <div
                                key={giorno.toISOString()}
                                className="text-[11px] uppercase tracking-[0.08em] text-gray-400 font-medium py-2 border-r border-gray-100 text-center"
                            >
                                {formattaGiorno(giorno)}
                            </div>
                            ))}
                        </div>

                        <div className="space-y-2">
                            {attivitaPersona.map((item) => {
                            const offset = differenzaGiorniLavorativi(item.data_inizio);
                            const larghezzaGiorno = 120;

                            if (offset === -1) return null;

                            const left = Math.max(0, offset * larghezzaGiorno);
                            const width = Math.max(
                                larghezzaGiorno,
                                Number(item.giorni || 1) * larghezzaGiorno
                            );

                            const fuoriVista =
                                offset > 10 || offset + Number(item.giorni || 1) < 0;

                            if (fuoriVista) return null;

                            return (
                                <div
                                key={`${persona.id}-${item.id}`}
                                className="relative h-11"
                                >
                                <div
                                    className="absolute top-1 h-9 rounded-sm text-white text-[12px] px-3 flex items-center truncate shadow-sm"
                                    style={{
                                    left,
                                    width,
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
                                </div>
                            );
                            })}
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