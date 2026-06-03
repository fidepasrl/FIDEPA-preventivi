"use client";

import { useEffect, useState } from "react";
import LayoutApp from "@/components/LayoutApp";
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
  const [clienteRubricaId, setClienteRubricaId] = useState("");
  const [rubrica, setRubrica] = useState<DatiCliente[]>([]);
  const [salvataggioRubrica, setSalvataggioRubrica] = useState(false);
  const [popupValidazione, setPopupValidazione] = useState(false);

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

  function pulisciDatiCliente() {
    const nuovoForm = {
      ...form,
      cliente: "",
      piva: "",
      indirizzo: "",
      comune: "",
      pec: "",
      email: "",
      telefono: "",
      referente: "",
    };

    setClienteRubricaId("");
    setForm(nuovoForm);
    localStorage.setItem("datiClientePreventivo", JSON.stringify(nuovoForm));
  }

  function selezionaCliente(id: string) {
    if (!id) {
      pulisciDatiCliente();
      return;
    }

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

    const clienteGiaPresente = rubrica.find((c) => {
      return (
        (c.cliente || "").trim().toLowerCase() === datiCliente.cliente.toLowerCase() &&
        (c.piva || "").trim().toLowerCase() === (datiCliente.piva || "").toLowerCase() &&
        (c.indirizzo || "").trim().toLowerCase() === (datiCliente.indirizzo || "").toLowerCase() &&
        (c.comune || "").trim().toLowerCase() === (datiCliente.comune || "").toLowerCase() &&
        (c.pec || "").trim().toLowerCase() === (datiCliente.pec || "").toLowerCase() &&
        (c.email || "").trim().toLowerCase() === (datiCliente.email || "").toLowerCase() &&
        (c.telefono || "").trim().toLowerCase() === (datiCliente.telefono || "").toLowerCase() &&
        (c.referente || "").trim().toLowerCase() === (datiCliente.referente || "").toLowerCase()
      );
    });

    if (clienteGiaPresente) {
      setClienteRubricaId(clienteGiaPresente.id);
      setSalvataggioRubrica(false);
      return true;
    }

    const result = clienteRubricaId
      ? await supabase
          .from("clienti")
          .update(datiCliente)
          .eq("id", clienteRubricaId)
          .select()
          .single()
      : await supabase
          .from("clienti")
          .insert(datiCliente)
          .select()
          .single();

    const { data, error } = result;

    setSalvataggioRubrica(false);

    if (error) {
      console.error("Errore salvataggio cliente:", error);
      alert("Errore durante il salvataggio del cliente in rubrica.");
      return false;
    }

    if (data) setClienteRubricaId(data.id);

    return true;
  }

  async function vaiAlleLavorazioni() {
    if (!form.cliente.trim() || !form.oggetto.trim()) {
      setPopupValidazione(true);
      return;
    }

    localStorage.setItem("datiClientePreventivo", JSON.stringify(form));

    const salvataggioOk = await salvaClienteInSupabase();
    if (!salvataggioOk) return;

    window.location.href = "/preventivo/nuovo/step2";
  }

  function annullaPreventivo() {
    const conferma = window.confirm(
      "Tutti i dati del preventivo verranno cancellati. Continuare?"
    );

    if (!conferma) return;

    localStorage.removeItem("datiClientePreventivo");
    localStorage.removeItem("lavorazioniSelezionate");
    window.location.href = "/";
  }

  return (
    <LayoutApp>
      <div>
        <div className="flex justify-between items-center gap-4 mb-6">
          <div>
            <h2 className="page-title">Nuovo preventivo</h2>

            <p className="text-[15px] text-[#D79D06] mt-1">
              Step 1 di 3 — Dati cliente
            </p>
          </div>

          <div className="flex gap-3">
            
            <button
              type="button"
              onClick={vaiAlleLavorazioni}
              disabled={salvataggioRubrica}
              className="bg-[#64B445] text-white px-5 py-3 rounded-md text-sm font-medium hover:bg-[#5AA03E] transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {salvataggioRubrica ? "Salvataggio..." : "Avanti"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          <div className="bg-white border border-gray-200 shadow-sm overflow-hidden rounded-sm">
            <div className="px-4 py-3 border-b border-gray-200 bg-[#FAFAFA]">
              <h3 className="text-[17px] font-normal text-[#2B2F5E]">
                Selezione cliente
              </h3>

              <p className="text-[15px] text-[#D79D06] mt-0">
                Carica dati da rubrica o inserisci un nuovo cliente
              </p>
            </div>

            <div className="p-4">
              <label className="block text-sm font-medium mb-2 text-[#2B2F5E]">
                Cliente in rubrica
              </label>

              <select
                value={clienteRubricaId}
                onChange={(e) => selezionaCliente(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-4 py-3 bg-transparent outline-none transition focus:bg-white focus:border-[#64B445] focus:shadow-sm cursor-pointer"
              >
                <option value="">Seleziona cliente dalla rubrica</option>

                {rubrica.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.cliente}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white border border-gray-200 shadow-sm overflow-hidden rounded-sm">
            <div className="px-4 py-3 border-b border-gray-200 bg-[#FAFAFA]">
              <h3 className="text-[17px] font-normal text-[#2B2F5E]">
                Oggetto dell’incarico
              </h3>

              <p className="text-[15px] text-[#D79D06] mt-0">
                Questo campo non viene salvato in rubrica
              </p>
            </div>

            <div className="p-4">
              <textarea
                value={form.oggetto}
                onChange={(e) => aggiornaCampo("oggetto", e.target.value)}
                rows={4}
                placeholder="Descrizione sintetica dell’incarico..."
                className="w-full border border-gray-300 rounded-md px-4 py-3 bg-transparent outline-none transition focus:bg-white focus:border-[#64B445] focus:shadow-sm resize-none"
              />
            </div>
          </div>
        </div>

        <div className="mt-3 bg-white border border-gray-200 shadow-sm overflow-hidden rounded-sm">
          <div className="px-4 py-3 border-b border-gray-200 bg-[#FAFAFA]">
            <h3 className="text-[17px] font-normal text-[#2B2F5E]">
              Dati anagrafici cliente
            </h3>

            <p className="text-[15px] text-[#D79D06] mt-0">
              I dati saranno salvati o aggiornati nella rubrica clienti
            </p>
          </div>

          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Campo
              label="Ragione sociale / Nome cliente"
              value={form.cliente}
              onChange={(value) => aggiornaCampo("cliente", value)}
            />

            <Campo
              label="P. IVA / Codice fiscale"
              value={form.piva}
              onChange={(value) => aggiornaCampo("piva", value)}
            />

            <Campo
              label="Indirizzo"
              value={form.indirizzo}
              onChange={(value) => aggiornaCampo("indirizzo", value)}
            />

            <Campo
              label="Comune"
              value={form.comune}
              onChange={(value) => aggiornaCampo("comune", value)}
            />

            <Campo
              label="PEC"
              value={form.pec}
              onChange={(value) => aggiornaCampo("pec", value)}
            />

            <Campo
              label="Email"
              value={form.email}
              onChange={(value) => aggiornaCampo("email", value)}
            />

            <Campo
              label="Telefono"
              value={form.telefono}
              onChange={(value) => aggiornaCampo("telefono", value)}
            />

            <Campo
              label="Referente"
              value={form.referente}
              onChange={(value) => aggiornaCampo("referente", value)}
            />
          </div>
            
            <div className="px-4 pb-4 text-right">
              <button
                type="button"
                onClick={pulisciDatiCliente}
                className="border border-gray-300 text-[#2B2F5E] px-5 py-3 rounded-md text-sm font-medium bg-transparent hover:bg-[#e8e8e8] transition cursor-pointer"
              >
                Pulisci campi
              </button>
            </div>

        </div>
      </div>

      {popupValidazione && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-md shadow-2xl w-full max-w-xl p-8">
            <h3 className="text-2xl font-semibold text-[#2B2F5E] mb-4">
              Dati mancanti
            </h3>

            <p className="text-sm text-gray-600 mb-8">
              Per proseguire compilare almeno i campi{" "}
              <span className="font-semibold text-[#2B2F5E]">
                Ragione sociale / Nome cliente
              </span>{" "}
              e{" "}
              <span className="font-semibold text-[#2B2F5E]">
                Oggetto dell’incarico
              </span>.
            </p>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setPopupValidazione(false)}
                className="bg-[#64B445] text-white px-5 py-3 rounded-md text-sm font-medium hover:bg-[#5AA03E] transition cursor-pointer"
              >
                Ok
              </button>
            </div>
          </div>
        </div>
      )}
    </LayoutApp>
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