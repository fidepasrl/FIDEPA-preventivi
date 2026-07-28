"use client";

import { useEffect, useMemo, useState } from "react";
import AppIcon from "@/components/AppIcon";
import EconomiaAccessGuard from "@/components/EconomiaAccessGuard";
import LayoutApp from "@/components/LayoutApp";
import {
  EconomicCard,
  EmptyState,
  Field,
  FormError,
  PrimaryButton,
  StatusBadge,
  inputClass,
} from "@/components/economia/EconomicCommon";
import { parseImporto } from "@/lib/importi";
import { supabase } from "@/lib/supabase";

type PersonaFiscale = {
  id: string;
  nome: string;
  email: string | null;
  colore: string;
  attivo: boolean;
  economia_cassa_attiva: boolean;
  economia_cassa_aliquota: number | string;
  economia_iva_attiva: boolean;
  economia_iva_aliquota: number | string;
};

type ProfiloDraft = {
  cassaAttiva: boolean;
  cassaAliquota: string;
  ivaAttiva: boolean;
  ivaAliquota: string;
};

function creaDraft(persona: PersonaFiscale): ProfiloDraft {
  return {
    cassaAttiva: Boolean(persona.economia_cassa_attiva),
    cassaAliquota: String(parseImporto(persona.economia_cassa_aliquota)),
    ivaAttiva: Boolean(persona.economia_iva_attiva),
    ivaAliquota: String(parseImporto(persona.economia_iva_aliquota)),
  };
}

export default function EconomiaPersonalePage() {
  const [personale, setPersonale] = useState<PersonaFiscale[]>([]);
  const [profili, setProfili] = useState<Record<string, ProfiloDraft>>({});
  const [ricerca, setRicerca] = useState("");
  const [caricamento, setCaricamento] = useState(true);
  const [salvataggioId, setSalvataggioId] = useState<string | null>(null);
  const [errore, setErrore] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    async function caricaPersonale() {
      setCaricamento(true);
      setErrore("");
      const { data, error } = await supabase
        .from("personale")
        .select("id, nome, email, colore, attivo, economia_cassa_attiva, economia_cassa_aliquota, economia_iva_attiva, economia_iva_aliquota")
        .order("attivo", { ascending: false })
        .order("nome");

      if (error) {
        setErrore(
          error.message.includes("economia_cassa")
            ? "Applica la migrazione supabase-economia-personale-fiscale.sql per configurare i dati fiscali del personale."
            : error.message
        );
        setCaricamento(false);
        return;
      }

      const righe = (data || []) as PersonaFiscale[];
      setPersonale(righe);
      setProfili(Object.fromEntries(righe.map((persona) => [persona.id, creaDraft(persona)])));
      setCaricamento(false);
    }

    void caricaPersonale();
  }, []);

  const personaleFiltrato = useMemo(() => {
    const termine = ricerca.trim().toLocaleLowerCase("it");
    if (!termine) return personale;
    return personale.filter((persona) =>
      `${persona.nome} ${persona.email || ""}`.toLocaleLowerCase("it").includes(termine)
    );
  }, [personale, ricerca]);

  function aggiornaProfilo(personaId: string, modifica: Partial<ProfiloDraft>) {
    setProfili((correnti) => ({
      ...correnti,
      [personaId]: { ...correnti[personaId], ...modifica },
    }));
  }

  async function salvaProfilo(persona: PersonaFiscale) {
    const profilo = profili[persona.id];
    if (!profilo) return;
    const cassa = parseImporto(profilo.cassaAliquota);
    const iva = parseImporto(profilo.ivaAliquota);
    if (cassa < 0 || cassa > 100 || iva < 0 || iva > 100) {
      setErrore("Le aliquote devono essere comprese tra 0 e 100%.");
      return;
    }
    if ((profilo.cassaAttiva && cassa <= 0) || (profilo.ivaAttiva && iva <= 0)) {
      setErrore("Inserisci l’aliquota per le voci fiscali selezionate.");
      return;
    }

    setSalvataggioId(persona.id);
    setErrore("");
    const { error } = await supabase
      .from("personale")
      .update({
        economia_cassa_attiva: profilo.cassaAttiva,
        economia_cassa_aliquota: cassa,
        economia_iva_attiva: profilo.ivaAttiva,
        economia_iva_aliquota: iva,
      })
      .eq("id", persona.id);
    setSalvataggioId(null);

    if (error) {
      setErrore(error.message);
      return;
    }

    setPersonale((correnti) => correnti.map((item) =>
      item.id === persona.id
        ? {
            ...item,
            economia_cassa_attiva: profilo.cassaAttiva,
            economia_cassa_aliquota: cassa,
            economia_iva_attiva: profilo.ivaAttiva,
            economia_iva_aliquota: iva,
          }
        : item
    ));
    setToast(`Profilo fiscale di ${persona.nome} salvato.`);
    window.setTimeout(() => setToast(""), 3000);
  }

  return (
    <LayoutApp>
      <EconomiaAccessGuard>
        <div className="space-y-5">
          <div>
            <h2 className="page-title">Personale</h2>
            <p className="mt-1 text-[15px] text-[#D79D06]">
              Configura Cassa e IVA del personale interno per la gestione economica.
            </p>
          </div>

          <EconomicCard
            title="Profili fiscali del personale"
            subtitle="L’anagrafica è condivisa con la sezione Attività. Qui vengono gestite soltanto le informazioni fiscali."
            actions={
              <div className="relative w-full sm:w-72">
                <AppIcon name="search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={ricerca} onChange={(event) => setRicerca(event.target.value)} placeholder="Cerca personale..." aria-label="Cerca personale" className={`${inputClass} pl-9`} />
              </div>
            }
          >
            <FormError message={errore} />
            {caricamento ? (
              <div className="py-12 text-center text-sm text-gray-500">Caricamento personale...</div>
            ) : personaleFiltrato.length === 0 ? (
              <EmptyState>Nessuna persona trovata.</EmptyState>
            ) : (
              <div className="space-y-3">
                {personaleFiltrato.map((persona) => {
                  const profilo = profili[persona.id];
                  if (!profilo) return null;
                  return (
                    <section key={persona.id} className="rounded-2xl border border-gray-100 bg-[#F8F9FB] p-4">
                      <div className="grid grid-cols-1 items-end gap-4 xl:grid-cols-[minmax(220px,1.3fr)_minmax(210px,1fr)_minmax(210px,1fr)_auto]">
                        <div className="flex items-center gap-3 self-center">
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white" style={{ backgroundColor: persona.colore || "#5E9AD3" }}>
                            {persona.nome.split(/\s+/).map((parte) => parte[0]).join("").slice(0, 2).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="truncate font-semibold text-[#2B2F5E]">{persona.nome}</h3>
                              <StatusBadge value={persona.attivo ? "attivo" : "non_attivo"} />
                            </div>
                            <p className="truncate text-xs text-gray-500">{persona.email || "Email non indicata"}</p>
                          </div>
                        </div>

                        <div>
                          <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#2B2F5E]">
                            <input type="checkbox" checked={profilo.cassaAttiva} onChange={(event) => aggiornaProfilo(persona.id, { cassaAttiva: event.target.checked, cassaAliquota: event.target.checked && parseImporto(profilo.cassaAliquota) === 0 ? "4" : profilo.cassaAliquota })} className="h-4 w-4 accent-[#64B445]" />
                            Cassa
                          </label>
                          <Field label="Aliquota Cassa %"><input inputMode="decimal" value={profilo.cassaAliquota} onChange={(event) => aggiornaProfilo(persona.id, { cassaAliquota: event.target.value })} disabled={!profilo.cassaAttiva} className={`${inputClass} disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400`} /></Field>
                        </div>

                        <div>
                          <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#2B2F5E]">
                            <input type="checkbox" checked={profilo.ivaAttiva} onChange={(event) => aggiornaProfilo(persona.id, { ivaAttiva: event.target.checked, ivaAliquota: event.target.checked && parseImporto(profilo.ivaAliquota) === 0 ? "22" : profilo.ivaAliquota })} className="h-4 w-4 accent-[#64B445]" />
                            IVA
                          </label>
                          <Field label="Aliquota IVA %"><input inputMode="decimal" value={profilo.ivaAliquota} onChange={(event) => aggiornaProfilo(persona.id, { ivaAliquota: event.target.value })} disabled={!profilo.ivaAttiva} className={`${inputClass} disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400`} /></Field>
                        </div>

                        <PrimaryButton onClick={() => void salvaProfilo(persona)} disabled={salvataggioId === persona.id} icon="checkSquare">
                          {salvataggioId === persona.id ? "Salvataggio..." : "Salva"}
                        </PrimaryButton>
                      </div>
                    </section>
                  );
                })}
              </div>
            )}
          </EconomicCard>
        </div>

        {toast ? <div role="status" className="fixed bottom-5 left-1/2 z-[90] -translate-x-1/2 rounded-xl bg-[#2B2F5E] px-4 py-3 text-sm font-semibold text-white shadow-xl">{toast}</div> : null}
      </EconomiaAccessGuard>
    </LayoutApp>
  );
}
