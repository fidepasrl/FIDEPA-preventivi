"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";
import LayoutApp from "@/components/LayoutApp";
import { supabase } from "@/lib/supabase";
import { ordinaCategorieGara } from "@/lib/garaCategorieOrdine";
import {
  aggiungiImportiFidepa,
  calcolaImportoPrestazione,
  percentualeVisibile,
} from "@/lib/gareAppalto";
import { formattaEuro } from "@/lib/importi";

type Categoria = {
  codice: string;
  categoria: string | null;
  destinazione: string | null;
  descrizione: string | null;
  grado_complessita: number | null;
  importo_fidepa: number;
};

type Lavoro = {
  id: string;
  titolo: string;
  committente: string | null;
  data_inizio: string | null;
  data_fine: string | null;
  importo_lavori: number;
  percentuale_prestazione: number | null;
};

type LavoroCategoria = {
  lavoro_id: string;
  categoria_codice: string;
  importo: number;
};

export default function CategorieGaraPage() {
  const [categorie, setCategorie] = useState<Categoria[]>([]);
  const [lavori, setLavori] = useState<Lavoro[]>([]);
  const [importi, setImporti] = useState<LavoroCategoria[]>([]);
  const [ricerca, setRicerca] = useState("");
  const [categoriaAperta, setCategoriaAperta] = useState<string | null>(null);
  const [caricamento, setCaricamento] = useState(true);
  const [errore, setErrore] = useState("");

  useEffect(() => {
    caricaDati();
  }, []);

  async function caricaDati() {
    setCaricamento(true);
    setErrore("");

    const [categorieRes, lavoriRes, importiRes] = await Promise.all([
      supabase.from("gara_categorie").select("*").order("codice"),
      supabase.from("gara_lavori").select("*").order("titolo"),
      supabase.from("gara_lavori_categorie").select("*"),
    ]);

    if (categorieRes.error || lavoriRes.error || importiRes.error) {
      const messaggio =
        categorieRes.error?.message ||
        lavoriRes.error?.message ||
        importiRes.error?.message ||
        "Errore durante il caricamento dei requisiti.";
      setErrore(messaggio);
      setCaricamento(false);
      return;
    }

    setCategorie(ordinaCategorieGara((categorieRes.data || []) as Categoria[]));
    setLavori((lavoriRes.data || []) as Lavoro[]);
    setImporti((importiRes.data || []) as LavoroCategoria[]);
    setCaricamento(false);
  }

  const lavoriById = useMemo(() => {
    return new Map(lavori.map((lavoro) => [lavoro.id, lavoro]));
  }, [lavori]);

  const categorieConImporti = useMemo(
    () => aggiungiImportiFidepa(categorie, lavori, importi),
    [categorie, lavori, importi]
  );

  const categorieVisibili = categorieConImporti.filter(
    (categoria) => Number(categoria.importo_fidepa || 0) > 0
  );

  const categorieFiltrate = categorieVisibili.filter((categoria) => {
    const testo = `${categoria.codice} ${categoria.categoria || ""} ${
      categoria.destinazione || ""
    } ${categoria.descrizione || ""}`.toLowerCase();

    return testo.includes(ricerca.toLowerCase());
  });

  const categorieConImporto = categorieVisibili.length;

  const importoTotale = categorieVisibili.reduce(
    (totale, categoria) => totale + Number(categoria.importo_fidepa || 0),
    0
  );

  function getImportiCategoria(codice: string) {
    return importi
      .filter((riga) => riga.categoria_codice === codice)
      .map((riga) => ({
        ...riga,
        lavoro: lavoriById.get(riga.lavoro_id) || null,
      }))
      .filter((riga) => riga.lavoro)
      .map((riga) => ({
        ...riga,
        importo_ponderato: calcolaImportoPrestazione(
          riga.importo,
          riga.lavoro?.percentuale_prestazione || 0
        ),
        percentuale: percentualeVisibile(
          riga.lavoro?.percentuale_prestazione || 0
        ),
      }))
      .sort(
        (a, b) =>
          Number(b.importo_ponderato || 0) - Number(a.importo_ponderato || 0)
      );
  }

  return (
    <LayoutApp>
      <div>
        <div className="flex justify-between items-start gap-4 mb-6">
          <div>
            <h2 className="page-title">Categorie di gara</h2>

            <p className="text-[15px] text-[#D79D06] mt-1">
              Importi calcolati dalla Lista commesse e ponderati per prestazione
            </p>
          </div>

          <Link
            href="/requisiti/commesse"
            className="border border-gray-300 text-[#2B2F5E] px-4 py-3 rounded-md text-sm font-medium bg-white hover:bg-[#e8e8e8] transition"
          >
            Lista commesse
          </Link>
        </div>

        {errore ? (
          <MessaggioDatabase errore={errore} />
        ) : caricamento ? (
          <p className="text-center text-gray-500 py-10">
            Caricamento categorie...
          </p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Kpi label="Categorie valorizzate" value={categorieConImporto} />
              <Kpi label="Commesse" value={lavori.length} />
              <Kpi label="Importo totale" value={formattaEuro(importoTotale)} />
            </div>

            <div className="bg-white border border-gray-200 shadow-sm rounded-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 bg-[#FAFAFA] flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
                <h3 className="text-[17px] font-normal text-[#2B2F5E]">
                  Elenco categorie
                </h3>

                <input
                  value={ricerca}
                  onChange={(e) => setRicerca(e.target.value)}
                  placeholder="Cerca codice o descrizione"
                  className="w-full lg:w-80 border border-gray-300 rounded-md px-4 py-3 bg-transparent outline-none transition focus:bg-white focus:border-[#64B445] focus:shadow-sm text-[14px] text-[#2B2F5E]"
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead className="bg-white border-b border-gray-200 text-[11px] uppercase tracking-[0.12em] text-gray-400">
                    <tr>
                      <th className="text-left px-4 py-3 w-24">Codice</th>
                      <th className="text-left px-4 py-3">Categoria</th>
                      <th className="text-left px-4 py-3">Destinazione</th>
                      <th className="text-right px-4 py-3 w-36">G</th>
                      <th className="text-right px-4 py-3 w-48">
                        Importo FIDEPA
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {categorieFiltrate.map((categoria) => {
                      const aperta = categoriaAperta === categoria.codice;
                      const dettagli = getImportiCategoria(categoria.codice);

                      return (
                        <Fragment key={categoria.codice}>
                          <tr
                            className="border-b border-gray-100 hover:bg-[#FAFAFA]"
                          >
                            <td className="px-4 py-3 font-semibold text-[#2B2F5E]">
                              <button
                                type="button"
                                onClick={() =>
                                  setCategoriaAperta(
                                    aperta ? null : categoria.codice
                                  )
                                }
                                className="cursor-pointer hover:text-[#D79D06]"
                              >
                                {categoria.codice}
                              </button>
                            </td>
                            <td className="px-4 py-3 text-[#2B2F5E]">
                              {categoria.categoria || "-"}
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              <p>{categoria.destinazione || "-"}</p>
                              <p className="mt-1 text-[12px] text-gray-400 line-clamp-2">
                                {categoria.descrizione || ""}
                              </p>
                            </td>
                            <td className="px-4 py-3 text-right text-[#2B2F5E]">
                              {categoria.grado_complessita || "-"}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-[#2B2F5E]">
                              {formattaEuro(categoria.importo_fidepa)}
                            </td>
                          </tr>

                          {aperta && (
                            <tr className="bg-[#FAFAFA] border-b border-gray-200">
                              <td colSpan={5} className="px-4 py-4">
                                {dettagli.length === 0 ? (
                                  <p className="text-sm text-gray-400">
                                    Nessuna commessa associata a questa categoria.
                                  </p>
                                ) : (
                                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                                    {dettagli.map((riga) => (
                                      <div
                                        key={`${riga.lavoro_id}-${riga.categoria_codice}`}
                                        className="bg-white border border-gray-200 rounded-sm p-3"
                                      >
                                        <p className="text-[14px] font-semibold text-[#2B2F5E]">
                                          {riga.lavoro?.titolo}
                                        </p>
                                        <p className="text-[12px] text-gray-500 mt-1">
                                          {riga.lavoro?.committente || "-"}
                                        </p>
                                        <p className="text-[15px] text-[#D79D06] mt-2 font-semibold">
                                          {formattaEuro(riga.importo_ponderato)}
                                        </p>
                                        <p className="text-[12px] text-gray-400 mt-1">
                                          Lavori {formattaEuro(riga.importo)} x{" "}
                                          {riga.percentuale}%
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </LayoutApp>
  );
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white border border-gray-200 shadow-sm rounded-sm p-4">
      <p className="text-[11px] uppercase tracking-[0.12em] text-gray-400">
        {label}
      </p>
      <p className="mt-2 text-[24px] font-semibold text-[#2B2F5E]">{value}</p>
    </div>
  );
}

function MessaggioDatabase({ errore }: { errore: string }) {
  return (
    <div className="bg-white border border-red-200 shadow-sm rounded-sm p-6">
      <h3 className="text-xl font-semibold text-[#2B2F5E]">
        Tabelle requisiti non disponibili
      </h3>
      <p className="text-sm text-gray-600 mt-2">
        Esegui prima il file SQL <span className="font-semibold">supabase-requisiti-gara.sql</span>.
      </p>
      <p className="text-xs text-red-500 mt-3">{errore}</p>
    </div>
  );
}
