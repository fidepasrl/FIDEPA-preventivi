"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import LayoutApp from "@/components/LayoutApp";
import ImportoInput from "@/components/ImportoInput";
import { supabase } from "@/lib/supabase";
import { ordinaCategorieGara } from "@/lib/garaCategorieOrdine";
import {
  aggiungiImportiFidepa,
  calcolaImportoPrestazione,
} from "@/lib/gareAppalto";
import { finalizzaInputImporto, formattaEuro, parseImporto } from "@/lib/importi";

type Categoria = {
  codice: string;
  categoria: string | null;
  destinazione: string | null;
  grado_complessita: number | null;
  importo_fidepa: number;
};

type Fatturato = {
  anno: number;
  importo: string;
};

type Lavoro = {
  id: string;
  titolo: string;
  percentuale_prestazione: number | null;
};

type LavoroCategoria = {
  lavoro_id: string;
  categoria_codice: string;
  importo: number;
};

type RequisitoInput = {
  id: string;
  categoria_codice: string;
  importo_base: string;
};

const anniDefault = [2021, 2022, 2023, 2024, 2025];

export default function VerificaGaraPage() {
  const [categorie, setCategorie] = useState<Categoria[]>([]);
  const [fatturati, setFatturati] = useState<Fatturato[]>([]);
  const [fatturatoRichiesto, setFatturatoRichiesto] = useState("");
  const [coefficienteGenerici, setCoefficienteGenerici] = useState("2");
  const [coefficientePunta, setCoefficientePunta] = useState("1");
  const [numeroServiziPunta, setNumeroServiziPunta] = useState("2");
  const [lavori, setLavori] = useState<Lavoro[]>([]);
  const [importiLavori, setImportiLavori] = useState<LavoroCategoria[]>([]);
  const [requisiti, setRequisiti] = useState<RequisitoInput[]>([
    creaRequisitoVuoto(),
  ]);
  const [caricamento, setCaricamento] = useState(true);
  const [errore, setErrore] = useState("");

  useEffect(() => {
    async function caricaDati() {
      setCaricamento(true);
      setErrore("");

      const [categorieRes, fatturatiRes, lavoriRes, importiRes] =
        await Promise.all([
          supabase.from("gara_categorie").select("*").order("codice"),
          supabase.from("gara_fatturati").select("*").order("anno"),
          supabase
            .from("gara_lavori")
            .select("id, titolo, percentuale_prestazione"),
          supabase.from("gara_lavori_categorie").select("*"),
        ]);

      if (
        categorieRes.error ||
        fatturatiRes.error ||
        lavoriRes.error ||
        importiRes.error
      ) {
        setErrore(
          categorieRes.error?.message ||
            fatturatiRes.error?.message ||
            lavoriRes.error?.message ||
            importiRes.error?.message ||
            "Errore durante il caricamento."
        );
        setCaricamento(false);
        return;
      }

      const fatturatiDb = (fatturatiRes.data || []) as Fatturato[];
      const mappa = new Map(
        fatturatiDb.map((item) => [item.anno, item.importo])
      );
      const categorieOrdinate = ordinaCategorieGara(
        (categorieRes.data || []) as Categoria[]
      );
      const lavoriDb = (lavoriRes.data || []) as Lavoro[];
      const importiDb = (importiRes.data || []) as LavoroCategoria[];

      setCategorie(
        aggiungiImportiFidepa(categorieOrdinate, lavoriDb, importiDb)
      );
      setLavori(lavoriDb);
      setImportiLavori(importiDb);
      setFatturati(
        anniDefault.map((anno) => ({
          anno,
          importo: finalizzaInputImporto(mappa.get(anno) || 0),
        }))
      );
      setCaricamento(false);
    }

    caricaDati();
  }, []);

  const categorieByCodice = useMemo(
    () => new Map(categorie.map((categoria) => [categoria.codice, categoria])),
    [categorie]
  );

  const requisitiGenerici = requisiti.map((requisito) => ({
    ...requisito,
    importo_richiesto:
      parseImporto(requisito.importo_base) *
      parseCoefficiente(coefficienteGenerici),
  }));
  const righeGenerici = verificaRequisitiCategorie(
    requisitiGenerici,
    categorieByCodice,
    categorie
  );
  const righePunta = verificaServiziPunta(
    requisiti,
    categorieByCodice,
    lavori,
    importiLavori,
    coefficientePunta,
    numeroServiziPunta
  );

  const importoRichiestoTotale = righeGenerici.reduce(
    (totale, riga) => totale + riga.richiesto,
    0
  );
  const importoMancanteTotale = righeGenerici.reduce(
    (totale, riga) => totale + riga.mancante,
    0
  );
  const puntaSoddisfatti = righePunta.filter(
    (riga) => riga.mancante === 0
  ).length;

  const miglioriTre = [...fatturati]
    .map((item) => parseImporto(item.importo))
    .sort((a, b) => b - a)
    .slice(0, 3);
  const totaleMiglioriTre = miglioriTre.reduce((totale, item) => totale + item, 0);
  const mancanteFatturato = Math.max(
    0,
    parseImporto(fatturatoRichiesto) - totaleMiglioriTre
  );

  function aggiornaRequisito(
    id: string,
    campo: keyof RequisitoInput,
    valore: string
  ) {
    setRequisiti((correnti) =>
      correnti.map((requisito) =>
        requisito.id === id ? { ...requisito, [campo]: valore } : requisito
      )
    );
  }

  function aggiungiRequisito() {
    setRequisiti((correnti) => [...correnti, creaRequisitoVuoto()]);
  }

  function rimuoviRequisito(id: string) {
    setRequisiti((correnti) =>
      correnti.length === 1
        ? [creaRequisitoVuoto()]
        : correnti.filter((requisito) => requisito.id !== id)
    );
  }

  function aggiornaFatturato(anno: number, valore: string) {
    setFatturati((correnti) =>
      correnti.map((item) =>
        item.anno === anno ? { ...item, importo: valore } : item
      )
    );
  }

  async function salvaFatturati() {
    const payload = fatturati.map((item) => ({
      anno: item.anno,
      importo: parseImporto(item.importo),
    }));

    const { error } = await supabase.from("gara_fatturati").upsert(payload);

    if (error) {
      alert(`Errore durante il salvataggio dei fatturati: ${error.message}`);
      return;
    }

    alert("Fatturati salvati.");
  }

  return (
    <LayoutApp>
      <div>
        <div className="flex justify-between items-start gap-4 mb-6">
          <div>
            <h2 className="page-title">Verifica gara</h2>

            <p className="text-[15px] text-[#D79D06] mt-1">
              Controllo immediato dei requisiti tecnici ed economici
            </p>
          </div>

          <Link
            href="/requisiti"
            className="border border-gray-300 text-[#2B2F5E] px-4 py-3 rounded-md text-sm font-medium bg-white hover:bg-[#e8e8e8] transition"
          >
            Gare d&apos;appalto
          </Link>
        </div>

        {errore ? (
          <MessaggioDatabase errore={errore} />
        ) : caricamento ? (
          <p className="text-center text-gray-500 py-10">
            Caricamento verifica...
          </p>
        ) : (
          <div className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_380px] gap-4">
            <div className="bg-white border border-gray-200 shadow-sm rounded-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 bg-[#FAFAFA] flex justify-between items-center gap-4">
                <h3 className="text-[17px] font-normal text-[#2B2F5E]">
                  Categorie e importi di gara
                </h3>

                <button
                  type="button"
                  onClick={aggiungiRequisito}
                  className="bg-[#64B445] text-white w-10 h-10 rounded-md text-2xl font-light hover:bg-[#5AA03E] hover:scale-105 transition flex items-center justify-center shadow-sm cursor-pointer"
                >
                  +
                </button>
              </div>

              <div className="p-4 space-y-3">
                {requisiti.map((requisito) => (
                  <div
                    key={requisito.id}
                    className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_210px_40px] gap-3"
                  >
                    <select
                      value={requisito.categoria_codice}
                      onChange={(e) =>
                        aggiornaRequisito(
                          requisito.id,
                          "categoria_codice",
                          e.target.value
                        )
                      }
                      className="w-full min-w-0 border border-gray-300 rounded-md px-4 py-3 bg-transparent outline-none transition focus:bg-white focus:border-[#64B445] focus:shadow-sm text-[14px] text-[#2B2F5E]"
                    >
                      <option value="">Seleziona categoria</option>
                      {categorie.map((categoria) => (
                        <option key={categoria.codice} value={categoria.codice}>
                          {categoria.codice} -{" "}
                          {categoria.destinazione || categoria.categoria}
                        </option>
                      ))}
                    </select>

                    <ImportoInput
                      value={requisito.importo_base}
                      onChange={(value) =>
                        aggiornaRequisito(
                          requisito.id,
                          "importo_base",
                          value
                        )
                      }
                      placeholder="Importo lavori"
                    />

                    <button
                      type="button"
                      onClick={() => rimuoviRequisito(requisito.id)}
                      className="text-red-500 hover:text-red-700 text-xl font-semibold transition cursor-pointer"
                    >
                      &times;
                    </button>
                  </div>
                ))}

                <div className="pt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <h4 className="text-[16px] font-semibold text-[#2B2F5E]">
                    Verifica servizi generici
                  </h4>

                  <label className="flex items-center gap-2 text-[12px] font-semibold uppercase text-gray-500">
                    Coefficiente
                    <CoefficienteInput
                      value={coefficienteGenerici}
                      onChange={setCoefficienteGenerici}
                    />
                  </label>
                </div>

                <div className="overflow-x-auto border border-gray-200 rounded-sm">
                  <table className="w-full min-w-[820px] text-sm">
                    <thead className="bg-[#FAFAFA] border-b border-gray-200 text-[11px] uppercase tracking-[0.12em] text-gray-400">
                      <tr>
                        <th className="text-left px-4 py-3">Categoria</th>
                        <th className="text-right px-4 py-3">Importo lavori</th>
                        <th className="text-right px-4 py-3">Requisito</th>
                        <th className="text-right px-4 py-3">FIDEPA utile</th>
                        <th className="text-right px-4 py-3">Mancante</th>
                        <th className="text-left px-4 py-3">Esito</th>
                      </tr>
                    </thead>

                    <tbody>
                      {righeGenerici.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-4 py-8 text-center text-gray-400"
                          >
                            Inserisci almeno una categoria da verificare.
                          </td>
                        </tr>
                      ) : (
                        righeGenerici.map((riga) => (
                          <tr key={riga.id} className="border-b border-gray-100">
                            <td className="px-4 py-3 text-[#2B2F5E]">
                              <span className="font-semibold">
                                {riga.categoria?.codice}
                              </span>
                              <span className="text-gray-500">
                                {" "}
                                {riga.categoria?.destinazione || ""}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              {formattaEuro(parseImporto(riga.importo_base))}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {formattaEuro(riga.richiesto)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {formattaEuro(riga.posseduto)}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold">
                              {formattaEuro(riga.mancante)}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-1 rounded-sm text-[12px] font-semibold ${riga.esito.className}`}
                              >
                                {riga.esito.testo}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="pt-5 border-t border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <h4 className="text-[16px] font-semibold text-[#2B2F5E]">
                    Verifica servizi di punta
                  </h4>

                  <div className="flex flex-wrap items-center gap-4">
                    <label className="flex items-center gap-2 text-[12px] font-semibold uppercase text-gray-500">
                      Coefficiente
                      <CoefficienteInput
                        value={coefficientePunta}
                        onChange={setCoefficientePunta}
                      />
                    </label>

                    <label className="flex items-center gap-2 text-[12px] font-semibold uppercase text-gray-500">
                      N. servizi
                      <NumeroServiziInput
                        value={numeroServiziPunta}
                        onChange={setNumeroServiziPunta}
                      />
                    </label>
                  </div>
                </div>

                <div className="overflow-x-auto border border-gray-200 rounded-sm">
                  <table className="w-full min-w-[900px] text-sm">
                    <thead className="bg-[#FAFAFA] border-b border-gray-200 text-[11px] uppercase tracking-[0.12em] text-gray-400">
                      <tr>
                        <th className="text-left px-4 py-3">Categoria</th>
                        <th className="text-right px-4 py-3">Importo lavori</th>
                        <th className="text-right px-4 py-3">Requisito</th>
                        <th className="text-left px-4 py-3">Progetti utilizzati</th>
                        <th className="text-right px-4 py-3">Mancante</th>
                        <th className="text-left px-4 py-3">Esito</th>
                      </tr>
                    </thead>

                    <tbody>
                      {righePunta.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-4 py-8 text-center text-gray-400"
                          >
                            Inserisci almeno una categoria da verificare.
                          </td>
                        </tr>
                      ) : (
                        righePunta.map((riga) => (
                          <tr key={riga.id} className="border-b border-gray-100 align-top">
                            <td className="px-4 py-3 text-[#2B2F5E]">
                              <span className="font-semibold">
                                {riga.categoria?.codice}
                              </span>
                              <span className="text-gray-500">
                                {" "}
                                {riga.categoria?.destinazione || ""}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              {formattaEuro(parseImporto(riga.importo_base))}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {formattaEuro(riga.richiesto)}
                            </td>
                            <td className="px-4 py-3 min-w-[250px]">
                              {riga.progetti.length > 0 ? (
                                <div className="space-y-1">
                                  {riga.progetti.map((progetto) => (
                                    <p key={progetto.id} className="text-[12px] text-[#2B2F5E]">
                                      <span className="font-semibold">{progetto.titolo}</span>
                                      <span className="text-gray-500">
                                        {` - ${formattaEuro(progetto.importo)} (${progetto.codici.join(" + ")})`}
                                      </span>
                                    </p>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-gray-400">Nessun progetto idoneo</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold">
                              {formattaEuro(riga.mancante)}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-block px-2 py-1 rounded-sm text-[12px] font-semibold ${riga.esito.className}`}
                              >
                                {riga.esito.testo}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <Kpi label="Generici richiesti" value={formattaEuro(importoRichiestoTotale)} />
              <Kpi label="Generici mancanti" value={formattaEuro(importoMancanteTotale)} />
              <Kpi
                label="Servizi di punta soddisfatti"
                value={`${puntaSoddisfatti} / ${righePunta.length}`}
              />

              <div className="bg-white border border-gray-200 shadow-sm rounded-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 bg-[#FAFAFA]">
                  <h3 className="text-[17px] font-normal text-[#2B2F5E]">
                    Fatturato migliori 3 anni
                  </h3>
                </div>

                <div className="p-4 space-y-3">
                  {fatturati.map((item) => (
                    <label
                      key={item.anno}
                      className="grid grid-cols-[70px_1fr] gap-3 items-center"
                    >
                      <span className="text-[13px] text-[#2B2F5E]">
                        {item.anno}
                      </span>
                      <ImportoInput
                        value={item.importo || ""}
                        onChange={(value) => aggiornaFatturato(item.anno, value)}
                        compact
                      />
                    </label>
                  ))}

                  <button
                    type="button"
                    onClick={salvaFatturati}
                    className="w-full bg-[#64B445] text-white px-4 py-3 rounded-md text-sm font-medium hover:bg-[#5AA03E] transition cursor-pointer"
                  >
                    Salva fatturati
                  </button>

                  <div className="border-t border-gray-200 pt-3">
                    <p className="text-[11px] uppercase tracking-[0.12em] text-gray-400">
                      Somma migliori 3 degli ultimi 5
                    </p>
                    <p className="text-[24px] font-semibold text-[#2B2F5E]">
                      {formattaEuro(totaleMiglioriTre)}
                    </p>
                  </div>

                  <ImportoInput
                    value={fatturatoRichiesto}
                    onChange={setFatturatoRichiesto}
                    placeholder="Fatturato richiesto dal bando"
                  />

                  <div
                    className={`rounded-sm border p-3 ${
                      mancanteFatturato > 0
                        ? "border-red-200 bg-red-50"
                        : "border-green-200 bg-green-50"
                    }`}
                  >
                    <p className="text-[12px] uppercase tracking-[0.12em] text-gray-500">
                      Mancante fatturato
                    </p>
                    <p className="text-[20px] font-semibold text-[#2B2F5E]">
                      {formattaEuro(mancanteFatturato)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </LayoutApp>
  );
}

function creaRequisitoVuoto(): RequisitoInput {
  return {
    id: creaIdLocale(),
    categoria_codice: "",
    importo_base: "",
  };
}

function creaIdLocale() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return Math.random().toString(36).slice(2);
}

type FonteServizioPunta = {
  chiave: string;
  lavoroId: string;
  titolo: string;
  categoria: Categoria;
  importoCentesimi: number;
};

type ProgettoPunta = {
  id: string;
  titolo: string;
  importoCentesimi: number;
  importoEquivalenteCentesimi: number;
  codici: string[];
  fonti: FonteServizioPunta[];
};

function verificaServiziPunta(
  requisiti: RequisitoInput[],
  categorieByCodice: Map<string, Categoria>,
  lavori: Lavoro[],
  importiLavori: LavoroCategoria[],
  coefficientePunta: string,
  numeroServiziPunta: string
) {
  const lavoriById = new Map(lavori.map((lavoro) => [lavoro.id, lavoro]));
  const fonti = importiLavori.flatMap((riga) => {
    const lavoro = lavoriById.get(riga.lavoro_id);
    const categoria = categorieByCodice.get(riga.categoria_codice);
    const importoCentesimi = inCentesimi(
      calcolaImportoPrestazione(
        riga.importo,
        lavoro?.percentuale_prestazione
      )
    );

    if (!lavoro || !categoria || importoCentesimi <= 0) return [];

    return [
      {
        chiave: `${riga.lavoro_id}:${riga.categoria_codice}`,
        lavoroId: riga.lavoro_id,
        titolo: lavoro.titolo,
        categoria,
        importoCentesimi,
      },
    ];
  });
  const righe = requisiti
    .filter((requisito) => requisito.categoria_codice)
    .map((requisito, indice) => ({
      ...requisito,
      indice,
      categoria: categorieByCodice.get(requisito.categoria_codice),
      richiestoCentesimi: inCentesimi(
        parseImporto(requisito.importo_base) *
          parseCoefficiente(coefficientePunta)
      ),
      numeroServizi: normalizzaNumeroServizi(numeroServiziPunta),
    }));
  const fontiUsate = new Set<string>();
  const risultati = new Map<
    string,
    {
      progetti: ProgettoPunta[];
      importoCentesimi: number;
      codiciEquivalenti: string[];
    }
  >();

  // Le categorie piu complesse scelgono per prime i singoli servizi disponibili.
  const righeDaVerificare = [...righe].sort((a, b) => {
    const differenzaGrado =
      gradoComplessita(b.categoria) - gradoComplessita(a.categoria);

    return differenzaGrado || a.indice - b.indice;
  });

  for (const riga of righeDaVerificare) {
    if (!riga.categoria) {
      risultati.set(riga.id, {
        progetti: [],
        importoCentesimi: 0,
        codiciEquivalenti: [],
      });
      continue;
    }

    const progettiById = new Map<string, ProgettoPunta>();

    for (const fonte of fonti) {
      if (
        fontiUsate.has(fonte.chiave) ||
        !categoriaQualifica(riga.categoria, fonte.categoria)
      ) {
        continue;
      }

      const progetto = progettiById.get(fonte.lavoroId) || {
        id: fonte.lavoroId,
        titolo: fonte.titolo,
        importoCentesimi: 0,
        importoEquivalenteCentesimi: 0,
        codici: [],
        fonti: [],
      };

      progetto.importoCentesimi += fonte.importoCentesimi;
      if (fonte.categoria.codice !== riga.categoria.codice) {
        progetto.importoEquivalenteCentesimi += fonte.importoCentesimi;
      }
      progetto.codici.push(fonte.categoria.codice);
      progetto.fonti.push(fonte);
      progettiById.set(fonte.lavoroId, progetto);
    }

    const progetti = [...progettiById.values()].map((progetto) => ({
      ...progetto,
      codici: [...new Set(progetto.codici)],
    }));
    const selezionati = scegliServiziPunta(
      progetti,
      riga.numeroServizi,
      riga.richiestoCentesimi
    );

    selezionati.forEach((progetto) =>
      progetto.fonti.forEach((fonte) => fontiUsate.add(fonte.chiave))
    );

    risultati.set(riga.id, {
      progetti: selezionati,
      importoCentesimi: selezionati.reduce(
        (totale, progetto) => totale + progetto.importoCentesimi,
        0
      ),
      codiciEquivalenti: [
        ...new Set(
          selezionati.flatMap((progetto) =>
            progetto.codici.filter(
              (codice) => codice !== riga.categoria?.codice
            )
          )
        ),
      ],
    });
  }

  return righe.map((riga) => {
    const risultato = risultati.get(riga.id) || {
      progetti: [],
      importoCentesimi: 0,
      codiciEquivalenti: [],
    };
    const mancanteCentesimi = Math.max(
      0,
      riga.richiestoCentesimi - risultato.importoCentesimi
    );
    const soddisfatto = mancanteCentesimi === 0;

    return {
      ...riga,
      richiesto: daCentesimi(riga.richiestoCentesimi),
      mancante: daCentesimi(mancanteCentesimi),
      progetti: risultato.progetti.map((progetto) => ({
        id: progetto.id,
        titolo: progetto.titolo,
        importo: daCentesimi(progetto.importoCentesimi),
        codici: progetto.codici,
      })),
      esito: soddisfatto
        ? risultato.codiciEquivalenti.length > 0
          ? {
              testo: `Soddisfatto in ${risultato.codiciEquivalenti.join(" + ")}`,
              className: "bg-blue-50 text-blue-700",
            }
          : {
              testo: "OK",
              className: "bg-green-50 text-green-700",
            }
        : esitoDaIntegrare(),
    };
  });
}

function scegliServiziPunta(
  progetti: ProgettoPunta[],
  numeroServizi: number,
  richiestoCentesimi: number
) {
  if (progetti.length === 0 || richiestoCentesimi <= 0) return [];

  const limite = Math.min(numeroServizi, progetti.length);
  let miglioreSoddisfatta: ProgettoPunta[] | null = null;
  let miglioreParziale: ProgettoPunta[] = [];

  function visita(indice: number, selezionati: ProgettoPunta[]) {
    if (selezionati.length > 0) {
      const totale = totaleProgetti(selezionati);

      if (totale >= richiestoCentesimi) {
        if (
          !miglioreSoddisfatta ||
          confrontaCombinazioni(
            selezionati,
            miglioreSoddisfatta,
            richiestoCentesimi
          ) < 0
        ) {
          miglioreSoddisfatta = [...selezionati];
        }
      } else if (totale > totaleProgetti(miglioreParziale)) {
        miglioreParziale = [...selezionati];
      }
    }

    if (selezionati.length === limite) return;

    for (let i = indice; i < progetti.length; i += 1) {
      selezionati.push(progetti[i]);
      visita(i + 1, selezionati);
      selezionati.pop();
    }
  }

  visita(0, []);
  return miglioreSoddisfatta || miglioreParziale;
}

function confrontaCombinazioni(
  a: ProgettoPunta[],
  b: ProgettoPunta[],
  richiestoCentesimi: number
) {
  const equivalenteA = a.reduce(
    (totale, progetto) => totale + progetto.importoEquivalenteCentesimi,
    0
  );
  const equivalenteB = b.reduce(
    (totale, progetto) => totale + progetto.importoEquivalenteCentesimi,
    0
  );

  if (equivalenteA !== equivalenteB) return equivalenteA - equivalenteB;
  if (a.length !== b.length) return a.length - b.length;

  return (
    totaleProgetti(a) - richiestoCentesimi -
    (totaleProgetti(b) - richiestoCentesimi)
  );
}

function totaleProgetti(progetti: ProgettoPunta[]) {
  return progetti.reduce(
    (totale, progetto) => totale + progetto.importoCentesimi,
    0
  );
}

function verificaRequisitiCategorie(
  requisiti: Array<
    RequisitoInput & { importo_richiesto: string | number }
  >,
  categorieByCodice: Map<string, Categoria>,
  categorie: Categoria[],
) {
  const righe = requisiti
    .filter((requisito) => requisito.categoria_codice)
    .map((requisito, indice) => ({
      ...requisito,
      indice,
      categoria: categorieByCodice.get(requisito.categoria_codice),
      richiestoCentesimi: inCentesimi(requisito.importo_richiesto),
    }));
  const disponibilita = new Map(
    categorie.map((categoria) => [
      categoria.codice,
      inCentesimi(categoria.importo_fidepa),
    ])
  );
  const allocazioni = new Map(
    righe.map((riga) => [
      riga.id,
      {
        diretto: 0,
        equivalenti: new Map<string, number>(),
      },
    ])
  );

  // Ogni categoria conserva anzitutto quanto serve per la propria richiesta.
  for (const riga of righe) {
    if (!riga.categoria) continue;

    const disponibile = disponibilita.get(riga.categoria.codice) || 0;
    const assegnato = Math.min(disponibile, riga.richiestoCentesimi);
    const allocazione = allocazioni.get(riga.id);

    if (!allocazione) continue;

    allocazione.diretto = assegnato;
    disponibilita.set(riga.categoria.codice, disponibile - assegnato);
  }

  // Le richieste piu complesse hanno meno alternative e usano per prime i residui.
  const righeDaCompletare = [...righe].sort((a, b) => {
    const differenzaGrado =
      gradoComplessita(b.categoria) - gradoComplessita(a.categoria);

    return differenzaGrado || a.indice - b.indice;
  });

  for (const riga of righeDaCompletare) {
    if (!riga.categoria) continue;

    const categoriaRichiesta = riga.categoria;
    const allocazione = allocazioni.get(riga.id);
    if (!allocazione) continue;

    let daCoprire = Math.max(
      0,
      riga.richiestoCentesimi - allocazione.diretto
    );
    if (daCoprire === 0) continue;

    const equivalenti = categorie
      .filter(
        (categoria) =>
          categoria.codice !== categoriaRichiesta.codice &&
          categoriaQualifica(categoriaRichiesta, categoria) &&
          (disponibilita.get(categoria.codice) || 0) > 0
      )
      .sort((a, b) =>
        ordinaCategorieEquivalenti(a, b, disponibilita)
      );
    const categoriaSufficiente = equivalenti.find(
      (categoria) =>
        (disponibilita.get(categoria.codice) || 0) >= daCoprire
    );
    const categorieDaUsare = categoriaSufficiente
      ? [categoriaSufficiente]
      : equivalenti;

    for (const categoria of categorieDaUsare) {
      const disponibile = disponibilita.get(categoria.codice) || 0;
      const assegnato = Math.min(disponibile, daCoprire);

      if (assegnato <= 0) continue;

      allocazione.equivalenti.set(categoria.codice, assegnato);
      disponibilita.set(categoria.codice, disponibile - assegnato);
      daCoprire -= assegnato;

      if (daCoprire === 0) break;
    }
  }

  return righe.map((riga) => {
    const allocazione = allocazioni.get(riga.id);
    const equivalente = [...(allocazione?.equivalenti.values() || [])].reduce(
      (totale, importo) => totale + importo,
      0
    );
    const possedutoCentesimi = (allocazione?.diretto || 0) + equivalente;
    const mancanteCentesimi = Math.max(
      0,
      riga.richiestoCentesimi - possedutoCentesimi
    );
    const codiciEquivalenti = [
      ...(allocazione?.equivalenti.keys() || []),
    ];
    const soddisfattoDirettamente =
      mancanteCentesimi === 0 &&
      (allocazione?.diretto || 0) >= riga.richiestoCentesimi;
    const soddisfattoConEquivalenti =
      mancanteCentesimi === 0 && codiciEquivalenti.length > 0;

    return {
      ...riga,
      richiesto: daCentesimi(riga.richiestoCentesimi),
      posseduto: daCentesimi(possedutoCentesimi),
      mancante: daCentesimi(mancanteCentesimi),
      esito: soddisfattoDirettamente
        ? {
            testo: "OK",
            className: "bg-green-50 text-green-700",
          }
        : soddisfattoConEquivalenti
          ? {
              testo: `Soddisfatto in ${codiciEquivalenti.join(" + ")}`,
              className: "bg-blue-50 text-blue-700",
            }
          : esitoDaIntegrare(),
    };
  });
}

function categoriaQualifica(
  categoriaRichiesta: Categoria,
  categoriaCandidata: Categoria
) {
  return (
    categoriaOperaKey(categoriaRichiesta) === categoriaOperaKey(categoriaCandidata) &&
    gradoComplessita(categoriaCandidata) >= gradoComplessita(categoriaRichiesta)
  );
}

function ordinaCategorieEquivalenti(
  a: Categoria,
  b: Categoria,
  disponibilita: Map<string, number>
) {
  const gradoA = gradoComplessita(a);
  const gradoB = gradoComplessita(b);

  if (gradoA !== gradoB) return gradoA - gradoB;

  const importoA = disponibilita.get(a.codice) || 0;
  const importoB = disponibilita.get(b.codice) || 0;

  if (importoA !== importoB) return importoB - importoA;

  return a.codice.localeCompare(b.codice, "it-IT", {
    numeric: true,
    sensitivity: "base",
  });
}

function categoriaOperaKey(categoria: Categoria) {
  return (categoria.categoria || categoria.codice.split(".")[0] || "")
    .trim()
    .toLowerCase();
}

function gradoComplessita(categoria: Categoria | undefined) {
  if (!categoria) return 0;

  return Number(categoria.grado_complessita || 0);
}

function inCentesimi(value: string | number | null | undefined) {
  return Math.round(parseImporto(value) * 100);
}

function daCentesimi(value: number) {
  return value / 100;
}

function parseCoefficiente(value: string | number) {
  return Math.max(0, parseImporto(value));
}

function normalizzaNumeroServizi(value: string | number) {
  const numero = Math.round(Number(value) || 1);

  return Math.min(3, Math.max(1, numero));
}

function esitoDaIntegrare() {
  return {
    testo: "Da integrare",
    className: "bg-red-50 text-red-600",
  };
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-gray-200 shadow-sm rounded-sm p-4">
      <p className="text-[11px] uppercase tracking-[0.12em] text-gray-400">
        {label}
      </p>
      <p className="mt-2 text-[22px] font-semibold text-[#2B2F5E]">{value}</p>
    </div>
  );
}

function CoefficienteInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      value={value}
      onChange={(event) =>
        onChange(event.target.value.replace(/[^\d,.]/g, ""))
      }
      inputMode="decimal"
      aria-label="Coefficiente"
      className="w-20 h-9 border border-gray-300 rounded-md bg-white px-2 text-center outline-none focus:border-[#64B445]"
    />
  );
}

function NumeroServiziInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      type="number"
      min={1}
      max={3}
      step={1}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onBlur={(event) =>
        onChange(String(normalizzaNumeroServizi(event.target.value)))
      }
      aria-label="Numero servizi di punta"
      className="w-20 h-9 border border-gray-300 rounded-md bg-white px-2 text-center outline-none focus:border-[#64B445]"
    />
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
