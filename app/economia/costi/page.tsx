"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AppIcon from "@/components/AppIcon";
import EconomiaAccessGuard from "@/components/EconomiaAccessGuard";
import ImportoInput from "@/components/ImportoInput";
import LayoutApp from "@/components/LayoutApp";
import { costoSocietaAnnuale } from "@/lib/economia";
import { finalizzaInputImporto, formattaEuro, parseImporto } from "@/lib/importi";
import { supabase } from "@/lib/supabase";

type FrequenzaCosto = "Mensile" | "Annuale" | "Una tantum";

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
  const [annoVisualizzato, setAnnoVisualizzato] = useState(annoCorrente);
  const [costi, setCosti] = useState<CostoSocieta[]>([]);
  const [form, setForm] = useState<CostoForm>(() =>
    creaFormIniziale(annoCorrente)
  );
  const [caricamento, setCaricamento] = useState(true);
  const [salvataggio, setSalvataggio] = useState(false);
  const [errore, setErrore] = useState("");

  useEffect(() => {
    caricaCosti();
  }, []);

  async function caricaCosti() {
    setCaricamento(true);
    setErrore("");

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
  }

  const riepilogo = useMemo(() => {
    const costiAttivi = costi.filter((item) => item.attivo);
    const mensile = costiAttivi
      .filter(
        (item) =>
          item.frequenza === "Mensile" &&
          costoSocietaAnnuale(item, annoVisualizzato) > 0
      )
      .reduce(
        (totale, item) =>
          totale +
          Number(item.importo || 0) +
          Number(item.cassa || 0) +
          Number(item.iva || 0),
        0
      );
    const annuale = costiAttivi.reduce(
      (totale, item) => totale + costoSocietaAnnuale(item, annoVisualizzato),
      0
    );
    const unaTantum = costiAttivi
      .filter((item) => item.frequenza === "Una tantum")
      .reduce((totale, item) => {
        const annoCosto = item.data_riferimento
          ? new Date(item.data_riferimento).getFullYear()
          : annoVisualizzato;

        return annoCosto === annoVisualizzato
          ? totale +
              Number(item.importo || 0) +
              Number(item.cassa || 0) +
              Number(item.iva || 0)
          : totale;
      }, 0);

    return { mensile, annuale, unaTantum };
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

  function nuovaVoce() {
    setForm(creaFormIniziale(annoVisualizzato));
  }

  function apriCosto(costo: CostoSocieta) {
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
    if (!form.id) nuovaVoce();
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

    nuovaVoce();
    await caricaCosti();
  }

  return (
    <LayoutApp>
      <EconomiaAccessGuard>
        <div className="space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div>
              <h2 className="page-title">Costi società</h2>
              <p className="text-[15px] text-[#D79D06] mt-1">
                Affitto, spese fisse, costi annuali e spese una tantum
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
                  {"<"}
                </button>
                <input
                  type="number"
                  value={annoVisualizzato}
                  onChange={(event) =>
                    setAnnoVisualizzato(Number(event.target.value) || annoCorrente)
                  }
                  className="h-10 w-20 border-0 bg-transparent text-center text-sm font-semibold text-[#2B2F5E] outline-none"
                />
                <button
                  type="button"
                  onClick={() => setAnnoVisualizzato((corrente) => corrente + 1)}
                  className="h-10 w-10 rounded-lg text-[#2B2F5E] hover:bg-[#F2F2F2] cursor-pointer"
                  aria-label="Anno successivo"
                >
                  {">"}
                </button>
              </div>
              <Link
                href="/economia"
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-[#2B2F5E] shadow-sm hover:bg-[#F2F2F2]"
              >
                <AppIcon name="chartBar" size={17} />
                Report
              </Link>
              <Link
                href="/economia/commesse"
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-[#2B2F5E] shadow-sm hover:bg-[#F2F2F2]"
              >
                <AppIcon name="briefcase" size={17} />
                Commesse
              </Link>
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
              <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Kpi label="Costi mensili" value={formattaEuro(riepilogo.mensile)} />
                <Kpi
                  label="Spese una tantum"
                  value={formattaEuro(riepilogo.unaTantum)}
                />
                <Kpi
                  label={`Costi ${annoVisualizzato}`}
                  value={formattaEuro(riepilogo.annuale)}
                />
              </section>

              <div className="grid grid-cols-1 2xl:grid-cols-[420px_minmax(0,1fr)] gap-5">
                <Card
                  title={
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-3">
                        <IconBadge />
                        {form.id ? "Modifica costo" : "Nuovo costo"}
                      </span>
                      <button
                        type="button"
                        onClick={nuovaVoce}
                        className="h-9 w-9 rounded-xl bg-[#64B445] text-white flex items-center justify-center hover:bg-[#5AA03E] cursor-pointer"
                        aria-label="Nuovo costo"
                      >
                        <AppIcon name="plus" size={17} />
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
                </Card>

                <div className="space-y-5">
                  <ArchivioCosti
                    title="Archivio spese fisse"
                    emptyText="Nessuna spesa fissa inserita."
                    costi={speseFisse}
                    annoCorrente={annoVisualizzato}
                    onOpen={apriCosto}
                    showPeriodo
                  />
                  <ArchivioCosti
                    title="Archivio spese una tantum"
                    emptyText="Nessuna spesa una tantum inserita."
                    costi={speseUnaTantum}
                    annoCorrente={annoVisualizzato}
                    onOpen={apriCosto}
                  />
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
  showPeriodo = false,
}: {
  title: string;
  emptyText: string;
  costi: CostoSocieta[];
  annoCorrente: number;
  onOpen: (costo: CostoSocieta) => void;
  showPeriodo?: boolean;
}) {
  return (
    <Card
      title={
        <span className="flex items-center gap-3">
          <IconBadge />
          {title}
        </span>
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
