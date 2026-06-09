"use client";

import { useEffect, useMemo, useState } from "react";
import LayoutApp from "@/components/LayoutApp";
import { supabase } from "@/lib/supabase";

type Commessa = {
  id: string;
  titolo: string;
  codice: string | null;
};

type Persona = {
  id: string;
  nome: string;
  colore: string;
  attivo: boolean;
};

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

const FORM_INIZIALE = {
  titolo: "",
  commessa_id: "",
  data_inizio: new Date().toISOString().slice(0, 10),
  giorni: "1",
  persone_ids: [] as string[],
};

export default function CalendarioAttivitaPage() {
  const [meseCorrente, setMeseCorrente] = useState(new Date());
  const [commesse, setCommesse] = useState<Commessa[]>([]);
  const [personale, setPersonale] = useState<Persona[]>([]);
  const [attivita, setAttivita] = useState<Attivita[]>([]);
  const [form, setForm] = useState(FORM_INIZIALE);

  const [modaleAperta, setModaleAperta] = useState(false);
  const [attivitaInModifica, setAttivitaInModifica] =
    useState<Attivita | null>(null);

  const [caricamento, setCaricamento] = useState(true);

  const SIMBOLO_TIPO: Record<string, string> = {
    Pubblica: "■",
    Privata: "●",
    Gara: "▲",
    Concorso: "⚑",
    };

  const anno = meseCorrente.getFullYear();
  const mese = meseCorrente.getMonth();

  const giorniMese = useMemo(() => {
    const primoGiorno = new Date(anno, mese, 1);
    const ultimoGiorno = new Date(anno, mese + 1, 0);
    const giorni = [];

    const offset = primoGiorno.getDay() === 0 ? 6 : primoGiorno.getDay() - 1;

    for (let i = 0; i < offset; i++) {
      giorni.push(null);
    }

    for (let giorno = 1; giorno <= ultimoGiorno.getDate(); giorno++) {
      giorni.push(new Date(anno, mese, giorno));
    }

    return giorni;
  }, [anno, mese]);

  useEffect(() => {
    caricaDati();
  }, []);

  async function caricaDati() {
    setCaricamento(true);

    const [{ data: commesseData }, { data: personaleData }] =
      await Promise.all([
        supabase.from("commesse").select("id, titolo, codice").order("titolo"),
        supabase
          .from("personale")
          .select("*")
          .eq("attivo", true)
          .order("nome"),
      ]);

    setCommesse(commesseData || []);
    setPersonale(personaleData || []);

    await caricaAttivita();
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

    console.log("ATTIVITA DATA", data);
    console.log("ATTIVITA ERROR", error);

    const normalizzate =
        data?.map((item: any) => ({
            id: item.id,
            titolo: item.titolo,
            commessa_id: item.commessa_id,
            tipo_commessa: item.commesse?.tipo_commessa || null,
            titolo_commessa: item.commesse?.titolo || null,
            data_inizio: item.data_inizio,
            giorni: item.giorni,
            persone:
            item.attivita_personale
                ?.map((rel: any) => rel.personale)
                .filter(Boolean) || [],
        })) || [];

    setAttivita(normalizzate);
  }

  function cambiaMese(delta: number) {
    setMeseCorrente(new Date(anno, mese + delta, 1));
  }

  function aggiornaCampo(campo: keyof typeof FORM_INIZIALE, valore: any) {
    setForm((corrente) => ({
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

  async function salvaAttivita() {
    if (!form.titolo.trim() && !form.commessa_id) {
      alert("Inserisci una commessa o un titolo attività.");
      return;
    }

    if (form.persone_ids.length === 0) {
      alert("Seleziona almeno una persona.");
      return;
    }

    const commessaSelezionata = commesse.find(
      (commessa) => commessa.id === form.commessa_id
    );

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

    function attivitaDelGiorno(giorno: Date) {
        return attivita.filter((item) =>
            isGiornoLavorativoAttivita(
            giorno,
            new Date(item.data_inizio),
            Number(item.giorni || 1)
            )
        );
    }

    function isWeekend(data: Date) {
        const giorno = data.getDay();
        return giorno === 0 || giorno === 6;
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

    function isGiornoLavorativoAttivita(
        giorno: Date,
        dataInizio: Date,
        giorni: number
        ) {
        if (isWeekend(giorno)) return false;

        const fine = aggiungiGiorniLavorativi(dataInizio, giorni);

        return (
            normalizzaData(giorno) >= normalizzaData(dataInizio) &&
            normalizzaData(giorno) <= normalizzaData(fine)
        );
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

          <button
            type="button"
            onClick={apriNuovaAttivita}
            className="bg-[#64B445] text-white w-12 h-12 rounded-md text-2xl font-light hover:bg-[#5AA03E] hover:scale-105 transition flex items-center justify-center shadow-sm cursor-pointer"
            title="Nuova attività"
          >
            +
          </button>
        </div>

        <div className="bg-white border border-gray-200 shadow-sm rounded-sm overflow-hidden">
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
              <div className="grid grid-cols-7 border-t border-l border-gray-200">
                {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map(
                  (giorno) => (
                    <div
                      key={giorno}
                      className="border-r border-b border-gray-200 bg-[#FAFAFA] px-3 py-2 text-[12px] uppercase tracking-[0.12em] text-gray-400 font-medium"
                    >
                      {giorno}
                    </div>
                  )
                )}

                {giorniMese.map((giorno, index) => {
                  const items = giorno ? attivitaDelGiorno(giorno) : [];

                  return (
                    <div
                        key={index}
                        className={`min-h-[145px] border-r border-b border-gray-200 p-2 ${
                            giorno && isWeekend(giorno) ? "bg-gray-100" : "bg-white"
                        }`}
                    >
                      {giorno && (
                        <>
                          <p
                            className={`text-[13px] font-medium mb-2 ${
                                isWeekend(giorno) ? "text-gray-400" : "text-[#2B2F5E]"
                            }`}
                            >
                            {giorno.getDate()}
                          </p>

                          <div className="space-y-1">
                            {items.flatMap((item) =>
                              item.persone.map((persona) => (
                                <button
                                  type="button"
                                  key={`${item.id}-${persona.id}`}
                                  onClick={() => apriModificaAttivita(item)}
                                  className="w-full text-left px-2 py-1 rounded-sm text-white text-[11px] leading-tight cursor-pointer hover:opacity-80 transition"
                                  style={{
                                    backgroundColor: persona.colore,
                                  }}
                                  title={`${item.titolo} - ${persona.nome}`}
                                >
                                  <div className="leading-tight">
                                    <p>{persona.nome}</p>

                                    <p>
                                        {item.commessa_id && item.tipo_commessa
                                        ? `${SIMBOLO_TIPO[item.tipo_commessa] || ""} ${
                                            item.titolo_commessa || ""
                                            }`
                                        : "Attività libera"}
                                    </p>

                                    <p>{item.titolo}</p>
                                  </div>

                                </button>
                              ))
                            )}
                          </div>
                        </>
                      )}
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