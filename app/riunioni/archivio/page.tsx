"use client";

import { useEffect, useState } from "react";
import LayoutApp from "@/components/LayoutApp";
import { supabase } from "@/lib/supabase";

type NotaRiunione = {
  commessa_id: string | null;
  titolo: string;
  data: string;
  testo: string;
  tipo?: "commessa" | "libera";
};

type Riunione = {
  id: string;
  titolo: string;
  settimana: number | null;
  data_riunione: string | null;
  contenuto: NotaRiunione[];
  created_at: string;
};

export default function ArchivioRiunioniPage() {
  const [riunioni, setRiunioni] = useState<Riunione[]>([]);
  const [caricamento, setCaricamento] = useState(true);
  const [riunioneAperta, setRiunioneAperta] = useState<Riunione | null>(null);
  const [riunioneDaEliminare, setRiunioneDaEliminare] =
    useState<Riunione | null>(null);

  useEffect(() => {
    caricaRiunioni();
  }, []);

  async function caricaRiunioni() {
    setCaricamento(true);

    const { data, error } = await supabase
      .from("riunioni")
      .select("*")
      .order("data_riunione", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setRiunioni([]);
    } else {
      setRiunioni(data || []);
    }

    setCaricamento(false);
  }

  async function eliminaRiunione() {
    if (!riunioneDaEliminare) return;

    const { error } = await supabase
      .from("riunioni")
      .delete()
      .eq("id", riunioneDaEliminare.id);

    if (error) {
      alert("Errore durante l'eliminazione della riunione.");
      return;
    }

    setRiunioni((correnti) =>
      correnti.filter((item) => item.id !== riunioneDaEliminare.id)
    );

    if (riunioneAperta?.id === riunioneDaEliminare.id) {
      setRiunioneAperta(null);
    }

    setRiunioneDaEliminare(null);
  }

  function formattaData(data: string | null) {
    if (!data) return "-";
    return new Date(data).toLocaleDateString("it-IT");
  }

  return (
    <LayoutApp>
      <div>
        <div className="flex justify-between items-center gap-4 mb-6">
          <div>
            <h2 className="page-title">Archivio riunioni</h2>

            <p className="text-[15px] text-[#D79D06] mt-1">
              Taccuini riunione salvati
            </p>
          </div>

          <button
            type="button"
            onClick={caricaRiunioni}
            className="border border-gray-300 text-[#2B2F5E] px-5 py-3 rounded-md text-sm font-medium bg-transparent hover:bg-[#e8e8e8] transition cursor-pointer"
          >
            Aggiorna
          </button>
        </div>

        {caricamento ? (
          <p className="text-center text-gray-500 py-10">
            Caricamento riunioni...
          </p>
        ) : riunioni.length === 0 ? (
          <p className="text-center text-gray-500 py-10">
            Nessuna riunione archiviata.
          </p>
        ) : (
          <div className="grid grid-cols-[300px_1fr] gap-6">
            <aside className="border-r border-gray-300 pr-4">
              <div className="space-y-2">
                {riunioni.map((riunione) => {
                  const attiva = riunioneAperta?.id === riunione.id;

                  return (
                    <button
                      key={riunione.id}
                      type="button"
                      onClick={() => setRiunioneAperta(riunione)}
                      className={`w-full text-left px-4 py-3 rounded-sm transition cursor-pointer ${
                        attiva
                          ? "bg-white text-[#2B2F5E] font-semibold shadow-sm border border-gray-200"
                          : "text-[#2B2F5E] hover:bg-[#e8e8e8]"
                      }`}
                    >
                      <p className="text-[15px]">
                        {riunione.titolo || "Riunione"}
                      </p>

                      <p className="text-[13px] text-[#D79D06] mt-0">
                        {formattaData(riunione.data_riunione)}
                      </p>
                    </button>
                  );
                })}
              </div>
            </aside>

            <section>
              {!riunioneAperta ? (
                <div className="bg-white border border-gray-200 shadow-sm rounded-sm p-8 text-gray-500">
                  Seleziona una riunione dall’archivio.
                </div>
              ) : (
                <>
                  <div className="flex justify-end mb-4">
                    <div className="text-right">
                      <h2 className="text-[24px] font-semibold text-[#2B2F5E]">
                        {riunioneAperta.titolo}
                      </h2>

                      <p className="text-[15px] text-[#D79D06] mt-1">
                        {formattaData(riunioneAperta.data_riunione)}
                      </p>
                    </div>
                  </div>

                  <div className="bg-[#FFFDF5] border border-gray-200 shadow-sm rounded-sm min-h-[720px] p-10 relative overflow-hidden">
                    <div
                      className="absolute inset-0 pointer-events-none opacity-60"
                      style={{
                        backgroundImage:
                          "linear-gradient(#e8dfc8 1px, transparent 1px)",
                        backgroundSize: "100% 34px",
                      }}
                    />

                    <div className="relative z-10 space-y-8">
                      {riunioneAperta.contenuto?.length ? (
                        riunioneAperta.contenuto.map((nota, index) => (
                          <div
                            key={`${nota.commessa_id || "libera"}-${index}`}
                            className="space-y-2"
                          >
                            <div className="flex items-center gap-2">
                              <h3 className="text-[20px] font-semibold text-[#2B2F5E]">
                                {nota.titolo || "Nota libera"}
                              </h3>

                              {(nota.tipo === "libera" ||
                                !nota.commessa_id) && (
                                <span className="text-[11px] uppercase tracking-[0.12em] text-gray-400 font-medium">
                                  Nota libera
                                </span>
                              )}
                            </div>

                            <p className="text-[14px] text-[#D79D06]">
                              {formattaData(nota.data)}
                            </p>

                            <p className="text-[16px] leading-[34px] text-[#2B2F5E] whitespace-pre-line">
                              {nota.testo}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-400">
                          Nessuna nota presente in questa riunione.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end mt-6">
                    <button
                      type="button"
                      onClick={() => setRiunioneDaEliminare(riunioneAperta)}
                      className="bg-red-600 text-white w-10 h-10 rounded-md text-xl font-light hover:bg-red-700 hover:scale-105 transition flex items-center justify-center shadow-sm cursor-pointer"
                      title="Elimina riunione"
                    >
                      ×
                    </button>
                  </div>
                </>
              )}
            </section>
          </div>
        )}
      </div>

      {riunioneDaEliminare && (
        <Popup
          title="Elimina riunione"
          onClose={() => setRiunioneDaEliminare(null)}
        >
          <p className="text-sm text-gray-600 mb-8">
            Sei sicuro di voler eliminare questa riunione dall’archivio?
          </p>

          <div className="border border-gray-200 rounded-sm p-4 bg-[#F2F2F2] mb-8">
            <p className="text-sm text-[#2B2F5E]">
              {riunioneDaEliminare.titolo}
            </p>

            <p className="text-sm text-[#D79D06] mt-1">
              {formattaData(riunioneDaEliminare.data_riunione)}
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setRiunioneDaEliminare(null)}
              className="border border-gray-300 text-[#2B2F5E] px-5 py-3 rounded-md text-sm font-medium bg-transparent hover:bg-[#e8e8e8] transition cursor-pointer"
            >
              Annulla
            </button>

            <button
              type="button"
              onClick={eliminaRiunione}
              className="bg-red-600 hover:bg-red-700 text-white px-5 py-3 rounded-md text-sm font-medium transition cursor-pointer"
            >
              Elimina
            </button>
          </div>
        </Popup>
      )}
    </LayoutApp>
  );
}

function Popup({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-md shadow-2xl w-full max-w-md p-8">
        <div className="flex justify-between items-start mb-6">
          <h3 className="text-xl font-semibold text-[#2B2F5E]">{title}</h3>

          <button
            type="button"
            onClick={onClose}
            className="text-2xl text-gray-400 hover:text-[#2B2F5E] cursor-pointer"
          >
            ×
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}