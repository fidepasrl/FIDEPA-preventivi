"use client";

import { useEffect, useMemo, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { saveAs } from "file-saver";
import PreventivoPDF from "@/components/pdf/PreventivoPDF";
import { supabase } from "@/lib/supabase";

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
  importo: number;
};

const MACROCATEGORIE: MacroCategoria[] = [
  "Progettazione",
  "Realizzazione",
  "Chiusura dei lavori",
];

export default function PreventivoPage() {
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

      const { data, error } = await supabase
        .from("lavorazioni")
        .select("id, nome, descrizione, categoria, macrocategoria, importo")
        .in("id", voci);

      if (!error && data) {
        const lavorazioniOrdinate = voci
          .map((id: string) => data.find((voce: any) => voce.id === id))
          .filter(Boolean)
          .map((voce: any) => ({
            id: voce.id,
            nome: voce.nome || "",
            descrizione: voce.descrizione || "",
            categoria: voce.categoria || "",
            macrocategoria: voce.macrocategoria || "Progettazione",
            importo: Number(voce.importo || 0),
          }));

        setLavorazioni(lavorazioniOrdinate);
      }

      const datiCliente = localStorage.getItem("datiClientePreventivo");

      if (datiCliente) {
        setCliente(JSON.parse(datiCliente));
      }

      const anno = new Date().getFullYear().toString().slice(-2);

      const { data: ultimoPreventivo, error: erroreProgressivo } =
        await supabase
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
    setLavorazioni((correnti) =>
      correnti.map((voce) =>
        voce.id === id ? { ...voce, importo: Number(nuovoImporto) } : voce
      )
    );
  }

  function aggiornaPagamento(campo: keyof typeof pagamento, valore: string) {
    setPagamento((corrente) => ({
      ...corrente,
      [campo]: Number(valore),
    }));
  }

  function formatEuro(valore: number) {
    return valore.toLocaleString("it-IT", {
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
    (totale, voce) => totale + voce.importo,
    0
  );

  const cassa = imponibile * 0.04;
  const iva = (imponibile + cassa) * 0.22;

  const scontoPercentualeNumero =
    scontoPercentuale === "" ? 0 : Number(scontoPercentuale);

  const scontoImportoNumero =
    scontoImporto === "" ? 0 : Number(scontoImporto);

  const totalePrimaDelloSconto = imponibile + cassa + iva;

  const scontoDaPercentuale =
    totalePrimaDelloSconto * (scontoPercentualeNumero / 100);

  const scontoNumero = scontoDaPercentuale + scontoImportoNumero;

  const totale = totalePrimaDelloSconto - scontoNumero;

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
    if (!controllaPercentualePagamento()) {
      return;
    }

    const blob = await pdf(
      <PreventivoPDF
        cliente={cliente}
        lavorazioni={lavorazioni}
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
    if (!controllaPercentualePagamento()) {
      return;
    }

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
        lavorazioni,
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

    const blob = await pdf(
      <PreventivoPDF
        cliente={cliente}
        lavorazioni={lavorazioni}
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

  return (
    <main className="min-h-screen bg-[#2B2E65] p-10 text-white">
      {errorePagamento && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-md w-full text-[#2B2E65]">
            <h2 className="text-2xl font-bold mb-4">Attenzione</h2>

            <p className="mb-6">
              Controllare la percentuale totale della modalità di pagamento.
            </p>

            <div className="flex justify-end">
              <button
                onClick={() => setErrorePagamento(false)}
                className="bg-[#2B2E65] text-white px-5 py-2 rounded-xl cursor-pointer"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {anteprimaUrl && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 border-b text-[#2B2E65]">
              <h2 className="text-xl font-bold">Anteprima preventivo</h2>

              <div className="flex gap-3">
                <button
                  onClick={salvaEChiudi}
                  className="px-4 py-2 rounded-xl bg-green-700 text-white font-semibold cursor-pointer"
                >
                  Genera PDF e chiudi
                </button>

                <button
                  onClick={() => {
                    URL.revokeObjectURL(anteprimaUrl);
                    setAnteprimaUrl(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-[#2B2E65] cursor-pointer hover:bg-[#2B2E65] hover:text-white transition"
                >
                  Chiudi
                </button>
              </div>
            </div>

            <iframe src={anteprimaUrl} className="w-full flex-1" />
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <p className="text-sm opacity-70">
              FIDEPA Preventivi - Versione 1.0
            </p>

            <h1 className="text-4xl font-bold mt-2">
              Preventivo Professionale
            </h1>

            <p className="opacity-80 mt-2">
              Riepilogo finale del preventivo
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="opacity-70">Preventivo n. {numeroPreventivo}</p>
              <p className="font-bold">
                {new Date().toLocaleDateString("it-IT")}
              </p>
            </div>

            <button
              onClick={() => {
                const conferma = confirm(
                  "Tutti i dati del preventivo verranno cancellati. Continuare?"
                );

                if (conferma) {
                  localStorage.removeItem("datiClientePreventivo");
                  localStorage.removeItem("lavorazioniSelezionate");
                  window.location.href = "/";
                }
              }}
              className="border border-white px-5 py-3 rounded-xl hover:bg-white hover:text-[#2B2E65] transition cursor-pointer"
            >
              Home
            </button>
          </div>
        </div>

        <div className="bg-white text-[#2B2E65] rounded-3xl shadow-2xl p-10">
          <h2 className="text-2xl font-bold mb-6">Cliente</h2>

          <div className="space-y-2 mb-10">
            {cliente.cliente && (
              <p>
                <strong>Cliente:</strong> {cliente.cliente}
              </p>
            )}

            {cliente.piva && (
              <p>
                <strong>P.IVA / C.F.:</strong> {cliente.piva}
              </p>
            )}

            {cliente.indirizzo && (
              <p>
                <strong>Indirizzo:</strong> {cliente.indirizzo}
              </p>
            )}

            {cliente.comune && (
              <p>
                <strong>Comune:</strong> {cliente.comune}
              </p>
            )}

            {cliente.pec && (
              <p>
                <strong>PEC:</strong> {cliente.pec}
              </p>
            )}

            {cliente.email && (
              <p>
                <strong>Email:</strong> {cliente.email}
              </p>
            )}

            {cliente.telefono && (
              <p>
                <strong>Telefono:</strong> {cliente.telefono}
              </p>
            )}

            {cliente.referente && (
              <p>
                <strong>Referente:</strong> {cliente.referente}
              </p>
            )}

            {cliente.oggetto && (
              <p>
                <strong>Oggetto:</strong> {cliente.oggetto}
              </p>
            )}
          </div>

          <h2 className="text-2xl font-bold mb-4">
            Prestazioni Professionali
          </h2>

          <div className="border rounded-2xl overflow-hidden mb-10">
            <div className="grid grid-cols-12 bg-[#2B2E65] text-white font-bold p-4 items-center">
              <div className="col-span-9"></div>

              <div className="col-span-3 flex justify-end">
                <button
                  onClick={() => setModificaImporti(!modificaImporti)}
                  className="border border-white px-4 py-2 rounded-xl text-sm cursor-pointer hover:bg-white hover:text-[#2B2E65] transition"
                >
                  {modificaImporti ? "Salva Importi" : "Modifica Importi"}
                </button>
              </div>
            </div>

            {lavorazioni.length === 0 ? (
              <div className="p-4 border-t text-center opacity-70">
                Nessuna lavorazione selezionata.
              </div>
            ) : (
              MACROCATEGORIE.map((macrocategoria) => {
                const voci = lavorazioniRaggruppate[macrocategoria] || [];

                if (voci.length === 0) return null;

                return (
                  <div key={macrocategoria}>
                    <div className="bg-gray-100 px-4 py-3 border-t font-bold uppercase tracking-wide">
                      {macrocategoria}
                    </div>

                    {voci.map((voce) => (
                      <div
                        key={voce.id}
                        className="grid grid-cols-12 gap-4 p-4 border-t"
                      >
                        <div className="col-span-9">
                          <p className="font-semibold">{voce.nome}</p>

                          {voce.categoria && (
                            <p className="text-xs font-semibold opacity-60 mt-1">
                              {voce.categoria}
                            </p>
                          )}

                          {voce.descrizione && (
                            <p className="text-sm opacity-75 mt-2 leading-relaxed whitespace-pre-line">
                              {voce.descrizione}
                            </p>
                          )}
                        </div>

                        <div className="col-span-3 text-right font-semibold">
                          {modificaImporti ? (
                            <input
                              type="number"
                              value={voce.importo}
                              onChange={(e) =>
                                aggiornaImporto(voce.id, e.target.value)
                              }
                              className="border rounded-lg p-2 text-right w-32"
                            />
                          ) : (
                            <>€ {formatEuro(voce.importo)}</>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })
            )}
          </div>

          <div className="grid grid-cols-12 gap-10">
            <div className="col-span-6">
              <h2 className="text-xl font-bold mb-4">
                Modalità di pagamento
              </h2>

              <div className="border rounded-2xl overflow-hidden">
                <div className="grid grid-cols-12 bg-[#2B2E65] text-white font-bold p-3">
                  <div className="col-span-8">Fase</div>
                  <div className="col-span-4 text-right">Percentuale</div>
                </div>

                <div className="grid grid-cols-12 items-center gap-4 p-3 border-t">
                  <div className="col-span-8">
                    <p className="font-semibold">Anticipo</p>
                    <p className="text-xs opacity-70">
                      Da versare all'accettazione del preventivo
                    </p>
                  </div>

                  <div className="col-span-4 flex justify-end">
                    <input
                      type="number"
                      value={pagamento.anticipo}
                      onChange={(e) =>
                        aggiornaPagamento("anticipo", e.target.value)
                      }
                      className="border rounded-lg p-2 text-right w-24"
                    />
                  </div>
                </div>

                <div
                  className={`grid grid-cols-12 items-center gap-4 p-3 border-t ${
                    !haProgettazione ? "bg-gray-100 opacity-50" : ""
                  }`}
                >
                  <div className="col-span-8">
                    <p className="font-semibold">
                      Termine fase di progettazione
                    </p>
                  </div>

                  <div className="col-span-4 flex justify-end">
                    <input
                      type="number"
                      value={pagamento.progettazione}
                      disabled={!haProgettazione}
                      onChange={(e) =>
                        aggiornaPagamento("progettazione", e.target.value)
                      }
                      className={`border rounded-lg p-2 text-right w-24 ${
                        !haProgettazione ? "bg-gray-200 cursor-not-allowed" : ""
                      }`}
                    />
                  </div>
                </div>

                <div
                  className={`grid grid-cols-12 items-center gap-4 p-3 border-t ${
                    !haRealizzazione ? "bg-gray-100 opacity-50" : ""
                  }`}
                >
                  <div className="col-span-8">
                    <p className="font-semibold">
                      Termine fase di realizzazione
                    </p>
                  </div>

                  <div className="col-span-4 flex justify-end">
                    <input
                      type="number"
                      value={pagamento.realizzazione}
                      disabled={!haRealizzazione}
                      onChange={(e) =>
                        aggiornaPagamento("realizzazione", e.target.value)
                      }
                      className={`border rounded-lg p-2 text-right w-24 ${
                        !haRealizzazione ? "bg-gray-200 cursor-not-allowed" : ""
                      }`}
                    />
                  </div>
                </div>

                <div
                  className={`grid grid-cols-12 items-center gap-4 p-3 border-t ${
                    !haChiusura ? "bg-gray-100 opacity-50" : ""
                  }`}
                >
                  <div className="col-span-8">
                    <p className="font-semibold">
                      Termine fase di chiusura lavori
                    </p>
                  </div>

                  <div className="col-span-4 flex justify-end">
                    <input
                      type="number"
                      value={pagamento.chiusura}
                      disabled={!haChiusura}
                      onChange={(e) =>
                        aggiornaPagamento("chiusura", e.target.value)
                      }
                      className={`border rounded-lg p-2 text-right w-24 ${
                        !haChiusura ? "bg-gray-200 cursor-not-allowed" : ""
                      }`}
                    />
                  </div>
                </div>

                <div className="flex justify-between p-3 border-t font-bold">
                  <span>Totale percentuali</span>
                  <span
                    className={
                      totalePercentualePagamento > 100 ? "text-red-700" : ""
                    }
                  >
                    {formatPercentuale(totalePercentualePagamento)}%
                  </span>
                </div>
              </div>
            </div>

            <div className="col-span-6 max-w-md ml-auto space-y-3 w-full">
              <div className="flex justify-between">
                <span>Imponibile</span>
                <span>€ {formatEuro(imponibile)}</span>
              </div>

              <div className="flex justify-between">
                <span>Cassa Previdenziale 4%</span>
                <span>€ {formatEuro(cassa)}</span>
              </div>

              <div className="flex justify-between">
                <span>IVA 22%</span>
                <span>€ {formatEuro(iva)}</span>
              </div>

              <div className="flex justify-between items-center gap-3">
                <span>Sconto</span>

                <div className="flex gap-2">
                  <input
                    type="number"
                    value={scontoPercentuale}
                    onChange={(e) => setScontoPercentuale(e.target.value)}
                    placeholder="%"
                    className="border rounded-lg p-2 text-right w-24"
                  />

                  <input
                    type="number"
                    value={scontoImporto}
                    onChange={(e) => setScontoImporto(e.target.value)}
                    placeholder="€"
                    className="border rounded-lg p-2 text-right w-32"
                  />
                </div>
              </div>

              {scontoNumero > 0 && (
                <div className="flex justify-between text-red-700">
                  <span>Sconto applicato</span>
                  <span>- € {formatEuro(scontoNumero)}</span>
                </div>
              )}

              <div className="flex justify-between text-2xl font-bold border-t pt-4">
                <span>TOTALE</span>
                <span>€ {formatEuro(totale)}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-between mt-12">
            <a
              href="/preventivo/step2"
              className="px-6 py-3 rounded-xl border border-[#2B2E65] cursor-pointer"
            >
              Indietro
            </a>

            <div className="flex gap-4">
              <button
                onClick={anteprimaPDF}
                className="px-6 py-3 rounded-xl bg-[#2B2E65] text-white font-semibold cursor-pointer"
              >
                Anteprima PDF
              </button>

              <button
                onClick={salvaEChiudi}
                className="px-6 py-3 rounded-xl bg-green-700 text-white font-semibold cursor-pointer"
              >
                Genera PDF e chiudi
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}