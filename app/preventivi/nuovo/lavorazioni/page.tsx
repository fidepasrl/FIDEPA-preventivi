"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Lavorazione = {
  id: string;
  categoria: string;
  nome: string;
  descrizione: string;
  importo: number;
  ordine: number;
  categoria_ordine: number;
};

export default function LavorazioniPreventivo() {
  const [lavorazioni, setLavorazioni] = useState<Lavorazione[]>([]);
  const [selezionate, setSelezionate] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    caricaLavorazioni();

    const salvate = localStorage.getItem("lavorazioniSelezionate");

    if (salvate) {
      setSelezionate(JSON.parse(salvate));
    }
  }, []);

  async function caricaLavorazioni() {
    const { data, error } = await supabase
      .from("lavorazioni")
      .select("*")
      .order("categoria_ordine")
      .order("categoria")
      .order("ordine");

    if (!error && data) {
      setLavorazioni(data);
    }

    setLoading(false);
  }

  function toggleLavorazione(id: string) {
    let nuoveSelezionate: string[];

    if (selezionate.includes(id)) {
      nuoveSelezionate = selezionate.filter((item) => item !== id);
    } else {
      nuoveSelezionate = [...selezionate, id];
    }

    setSelezionate(nuoveSelezionate);
    localStorage.setItem(
      "lavorazioniSelezionate",
      JSON.stringify(nuoveSelezionate)
    );
  }

  const categorie = Array.from(
    new Map(
      lavorazioni.map((lav) => [
        lav.categoria,
        {
          nome: lav.categoria,
          ordine: lav.categoria_ordine ?? 0,
        },
      ])
    ).values()
  ).sort((a, b) => a.ordine - b.ordine || a.nome.localeCompare(b.nome));

  const urlPreventivo = `/preventivi/nuovo/preventivo?voci=${selezionate.join(
    ","
  )}`;

  if (loading) {
    return (
      <main className="min-h-screen bg-[#2B2E65] p-10 text-white">
        Caricamento lavorazioni...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#2B2E65] p-10 text-white">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <p className="text-sm opacity-70">
              FIDEPA Preventivi - Versione 1.0
            </p>

            <h1 className="text-4xl font-bold mt-2">
              Nuovo Preventivo
            </h1>

            <p className="opacity-80 mt-2">
              Step 2 di 2 — Selezione lavorazioni
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
            className="border border-white px-5 py-3 rounded-xl hover:bg-white hover:text-[#2B2E65] transition"
          >
            Home
          </button>
        </div>

        <div className="bg-white text-[#2B2E65] rounded-3xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold mb-6">Lavorazioni</h2>

          <div className="space-y-8">
            {categorie.map((categoria) => (
              <div key={categoria.nome}>
                <h3 className="text-xl font-bold mb-4 border-b pb-2">
                  {categoria.nome}
                </h3>

                <div className="space-y-3">
                  {lavorazioni
                    .filter((voce) => voce.categoria === categoria.nome)
                    .map((voce) => (
                      <label
                        key={voce.id}
                        className="flex items-center justify-between gap-4 border border-[#2B2E65]/30 rounded-2xl p-4 cursor-pointer hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-4">
                          <input
                            type="checkbox"
                            checked={selezionate.includes(voce.id)}
                            onChange={() => toggleLavorazione(voce.id)}
                            className="w-6 h-6 accent-[#2B2E65]"
                          />

                          <div>
                            <p className="font-bold">{voce.nome}</p>
                            <p className="text-sm opacity-70">
                              {voce.descrizione}
                            </p>
                          </div>
                        </div>

                        <p className="font-bold whitespace-nowrap">
                          €{" "}
                          {Number(voce.importo).toLocaleString("it-IT", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </label>
                    ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between mt-10">
            <a
              href="/preventivi/nuovo"
              className="px-6 py-3 rounded-xl border border-[#2B2E65]"
            >
              Indietro
            </a>

            <a
              href={urlPreventivo}
              className="px-6 py-3 rounded-xl bg-[#2B2E65] text-white font-semibold"
            >
              Genera Preventivo
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}