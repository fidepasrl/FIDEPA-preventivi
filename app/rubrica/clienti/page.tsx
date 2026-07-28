"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AppIcon from "@/components/AppIcon";
import ClientCard from "@/components/clienti/ClientCard";
import ClientDetailsModal from "@/components/clienti/ClientDetailsModal";
import ClientFormModal from "@/components/clienti/ClientFormModal";
import ClientsFilters from "@/components/clienti/ClientsFilters";
import ClientsTable, {
  type ClientAction,
} from "@/components/clienti/ClientsTable";
import LayoutApp from "@/components/LayoutApp";
import {
  EmptyState,
  LoadingSkeleton,
  Modal,
  PageHeader,
  Toast,
  inputClass,
  primaryButton,
  secondaryButton,
} from "@/components/rappresentanti/Common";
import type {
  Cliente,
  ClienteForm,
  FiltriClienti,
  OrdinamentoClienti,
} from "@/lib/clienti/types";
import {
  CLIENTE_FORM_VUOTO,
  FILTRI_CLIENTI_INIZIALI,
} from "@/lib/clienti/types";
import {
  chiaveCliente,
  clienteToForm,
  esportaClientiCsv,
  filtraClienti,
  leggiCsvClienti,
  ordinaClienti,
} from "@/lib/clienti/utils";
import { supabase } from "@/lib/supabase";

const CAMPI_CLIENTE = [
  "id",
  "tipo_cliente",
  "cliente",
  "piva",
  "codice_fiscale",
  "forma_giuridica",
  "rea",
  "indirizzo",
  "comune",
  "cap",
  "provincia",
  "nazione",
  "codice_sdi",
  "sito_web",
  "pec",
  "email",
  "telefono",
  "referente",
  "referente_qualifica",
  "referente_codice_fiscale",
  "referente_data_nascita",
  "referente_luogo_nascita",
  "referente_residenza",
  "referente_email",
  "referente_telefono",
  "created_at",
].join(", ");

type FormAperto = {
  id: string | null;
  title: string;
  initialValue: ClienteForm;
};

function payloadCliente(form: ClienteForm) {
  const payload = Object.fromEntries(
    Object.entries(form).map(([key, value]) => [key, value.trim() || null])
  );
  if (form.tipo_cliente === "persona_fisica") {
    [
      "codice_fiscale",
      "forma_giuridica",
      "rea",
      "cap",
      "provincia",
      "nazione",
      "codice_sdi",
      "sito_web",
      "referente_qualifica",
      "referente_codice_fiscale",
      "referente_data_nascita",
      "referente_luogo_nascita",
      "referente_residenza",
      "referente_email",
      "referente_telefono",
    ].forEach((campo) => {
      payload[campo] = null;
    });
  }
  return payload;
}

function comuniDistinti(clienti: Cliente[]) {
  return Array.from(
    new Set(
      clienti
        .map((item) => item.comune?.trim())
        .filter((value): value is string => Boolean(value))
    )
  ).sort((a, b) => a.localeCompare(b, "it", { sensitivity: "base" }));
}

export default function RubricaClientiPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [clienti, setClienti] = useState<Cliente[]>([]);
  const [caricamento, setCaricamento] = useState(true);
  const [ricerca, setRicerca] = useState("");
  const [filtri, setFiltri] = useState<FiltriClienti>(
    FILTRI_CLIENTI_INIZIALI
  );
  const [filtriAperti, setFiltriAperti] = useState(false);
  const [vista, setVista] = useState<"table" | "cards">("table");
  const [ordine, setOrdine] =
    useState<OrdinamentoClienti>("cliente_asc");
  const [pagina, setPagina] = useState(1);
  const [righePerPagina, setRighePerPagina] = useState(20);
  const [formAperto, setFormAperto] = useState<FormAperto | null>(null);
  const [dettaglio, setDettaglio] = useState<Cliente | null>(null);
  const [daEliminare, setDaEliminare] = useState<Cliente | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    error?: boolean;
  } | null>(null);

  const caricaClienti = useCallback(async () => {
    setCaricamento(true);
    const { data, error } = await supabase
      .from("clienti")
      .select(CAMPI_CLIENTE)
      .order("cliente", { ascending: true });

    if (error) {
      setClienti([]);
      setToast({
        message: `Caricamento clienti non riuscito: ${error.message}`,
        error: true,
      });
    } else {
      setClienti((data || []) as unknown as Cliente[]);
    }
    setCaricamento(false);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void caricaClienti();
      const salvati = localStorage.getItem("rubrica-clienti-filtri");
      if (salvati) {
        try {
          setFiltri({
            ...FILTRI_CLIENTI_INIZIALI,
            ...(JSON.parse(salvati) as Partial<FiltriClienti>),
          });
        } catch {
          localStorage.removeItem("rubrica-clienti-filtri");
        }
      }
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [caricaClienti]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setPagina(1), 0);
    return () => window.clearTimeout(timeoutId);
  }, [ricerca, filtri, ordine, righePerPagina]);

  const filtrati = useMemo(
    () => ordinaClienti(filtraClienti(clienti, ricerca, filtri), ordine),
    [clienti, filtri, ordine, ricerca]
  );
  const totalePagine = Math.max(
    1,
    Math.ceil(filtrati.length / righePerPagina)
  );
  const paginaCorrente = Math.min(pagina, totalePagine);
  const paginati = filtrati.slice(
    (paginaCorrente - 1) * righePerPagina,
    paginaCorrente * righePerPagina
  );
  const comuni = useMemo(() => comuniDistinti(clienti), [clienti]);

  function apriNuovo() {
    setFormAperto({
      id: null,
      title: "Nuovo cliente",
      initialValue: { ...CLIENTE_FORM_VUOTO },
    });
  }

  function apriModifica(item: Cliente) {
    setDettaglio(null);
    setFormAperto({
      id: item.id,
      title: "Modifica cliente",
      initialValue: clienteToForm(item),
    });
  }

  function eseguiAzione(action: ClientAction, item: Cliente) {
    if (action === "view") setDettaglio(item);
    if (action === "edit") apriModifica(item);
    if (action === "delete") setDaEliminare(item);
    if (action === "duplicate") {
      setFormAperto({
        id: null,
        title: "Duplica cliente",
        initialValue: clienteToForm(item),
      });
    }
  }

  async function salvaCliente(value: ClienteForm) {
    if (!formAperto) return;
    const richiesta = formAperto.id
      ? supabase
          .from("clienti")
          .update(payloadCliente(value))
          .eq("id", formAperto.id)
      : supabase.from("clienti").insert(payloadCliente(value));
    const { error } = await richiesta;
    if (error) throw new Error(error.message);
    const modifica = Boolean(formAperto.id);
    setFormAperto(null);
    await caricaClienti();
    setToast({ message: modifica ? "Cliente aggiornato." : "Cliente aggiunto." });
  }

  async function eliminaCliente() {
    if (!daEliminare) return;
    const { error } = await supabase
      .from("clienti")
      .delete()
      .eq("id", daEliminare.id);
    if (error) {
      setToast({ message: error.message, error: true });
      return;
    }
    setDaEliminare(null);
    setDettaglio(null);
    await caricaClienti();
    setToast({ message: "Cliente eliminato." });
  }

  async function importaCsv(file: File) {
    try {
      const righe = leggiCsvClienti(await file.text());
      if (!righe.length) {
        throw new Error("Il file non contiene righe importabili.");
      }
      const chiavi = new Set(clienti.map(chiaveCliente));
      let creati = 0;
      let ignorati = 0;
      for (const riga of righe) {
        const chiave = chiaveCliente(riga);
        if (
          !riga.cliente.trim() ||
          (riga.tipo_cliente === "azienda" && !riga.piva.trim()) ||
          chiavi.has(chiave)
        ) {
          ignorati += 1;
          continue;
        }
        const { error } = await supabase
          .from("clienti")
          .insert(payloadCliente(riga));
        if (error) {
          ignorati += 1;
        } else {
          creati += 1;
          chiavi.add(chiave);
        }
      }
      await caricaClienti();
      setToast({
        message: `Importazione completata: ${creati} creati, ${ignorati} ignorati.`,
      });
    } catch (error) {
      setToast({
        message:
          error instanceof Error ? error.message : "Importazione non riuscita.",
        error: true,
      });
    }
  }

  return (
    <LayoutApp>
      <PageHeader
        title="Rubrica clienti"
        subtitle="Gestisci anagrafiche, recapiti, dati fiscali e referenti dei clienti."
        actions={
          <button type="button" onClick={apriNuovo} className={primaryButton}>
            <AppIcon name="plus" size={16} />
            Nuovo cliente
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[280px] flex-[1_1_360px]">
          <AppIcon
            name="search"
            size={17}
            className="pointer-events-none absolute left-3.5 top-3.5 text-[#2B2F5E]/40"
          />
          <input
            className={`${inputClass} pl-10`}
            value={ricerca}
            onChange={(event) => setRicerca(event.target.value)}
            placeholder="Cerca cliente, P. IVA, C.F., REA, comune, referente, telefono, email o PEC..."
            aria-label="Cerca nella rubrica clienti"
          />
        </div>
        <button
          type="button"
          className={`${secondaryButton} shrink-0`}
          onClick={() => setFiltriAperti((value) => !value)}
          aria-expanded={filtriAperti}
        >
          Filtri
        </button>
        <div className="w-52 shrink-0">
          <select
            className={inputClass}
            value={ordine}
            onChange={(event) =>
              setOrdine(event.target.value as OrdinamentoClienti)
            }
            aria-label="Ordinamento clienti"
          >
            <option value="cliente_asc">Cliente A-Z</option>
            <option value="cliente_desc">Cliente Z-A</option>
            <option value="comune">Comune</option>
            <option value="referente">Referente</option>
            <option value="inserimento">Inserimento più recente</option>
          </select>
        </div>
        <div className="flex shrink-0 rounded-xl border border-[#2B2F5E]/15 bg-white p-1">
          <button
            type="button"
            title="Vista tabellare"
            onClick={() => setVista("table")}
            className={`rounded-lg px-3 py-2 text-xs font-semibold ${
              vista === "table"
                ? "bg-[#2B2F5E] text-white"
                : "text-[#2B2F5E]"
            }`}
          >
            Tabella
          </button>
          <button
            type="button"
            title="Vista a schede"
            onClick={() => setVista("cards")}
            className={`rounded-lg px-3 py-2 text-xs font-semibold ${
              vista === "cards"
                ? "bg-[#2B2F5E] text-white"
                : "text-[#2B2F5E]"
            }`}
          >
            Schede
          </button>
        </div>
        <button
          type="button"
          className={`${secondaryButton} shrink-0`}
          onClick={() => esportaClientiCsv(filtrati)}
          disabled={filtrati.length === 0}
        >
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
        <button
          type="button"
          className={`${secondaryButton} shrink-0`}
          onClick={() => fileRef.current?.click()}
        >
          Importa CSV
        </button>
      </div>

      {filtriAperti && (
        <div className="mb-4">
          <ClientsFilters
            filtri={filtri}
            onChange={setFiltri}
            comuni={comuni}
          />
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              className="text-xs font-semibold text-[#2D80B3]"
              onClick={() => {
                localStorage.setItem(
                  "rubrica-clienti-filtri",
                  JSON.stringify(filtri)
                );
                setToast({ message: "Filtri salvati nel browser." });
              }}
            >
              Salva questi filtri
            </button>
          </div>
        </div>
      )}

      <div className="mb-3 flex items-center justify-between text-xs text-[#2B2F5E]/55">
        <span>{filtrati.length} clienti</span>
        {filtrati.length !== clienti.length && (
          <span>{clienti.length} totali</span>
        )}
      </div>

      {caricamento ? (
        <LoadingSkeleton rows={5} />
      ) : filtrati.length === 0 ? (
        <EmptyState
          title={
            clienti.length
              ? "Nessun cliente corrisponde alla ricerca."
              : "Non sono ancora presenti clienti nella rubrica."
          }
          actionLabel={clienti.length ? undefined : "Aggiungi il primo cliente"}
          onAction={clienti.length ? undefined : apriNuovo}
        />
      ) : vista === "table" ? (
        <ClientsTable clienti={paginati} onAction={eseguiAzione} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {paginati.map((item) => (
            <ClientCard
              key={item.id}
              cliente={item}
              onView={() => setDettaglio(item)}
              onEdit={() => apriModifica(item)}
            />
          ))}
        </div>
      )}

      {!caricamento && filtrati.length > 0 && (
        <div className="mt-4 flex flex-col items-center justify-between gap-3 rounded-xl bg-white p-3 sm:flex-row">
          <label className="flex items-center gap-2 text-xs text-[#2B2F5E]/55">
            Righe per pagina
            <select
              value={righePerPagina}
              onChange={(event) => setRighePerPagina(Number(event.target.value))}
              className="rounded-lg border border-[#2B2F5E]/15 px-2 py-1.5 text-[#2B2F5E]"
            >
              <option>10</option>
              <option>20</option>
              <option>50</option>
            </select>
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={paginaCorrente <= 1}
              onClick={() => setPagina(paginaCorrente - 1)}
              className={`${secondaryButton} min-h-9 py-1.5`}
            >
              Precedente
            </button>
            <span className="px-2 text-xs text-[#2B2F5E]">
              Pagina {paginaCorrente} di {totalePagine}
            </span>
            <button
              type="button"
              disabled={paginaCorrente >= totalePagine}
              onClick={() => setPagina(paginaCorrente + 1)}
              className={`${secondaryButton} min-h-9 py-1.5`}
            >
              Successiva
            </button>
          </div>
        </div>
      )}

      {formAperto && (
        <ClientFormModal
          key={`${formAperto.id || "nuovo"}-${formAperto.title}`}
          title={formAperto.title}
          initialValue={formAperto.initialValue}
          onClose={() => setFormAperto(null)}
          onSave={salvaCliente}
        />
      )}
      {dettaglio && (
        <ClientDetailsModal
          cliente={dettaglio}
          onClose={() => setDettaglio(null)}
          onEdit={() => apriModifica(dettaglio)}
        />
      )}
      {daEliminare && (
        <Modal title="Eliminare il cliente?" onClose={() => setDaEliminare(null)}>
          <p className="text-sm text-[#2B2F5E]/70">
            La voce <strong>{daEliminare.cliente}</strong> verrà eliminata
            definitivamente dalla rubrica.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              className={secondaryButton}
              onClick={() => setDaEliminare(null)}
            >
              Annulla
            </button>
            <button
              type="button"
              className="min-h-11 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700"
              onClick={() => void eliminaCliente()}
            >
              Elimina
            </button>
          </div>
        </Modal>
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
