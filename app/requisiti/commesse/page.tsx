"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import LayoutApp from "@/components/LayoutApp";
import ImportoInput from "@/components/ImportoInput";
import { supabase } from "@/lib/supabase";
import { ordinaCategorieGara } from "@/lib/garaCategorieOrdine";
import {
  PRESTAZIONI_GARA,
  calcolaImportoPrestazione,
  percentualeVisibile,
} from "@/lib/gareAppalto";
import { finalizzaInputImporto, formattaEuro, parseImporto } from "@/lib/importi";

type Categoria = {
  codice: string;
  categoria: string | null;
  destinazione: string | null;
  descrizione: string | null;
};

type Lavoro = {
  id: string;
  titolo: string;
  committente: string | null;
  data_inizio: string | null;
  data_fine: string | null;
  importo_lavori: number;
  percentuale_prestazione: number | null;
  prestazioni: string[] | null;
  created_at: string;
};

type LavoroCategoria = {
  lavoro_id: string;
  categoria_codice: string;
  importo: number;
};

const FORM_INIZIALE = {
  id: "",
  titolo: "",
  committente: "",
  data_inizio: "",
  data_fine: "",
  importo_lavori: "",
  percentuale_prestazione: "100",
  prestazioni: [] as string[],
};

export default function ListaCommesseGaraPage() {
  const [categorie, setCategorie] = useState<Categoria[]>([]);
  const [lavori, setLavori] = useState<Lavoro[]>([]);
  const [importi, setImporti] = useState<LavoroCategoria[]>([]);
  const [form, setForm] = useState(FORM_INIZIALE);
  const [importiCategorie, setImportiCategorie] = useState<Record<string, string>>(
    {}
  );
  const [ricercaCategoria, setRicercaCategoria] = useState("");
  const [caricamento, setCaricamento] = useState(true);
  const [salvataggio, setSalvataggio] = useState(false);
  const [errore, setErrore] = useState("");

  useEffect(() => {
    caricaDati();
  }, []);

  async function caricaDati(lavoroDaRiaprire?: string) {
    setCaricamento(true);
    setErrore("");

    const [categorieRes, lavoriRes, importiRes] = await Promise.all([
      supabase.from("gara_categorie").select("*").order("codice"),
      supabase
        .from("gara_lavori")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase.from("gara_lavori_categorie").select("*"),
    ]);

    if (categorieRes.error || lavoriRes.error || importiRes.error) {
      setErrore(
        categorieRes.error?.message ||
          lavoriRes.error?.message ||
          importiRes.error?.message ||
          "Errore durante il caricamento della lista commesse."
      );
      setCaricamento(false);
      return;
    }

    const categorieOrdinate = ordinaCategorieGara(
      (categorieRes.data || []) as Categoria[]
    );
    const lavoriDb = (lavoriRes.data || []) as Lavoro[];
    const importiDb = (importiRes.data || []) as LavoroCategoria[];

    setCategorie(categorieOrdinate);
    setLavori(lavoriDb);
    setImporti(importiDb);
    setCaricamento(false);

    const lavoro =
      lavoriDb.find((item) => item.id === lavoroDaRiaprire) ||
      lavoriDb.find((item) => item.id === form.id);

    if (lavoro) {
      apriLavoro(lavoro, importiDb);
    }
  }

  const categorieFiltrate = categorie.filter((categoria) => {
    const testo = `${categoria.codice} ${categoria.categoria || ""} ${
      categoria.destinazione || ""
    } ${categoria.descrizione || ""}`.toLowerCase();

    return testo.includes(ricercaCategoria.toLowerCase());
  });

  const importoLavori = parseImporto(form.importo_lavori);
  const percentuale = parseImporto(form.percentuale_prestazione);
  const totaleCategorie = useMemo(
    () =>
      Object.values(importiCategorie).reduce(
        (totale, valore) => totale + parseImporto(valore),
        0
      ),
    [importiCategorie]
  );
  const importoPonderato = calcolaImportoPrestazione(
    totaleCategorie,
    percentuale
  );
  const residuo = importoLavori - totaleCategorie;
  const superaImportoLavori = totaleCategorie > importoLavori + 0.01;

  function aggiornaForm(campo: keyof typeof FORM_INIZIALE, valore: string) {
    setForm((corrente) => ({ ...corrente, [campo]: valore }));
  }

  function nuovaCommessa() {
    setForm(FORM_INIZIALE);
    setImportiCategorie({});
  }

  function apriLavoro(
    lavoro: Lavoro,
    importiDisponibili: LavoroCategoria[] = importi
  ) {
    const importiLavoro: Record<string, string> = {};

    importiDisponibili
      .filter((riga) => riga.lavoro_id === lavoro.id)
      .forEach((riga) => {
        importiLavoro[riga.categoria_codice] = finalizzaInputImporto(
          riga.importo
        );
      });

    setForm({
      id: lavoro.id,
      titolo: lavoro.titolo || "",
      committente: lavoro.committente || "",
      data_inizio: lavoro.data_inizio || "",
      data_fine: lavoro.data_fine || "",
      importo_lavori: finalizzaInputImporto(lavoro.importo_lavori),
      percentuale_prestazione: String(
        percentualeVisibile(lavoro.percentuale_prestazione || 0) || ""
      ),
      prestazioni: lavoro.prestazioni || [],
    });
    setImportiCategorie(importiLavoro);
  }

  function togglePrestazione(id: string) {
    setForm((corrente) => ({
      ...corrente,
      prestazioni: corrente.prestazioni.includes(id)
        ? corrente.prestazioni.filter((item) => item !== id)
        : [...corrente.prestazioni, id],
    }));
  }

  function aggiornaImportoCategoria(codice: string, valore: string) {
    setImportiCategorie((correnti) => ({
      ...correnti,
      [codice]: valore,
    }));
  }

  async function salvaCommessa() {
    if (!form.titolo.trim()) {
      alert("Inserisci il nome della commessa.");
      return;
    }

    if (importoLavori <= 0) {
      alert("Inserisci un importo lavori maggiore di zero.");
      return;
    }

    if (percentuale < 0 || percentuale > 100) {
      alert("La percentuale di prestazione deve essere tra 0 e 100.");
      return;
    }

    if (superaImportoLavori) {
      alert("La somma degli importi delle categorie non puo superare l'importo lavori.");
      return;
    }

    setSalvataggio(true);

    const payload = {
      titolo: form.titolo.trim(),
      committente: form.committente.trim() || null,
      data_inizio: form.data_inizio || null,
      data_fine: form.data_fine || null,
      importo_lavori: importoLavori,
      percentuale_prestazione: percentuale,
      prestazioni: form.prestazioni,
      fonte: "Lista commesse",
      updated_at: new Date().toISOString(),
    };

    const richiesta = form.id
      ? supabase
          .from("gara_lavori")
          .update(payload)
          .eq("id", form.id)
          .select()
          .single()
      : supabase.from("gara_lavori").insert(payload).select().single();

    const { data, error } = await richiesta;

    if (error || !data) {
      alert(
        `Errore durante il salvataggio della commessa: ${
          error?.message || "controlla le colonne del database"
        }`
      );
      setSalvataggio(false);
      return;
    }

    const lavoroId = data.id as string;

    const { error: deleteError } = await supabase
      .from("gara_lavori_categorie")
      .delete()
      .eq("lavoro_id", lavoroId);

    if (deleteError) {
      alert(`Errore durante l'aggiornamento delle categorie: ${deleteError.message}`);
      setSalvataggio(false);
      return;
    }

    const importiPayload = Object.entries(importiCategorie)
      .map(([categoria_codice, valore]) => ({
        lavoro_id: lavoroId,
        categoria_codice,
        importo: parseImporto(valore),
      }))
      .filter((riga) => riga.importo > 0);

    if (importiPayload.length > 0) {
      const { error: insertError } = await supabase
        .from("gara_lavori_categorie")
        .insert(importiPayload);

      if (insertError) {
        alert(`Errore durante il salvataggio degli importi: ${insertError.message}`);
        setSalvataggio(false);
        return;
      }
    }

    await caricaDati(lavoroId);
    setTimeout(() => {
      setSalvataggio(false);
    }, 1000);
  }

  async function eliminaCommessa() {
    if (!form.id) return;

    const conferma = window.confirm(
      "Eliminare questa commessa dalla lista gare d'appalto?"
    );
    if (!conferma) return;

    const { error } = await supabase.from("gara_lavori").delete().eq("id", form.id);

    if (error) {
      alert(`Errore durante l'eliminazione: ${error.message}`);
      return;
    }

    nuovaCommessa();
    await caricaDati();
  }

  return (
    <LayoutApp>
      <div>
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4 mb-6">
          <div>
            <h2 className="page-title">Lista commesse</h2>
            <p className="text-[15px] text-[#D79D06] mt-1">
              Riepilogo lavori, prestazioni e importi per categorie Z-1
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={nuovaCommessa}
              className="border border-gray-300 text-[#2B2F5E] px-4 py-3 rounded-md text-sm font-medium bg-white hover:bg-[#e8e8e8] transition cursor-pointer"
            >
              Nuova commessa
            </button>

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
            Caricamento lista commesse...
          </p>
        ) : (
          <div className="grid grid-cols-1 2xl:grid-cols-[340px_minmax(0,1fr)] gap-4">
            <aside className="bg-white border border-gray-200 shadow-sm rounded-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 bg-[#FAFAFA]">
                <h3 className="text-[17px] font-normal text-[#2B2F5E]">
                  Commesse
                </h3>
              </div>

              <div className="p-3 space-y-2 max-h-[72vh] overflow-y-auto">
                {lavori.length === 0 ? (
                  <p className="text-sm text-gray-400 p-3">
                    Nessuna commessa inserita.
                  </p>
                ) : (
                  lavori.map((lavoro) => (
                    <button
                      key={lavoro.id}
                      type="button"
                      onClick={() => apriLavoro(lavoro)}
                      className={`w-full text-left border rounded-sm p-3 transition cursor-pointer ${
                        form.id === lavoro.id
                          ? "border-[#D79D06] bg-[#FFF8E7]"
                          : "border-gray-200 bg-white hover:bg-[#FAFAFA]"
                      }`}
                    >
                      <p className="text-[14px] font-semibold text-[#2B2F5E]">
                        {lavoro.titolo}
                      </p>
                      <p className="text-[12px] text-gray-500 mt-1">
                        {lavoro.committente || "Committente non indicato"}
                      </p>
                      <p className="text-[12px] text-[#D79D06] mt-2">
                        {formattaEuro(
                          calcolaImportoPrestazione(
                            lavoro.importo_lavori,
                            lavoro.percentuale_prestazione
                          )
                        )}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </aside>

            <main className="space-y-4 min-w-0">
              <section className="bg-white border border-gray-200 shadow-sm rounded-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 bg-[#FAFAFA]">
                  <h3 className="text-[17px] font-normal text-[#2B2F5E]">
                    Dati commessa
                  </h3>
                </div>

                <div className="p-4 grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <Campo
                    label="Nome commessa"
                    value={form.titolo}
                    onChange={(v) => aggiornaForm("titolo", v)}
                  />
                  <Campo
                    label="Committente"
                    value={form.committente}
                    onChange={(v) => aggiornaForm("committente", v)}
                  />
                  <Campo
                    label="Data inizio incarico"
                    type="date"
                    value={form.data_inizio}
                    onChange={(v) => aggiornaForm("data_inizio", v)}
                  />
                  <Campo
                    label="Data fine incarico"
                    type="date"
                    value={form.data_fine}
                    onChange={(v) => aggiornaForm("data_fine", v)}
                  />
                  <CampoImporto
                    label="Importo lavori"
                    value={form.importo_lavori}
                    onChange={(v) => aggiornaForm("importo_lavori", v)}
                  />
                  <Campo
                    label="Percentuale di prestazione"
                    value={form.percentuale_prestazione}
                    onChange={(v) => aggiornaForm("percentuale_prestazione", v)}
                  />

                  <div className="xl:col-span-2">
                    <p className="block text-sm font-medium mb-2 text-[#2B2F5E]">
                      Tipologia di prestazione
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                      {PRESTAZIONI_GARA.map((prestazione) => (
                        <label
                          key={prestazione.id}
                          className="flex items-center gap-2 border border-gray-200 rounded-sm px-3 py-2 bg-[#FAFAFA] text-sm text-[#2B2F5E]"
                        >
                          <input
                            type="checkbox"
                            checked={form.prestazioni.includes(prestazione.id)}
                            onChange={() => togglePrestazione(prestazione.id)}
                          />
                          {prestazione.label}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <section className="grid grid-cols-1 xl:grid-cols-4 gap-4">
                <Kpi label="Importo lavori" value={formattaEuro(importoLavori)} />
                <Kpi
                  label="Somma categorie"
                  value={formattaEuro(totaleCategorie)}
                  danger={superaImportoLavori}
                />
                <Kpi
                  label="Residuo"
                  value={formattaEuro(residuo)}
                  danger={residuo < -0.01}
                />
                <Kpi
                  label="Importo ponderato"
                  value={formattaEuro(importoPonderato)}
                />
              </section>

              {superaImportoLavori && (
                <div className="bg-red-50 border border-red-200 rounded-sm p-4 text-sm text-red-700">
                  La somma degli importi inseriti nelle categorie supera
                  l&apos;importo lavori totale. Riduci gli importi prima di salvare.
                </div>
              )}

              <section className="bg-white border border-gray-200 shadow-sm rounded-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 bg-[#FAFAFA] flex flex-col lg:flex-row lg:justify-between lg:items-center gap-3">
                  <h3 className="text-[17px] font-normal text-[#2B2F5E]">
                    Importi per categoria
                  </h3>
                  <input
                    value={ricercaCategoria}
                    onChange={(e) => setRicercaCategoria(e.target.value)}
                    placeholder="Cerca categoria"
                    className="w-full lg:w-80 border border-gray-300 rounded-md px-4 py-3 bg-white outline-none transition focus:border-[#64B445] focus:shadow-sm text-[14px] text-[#2B2F5E]"
                  />
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[860px] text-sm">
                    <thead className="bg-white border-b border-gray-200 text-[11px] uppercase tracking-[0.12em] text-gray-400">
                      <tr>
                        <th className="text-left px-4 py-3 w-24">Codice</th>
                        <th className="text-left px-4 py-3">Categoria</th>
                        <th className="text-left px-4 py-3">Destinazione</th>
                        <th className="text-right px-4 py-3 w-56">
                          Importo lavori
                        </th>
                        <th className="text-right px-4 py-3 w-56">
                          Quota prestazione
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {categorieFiltrate.map((categoria) => {
                        const importo = parseImporto(
                          importiCategorie[categoria.codice]
                        );
                        const ponderato = calcolaImportoPrestazione(
                          importo,
                          percentuale
                        );

                        return (
                          <tr
                            key={categoria.codice}
                            className="border-b border-gray-100 hover:bg-[#FAFAFA]"
                          >
                            <td className="px-4 py-3 font-semibold text-[#2B2F5E]">
                              {categoria.codice}
                            </td>
                            <td className="px-4 py-3 text-[#2B2F5E]">
                              {categoria.categoria || "-"}
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              {categoria.destinazione || "-"}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <ImportoInput
                                value={importiCategorie[categoria.codice] || ""}
                                onChange={(e) =>
                                  aggiornaImportoCategoria(
                                    categoria.codice,
                                    e
                                  )
                                }
                                compact
                              />
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-[#2B2F5E]">
                              {formattaEuro(ponderato)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              <div className="flex flex-wrap justify-end gap-3">
                {form.id && (
                  <button
                    type="button"
                    onClick={eliminaCommessa}
                    className="border border-red-200 text-red-600 px-5 py-3 rounded-md text-sm font-medium bg-white hover:bg-red-50 transition cursor-pointer"
                  >
                    Elimina
                  </button>
                )}

                <button
                  type="button"
                  onClick={salvaCommessa}
                  disabled={salvataggio || superaImportoLavori}
                  className={`px-6 py-3 rounded-md text-sm font-medium transition cursor-pointer disabled:cursor-default ${
                    salvataggio
                      ? "bg-gray-400 text-white"
                      : "bg-[#64B445] text-white hover:bg-[#5AA03E] disabled:opacity-50"
                  }`}
                >
                  {salvataggio ? "Salvataggio" : "Salva commessa"}
                </button>
              </div>
            </main>
          </div>
        )}
      </div>
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
    <label className="block">
      <span className="block text-sm font-medium mb-2 text-[#2B2F5E]">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-w-0 border border-gray-300 rounded-md px-4 py-3 bg-transparent outline-none transition focus:bg-white focus:border-[#64B445] focus:shadow-sm"
      />
    </label>
  );
}

function CampoImporto({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium mb-2 text-[#2B2F5E]">
        {label}
      </span>
      <ImportoInput value={value} onChange={onChange} />
    </label>
  );
}

function Kpi({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div
      className={`bg-white border shadow-sm rounded-sm p-4 ${
        danger ? "border-red-200" : "border-gray-200"
      }`}
    >
      <p className="text-[11px] uppercase tracking-[0.12em] text-gray-400">
        {label}
      </p>
      <p
        className={`mt-2 text-[20px] font-semibold ${
          danger ? "text-red-600" : "text-[#2B2F5E]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function MessaggioDatabase({ errore }: { errore: string }) {
  return (
    <div className="bg-white border border-red-200 shadow-sm rounded-sm p-6">
      <h3 className="text-xl font-semibold text-[#2B2F5E]">
        Tabelle gare non disponibili
      </h3>
      <p className="text-sm text-gray-600 mt-2">
        Esegui prima il file SQL{" "}
        <span className="font-semibold">
          supabase-gare-appalto-lista-commesse.sql
        </span>
        .
      </p>
      <p className="text-xs text-red-500 mt-3">{errore}</p>
    </div>
  );
}
