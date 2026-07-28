"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AppIcon from "@/components/AppIcon";
import EconomiaAccessGuard from "@/components/EconomiaAccessGuard";
import ImportoInput from "@/components/ImportoInput";
import LayoutApp from "@/components/LayoutApp";
import {
  costoSocietaAnnuale,
  costoSocietaAnnualeNetto,
  movimentiCostoSocietaMaturati,
} from "@/lib/economia";
import { finalizzaInputImporto, formattaEuro, parseImporto } from "@/lib/importi";
import { supabase } from "@/lib/supabase";

type FrequenzaCosto = "Mensile" | "Annuale" | "Una tantum";
type CostiTab = "fisse" | "una_tantum" | "riepilogo";

type CostoSocieta = {
  id: string;
  descrizione: string;
  categoria: string | null;
  tipo: string;
  frequenza: FrequenzaCosto;
  importo: number;
  cassa: number;
  iva: number;
  data_riferimento: string | null;
  data_inizio: string | null;
  data_fine: string | null;
  numero_mesi: number | null;
  attivo: boolean;
  note: string | null;
  created_at: string;
};

function creaFormIniziale(anno: number) {
  return {
    id: "",
    descrizione: "",
    frequenza: "Mensile" as FrequenzaCosto,
    anno_riferimento: String(anno),
    data_inizio: "",
    numero_mesi: "12",
    importo: "",
    calcola_cassa: true,
    calcola_iva: true,
    note: "",
  };
}

function mesiTraDate(inizio: string | null, fine: string | null) {
  if (!inizio || !fine) return "";

  const dataInizio = new Date(inizio);
  const dataFine = new Date(fine);
  if (Number.isNaN(dataInizio.getTime()) || Number.isNaN(dataFine.getTime())) {
    return "";
  }

  const mesi =
    (dataFine.getFullYear() - dataInizio.getFullYear()) * 12 +
    dataFine.getMonth() -
    dataInizio.getMonth() +
    1;

  return mesi > 0 ? String(mesi) : "";
}

type CostoForm = ReturnType<typeof creaFormIniziale>;

export default function EconomiaCostiPage() {
  const annoCorrente = new Date().getFullYear();
  const annoVisualizzato = annoCorrente;
  const [tab, setTab] = useState<CostiTab>("fisse");
  const [costi, setCosti] = useState<CostoSocieta[]>([]);
  const [form, setForm] = useState<CostoForm>(() =>
    creaFormIniziale(annoCorrente)
  );
  const [caricamento, setCaricamento] = useState(true);
  const [salvataggio, setSalvataggio] = useState(false);
  const [errore, setErrore] = useState("");
  const [formAperto, setFormAperto] = useState(false);

  const caricaCosti = useCallback(async () => {
    const { data, error } = await supabase
      .from("economia_costi_societa")
      .select("*")
      .order("attivo", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      setErrore(error.message);
      setCaricamento(false);
      return;
    }

    setCosti((data || []) as CostoSocieta[]);
    setCaricamento(false);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void caricaCosti(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [caricaCosti]);

  const riepilogo = useMemo(() => {
    const costiAttivi = costi.filter((item) => item.attivo);
    const costiMaturati = costiAttivi
      .flatMap((costo) => movimentiCostoSocietaMaturati(costo))
      .filter((movimento) =>
        movimento.dataPagamento.startsWith(`${annoVisualizzato}-`)
      );
    const costiSostenuti = costiMaturati.reduce(
      (totale, movimento) => totale + movimento.importo,
      0
    );
    const costiPrevisti = costiAttivi.reduce(
      (totale, costo) =>
        totale + costoSocietaAnnualeNetto(costo, annoVisualizzato),
      0
    );
    const cassaTotale = costiMaturati.reduce(
      (totale, movimento) => totale + movimento.cassa,
      0
    );
    const ivaTotale = costiMaturati.reduce(
      (totale, movimento) => totale + movimento.iva,
      0
    );

    return {
      costiSostenuti,
      costiPrevisti,
      cassaTotale,
      ivaTotale,
    };
  }, [annoVisualizzato, costi]);

  const importoFormNumero = parseImporto(form.importo);
  const cassaFormNumero = form.calcola_cassa ? importoFormNumero * 0.04 : 0;
  const ivaFormNumero = form.calcola_iva
    ? (importoFormNumero + cassaFormNumero) * 0.22
    : 0;
  const totaleFormNumero =
    importoFormNumero + cassaFormNumero + ivaFormNumero;
  const moltiplicatoreForm =
    form.frequenza === "Annuale"
      ? 12
      : form.frequenza === "Mensile"
        ? Math.max(1, Math.trunc(Number(form.numero_mesi) || 1))
        : 1;
  const totaleFormStimato = totaleFormNumero * moltiplicatoreForm;
  const speseFisse = costi.filter((costo) => costo.frequenza !== "Una tantum");
  const speseUnaTantum = costi.filter(
    (costo) => costo.frequenza === "Una tantum"
  );

  function aggiornaForm<K extends keyof CostoForm>(
    campo: K,
    valore: CostoForm[K]
  ) {
    setForm((corrente) => {
      const prossimo = { ...corrente, [campo]: valore };

      return prossimo;
    });
  }

  function nuovaVoce(frequenza: FrequenzaCosto = "Mensile") {
    setForm({
      ...creaFormIniziale(annoVisualizzato),
      frequenza,
    });
    setFormAperto(true);
  }

  function chiudiForm() {
    setForm(creaFormIniziale(annoVisualizzato));
    setFormAperto(false);
  }

  function apriCosto(costo: CostoSocieta) {
    setTab(costo.frequenza === "Una tantum" ? "una_tantum" : "fisse");
    setFormAperto(true);
    setForm({
      id: costo.id,
      descrizione: costo.descrizione,
      frequenza: costo.frequenza,
      anno_riferimento: costo.data_riferimento
        ? String(new Date(costo.data_riferimento).getFullYear())
        : String(annoVisualizzato),
      data_inizio: costo.data_inizio || "",
      numero_mesi:
        costo.numero_mesi && costo.numero_mesi > 0
          ? String(costo.numero_mesi)
          : mesiTraDate(costo.data_inizio, costo.data_fine) || "12",
      importo: finalizzaInputImporto(costo.importo),
      calcola_cassa: Number(costo.cassa || 0) > 0,
      calcola_iva: Number(costo.iva || 0) > 0,
      note: costo.note || "",
    });
  }

  async function salvaCosto() {
    if (!form.descrizione.trim()) {
      alert("Inserisci una descrizione del costo.");
      return;
    }

    if (parseImporto(form.importo) <= 0) {
      alert("Inserisci un importo maggiore di zero.");
      return;
    }

    if (
      form.frequenza !== "Mensile" &&
      (Number(form.anno_riferimento) < 2000 ||
        Number(form.anno_riferimento) > 2100)
    ) {
      alert("Inserisci un anno di riferimento valido.");
      return;
    }

    if (form.frequenza === "Mensile" && !form.data_inizio) {
      alert("Inserisci la data di partenza del costo mensile.");
      return;
    }

    if (
      form.frequenza === "Mensile" &&
      (Number(form.numero_mesi) < 1 || Number(form.numero_mesi) > 120)
    ) {
      alert("Inserisci un numero di mesi valido.");
      return;
    }

    setSalvataggio(true);

    const payload = {
      descrizione: form.descrizione.trim(),
      categoria: null,
      tipo: form.frequenza === "Una tantum" ? "Una tantum" : "Fisso",
      frequenza: form.frequenza,
      importo: importoFormNumero,
      cassa: cassaFormNumero,
      iva: ivaFormNumero,
      data_riferimento:
        form.frequenza !== "Mensile"
          ? `${form.anno_riferimento || annoVisualizzato}-01-01`
          : null,
      data_inizio:
        form.frequenza === "Mensile" ? form.data_inizio || null : null,
      data_fine: null,
      numero_mesi:
        form.frequenza === "Mensile"
          ? Math.trunc(Number(form.numero_mesi) || 1)
          : form.frequenza === "Annuale"
            ? 12
            : null,
      attivo: true,
      note: form.note.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const richiesta = form.id
      ? supabase
          .from("economia_costi_societa")
          .update(payload)
          .eq("id", form.id)
      : supabase.from("economia_costi_societa").insert(payload);

    const { error } = await richiesta;

    if (error) {
      alert(`Errore durante il salvataggio del costo: ${error.message}`);
      setSalvataggio(false);
      return;
    }

    await caricaCosti();
    setTimeout(() => setSalvataggio(false), 1000);
    chiudiForm();
  }

  async function eliminaCosto() {
    if (!form.id) return;

    const conferma = window.confirm("Eliminare questo costo societario?");
    if (!conferma) return;

    const { error } = await supabase
      .from("economia_costi_societa")
      .delete()
      .eq("id", form.id);

    if (error) {
      alert(error.message);
      return;
    }

    chiudiForm();
    await caricaCosti();
  }

  return (
    <LayoutApp>
      <EconomiaAccessGuard>
        <div className="space-y-5">
          <div>
            <h2 className="page-title">Costi società</h2>
            <p className="mt-1 text-[15px] text-[#D79D06]">
              Affitto, spese fisse, costi annuali e spese una tantum
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white bg-white p-1.5 shadow-[0_8px_24px_rgba(15,23,42,0.06)]" role="tablist" aria-label="Sezioni costi società">
            <div className="flex min-w-max gap-1">
              {([
                ["fisse", "Spese fisse"],
                ["una_tantum", "Spese una tantum"],
                ["riepilogo", "Riepilogo"],
              ] as Array<[CostiTab, string]>).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  onClick={() => { setTab(id); setFormAperto(false); }}
                  className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition cursor-pointer ${
                    tab === id
                      ? "bg-[#2B2F5E] text-white"
                      : "text-[#2B2F5E] hover:bg-[#F2F2F2]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {errore ? (
            <MessaggioDatabase errore={errore} />
          ) : caricamento ? (
            <div className="min-h-[45vh] flex items-center justify-center text-gray-500">
              Caricamento costi società...
            </div>
          ) : (
            <>
              <section
                className={`${tab === "riepilogo" ? "grid" : "hidden"} grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4`}
                role="tabpanel"
              >
                <Kpi
                  label="Costi sostenuti fino a oggi"
                  value={formattaEuro(riepilogo.costiSostenuti)}
                />
                <Kpi
                  label="Costi previsti entro fine anno"
                  value={formattaEuro(riepilogo.costiPrevisti)}
                />
                <Kpi
                  label="Cassa totale"
                  value={formattaEuro(riepilogo.cassaTotale)}
                />
                <Kpi
                  label="IVA totale"
                  value={formattaEuro(riepilogo.ivaTotale)}
                />
              </section>

              <div className={`${tab === "riepilogo" ? "hidden" : "grid"} grid-cols-1 gap-5 ${formAperto ? "2xl:grid-cols-[420px_minmax(0,1fr)]" : ""}`} role="tabpanel">
                {formAperto ? <Card
                  title={
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-3">
                        <IconBadge />
                        {form.id ? "Modifica costo" : "Nuovo costo"}
                      </span>
                      <button
                        type="button"
                        onClick={chiudiForm}
                        className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 hover:bg-[#F2F2F2] cursor-pointer"
                        aria-label="Chiudi form"
                      >
                        <AppIcon name="x" size={17} />
                      </button>
                    </div>
                  }
                >
                  <div className="space-y-4">
                    <Campo
                      label="Descrizione"
                      value={form.descrizione}
                      onChange={(value) => aggiornaForm("descrizione", value)}
                      placeholder="Es. Affitto studio"
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className="block">
                        <span className="mb-2 block text-sm font-semibold text-[#2B2F5E]">
                          Frequenza
                        </span>
                        <select
                          value={form.frequenza}
                          onChange={(event) =>
                            aggiornaForm(
                              "frequenza",
                              event.target.value as FrequenzaCosto
                            )
                          }
                          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-[#2B2F5E] outline-none focus:border-[#5E9AD3]"
                        >
                          <option value="Mensile">Mensile</option>
                          <option value="Annuale">Annuale</option>
                          <option value="Una tantum">Una tantum</option>
                        </select>
                      </label>

                      {form.frequenza !== "Mensile" && (
                        <label className="block">
                          <span className="mb-2 block text-sm font-semibold text-[#2B2F5E]">
                            Anno riferimento
                          </span>
                          <input
                            type="number"
                            value={form.anno_riferimento}
                            onChange={(event) =>
                              aggiornaForm("anno_riferimento", event.target.value)
                            }
                            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-[#2B2F5E] outline-none focus:border-[#5E9AD3]"
                          />
                        </label>
                      )}
                    </div>

                    {form.frequenza === "Mensile" && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="block">
                          <span className="mb-2 block text-sm font-semibold text-[#2B2F5E]">
                            Data partenza
                          </span>
                          <input
                            type="date"
                            value={form.data_inizio}
                            onChange={(event) =>
                              aggiornaForm("data_inizio", event.target.value)
                            }
                            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-[#2B2F5E] outline-none focus:border-[#5E9AD3]"
                          />
                        </label>

                        <label className="block">
                          <span className="mb-2 block text-sm font-semibold text-[#2B2F5E]">
                            Numero mesi
                          </span>
                          <input
                            type="number"
                            min={1}
                            max={120}
                            value={form.numero_mesi}
                            onChange={(event) =>
                              aggiornaForm("numero_mesi", event.target.value)
                            }
                            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-[#2B2F5E] outline-none focus:border-[#5E9AD3]"
                          />
                        </label>
                      </div>
                    )}

                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-[#2B2F5E]">
                        Importo
                      </span>
                      <ImportoInput
                        value={form.importo}
                        onChange={(value) => aggiornaForm("importo", value)}
                      />
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <AccessorioAutomatico
                        label="Cassa 4%"
                        checked={form.calcola_cassa}
                        onChange={(value) => aggiornaForm("calcola_cassa", value)}
                        value={cassaFormNumero}
                      />

                      <AccessorioAutomatico
                        label="IVA 22%"
                        checked={form.calcola_iva}
                        onChange={(value) => aggiornaForm("calcola_iva", value)}
                        value={ivaFormNumero}
                      />
                    </div>

                    <div className="rounded-2xl bg-[#F2F2F2]/70 p-4">
                      <p className="text-[11px] uppercase tracking-[0.12em] font-bold text-gray-400">
                        Totale costo
                      </p>
                      <p className="mt-2 text-lg font-semibold text-[#2B2F5E]">
                        {formattaEuro(totaleFormStimato)}
                      </p>
                    </div>

                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-[#2B2F5E]">
                        Note
                      </span>
                      <textarea
                        value={form.note}
                        onChange={(event) => aggiornaForm("note", event.target.value)}
                        rows={3}
                        className="w-full resize-none rounded-xl border border-gray-200 bg-[#F2F2F2]/70 px-4 py-3 text-sm text-[#2B2F5E] outline-none focus:border-[#5E9AD3] focus:bg-white focus:ring-4 focus:ring-[#5E9AD3]/10"
                      />
                    </label>

                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={chiudiForm}
                        className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#2B2F5E] hover:bg-[#F2F2F2] cursor-pointer"
                      >
                        Annulla
                      </button>
                      {form.id && (
                        <button
                          type="button"
                          onClick={eliminaCosto}
                          className="rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 cursor-pointer"
                        >
                          Elimina
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={salvaCosto}
                        disabled={salvataggio}
                        className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm cursor-pointer disabled:cursor-default ${
                          salvataggio
                            ? "bg-gray-400"
                            : "bg-[#64B445] hover:bg-[#5AA03E]"
                        }`}
                      >
                        {salvataggio ? "Salvataggio" : "Salva costo"}
                      </button>
                    </div>
                  </div>
                </Card> : null}

                <div className="space-y-5">
                  {tab === "fisse" ? <ArchivioCosti
                    title="Archivio spese fisse"
                    emptyText="Nessuna spesa fissa inserita."
                    costi={speseFisse}
                    annoCorrente={annoVisualizzato}
                    onOpen={apriCosto}
                    onAdd={() => nuovaVoce("Mensile")}
                    showPeriodo
                  /> : null}
                  {tab === "una_tantum" ? <ArchivioCosti
                    title="Archivio spese una tantum"
                    emptyText="Nessuna spesa una tantum inserita."
                    costi={speseUnaTantum}
                    annoCorrente={annoVisualizzato}
                    onOpen={apriCosto}
                    onAdd={() => nuovaVoce("Una tantum")}
                  /> : null}
                </div>
              </div>
            </>
          )}
        </div>
      </EconomiaAccessGuard>
    </LayoutApp>
  );
}

function Card({
  title,
  children,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-white bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
      <div className="border-b border-gray-100 px-5 py-4 text-[16px] font-semibold text-[#2B2F5E]">
        {title}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
      <p className="text-[11px] uppercase tracking-[0.12em] font-bold text-gray-400">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold text-[#2B2F5E]">{value}</p>
    </div>
  );
}

function IconBadge() {
  return (
    <span className="h-10 w-10 rounded-xl bg-[#5E9AD3]/12 text-[#2D80B3] flex items-center justify-center shrink-0">
      <AppIcon name="wallet" size={19} />
    </span>
  );
}

function AccessorioAutomatico({
  label,
  checked,
  value,
  onChange,
}: {
  label: string;
  checked: boolean;
  value: number;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-[#F2F2F2]/70 p-4 cursor-pointer">
      <span className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="h-4 w-4 accent-[#64B445]"
        />
        <span>
          <span className="block text-sm font-semibold text-[#2B2F5E]">
            {label}
          </span>
          <span className="block text-xs text-gray-500">
            {checked ? "Calcolata automaticamente" : "Non calcolata"}
          </span>
        </span>
      </span>
      <span className="text-sm font-semibold text-[#2B2F5E]">
        {formattaEuro(value)}
      </span>
    </label>
  );
}

function ArchivioCosti({
  title,
  emptyText,
  costi,
  annoCorrente,
  onOpen,
  onAdd,
  showPeriodo = false,
}: {
  title: string;
  emptyText: string;
  costi: CostoSocieta[];
  annoCorrente: number;
  onOpen: (costo: CostoSocieta) => void;
  onAdd: () => void;
  showPeriodo?: boolean;
}) {
  return (
    <Card
      title={
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-3">
            <IconBadge />
            {title}
          </span>
          <button
            type="button"
            onClick={onAdd}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#64B445] text-white hover:bg-[#5AA03E] cursor-pointer"
            aria-label={`Aggiungi voce a ${title}`}
            title="Aggiungi costo"
          >
            <AppIcon name="plus" size={17} />
          </button>
        </div>
      }
    >
      {costi.length === 0 ? (
        <p className="text-sm text-gray-400">{emptyText}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="text-[11px] uppercase tracking-[0.12em] text-gray-400">
              <tr className="border-b border-gray-100">
                <th className="py-3 text-left">Costo</th>
                <th className="py-3 text-left">Frequenza</th>
                <th className="py-3 text-left">
                  {showPeriodo ? "Riferimento" : "Anno rif."}
                </th>
                <th className="py-3 text-right">Importo</th>
                <th className="py-3 text-right">Cassa</th>
                <th className="py-3 text-right">IVA</th>
                <th className="py-3 text-right">Costi {annoCorrente}</th>
              </tr>
            </thead>
            <tbody>
              {costi.map((costo) => (
                <tr
                  key={costo.id}
                  onClick={() => onOpen(costo)}
                  className="border-b border-gray-100 hover:bg-[#F2F2F2]/70 cursor-pointer"
                >
                  <td className="py-3 pr-4">
                    <p className="font-semibold text-[#2B2F5E]">
                      {costo.descrizione}
                    </p>
                  </td>
                  <td className="py-3 text-[#2B2F5E]">{costo.frequenza}</td>
                  <td className="py-3 text-[#2B2F5E]">
                    {showPeriodo
                      ? formattaRiferimentoCosto(costo)
                      : costo.data_riferimento
                        ? new Date(costo.data_riferimento).getFullYear()
                        : "-"}
                  </td>
                  <td className="py-3 text-right">
                    {formattaEuro(costo.importo)}
                  </td>
                  <td className="py-3 text-right">
                    {formattaEuro(costo.cassa || 0)}
                  </td>
                  <td className="py-3 text-right">
                    {formattaEuro(costo.iva || 0)}
                  </td>
                  <td className="py-3 text-right font-semibold text-[#2B2F5E]">
                    {formattaEuro(costoSocietaAnnuale(costo, annoCorrente))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function formattaRiferimentoCosto(costo: CostoSocieta) {
  if (costo.frequenza === "Annuale") {
    return costo.data_riferimento
      ? `Anno ${new Date(costo.data_riferimento).getFullYear()}`
      : "-";
  }

  if (costo.frequenza === "Mensile") {
    const mesi =
      costo.numero_mesi && costo.numero_mesi > 0
        ? costo.numero_mesi
        : Number(mesiTraDate(costo.data_inizio, costo.data_fine) || 0);

    return costo.data_inizio
      ? `Dal ${formattaData(costo.data_inizio)} - ${mesi || 1} mesi`
      : "-";
  }

  return "-";
}

function formattaData(value: string | null) {
  if (!value) return "-";

  const data = new Date(value);
  if (Number.isNaN(data.getTime())) return "-";

  return data.toLocaleDateString("it-IT");
}

function Campo({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-[#2B2F5E]">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-gray-200 bg-[#F2F2F2]/70 px-4 py-3 text-sm text-[#2B2F5E] outline-none focus:border-[#5E9AD3] focus:bg-white focus:ring-4 focus:ring-[#5E9AD3]/10"
      />
    </label>
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
