"use client";

import { useEffect, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { saveAs } from "file-saver";
import PreventivoPDF from "@/components/pdf/PreventivoPDF";
import { supabase } from "@/lib/supabase";

export default function ArchivioPreventivi() {
  const [preventivi, setPreventivi] = useState<any[]>([]);

  useEffect(() => {
    async function caricaPreventivi() {
      const { data, error } = await supabase
        .from("preventivi")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setPreventivi(data);
      }
    }

    caricaPreventivi();
  }, []);

  function formatEuro(valore: number) {
    return valore.toLocaleString("it-IT", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  async function visualizzaPDF(preventivo: any) {
    const blob = await pdf(
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
      />
    ).toBlob();

    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  }

  async function scaricaPDF(preventivo: any) {
    const blob = await pdf(
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
      />
    ).toBlob();

    saveAs(
      blob,
      `Preventivo ${preventivo.numero} - ${preventivo.cliente}.pdf`
    );
  }

  async function eliminaPreventivo(numero: string) {
    const conferma = confirm(
      "Vuoi eliminare definitivamente questo preventivo dall'archivio?"
    );

    if (!conferma) return;

    const { error } = await supabase
      .from("preventivi")
      .delete()
      .eq("numero", numero);

    if (error) {
      console.error(error);
      alert("Errore durante l'eliminazione del preventivo");
      return;
    }

    const nuovoArchivio = preventivi.filter(
      (preventivo) => preventivo.numero !== numero
    );

    setPreventivi(nuovoArchivio);
  }

  return (
    <main className="min-h-screen bg-[#2B2E65] p-10 text-white">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <p className="text-sm opacity-70">
              FIDEPA Preventivi - Versione 1.0
            </p>
            <h1 className="text-4xl font-bold mt-2">Archivio Preventivi</h1>
          </div>

          <a
            href="/"
            className="border border-white px-5 py-3 rounded-xl hover:bg-white hover:text-[#2B2E65] transition"
          >
            Home
          </a>
        </div>

        <div className="bg-white text-[#2B2E65] rounded-3xl shadow-2xl p-8">
          {preventivi.length === 0 ? (
            <p>Nessun preventivo archiviato.</p>
          ) : (
            <div className="space-y-4">
              {preventivi.map((preventivo) => (
                <div
                  key={preventivo.numero}
                  className="border border-[#2B2E65]/20 rounded-2xl p-5"
                >
                  <div className="flex justify-between gap-6">
                    <div>
                      <p className="text-xl font-bold">
                        Preventivo n. {preventivo.numero}
                      </p>
                      <p>{preventivo.cliente}</p>
                      <p className="opacity-70">{preventivo.oggetto}</p>
                    </div>

                    <div className="text-right">
                      <p>{preventivo.data}</p>
                      <p className="text-xl font-bold">
                        € {formatEuro(preventivo.totale)}
                      </p>

                      <div className="flex gap-3 justify-end mt-4">

                        <button
                          onClick={() => visualizzaPDF(preventivo)}
                          className="px-4 py-2 rounded-xl bg-gray-700 text-white font-semibold"
                        >
                          Visualizza
                        </button>

                        <button
                          onClick={() => scaricaPDF(preventivo)}
                          className="px-4 py-2 rounded-xl bg-[#2B2E65] text-white font-semibold"
                        >
                          Scarica PDF
                        </button>

                        <button
                          onClick={() => eliminaPreventivo(preventivo.numero)}
                          className="px-4 py-2 rounded-xl bg-red-700 text-white font-semibold"
                        >
                          Elimina
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}