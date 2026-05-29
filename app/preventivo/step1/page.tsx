"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

type DatiCliente = {
  id: string;
  cliente: string;
  piva: string | null;
  indirizzo: string | null;
  comune: string | null;
  pec: string | null;
  email: string | null;
  telefono: string | null;
  referente: string | null;
};

export default function NuovoPreventivo() {
  const today = new Date().toLocaleDateString("it-IT");

  const [clienteRubricaId, setClienteRubricaId] = useState("");
  const [rubrica, setRubrica] = useState<DatiCliente[]>([]);
  const [salvataggioRubrica, setSalvataggioRubrica] = useState(false);

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
    caricaRubrica();

    const datiPreventivo = localStorage.getItem("datiClientePreventivo");
    if (datiPreventivo) {
      setForm(JSON.parse(datiPreventivo));
    }
  }, []);

  async function caricaRubrica() {
    const { data, error } = await supabase
      .from("clienti")
      .select("*")
      .order("cliente", { ascending: true });

    if (error) {
      console.error("Errore caricamento rubrica:", error);
      return;
    }

    setRubrica(data || []);
  }

  function aggiornaCampo(campo: keyof typeof form, valore: string) {
    const nuovoForm = {
      ...form,
      [campo]: valore,
    };

    setForm(nuovoForm);
    localStorage.setItem("datiClientePreventivo", JSON.stringify(nuovoForm));
  }

  function selezionaCliente(id: string) {
    setClienteRubricaId(id);

    const clienteSelezionato = rubrica.find((cliente) => cliente.id === id);
    if (!clienteSelezionato) return;

    const nuovoForm = {
      ...form,
      cliente: clienteSelezionato.cliente || "",
      piva: clienteSelezionato.piva || "",
      indirizzo: clienteSelezionato.indirizzo || "",
      comune: clienteSelezionato.comune || "",
      pec: clienteSelezionato.pec || "",
      email: clienteSelezionato.email || "",
      telefono: clienteSelezionato.telefono || "",
      referente: clienteSelezionato.referente || "",
      oggetto: form.oggetto,
    };

    setForm(nuovoForm);
    localStorage.setItem("datiClientePreventivo", JSON.stringify(nuovoForm));
  }

  async function salvaClienteInSupabase() {
    if (!form.cliente.trim()) return true;

    setSalvataggioRubrica(true);

    const datiCliente = {
      cliente: form.cliente.trim(),
      piva: form.piva.trim() || null,
      indirizzo: form.indirizzo.trim() || null,
      comune: form.comune.trim() || null,
      pec: form.pec.trim() || null,
      email: form.email.trim() || null,
      telefono: form.telefono.trim() || null,
      referente: form.referente.trim() || null,
    };

    let result;

    if (clienteRubricaId) {
      result = await supabase
        .from("clienti")
        .update(datiCliente)
        .eq("id", clienteRubricaId)
        .select()
        .single();
    } else {
      result = await supabase
        .from("clienti")
        .insert(datiCliente)
        .select()
        .single();
    }

    const { data, error } = result;

    setSalvataggioRubrica(false);

    if (error) {
      console.error("Errore salvataggio cliente:", error);
      alert("Errore durante il salvataggio del cliente in rubrica.");
      return false;
    }

    if (data) {
      setClienteRubricaId(data.id);
    }

    return true;
  }

  async function vaiAlleLavorazioni() {
    localStorage.setItem("datiClientePreventivo", JSON.stringify(form));

    const salvataggioOk = await salvaClienteInSupabase();

    if (!salvataggioOk) return;

    window.location.href = "/preventivo/step2";
  }

  return (
    <main className="min-h-screen bg-[#2B2E65] p-10 text-white">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <p className="text-sm opacity-70">
              FIDEPA Preventivi - Versione 1.0
            </p>

            <h1 className="text-4xl font-bold mt-2">Nuovo Preventivo</h1>

            <p className="opacity-80 mt-2">
              Step 1 di 3 — Inserimento dati cliente
            </p>

            <p className="mt-2">
              Data: <strong>{today}</strong>
            </p>
          </div>

          <button
            type="button"
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
          <div className="flex justify-between items-center gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold">Dati Cliente</h2>

              {salvataggioRubrica && (
                <p className="text-sm text-gray-500 mt-1">
                  Salvataggio in rubrica...
                </p>
              )}
            </div>

            <select
              value={clienteRubricaId}
              onChange={(e) => selezionaCliente(e.target.value)}
              className="border p-3 rounded-xl min-w-72 bg-white"
            >
              <option value="">Seleziona cliente dalla rubrica</option>

              {rubrica.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.cliente}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <input
              className="border p-4 rounded-xl"
              placeholder="Ragione sociale / Nome cliente"
              value={form.cliente}
              onChange={(e) => aggiornaCampo("cliente", e.target.value)}
            />

            <input
              className="border p-4 rounded-xl"
              placeholder="P.IVA / Codice fiscale"
              value={form.piva}
              onChange={(e) => aggiornaCampo("piva", e.target.value)}
            />

            <input
              className="border p-4 rounded-xl"
              placeholder="Indirizzo"
              value={form.indirizzo}
              onChange={(e) => aggiornaCampo("indirizzo", e.target.value)}
            />

            <input
              className="border p-4 rounded-xl"
              placeholder="Comune"
              value={form.comune}
              onChange={(e) => aggiornaCampo("comune", e.target.value)}
            />

            <input
              className="border p-4 rounded-xl"
              placeholder="PEC"
              value={form.pec}
              onChange={(e) => aggiornaCampo("pec", e.target.value)}
            />

            <input
              className="border p-4 rounded-xl"
              placeholder="Email"
              value={form.email}
              onChange={(e) => aggiornaCampo("email", e.target.value)}
            />

            <input
              className="border p-4 rounded-xl"
              placeholder="Telefono"
              value={form.telefono}
              onChange={(e) => aggiornaCampo("telefono", e.target.value)}
            />

            <input
              className="border p-4 rounded-xl"
              placeholder="Referente"
              value={form.referente}
              onChange={(e) => aggiornaCampo("referente", e.target.value)}
            />
          </div>

          <textarea
            className="border p-4 rounded-xl w-full mt-5 min-h-32"
            placeholder="Oggetto dell'incarico"
            value={form.oggetto}
            onChange={(e) => aggiornaCampo("oggetto", e.target.value)}
          />

          <div className="flex justify-between mt-8">
            <a
              href="/"
              className="px-6 py-3 rounded-xl border border-[#2B2E65]"
            >
              Indietro
            </a>

            <button
              type="button"
              onClick={vaiAlleLavorazioni}
              disabled={salvataggioRubrica}
              className="px-6 py-3 rounded-xl bg-[#2B2E65] text-white font-semibold disabled:opacity-60"
            >
              Avanti: Lavorazioni
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}