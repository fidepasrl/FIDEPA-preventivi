"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AppIcon from "@/components/AppIcon";
import EconomiaAccessGuard from "@/components/EconomiaAccessGuard";
import LayoutApp from "@/components/LayoutApp";
import { movimentiCostoSocietaMaturati } from "@/lib/economia";
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
  soggetto_fiscale_id: string | null;
  fatturato_come_ing_pascale: boolean | null;
  commesse: RelazioneSupabase<CommessaInfo>;
  economia_soggetti_fiscali: RelazioneSupabase<{ nome: string }>;
};

type MovimentoReport = {
  id: string;
  economia_commessa_id: string;
  direzione: "entrata" | "uscita";
  collaboratore_id: string | null;
  costo_progetto_id: string | null;
  data_movimento: string;
  importo: number;
  imponibile: number | null;
  cassa: number | null;
  iva: number | null;
  legacy_dettaglio: Record<string, unknown> | null;
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

function getRelazioneSingola<T>(valore: RelazioneSupabase<T>) {
  if (Array.isArray(valore)) return valore[0] || null;
  return valore || null;
}

function oggiLocaleIso() {
  const oggi = new Date();
  const offset = oggi.getTimezoneOffset() * 60_000;
  return new Date(oggi.getTime() - offset).toISOString().slice(0, 10);
}

function annoDaData(value: string) {
  return Number(value.slice(0, 4));
}

function numeroLegacy(movimento: MovimentoReport, campo: "imponibile" | "cassa" | "iva") {
  const valore = movimento.legacy_dettaglio?.[campo];
  return typeof valore === "number" || typeof valore === "string"
    ? Number(valore) || 0
    : 0;
}

function imponibileMovimento(movimento: MovimentoReport) {
  if (movimento.imponibile != null) return Number(movimento.imponibile || 0);
  const imponibileLegacy = numeroLegacy(movimento, "imponibile");
  if (imponibileLegacy > 0) return imponibileLegacy;
  return Math.max(
    0,
    Number(movimento.importo || 0) -
      componenteFiscaleMovimento(movimento, "cassa") -
      componenteFiscaleMovimento(movimento, "iva")
  );
}

function componenteFiscaleMovimento(
  movimento: MovimentoReport,
  campo: "cassa" | "iva"
) {
  if (movimento.imponibile != null) return Number(movimento[campo] || 0);
  return numeroLegacy(movimento, campo) || Number(movimento[campo] || 0);
}

export default function EconomiaPage() {
  const annoCorrente = new Date().getFullYear();
  const [annoVisualizzato, setAnnoVisualizzato] = useState(annoCorrente);
  const [movimenti, setMovimenti] = useState<MovimentoReport[]>([]);
  const [costiSocieta, setCostiSocieta] = useState<CostoSocieta[]>([]);
  const [caricamento, setCaricamento] = useState(true);
  const [errore, setErrore] = useState("");

  async function caricaDati() {
    setCaricamento(true);
    setErrore("");

    const [commesseRes, costiRes] = await Promise.all([
      supabase
        .from("economia_commesse")
        .select(
          `
          id,
          soggetto_fiscale_id,
          fatturato_come_ing_pascale,
          commesse!inner (
            id,
            titolo,
            codice,
            data_inizio,
            data_fine
          ),
          economia_soggetti_fiscali (
            nome
          )
        `
        )
        .eq("commesse.lavoro_privato_non_fidepa", false)
        .is("deleted_at", null),
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

    const schedeFidepa = ((commesseRes.data || []) as EconomiaCommessaRow[])
      .filter((item) => {
        const soggetto = getRelazioneSingola(item.economia_soggetti_fiscali);
        return (
          !item.fatturato_come_ing_pascale &&
          !soggetto?.nome.toLocaleLowerCase("it-IT").includes("pascale")
        );
      });
    const schedeIds = schedeFidepa.map((item) => item.id);
    const oggi = oggiLocaleIso();
    const movimentiRes = schedeIds.length
      ? await supabase
          .from("economia_movimenti_finanziari")
          .select(
            "id, economia_commessa_id, direzione, collaboratore_id, costo_progetto_id, data_movimento, importo, imponibile, cassa, iva, legacy_dettaglio"
          )
          .in("economia_commessa_id", schedeIds)
          .lte("data_movimento", oggi)
          .neq("stato_riconciliazione", "annullato")
          .is("deleted_at", null)
          .order("data_movimento", { ascending: false })
      : { data: [], error: null };

    if (movimentiRes.error) {
      setErrore(movimentiRes.error.message);
      setCaricamento(false);
      return;
    }

    setMovimenti((movimentiRes.data || []) as MovimentoReport[]);
    setCostiSocieta((costiRes.data || []) as CostoSocieta[]);
    setCaricamento(false);
  }

  useEffect(() => {
    async function caricaReportIniziale() {
      await caricaDati();
    }

    void caricaReportIniziale();
    // Il report iniziale deve essere caricato una sola volta all'apertura.
  }, []);

  const riepilogo = useMemo(() => {
    const movimentiAnno = movimenti.filter(
      (movimento) => annoDaData(movimento.data_movimento) === annoVisualizzato
    );
    const entrate = movimentiAnno.filter(
      (movimento) => movimento.direzione === "entrata"
    );
    const usciteCollaboratori = movimentiAnno.filter(
      (movimento) =>
        movimento.direzione === "uscita" && Boolean(movimento.collaboratore_id)
    );
    const usciteProgetto = movimentiAnno.filter(
      (movimento) =>
        movimento.direzione === "uscita" && !movimento.collaboratore_id
    );
    const movimentiSocieta = costiSocieta
      .flatMap((costo) => movimentiCostoSocietaMaturati(costo))
      .filter(
        (movimento) => annoDaData(movimento.dataPagamento) === annoVisualizzato
      );

    const guadagni = entrate.reduce(
      (totale, movimento) => totale + imponibileMovimento(movimento),
      0
    );
    const cassaRicavi = entrate.reduce(
      (totale, movimento) =>
        totale + componenteFiscaleMovimento(movimento, "cassa"),
      0
    );
    const ivaRicavi = entrate.reduce(
      (totale, movimento) =>
        totale + componenteFiscaleMovimento(movimento, "iva"),
      0
    );
    const costiCollaboratori = usciteCollaboratori.reduce(
      (totale, movimento) => totale + imponibileMovimento(movimento),
      0
    );
    const costiProgetto = usciteProgetto.reduce(
      (totale, movimento) => totale + imponibileMovimento(movimento),
      0
    );
    const cassaCostiMovimenti = movimentiAnno
      .filter((movimento) => movimento.direzione === "uscita")
      .reduce(
        (totale, movimento) =>
          totale + componenteFiscaleMovimento(movimento, "cassa"),
        0
      );
    const ivaCostiMovimenti = movimentiAnno
      .filter((movimento) => movimento.direzione === "uscita")
      .reduce(
        (totale, movimento) =>
          totale + componenteFiscaleMovimento(movimento, "iva"),
        0
      );
    const speseSocieta = movimentiSocieta.reduce(
      (totale, movimento) => totale + movimento.importo,
      0
    );
    const cassaCostiSocieta = movimentiSocieta.reduce(
      (totale, movimento) => totale + movimento.cassa,
      0
    );
    const ivaCostiSocieta = movimentiSocieta.reduce(
      (totale, movimento) => totale + movimento.iva,
      0
    );
    const speseTotali = costiProgetto + speseSocieta;
    const utilePrevisto = guadagni - costiCollaboratori - speseTotali;
    const ivaDaVersare =
      ivaRicavi - ivaCostiMovimenti - ivaCostiSocieta;
    const cassaDaVersare =
      cassaRicavi - cassaCostiMovimenti - cassaCostiSocieta;
    const imponibileTasse = Math.max(0, utilePrevisto);
    const ires = imponibileTasse * 0.24;
    const irap = imponibileTasse * 0.0497;
    const guadagnoNetto = utilePrevisto - ires - irap;

    return {
      guadagni,
      cassaDaVersare,
      ivaDaVersare,
      utilePrevisto,
      ires,
      irap,
      guadagnoNetto,
      costiCollaboratori,
      speseTotali,
    };
  }, [annoVisualizzato, costiSocieta, movimenti]);

  const anniMovimentiDisponibili = movimenti.map((movimento) =>
    annoDaData(movimento.data_movimento)
  );
  const anniCostiDisponibili = costiSocieta.flatMap((costo) =>
    movimentiCostoSocietaMaturati(costo).map((movimento) =>
      annoDaData(movimento.dataPagamento)
    )
  );
  const anniDisponibili = Array.from(
    new Set([
      annoCorrente,
      annoVisualizzato,
      ...anniMovimentiDisponibili,
      ...anniCostiDisponibili,
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
                Report degli incassi e delle spese effettivamente registrati
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
                  label={`Incassi netti ${annoVisualizzato}`}
                  value={formattaEuro(riepilogo.guadagni)}
                  help="Solo incassi già avvenuti entro la data odierna"
                />
                <Kpi
                  icon="users"
                  label="Costi collaboratori"
                  value={formattaEuro(riepilogo.costiCollaboratori)}
                  help="Pagamenti già effettuati, al netto di Cassa e IVA"
                />
                <Kpi
                  icon="wallet"
                  label={`Spese totali ${annoVisualizzato}`}
                  value={formattaEuro(riepilogo.speseTotali)}
                  help="Spese di progetto e societarie già sostenute"
                />
                <Kpi
                  icon="wallet"
                  label="Cassa da versare"
                  value={formattaEuro(riepilogo.cassaDaVersare)}
                  help="Cassa già incassata meno Cassa già pagata"
                  danger={riepilogo.cassaDaVersare < 0}
                />
                <Kpi
                  icon="wallet"
                  label="IVA da versare"
                  value={formattaEuro(riepilogo.ivaDaVersare)}
                  help="IVA già incassata meno IVA già pagata"
                  danger={riepilogo.ivaDaVersare < 0}
                />
                <Kpi
                  icon="chartBar"
                  label={`Utile realizzato ${annoVisualizzato}`}
                  value={formattaEuro(riepilogo.utilePrevisto)}
                  help="Incassi netti meno le spese effettivamente sostenute"
                  danger={riepilogo.utilePrevisto < 0}
                />
                <Kpi
                  icon="wallet"
                  label="IRES 24%"
                  value={formattaEuro(riepilogo.ires)}
                  help="Calcolata sull'utile realizzato imponibile"
                />
                <Kpi
                  icon="wallet"
                  label="IRAP 4,97%"
                  value={formattaEuro(riepilogo.irap)}
                  help="Aliquota ordinaria Campania"
                />
                <Kpi
                  icon="euro"
                  label={`Guadagno netto realizzato ${annoVisualizzato}`}
                  value={formattaEuro(riepilogo.guadagnoNetto)}
                  help="Utile realizzato al netto di IRES e IRAP"
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
