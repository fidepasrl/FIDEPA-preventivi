"use client";

import { useEffect, useState } from "react";
import LayoutApp from "@/components/LayoutApp";
import { supabase } from "@/lib/supabase";

type Lavorazione = {
  id: string;
  macrocategoria: string | null;
  categoria: string;
  categoria_ordine: number | null;
  nome: string;
  descrizione: string | null;
  importo: number;
  ordine: number | null;
};

const MACROCATEGORIE = [
  "Progettazione",
  "Realizzazione",
  "Chiusura dei lavori",
];

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
      .order("macrocategoria")
      .order("categoria_ordine")
      .order("categoria")
      .order("ordine");

    if (error) {
      console.error("Errore caricamento lavorazioni:", error);
      setLoading(false);
      return;
    }

    setLavorazioni(data ?? []);
    setLoading(false);
  }

  function toggleLavorazione(id: string) {
    const nuoveSelezionate = selezionate.includes(id)
      ? selezionate.filter((item) => item !== id)
      : [...selezionate, id];

    setSelezionate(nuoveSelezionate);
    localStorage.setItem(
      "lavorazioniSelezionate",
      JSON.stringify(nuoveSelezionate)
    );
  }

  function pulisciSelezione() {
    setSelezionate([]);
    localStorage.removeItem("lavorazioniSelezionate");
  }

  function vaiIndietro() {
    window.location.href = "/preventivo/nuovo/step1";
  }

  function vaiAvanti() {
    localStorage.setItem("lavorazioniSelezionate", JSON.stringify(selezionate));
    window.location.href = "/preventivo/nuovo/step3";
  }

  const macrocategoriePresenti = Array.from(
    new Set(
      lavorazioni.map((lav) => lav.macrocategoria || "Senza macrocategoria")
    )
  );

  const macrocategorieOrdinate = [
    ...MACROCATEGORIE.filter((macro) => macrocategoriePresenti.includes(macro)),
    ...macrocategoriePresenti
      .filter((macro) => !MACROCATEGORIE.includes(macro))
      .sort((a, b) => a.localeCompare(b)),
  ];

  if (loading) {
    return (
      <LayoutApp>
        <p className="text-center text-gray-500 py-10">
          Caricamento lavorazioni...
        </p>
      </LayoutApp>
    );
  }

  return (
    <LayoutApp>
      <div>
          <div className="flex justify-between items-center gap-4 mb-6">
            <div>
              <h2 className="page-title">Nuovo preventivo</h2>

              <p className="text-[15px] text-[#D79D06] mt-1">
                Step 2 di 3 — Selezione lavorazioni
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={pulisciSelezione}
                className="border border-gray-300 text-[#2B2F5E] px-5 py-3 rounded-md text-sm font-medium bg-transparent hover:bg-[#e8e8e8] transition cursor-pointer"
              >
                Pulisci selezione
              </button>

              <button
                type="button"
                onClick={vaiIndietro}
                className="border border-gray-300 text-[#2B2F5E] px-5 py-3 rounded-md text-sm font-medium bg-transparent hover:bg-[#e8e8e8] transition cursor-pointer"
              >
                Indietro
              </button>

              <button
                type="button"
                onClick={vaiAvanti}
                className="bg-[#64B445] text-white px-5 py-3 rounded-md text-sm font-medium hover:bg-[#5AA03E] transition cursor-pointer"
              >
                Avanti
              </button>
            </div>
          </div>

        {lavorazioni.length === 0 ? (
          <p className="text-center text-gray-500 py-10">
            Nessuna lavorazione trovata.
          </p>
        ) : (
          <div className="space-y-8">
            {macrocategorieOrdinate.map((macro) => {
              const lavorazioniMacro = lavorazioni.filter(
                (lav) =>
                  (lav.macrocategoria || "Senza macrocategoria") === macro
              );

              const categorie = Array.from(
                new Map(
                  lavorazioniMacro.map((lav) => [
                    lav.categoria,
                    {
                      nome: lav.categoria,
                      ordine: lav.categoria_ordine ?? 9999,
                    },
                  ])
                ).values()
              ).sort(
                (a, b) => a.ordine - b.ordine || a.nome.localeCompare(b.nome)
              );

              return (
                <section key={macro} className="space-y-5">
                  <div>
                    <h3 className="text-[22px] font-semibold text-[#2B2F5E]">
                      {macro}
                    </h3>

                    <div className="border-b border-gray-300 mt-2" />
                  </div>

                  {categorie.map((categoria) => {
                    const vociCategoria = lavorazioniMacro
                      .filter((voce) => voce.categoria === categoria.nome)
                      .sort(
                        (a, b) =>
                          (a.ordine ?? 9999) - (b.ordine ?? 9999) ||
                          a.nome.localeCompare(b.nome)
                      );

                    return (
                      <div key={categoria.nome} className="space-y-3">
                        <div>
                          <h4 className="text-[17px] font-normal text-[#2B2F5E]">
                            {categoria.nome}
                          </h4>

                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                          {vociCategoria.map((voce) => {
                            const selezionata = selezionate.includes(voce.id);

                            return (
                              <label
                                key={voce.id}
                                className={`bg-white border shadow-sm overflow-hidden rounded-sm px-4 py-3 cursor-pointer transition hover:bg-[#e8e8e8] ${
                                  selezionata
                                    ? "border-[#64B445]"
                                    : "border-gray-200"
                                }`}
                              >
                                <div className="flex justify-between items-start gap-4">
                                  <div className="flex items-start gap-3">
                                    <input
                                      type="checkbox"
                                      checked={selezionata}
                                      onChange={() =>
                                        toggleLavorazione(voce.id)
                                      }
                                      className="mt-1 w-4 h-4 accent-[#64B445] cursor-pointer"
                                    />

                                    <div className="leading-tight">
                                      <p className="text-[15px] font-normal text-[#2B2F5E]">
                                        {voce.nome}
                                      </p>

                                      {voce.descrizione && (
                                        <p className="text-[13px] text-gray-500 mt-1 leading-snug">
                                          {voce.descrizione}
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  <p className="text-[14px] text-[#D79D06] whitespace-nowrap">
                                    €{" "}
                                    {Number(voce.importo).toLocaleString(
                                      "it-IT",
                                      {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      }
                                    )}
                                  </p>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </LayoutApp>
  );
}