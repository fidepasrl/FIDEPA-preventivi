"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import LayoutApp from "@/components/LayoutApp";
import ImportoInput from "@/components/ImportoInput";
import { supabase } from "@/lib/supabase";
import { ordinaCategorieGara } from "@/lib/garaCategorieOrdine";
import { aggiungiImportiFidepa } from "@/lib/gareAppalto";
import { finalizzaInputImporto, formattaEuro, parseImporto } from "@/lib/importi";

type Categoria = {
  codice: string;
  categoria: string | null;
  destinazione: string | null;
  importo_fidepa: number;
};

type Professionista = {
  id: string;
  nome: string | null;
  cognome: string | null;
  professione: string | null;
};

type Lavoro = {
  id: string;
  percentuale_prestazione: number | null;
};

type LavoroCategoria = {
  lavoro_id: string;
  categoria_codice: string;
  importo: number;
};

type Preparazione = {
  id: string;
  titolo: string;
  ente: string | null;
  oggetto: string | null;
  disciplinare: string | null;
  scadenza: string | null;
  stato: string;
  fatturato_richiesto: number;
  note: string | null;
  created_at: string;
};

type RequisitoGara = {
  id: string;
  categoria_codice: string;
  importo_richiesto: string;
};

type RequisitoPartecipante = {
  id: string;
  categoria_codice: string;
  importo: string;
};

type Partecipante = {
  id: string;
  tipo: "societa" | "professionista";
  nome: string;
  professionista_id: string;
  ruolo: string;
  note: string;
  requisiti: RequisitoPartecipante[];
};

type ProfessionistaRequisito = {
  id: string;
  professionista_id: string;
  categoria_codice: string;
  importo: number;
  descrizione: string | null;
};

const FORM_INIZIALE = {
  id: "",
  titolo: "",
  ente: "",
  oggetto: "",
  disciplinare: "",
  scadenza: "",
  stato: "bozza",
  fatturato_richiesto: "",
  note: "",
};

export default function PreparazioneGaraPage() {
  const [categorie, setCategorie] = useState<Categoria[]>([]);
  const [professionisti, setProfessionisti] = useState<Professionista[]>([]);
  const [professionistiRequisiti, setProfessionistiRequisiti] = useState<
    ProfessionistaRequisito[]
  >([]);
  const [preparazioni, setPreparazioni] = useState<Preparazione[]>([]);
  const [form, setForm] = useState(FORM_INIZIALE);
  const [requisiti, setRequisiti] = useState<RequisitoGara[]>([
    creaRequisitoGara(),
  ]);
  const [partecipanti, setPartecipanti] = useState<Partecipante[]>([]);
  const [caricamento, setCaricamento] = useState(true);
  const [salvataggio, setSalvataggio] = useState(false);
  const [errore, setErrore] = useState("");

  useEffect(() => {
    caricaDati();
  }, []);

  useEffect(() => {
    if (caricamento || form.id) return;

    const preparazioneId = new URLSearchParams(window.location.search).get(
      "gara"
    );
    const preparazione = preparazioni.find((item) => item.id === preparazioneId);

    if (preparazione) {
      apriScheda(preparazione);
    }
  }, [caricamento, form.id, preparazioni]);

  async function caricaDati() {
    setCaricamento(true);
    setErrore("");

    const [
      categorieRes,
      professionistiRes,
      preparazioniRes,
      requisitiProfRes,
      lavoriRes,
      importiRes,
    ] = await Promise.all([
        supabase.from("gara_categorie").select("*").order("codice"),
        supabase
          .from("professionisti")
          .select("id, nome, cognome, professione")
          .order("cognome"),
        supabase
          .from("gara_preparazioni")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase.from("professionisti_requisiti_gara").select("*"),
        supabase
          .from("gara_lavori")
          .select("id, percentuale_prestazione"),
        supabase.from("gara_lavori_categorie").select("*"),
      ]);

    if (
      categorieRes.error ||
      professionistiRes.error ||
      preparazioniRes.error ||
      requisitiProfRes.error ||
      lavoriRes.error ||
      importiRes.error
    ) {
      setErrore(
        categorieRes.error?.message ||
          professionistiRes.error?.message ||
          preparazioniRes.error?.message ||
          requisitiProfRes.error?.message ||
          lavoriRes.error?.message ||
          importiRes.error?.message ||
          "Errore durante il caricamento."
      );
      setCaricamento(false);
      return;
    }

    const categorieOrdinate = ordinaCategorieGara(
      (categorieRes.data || []) as Categoria[]
    );
    const lavoriDb = (lavoriRes.data || []) as Lavoro[];
    const importiDb = (importiRes.data || []) as LavoroCategoria[];

    setCategorie(
      aggiungiImportiFidepa(categorieOrdinate, lavoriDb, importiDb)
    );
    setProfessionisti((professionistiRes.data || []) as Professionista[]);
    setPreparazioni((preparazioniRes.data || []) as Preparazione[]);
    setProfessionistiRequisiti(
      (requisitiProfRes.data || []) as ProfessionistaRequisito[]
    );
    setCaricamento(false);
  }

  const categorieByCodice = useMemo(
    () => new Map(categorie.map((categoria) => [categoria.codice, categoria])),
    [categorie]
  );

  const copertura = requisiti
    .filter((requisito) => requisito.categoria_codice)
    .map((requisito) => {
      const categoria = categorieByCodice.get(requisito.categoria_codice);
      const richiesto = parseImporto(requisito.importo_richiesto);
      const fidepa = Number(categoria?.importo_fidepa || 0);
      const partner = partecipanti.reduce((totale, partecipante) => {
        const importo = partecipante.requisiti
          .filter((riga) => riga.categoria_codice === requisito.categoria_codice)
          .reduce((somma, riga) => somma + parseImporto(riga.importo), 0);
        return totale + importo;
      }, 0);
      const totale = fidepa + partner;

      return {
        codice: requisito.categoria_codice,
        categoria,
        richiesto,
        fidepa,
        partner,
        totale,
        mancante: Math.max(0, richiesto - totale),
      };
    });

  function aggiornaForm(campo: keyof typeof FORM_INIZIALE, valore: string) {
    setForm((corrente) => ({ ...corrente, [campo]: valore }));
  }

  function nuovaScheda() {
    setForm(FORM_INIZIALE);
    setRequisiti([creaRequisitoGara()]);
    setPartecipanti([]);
  }

  async function apriScheda(item: Preparazione) {
    setForm({
      id: item.id,
      titolo: item.titolo || "",
      ente: item.ente || "",
      oggetto: item.oggetto || "",
      disciplinare: item.disciplinare || "",
      scadenza: item.scadenza || "",
      stato: item.stato || "bozza",
      fatturato_richiesto: finalizzaInputImporto(item.fatturato_richiesto || 0),
      note: item.note || "",
    });

    const [requisitiRes, partecipantiRes] = await Promise.all([
      supabase
        .from("gara_preparazione_requisiti")
        .select("*")
        .eq("preparazione_id", item.id),
      supabase
        .from("gara_preparazione_partecipanti")
        .select("*")
        .eq("preparazione_id", item.id),
    ]);

    if (requisitiRes.error || partecipantiRes.error) {
      alert("Errore durante il caricamento della scheda gara.");
      return;
    }

    const partecipantiDb = partecipantiRes.data || [];
    let requisitiPartecipantiData: any[] = [];

    if (partecipantiDb.length > 0) {
      const requisitiPartecipantiRes = await supabase
        .from("gara_preparazione_partecipante_requisiti")
        .select("*")
        .in(
          "partecipante_id",
          partecipantiDb.map((partecipante) => partecipante.id)
        );

      if (requisitiPartecipantiRes.error) {
        alert("Errore durante il caricamento dei requisiti del raggruppamento.");
        return;
      }

      requisitiPartecipantiData = requisitiPartecipantiRes.data || [];
    }

    setRequisiti(
      (requisitiRes.data || []).map((riga) => ({
        id: riga.id,
        categoria_codice: riga.categoria_codice,
        importo_richiesto: finalizzaInputImporto(riga.importo_richiesto || 0),
      }))
    );

    setPartecipanti(
      partecipantiDb.map((partecipante) => ({
        id: partecipante.id,
        tipo: partecipante.tipo === "professionista" ? "professionista" : "societa",
        nome: partecipante.nome || "",
        professionista_id: partecipante.professionista_id || "",
        ruolo: partecipante.ruolo || "",
        note: partecipante.note || "",
        requisiti: requisitiPartecipantiData
          .filter((riga) => riga.partecipante_id === partecipante.id)
          .map((riga) => ({
            id: riga.id,
            categoria_codice: riga.categoria_codice,
            importo: finalizzaInputImporto(riga.importo || 0),
          })),
      }))
    );
  }

  function aggiornaRequisito(
    id: string,
    campo: keyof RequisitoGara,
    valore: string
  ) {
    setRequisiti((correnti) =>
      correnti.map((requisito) =>
        requisito.id === id ? { ...requisito, [campo]: valore } : requisito
      )
    );
  }

  function aggiungiRequisito() {
    setRequisiti((correnti) => [...correnti, creaRequisitoGara()]);
  }

  function rimuoviRequisito(id: string) {
    setRequisiti((correnti) =>
      correnti.length === 1
        ? [creaRequisitoGara()]
        : correnti.filter((requisito) => requisito.id !== id)
    );
  }

  function aggiungiPartecipante() {
    setPartecipanti((correnti) => [...correnti, creaPartecipante()]);
  }

  function aggiornaPartecipante(
    id: string,
    campo: Exclude<keyof Partecipante, "requisiti">,
    valore: string
  ) {
    setPartecipanti((correnti) =>
      correnti.map((partecipante) => {
        if (partecipante.id !== id) return partecipante;

        const aggiornato: Partecipante = { ...partecipante };

        if (campo === "tipo") {
          aggiornato.tipo =
            valore === "professionista" ? "professionista" : "societa";
        } else {
          aggiornato[campo] = valore;
        }

        if (campo === "professionista_id") {
          const professionista = professionisti.find((item) => item.id === valore);
          aggiornato.nome = professionista
            ? `${professionista.cognome || ""} ${professionista.nome || ""}`.trim()
            : "";
        }

        if (campo === "tipo" && valore === "societa") {
          aggiornato.professionista_id = "";
        }

        return aggiornato;
      })
    );
  }

  function rimuoviPartecipante(id: string) {
    setPartecipanti((correnti) =>
      correnti.filter((partecipante) => partecipante.id !== id)
    );
  }

  function aggiungiRequisitoPartecipante(partecipanteId: string) {
    setPartecipanti((correnti) =>
      correnti.map((partecipante) =>
        partecipante.id === partecipanteId
          ? {
              ...partecipante,
              requisiti: [...partecipante.requisiti, creaRequisitoPartecipante()],
            }
          : partecipante
      )
    );
  }

  function aggiornaRequisitoPartecipante(
    partecipanteId: string,
    requisitoId: string,
    campo: keyof RequisitoPartecipante,
    valore: string
  ) {
    setPartecipanti((correnti) =>
      correnti.map((partecipante) =>
        partecipante.id === partecipanteId
          ? {
              ...partecipante,
              requisiti: partecipante.requisiti.map((requisito) =>
                requisito.id === requisitoId
                  ? { ...requisito, [campo]: valore }
                  : requisito
              ),
            }
          : partecipante
      )
    );
  }

  function importaRequisitiProfessionista(partecipante: Partecipante) {
    const requisitiSalvati = professionistiRequisiti.filter(
      (item) => item.professionista_id === partecipante.professionista_id
    );

    if (requisitiSalvati.length === 0) return;

    setPartecipanti((correnti) =>
      correnti.map((item) =>
        item.id === partecipante.id
          ? {
              ...item,
              requisiti: requisitiSalvati.map((riga) => ({
                id: creaIdLocale(),
                categoria_codice: riga.categoria_codice,
                importo: finalizzaInputImporto(riga.importo || 0),
              })),
            }
          : item
      )
    );
  }

  async function salvaScheda() {
    if (!form.titolo.trim()) {
      alert("Inserisci almeno il titolo della gara.");
      return;
    }

    setSalvataggio(true);

    const payload = {
      titolo: form.titolo.trim(),
      ente: form.ente.trim() || null,
      oggetto: form.oggetto.trim() || null,
      disciplinare: form.disciplinare.trim() || null,
      scadenza: form.scadenza || null,
      stato: form.stato || "bozza",
      fatturato_richiesto: parseImporto(form.fatturato_richiesto),
      note: form.note.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const richiesta = form.id
      ? supabase.from("gara_preparazioni").update(payload).eq("id", form.id).select().single()
      : supabase.from("gara_preparazioni").insert(payload).select().single();

    const { data, error } = await richiesta;

    if (error || !data) {
      alert(`Errore durante il salvataggio della gara: ${error?.message || ""}`);
      setSalvataggio(false);
      return;
    }

    const preparazioneId = data.id;

    await supabase
      .from("gara_preparazione_requisiti")
      .delete()
      .eq("preparazione_id", preparazioneId);
    await supabase
      .from("gara_preparazione_partecipanti")
      .delete()
      .eq("preparazione_id", preparazioneId);

    const requisitiPayload = requisiti
      .filter((requisito) => requisito.categoria_codice)
      .map((requisito) => ({
        preparazione_id: preparazioneId,
        categoria_codice: requisito.categoria_codice,
        importo_richiesto: parseImporto(requisito.importo_richiesto),
      }));

    if (requisitiPayload.length > 0) {
      await supabase.from("gara_preparazione_requisiti").insert(requisitiPayload);
    }

    for (const partecipante of partecipanti.filter((item) => item.nome.trim())) {
      const { data: partecipanteSalvato, error: errorePartecipante } =
        await supabase
          .from("gara_preparazione_partecipanti")
          .insert({
            preparazione_id: preparazioneId,
            tipo: partecipante.tipo,
            nome: partecipante.nome.trim(),
            professionista_id:
              partecipante.tipo === "professionista"
                ? partecipante.professionista_id || null
                : null,
            ruolo: partecipante.ruolo.trim() || null,
            note: partecipante.note.trim() || null,
          })
          .select()
          .single();

      if (errorePartecipante || !partecipanteSalvato) continue;

      const requisitiPartecipante = partecipante.requisiti
        .filter((requisito) => requisito.categoria_codice)
        .map((requisito) => ({
          partecipante_id: partecipanteSalvato.id,
          categoria_codice: requisito.categoria_codice,
          importo: parseImporto(requisito.importo),
        }));

      if (requisitiPartecipante.length > 0) {
        await supabase
          .from("gara_preparazione_partecipante_requisiti")
          .insert(requisitiPartecipante);
      }

      if (partecipante.professionista_id) {
        const requisitiProfessionista = partecipante.requisiti
          .filter((requisito) => requisito.categoria_codice)
          .map((requisito) => ({
            professionista_id: partecipante.professionista_id,
            categoria_codice: requisito.categoria_codice,
            importo: parseImporto(requisito.importo),
            descrizione: form.titolo.trim(),
          }));

        if (requisitiProfessionista.length > 0) {
          await supabase
            .from("professionisti_requisiti_gara")
            .insert(requisitiProfessionista);
        }
      }
    }

    setForm((corrente) => ({ ...corrente, id: preparazioneId }));
    await caricaDati();
    setSalvataggio(false);
    alert("Scheda gara salvata.");
  }

  return (
    <LayoutApp>
      <div>
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4 mb-6">
          <div>
            <h2 className="page-title">Preparazione gara</h2>

            <p className="text-[15px] text-[#D79D06] mt-1">
              Schede operative, requisiti FIDEPA e raggruppamenti
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={nuovaScheda}
              className="border border-gray-300 text-[#2B2F5E] px-4 py-3 rounded-md text-sm font-medium bg-white hover:bg-[#e8e8e8] transition cursor-pointer"
            >
              Nuova scheda
            </button>

            <Link
              href="/requisiti"
              className="border border-gray-300 text-[#2B2F5E] px-4 py-3 rounded-md text-sm font-medium bg-white hover:bg-[#e8e8e8] transition"
            >
              Gare d&apos;appalto
            </Link>

            <Link
              href="/requisiti/archivio"
              className="border border-gray-300 text-[#2B2F5E] px-4 py-3 rounded-md text-sm font-medium bg-white hover:bg-[#e8e8e8] transition"
            >
              Archivio gare
            </Link>
          </div>
        </div>

        {errore ? (
          <MessaggioDatabase errore={errore} />
        ) : caricamento ? (
          <p className="text-center text-gray-500 py-10">
            Caricamento preparazione gara...
          </p>
        ) : (
          <div className="space-y-4">
              <section className="bg-white border border-gray-200 shadow-sm rounded-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 bg-[#FAFAFA]">
                  <h3 className="text-[17px] font-normal text-[#2B2F5E]">
                    Dati gara
                  </h3>
                </div>

                <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Campo label="Titolo gara" value={form.titolo} onChange={(v) => aggiornaForm("titolo", v)} />
                  <Campo label="Ente / Stazione appaltante" value={form.ente} onChange={(v) => aggiornaForm("ente", v)} />
                  <Campo label="Scadenza" type="date" value={form.scadenza} onChange={(v) => aggiornaForm("scadenza", v)} />
                  <CampoImporto label="Fatturato richiesto" value={form.fatturato_richiesto} onChange={(v) => aggiornaForm("fatturato_richiesto", v)} />

                  <div className="lg:col-span-2">
                    <Area label="Oggetto" value={form.oggetto} onChange={(v) => aggiornaForm("oggetto", v)} rows={3} />
                  </div>

                  <div className="lg:col-span-2">
                    <Area label="Disciplinare / estratto requisiti" value={form.disciplinare} onChange={(v) => aggiornaForm("disciplinare", v)} rows={7} />
                  </div>

                  <div className="lg:col-span-2">
                    <Area label="Note" value={form.note} onChange={(v) => aggiornaForm("note", v)} rows={3} />
                  </div>
                </div>
              </section>

              <section className="bg-white border border-gray-200 shadow-sm rounded-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 bg-[#FAFAFA] flex justify-between items-center">
                  <h3 className="text-[17px] font-normal text-[#2B2F5E]">
                    Requisiti richiesti
                  </h3>
                  <button
                    type="button"
                    onClick={aggiungiRequisito}
                    className="bg-[#64B445] text-white w-10 h-10 rounded-md text-2xl font-light hover:bg-[#5AA03E] hover:scale-105 transition flex items-center justify-center shadow-sm cursor-pointer"
                  >
                    +
                  </button>
                </div>

                <div className="p-4 space-y-3">
                  {requisiti.map((requisito) => (
                    <div
                      key={requisito.id}
                    className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_210px_40px] gap-3"
                    >
                      <SelectCategoria
                        categorie={categorie}
                        value={requisito.categoria_codice}
                        onChange={(value) =>
                          aggiornaRequisito(
                            requisito.id,
                            "categoria_codice",
                            value
                          )
                        }
                      />
                      <ImportoInput
                        value={requisito.importo_richiesto}
                        onChange={(value) =>
                          aggiornaRequisito(
                            requisito.id,
                            "importo_richiesto",
                            value
                          )
                        }
                        placeholder="Importo richiesto"
                      />
                      <button
                        type="button"
                        onClick={() => rimuoviRequisito(requisito.id)}
                        className="text-red-500 hover:text-red-700 text-xl font-semibold transition cursor-pointer"
                      >
                        &times;
                      </button>
                    </div>
                  ))}

                  <div className="border border-gray-200 rounded-sm overflow-x-auto">
                    <table className="w-full min-w-[720px] text-sm">
                      <thead className="bg-[#FAFAFA] text-[11px] uppercase tracking-[0.12em] text-gray-400">
                        <tr>
                          <th className="text-left px-4 py-3">Categoria</th>
                          <th className="text-right px-4 py-3">Richiesto</th>
                          <th className="text-right px-4 py-3">FIDEPA</th>
                          <th className="text-right px-4 py-3">Partner</th>
                          <th className="text-right px-4 py-3">Mancante</th>
                        </tr>
                      </thead>
                      <tbody>
                        {copertura.map((riga) => (
                          <tr key={riga.codice} className="border-t border-gray-100">
                            <td className="px-4 py-3 font-semibold text-[#2B2F5E]">
                              {riga.codice}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {formattaEuro(riga.richiesto)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {formattaEuro(riga.fidepa)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {formattaEuro(riga.partner)}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold">
                              {formattaEuro(riga.mancante)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>

              <section className="bg-white border border-gray-200 shadow-sm rounded-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 bg-[#FAFAFA] flex justify-between items-center">
                  <h3 className="text-[17px] font-normal text-[#2B2F5E]">
                    Raggruppamento
                  </h3>
                  <button
                    type="button"
                    onClick={aggiungiPartecipante}
                    className="bg-[#64B445] text-white w-10 h-10 rounded-md text-2xl font-light hover:bg-[#5AA03E] hover:scale-105 transition flex items-center justify-center shadow-sm cursor-pointer"
                  >
                    +
                  </button>
                </div>

                <div className="p-4 space-y-3">
                  {partecipanti.length === 0 ? (
                    <p className="text-sm text-gray-400">
                      Nessun partecipante inserito.
                    </p>
                  ) : (
                    partecipanti.map((partecipante) => (
                      <div
                        key={partecipante.id}
                        className="border border-gray-200 rounded-sm p-4 bg-[#FAFAFA]"
                      >
                        <div className="grid grid-cols-1 xl:grid-cols-[150px_minmax(0,1fr)_minmax(0,1fr)_40px] gap-3">
                          <select
                            value={partecipante.tipo}
                            onChange={(e) =>
                              aggiornaPartecipante(
                                partecipante.id,
                                "tipo",
                                e.target.value
                              )
                            }
                            className="w-full min-w-0 border border-gray-300 rounded-md px-3 py-3 bg-white outline-none focus:border-[#64B445]"
                          >
                            <option value="societa">Societa</option>
                            <option value="professionista">Professionista</option>
                          </select>

                          {partecipante.tipo === "professionista" ? (
                            <select
                              value={partecipante.professionista_id}
                              onChange={(e) =>
                                aggiornaPartecipante(
                                  partecipante.id,
                                  "professionista_id",
                                  e.target.value
                                )
                              }
                              className="w-full min-w-0 border border-gray-300 rounded-md px-3 py-3 bg-white outline-none focus:border-[#64B445]"
                            >
                              <option value="">Seleziona professionista</option>
                              {professionisti.map((professionista) => (
                                <option
                                  key={professionista.id}
                                  value={professionista.id}
                                >
                                  {professionista.cognome} {professionista.nome}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              value={partecipante.nome}
                              onChange={(e) =>
                                aggiornaPartecipante(
                                  partecipante.id,
                                  "nome",
                                  e.target.value
                                )
                              }
                              placeholder="Societa"
                              className="w-full min-w-0 border border-gray-300 rounded-md px-3 py-3 bg-white outline-none focus:border-[#64B445]"
                            />
                          )}

                          <input
                            value={partecipante.ruolo}
                            onChange={(e) =>
                              aggiornaPartecipante(
                                partecipante.id,
                                "ruolo",
                                e.target.value
                              )
                            }
                            placeholder="Ruolo nel RTP"
                            className="w-full min-w-0 border border-gray-300 rounded-md px-3 py-3 bg-white outline-none focus:border-[#64B445]"
                          />

                          <button
                            type="button"
                            onClick={() => rimuoviPartecipante(partecipante.id)}
                            className="text-red-500 hover:text-red-700 text-xl font-semibold transition cursor-pointer"
                          >
                            &times;
                          </button>
                        </div>

                        <div className="mt-3 flex flex-col lg:flex-row lg:justify-between lg:items-center gap-3">
                          <p className="text-[12px] uppercase tracking-[0.12em] text-gray-400">
                            Requisiti partecipante
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {partecipante.professionista_id && (
                              <button
                                type="button"
                                onClick={() =>
                                  importaRequisitiProfessionista(partecipante)
                                }
                                className="text-[#2B2F5E] border border-gray-300 px-3 py-2 rounded-md text-xs bg-white hover:bg-[#e8e8e8] transition cursor-pointer"
                              >
                                Importa salvati
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                aggiungiRequisitoPartecipante(partecipante.id)
                              }
                              className="text-white bg-[#64B445] px-3 py-2 rounded-md text-xs hover:bg-[#5AA03E] transition cursor-pointer"
                            >
                              Aggiungi requisito
                            </button>
                          </div>
                        </div>

                        <div className="mt-3 space-y-2">
                          {partecipante.requisiti.map((requisito) => (
                            <div
                              key={requisito.id}
                              className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_210px] gap-2"
                            >
                              <SelectCategoria
                                categorie={categorie}
                                value={requisito.categoria_codice}
                                onChange={(value) =>
                                  aggiornaRequisitoPartecipante(
                                    partecipante.id,
                                    requisito.id,
                                    "categoria_codice",
                                    value
                                  )
                                }
                              />
                              <ImportoInput
                                value={requisito.importo}
                                onChange={(value) =>
                                  aggiornaRequisitoPartecipante(
                                    partecipante.id,
                                    requisito.id,
                                    "importo",
                                    value
                                  )
                                }
                                placeholder="Importo"
                                compact
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={salvaScheda}
                  disabled={salvataggio}
                  className="bg-[#64B445] text-white px-6 py-3 rounded-md text-sm font-medium hover:bg-[#5AA03E] transition cursor-pointer disabled:opacity-50"
                >
                  {salvataggio ? "Salvataggio..." : "Salva scheda gara"}
                </button>
              </div>
          </div>
        )}
      </div>
    </LayoutApp>
  );
}

function creaRequisitoGara(): RequisitoGara {
  return {
    id: creaIdLocale(),
    categoria_codice: "",
    importo_richiesto: "",
  };
}

function creaRequisitoPartecipante(): RequisitoPartecipante {
  return {
    id: creaIdLocale(),
    categoria_codice: "",
    importo: "",
  };
}

function creaPartecipante(): Partecipante {
  return {
    id: creaIdLocale(),
    tipo: "societa",
    nome: "",
    professionista_id: "",
    ruolo: "",
    note: "",
    requisiti: [creaRequisitoPartecipante()],
  };
}

function creaIdLocale() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return Math.random().toString(36).slice(2);
}

function SelectCategoria({
  categorie,
  value,
  onChange,
}: {
  categorie: Categoria[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full min-w-0 border border-gray-300 rounded-md px-3 py-3 bg-white outline-none focus:border-[#64B445] text-[14px] text-[#2B2F5E]"
    >
      <option value="">Seleziona categoria</option>
      {categorie.map((categoria) => (
        <option key={categoria.codice} value={categoria.codice}>
          {categoria.codice} - {categoria.destinazione || categoria.categoria}
        </option>
      ))}
    </select>
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
    <label className="block">
      <span className="block text-sm font-medium mb-2 text-[#2B2F5E]">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-w-0 border border-gray-300 rounded-md px-4 py-3 bg-transparent outline-none transition focus:bg-white focus:border-[#64B445] focus:shadow-sm"
      />
    </label>
  );
}

function CampoImporto({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium mb-2 text-[#2B2F5E]">
        {label}
      </span>
      <ImportoInput value={value} onChange={onChange} />
    </label>
  );
}

function Area({
  label,
  value,
  onChange,
  rows,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows: number;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium mb-2 text-[#2B2F5E]">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full min-w-0 border border-gray-300 rounded-md px-4 py-3 bg-transparent outline-none transition focus:bg-white focus:border-[#64B445] focus:shadow-sm resize-none"
      />
    </label>
  );
}

function MessaggioDatabase({ errore }: { errore: string }) {
  return (
    <div className="bg-white border border-red-200 shadow-sm rounded-sm p-6">
      <h3 className="text-xl font-semibold text-[#2B2F5E]">
        Tabelle requisiti non disponibili
      </h3>
      <p className="text-sm text-gray-600 mt-2">
        Esegui prima il file SQL <span className="font-semibold">supabase-requisiti-gara.sql</span>.
      </p>
      <p className="text-xs text-red-500 mt-3">{errore}</p>
    </div>
  );
}
