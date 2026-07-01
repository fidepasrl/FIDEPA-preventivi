"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import LayoutApp from "@/components/LayoutApp";
import { supabase } from "@/lib/supabase";

type GaraArchiviata = {
  id: string;
  titolo: string;
  ente: string | null;
  oggetto: string | null;
  scadenza: string | null;
  stato: string;
  created_at: string;
};

export default function ArchivioGarePage() {
  const [gare, setGare] = useState<GaraArchiviata[]>([]);
  const [caricamento, setCaricamento] = useState(true);
  const [errore, setErrore] = useState("");

  useEffect(() => {
    caricaGare();
  }, []);

  async function caricaGare() {
    setCaricamento(true);
    setErrore("");

    const { data, error } = await supabase
      .from("gara_preparazioni")
      .select("id, titolo, ente, oggetto, scadenza, stato, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      setErrore(error.message);
      setCaricamento(false);
      return;
    }

    setGare((data || []) as GaraArchiviata[]);
    setCaricamento(false);
  }

  return (
    <LayoutApp>
      <div>
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4 mb-6">
          <div>
            <h2 className="page-title">Archivio gare</h2>

            <p className="text-[15px] text-[#D79D06] mt-1">
              Schede salvate ordinate per data di creazione
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/requisiti/preparazione"
              className="border border-gray-300 text-[#2B2F5E] px-4 py-3 rounded-md text-sm font-medium bg-white hover:bg-[#e8e8e8] transition"
            >
              Nuova preparazione
            </Link>

            <Link
              href="/requisiti"
              className="border border-gray-300 text-[#2B2F5E] px-4 py-3 rounded-md text-sm font-medium bg-white hover:bg-[#e8e8e8] transition"
            >
              Gare d&apos;appalto
            </Link>
          </div>
        </div>

        {errore ? (
          <MessaggioDatabase errore={errore} />
        ) : caricamento ? (
          <p className="text-center text-gray-500 py-10">
            Caricamento archivio gare...
          </p>
        ) : (
          <div className="bg-white border border-gray-200 shadow-sm rounded-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 bg-[#FAFAFA]">
              <h3 className="text-[17px] font-normal text-[#2B2F5E]">
                Gare archiviate
              </h3>
            </div>

            {gare.length === 0 ? (
              <p className="p-6 text-sm text-gray-400">
                Nessuna gara archiviata.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-sm">
                  <thead className="bg-white border-b border-gray-200 text-[11px] uppercase tracking-[0.12em] text-gray-400">
                    <tr>
                      <th className="text-left px-4 py-3 w-36">Creata il</th>
                      <th className="text-left px-4 py-3">Gara</th>
                      <th className="text-left px-4 py-3 w-52">Ente</th>
                      <th className="text-left px-4 py-3 w-32">Scadenza</th>
                      <th className="text-left px-4 py-3 w-28">Stato</th>
                      <th className="text-right px-4 py-3 w-28">Scheda</th>
                    </tr>
                  </thead>

                  <tbody>
                    {gare.map((gara) => (
                      <tr
                        key={gara.id}
                        className="border-b border-gray-100 hover:bg-[#FAFAFA]"
                      >
                        <td className="px-4 py-3 text-[#2B2F5E]">
                          {formattaData(gara.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-[#2B2F5E]">
                            {gara.titolo}
                          </p>
                          <p className="mt-1 text-[12px] text-gray-500 line-clamp-2">
                            {gara.oggetto || ""}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {gara.ente || "-"}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {formattaData(gara.scadenza)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="bg-[#FFF8E7] text-[#2B2F5E] px-2 py-1 rounded-sm text-[12px] font-semibold">
                            {gara.stato}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/requisiti/preparazione?gara=${gara.id}`}
                            className="text-[#2B2F5E] hover:text-[#D79D06] font-semibold transition"
                          >
                            Apri
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </LayoutApp>
  );
}

function MessaggioDatabase({ errore }: { errore: string }) {
  return (
    <div className="bg-white border border-red-200 shadow-sm rounded-sm p-6">
      <h3 className="text-xl font-semibold text-[#2B2F5E]">
        Tabelle requisiti non disponibili
      </h3>
      <p className="text-sm text-gray-600 mt-2">
        Esegui prima il file SQL{" "}
        <span className="font-semibold">supabase-requisiti-gara.sql</span>.
      </p>
      <p className="text-xs text-red-500 mt-3">{errore}</p>
    </div>
  );
}

function formattaData(data: string | null) {
  if (!data) return "-";

  return new Date(data).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
