"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AppIcon from "@/components/AppIcon";
import EconomiaAccessGuard from "@/components/EconomiaAccessGuard";
import LayoutApp from "@/components/LayoutApp";
import {
  cassaSocietaAnnuale,
  costoSocietaAnnualeNetto,
  costoSocietaMaturatoNetto,
  ivaSocietaAnnuale,
} from "@/lib/economia";
import { formattaEuro } from "@/lib/importi";
import { supabase } from "@/lib/supabase";

type RelazioneSupabase<T> = T | T[] | null | undefined;

type CommessaInfo = {
  id: string;
  titolo: string;
  codice: string | null;
  data_inizio: string | null;
  data_fine: string | null;
};

type EconomiaCommessaRow = {
  id: string;
  anno: number;
  compenso: number;
  trattenuta_percentuale: number;
  cassa: number;
  iva: number;
  fatturato_come_ing_pascale: boolean | null;
  created_at: string;
  commesse: RelazioneSupabase<CommessaInfo>;
  economia_commesse_collaboratori: CollaboratoreReport[] | null;
  economia_commesse_costi: CostoProgettoReport[] | null;
};

type SalReport = {
  importo: number;
  cassa: number;
  iva: number;
  data_pagamento: string | null;
};

type CollaboratoreReport = {
  compenso: number;
  cassa: number;
  iva: number;
  economia_collaboratori_sal: SalReport[] | null;
};

type CostoProgettoReport = {
  importo: number;
  cassa: number;
  iva: number;
  economia_costi_progetto_sal: SalReport[] | null;
};

type CostoSocieta = {
  id: string;
  descrizione: string;
  importo: number;
  cassa: number;
  iva: number;
  tipo: string;
  frequenza: string;
  data_riferimento: string | null;
  data_inizio: string | null;
  data_fine: string | null;
  numero_mesi: number | null;
  attivo: boolean;
};

type RigaReport = {
  id: string;
  titolo: string;
  anno: number;
  compenso: number;
  trattenutaFidepa: number;
  cassaRicavi: number;
  ivaRicavi: number;
  movimentiCollaboratori: MovimentoEconomico[];
  movimentiCostiProgetto: MovimentoEconomico[];
};

type MovimentoEconomico = {
  anno: number;
  importo: number;
  cassa: number;
  iva: number;
};

function getRelazioneSingola<T>(valore: RelazioneSupabase<T>) {
  if (Array.isArray(valore)) return valore[0] || null;
  return valore || null;
}

function annoDaData(value: string | null | undefined, fallback: number) {
  if (!value) return fallback;

  const data = new Date(value);
  return Number.isNaN(data.getTime()) ? fallback : data.getFullYear();
}

function movimentiCollaboratore(
  collaboratore: CollaboratoreReport,
  annoFallback: number
): MovimentoEconomico[] {
  const sal = collaboratore.economia_collaboratori_sal || [];

  if (sal.length > 0) {
    return sal.map((riga) => ({
      anno: annoDaData(riga.data_pagamento, annoFallback),
      importo: Number(riga.importo || 0),
      cassa: Number(riga.cassa || 0),
      iva: Number(riga.iva || 0),
    }));
  }

  return [
    {
      anno: annoFallback,
      importo: Number(collaboratore.compenso || 0),
      cassa: Number(collaboratore.cassa || 0),
      iva: Number(collaboratore.iva || 0),
    },
  ];
}

function movimentiCostoProgetto(
  costo: CostoProgettoReport,
  annoFallback: number
): MovimentoEconomico[] {
  const sal = costo.economia_costi_progetto_sal || [];

  if (sal.length > 0) {
    return sal.map((riga) => ({
      anno: annoDaData(riga.data_pagamento, annoFallback),
      importo: Number(riga.importo || 0),
      cassa: Number(riga.cassa || 0),
      iva: Number(riga.iva || 0),
    }));
  }

  return [
    {
      anno: annoFallback,
      importo: Number(costo.importo || 0),
      cassa: Number(costo.cassa || 0),
      iva: Number(costo.iva || 0),
    },
  ];
}

function sommaMovimenti(movimenti: MovimentoEconomico[], anno: number) {
  return movimenti
    .filter((movimento) => movimento.anno === anno)
    .reduce((totale, movimento) => totale + movimento.importo, 0);
}

function sommaIvaMovimenti(movimenti: MovimentoEconomico[], anno: number) {
  return movimenti
    .filter((movimento) => movimento.anno === anno)
    .reduce((totale, movimento) => totale + movimento.iva, 0);
}

function sommaCassaMovimenti(movimenti: MovimentoEconomico[], anno: number) {
  return movimenti
    .filter((movimento) => movimento.anno === anno)
    .reduce((totale, movimento) => totale + movimento.cassa, 0);
}

export default function EconomiaPage() {
  const annoCorrente = new Date().getFullYear();
  const [annoVisualizzato, setAnnoVisualizzato] = useState(annoCorrente);
  const [righe, setRighe] = useState<RigaReport[]>([]);
  const [costiSocieta, setCostiSocieta] = useState<CostoSocieta[]>([]);
  const [caricamento, setCaricamento] = useState(true);
  const [errore, setErrore] = useState("");

  useEffect(() => {
    caricaDati();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function caricaDati() {
    setCaricamento(true);
    setErrore("");

    const [commesseRes, costiRes] = await Promise.all([
      supabase
        .from("economia_commesse")
        .select(
          `
          id,
          anno,
          compenso,
          trattenuta_percentuale,
          cassa,
          iva,
          fatturato_come_ing_pascale,
          created_at,
          commesse (
            id,
            titolo,
            codice,
            data_inizio,
            data_fine
          ),
          economia_commesse_collaboratori (
            compenso,
            cassa,
            iva,
            economia_collaboratori_sal (
              importo,
              cassa,
              iva,
              data_pagamento
            )
          ),
          economia_commesse_costi (
            importo,
            cassa,
            iva,
            economia_costi_progetto_sal (
              importo,
              cassa,
              iva,
              data_pagamento
            )
          )
        `
        )
        .order("anno", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("economia_costi_societa")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

    if (commesseRes.error || costiRes.error) {
      setErrore(
        commesseRes.error?.message ||
          costiRes.error?.message ||
          "Errore durante il caricamento dei dati economici."
      );
      setCaricamento(false);
      return;
    }

    const righeReport = ((commesseRes.data || []) as EconomiaCommessaRow[])
      .filter((item) => !item.fatturato_come_ing_pascale)
      .map((item) => {
        const commessa = getRelazioneSingola(item.commesse);
        const annoRiga = Number(item.anno || annoCorrente);
        const movimentiCollaboratori = (
          item.economia_commesse_collaboratori || []
        ).flatMap((collaboratore) =>
          movimentiCollaboratore(collaboratore, annoRiga)
        );
        const movimentiCostiProgetto = (
          item.economia_commesse_costi || []
        ).flatMap((costo) => movimentiCostoProgetto(costo, annoRiga));
        const compenso = Number(item.compenso || 0);
        const trattenutaPercentuale = Number(item.trattenuta_percentuale || 0);

        return {
          id: item.id,
          anno: annoRiga,
          titolo: commessa?.codice
            ? `${commessa.codice} | ${commessa.titolo}`
            : commessa?.titolo || "Commessa",
          compenso,
          trattenutaFidepa: (compenso * trattenutaPercentuale) / 100,
          cassaRicavi: Number(item.cassa || 0),
          ivaRicavi: Number(item.iva || 0),
          movimentiCollaboratori,
          movimentiCostiProgetto,
        };
      });

    setRighe(righeReport);
    setCostiSocieta((costiRes.data || []) as CostoSocieta[]);
    setCaricamento(false);
  }

  const riepilogo = useMemo(() => {
    const righeAnno = righe.filter((riga) => riga.anno === annoVisualizzato);
    const guadagni = righeAnno.reduce((totale, riga) => totale + riga.compenso, 0);
    const trattenuteFidepa = righeAnno.reduce(
      (totale, riga) => totale + riga.trattenutaFidepa,
      0
    );
    const cassaRicavi = righeAnno.reduce(
      (totale, riga) => totale + riga.cassaRicavi,
      0
    );
    const ivaRicavi = righeAnno.reduce(
      (totale, riga) => totale + riga.ivaRicavi,
      0
    );
    const ivaCostiProgetto = righe.reduce(
      (totale, riga) =>
        totale + sommaIvaMovimenti(riga.movimentiCostiProgetto, annoVisualizzato),
      0
    );
    const costiCollaboratori = righe.reduce(
      (totale, riga) =>
        totale + sommaMovimenti(riga.movimentiCollaboratori, annoVisualizzato),
      0
    );
    const ivaCostiCollaboratori = righe.reduce(
      (totale, riga) =>
        totale + sommaIvaMovimenti(riga.movimentiCollaboratori, annoVisualizzato),
      0
    );
    const cassaCostiCollaboratori = righe.reduce(
      (totale, riga) =>
        totale + sommaCassaMovimenti(riga.movimentiCollaboratori, annoVisualizzato),
      0
    );
    const costiProgetto = righe.reduce(
      (totale, riga) =>
        totale + sommaMovimenti(riga.movimentiCostiProgetto, annoVisualizzato),
      0
    );
    const cassaCostiProgetto = righe.reduce(
      (totale, riga) =>
        totale + sommaCassaMovimenti(riga.movimentiCostiProgetto, annoVisualizzato),
      0
    );
    const speseSocietaAnnue = costiSocieta.reduce(
      (totale, costo) =>
        totale + costoSocietaAnnualeNetto(costo, annoVisualizzato),
      0
    );
    const speseSocietaMaturate = costiSocieta.reduce(
      (totale, costo) =>
        totale + costoSocietaMaturatoNetto(costo, annoVisualizzato),
      0
    );
    const ivaCostiSocieta = costiSocieta.reduce(
      (totale, costo) => totale + ivaSocietaAnnuale(costo, annoVisualizzato),
      0
    );
    const cassaCostiSocieta = costiSocieta.reduce(
      (totale, costo) => totale + cassaSocietaAnnuale(costo, annoVisualizzato),
      0
    );
    const speseTotali = costiProgetto + speseSocietaAnnue;
    const speseTotaliMaturate = costiProgetto + speseSocietaMaturate;
    const margineCommesse = guadagni - costiCollaboratori - costiProgetto;
    const risultatoPrevisto = guadagni - costiCollaboratori - speseTotali;
    const risultatoMaturato =
      guadagni - costiCollaboratori - speseTotaliMaturate;
    const ivaDaVersare =
      ivaRicavi - ivaCostiCollaboratori - ivaCostiProgetto - ivaCostiSocieta;
    const cassaDaVersare =
      cassaRicavi - cassaCostiCollaboratori - cassaCostiProgetto - cassaCostiSocieta;
    const utilePrevisto = risultatoPrevisto;
    const imponibileTasse = Math.max(0, risultatoPrevisto);
    const ires = imponibileTasse * 0.24;
    const irap = imponibileTasse * 0.0497;
    const tasseTotali = ires + irap;
    const guadagnoNetto = utilePrevisto - tasseTotali;

    return {
      guadagni,
      trattenuteFidepa,
      cassaRicavi,
      ivaRicavi,
      cassaCostiSocieta,
      cassaCostiCollaboratori,
      cassaCostiProgetto,
      cassaDaVersare,
      ivaCostiCollaboratori,
      ivaCostiProgetto,
      ivaCostiSocieta,
      ivaDaVersare,
      utilePrevisto,
      ires,
      irap,
      tasseTotali,
      guadagnoNetto,
      costiCollaboratori,
      costiProgetto,
      speseSocietaAnnue,
      speseSocietaMaturate,
      speseTotali,
      speseTotaliMaturate,
      margineCommesse,
      risultatoPrevisto,
      risultatoMaturato,
      marginePercentuale: guadagni > 0 ? (margineCommesse / guadagni) * 100 : 0,
    };
  }, [annoVisualizzato, costiSocieta, righe]);

  const anniMovimentiDisponibili = righe.flatMap((riga) => [
    ...riga.movimentiCollaboratori.map((movimento) => movimento.anno),
    ...riga.movimentiCostiProgetto.map((movimento) => movimento.anno),
  ]);
  const anniDisponibili = Array.from(
    new Set([
      annoCorrente,
      annoVisualizzato,
      ...righe.map((riga) => riga.anno),
      ...anniMovimentiDisponibili,
    ])
  ).sort((a, b) => b - a);

  return (
    <LayoutApp>
      <EconomiaAccessGuard>
        <div className="space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div>
              <h2 className="page-title">Gestione Economica</h2>
              <p className="text-[15px] text-[#D79D06] mt-1">
                Report margini, costi e proiezione finanziaria
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="inline-flex items-center rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => setAnnoVisualizzato((corrente) => corrente - 1)}
                  className="h-10 w-10 rounded-lg text-[#2B2F5E] hover:bg-[#F2F2F2] cursor-pointer"
                  aria-label="Anno precedente"
                >
                  ‹
                </button>
                <input
                  type="number"
                  value={annoVisualizzato}
                  onChange={(event) =>
                    setAnnoVisualizzato(Number(event.target.value) || annoCorrente)
                  }
                  className="h-10 w-20 border-0 bg-transparent text-center text-sm font-semibold text-[#2B2F5E] outline-none"
                  list="anni-report-economia"
                />
                <datalist id="anni-report-economia">
                  {anniDisponibili.map((anno) => (
                    <option key={anno} value={anno} />
                  ))}
                </datalist>
                <button
                  type="button"
                  onClick={() => setAnnoVisualizzato((corrente) => corrente + 1)}
                  className="h-10 w-10 rounded-lg text-[#2B2F5E] hover:bg-[#F2F2F2] cursor-pointer"
                  aria-label="Anno successivo"
                >
                  ›
                </button>
              </div>
              <Link
                href="/economia/commesse"
                className="inline-flex items-center gap-2 rounded-xl bg-[#64B445] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#5AA03E]"
              >
                <AppIcon name="briefcase" size={17} />
                Commesse
              </Link>
              <Link
                href="/economia/costi"
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-[#2B2F5E] shadow-sm hover:bg-[#F2F2F2]"
              >
                <AppIcon name="wallet" size={17} />
                Costi società
              </Link>
            </div>
          </div>

          {errore ? (
            <MessaggioDatabase errore={errore} />
          ) : caricamento ? (
            <div className="min-h-[45vh] flex items-center justify-center text-gray-500">
              Caricamento gestione economica...
            </div>
          ) : (
            <>
              <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Kpi
                  icon="euro"
                  label={`Totale netto commesse ${annoVisualizzato}`}
                  value={formattaEuro(riepilogo.guadagni)}
                  help="Compensi netti inseriti per l'anno"
                />
                <Kpi
                  icon="users"
                  label="Costi collaboratori"
                  value={formattaEuro(riepilogo.costiCollaboratori)}
                  help="Solo netto collaboratori, cassa e IVA escluse"
                />
                <Kpi
                  icon="wallet"
                  label={`Spese totali ${annoVisualizzato}`}
                  value={formattaEuro(riepilogo.speseTotali)}
                  help="Solo netto spese, cassa e IVA escluse"
                />
                <Kpi
                  icon="wallet"
                  label="Cassa da versare"
                  value={formattaEuro(riepilogo.cassaDaVersare)}
                  help="Cassa commesse meno cassa pagata"
                  danger={riepilogo.cassaDaVersare < 0}
                />
                <Kpi
                  icon="wallet"
                  label="IVA da versare"
                  value={formattaEuro(riepilogo.ivaDaVersare)}
                  help="IVA ricavi meno IVA su costi"
                  danger={riepilogo.ivaDaVersare < 0}
                />
                <Kpi
                  icon="chartBar"
                  label={`Previsione utile ${annoVisualizzato}`}
                  value={formattaEuro(riepilogo.utilePrevisto)}
                  help="Netto commesse meno collaboratori e spese"
                  danger={riepilogo.utilePrevisto < 0}
                />
                <Kpi
                  icon="wallet"
                  label="IRES 24%"
                  value={formattaEuro(riepilogo.ires)}
                  help="Calcolata sull'utile imponibile"
                />
                <Kpi
                  icon="wallet"
                  label="IRAP 4,97%"
                  value={formattaEuro(riepilogo.irap)}
                  help="Aliquota ordinaria Campania"
                />
                <Kpi
                  icon="euro"
                  label={`Previsione guadagno ${annoVisualizzato}`}
                  value={formattaEuro(riepilogo.guadagnoNetto)}
                  help="Utile al netto di IRES e IRAP"
                  tone={riepilogo.guadagnoNetto < 0 ? "danger" : "success"}
                />
              </section>
            </>
          )}
        </div>
      </EconomiaAccessGuard>
    </LayoutApp>
  );
}

function Kpi({
  icon,
  label,
  value,
  help,
  danger = false,
  tone,
}: {
  icon: "euro" | "users" | "wallet" | "chartBar";
  label: string;
  value: string;
  help: string;
  danger?: boolean;
  tone?: "success" | "danger";
}) {
  const cardTone =
    tone === "success"
      ? "border-[#64B445]/30 bg-[#64B445]/10"
      : tone === "danger"
        ? "border-red-200 bg-red-50"
        : "border-white bg-white";
  const valueTone =
    tone === "success"
      ? "text-[#3F8F2E]"
      : tone === "danger" || danger
        ? "text-red-600"
        : "text-[#2B2F5E]";
  const labelTone =
    tone === "success"
      ? "text-[#3F8F2E]"
      : tone === "danger"
        ? "text-red-500"
        : "text-gray-400";

  return (
    <div
      className={`rounded-2xl border p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)] ${cardTone}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`text-[11px] uppercase tracking-[0.12em] font-bold ${labelTone}`}>
            {label}
          </p>
          <p className={`mt-3 text-2xl font-semibold ${valueTone}`}>
            {value}
          </p>
        </div>
        <IconBadge icon={icon} />
      </div>
      <p className="mt-3 text-xs text-gray-500">{help}</p>
    </div>
  );
}

function IconBadge({
  icon,
}: {
  icon: "euro" | "users" | "wallet" | "chartBar" | "briefcase";
}) {
  return (
    <span className="h-10 w-10 rounded-xl bg-[#5E9AD3]/12 text-[#2D80B3] flex items-center justify-center shrink-0">
      <AppIcon name={icon} size={19} />
    </span>
  );
}

function MessaggioDatabase({ errore }: { errore: string }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
      <h3 className="text-xl font-semibold text-[#2B2F5E]">
        Tabelle economiche non disponibili
      </h3>
      <p className="mt-2 text-sm text-gray-600">
        Esegui prima il file SQL{" "}
        <span className="font-semibold">supabase-gestione-economica.sql</span>.
      </p>
      <p className="mt-3 text-xs text-red-500">{errore}</p>
    </div>
  );
}
