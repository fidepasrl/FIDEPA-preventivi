"use client";

import { useEffect, useMemo, useState } from "react";
import LayoutApp from "@/components/LayoutApp";
import { pdf } from "@react-pdf/renderer";
import { saveAs } from "file-saver";
import PreventivoPDF from "@/components/pdf/PreventivoPDF";
import ImportoInput from "@/components/ImportoInput";
import { supabase } from "@/lib/supabase";
import { finalizzaInputImporto, parseImporto } from "@/lib/importi";

type Cliente = {
  cliente: string;
  piva: string;
  indirizzo: string;
  comune: string;
  pec: string;
  email: string;
  telefono: string;
  referente: string;
  oggetto: string;
};

type MacroCategoria =
  | "Progettazione"
  | "Realizzazione"
  | "Chiusura dei lavori";

type Lavorazione = {
  id: string;
  nome: string;
  descrizione: string;
  categoria: string;
  macrocategoria: MacroCategoria;
  importo: number | string;
};

const MACROCATEGORIE: MacroCategoria[] = [
  "Progettazione",
  "Realizzazione",
  "Chiusura dei lavori",
];

const STEP3_STORAGE_KEY = "preventivoNuovoStep3";

export default function PreventivoStep3Page() {
  const [modificaImporti, setModificaImporti] = useState(false);
  const [errorePagamento, setErrorePagamento] = useState(false);
  const [anteprimaUrl, setAnteprimaUrl] = useState<string | null>(null);

  const [scontoPercentuale, setScontoPercentuale] = useState("");
  const [scontoImporto, setScontoImporto] = useState("");

  const [pagamento, setPagamento] = useState({
    anticipo: 5,
    progettazione: 0,
    realizzazione: 0,
    chiusura: 0,
  });

  const [numeroPreventivo, setNumeroPreventivo] = useState("");
  const [lavorazioni, setLavorazioni] = useState<Lavorazione[]>([]);

  const [cliente, setCliente] = useState<Cliente>({
    cliente: "",
    piva: "",
    indirizzo: "",
    comune: "",
    pec: "",
    email: "",
    telefono: "",
    referente: "",
    oggetto: "",
  });

  useEffect(() => {
    async function caricaDatiPreventivo() {
      const vociSalvate = localStorage.getItem("lavorazioniSelezionate");
      const voci = vociSalvate ? JSON.parse(vociSalvate) : [];

      if (voci.length > 0) {
        const { data, error } = await supabase
          .from("lavorazioni")
          .select("*")
          .in("id", voci);

        if (error) {
          console.error(error);
        } else {
          const importiSalvati = localStorage.getItem("lavorazioniStep3Importi");

          const importiModificati: { id: string; importo: number | string }[] =
            importiSalvati ? JSON.parse(importiSalvati) : [];

          const lavorazioniOrdinate = voci
            .map((id: string) => data?.find((voce: any) => voce.id === id))
            .filter(Boolean)
            .map((voce: any) => {
              const importoModificato = importiModificati.find(
                (item) => item.id === voce.id
              );

              return {
                id: voce.id,
                nome: voce.nome || "",
                descrizione: voce.descrizione || "",
                categoria: voce.categoria || "",
                macrocategoria: voce.macrocategoria || "Progettazione",
                importo:
                  importoModificato?.importo !== undefined
                    ? finalizzaInputImporto(importoModificato.importo)
                    : finalizzaInputImporto(voce.importo || 0),
              };
            });

          setLavorazioni(lavorazioniOrdinate);
        }
      }

      const datiCliente = localStorage.getItem("datiClientePreventivo");

      if (datiCliente) {
        setCliente(JSON.parse(datiCliente));
      }

      const anno = new Date().getFullYear().toString().slice(-2);

      const { data: ultimoPreventivo, error: erroreProgressivo } = await supabase
        .from("preventivi")
        .select("numero")
        .like("numero", `${anno}%`)
        .order("numero", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (erroreProgressivo) {
        console.error(erroreProgressivo);
        setNumeroPreventivo(`${anno}001`);
        return;
      }

      const ultimoNumero = ultimoPreventivo?.numero
        ? Number(String(ultimoPreventivo.numero).slice(2))
        : 0;

      const prossimoProgressivo = ultimoNumero + 1;

      setNumeroPreventivo(
        `${anno}${prossimoProgressivo.toString().padStart(3, "0")}`
      );
    }

    caricaDatiPreventivo();
  }, []);

  useEffect(() => {
    const datiSalvati = localStorage.getItem(STEP3_STORAGE_KEY);

    if (!datiSalvati) return;

    try {
      const dati = JSON.parse(datiSalvati);

      if (typeof dati.scontoPercentuale === "string") {
        setScontoPercentuale(dati.scontoPercentuale);
      }

      if (typeof dati.scontoImporto === "string") {
        setScontoImporto(finalizzaInputImporto(dati.scontoImporto));
      }

      if (dati.pagamento) {
        setPagamento(dati.pagamento);
      }

      if (typeof dati.modificaImporti === "boolean") {
        setModificaImporti(dati.modificaImporti);
      }
    } catch (error) {
      console.error("Errore caricamento dati temporanei step 3:", error);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      STEP3_STORAGE_KEY,
      JSON.stringify({
        scontoPercentuale,
        scontoImporto,
        pagamento,
        modificaImporti,
      })
    );
  }, [scontoPercentuale, scontoImporto, pagamento, modificaImporti]);

  const lavorazioniRaggruppate = useMemo(() => {
    return lavorazioni.reduce<Record<string, Lavorazione[]>>((gruppi, voce) => {
      const macro = voce.macrocategoria || "Progettazione";

      if (!gruppi[macro]) {
        gruppi[macro] = [];
      }

      gruppi[macro].push(voce);
      return gruppi;
    }, {});
  }, [lavorazioni]);

  const haProgettazione = lavorazioni.some(
    (voce) => voce.macrocategoria === "Progettazione"
  );

  const haRealizzazione = lavorazioni.some(
    (voce) => voce.macrocategoria === "Realizzazione"
  );

  const haChiusura = lavorazioni.some(
    (voce) => voce.macrocategoria === "Chiusura dei lavori"
  );

  useEffect(() => {
    const fasi = [
      { key: "progettazione", attiva: haProgettazione },
      { key: "realizzazione", attiva: haRealizzazione },
      { key: "chiusura", attiva: haChiusura },
    ];

    const fasiAttive = fasi.filter((fase) => fase.attiva);
    const numeroFasi = fasiAttive.length;
    const totaleDaDividere = 95;

    let quote: number[] = [];

    if (numeroFasi > 0) {
      const quotaBase = Math.floor(totaleDaDividere / numeroFasi / 5) * 5;
      const totaleBase = quotaBase * numeroFasi;
      const resto = totaleDaDividere - totaleBase;

      quote = Array(numeroFasi).fill(quotaBase);
      quote[numeroFasi - 1] += resto;
    }

    let indice = 0;

    const nuovoPagamento = {
      anticipo: 5,
      progettazione: 0,
      realizzazione: 0,
      chiusura: 0,
    };

    fasi.forEach((fase) => {
      if (fase.attiva) {
        nuovoPagamento[fase.key as keyof typeof nuovoPagamento] =
          quote[indice];

        indice++;
      }
    });

    setPagamento(nuovoPagamento);
  }, [haProgettazione, haRealizzazione, haChiusura]);

  function aggiornaImporto(id: string, nuovoImporto: string) {
    setLavorazioni((correnti) => {
      const aggiornate = correnti.map((voce) =>
        voce.id === id ? { ...voce, importo: nuovoImporto } : voce
      );

      localStorage.setItem(
        "lavorazioniStep3Importi",
        JSON.stringify(
          aggiornate.map((voce) => ({
            id: voce.id,
            importo: parseImporto(voce.importo),
          }))
        )
      );

      return aggiornate;
    });
  }

  function aggiornaPagamento(campo: keyof typeof pagamento, valore: string) {
    setPagamento((corrente) => ({
      ...corrente,
      [campo]: Number(valore),
    }));
  }

  function formatEuro(valore: number | string) {
    return parseImporto(valore).toLocaleString("it-IT", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function formatPercentuale(valore: number) {
    return valore.toLocaleString("it-IT", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  }

  const imponibile = lavorazioni.reduce(
    (totale, voce) => totale + parseImporto(voce.importo),
    0
  );

  const lavorazioniNumeriche = lavorazioni.map((voce) => ({
    ...voce,
    importo: parseImporto(voce.importo),
  }));

  const scontoPercentualeNumero =
    scontoPercentuale === "" ? 0 : Number(scontoPercentuale);

  const scontoImportoNumero =
    scontoImporto === "" ? 0 : parseImporto(scontoImporto);

  const scontoDaPercentuale = imponibile * (scontoPercentualeNumero / 100);

  const scontoNumero = scontoDaPercentuale + scontoImportoNumero;

  const imponibileScontato = Math.max(imponibile - scontoNumero, 0);

  const cassa = imponibileScontato * 0.04;

  const iva = (imponibileScontato + cassa) * 0.22;

  const totale = imponibileScontato + cassa + iva;

  const totalePercentualePagamento =
    pagamento.anticipo +
    pagamento.progettazione +
    pagamento.realizzazione +
    pagamento.chiusura;

  function controllaPercentualePagamento() {
    if (totalePercentualePagamento > 100) {
      setErrorePagamento(true);
      return false;
    }

    return true;
  }

  async function anteprimaPDF() {
    if (!controllaPercentualePagamento()) return;

    const blob = await pdf(
      <PreventivoPDF
        cliente={cliente}
        lavorazioni={lavorazioniNumeriche}
        imponibile={imponibile}
        cassa={cassa}
        iva={iva}
        sconto={scontoNumero}
        totale={totale}
        numeroPreventivo={numeroPreventivo}
        pagamento={pagamento}
      />
    ).toBlob();

    const url = URL.createObjectURL(blob);
    setAnteprimaUrl(url);
  }

  async function salvaEChiudi() {
    if (!controllaPercentualePagamento()) return;

    const { error } = await supabase.from("preventivi").insert([
      {
        numero: numeroPreventivo,
        data: new Date().toLocaleDateString("it-IT"),
        cliente: cliente.cliente,
        oggetto: cliente.oggetto,
        imponibile,
        cassa,
        iva,
        sconto: scontoNumero,
        totale,
        lavorazioni: lavorazioniNumeriche,
        pagamento,
      },
    ]);

    if (error) {
      console.error("Errore Supabase:", error);
      alert(`Errore nel salvataggio del preventivo:\n\n${error.message}`);
      return;
    }

    localStorage.removeItem("datiClientePreventivo");
    localStorage.removeItem("lavorazioniSelezionate");
    localStorage.removeItem(STEP3_STORAGE_KEY);
    localStorage.removeItem("lavorazioniStep3Importi");

    const blob = await pdf(
      <PreventivoPDF
        cliente={cliente}
        lavorazioni={lavorazioniNumeriche}
        imponibile={imponibile}
        cassa={cassa}
        iva={iva}
        sconto={scontoNumero}
        totale={totale}
        numeroPreventivo={numeroPreventivo}
        pagamento={pagamento}
      />
    ).toBlob();

    saveAs(blob, `Preventivo ${numeroPreventivo} - ${cliente.cliente}.pdf`);

    if (anteprimaUrl) {
      URL.revokeObjectURL(anteprimaUrl);
      setAnteprimaUrl(null);
    }

    window.location.href = "/";
  }

  function vaiIndietro() {
    window.location.href = "/preventivo/nuovo/step2";
  }

  return (
    <LayoutApp>
      <div>
        <div className="flex justify-between items-center gap-4 mb-6">
          <div>
            <h2 className="page-title">Nuovo preventivo</h2>

            <p className="text-[15px] text-[#D79D06] mt-1">
              Step 3 di 3 — Riepilogo finale
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={vaiIndietro}
              className="border border-gray-300 text-[#2B2F5E] px-5 py-3 rounded-md text-sm font-medium bg-transparent hover:bg-[#e8e8e8] transition cursor-pointer"
            >
              Indietro
            </button>

            <button
              type="button"
              onClick={anteprimaPDF}
              className="border border-gray-300 text-[#2B2F5E] px-5 py-3 rounded-md text-sm font-medium bg-transparent hover:bg-[#e8e8e8] transition cursor-pointer"
            >
              Anteprima PDF
            </button>

            <button
              type="button"
              onClick={salvaEChiudi}
              className="bg-[#64B445] text-white px-5 py-3 rounded-md text-sm font-medium hover:bg-[#5AA03E] transition cursor-pointer"
            >
              Genera PDF
            </button>
          </div>
        </div>

        <div className="mb-3">
          <Card title="Dati cliente">
            <Info label="Cliente" value={cliente.cliente} />
            <Info label="P. IVA / C.F." value={cliente.piva} />
            <Info label="Indirizzo" value={cliente.indirizzo} />
            <Info label="Comune" value={cliente.comune} />
            <Info label="PEC" value={cliente.pec} />
            <Info label="Email" value={cliente.email} />
            <Info label="Telefono" value={cliente.telefono} />
            <Info label="Referente" value={cliente.referente} />

            <div className="md:col-span-2">
              <Info label="Oggetto dell’incarico" value={cliente.oggetto} />
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 mb-3">
          <Card title="Modalità di pagamento">
            <PagamentoInput
              label="Anticipo"
              value={pagamento.anticipo}
              onChange={(value) => aggiornaPagamento("anticipo", value)}
            />

            <PagamentoInput
              label="Termine fase di progettazione"
              value={pagamento.progettazione}
              disabled={!haProgettazione}
              onChange={(value) => aggiornaPagamento("progettazione", value)}
            />

            <PagamentoInput
              label="Termine fase di realizzazione"
              value={pagamento.realizzazione}
              disabled={!haRealizzazione}
              onChange={(value) => aggiornaPagamento("realizzazione", value)}
            />

            <PagamentoInput
              label="Chiusura dei lavori"
              value={pagamento.chiusura}
              disabled={!haChiusura}
              onChange={(value) => aggiornaPagamento("chiusura", value)}
            />

            <div className="md:col-span-2 border-t border-gray-200 pt-4">
              <div className="flex justify-between">
                <span className="text-[13px] text-gray-500">
                  Totale percentuali
                </span>

                <span
                  className={`text-[15px] font-semibold ${
                    totalePercentualePagamento > 100
                      ? "text-red-600"
                      : "text-[#2B2F5E]"
                  }`}
                >
                  {formatPercentuale(totalePercentualePagamento)}%
                </span>
              </div>
            </div>
          </Card>

          <Card title="Riepilogo economico">
            <RigaTotale label="Imponibile" value={`€ ${formatEuro(imponibile)}`} />

            {scontoNumero > 0 && (
              <>
                <RigaTotale
                  label="Sconto applicato sull'imponibile"
                  value={`- € ${formatEuro(scontoNumero)}`}
                  danger
                />

                <RigaTotale
                  label="Imponibile scontato"
                  value={`€ ${formatEuro(imponibileScontato)}`}
                />
              </>
            )}

            <RigaTotale label="Cassa 4%" value={`€ ${formatEuro(cassa)}`} />
            <RigaTotale label="IVA 22%" value={`€ ${formatEuro(iva)}`} />

            <div className="md:col-span-2 border-t border-gray-200 pt-4 mt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Campo
                  label="Sconto %"
                  type="number"
                  value={scontoPercentuale}
                  onChange={setScontoPercentuale}
                />

                <CampoImporto
                  label="Sconto €"
                  value={scontoImporto}
                  onChange={setScontoImporto}
                />
              </div>
            </div>

            <div className="md:col-span-2 border-t border-gray-200 pt-4 mt-2">
              <div className="flex justify-between items-center">
                <span className="text-[17px] font-semibold text-[#2B2F5E]">
                  Totale
                </span>

                <span className="text-[22px] font-bold text-[#64B445]">
                  € {formatEuro(totale)}
                </span>
              </div>
            </div>
          </Card>
        </div>

        <div className="bg-white border border-gray-200 shadow-sm overflow-hidden rounded-sm mb-3">
          <div className="px-4 py-3 border-b border-gray-200 bg-[#FAFAFA] flex justify-between items-center gap-4">
            <div>
              <h3 className="text-[17px] font-normal text-[#2B2F5E]">
                Prestazioni professionali
              </h3>

              <p className="text-[15px] text-[#D79D06] mt-0">
                Lavorazioni selezionate per il preventivo
              </p>
            </div>

            <button
              type="button"
              onClick={() => setModificaImporti((prev) => !prev)}
              className="border border-gray-300 text-[#2B2F5E] px-4 py-2 rounded-md text-sm font-medium bg-transparent hover:bg-white hover:border-[#64B445] transition cursor-pointer"
            >
              {modificaImporti ? "Salva importi" : "Modifica importi"}
            </button>
          </div>

          <div className="p-4 space-y-6">
            {lavorazioni.length === 0 ? (
              <p className="text-center text-gray-500 py-6">
                Nessuna lavorazione selezionata.
              </p>
            ) : (
              MACROCATEGORIE.map((macrocategoria) => {
                const voci = lavorazioniRaggruppate[macrocategoria] || [];

                if (voci.length === 0) return null;

                return (
                  <div key={macrocategoria}>
                    <h4 className="text-[17px] font-semibold text-[#2B2F5E] mb-3">
                      {macrocategoria}
                    </h4>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                      {voci.map((voce) => (
                        <div
                          key={voce.id}
                          className="bg-white border border-gray-200 shadow-sm overflow-hidden rounded-sm p-4"
                        >
                          <div className="flex justify-between items-start gap-4">
                            <div className="leading-tight">
                              <p className="text-[15px] font-normal text-[#2B2F5E]">
                                {voce.nome}
                              </p>

                              {voce.categoria && (
                                <p className="text-[13px] text-[#D79D06] mt-0">
                                  {voce.categoria}
                                </p>
                              )}

                              {voce.descrizione && (
                                <p className="text-[13px] text-gray-500 mt-2 leading-snug whitespace-pre-line">
                                  {voce.descrizione}
                                </p>
                              )}
                            </div>

                            <div className="text-right">
                              {modificaImporti ? (
                                <ImportoInput
                                  compact
                                  value={String(voce.importo)}
                                  onChange={(value) =>
                                    aggiornaImporto(voce.id, value)
                                  }
                                  className="w-40"
                                />
                              ) : (
                                <p className="text-[15px] text-[#2B2F5E] whitespace-nowrap">
                                  € {formatEuro(voce.importo)}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {errorePagamento && (
        <Popup title="Attenzione" onClose={() => setErrorePagamento(false)}>
          <p className="text-sm text-gray-600 mb-8">
            Controllare la percentuale totale della modalità di pagamento.
          </p>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setErrorePagamento(false)}
              className="bg-[#64B445] text-white px-5 py-3 rounded-md text-sm font-medium hover:bg-[#5AA03E] transition cursor-pointer"
            >
              OK
            </button>
          </div>
        </Popup>
      )}

      {anteprimaUrl && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-md shadow-2xl w-full max-w-6xl h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 border-b text-[#2B2F5E]">
              <h3 className="text-2xl font-semibold">Anteprima preventivo</h3>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={salvaEChiudi}
                  className="bg-[#64B445] text-white px-5 py-3 rounded-md text-sm font-medium hover:bg-[#5AA03E] transition cursor-pointer"
                >
                  Genera PDF
                </button>

                <button
                  type="button"
                  onClick={() => {
                    URL.revokeObjectURL(anteprimaUrl);
                    setAnteprimaUrl(null);
                  }}
                  className="border border-gray-300 text-[#2B2F5E] px-5 py-3 rounded-md text-sm font-medium bg-transparent hover:bg-[#e8e8e8] transition cursor-pointer"
                >
                  Chiudi
                </button>
              </div>
            </div>

            <iframe src={anteprimaUrl} className="w-full flex-1" />
          </div>
        </div>
      )}
    </LayoutApp>
  );
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-gray-200 shadow-sm overflow-hidden rounded-sm">
      <div className="px-4 py-3 border-b border-gray-200 bg-[#FAFAFA]">
        <h3 className="text-[17px] font-normal text-[#2B2F5E]">{title}</h3>

        {subtitle && (
          <p className="text-[15px] text-[#D79D06] mt-0">{subtitle}</p>
        )}
      </div>

      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {children}
      </div>
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string | number | null;
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.12em] text-gray-400 font-medium">
        {label}
      </p>

      <p className="mt-0.5 text-[13px] text-[#2B2F5E] font-normal">
        {value || "-"}
      </p>
    </div>
  );
}

function RigaTotale({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="md:col-span-2 flex justify-between items-center">
      <span className="text-[13px] text-gray-500">{label}</span>

      <span
        className={`text-[15px] font-medium ${
          danger ? "text-red-600" : "text-[#2B2F5E]"
        }`}
      >
        {value}
      </span>
    </div>
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

function CampoImporto({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2 text-[#2B2F5E]">
        {label}
      </label>

      <ImportoInput value={value} onChange={onChange} />
    </div>
  );
}

function PagamentoInput({
  label,
  descrizione,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  descrizione?: string;
  value: number;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className={disabled ? "opacity-40" : ""}>
      <label className="block text-sm font-medium mb-1 text-[#2B2F5E]">
        {label}
      </label>

      {descrizione && (
        <p className="text-[12px] text-gray-500 mb-2">{descrizione}</p>
      )}

      <input
        type="number"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-md px-4 py-3 bg-transparent outline-none transition focus:bg-white focus:border-[#64B445] focus:shadow-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
      />
    </div>
  );
}

function Popup({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-md shadow-2xl w-full max-w-xl p-8">
        <div className="flex justify-between items-start mb-6">
          <h3 className="text-2xl font-semibold text-[#2B2F5E]">{title}</h3>

          <button
            type="button"
            onClick={onClose}
            className="text-2xl text-gray-400 hover:text-[#2B2F5E] cursor-pointer"
          >
            ×
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}
