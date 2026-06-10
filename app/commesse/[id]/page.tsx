"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import LayoutApp from "@/components/LayoutApp";
import { supabase } from "@/lib/supabase";

type Priorita = "Urgente" | "Alta" | "Normale" | "Bassa" | "Terminato";
type TipoCommessa = "Pubblica" | "Privata" | "Gara" | "Concorso";

type Cliente = {
  id: string;
  cliente: string;
  piva: string | null;
  indirizzo: string | null;
  comune: string | null;
  pec: string | null;
  email: string | null;
  telefono: string | null;
  referente: string | null;
};

type Commessa = {
  id: string;
  titolo: string;
  codice: string | null;
  descrizione: string | null;
  cliente_id: string | null;
  cliente_nome: string | null;
  posizione: string | null;
  latitudine: number | null;
  longitudine: number | null;
  tipo_commessa: TipoCommessa;
  priorita: Priorita;
  url: string | null;
  importo_lavori: number | null;
  importo_commessa: number | null;
  data_inizio: string | null;
  data_fine: string | null;
};

type CommessaElenco = {
  id: string;
  titolo: string;
  codice: string | null;
  priorita: Priorita;
  tipo_commessa: TipoCommessa;
};

type PreventivoCollegato = {
  id: string;
  numero: string;
  data: string;
  cliente: string;
  oggetto: string;
  totale: number;
};

type Nota = {
  id: string;
  testo: string;
  origine: string | null;
  created_at: string;
  data_nota: string | null;
};

const PRIORITA: Priorita[] = [
  "Urgente",
  "Alta",
  "Normale",
  "Bassa",
  "Terminato",
];

const TIPI_COMMESSA: TipoCommessa[] = [
  "Pubblica",
  "Privata",
  "Gara",
  "Concorso",
];

const SIMBOLO_TIPO: Record<TipoCommessa, string> = {
  Pubblica: "■",
  Privata: "●",
  Gara: "▲",
  Concorso: "⚑",
};

export default function DettaglioCommessaPage() {
  const params = useParams();
  const id = params.id as string;

  const [commessa, setCommessa] = useState<Commessa | null>(null);
  const [elencoCommesse, setElencoCommesse] = useState<CommessaElenco[]>([]);
  const [note, setNote] = useState<Nota[]>([]);
  const [clienti, setClienti] = useState<Cliente[]>([]);
  const [clienteSelezionato, setClienteSelezionato] =
    useState<Cliente | null>(null);

  const [schedaClienteAperta, setSchedaClienteAperta] = useState(false);
  const [nuovaNota, setNuovaNota] = useState("");
  const [caricamento, setCaricamento] = useState(true);
  const [storicoAperto, setStoricoAperto] = useState(false);

  const [salvataggioInCorso, setSalvataggioInCorso] =
    useState(false);

  const [preventivoCollegato, setPreventivoCollegato] = useState<PreventivoCollegato | null>(null);
  const [popupPreventivi, setPopupPreventivi] = useState(false);
  const [elencoPreventivi, setElencoPreventivi] = useState<PreventivoCollegato[]>([]);
  const [caricamentoPreventivi, setCaricamentoPreventivi] = useState(false);

  const suggerimentiClienti = clienti.filter((cliente) => {
    if (!commessa?.cliente_nome?.trim()) return false;
    if (clienteSelezionato?.cliente === commessa.cliente_nome) return false;

    return cliente.cliente
      .toLowerCase()
      .includes(commessa.cliente_nome.toLowerCase());
  });

  useEffect(() => {
    caricaPagina();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

    function calcolaDataInizioDaNote(
        dataInizioAttuale: string | null,
        elencoNote: Nota[]
        ) {
        if (!dataInizioAttuale || elencoNote.length === 0) {
            return dataInizioAttuale;
        }

        const dateNote = elencoNote
            .map((nota) => nota.data_nota || nota.created_at?.slice(0, 10))
            .filter(Boolean)
            .sort();

        if (dateNote.length === 0) {
            return dataInizioAttuale;
        }

        const dataNotaPiuVecchia = dateNote[0];

        return dataNotaPiuVecchia < dataInizioAttuale
            ? dataNotaPiuVecchia
            : dataInizioAttuale;
    }

  async function caricaPagina() {
    setCaricamento(true);
    await Promise.all([caricaClienti(), caricaCommessa(), caricaElencoCommesse()]);
    setCaricamento(false);
  }

  async function caricaClienti() {
    const { data, error } = await supabase
      .from("clienti")
      .select("*")
      .order("cliente", { ascending: true });

    if (error) {
      console.error("Errore caricamento clienti:", error);
      setClienti([]);
      return;
    }

    setClienti(data || []);
  }

  async function caricaElencoCommesse() {
    const { data, error } = await supabase
      .from("commesse")
      .select("id, titolo, codice, priorita, tipo_commessa")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Errore caricamento elenco commesse:", error);
      setElencoCommesse([]);
      return;
    }

    setElencoCommesse(data || []);
  }

    async function caricaCommessa() {
        const { data, error } = await supabase
            .from("commesse")
            .select("*")
            .eq("id", id)
            .single();

        if (!error && data) {
            setCommessa(data);

            if (data.cliente_id) {
                const { data: clienteData } = await supabase
                    .from("clienti")
                    .select("*")
                    .eq("id", data.cliente_id)
                    .single();

                if (clienteData) {
                    setClienteSelezionato(clienteData);
                }

                await caricaPreventivoCollegato(id);

            } else {
            setClienteSelezionato(null);
            }
        }

        const { data: noteData } = await supabase
          .from("commesse_note")
          .select("*")
          .eq("commessa_id", id)
          .order("data_nota", { ascending: false })
          .order("created_at", { ascending: false });

        const noteOrdinate = noteData || [];
        setNote(noteOrdinate);

        if (data) {
            const nuovaDataInizio = calcolaDataInizioDaNote(
            data.data_inizio,
            noteOrdinate
            );

            if (nuovaDataInizio && nuovaDataInizio !== data.data_inizio) {
            setCommessa((corrente) =>
                corrente ? { ...corrente, data_inizio: nuovaDataInizio } : corrente
            );

            await supabase
                .from("commesse")
                .update({ data_inizio: nuovaDataInizio })
                .eq("id", id);
            }
        }
    }

  function aggiornaCampo(campo: keyof Commessa, valore: string) {
    if (!commessa) return;

    setCommessa({
      ...commessa,
      [campo]: valore,
    });
  }

  function selezionaCliente(cliente: Cliente) {
    if (!commessa) return;

    setCommessa({
      ...commessa,
      cliente_id: cliente.id,
      cliente_nome: cliente.cliente,
    });

    setClienteSelezionato(cliente);
    setSchedaClienteAperta(false);
  }

  async function trovaOCreaCliente() {
    if (!commessa?.cliente_nome?.trim()) return null;

    const nomeCliente = commessa.cliente_nome.trim();

    const clienteEsistente = clienti.find(
      (cliente) =>
        cliente.cliente.trim().toLowerCase() === nomeCliente.toLowerCase()
    );

    if (clienteEsistente) {
      setClienteSelezionato(clienteEsistente);
      return clienteEsistente;
    }

    const { data, error } = await supabase
      .from("clienti")
      .insert({ cliente: nomeCliente })
      .select()
      .single();

    if (error) {
      console.error("Errore creazione cliente:", error);
      return null;
    }

    setClienti((correnti) => [...correnti, data]);
    setClienteSelezionato(data);
    return data;
  }

  async function salvaCommessa() {
    setSalvataggioInCorso(true);
    if (!commessa) return;

    const clienteFinale = await trovaOCreaCliente();

    const dataFine =
      commessa.priorita === "Terminato" && !commessa.data_fine
        ? new Date().toISOString().slice(0, 10)
        : commessa.data_fine;

    const { error } = await supabase
      .from("commesse")
      .update({
        titolo: commessa.titolo,
        codice: commessa.codice || null,
        descrizione: commessa.descrizione || null,
        cliente_id: clienteFinale?.id || commessa.cliente_id || null,
        cliente_nome: clienteFinale?.cliente || commessa.cliente_nome || null,
        posizione: commessa.posizione || null,
        latitudine: commessa.latitudine ? Number(commessa.latitudine) : null,
        longitudine: commessa.longitudine ? Number(commessa.longitudine) : null,
        tipo_commessa: commessa.tipo_commessa,
        priorita: commessa.priorita,
        url:
          commessa.tipo_commessa === "Gara" ||
          commessa.tipo_commessa === "Concorso"
            ? commessa.url || null
            : null,
        importo_lavori: Number(commessa.importo_lavori || 0),
        importo_commessa: Number(commessa.importo_commessa || 0),
        data_inizio: commessa.data_inizio || null,
        data_fine: dataFine,
      })
      .eq("id", commessa.id);

    if (error) {
      setSalvataggioInCorso(false);

      alert("Errore durante il salvataggio della commessa.");
      return;
    }

    setCommessa({
      ...commessa,
      cliente_id: clienteFinale?.id || commessa.cliente_id,
      cliente_nome: clienteFinale?.cliente || commessa.cliente_nome,
      data_fine: dataFine,
    });

    await caricaElencoCommesse();
    setTimeout(() => {
      setSalvataggioInCorso(false);
    }, 1000);
  }

  async function aggiungiNota() {
    if (!nuovaNota.trim()) return;

    const oggi = new Date().toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from("commesse_note")
      .insert({
        commessa_id: id,
        testo: nuovaNota.trim(),
        origine: "manuale",
        data_nota: oggi,
      })
      .select()
      .single();

    if (error) {
      alert("Errore durante il salvataggio della nota.");
      return;
    }

    if (data) {
      const nuoveNote = [...note, data].sort((a, b) => {
        const dataA = a.data_nota || a.created_at.slice(0, 10);
        const dataB = b.data_nota || b.created_at.slice(0, 10);

        if (dataA !== dataB) {
          return dataB.localeCompare(dataA);
        }

        return (
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
        );
      });

      setNote(nuoveNote);

      if (commessa) {
        const nuovaDataInizio = calcolaDataInizioDaNote(
            commessa.data_inizio,
            nuoveNote
        );

        if (nuovaDataInizio && nuovaDataInizio !== commessa.data_inizio) {
            setCommessa({
            ...commessa,
            data_inizio: nuovaDataInizio,
            });

            await supabase
            .from("commesse")
            .update({ data_inizio: nuovaDataInizio })
            .eq("id", commessa.id);
        }
      }
    }

    setNuovaNota("");
  }

  async function eliminaNota(idNota: string) {
    const conferma = window.confirm(
      "Eliminare definitivamente questa nota?"
    );

    if (!conferma) return;

    const { error } = await supabase
      .from("commesse_note")
      .delete()
      .eq("id", idNota);

    if (error) {
      alert("Errore durante l'eliminazione della nota.");
      return;
    }

    setNote((correnti) =>
      correnti.filter((nota) => nota.id !== idNota)
    );
  }

  async function aggiornaDataNota(idNota: string, nuovaData: string) {
    const { error } = await supabase
      .from("commesse_note")
      .update({ data_nota: nuovaData || null })
      .eq("id", idNota);

    if (error) {
      alert("Errore durante l'aggiornamento della data della nota.");
      return;
    }

    const noteRiordinate = [...note]
      .map((nota) =>
        nota.id === idNota ? { ...nota, data_nota: nuovaData } : nota
      )
      .sort((a, b) => {
        const dataA = a.data_nota || a.created_at.slice(0, 10);
        const dataB = b.data_nota || b.created_at.slice(0, 10);

        if (dataA !== dataB) {
          return dataB.localeCompare(dataA);
        }

        return (
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
        );
      });

    setNote(noteRiordinate);

    if (commessa) {
      const nuovaDataInizio = calcolaDataInizioDaNote(
        commessa.data_inizio,
        noteRiordinate
      );

      if (nuovaDataInizio && nuovaDataInizio !== commessa.data_inizio) {
        setCommessa({
          ...commessa,
          data_inizio: nuovaDataInizio,
        });

        await supabase
          .from("commesse")
          .update({ data_inizio: nuovaDataInizio })
          .eq("id", commessa.id);
      }
    }
  }

  async function caricaPreventivoCollegato(commessa_id_preventivo: string | null) {
    if (!commessa_id_preventivo) return;
    const { data } = await supabase
      .from("preventivi")
      .select("id, numero, data, cliente, oggetto, totale")
      .eq("commessa_id", commessa_id_preventivo)
      .maybeSingle();
    if (data) setPreventivoCollegato(data);
  }

  async function apriPopupPreventivi() {
    setPopupPreventivi(true);
    setCaricamentoPreventivi(true);
    const { data } = await supabase
      .from("preventivi")
      .select("id, numero, data, cliente, oggetto, totale")
      .is("commessa_id", null)
      .order("created_at", { ascending: false });
    setElencoPreventivi(data || []);
    setCaricamentoPreventivi(false);
  }

  async function collegaPreventivo(preventivo: PreventivoCollegato) {
    const { error } = await supabase
      .from("preventivi")
      .update({ commessa_id: id })
      .eq("id", preventivo.id);
    if (error) { alert("Errore durante il collegamento del preventivo."); return; }
    setPreventivoCollegato(preventivo);
    setPopupPreventivi(false);
  }

  async function scollegaPreventivo() {
    if (!preventivoCollegato) return;
    const conferma = window.confirm("Vuoi scollegare questo preventivo dalla commessa?");
    if (!conferma) return;
    const { error } = await supabase
      .from("preventivi")
      .update({ commessa_id: null })
      .eq("id", preventivoCollegato.id);
    if (error) { alert("Errore durante lo scollegamento."); return; }
    setPreventivoCollegato(null);
  }

  function formattaData(data: string | null) {
    if (!data) return "-";
    return new Date(data).toLocaleDateString("it-IT");
  }

  function formatEuro(valore: number | null) {
    return Number(valore || 0).toLocaleString("it-IT", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  if (caricamento) {
    return (
      <LayoutApp>
        <p className="text-center text-gray-500 py-10">
          Caricamento commessa...
        </p>
      </LayoutApp>
    );
  }

  if (!commessa) {
    return (
      <LayoutApp>
        <p className="text-center text-gray-500 py-10">
          Commessa non trovata.
        </p>
      </LayoutApp>
    );
  }

  const ultimaNota = note[0];

  return (
    <LayoutApp>
      <div className="grid grid-cols-[260px_1fr] gap-6">
        <aside className="border-r border-gray-300 pr-4">

          <div className="space-y-5">
            {PRIORITA.map((priorita) => {
              const commessePriorita = elencoCommesse.filter(
                (item) => item.priorita === priorita
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
                    {commessePriorita.map((item) => {
                      const attiva = item.id === id;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            window.location.href = `/commesse/${item.id}`;
                          }}
                          className={`w-full text-left px-3 py-2 rounded-sm text-[13px] transition cursor-pointer ${
                            attiva
                              ? "bg-white text-[#2B2F5E] font-semibold shadow-sm border border-gray-200"
                              : "text-[#2B2F5E] hover:bg-[#e8e8e8]"
                          }`}
                        >
                          <span className="mr-2">
                            {SIMBOLO_TIPO[item.tipo_commessa]}
                          </span>

                          {item.titolo}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        <div>
                      <div className="flex justify-between items-start gap-4 mb-6">
            <div>
              <h2 className="page-title">
                {commessa.codice ? `${commessa.codice} | ` : ""}
                {commessa.titolo}
              </h2>

              <p className="text-[15px] text-[#D79D06] mt-1">
                Scheda commessa
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={salvaCommessa}
                disabled={salvataggioInCorso}
                className={`px-5 py-3 rounded-md text-sm font-medium transition cursor-pointer text-white ${
                  salvataggioInCorso
                    ? "bg-gray-400 cursor-wait"
                    : "bg-[#64B445] hover:bg-[#5AA03E]"
                }`}
              >
                {salvataggioInCorso
                  ? "Salvataggio..."
                  : "Salva modifiche"}
              </button>

              <button
                type="button"
                onClick={() => (window.location.href = "/commesse")}
                className="border border-gray-300 text-[#2B2F5E] px-5 py-3 rounded-md text-sm font-medium bg-transparent hover:bg-[#e8e8e8] transition cursor-pointer"
              >
                Chiudi
              </button>
            </div>
          </div>

          <div className="bg-white border border-gray-200 shadow-sm rounded-sm overflow-hidden mb-3">
            <div className="px-4 py-3 border-b border-gray-200 bg-[#FAFAFA] flex justify-between items-center">
              <div>
                <h3 className="text-[17px] font-normal text-[#2B2F5E]">Preventivo collegato</h3>
                <p className="text-[15px] text-[#D79D06] mt-0">
                  {preventivoCollegato ? "Preventivo associato a questa commessa" : "Nessun preventivo collegato"}
                </p>
              </div>
              {!preventivoCollegato && (
                <button
                  type="button"
                  onClick={apriPopupPreventivi}
                  className="bg-[#64B445] text-white px-5 py-3 rounded-md text-sm font-medium hover:bg-[#5AA03E] transition cursor-pointer"
                >
                  Collega preventivo
                </button>
              )}
            </div>

            <div className="p-4">
              {preventivoCollegato ? (
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-[15px] font-semibold text-[#2B2F5E]">
                      Preventivo n. {preventivoCollegato.numero}
                    </p>
                    <p className="text-[13px] text-[#D79D06] mt-0.5">
                      {preventivoCollegato.cliente} — {preventivoCollegato.data}
                    </p>
                    <p className="text-[13px] text-gray-500 mt-1 line-clamp-1">
                      {preventivoCollegato.oggetto}
                    </p>
                    <p className="text-[20px] font-bold text-[#64B445] mt-2">
                      € {Number(preventivoCollegato.totale).toLocaleString("it-IT", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={scollegaPreventivo}
                    className="border border-gray-300 text-[#2B2F5E] px-4 py-2 rounded-md text-sm bg-transparent hover:bg-[#e8e8e8] transition cursor-pointer"
                  >
                    Scollega
                  </button>
                </div>
              ) : (
                <p className="text-[13px] text-gray-400 text-center py-4">
                  Clicca "Collega preventivo" per associare un preventivo dall'archivio.
                </p>
              )}
            </div>
          </div>

          <div className="bg-white border border-gray-200 shadow-sm rounded-sm overflow-hidden mb-3">
            <div className="px-4 py-3 border-b border-gray-200 bg-[#FAFAFA]">
              <h3 className="text-[17px] font-normal text-[#2B2F5E]">
                Descrizione
              </h3>
            </div>

            <div className="p-4">
              <textarea
                value={commessa.descrizione || ""}
                onChange={(e) => aggiornaCampo("descrizione", e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-md px-4 py-3 bg-transparent outline-none transition focus:bg-white focus:border-[#64B445] focus:shadow-sm text-[14px] text-[#2B2F5E] resize-none"
              />
            </div>
          </div>

          <div className="bg-white border border-gray-200 shadow-sm rounded-sm overflow-hidden mb-3">
            <button
              type="button"
              onClick={() => setStoricoAperto((prev) => !prev)}
              className="w-full px-4 py-3 border-b border-gray-200 bg-[#FAFAFA] hover:bg-[#e8e8e8] transition cursor-pointer text-left flex justify-between items-center"
            >
              <div>
                <h3 className="text-[17px] font-normal text-[#2B2F5E]">
                  Aggiornamenti attività e note
                </h3>

                <p className="text-[15px] text-[#D79D06] mt-0">
                  {ultimaNota
                    ? `${formattaData(
                        ultimaNota.data_nota || ultimaNota.created_at
                      )} - ${ultimaNota.testo}`
                    : "Nessuna nota inserita"}
                </p>
              </div>

              <span>{storicoAperto ? "⌃" : "⌄"}</span>
            </button>

            <div className="p-4">
              {storicoAperto && (
                <div className="mb-4 space-y-3">
                  {note.map((nota) => (
                    <div
                      key={nota.id}
                      className="relative border border-gray-200 rounded-sm p-4 bg-[#FAFAFA]"
                    >
                      <button
                        type="button"
                        onClick={() => eliminaNota(nota.id)}
                        className="absolute top-3 right-3 text-red-500 hover:text-red-700 text-sm font-semibold transition cursor-pointer"
                        title="Elimina nota"
                      >
                        ×
                      </button>

                      <div className="flex items-center gap-2">
                        <input
                          type="date"
                          value={nota.data_nota || nota.created_at.slice(0, 10)}
                          onChange={(e) => {
                            const nuovaData = e.target.value;

                            setNote((correnti) =>
                              correnti.map((item) =>
                                item.id === nota.id ? { ...item, data_nota: nuovaData } : item
                              )
                            );
                          }}
                          onBlur={(e) => aggiornaDataNota(nota.id, e.target.value)}
                          className="w-[110px] border-0 bg-transparent p-0 text-[14px] text-[#D79D06] cursor-pointer focus:outline-none"
                        />

                        <p className="text-[14px] text-[#2B2F5E] whitespace-pre-line">
                          - {nota.testo}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <textarea
                value={nuovaNota}
                onChange={(e) => setNuovaNota(e.target.value)}
                rows={3}
                placeholder="Scrivi un aggiornamento..."
                className="w-full border border-gray-300 rounded-md px-4 py-3 bg-transparent outline-none transition focus:bg-white focus:border-[#64B445] focus:shadow-sm text-[14px] text-[#2B2F5E] resize-none"
              />

              <div className="flex justify-end mt-3">
                <button
                  type="button"
                  onClick={aggiungiNota}
                  disabled={!nuovaNota.trim()}
                  className="bg-[#64B445] text-white w-12 h-12 rounded-md text-2xl font-light hover:bg-[#5AA03E] hover:scale-105 transition flex items-center justify-center shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            <Card title="Dati generali">
              <Campo
                label="Titolo"
                value={commessa.titolo}
                onChange={(value) => aggiornaCampo("titolo", value)}
              />

              <Campo
                label="Codice"
                value={commessa.codice || ""}
                onChange={(value) => aggiornaCampo("codice", value)}
              />

              <div className="relative">
                <label className="block text-sm font-medium mb-2 text-[#2B2F5E]">
                  Committente
                </label>

                <input
                  type="text"
                  value={commessa.cliente_nome || ""}
                  onChange={(e) => {
                    aggiornaCampo("cliente_nome", e.target.value);
                    setClienteSelezionato(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Tab" && suggerimentiClienti.length > 0) {
                      e.preventDefault();
                      selezionaCliente(suggerimentiClienti[0]);
                    }
                  }}
                  className="w-full border border-gray-300 rounded-md px-4 py-3 bg-transparent outline-none transition focus:bg-white focus:border-[#64B445] focus:shadow-sm"
                  placeholder="Scrivi o seleziona un committente"
                />

                {suggerimentiClienti.length > 0 && !clienteSelezionato && (
                  <div className="absolute z-40 mt-1 w-full bg-white border border-gray-200 shadow-lg rounded-sm overflow-hidden">
                    {suggerimentiClienti.slice(0, 5).map((cliente) => (
                      <button
                        key={cliente.id}
                        type="button"
                        onClick={() => selezionaCliente(cliente)}
                        className="w-full text-left px-4 py-3 hover:bg-[#e8e8e8] transition cursor-pointer"
                      >
                        <p className="text-[14px] text-[#2B2F5E]">
                          {cliente.cliente}
                        </p>

                        <p className="text-[12px] text-gray-500">
                          {cliente.comune ||
                            cliente.piva ||
                            cliente.email ||
                            "Cliente in rubrica"}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <Campo
                label="Posizione"
                value={commessa.posizione || ""}
                onChange={(value) => aggiornaCampo("posizione", value)}
              />

              {(clienteSelezionato || commessa.cliente_id) && (
                <div className="md:col-span-2">
                  <button
                    type="button"
                    onClick={() => setSchedaClienteAperta((prev) => !prev)}
                    className="w-full bg-white border border-gray-200 shadow-sm rounded-sm px-4 py-3 text-left hover:bg-[#e8e8e8] transition cursor-pointer"
                  >
                    <p className="text-[11px] uppercase tracking-[0.12em] text-gray-400 font-medium">
                      Dati committente
                    </p>

                    <p className="text-[14px] text-[#2B2F5E] mt-1">
                      {schedaClienteAperta
                        ? "Nascondi dati della rubrica"
                        : "Clicca per visualizzare i dati della rubrica"}
                    </p>
                  </button>
                </div>
              )}

              {schedaClienteAperta && clienteSelezionato && (
                <div className="md:col-span-2 bg-[#FAFAFA] border border-gray-200 rounded-sm p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Info label="Cliente" value={clienteSelezionato.cliente} />
                  <Info
                    label="P. IVA / C.F."
                    value={clienteSelezionato.piva || "-"}
                  />
                  <Info
                    label="Indirizzo"
                    value={clienteSelezionato.indirizzo || "-"}
                  />
                  <Info label="Comune" value={clienteSelezionato.comune || "-"} />
                  <Info label="PEC" value={clienteSelezionato.pec || "-"} />
                  <Info label="Email" value={clienteSelezionato.email || "-"} />
                  <Info
                    label="Telefono"
                    value={clienteSelezionato.telefono || "-"}
                  />
                  <Info
                    label="Referente"
                    value={clienteSelezionato.referente || "-"}
                  />
                </div>
              )}

              <Campo
                label="Latitudine"
                type="number"
                value={String(commessa.latitudine || "")}
                onChange={(value) => aggiornaCampo("latitudine", value)}
              />

              <Campo
                label="Longitudine"
                type="number"
                value={String(commessa.longitudine || "")}
                onChange={(value) => aggiornaCampo("longitudine", value)}
              />
            </Card>

            <Card title="Classificazione">
              <SelectCampo
                label="Tipo commessa"
                value={commessa.tipo_commessa}
                options={TIPI_COMMESSA}
                onChange={(value) =>
                  aggiornaCampo("tipo_commessa", value as TipoCommessa)
                }
              />

              <SelectCampo
                label="Priorità"
                value={commessa.priorita}
                options={PRIORITA}
                onChange={(value) =>
                  aggiornaCampo("priorita", value as Priorita)
                }
              />

              {(commessa.tipo_commessa === "Gara" ||
                commessa.tipo_commessa === "Concorso") && (
                <div className="md:col-span-2">
                  <Campo
                    label="URL"
                    value={commessa.url || ""}
                    onChange={(value) => aggiornaCampo("url", value)}
                  />
                </div>
              )}

              <Campo
                label="Importo lavori"
                type="number"
                value={String(commessa.importo_lavori || "")}
                onChange={(value) => aggiornaCampo("importo_lavori", value)}
              />

              <Campo
                label="Importo commessa"
                type="number"
                value={String(commessa.importo_commessa || "")}
                onChange={(value) => aggiornaCampo("importo_commessa", value)}
              />

              <Campo
                label="Data inizio"
                type="date"
                value={commessa.data_inizio || ""}
                onChange={(value) => aggiornaCampo("data_inizio", value)}
              />

              <Campo
                label="Data fine"
                type="date"
                value={commessa.data_fine || ""}
                onChange={(value) => aggiornaCampo("data_fine", value)}
              />

            </Card>
          </div>
        </div>
      </div>

      {popupPreventivi && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-sm shadow-2xl w-full max-w-2xl p-8 max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-semibold text-[#2B2F5E]">Collega preventivo</h3>
                <p className="text-sm text-gray-500 mt-1">Seleziona un preventivo dall'archivio</p>
              </div>
              <button type="button" onClick={() => setPopupPreventivi(false)}
                className="text-2xl text-gray-400 hover:text-[#2B2F5E] cursor-pointer">×</button>
            </div>

            <div className="overflow-y-auto flex-1">
              {caricamentoPreventivi ? (
                <p className="text-center text-gray-500 py-10">Caricamento preventivi...</p>
              ) : elencoPreventivi.length === 0 ? (
                <p className="text-center text-gray-500 py-10">Nessun preventivo disponibile da collegare.</p>
              ) : (
                <div className="space-y-2">
                  {elencoPreventivi.map((preventivo) => (
                    <button key={preventivo.id} type="button"
                      onClick={() => collegaPreventivo(preventivo)}
                      className="w-full text-left border border-gray-200 rounded-sm p-4 hover:border-[#64B445] hover:bg-[#f6fbf4] transition cursor-pointer"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[15px] font-semibold text-[#2B2F5E]">
                            Preventivo n. {preventivo.numero}
                          </p>
                          <p className="text-[13px] text-[#D79D06] mt-0.5">
                            {preventivo.cliente} — {preventivo.data}
                          </p>
                          <p className="text-[13px] text-gray-500 mt-1 line-clamp-1">
                            {preventivo.oggetto}
                          </p>
                        </div>
                        <p className="text-[18px] font-bold text-[#64B445] whitespace-nowrap ml-4">
                          € {Number(preventivo.totale).toLocaleString("it-IT", { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </LayoutApp>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 shadow-sm rounded-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 bg-[#FAFAFA]">
        <h3 className="text-[17px] font-normal text-[#2B2F5E]">{title}</h3>
      </div>

      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {children}
      </div>
    </div>
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
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-md px-4 py-3 bg-transparent outline-none transition focus:bg-white focus:border-[#64B445] focus:shadow-sm"
      />
    </div>
  );
}

function SelectCampo({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2 text-[#2B2F5E]">
        {label}
      </label>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-md px-4 py-3 bg-transparent outline-none transition focus:bg-white focus:border-[#64B445] focus:shadow-sm cursor-pointer"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.12em] text-gray-400 font-medium">
        {label}
      </p>

      <p className="mt-0.5 text-[13px] text-[#2B2F5E] font-normal">
        {value || "-"}
      </p>
    </div>
  );
}