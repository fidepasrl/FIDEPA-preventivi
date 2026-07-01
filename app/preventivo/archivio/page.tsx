"use client";

import { useEffect, useState } from "react";
import LayoutApp from "@/components/LayoutApp";
import { pdf } from "@react-pdf/renderer";
import { saveAs } from "file-saver";
import PreventivoPDF from "@/components/pdf/PreventivoPDF";
import { supabase } from "@/lib/supabase";
import { finalizzaInputImporto, parseImporto } from "@/lib/importi";

type Preventivo = {
  numero: string;
  data: string;
  cliente: string;
  oggetto: string;
  imponibile: number;
  cassa: number;
  iva: number;
  sconto: number;
  totale: number;
  lavorazioni: any[];
  pagamento?: any;
  created_at?: string;
};

export default function ArchivioPreventivi() {
  const [preventivi, setPreventivi] = useState<Preventivo[]>([]);
  const [caricamento, setCaricamento] = useState(true);
  const [anteprimaUrl, setAnteprimaUrl] = useState<string | null>(null);
  const [preventivoDaEliminare, setPreventivoDaEliminare] =
    useState<Preventivo | null>(null);

  useEffect(() => {
    caricaPreventivi();
  }, []);

  async function caricaPreventivi() {
    setCaricamento(true);

    const { data, error } = await supabase
      .from("preventivi")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Errore caricamento preventivi:", error);
      setPreventivi([]);
    } else {
      setPreventivi(data || []);
    }

    setCaricamento(false);
  }

  function formatEuro(valore: number | string) {
    return parseImporto(valore).toLocaleString("it-IT", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  async function creaBlobPDF(preventivo: Preventivo) {
    return await pdf(
      <PreventivoPDF
        cliente={{
          cliente: preventivo.cliente,
          oggetto: preventivo.oggetto,
        }}
        lavorazioni={preventivo.lavorazioni}
        imponibile={preventivo.imponibile}
        cassa={preventivo.cassa}
        iva={preventivo.iva}
        sconto={preventivo.sconto}
        totale={preventivo.totale}
        numeroPreventivo={preventivo.numero}
        pagamento={preventivo.pagamento}
      />
    ).toBlob();
  }

  function duplicaPreventivo(preventivo: Preventivo) {
    const datiCliente = {
      cliente:
        typeof preventivo.cliente === "string"
          ? preventivo.cliente
          : (preventivo.cliente as any)?.cliente || "",
      piva: (preventivo as any).piva || (preventivo.cliente as any)?.piva || "",
      indirizzo:
        (preventivo as any).indirizzo ||
        (preventivo.cliente as any)?.indirizzo ||
        "",
      comune:
        (preventivo as any).comune ||
        (preventivo.cliente as any)?.comune ||
        "",
      pec: (preventivo as any).pec || (preventivo.cliente as any)?.pec || "",
      email:
        (preventivo as any).email || (preventivo.cliente as any)?.email || "",
      telefono:
        (preventivo as any).telefono ||
        (preventivo.cliente as any)?.telefono ||
        "",
      referente:
        (preventivo as any).referente ||
        (preventivo.cliente as any)?.referente ||
        "",
      oggetto: preventivo.oggetto || "",
    };

    const lavorazioni = preventivo.lavorazioni || [];

    localStorage.setItem("datiClientePreventivo", JSON.stringify(datiCliente));

    localStorage.setItem(
      "lavorazioniSelezionate",
      JSON.stringify(lavorazioni.map((voce: any) => voce.id).filter(Boolean))
    );

    localStorage.setItem(
      "lavorazioniStep3Importi",
      JSON.stringify(
        lavorazioni.map((voce: any) => ({
          id: voce.id,
          importo: parseImporto(voce.importo),
        }))
      )
    );

    localStorage.setItem(
      "preventivoNuovoStep3",
      JSON.stringify({
        scontoPercentuale: "",
        scontoImporto: finalizzaInputImporto(preventivo.sconto),
        pagamento: preventivo.pagamento || {
          anticipo: 5,
          progettazione: 0,
          realizzazione: 0,
          chiusura: 0,
        },
        modificaImporti: true,
      })
    );

    window.location.href = "/preventivo/nuovo/step1";
  }

  async function visualizzaPDF(preventivo: Preventivo) {
    const blob = await creaBlobPDF(preventivo);
    const url = URL.createObjectURL(blob);
    setAnteprimaUrl(url);
  }

  async function scaricaPDF(preventivo: Preventivo) {
    const blob = await creaBlobPDF(preventivo);

    saveAs(
      blob,
      `Preventivo ${preventivo.numero} - ${preventivo.cliente}.pdf`
    );
  }

  async function eliminaPreventivo() {
    if (!preventivoDaEliminare) return;

    const { error } = await supabase
      .from("preventivi")
      .delete()
      .eq("numero", preventivoDaEliminare.numero);

    if (error) {
      console.error("Errore eliminazione preventivo:", error);
      alert("Errore durante l'eliminazione del preventivo.");
      return;
    }

    setPreventivi((correnti) =>
      correnti.filter(
        (preventivo) => preventivo.numero !== preventivoDaEliminare.numero
      )
    );

    setPreventivoDaEliminare(null);
  }

  return (
    <LayoutApp>
      <div>
        <div className="flex justify-between items-center gap-4 mb-6">
          <h2 className="page-title">Archivio preventivi</h2>

        </div>

        {caricamento ? (
          <p className="text-center text-gray-500 py-10">
            Caricamento archivio...
          </p>
        ) : preventivi.length === 0 ? (
          <p className="text-center text-gray-500 py-10">
            Nessun preventivo archiviato.
          </p>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {preventivi.map((preventivo) => (
              <div
                key={preventivo.numero}
                className="bg-white border border-gray-200 shadow-sm rounded-sm overflow-hidden"
              >
                <div className="px-4 py-3 border-b border-gray-200 bg-[#FAFAFA] flex justify-between items-start gap-4">
                  <div className="leading-tight">
                    <h3 className="text-[17px] font-normal text-[#2B2F5E]">
                      Preventivo n. {preventivo.numero}
                    </h3>

                    <p className="text-[15px] text-[#D79D06] mt-0">
                      {preventivo.cliente || "Cliente non indicato"}
                    </p>
                  </div>

                  <p className="text-[13px] text-gray-500 whitespace-nowrap">
                    {preventivo.data || "-"}
                  </p>
                </div>

                <div className="p-4">
                  <div className="mb-5">
                    <p className="text-[11px] uppercase tracking-[0.12em] text-gray-400 font-medium">
                      Oggetto
                    </p>

                    <p className="mt-0.5 text-[13px] text-[#2B2F5E] font-normal line-clamp-2">
                      {preventivo.oggetto || "-"}
                    </p>
                  </div>

                  <div className="flex justify-between items-end gap-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.12em] text-gray-400 font-medium">
                        Totale
                      </p>

                      <p className="text-[22px] font-bold text-[#64B445]">
                        € {formatEuro(preventivo.totale)}
                      </p>
                    </div>

                    <div className="flex gap-2">

                      <button
                        type="button"
                        title="Visualizza"
                        onClick={() => visualizzaPDF(preventivo)}
                        className="w-10 h-10 border border-gray-300 text-[#2B2F5E] rounded-md text-lg font-medium bg-transparent hover:bg-white hover:border-[#64B445] transition cursor-pointer flex items-center justify-center"
                      >
                        👁
                      </button>

                      <button
                        type="button"
                        title="Scarica"
                        onClick={() => scaricaPDF(preventivo)}
                        className="w-10 h-10 border border-gray-300 text-[#2B2F5E] rounded-md text-xl font-medium bg-transparent hover:bg-white hover:border-[#64B445] transition cursor-pointer flex items-center justify-center"
                      >
                        ↓
                      </button>

                      <button
                        type="button"
                        onClick={() => duplicaPreventivo(preventivo)}
                        className="border border-gray-300 text-[#2B2F5E] w-10 h-10 rounded-md bg-transparent hover:bg-[#e8e8e8] transition cursor-pointer flex items-center justify-center"
                        title="Duplica preventivo"
                      >
                        ⧉
                      </button>

                      <button
                        type="button"
                        title="Elimina"
                        onClick={() => setPreventivoDaEliminare(preventivo)}
                        className="bg-red-600 text-white w-10 h-10 rounded-md text-xl font-light hover:bg-red-700 hover:scale-105 transition flex items-center justify-center shadow-sm cursor-pointer"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {anteprimaUrl && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-md shadow-2xl w-full max-w-6xl h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 border-b text-[#2B2F5E]">
              <h3 className="text-2xl font-semibold">Anteprima preventivo</h3>

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

            <iframe src={anteprimaUrl} className="w-full flex-1" />
          </div>
        </div>
      )}

      {preventivoDaEliminare && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-md shadow-2xl w-full max-w-xl p-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-semibold text-[#2B2F5E]">
                  Elimina preventivo
                </h3>

                <p className="text-sm text-gray-500 mt-2">
                  Stai per eliminare definitivamente questo preventivo
                  dall’archivio.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setPreventivoDaEliminare(null)}
                className="text-2xl text-gray-400 hover:text-[#2B2F5E] cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="border border-gray-200 rounded-md p-4 bg-[#F2F2F2] mb-6">
              <p className="text-lg text-[#2B2F5E]">
                Preventivo n. {preventivoDaEliminare.numero}
              </p>

              <p className="text-sm text-[#D79D06] mt-1">
                {preventivoDaEliminare.cliente}
              </p>
            </div>

            <p className="text-sm text-gray-600 mb-8">
              Vuoi procedere con l'eliminazione?
            </p>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPreventivoDaEliminare(null)}
                className="border border-gray-300 text-[#2B2F5E] px-5 py-3 rounded-md text-sm font-medium bg-transparent hover:bg-[#e8e8e8] transition cursor-pointer"
              >
                Annulla
              </button>

              <button
                type="button"
                onClick={eliminaPreventivo}
                className="bg-red-600 text-white px-5 py-3 rounded-md text-sm font-medium hover:bg-red-700 transition cursor-pointer"
              >
                Elimina
              </button>
            </div>
          </div>
        </div>
      )}
    </LayoutApp>
  );
}
