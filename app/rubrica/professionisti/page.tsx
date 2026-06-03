"use client";

import { useEffect, useState } from "react";
import LayoutApp from "@/components/LayoutApp";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type Professionista = {
  id: string;
  nome: string | null;
  cognome: string | null;
  professione: string | null;
  data_nascita: string | null;
  luogo_nascita: string | null;
  codice_fiscale: string | null;
  residenza: string | null;
  domicilio_fiscale: string | null;
  albo: string | null;
  provincia: string | null;
  sezione: string | null;
  numero: string | null;
  prima_iscrizione: string | null;
  partita_iva: string | null;
  pec: string | null;
  abilitazioni: string | null;
};

type ProfessionistaForm = Omit<Professionista, "id">;

const formVuoto: ProfessionistaForm = {
  nome: "",
  cognome: "",
  professione: "",
  data_nascita: "",
  luogo_nascita: "",
  codice_fiscale: "",
  residenza: "",
  domicilio_fiscale: "",
  albo: "",
  provincia: "",
  sezione: "",
  numero: "",
  prima_iscrizione: "",
  partita_iva: "",
  pec: "",
  abilitazioni: "",
};

export default function RubricaProfessionistiPage() {
  const [professionisti, setProfessionisti] = useState<Professionista[]>([]);
  const [caricamento, setCaricamento] = useState(true);
  const [ricerca, setRicerca] = useState("");
  const [aperto, setAperto] = useState<string | null>(null);

  const [modaleAperta, setModaleAperta] = useState(false);
  const [idModifica, setIdModifica] = useState<string | null>(null);
  const [form, setForm] = useState<ProfessionistaForm>(formVuoto);

  const [confermaEliminazione, setConfermaEliminazione] =
    useState<Professionista | null>(null);

  useEffect(() => {
    caricaProfessionisti();
  }, []);

  async function caricaProfessionisti() {
    setCaricamento(true);

    const { data, error } = await supabase
      .from("professionisti")
      .select("*")
      .order("cognome", { ascending: true })
      .order("nome", { ascending: true });

    if (error) {
      console.error("Errore caricamento professionisti:", error);
      setProfessionisti([]);
    } else {
      setProfessionisti(data || []);
    }

    setCaricamento(false);
  }

  function aggiornaCampo(campo: keyof ProfessionistaForm, valore: string) {
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

  function apriModifica(professionista: Professionista) {
    setIdModifica(professionista.id);

    setForm({
      nome: professionista.nome || "",
      cognome: professionista.cognome || "",
      professione: professionista.professione || "",
      data_nascita: professionista.data_nascita || "",
      luogo_nascita: professionista.luogo_nascita || "",
      codice_fiscale: professionista.codice_fiscale || "",
      residenza: professionista.residenza || "",
      domicilio_fiscale: professionista.domicilio_fiscale || "",
      albo: professionista.albo || "",
      provincia: professionista.provincia || "",
      sezione: professionista.sezione || "",
      numero: professionista.numero || "",
      prima_iscrizione: professionista.prima_iscrizione || "",
      partita_iva: professionista.partita_iva || "",
      pec: professionista.pec || "",
      abilitazioni: professionista.abilitazioni || "",
    });

    setModaleAperta(true);
  }

  async function salvaProfessionista() {
    if (!form.nome?.trim() || !form.cognome?.trim()) {
      alert("Inserisci almeno nome e cognome.");
      return;
    }

    const payload = {
      ...form,
      data_nascita: form.data_nascita || null,
      prima_iscrizione: form.prima_iscrizione || null,
    };

    if (idModifica) {
      const { error } = await supabase
        .from("professionisti")
        .update(payload)
        .eq("id", idModifica);

      if (error) {
        console.error("Errore modifica professionista:", error);
        alert("Errore durante la modifica del professionista.");
        return;
      }
    } else {
      const { error } = await supabase.from("professionisti").insert(payload);

      if (error) {
        console.error("Errore inserimento professionista:", error);
        alert("Errore durante l'inserimento del professionista.");
        return;
      }
    }

    setModaleAperta(false);
    setIdModifica(null);
    setForm(formVuoto);
    await caricaProfessionisti();
  }

  async function eliminaProfessionista(id: string) {
    const { error } = await supabase
      .from("professionisti")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Errore eliminazione professionista:", error);
      alert("Errore durante l'eliminazione del professionista.");
      return;
    }

    setProfessionisti((lista) => lista.filter((item) => item.id !== id));

    if (aperto === id) {
      setAperto(null);
    }

    setConfermaEliminazione(null);
  }

  function formattaData(data: string | null) {
    if (!data) return "-";
    return new Date(data).toLocaleDateString("it-IT");
  }

  const professionistiFiltrati = professionisti.filter((p) => {
    const testo = `${p.nome || ""} ${p.cognome || ""} ${p.professione || ""} ${
      p.codice_fiscale || ""
    } ${p.albo || ""} ${p.provincia || ""} ${p.partita_iva || ""} ${
      p.pec || ""
    }`.toLowerCase();

    return testo.includes(ricerca.toLowerCase());
  });

  return (
    <LayoutApp>
      <div>
        <div className="flex justify-between items-center gap-4 mb-6">
          <h2 className="page-title">Rubrica professionisti</h2>

          <div className="flex gap-3">
            <input
              type="text"
              value={ricerca}
              onChange={(e) => setRicerca(e.target.value)}
              placeholder="Cerca professionista"
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
        ) : professionistiFiltrati.length === 0 ? (
          <p className="text-center text-gray-500 py-10">
            Nessun professionista trovato.
          </p>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {professionistiFiltrati.map((p) => {
              const isOpen = aperto === p.id;

              return (
                <div
                  key={p.id}
                  className="bg-white border border-gray-200 shadow-sm overflow-hidden rounded-sm"
                >
                  <button
                    type="button"
                    onClick={() => setAperto(isOpen ? null : p.id)}
                    className="w-full flex justify-between items-center px-4 py-3 text-left hover:bg-[#e8e8e8] transition cursor-pointer"
                  >
                    <div className="leading-tight">
                      <h3 className="text-[17px] font-normal text-[#2B2F5E]">
                        {p.cognome || "-"} {p.nome || ""}
                      </h3>

                      <p className="text-[15px] text-[#D79D06] mt-0">
                        {p.professione || "Professione non indicata"}
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
                        <Info label="Professione" value={p.professione} />
                        <Info
                          label="Data di nascita"
                          value={formattaData(p.data_nascita)}
                        />
                        <Info label="Luogo di nascita" value={p.luogo_nascita} />
                        <Info label="Codice fiscale" value={p.codice_fiscale} />
                        <Info label="Residenza" value={p.residenza} />
                        <Info
                          label="Domicilio fiscale"
                          value={p.domicilio_fiscale}
                        />
                        <Info label="Albo" value={p.albo} />
                        <Info label="Provincia" value={p.provincia} />
                        <Info label="Sezione" value={p.sezione} />
                        <Info label="Numero" value={p.numero} />
                        <Info
                          label="Prima iscrizione"
                          value={formattaData(p.prima_iscrizione)}
                        />
                        <Info label="P. IVA" value={p.partita_iva} />
                        <Info label="PEC" value={p.pec} />
                      </div>

                      {p.abilitazioni && (
                        <div className="mt-5">
                          <p className="text-[11px] uppercase tracking-[0.12em] text-gray-400 font-medium mb-2">
                            Abilitazioni
                          </p>

                          <div className="whitespace-pre-line rounded-md bg-white border border-gray-200 p-3 text-[13px] text-[#2B2F5E]">
                            {p.abilitazioni}
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end gap-3 mt-6">
                        <button
                          type="button"
                          onClick={() => apriModifica(p)}
                          className="border border-gray-300 text-[#2B2F5E] px-4 py-2 rounded-md text-sm font-medium bg-transparent hover:bg-white hover:border-[#64B445] transition cursor-pointer"
                        >
                          Modifica
                        </button>

                        <button
                          type="button"
                          onClick={() => setConfermaEliminazione(p)}
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
          <div className="bg-white rounded-md shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto p-8">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-2xl font-semibold text-[#2B2F5E]">
                {idModifica ? "Modifica professionista" : "Nuovo professionista"}
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
                label="Nome"
                value={form.nome || ""}
                onChange={(value) => aggiornaCampo("nome", value)}
              />

              <Campo
                label="Cognome"
                value={form.cognome || ""}
                onChange={(value) => aggiornaCampo("cognome", value)}
              />

              <Campo
                label="Professione"
                value={form.professione || ""}
                onChange={(value) => aggiornaCampo("professione", value)}
              />

              <Campo
                label="Data di nascita"
                type="date"
                value={form.data_nascita || ""}
                onChange={(value) => aggiornaCampo("data_nascita", value)}
              />

              <Campo
                label="Luogo di nascita"
                value={form.luogo_nascita || ""}
                onChange={(value) => aggiornaCampo("luogo_nascita", value)}
              />

              <Campo
                label="Codice fiscale"
                value={form.codice_fiscale || ""}
                onChange={(value) => aggiornaCampo("codice_fiscale", value)}
              />

              <Campo
                label="Residenza"
                value={form.residenza || ""}
                onChange={(value) => aggiornaCampo("residenza", value)}
              />

              <Campo
                label="Domicilio fiscale"
                value={form.domicilio_fiscale || ""}
                onChange={(value) => aggiornaCampo("domicilio_fiscale", value)}
              />

              <Campo
                label="Albo"
                value={form.albo || ""}
                onChange={(value) => aggiornaCampo("albo", value)}
              />

              <Campo
                label="Provincia"
                value={form.provincia || ""}
                onChange={(value) => aggiornaCampo("provincia", value)}
              />

              <Campo
                label="Sezione"
                value={form.sezione || ""}
                onChange={(value) => aggiornaCampo("sezione", value)}
              />

              <Campo
                label="Numero"
                value={form.numero || ""}
                onChange={(value) => aggiornaCampo("numero", value)}
              />

              <Campo
                label="Prima iscrizione"
                type="date"
                value={form.prima_iscrizione || ""}
                onChange={(value) => aggiornaCampo("prima_iscrizione", value)}
              />

              <Campo
                label="P. IVA"
                value={form.partita_iva || ""}
                onChange={(value) => aggiornaCampo("partita_iva", value)}
              />

              <Campo
                label="PEC"
                value={form.pec || ""}
                onChange={(value) => aggiornaCampo("pec", value)}
              />

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2 text-[#2B2F5E]">
                  Abilitazioni
                </label>

                <textarea
                  value={form.abilitazioni || ""}
                  onChange={(e) =>
                    aggiornaCampo("abilitazioni", e.target.value)
                  }
                  rows={5}
                  className="w-full border border-gray-300 rounded-md px-4 py-3 bg-transparent outline-none transition focus:bg-white focus:border-[#64B445] focus:shadow-sm"
                />
              </div>
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
                onClick={salvaProfessionista}
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
                  Elimina professionista
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
                {confermaEliminazione.cognome} {confermaEliminazione.nome}
              </p>

              <p className="text-sm text-[#D79D06] mt-1">
                {confermaEliminazione.professione ||
                  "Professione non indicata"}
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
                onClick={() => eliminaProfessionista(confermaEliminazione.id)}
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