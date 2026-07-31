"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import LayoutApp from "@/components/LayoutApp";
import AppIcon from "@/components/AppIcon";
import CommesseFilters from "@/components/commesse/CommesseFilters";
import CommesseTable from "@/components/commesse/CommesseTable";
import {
  EmptyState,
  LoadingSkeleton,
  PageHeader,
  Toast,
  inputClass,
  primaryButton,
  secondaryButton,
} from "@/components/rappresentanti/Common";
import { supabase } from "@/lib/supabase";
import {
  FILTRI_COMMESSE_INIZIALI,
  PRIORITA_COMMESSA,
  creaCsvCommesse,
  filtraCommesse,
  leggiCsvCommesse,
  ordinaCommesse,
  type CommessaElenco,
  type FiltriCommesse,
  type OrdinamentoCommesse,
  type PrioritaCommessa,
} from "@/lib/commesse/lista";
import {
  COLORE_TIPO_COMMESSA,
  SIMBOLO_TIPO_COMMESSA,
  TIPI_COMMESSA,
  type TipoCommessa,
} from "@/lib/tipiCommesse";
import {
  DndContext,
  DragEndEvent,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";

import { CSS } from "@dnd-kit/utilities";

type Priorita = PrioritaCommessa;

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

type Professionista = {
  id: string;
  nome: string | null;
  cognome: string | null;
  professione: string | null;
};

type Commessa = CommessaElenco;

const PRIORITA: readonly Priorita[] = PRIORITA_COMMESSA;

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
};

function getNomeProfessionista(professionista: Professionista) {
  return `${professionista.nome || ""} ${professionista.cognome || ""}`.trim();
}

function getTestoRicercaProfessionista(professionista: Professionista) {
  const cognomeNome = `${professionista.cognome || ""} ${
    professionista.nome || ""
  }`.trim();

  return `${getNomeProfessionista(professionista)} ${cognomeNome} ${
    professionista.professione || ""
  }`.toLowerCase();
}

function creaProfessionistaDaNome(
  nomeCompleto: string
): Pick<Professionista, "nome" | "cognome" | "professione"> {
  const parti = nomeCompleto.split(/\s+/).filter(Boolean);

  if (parti.length === 1) {
    return {
      nome: parti[0],
      cognome: null,
      professione: null,
    };
  }

  return {
    nome: parti.slice(0, -1).join(" "),
    cognome: parti[parti.length - 1],
    professione: null,
  };
}

function ordinaProfessionisti(a: Professionista, b: Professionista) {
  return getNomeProfessionista(a).localeCompare(getNomeProfessionista(b), "it", {
    sensitivity: "base",
  });
}

export default function CommessePage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [commesse, setCommesse] = useState<Commessa[]>([]);
  const [clienti, setClienti] = useState<Cliente[]>([]);
  const [professionisti, setProfessionisti] = useState<Professionista[]>([]);
  const [collaboratoriSelezionati, setCollaboratoriSelezionati] = useState<
    Professionista[]
  >([]);
  const [ricercaCollaboratore, setRicercaCollaboratore] = useState("");
  const [clienteSelezionato, setClienteSelezionato] =
    useState<Cliente | null>(null);

  const [caricamento, setCaricamento] = useState(true);
  const [modaleAperta, setModaleAperta] = useState(false);
  const [form, setForm] = useState(FORM_INIZIALE);
  const [ricerca, setRicerca] = useState("");
  const [filtri, setFiltri] = useState<FiltriCommesse>(
    FILTRI_COMMESSE_INIZIALI
  );
  const [filtriAperti, setFiltriAperti] = useState(false);
  const [vista, setVista] = useState<"table" | "cards">("table");
  const [ordine, setOrdine] = useState<OrdinamentoCommesse>("priorita");
  const [pagina, setPagina] = useState(1);
  const [righePerPagina, setRighePerPagina] = useState(20);
  const [toast, setToast] = useState<{
    message: string;
    error?: boolean;
  } | null>(null);

  const suggerimentiClienti = clienti.filter((cliente) => {
    if (!form.cliente_nome.trim()) return false;
    if (clienteSelezionato?.cliente === form.cliente_nome) return false;

    return cliente.cliente
      .toLowerCase()
      .includes(form.cliente_nome.toLowerCase());
  });

  const collaboratoriSelezionatiIds = new Set(
    collaboratoriSelezionati.map((collaboratore) => collaboratore.id)
  );
  const testoCollaboratore = ricercaCollaboratore.trim().toLowerCase();
  const suggerimentiProfessionisti = professionisti
    .filter(
      (professionista) => !collaboratoriSelezionatiIds.has(professionista.id)
    )
    .filter((professionista) =>
      testoCollaboratore
        ? getTestoRicercaProfessionista(professionista).includes(
            testoCollaboratore
          )
        : false
    )
    .slice(0, 5);
  const professionistaGiaEsistente = professionisti.some(
    (professionista) =>
      getNomeProfessionista(professionista).toLowerCase() ===
        testoCollaboratore ||
      `${professionista.cognome || ""} ${professionista.nome || ""}`
        .trim()
        .toLowerCase() === testoCollaboratore
  );
  const mostraAggiungiRubrica =
    ricercaCollaboratore.trim().length > 0 && !professionistaGiaEsistente;

  const commesseFiltrate = useMemo(
    () => ordinaCommesse(filtraCommesse(commesse, ricerca, filtri), ordine),
    [commesse, ricerca, filtri, ordine]
  );
  const numeroPagine = Math.max(
    1,
    Math.ceil(commesseFiltrate.length / righePerPagina)
  );
  const paginaVisualizzata = Math.min(pagina, numeroPagine);
  const commessePagina = commesseFiltrate.slice(
    (paginaVisualizzata - 1) * righePerPagina,
    paginaVisualizzata * righePerPagina
  );
  const posizioni = useMemo(
    () =>
      Array.from(
        new Set(
          commesse
            .map((commessa) => commessa.posizione?.trim())
            .filter((item): item is string => Boolean(item))
        )
      ).sort((a, b) => a.localeCompare(b, "it", { sensitivity: "base" })),
    [commesse]
  );
  const clientiCommesse = useMemo(
    () =>
      Array.from(
        new Set(
          commesse
            .map((commessa) => commessa.cliente_nome?.trim())
            .filter((item): item is string => Boolean(item))
        )
      ).sort((a, b) => a.localeCompare(b, "it", { sensitivity: "base" })),
    [commesse]
  );

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

  async function aggiornaPrioritaDaElenco(
    commessaDaAggiornare: Commessa,
    nuovaPriorita: Priorita
  ) {
    if (commessaDaAggiornare.priorita === nuovaPriorita) return;

    setCommesse((correnti) =>
      correnti.map((commessa) =>
        commessa.id === commessaDaAggiornare.id
          ? {
              ...commessa,
              priorita: nuovaPriorita,
              data_fine:
                nuovaPriorita === "Terminato"
                  ? new Date().toISOString().slice(0, 10)
                  : commessa.data_fine,
            }
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
            : commessaDaAggiornare.data_fine,
      })
      .eq("id", commessaDaAggiornare.id);

    if (error) {
      setToast({
        message: "Non è stato possibile aggiornare la priorità.",
        error: true,
      });
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

  async function caricaProfessionisti() {
    const { data, error } = await supabase
      .from("professionisti")
      .select("id, nome, cognome, professione")
      .order("cognome", { ascending: true })
      .order("nome", { ascending: true });

    if (error) {
      console.error("Errore caricamento professionisti:", error);
      setProfessionisti([]);
      return;
    }

    setProfessionisti((data || []) as Professionista[]);
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

  useEffect(() => {
    async function caricaDatiIniziali() {
      await Promise.all([
        caricaCommesse(),
        caricaClienti(),
        caricaProfessionisti(),
      ]);
    }

    void caricaDatiIniziali();
  }, []);

  useEffect(() => {
    // Ogni modifica dei criteri riporta l'elenco alla prima pagina.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPagina(1);
  }, [ricerca, filtri, ordine, righePerPagina]);

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

  function aggiungiCollaboratore(professionista: Professionista) {
    if (collaboratoriSelezionatiIds.has(professionista.id)) return;

    setCollaboratoriSelezionati((correnti) => [
      ...correnti,
      professionista,
    ]);
    setRicercaCollaboratore("");
  }

  function rimuoviCollaboratore(professionistaId: string) {
    setCollaboratoriSelezionati((correnti) =>
      correnti.filter((professionista) => professionista.id !== professionistaId)
    );
  }

  async function aggiungiProfessionistaAllaRubrica() {
    const nomeCompleto = ricercaCollaboratore.trim();
    if (!nomeCompleto) return;

    const payload = creaProfessionistaDaNome(nomeCompleto);
    const { data, error } = await supabase
      .from("professionisti")
      .insert(payload)
      .select("id, nome, cognome, professione")
      .single();

    if (error) {
      alert("Errore durante l'aggiunta del professionista alla rubrica.");
      console.error("Errore creazione professionista:", error);
      return;
    }

    const nuovoProfessionista = data as Professionista;
    setProfessionisti((correnti) =>
      [...correnti, nuovoProfessionista].sort(ordinaProfessionisti)
    );
    aggiungiCollaboratore(nuovoProfessionista);
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
      })
      .select()
      .single();

    if (error) {
      console.error("Errore creazione commessa:", error);
      alert("Errore durante la creazione della commessa.");
      return;
    }

    if (data && collaboratoriSelezionati.length > 0) {
      const { error: collaboratoriError } = await supabase
        .from("commesse_collaboratori")
        .insert(
          collaboratoriSelezionati.map((collaboratore) => ({
            commessa_id: data.id,
            professionista_id: collaboratore.id,
          }))
        );

      if (collaboratoriError) {
        console.error(
          "Errore collegamento collaboratori alla commessa:",
          collaboratoriError
        );
        alert(
          "La commessa è stata creata, ma non è stato possibile collegare i collaboratori."
        );
      }
    }

    if (data) {
      setCommesse((correnti) => [data, ...correnti]);
    }

    setForm(FORM_INIZIALE);
    setClienteSelezionato(null);
    setCollaboratoriSelezionati([]);
    setRicercaCollaboratore("");
    setModaleAperta(false);
  }

  function apriNuovaCommessa() {
    setForm(FORM_INIZIALE);
    setClienteSelezionato(null);
    setCollaboratoriSelezionati([]);
    setRicercaCollaboratore("");
    setModaleAperta(true);
  }

  function esportaCsv() {
    const blob = new Blob([creaCsvCommesse(commesseFiltrate)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `commesse-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importaCsv(file: File) {
    try {
      const righe = leggiCsvCommesse(await file.text());
      if (!righe.length) throw new Error("Il file non contiene righe importabili.");

      const codiciEsistenti = new Set(
        commesse
          .map((commessa) => commessa.codice?.trim().toLocaleLowerCase("it-IT"))
          .filter(Boolean)
      );
      let create = 0;
      let ignorate = 0;

      for (const riga of righe) {
        const codiceNormalizzato = riga.codice.trim().toLocaleLowerCase("it-IT");
        if (!riga.titolo.trim() || (codiceNormalizzato && codiciEsistenti.has(codiceNormalizzato))) {
          ignorate += 1;
          continue;
        }
        const tipo = TIPI_COMMESSA.includes(riga.tipo_commessa as TipoCommessa)
          ? (riga.tipo_commessa as TipoCommessa)
          : "Privata";
        const priorita = PRIORITA.includes(riga.priorita as Priorita)
          ? (riga.priorita as Priorita)
          : "Normale";
        const { error } = await supabase.from("commesse").insert({
          titolo: riga.titolo.trim(),
          codice: riga.codice.trim() || null,
          cliente_nome: riga.cliente_nome.trim() || null,
          posizione: riga.posizione.trim() || null,
          tipo_commessa: tipo,
          priorita,
          data_inizio: riga.data_inizio.trim() || null,
          data_fine: riga.data_fine.trim() || null,
          descrizione: riga.descrizione.trim() || null,
        });
        if (error) {
          ignorate += 1;
        } else {
          create += 1;
          if (codiceNormalizzato) codiciEsistenti.add(codiceNormalizzato);
        }
      }

      await caricaCommesse();
      setToast({
        message: `Importazione completata: ${create} create, ${ignorate} ignorate.`,
      });
    } catch (error) {
      setToast({
        message:
          error instanceof Error ? error.message : "Importazione non riuscita.",
        error: true,
      });
    }
  }

  async function eliminaCommessa(commessa: Commessa) {
    const conferma = window.confirm(
      `Eliminare definitivamente la commessa "${commessa.titolo}"?`
    );

    if (!conferma) return;

    const { error } = await supabase
      .from("commesse")
      .delete()
      .eq("id", commessa.id);

    if (error) {
      alert(`Errore durante l'eliminazione della commessa: ${error.message}`);
      return;
    }

    setCommesse((correnti) =>
      correnti.filter((item) => item.id !== commessa.id)
    );
  }

  return (
    <LayoutApp>
      <PageHeader
        title="Commesse"
        subtitle="Gestione centrale dei lavori in corso e completati."
        actions={
          <button type="button" onClick={apriNuovaCommessa} className={primaryButton}>
            <AppIcon name="plus" size={16} />
            Nuova commessa
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[280px] flex-[1_1_360px]">
          <AppIcon name="search" size={17} className="pointer-events-none absolute left-3.5 top-3.5 text-[#2B2F5E]/40" />
          <input
            className={`${inputClass} pl-10`}
            value={ricerca}
            onChange={(event) => setRicerca(event.target.value)}
            placeholder="Cerca codice, titolo, cliente, posizione, tipologia o aggiornamento..."
            aria-label="Cerca commesse"
          />
        </div>
        <button type="button" className={`${secondaryButton} shrink-0`} onClick={() => setFiltriAperti((aperti) => !aperti)}>
          Filtri
          {Object.entries(filtri).some(([chiave, valore]) => valore && !(chiave === "stato" && valore === "tutte")) && (
            <span className="h-2 w-2 rounded-full bg-[#D79D06]" aria-label="Filtri attivi" />
          )}
        </button>
        <div className="w-56 shrink-0">
          <select className={inputClass} value={ordine} onChange={(event) => setOrdine(event.target.value as OrdinamentoCommesse)} aria-label="Ordinamento commesse">
            <option value="priorita">Priorità</option>
            <option value="titolo">Titolo A-Z</option>
            <option value="codice">Codice</option>
            <option value="posizione">Posizione</option>
            <option value="tipo">Tipologia</option>
            <option value="ultimo_aggiornamento">Ultimo aggiornamento</option>
          </select>
        </div>
        <div className="flex shrink-0 rounded-xl border border-[#2B2F5E]/15 bg-white p-1">
          <button type="button" title="Vista tabellare" onClick={() => setVista("table")} className={`rounded-lg px-3 py-2 text-xs font-semibold ${vista === "table" ? "bg-[#2B2F5E] text-white" : "text-[#2B2F5E]"}`}>
            Tabella
          </button>
          <button type="button" title="Vista a schede" onClick={() => setVista("cards")} className={`rounded-lg px-3 py-2 text-xs font-semibold ${vista === "cards" ? "bg-[#2B2F5E] text-white" : "text-[#2B2F5E]"}`}>
            Schede
          </button>
        </div>
        <button type="button" className={`${secondaryButton} shrink-0`} onClick={esportaCsv} disabled={!commesseFiltrate.length}>
          <AppIcon name="download" size={15} />
          Esporta CSV
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void importaCsv(file);
            event.target.value = "";
          }}
        />
        <button type="button" className={`${secondaryButton} shrink-0`} onClick={() => fileRef.current?.click()}>
          Importa CSV
        </button>
      </div>

      {filtriAperti && (
        <div className="mb-4">
          <CommesseFilters filtri={filtri} posizioni={posizioni} clienti={clientiCommesse} onChange={setFiltri} />
        </div>
      )}

      <div className="mb-3 flex items-center justify-between text-xs text-[#2B2F5E]/55">
        <span>{commesseFiltrate.length} commesse</span>
        {commesseFiltrate.length !== commesse.length && <span>{commesse.length} totali</span>}
      </div>

      {caricamento ? (
        <LoadingSkeleton rows={5} />
      ) : commesseFiltrate.length === 0 ? (
        <EmptyState
          title={commesse.length ? "Nessuna commessa corrisponde alla ricerca o ai filtri." : "Non sono ancora presenti commesse."}
          actionLabel={!commesse.length ? "Aggiungi la prima commessa" : undefined}
          onAction={!commesse.length ? apriNuovaCommessa : undefined}
        />
      ) : vista === "table" ? (
        <CommesseTable commesse={commessePagina} ordine={ordine} onPriorityChange={(commessa, priorita) => void aggiornaPrioritaDaElenco(commessa, priorita)} onDelete={eliminaCommessa} />
      ) : ordine === "priorita" ? (
        <DndContext onDragEnd={handleDragEnd}>
          <div className="space-y-7">
            {PRIORITA.map((priorita) => {
              const delGruppo = commessePagina.filter((commessa) => commessa.priorita === priorita);
              if (!delGruppo.length) return null;
              return (
                <PrioritaDropArea key={priorita} priorita={priorita}>
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STILE_PRIORITA[priorita]}`}>{priorita}</span>
                    <span className="text-xs text-[#2B2F5E]/40">{delGruppo.length}</span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                    {delGruppo.map((commessa) => <CommessaDraggableCard key={commessa.id} commessa={commessa} onDelete={eliminaCommessa} />)}
                  </div>
                </PrioritaDropArea>
              );
            })}
          </div>
        </DndContext>
      ) : (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {commessePagina.map((commessa) => (
            <CommessaCard key={commessa.id} commessa={commessa} onDelete={eliminaCommessa} onPriorityChange={(priorita) => void aggiornaPrioritaDaElenco(commessa, priorita)} />
          ))}
        </div>
      )}

      {!caricamento && commesseFiltrate.length > 0 && (
        <div className="mt-4 flex flex-col items-center justify-between gap-3 rounded-xl bg-white p-3 sm:flex-row">
          <label className="flex items-center gap-2 text-xs text-[#2B2F5E]/55">
            Righe per pagina
            <select value={righePerPagina} onChange={(event) => setRighePerPagina(Number(event.target.value))} className="rounded-lg border border-[#2B2F5E]/15 px-2 py-1.5 text-[#2B2F5E]">
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </label>
          <div className="flex items-center gap-2">
            <button type="button" disabled={paginaVisualizzata <= 1} onClick={() => setPagina((corrente) => Math.max(1, corrente - 1))} className={`${secondaryButton} min-h-9 py-1.5`}>Precedente</button>
            <span className="px-2 text-xs text-[#2B2F5E]">Pagina {paginaVisualizzata} di {numeroPagine}</span>
            <button type="button" disabled={paginaVisualizzata >= numeroPagine} onClick={() => setPagina((corrente) => Math.min(numeroPagine, corrente + 1))} className={`${secondaryButton} min-h-9 py-1.5`}>Successiva</button>
          </div>
        </div>
      )}

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
                options={TIPI_COMMESSA}
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

              <div className="md:col-span-2 rounded-md border border-gray-200 bg-[#FAFAFA] p-4">
                <h4 className="text-[15px] font-semibold text-[#2B2F5E]">
                  Collaboratori
                </h4>

                <div className="mt-4 space-y-2">
                  {collaboratoriSelezionati.length === 0 ? (
                    <p className="text-[13px] text-gray-400">
                      Nessun collaboratore selezionato.
                    </p>
                  ) : (
                    collaboratoriSelezionati.map((collaboratore) => (
                      <div
                        key={collaboratore.id}
                        className="flex items-center justify-between gap-3 rounded-md border border-gray-200 bg-white px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-semibold text-[#2B2F5E]">
                            {getNomeProfessionista(collaboratore)}
                          </p>
                          <p className="truncate text-[12px] text-[#D79D06]">
                            {collaboratore.professione ||
                              "Professione non indicata"}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => rimuoviCollaboratore(collaboratore.id)}
                          className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-red-500 hover:bg-red-50 hover:text-red-700"
                          title="Rimuovi collaboratore"
                          aria-label="Rimuovi collaboratore"
                        >
                          <AppIcon name="x" size={16} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <div className="relative mt-4">
                  <input
                    type="text"
                    value={ricercaCollaboratore}
                    onChange={(event) =>
                      setRicercaCollaboratore(event.target.value)
                    }
                    placeholder="Scrivi il nome del professionista"
                    className="w-full border border-gray-300 rounded-md px-4 py-3 bg-white outline-none transition focus:border-[#64B445] focus:shadow-sm"
                  />

                  {testoCollaboratore &&
                    suggerimentiProfessionisti.length > 0 && (
                      <div className="absolute z-40 mt-1 w-full overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
                        {suggerimentiProfessionisti.map((professionista) => (
                          <button
                            key={professionista.id}
                            type="button"
                            onClick={() =>
                              aggiungiCollaboratore(professionista)
                            }
                            className="w-full cursor-pointer px-4 py-3 text-left transition hover:bg-[#e8e8e8]"
                          >
                            <p className="text-[14px] font-semibold text-[#2B2F5E]">
                              {getNomeProfessionista(professionista)}
                            </p>
                            <p className="text-[12px] text-[#D79D06]">
                              {professionista.professione ||
                                "Professione non indicata"}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                </div>

                {mostraAggiungiRubrica && (
                  <button
                    type="button"
                    onClick={aggiungiProfessionistaAllaRubrica}
                    className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-md bg-[#64B445] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#5AA03E]"
                  >
                    <AppIcon name="plus" size={16} />
                    Aggiungi alla rubrica
                  </button>
                )}
              </div>

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
      {toast && (
        <Toast
          message={toast.message}
          error={toast.error}
          onClose={() => setToast(null)}
        />
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
  options: readonly string[];
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

function CommessaCard({
  commessa,
  onDelete,
  onPriorityChange,
}: {
  commessa: Commessa;
  onDelete: (commessa: Commessa) => void;
  onPriorityChange: (priorita: Priorita) => void;
}) {
  return (
    <article className="rounded-2xl border border-[#2B2F5E]/8 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <Link href={`/commesse/${commessa.id}`} className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={COLORE_TIPO_COMMESSA[commessa.tipo_commessa]} aria-hidden="true">
              {SIMBOLO_TIPO_COMMESSA[commessa.tipo_commessa]}
            </span>
            <h3 className="truncate text-[16px] font-semibold text-[#2B2F5E]">
              {commessa.codice ? `${commessa.codice} | ${commessa.titolo}` : commessa.titolo}
            </h3>
          </div>
          <p className="mt-1 truncate text-sm text-[#D79D06]">
            {commessa.posizione || commessa.cliente_nome || "Posizione non indicata"}
          </p>
          {commessa.cliente_nome && commessa.posizione && (
            <p className="mt-1 truncate text-xs text-[#2B2F5E]/50">{commessa.cliente_nome}</p>
          )}
          {commessa.ultimaNota && (
            <p className="mt-3 line-clamp-2 text-xs leading-5 text-[#2B2F5E]/55">
              {commessa.dataUltimaNota ? `${new Date(commessa.dataUltimaNota).toLocaleDateString("it-IT")} · ` : ""}
              {commessa.ultimaNota}
            </p>
          )}
        </Link>
        <div className="flex shrink-0 gap-1">
          <Link href={`/commesse/${commessa.id}`} className="flex h-9 w-9 items-center justify-center rounded-lg text-[#2D80B3] hover:bg-[#5E9AD3]/10" title="Visualizza commessa" aria-label="Visualizza commessa">
            <AppIcon name="eye" size={17} />
          </Link>
          <button type="button" onClick={() => onDelete(commessa)} className="flex h-9 w-9 items-center justify-center rounded-lg text-red-500 hover:bg-red-50" title="Elimina commessa" aria-label="Elimina commessa">
            <AppIcon name="trash" size={16} />
          </button>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#2B2F5E]/8 pt-3">
        <span className="rounded-full bg-[#F6F7FA] px-2.5 py-1 text-xs text-[#2B2F5E]/65">{commessa.tipo_commessa}</span>
        <select value={commessa.priorita} onChange={(event) => onPriorityChange(event.target.value as Priorita)} className={`rounded-full border-0 px-2.5 py-1 text-xs font-semibold outline-none ${STILE_PRIORITA[commessa.priorita]}`} aria-label={`Priorità di ${commessa.titolo}`}>
          {PRIORITA.map((priorita) => <option key={priorita}>{priorita}</option>)}
        </select>
      </div>
    </article>
  );
}

function CommessaDraggableCard({
  commessa,
  onDelete,
}: {
  commessa: Commessa;
  onDelete: (commessa: Commessa) => void;
}) {
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
            <span
              className={`mr-2 ${COLORE_TIPO_COMMESSA[commessa.tipo_commessa]}`}
            >
              {SIMBOLO_TIPO_COMMESSA[commessa.tipo_commessa]}
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

        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onDelete(commessa);
          }}
          className="h-9 w-9 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-700 flex items-center justify-center cursor-pointer"
          title="Elimina commessa"
          aria-label="Elimina commessa"
        >
          <AppIcon name="trash" size={16} />
        </button>

        <Link href={`/commesse/${commessa.id}`} className="text-gray-400">
          ›
        </Link>
      </div>
    </div>
  );
}
