"use client";

import { useEffect, useState } from "react";

export default function NuovoPreventivo() {
  const today = new Date().toLocaleDateString("it-IT");

  const [form, setForm] = useState({
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
    const datiSalvati = localStorage.getItem("datiClientePreventivo");

    if (datiSalvati) {
      setForm(JSON.parse(datiSalvati));
    }
  }, []);

  function aggiornaCampo(campo: string, valore: string) {
    const nuovoForm = {
      ...form,
      [campo]: valore,
    };

    setForm(nuovoForm);
    localStorage.setItem("datiClientePreventivo", JSON.stringify(nuovoForm));
  }

  return (
    <main className="min-h-screen bg-[#2B2E65] p-10 text-white">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">

            <div>

                <p className="text-sm opacity-70">
                    FIDEPA Preventivi - Versione 1.0
                </p>

                <h1 className="text-4xl font-bold mt-2">
                  Nuovo Preventivo
                </h1>

                <p className="opacity-80 mt-2">
                  Step 1 di 2 — Inserimento dati cliente
                </p>

                <p className="mt-2">
                  Data: <strong>{today}</strong>
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
          <h2 className="text-2xl font-bold mb-6">Dati Cliente</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <input className="border p-4 rounded-xl" placeholder="Ragione sociale / Nome cliente" value={form.cliente} onChange={(e) => aggiornaCampo("cliente", e.target.value)} />
            <input className="border p-4 rounded-xl" placeholder="P.IVA / Codice fiscale" value={form.piva} onChange={(e) => aggiornaCampo("piva", e.target.value)} />
            <input className="border p-4 rounded-xl" placeholder="Indirizzo" value={form.indirizzo} onChange={(e) => aggiornaCampo("indirizzo", e.target.value)} />
            <input className="border p-4 rounded-xl" placeholder="Comune" value={form.comune} onChange={(e) => aggiornaCampo("comune", e.target.value)} />
            <input className="border p-4 rounded-xl" placeholder="PEC" value={form.pec} onChange={(e) => aggiornaCampo("pec", e.target.value)} />
            <input className="border p-4 rounded-xl" placeholder="Email" value={form.email} onChange={(e) => aggiornaCampo("email", e.target.value)} />
            <input className="border p-4 rounded-xl" placeholder="Telefono" value={form.telefono} onChange={(e) => aggiornaCampo("telefono", e.target.value)} />
            <input className="border p-4 rounded-xl" placeholder="Referente" value={form.referente} onChange={(e) => aggiornaCampo("referente", e.target.value)} />
          </div>

          <textarea
            className="border p-4 rounded-xl w-full mt-5 min-h-32"
            placeholder="Oggetto dell'incarico"
            value={form.oggetto}
            onChange={(e) => aggiornaCampo("oggetto", e.target.value)}
          />

          <div className="flex justify-between mt-8">
            <a href="/" className="px-6 py-3 rounded-xl border border-[#2B2E65]">
              Indietro
            </a>

            <a
              href="/preventivi/nuovo/lavorazioni"
              className="px-6 py-3 rounded-xl bg-[#2B2E65] text-white font-semibold"
            >
              Avanti: Lavorazioni
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}