"use client";

import { inputClass, secondaryButton } from "@/components/rappresentanti/Common";
import {
  FILTRI_COMMESSE_INIZIALI,
  PRIORITA_COMMESSA,
  type FiltriCommesse,
} from "@/lib/commesse/lista";
import { TIPI_COMMESSA } from "@/lib/tipiCommesse";

type Props = {
  filtri: FiltriCommesse;
  posizioni: string[];
  clienti: string[];
  onChange: (filtri: FiltriCommesse) => void;
};

export default function CommesseFilters({ filtri, posizioni, clienti, onChange }: Props) {
  const attivi = [
    filtri.priorita && { chiave: "priorita", label: `Priorità: ${filtri.priorita}` },
    filtri.tipo && { chiave: "tipo", label: `Tipologia: ${filtri.tipo}` },
    filtri.posizione && { chiave: "posizione", label: `Posizione: ${filtri.posizione}` },
    filtri.cliente && { chiave: "cliente", label: `Cliente: ${filtri.cliente}` },
    filtri.stato !== "tutte" && {
      chiave: "stato",
      label: filtri.stato === "attive" ? "Solo attive" : "Solo terminate",
    },
  ].filter(Boolean) as Array<{ chiave: keyof FiltriCommesse; label: string }>;

  function aggiorna<K extends keyof FiltriCommesse>(chiave: K, valore: FiltriCommesse[K]) {
    onChange({ ...filtri, [chiave]: valore });
  }

  function rimuovi(chiave: keyof FiltriCommesse) {
    aggiorna(chiave, FILTRI_COMMESSE_INIZIALI[chiave] as never);
  }

  return (
    <section className="rounded-2xl border border-[#2B2F5E]/10 bg-white p-4 shadow-sm">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Filtro label="Priorità" value={filtri.priorita} onChange={(value) => aggiorna("priorita", value as FiltriCommesse["priorita"])}>
          <option value="">Tutte le priorità</option>
          {PRIORITA_COMMESSA.map((item) => <option key={item}>{item}</option>)}
        </Filtro>
        <Filtro label="Tipologia" value={filtri.tipo} onChange={(value) => aggiorna("tipo", value as FiltriCommesse["tipo"])}>
          <option value="">Tutte le tipologie</option>
          {TIPI_COMMESSA.map((item) => <option key={item}>{item}</option>)}
        </Filtro>
        <Filtro label="Posizione" value={filtri.posizione} onChange={(value) => aggiorna("posizione", value)}>
          <option value="">Tutte le posizioni</option>
          {posizioni.map((item) => <option key={item}>{item}</option>)}
        </Filtro>
        <Filtro label="Cliente" value={filtri.cliente} onChange={(value) => aggiorna("cliente", value)}>
          <option value="">Tutti i clienti</option>
          {clienti.map((item) => <option key={item}>{item}</option>)}
        </Filtro>
        <Filtro label="Stato" value={filtri.stato} onChange={(value) => aggiorna("stato", value as FiltriCommesse["stato"])}>
          <option value="tutte">Attive e terminate</option>
          <option value="attive">Solo attive</option>
          <option value="terminate">Solo terminate</option>
        </Filtro>
      </div>

      <div className="mt-3 flex min-h-9 flex-wrap items-center gap-2">
        {attivi.length ? attivi.map((filtro) => (
          <button
            type="button"
            key={filtro.chiave}
            onClick={() => rimuovi(filtro.chiave)}
            className="rounded-full bg-[#5E9AD3]/12 px-3 py-1.5 text-xs font-medium text-[#2D80B3] hover:bg-[#5E9AD3]/20"
            title="Rimuovi filtro"
          >
            {filtro.label} <span aria-hidden="true">×</span>
          </button>
        )) : <span className="text-xs text-[#2B2F5E]/40">Nessun filtro attivo.</span>}
        {attivi.length > 0 && (
          <button type="button" className={`${secondaryButton} ml-auto min-h-9 px-3 py-1.5`} onClick={() => onChange(FILTRI_COMMESSE_INIZIALI)}>
            Azzera filtri
          </button>
        )}
      </div>
    </section>
  );
}

function Filtro({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="text-xs font-semibold text-[#2B2F5E]">
      {label}
      <select className={`${inputClass} mt-1.5`} value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
    </label>
  );
}
