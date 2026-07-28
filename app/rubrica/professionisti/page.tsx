"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AppIcon from "@/components/AppIcon";
import LayoutApp from "@/components/LayoutApp";
import ProfessionalCard from "@/components/professionisti/ProfessionalCard";
import ProfessionalDetailsModal from "@/components/professionisti/ProfessionalDetailsModal";
import ProfessionalFormModal from "@/components/professionisti/ProfessionalFormModal";
import ProfessionalsFilters from "@/components/professionisti/ProfessionalsFilters";
import ProfessionalsTable, {
  type ProfessionalAction,
} from "@/components/professionisti/ProfessionalsTable";
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
  FiltriProfessionisti,
  OrdinamentoProfessionisti,
  Professionista,
  ProfessionistaForm,
} from "@/lib/professionisti/types";
import {
  FILTRI_PROFESSIONISTI_INIZIALI,
  PROFESSIONISTA_FORM_VUOTO,
} from "@/lib/professionisti/types";
import {
  chiaveProfessionista,
  esportaProfessionistiCsv,
  filtraProfessionisti,
  leggiCsvProfessionisti,
  ordinaProfessionisti,
  professionistaToForm,
} from "@/lib/professionisti/utils";
import { supabase } from "@/lib/supabase";

const CAMPI_PROFESSIONISTA = [
  "id",
  "nome",
  "cognome",
  "professione",
  "data_nascita",
  "luogo_nascita",
  "codice_fiscale",
  "residenza",
  "domicilio_fiscale",
  "albo",
  "provincia",
  "sezione",
  "numero",
  "prima_iscrizione",
  "partita_iva",
  "pec",
  "abilitazioni",
].join(", ");

type FormAperto = {
  id: string | null;
  title: string;
  initialValue: ProfessionistaForm;
};

function payloadProfessionista(form: ProfessionistaForm) {
  return Object.fromEntries(
    Object.entries(form).map(([key, value]) => [
      key,
      value.trim() || null,
    ])
  );
}

function valoriDistinti(
  professionisti: Professionista[],
  campo: "professione" | "albo" | "provincia" | "sezione"
) {
  return Array.from(
    new Set(
      professionisti
        .map((item) => item[campo]?.trim())
        .filter((value): value is string => Boolean(value))
    )
  ).sort((a, b) => a.localeCompare(b, "it", { sensitivity: "base" }));
}

export default function RubricaProfessionistiPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [professionisti, setProfessionisti] = useState<Professionista[]>([]);
  const [caricamento, setCaricamento] = useState(true);
  const [ricerca, setRicerca] = useState("");
  const [filtri, setFiltri] = useState<FiltriProfessionisti>(
    FILTRI_PROFESSIONISTI_INIZIALI
  );
  const [filtriAperti, setFiltriAperti] = useState(false);
  const [vista, setVista] = useState<"table" | "cards">("table");
  const [ordine, setOrdine] =
    useState<OrdinamentoProfessionisti>("cognome");
  const [pagina, setPagina] = useState(1);
  const [righePerPagina, setRighePerPagina] = useState(20);
  const [formAperto, setFormAperto] = useState<FormAperto | null>(null);
  const [dettaglio, setDettaglio] = useState<Professionista | null>(null);
  const [daEliminare, setDaEliminare] = useState<Professionista | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    error?: boolean;
  } | null>(null);

  const caricaProfessionisti = useCallback(async () => {
    setCaricamento(true);
    const { data, error } = await supabase
      .from("professionisti")
      .select(CAMPI_PROFESSIONISTA)
      .order("cognome", { ascending: true })
      .order("nome", { ascending: true });

    if (error) {
      setProfessionisti([]);
      setToast({
        message: `Caricamento professionisti non riuscito: ${error.message}`,
        error: true,
      });
    } else {
      setProfessionisti((data || []) as unknown as Professionista[]);
    }
    setCaricamento(false);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void caricaProfessionisti();
      const salvati = localStorage.getItem("rubrica-professionisti-filtri");
      if (salvati) {
        try {
          setFiltri({
            ...FILTRI_PROFESSIONISTI_INIZIALI,
            ...(JSON.parse(salvati) as Partial<FiltriProfessionisti>),
          });
        } catch {
          localStorage.removeItem("rubrica-professionisti-filtri");
        }
      }
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [caricaProfessionisti]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setPagina(1), 0);
    return () => window.clearTimeout(timeoutId);
  }, [ricerca, filtri, ordine, righePerPagina]);

  const filtrati = useMemo(
    () =>
      ordinaProfessionisti(
        filtraProfessionisti(professionisti, ricerca, filtri),
        ordine
      ),
    [filtri, ordine, professionisti, ricerca]
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
  const professioni = useMemo(
    () => valoriDistinti(professionisti, "professione"),
    [professionisti]
  );
  const albi = useMemo(
    () => valoriDistinti(professionisti, "albo"),
    [professionisti]
  );
  const province = useMemo(
    () => valoriDistinti(professionisti, "provincia"),
    [professionisti]
  );
  const sezioni = useMemo(
    () => valoriDistinti(professionisti, "sezione"),
    [professionisti]
  );

  function apriNuovo() {
    setFormAperto({
      id: null,
      title: "Nuovo professionista",
      initialValue: { ...PROFESSIONISTA_FORM_VUOTO },
    });
  }

  function apriModifica(item: Professionista) {
    setDettaglio(null);
    setFormAperto({
      id: item.id,
      title: "Modifica professionista",
      initialValue: professionistaToForm(item),
    });
  }

  function eseguiAzione(action: ProfessionalAction, item: Professionista) {
    if (action === "view") setDettaglio(item);
    if (action === "edit") apriModifica(item);
    if (action === "delete") setDaEliminare(item);
    if (action === "duplicate") {
      setFormAperto({
        id: null,
        title: "Duplica professionista",
        initialValue: professionistaToForm(item),
      });
    }
  }

  async function salvaProfessionista(value: ProfessionistaForm) {
    if (!formAperto) return;
    const richiesta = formAperto.id
      ? supabase
          .from("professionisti")
          .update(payloadProfessionista(value))
          .eq("id", formAperto.id)
      : supabase.from("professionisti").insert(payloadProfessionista(value));
    const { error } = await richiesta;
    if (error) throw new Error(error.message);
    setFormAperto(null);
    await caricaProfessionisti();
    setToast({
      message: formAperto.id
        ? "Professionista aggiornato."
        : "Professionista aggiunto.",
    });
  }

  async function eliminaProfessionista() {
    if (!daEliminare) return;
    const { error } = await supabase
      .from("professionisti")
      .delete()
      .eq("id", daEliminare.id);
    if (error) {
      setToast({ message: error.message, error: true });
      return;
    }
    setDaEliminare(null);
    setDettaglio(null);
    await caricaProfessionisti();
    setToast({ message: "Professionista eliminato." });
  }

  async function importaCsv(file: File) {
    try {
      const righe = leggiCsvProfessionisti(await file.text());
      if (!righe.length) {
        throw new Error("Il file non contiene righe importabili.");
      }
      const chiavi = new Set(professionisti.map(chiaveProfessionista));
      let creati = 0;
      let ignorati = 0;
      for (const riga of righe) {
        const chiave = chiaveProfessionista(riga);
        if (!riga.nome.trim() || !riga.cognome.trim() || chiavi.has(chiave)) {
          ignorati += 1;
          continue;
        }
        const { error } = await supabase
          .from("professionisti")
          .insert(payloadProfessionista(riga));
        if (error) {
          ignorati += 1;
        } else {
          creati += 1;
          chiavi.add(chiave);
        }
      }
      await caricaProfessionisti();
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
        title="Rubrica professionisti"
        subtitle="Gestisci anagrafiche, iscrizioni agli albi, dati fiscali e abilitazioni professionali."
        actions={
          <button type="button" onClick={apriNuovo} className={primaryButton}>
            <AppIcon name="plus" size={16} />
            Nuovo professionista
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
            placeholder="Cerca nome, professione, albo, provincia, codice fiscale, partita IVA o PEC..."
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
              setOrdine(event.target.value as OrdinamentoProfessionisti)
            }
            aria-label="Ordinamento professionisti"
          >
            <option value="cognome">Cognome A-Z</option>
            <option value="nome">Nome A-Z</option>
            <option value="professione">Professione</option>
            <option value="provincia">Provincia</option>
            <option value="prima_iscrizione">Prima iscrizione più recente</option>
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
          onClick={() => esportaProfessionistiCsv(filtrati)}
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
          <ProfessionalsFilters
            filtri={filtri}
            onChange={setFiltri}
            professioni={professioni}
            albi={albi}
            province={province}
            sezioni={sezioni}
          />
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              className="text-xs font-semibold text-[#2D80B3]"
              onClick={() => {
                localStorage.setItem(
                  "rubrica-professionisti-filtri",
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
        <span>{filtrati.length} professionisti</span>
        {filtrati.length !== professionisti.length && (
          <span>{professionisti.length} totali</span>
        )}
      </div>

      {caricamento ? (
        <LoadingSkeleton rows={5} />
      ) : filtrati.length === 0 ? (
        <EmptyState
          title={
            professionisti.length
              ? "Nessun professionista corrisponde alla ricerca."
              : "Non sono ancora presenti professionisti nella rubrica."
          }
          actionLabel={
            professionisti.length ? undefined : "Aggiungi il primo professionista"
          }
          onAction={professionisti.length ? undefined : apriNuovo}
        />
      ) : vista === "table" ? (
        <ProfessionalsTable
          professionisti={paginati}
          onAction={eseguiAzione}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {paginati.map((item) => (
            <ProfessionalCard
              key={item.id}
              professionista={item}
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
        <ProfessionalFormModal
          key={`${formAperto.id || "nuovo"}-${formAperto.title}`}
          title={formAperto.title}
          initialValue={formAperto.initialValue}
          onClose={() => setFormAperto(null)}
          onSave={salvaProfessionista}
        />
      )}
      {dettaglio && (
        <ProfessionalDetailsModal
          professionista={dettaglio}
          onClose={() => setDettaglio(null)}
          onEdit={() => apriModifica(dettaglio)}
        />
      )}
      {daEliminare && (
        <Modal
          title="Eliminare il professionista?"
          onClose={() => setDaEliminare(null)}
        >
          <p className="text-sm text-[#2B2F5E]/70">
            La voce di <strong>{daEliminare.cognome} {daEliminare.nome}</strong>{" "}
            verrà eliminata definitivamente dalla rubrica.
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
              onClick={() => void eliminaProfessionista()}
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
