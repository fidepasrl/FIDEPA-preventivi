"use client";

import {
  inputClass,
  secondaryButton,
} from "@/components/rappresentanti/Common";
import type { FiltriClienti } from "@/lib/clienti/types";
import { FILTRI_CLIENTI_INIZIALI } from "@/lib/clienti/types";

export default function ClientsFilters({
  filtri,
  onChange,
  comuni,
}: {
  filtri: FiltriClienti;
  onChange: (value: FiltriClienti) => void;
  comuni: string[];
}) {
  const set = <K extends keyof FiltriClienti>(
    key: K,
    value: FiltriClienti[K]
  ) => onChange({ ...filtri, [key]: value });
  const attivi = Object.entries(filtri).filter(
    ([, value]) => value && value !== "tutti"
  );

  function etichetta(key: string, value: string) {
    if (key === "tipo_cliente") {
      return value === "azienda" ? "Azienda" : "Persona fisica";
    }
    if (key === "comune") return value;
    const nomi: Record<string, string> = {
      email: "Email",
      pec: "PEC",
      telefono: "Telefono",
      piva: "P. IVA/C.F.",
      referente: "Referente",
    };
    return `${nomi[key]} ${value === "presente" ? "presente" : "assente"}`;
  }

  const presenza = (
    key: "email" | "pec" | "telefono" | "piva" | "referente",
    label: string
  ) => (
    <select
      className={inputClass}
      value={filtri[key]}
      onChange={(event) =>
        set(key, event.target.value as FiltriClienti[typeof key])
      }
      aria-label={`Presenza ${label}`}
    >
      <option value="tutti">{label}: tutti</option>
      <option value="presente">Con {label.toLocaleLowerCase("it-IT")}</option>
      <option value="assente">Senza {label.toLocaleLowerCase("it-IT")}</option>
    </select>
  );

  return (
    <div className="space-y-4 rounded-2xl border border-[#2B2F5E]/8 bg-white p-4 shadow-sm">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <select
          className={inputClass}
          value={filtri.tipo_cliente}
          onChange={(event) =>
            set(
              "tipo_cliente",
              event.target.value as FiltriClienti["tipo_cliente"]
            )
          }
          aria-label="Tipo cliente"
        >
          <option value="tutti">Tutti i tipi</option>
          <option value="persona_fisica">Persone fisiche</option>
          <option value="azienda">Aziende</option>
        </select>
        <select
          className={inputClass}
          value={filtri.comune}
          onChange={(event) => set("comune", event.target.value)}
          aria-label="Comune"
        >
          <option value="">Tutti i comuni</option>
          {comuni.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
        {presenza("email", "Email")}
        {presenza("pec", "PEC")}
        {presenza("telefono", "Telefono")}
        {presenza("piva", "P. IVA/C.F.")}
        {presenza("referente", "Referente")}
      </div>

      {attivi.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-t border-[#2B2F5E]/8 pt-3">
          {attivi.map(([key, value]) => (
            <button
              type="button"
              key={key}
              onClick={() =>
                set(
                  key as keyof FiltriClienti,
                  FILTRI_CLIENTI_INIZIALI[key as keyof FiltriClienti]
                )
              }
              className="rounded-full bg-[#5E9AD3]/10 px-3 py-1.5 text-xs font-medium text-[#2D80B3]"
            >
              {etichetta(key, String(value))} ×
            </button>
          ))}
          <button
            type="button"
            onClick={() => onChange(FILTRI_CLIENTI_INIZIALI)}
            className={`${secondaryButton} ml-auto min-h-9 py-1.5 text-xs`}
          >
            Azzera filtri
          </button>
        </div>
      )}
    </div>
  );
}
