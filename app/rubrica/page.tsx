"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
  created_at: string;
};

export default function RubricaPage() {
  const [clienti, setClienti] = useState<Cliente[]>([]);
  const [caricamento, setCaricamento] = useState(true);
  const [ricerca, setRicerca] = useState("");

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

  async function eliminaCliente(id: string) {
    const conferma = window.confirm(
      "Sei sicuro di voler eliminare questo cliente dalla rubrica?"
    );

    if (!conferma) return;

    const { error } = await supabase.from("clienti").delete().eq("id", id);

    if (error) {
      console.error("Errore eliminazione cliente:", error);
      alert("Errore durante l'eliminazione del cliente.");
      return;
    }

    setClienti((lista) => lista.filter((cliente) => cliente.id !== id));
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
    <main className="min-h-screen bg-[#2B2F6B] p-10 text-white">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-start mb-10">
          <div>
            <h1 className="text-5xl font-bold mb-3">Rubrica Clienti</h1>
            <p className="text-lg text-gray-200">
              Anagrafica clienti salvata su database condiviso
            </p>
          </div>

          <Link
            href="/"
            className="bg-white text-[#2B2F6B] px-6 py-3 rounded-xl font-semibold hover:bg-gray-100"
          >
            Torna alla Home
          </Link>
        </div>

        <div className="bg-white text-[#1F245C] rounded-3xl shadow-xl p-8">
          <div className="flex justify-between items-center gap-4 mb-6">
            <h2 className="text-2xl font-bold">Elenco Clienti</h2>

            <input
              type="text"
              value={ricerca}
              onChange={(e) => setRicerca(e.target.value)}
              placeholder="Cerca cliente..."
              className="w-full max-w-md border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-[#2B2F6B]"
            />
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
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b-2 border-[#2B2F6B] text-left">
                    <th className="p-3">Cliente</th>
                    <th className="p-3">P.IVA / C.F.</th>
                    <th className="p-3">Indirizzo</th>
                    <th className="p-3">Comune</th>
                    <th className="p-3">PEC</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Telefono</th>
                    <th className="p-3">Referente</th>
                    <th className="p-3 text-center">Azioni</th>
                  </tr>
                </thead>

                <tbody>
                  {clientiFiltrati.map((cliente) => (
                    <tr
                      key={cliente.id}
                      className="border-b border-gray-200 hover:bg-gray-50"
                    >
                      <td className="p-3 font-semibold">
                        {cliente.cliente || "-"}
                      </td>
                      <td className="p-3">{cliente.piva || "-"}</td>
                      <td className="p-3">{cliente.indirizzo || "-"}</td>
                      <td className="p-3">{cliente.comune || "-"}</td>
                      <td className="p-3">{cliente.pec || "-"}</td>
                      <td className="p-3">{cliente.email || "-"}</td>
                      <td className="p-3">{cliente.telefono || "-"}</td>
                      <td className="p-3">{cliente.referente || "-"}</td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => eliminaCliente(cliente.id)}
                          className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700"
                        >
                          Elimina
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}