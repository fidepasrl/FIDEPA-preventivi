"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import LayoutApp from "@/components/LayoutApp";
import { supabase } from "@/lib/supabase";
import {
  DndContext,
  DragEndEvent,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";

import { CSS } from "@dnd-kit/utilities";

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
  tipo_commessa: TipoCommessa;
  priorita: Priorita;
  url: string | null;
  importo_lavori: number | null;
  importo_commessa: number | null;
  data_inizio: string | null;
  data_fine: string | null;
  ultimaNota?: string;
  dataUltimaNota?: string;
};

const PRIORITA: Priorita[] = [
  "Urgente",
  "Alta",
  "Normale",
  "Bassa",
  "Terminato",
];

const SIMBOLO_TIPO: Record<TipoCommessa, string> = {
  Pubblica: "■",
  Privata: "●",
  Gara: "▲",
  Concorso: "⚑",
};

const COLORE_TIPO: Record<TipoCommessa, string> = {
  Pubblica: "text-[#2D80B3]",
  Privata: "text-[#D49324]",
  Gara: "text-[#2B2F5E]",
  Concorso: "text-[#64B445]",
};

const STILE_PRIORITA: Record<Priorita, string> = {
  Urgente: "bg-[#d96f4b] text-[#F2F2F2]",
  Alta: "bg-[#d79d06] text-[#F2F2F2]",
  Normale: "bg-[#5e9ad3] text-[#F2F2F2]",
  Bassa: "bg-[#64b445] text-[#F2F2F2]",
  Terminato: "bg-[#BFE3C0] text-[#F2F2F2]",
};

const FORM_INIZIALE = {
  titolo: "",
  codice: "",
  descrizione: "",
  cliente_nome: "",
  posizione: "",
  latitudine: "",
  longitudine: "",
  tipo_commessa: "Privata" as TipoCommessa,
  priorita: "Normale" as Priorita,
  url: "",
  importo_lavori: "",
  importo_commessa: "",
};

export default function CommessePage() {
  const [commesse, setCommesse] = useState<Commessa[]>([]);
  const [clienti, setClienti] = useState<Cliente[]>([]);
  const [clienteSelezionato, setClienteSelezionato] =
    useState<Cliente | null>(null);

  const [caricamento, setCaricamento] = useState(true);
  const [modaleAperta, setModaleAperta] = useState(false);
  const [form, setForm] = useState(FORM_INIZIALE);

  const suggerimentiClienti = clienti.filter((cliente) => {
    if (!form.cliente_nome.trim()) return false;
    if (clienteSelezionato?.cliente === form.cliente_nome) return false;

    return cliente.cliente
      .toLowerCase()
      .includes(form.cliente_nome.toLowerCase());
  });

  useEffect(() => {
    caricaCommesse();
    caricaClienti();
  }, []);

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over) return;

    const commessaId = active.id as string;
    const nuovaPriorita = over.id as Priorita;

    const commessaTrascinata = commesse.find((c) => c.id === commessaId);

    if (!commessaTrascinata) return;
    if (commessaTrascinata.priorita === nuovaPriorita) return;

    setCommesse((correnti) =>
      correnti.map((commessa) =>
        commessa.id === commessaId
          ? { ...commessa, priorita: nuovaPriorita }
          : commessa
      )
    );

    const { error } = await supabase
      .from("commesse")
      .update({
        priorita: nuovaPriorita,
        data_fine:
          nuovaPriorita === "Terminato"
            ? new Date().toISOString().slice(0, 10)
            : commessaTrascinata.data_fine,
      })
      .eq("id", commessaId);

    if (error) {
      console.error("Errore aggiornamento priorità:", error);
      await caricaCommesse();
    }
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

  async function caricaCommesse() {
    setCaricamento(true);

    const { data, error } = await supabase
      .from("commesse")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !data) {
      console.error(error);
      setCommesse([]);
      setCaricamento(false);
      return;
    }

    const commesseConNote = await Promise.all(
      data.map(async (commessa) => {
        const { data: note } = await supabase
          .from("commesse_note")
          .select("testo,data_nota,created_at")
          .eq("commessa_id", commessa.id)
          .order("data_nota", { ascending: false })
          .limit(1);

        const ultimaNota = note?.[0];

        return {
          ...commessa,
          ultimaNota: ultimaNota?.testo || "",
          dataUltimaNota:
            ultimaNota?.data_nota || ultimaNota?.created_at || null,
        };
      })
    );

    setCommesse(commesseConNote);
    setCaricamento(false);
  }

  function aggiornaCampo(campo: keyof typeof FORM_INIZIALE, valore: string) {
    setForm((corrente) => ({
      ...corrente,
      [campo]: valore,
    }));
  }

  function selezionaCliente(cliente: Cliente) {
    setForm((corrente) => ({
      ...corrente,
      cliente_nome: cliente.cliente,
    }));

    setClienteSelezionato(cliente);
  }

  async function trovaOCreaCliente() {
    if (!form.cliente_nome.trim()) return null;

    const nomeCliente = form.cliente_nome.trim();

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
      .insert({
        cliente: nomeCliente,
      })
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

  async function creaCommessa() {
    if (!form.titolo.trim()) {
      alert("Inserisci almeno il titolo della commessa.");
      return;
    }

    const clienteFinale = await trovaOCreaCliente();

    const { data, error } = await supabase
      .from("commesse")
      .insert({
        titolo: form.titolo.trim(),
        codice: form.codice.trim() || null,
        descrizione: form.descrizione.trim() || null,
        cliente_id: clienteFinale?.id || null,
        cliente_nome:
          clienteFinale?.cliente || form.cliente_nome.trim() || null,
        posizione: form.posizione.trim() || null,
        latitudine: form.latitudine ? Number(form.latitudine) : null,
        longitudine: form.longitudine ? Number(form.longitudine) : null,
        tipo_commessa: form.tipo_commessa,
        priorita: form.priorita,
        url:
          form.tipo_commessa === "Gara" || form.tipo_commessa === "Concorso"
            ? form.url.trim() || null
            : null,
        importo_lavori: form.importo_lavori
          ? Number(form.importo_lavori)
          : 0,
        importo_commessa: form.importo_commessa
          ? Number(form.importo_commessa)
          : 0,
      })
      .select()
      .single();

    if (error) {
      console.error("Errore creazione commessa:", error);
      alert("Errore durante la creazione della commessa.");
      return;
    }

    if (data) {
      setCommesse((correnti) => [data, ...correnti]);
    }

    setForm(FORM_INIZIALE);
    setClienteSelezionato(null);
    setModaleAperta(false);
  }

  function apriNuovaCommessa() {
    setForm(FORM_INIZIALE);
    setClienteSelezionato(null);
    setModaleAperta(true);
  }

  return (
    <LayoutApp>
      <div>
        <div className="flex justify-between items-center gap-4 mb-6">
          <div>
            <h2 className="page-title">Commesse</h2>

            <p className="text-[15px] text-[#D79D06] mt-1">
              Gestione centrale dei lavori in corso e completati
            </p>
          </div>

          <button
            type="button"
            onClick={apriNuovaCommessa}
            className="bg-[#64B445] text-white w-12 h-12 rounded-md text-2xl font-light hover:bg-[#5AA03E] hover:scale-105 transition flex items-center justify-center shadow-sm cursor-pointer"
            title="Nuova commessa"
          >
            +
          </button>
        </div>

        {caricamento ? (
          <p className="text-center text-gray-500 py-10">
            Caricamento commesse...
          </p>
        ) : commesse.length === 0 ? (
          <p className="text-center text-gray-500 py-10">
            Nessuna commessa presente.
          </p>
        ) : (
          <DndContext onDragEnd={handleDragEnd}>
            <div className="space-y-8">
              {PRIORITA.map((priorita) => {
                const commessePriorita = commesse.filter(
                  (commessa) => commessa.priorita === priorita
                );

                if (commessePriorita.length === 0) return null;

                return (
                  <PrioritaDropArea key={priorita} priorita={priorita}>
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-3 py-1 rounded-sm text-sm font-medium ${STILE_PRIORITA[priorita]}`}
                      >
                        {priorita}
                      </span>

                      <span className="text-sm text-gray-400">
                        {commessePriorita.length}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                      {commessePriorita.map((commessa) => (
                        <CommessaDraggableCard
                          key={commessa.id}
                          commessa={commessa}
                        />
                      ))}
                    </div>
                  </PrioritaDropArea>
                );
              })}
            </div>
          </DndContext>
        )}
      </div>

      {modaleAperta && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-md shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto p-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-semibold text-[#2B2F5E]">
                  Nuova commessa
                </h3>

                <p className="text-sm text-gray-500 mt-1">
                  Crea una nuova scheda lavoro nel gestionale.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setModaleAperta(false)}
                className="text-2xl text-gray-400 hover:text-[#2B2F5E] cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Campo
                label="Titolo"
                value={form.titolo}
                onChange={(value) => aggiornaCampo("titolo", value)}
              />

              <Campo
                label="Codice"
                value={form.codice}
                onChange={(value) => aggiornaCampo("codice", value)}
              />

              <div className="relative">
                <label className="block text-sm font-medium mb-2 text-[#2B2F5E]">
                  Committente
                </label>

                <input
                  type="text"
                  value={form.cliente_nome}
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
                value={form.posizione}
                onChange={(value) => aggiornaCampo("posizione", value)}
              />

              <Campo
                label="Latitudine"
                type="number"
                value={form.latitudine}
                onChange={(value) => aggiornaCampo("latitudine", value)}
              />

              <Campo
                label="Longitudine"
                type="number"
                value={form.longitudine}
                onChange={(value) => aggiornaCampo("longitudine", value)}
              />

              <SelectCampo
                label="Tipo commessa"
                value={form.tipo_commessa}
                options={["Pubblica", "Privata", "Gara", "Concorso"]}
                onChange={(value) =>
                  aggiornaCampo("tipo_commessa", value as TipoCommessa)
                }
              />

              <SelectCampo
                label="Priorità"
                value={form.priorita}
                options={PRIORITA}
                onChange={(value) =>
                  aggiornaCampo("priorita", value as Priorita)
                }
              />

              {(form.tipo_commessa === "Gara" ||
                form.tipo_commessa === "Concorso") && (
                <div className="md:col-span-2">
                  <Campo
                    label="URL"
                    value={form.url}
                    onChange={(value) => aggiornaCampo("url", value)}
                  />
                </div>
              )}

              <Campo
                label="Importo lavori"
                type="number"
                value={form.importo_lavori}
                onChange={(value) => aggiornaCampo("importo_lavori", value)}
              />

              <Campo
                label="Importo commessa"
                type="number"
                value={form.importo_commessa}
                onChange={(value) => aggiornaCampo("importo_commessa", value)}
              />

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2 text-[#2B2F5E]">
                  Descrizione
                </label>

                <textarea
                  value={form.descrizione}
                  onChange={(e) =>
                    aggiornaCampo("descrizione", e.target.value)
                  }
                  rows={4}
                  className="w-full border border-gray-300 rounded-md px-4 py-3 bg-transparent outline-none transition focus:bg-white focus:border-[#64B445] focus:shadow-sm resize-none"
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
                onClick={creaCommessa}
                className="bg-[#64B445] text-white px-5 py-3 rounded-md text-sm font-medium hover:bg-[#5AA03E] transition cursor-pointer"
              >
                Crea commessa
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

function PrioritaDropArea({
  priorita,
  children,
}: {
  priorita: Priorita;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: priorita,
  });

  return (
    <section
      ref={setNodeRef}
      className={`space-y-3 rounded-sm transition ${
        isOver ? "bg-white/70 ring-2 ring-[#64B445] p-2" : ""
      }`}
    >
      {children}
    </section>
  );
}

function CommessaDraggableCard({ commessa }: { commessa: Commessa }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: commessa.id,
    });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white border border-gray-200 shadow-sm rounded-sm overflow-hidden transition ${
        isDragging ? "opacity-60 shadow-xl" : "hover:bg-[#e8e8e8]"
      }`}
    >
      <div className="px-4 py-3 flex justify-between items-start gap-4">
        <button
          type="button"
          {...listeners}
          {...attributes}
          className="text-gray-400 hover:text-[#2B2F5E] cursor-grab active:cursor-grabbing pt-1"
          title="Trascina commessa"
        >
          ☰
        </button>

        <Link
          href={`/commesse/${commessa.id}`}
          className="flex-1 leading-tight"
        >
          <h3 className="text-[17px] font-normal text-[#2B2F5E]">
            <span className={`mr-2 ${COLORE_TIPO[commessa.tipo_commessa]}`}>
              {SIMBOLO_TIPO[commessa.tipo_commessa]}
            </span>

            {commessa.codice
              ? `${commessa.codice} | ${commessa.titolo}`
              : commessa.titolo}
          </h3>

          <p className="text-[15px] text-[#D79D06] mt-0">
            {commessa.posizione ||
              commessa.cliente_nome ||
              "Posizione non indicata"}
          </p>

          {commessa.ultimaNota && (
            <p className="text-[13px] text-gray-500 mt-2 line-clamp-1">
              {commessa.dataUltimaNota
                ? `${new Date(commessa.dataUltimaNota).toLocaleDateString(
                    "it-IT"
                  )} - `
                : ""}
              {commessa.ultimaNota}
            </p>
          )}
        </Link>

        <Link href={`/commesse/${commessa.id}`} className="text-gray-400">
          ›
        </Link>
      </div>
    </div>
  );
}