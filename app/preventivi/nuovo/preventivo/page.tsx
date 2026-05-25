"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function PreventivoPage() {
  const searchParams = useSearchParams();
  const [cliente, setCliente] = useState({
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
    const datiCliente = localStorage.getItem("datiClientePreventivo");

    if (datiCliente) {
        setCliente(JSON.parse(datiCliente));
    }
    }, []);
  const vociSelezionate = searchParams.get("voci")?.split(",") || [];

  const tutteLeLavorazioni = [
    { id: "fattibilita", nome: "Progetto di fattibilità", importo: 2500 },
    { id: "definitivo", nome: "Progetto definitivo", importo: 6000 },
    { id: "esecutivo", nome: "Progetto esecutivo", importo: 8500 },
    { id: "dl", nome: "Direzione lavori", importo: 7500 },
    { id: "csp", nome: "CSP", importo: 3500 },
    { id: "cse", nome: "CSE", importo: 4500 },
    { id: "ape", nome: "APE", importo: 250 },
    { id: "diagnosi", nome: "Diagnosi energetica", importo: 1800 },
    { id: "scia", nome: "SCIA/CILA", importo: 1200 },
  ];

  const lavorazioniIniziali = tutteLeLavorazioni.filter((voce) =>
    vociSelezionate.includes(voce.id)
    );

    const [modificaImporti, setModificaImporti] = useState(false);
    const [lavorazioni, setLavorazioni] = useState(lavorazioniIniziali);
            function aggiornaImporto(id: string, nuovoImporto: string) {
        setLavorazioni(
            lavorazioni.map((voce) =>
            voce.id === id
                ? { ...voce, importo: Number(nuovoImporto) }
                : voce
            )
        );
        }

  const imponibile = lavorazioni.reduce((totale, voce) => totale + voce.importo, 0);
  const cassa = imponibile * 0.04;
  const iva = (imponibile + cassa) * 0.22;
  const totale = imponibile + cassa + iva;

  return (
    <main className="min-h-screen bg-[#2B2E65] p-10 text-white">
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
                <p className="opacity-70">
                    Preventivo n. 2026-001
                </p>

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
                className="border border-white px-5 py-3 rounded-xl hover:bg-white hover:text-[#2B2E65] transition"
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

          <h2 className="text-2xl font-bold mb-4">Prestazioni Professionali</h2>

          <div className="border rounded-2xl overflow-hidden mb-10">
            <div className="grid grid-cols-2 bg-[#2B2E65] text-white font-bold p-4">
              <div>Prestazione</div>
              <div className="text-right">Importo</div>
            </div>

            {lavorazioni.length === 0 ? (
              <div className="p-4 border-t text-center opacity-70">
                Nessuna lavorazione selezionata.
              </div>
            ) : (
              lavorazioni.map((voce) => (
                <div key={voce.id} className="grid grid-cols-2 p-4 border-t">
                  <div>{voce.nome}</div>
                  <div className="text-right font-semibold">
                    {modificaImporti ? (
                        <input
                        type="number"
                        value={voce.importo}
                        onChange={(e) => aggiornaImporto(voce.id, e.target.value)}
                        className="border rounded-lg p-2 text-right w-32"
                        />
                    ) : (
                        <>€ {voce.importo.toLocaleString("it-IT", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}</>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="max-w-md ml-auto space-y-3">
            <div className="flex justify-between">
              <span>Imponibile</span>
              <span>€ {imponibile.toLocaleString("it-IT", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}</span>
            </div>

            <div className="flex justify-between">
              <span>Cassa Previdenziale 4%</span>
              <span>€ {cassa.toLocaleString("it-IT", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}</span>
            </div>

            <div className="flex justify-between">
              <span>IVA 22%</span>
              <span>€ {iva.toLocaleString("it-IT", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}</span>
            </div>

            <div className="flex justify-between text-2xl font-bold border-t pt-4">
              <span>TOTALE</span>
              <span>€ {totale.toLocaleString("it-IT", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}</span>
            </div>
          </div>

          <div className="flex justify-between mt-12">
            <a
              href="/preventivi/nuovo/lavorazioni"
              className="px-6 py-3 rounded-xl border border-[#2B2E65]"
            >
              Indietro
            </a>

            <div className="flex gap-4">
              <button
                onClick={() => setModificaImporti(!modificaImporti)}
                className="px-6 py-3 rounded-xl border border-[#2B2E65]"
                >
                {modificaImporti ? "Salva Importi" : "Modifica Importi"}
              </button>

              <button
                onClick={() => window.print()}
                className="px-6 py-3 rounded-xl bg-[#2B2E65] text-white font-semibold"
                >
                Genera PDF
              </button>
              
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}