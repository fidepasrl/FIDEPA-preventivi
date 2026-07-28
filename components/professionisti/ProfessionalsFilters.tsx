"use client";

import type { FiltriProfessionisti } from "@/lib/professionisti/types";
import { FILTRI_PROFESSIONISTI_INIZIALI } from "@/lib/professionisti/types";
import {
  inputClass,
  secondaryButton,
} from "@/components/rappresentanti/Common";

export default function ProfessionalsFilters({
  filtri,
  onChange,
  professioni,
  albi,
  province,
  sezioni,
}: {
  filtri: FiltriProfessionisti;
  onChange: (value: FiltriProfessionisti) => void;
  professioni: string[];
  albi: string[];
  province: string[];
  sezioni: string[];
}) {
  const set = <K extends keyof FiltriProfessionisti>(
    key: K,
    value: FiltriProfessionisti[K]
  ) => onChange({ ...filtri, [key]: value });
  const attivi = Object.entries(filtri).filter(
    ([, value]) => value && value !== "tutti"
  );
  const etichetta = (key: string, value: string) => {
    const presenza = value === "presente" ? "presente" : "assente";
    if (key === "pec") return `PEC ${presenza}`;
    if (key === "partita_iva") return `Partita IVA ${presenza}`;
    if (key === "abilitazioni") return `Abilitazioni ${presenza}`;
    return value;
  };

  return (
    <div className="space-y-4 rounded-2xl border border-[#2B2F5E]/8 bg-white p-4 shadow-sm">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <select
          className={inputClass}
          value={filtri.professione}
          onChange={(event) => set("professione", event.target.value)}
          aria-label="Professione"
        >
          <option value="">Tutte le professioni</option>
          {professioni.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
        <select
          className={inputClass}
          value={filtri.albo}
          onChange={(event) => set("albo", event.target.value)}
          aria-label="Albo"
        >
          <option value="">Tutti gli albi</option>
          {albi.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
        <select
          className={inputClass}
          value={filtri.provincia}
          onChange={(event) => set("provincia", event.target.value)}
          aria-label="Provincia"
        >
          <option value="">Tutte le province</option>
          {province.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
        <select
          className={inputClass}
          value={filtri.sezione}
          onChange={(event) => set("sezione", event.target.value)}
          aria-label="Sezione albo"
        >
          <option value="">Tutte le sezioni</option>
          {sezioni.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
        <select
          className={inputClass}
          value={filtri.pec}
          onChange={(event) =>
            set("pec", event.target.value as FiltriProfessionisti["pec"])
          }
          aria-label="Presenza PEC"
        >
          <option value="tutti">PEC: tutte</option>
          <option value="presente">Con PEC</option>
          <option value="assente">Senza PEC</option>
        </select>
        <select
          className={inputClass}
          value={filtri.partita_iva}
          onChange={(event) =>
            set(
              "partita_iva",
              event.target.value as FiltriProfessionisti["partita_iva"]
            )
          }
          aria-label="Presenza partita IVA"
        >
          <option value="tutti">Partita IVA: tutte</option>
          <option value="presente">Con partita IVA</option>
          <option value="assente">Senza partita IVA</option>
        </select>
        <select
          className={inputClass}
          value={filtri.abilitazioni}
          onChange={(event) =>
            set(
              "abilitazioni",
              event.target.value as FiltriProfessionisti["abilitazioni"]
            )
          }
          aria-label="Presenza abilitazioni"
        >
          <option value="tutti">Abilitazioni: tutte</option>
          <option value="presente">Con abilitazioni</option>
          <option value="assente">Senza abilitazioni</option>
        </select>
      </div>

      {attivi.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-t border-[#2B2F5E]/8 pt-3">
          {attivi.map(([key, value]) => (
            <button
              type="button"
              key={key}
              onClick={() =>
                set(
                  key as keyof FiltriProfessionisti,
                  FILTRI_PROFESSIONISTI_INIZIALI[
                    key as keyof FiltriProfessionisti
                  ]
                )
              }
              className="rounded-full bg-[#5E9AD3]/10 px-3 py-1.5 text-xs font-medium text-[#2D80B3]"
            >
              {etichetta(key, String(value))} ×
            </button>
          ))}
          <button
            type="button"
            onClick={() => onChange(FILTRI_PROFESSIONISTI_INIZIALI)}
            className={`${secondaryButton} ml-auto min-h-9 py-1.5 text-xs`}
          >
            Azzera filtri
          </button>
        </div>
      )}
    </div>
  );
}
