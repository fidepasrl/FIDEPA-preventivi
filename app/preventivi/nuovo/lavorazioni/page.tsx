"use client";

import { useEffect, useState } from "react";

export default function LavorazioniPreventivo() {
  const lavorazioni = [
    { id: "fattibilita", categoria: "Progettazione", nome: "Progetto di fattibilità", descrizione: "Studio preliminare e analisi tecnico-economica", importo: 2500 },
    { id: "definitivo", categoria: "Progettazione", nome: "Progetto definitivo", descrizione: "Elaborati tecnici e pratiche autorizzative", importo: 6000 },
    { id: "esecutivo", categoria: "Progettazione", nome: "Progetto esecutivo", descrizione: "Elaborati esecutivi completi", importo: 8500 },
    { id: "dl", categoria: "Direzione lavori e sicurezza", nome: "Direzione lavori", descrizione: "Contabilità, SAL, verifiche e assistenza al cantiere", importo: 7500 },
    { id: "csp", categoria: "Direzione lavori e sicurezza", nome: "CSP", descrizione: "Coordinamento sicurezza in fase di progettazione", importo: 3500 },
    { id: "cse", categoria: "Direzione lavori e sicurezza", nome: "CSE", descrizione: "Coordinamento sicurezza in fase di esecuzione", importo: 4500 },
    { id: "ape", categoria: "Energia e pratiche tecniche", nome: "APE", descrizione: "Attestato di prestazione energetica", importo: 250 },
    { id: "diagnosi", categoria: "Energia e pratiche tecniche", nome: "Diagnosi energetica", descrizione: "Analisi energetica edificio/impianto", importo: 1800 },
    { id: "scia", categoria: "Energia e pratiche tecniche", nome: "SCIA/CILA", descrizione: "Predisposizione e deposito pratica", importo: 1200 },
  ];

  const [selezionate, setSelezionate] = useState<string[]>([]);

useEffect(() => {
  const salvate = localStorage.getItem("lavorazioniSelezionate");

  if (salvate) {
    setSelezionate(JSON.parse(salvate));
  }
}, []);

  function toggleLavorazione(id: string) {
  let nuoveSelezionate: string[];

  if (selezionate.includes(id)) {
    nuoveSelezionate = selezionate.filter((item) => item !== id);
  } else {
    nuoveSelezionate = [...selezionate, id];
  }

  setSelezionate(nuoveSelezionate);
  localStorage.setItem("lavorazioniSelezionate", JSON.stringify(nuoveSelezionate));
}

  const urlPreventivo = `/preventivi/nuovo/preventivo?voci=${selezionate.join(",")}`;

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

          <div className="space-y-4">
            {lavorazioni.map((voce) => (
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
                    <p className="text-sm opacity-70">{voce.descrizione}</p>
                    <p className="text-xs opacity-60">{voce.categoria}</p>
                  </div>
                </div>

                <p className="font-bold whitespace-nowrap">
                  € {voce.importo.toLocaleString("it-IT")}
                </p>
              </label>
            ))}
          </div>

          <div className="flex justify-between mt-10">
            <a href="/preventivi/nuovo" className="px-6 py-3 rounded-xl border border-[#2B2E65]">
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