"use client";

import { useEffect, useState } from "react";
import LayoutApp from "@/components/LayoutApp";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type Cliente = {
  id: string;
  cliente: string;
  piva: string | null;
  indirizzo: string | null;
  comune: string | null;
  pec: string | null;
  email: string | null;
  telefono: string | null;
  referente: string | null;
  created_at?: string;
};

type ClienteForm = Omit<Cliente, "id" | "created_at">;

const formVuoto: ClienteForm = {
  cliente: "",
  piva: "",
  indirizzo: "",
  comune: "",
  pec: "",
  email: "",
  telefono: "",
  referente: "",
};

export default function RubricaClientiPage() {
  const [clienti, setClienti] = useState<Cliente[]>([]);
  const [caricamento, setCaricamento] = useState(true);
  const [ricerca, setRicerca] = useState("");
  const [aperto, setAperto] = useState<string | null>(null);

  const [modaleAperta, setModaleAperta] = useState(false);
  const [idModifica, setIdModifica] = useState<string | null>(null);
  const [form, setForm] = useState<ClienteForm>(formVuoto);

  const [confermaEliminazione, setConfermaEliminazione] =
    useState<Cliente | null>(null);

  useEffect(() => {
    caricaClienti();
  }, []);

  async function caricaClienti() {
    setCaricamento(true);

    const { data, error } = await supabase
      .from("clienti")
      .select("*")
      .order("cliente", { ascending: true });

    if (error) {
      console.error("Errore caricamento clienti:", error);
      setClienti([]);
    } else {
      setClienti(data || []);
    }

    setCaricamento(false);
  }

  function aggiornaCampo(campo: keyof ClienteForm, valore: string) {
    setForm((prev) => ({
      ...prev,
      [campo]: valore,
    }));
  }

  function apriNuovo() {
    setIdModifica(null);
    setForm(formVuoto);
    setModaleAperta(true);
  }

  function apriModifica(cliente: Cliente) {
    setIdModifica(cliente.id);

    setForm({
      cliente: cliente.cliente || "",
      piva: cliente.piva || "",
      indirizzo: cliente.indirizzo || "",
      comune: cliente.comune || "",
      pec: cliente.pec || "",
      email: cliente.email || "",
      telefono: cliente.telefono || "",
      referente: cliente.referente || "",
    });

    setModaleAperta(true);
  }

  async function salvaCliente() {
    if (!form.cliente.trim()) {
      alert("Inserisci almeno il nome del cliente.");
      return;
    }

    const payload = {
      cliente: form.cliente || null,
      piva: form.piva || null,
      indirizzo: form.indirizzo || null,
      comune: form.comune || null,
      pec: form.pec || null,
      email: form.email || null,
      telefono: form.telefono || null,
      referente: form.referente || null,
    };

    if (idModifica) {
      const { error } = await supabase
        .from("clienti")
        .update(payload)
        .eq("id", idModifica);

      if (error) {
        console.error("Errore modifica cliente:", error);
        alert("Errore durante la modifica del cliente.");
        return;
      }
    } else {
      const { error } = await supabase.from("clienti").insert(payload);

      if (error) {
        console.error("Errore inserimento cliente:", error);
        alert("Errore durante l'inserimento del cliente.");
        return;
      }
    }

    setModaleAperta(false);
    setIdModifica(null);
    setForm(formVuoto);
    await caricaClienti();
  }

  async function eliminaCliente(id: string) {
    const { error } = await supabase.from("clienti").delete().eq("id", id);

    if (error) {
      console.error("Errore eliminazione cliente:", error);
      alert("Errore durante l'eliminazione del cliente.");
      return;
    }

    setClienti((lista) => lista.filter((cliente) => cliente.id !== id));

    if (aperto === id) {
      setAperto(null);
    }

    setConfermaEliminazione(null);
  }

  const clientiFiltrati = clienti.filter((cliente) => {
    const testo = `${cliente.cliente || ""} ${cliente.piva || ""} ${
      cliente.comune || ""
    } ${cliente.email || ""} ${cliente.pec || ""} ${
      cliente.telefono || ""
    } ${cliente.referente || ""}`.toLowerCase();

    return testo.includes(ricerca.toLowerCase());
  });

  return (
    <LayoutApp>
      <div>
        <div className="flex justify-between items-center gap-4 mb-6">
          <h2 className="page-title">Rubrica clienti</h2>

          <div className="flex gap-3">
            <input
              type="text"
              value={ricerca}
              onChange={(e) => setRicerca(e.target.value)}
              placeholder="Cerca cliente..."
              className="w-80 border border-gray-300 rounded-md px-4 py-3 bg-transparent outline-none transition focus:bg-white focus:border-[#64B445] focus:shadow-sm"
            />

            <button
              type="button"
              onClick={apriNuovo}
              className="bg-[#64B445] text-white w-12 h-12 rounded-md text-2xl font-light hover:bg-[#5AA03E] hover:scale-105 transition flex items-center justify-center shadow-sm cursor-pointer"
            >
              +
            </button>
          </div>
        </div>

        {caricamento ? (
          <p className="text-center text-gray-500 py-10">
            Caricamento rubrica...
          </p>
        ) : clientiFiltrati.length === 0 ? (
          <p className="text-center text-gray-500 py-10">
            Nessun cliente trovato.
          </p>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {clientiFiltrati.map((c) => {
              const isOpen = aperto === c.id;

              return (
                <div
                  key={c.id}
                  className="bg-white border border-gray-200 shadow-sm overflow-hidden rounded-sm"
                >
                  <button
                    type="button"
                    onClick={() => setAperto(isOpen ? null : c.id)}
                    className="w-full flex justify-between items-center px-4 py-3 text-left hover:bg-[#e8e8e8] transition cursor-pointer"
                  >
                    <div className="leading-tight">
                      <h3 className="text-[17px] font-normal text-[#2B2F5E]">
                        {c.cliente || "-"}
                      </h3>

                      <p className="text-[15px] text-[#D79D06] mt-0">
                        {c.comune || c.piva || "Dati cliente non indicati"}
                      </p>
                    </div>

                    <span
                      className={`transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    >
                      ⌃
                    </span>
                  </button>

                  {isOpen && (
                    <div className="px-4 py-4 border-t border-gray-200 bg-[#FAFAFA]">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Info label="Cliente" value={c.cliente} />
                        <Info label="P. IVA / C.F." value={c.piva} />
                        <Info label="Indirizzo" value={c.indirizzo} />
                        <Info label="Comune" value={c.comune} />
                        <Info label="PEC" value={c.pec} />
                        <Info label="Email" value={c.email} />
                        <Info label="Telefono" value={c.telefono} />
                        <Info label="Referente" value={c.referente} />
                      </div>

                      <div className="flex justify-end gap-3 mt-6">
                        <button
                          type="button"
                          onClick={() => apriModifica(c)}
                          className="border border-gray-300 text-[#2B2F5E] px-4 py-2 rounded-md text-sm font-medium bg-transparent hover:bg-white hover:border-[#64B445] transition cursor-pointer"
                        >
                          Modifica
                        </button>

                        <button
                          type="button"
                          onClick={() => setConfermaEliminazione(c)}
                          className="bg-red-600 text-white w-10 h-10 rounded-md text-xl font-light hover:bg-red-700 hover:scale-105 transition flex items-center justify-center shadow-sm cursor-pointer"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modaleAperta && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-md shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-8">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-2xl font-semibold text-[#2B2F5E]">
                {idModifica ? "Modifica cliente" : "Nuovo cliente"}
              </h3>

              <button
                type="button"
                onClick={() => setModaleAperta(false)}
                className="text-2xl text-gray-400 hover:text-[#2B2F5E] cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Campo
                label="Cliente"
                value={form.cliente || ""}
                onChange={(value) => aggiornaCampo("cliente", value)}
              />

              <Campo
                label="P. IVA / C.F."
                value={form.piva || ""}
                onChange={(value) => aggiornaCampo("piva", value)}
              />

              <Campo
                label="Indirizzo"
                value={form.indirizzo || ""}
                onChange={(value) => aggiornaCampo("indirizzo", value)}
              />

              <Campo
                label="Comune"
                value={form.comune || ""}
                onChange={(value) => aggiornaCampo("comune", value)}
              />

              <Campo
                label="PEC"
                value={form.pec || ""}
                onChange={(value) => aggiornaCampo("pec", value)}
              />

              <Campo
                label="Email"
                value={form.email || ""}
                onChange={(value) => aggiornaCampo("email", value)}
              />

              <Campo
                label="Telefono"
                value={form.telefono || ""}
                onChange={(value) => aggiornaCampo("telefono", value)}
              />

              <Campo
                label="Referente"
                value={form.referente || ""}
                onChange={(value) => aggiornaCampo("referente", value)}
              />
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button
                type="button"
                onClick={() => setModaleAperta(false)}
                className="border border-gray-300 text-[#2B2F5E] px-5 py-3 rounded-md text-sm font-medium bg-transparent hover:bg-[#e8e8e8] transition cursor-pointer"
              >
                Annulla
              </button>

              <button
                type="button"
                onClick={salvaCliente}
                className="bg-[#64B445] text-white px-5 py-3 rounded-md text-sm font-medium hover:bg-[#5AA03E] transition cursor-pointer"
              >
                Salva
              </button>
            </div>
          </div>
        </div>
      )}

      {confermaEliminazione && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-md shadow-2xl w-full max-w-xl p-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-semibold text-[#2B2F5E]">
                  Elimina cliente
                </h3>

                <p className="text-sm text-gray-500 mt-2">
                  Stai per eliminare definitivamente questa voce dalla rubrica.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setConfermaEliminazione(null)}
                className="text-2xl text-gray-400 hover:text-[#2B2F5E] cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="border border-gray-200 rounded-md p-4 bg-[#F2F2F2] mb-6">
              <p className="text-lg text-[#2B2F5E]">
                {confermaEliminazione.cliente}
              </p>

              <p className="text-sm text-[#D79D06] mt-1">
                {confermaEliminazione.comune ||
                  confermaEliminazione.piva ||
                  "Dati cliente non indicati"}
              </p>
            </div>

            <p className="text-sm text-gray-600 mb-8">
              Vuoi procedere con l'eliminazione?
            </p>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfermaEliminazione(null)}
                className="border border-gray-300 text-[#2B2F5E] px-5 py-3 rounded-md text-sm font-medium bg-transparent hover:bg-[#e8e8e8] transition cursor-pointer"
              >
                Annulla
              </button>

              <button
                type="button"
                onClick={() => eliminaCliente(confermaEliminazione.id)}
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

function Info({
  label,
  value,
}: {
  label: string;
  value: string | number | null;
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.12em] text-gray-400 font-medium">
        {label}
      </p>

      <p className="mt-0.5 text-[13px] text-[#2B2F5E] font-normal">
        {value || "-"}
      </p>
    </div>
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