"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AppIcon from "@/components/AppIcon";
import EconomiaAccessGuard from "@/components/EconomiaAccessGuard";
import ImportoInput from "@/components/ImportoInput";
import LayoutApp from "@/components/LayoutApp";
import {
  costoSocietaAnnuale,
  costoSocietaAnnualeNetto,
  movimentiCostoSocietaMaturati,
  totaleCostoSocieta,
} from "@/lib/economia";
import { finalizzaInputImporto, formattaEuro, parseImporto } from "@/lib/importi";
import { supabase } from "@/lib/supabase";

type FrequenzaCosto = "Mensile" | "Annuale" | "Una tantum";
type CategoriaCosto = "Studio" | "Acquisti" | "Collaboratori";
type CostiTab = "studio" | "acquisti" | "collaboratori" | "riepilogo";

type PersonaCosto = {
  id: string;
  nome: string;
  attivo: boolean;
  economia_cassa_attiva: boolean;
  economia_cassa_aliquota: number | string;
  economia_iva_attiva: boolean;
  economia_iva_aliquota: number | string;
};

type VariazioneCosto = {
  id: string;
  costo_societa_id: string;
  data_decorrenza: string;
  importo: number | string;
  note: string | null;
};

type VariazioneCostoDraft = {
  id: string;
  data_decorrenza: string;
  importo: string;
  note: string;
  nuova: boolean;
};

type CostoSocieta = {
  id: string;
  descrizione: string;
  categoria: string | null;
  persona_id: string | null;
  tipo: string;
  frequenza: FrequenzaCosto;
  importo: number;
  cassa: number;
  iva: number;
  data_riferimento: string | null;
  data_inizio: string | null;
  data_fine: string | null;
  numero_mesi: number | null;
  attivo: boolean;
  note: string | null;
  created_at: string;
  cassa_aliquota?: number;
  iva_aliquota?: number;
  variazioni: VariazioneCosto[];
};

function categoriaCosto(costo: CostoSocieta): CategoriaCosto {
  if (costo.categoria === "Collaboratori") return "Collaboratori";
  if (costo.categoria === "Acquisti") return "Acquisti";
  if (costo.categoria === "Studio") return "Studio";
  return costo.frequenza === "Una tantum" ? "Acquisti" : "Studio";
}

function tabCategoria(categoria: CategoriaCosto): CostiTab {
  if (categoria === "Collaboratori") return "collaboratori";
  if (categoria === "Acquisti") return "acquisti";
  return "studio";
}

function creaFormIniziale(
  anno: number,
  categoria: CategoriaCosto = "Studio"
) {
  const oggi = new Date();
  const dataOggi = new Date(
    oggi.getTime() - oggi.getTimezoneOffset() * 60_000
  )
    .toISOString()
    .slice(0, 10);
  return {
    id: "",
    descrizione: "",
    categoria,
    persona_id: "",
    frequenza: (categoria === "Acquisti"
      ? "Una tantum"
      : "Mensile") as FrequenzaCosto,
    anno_riferimento: String(anno),
    data_pagamento: dataOggi,
    data_inizio: "",
    data_fine: "",
    in_corso: categoria !== "Acquisti",
    numero_mesi: "12",
    importo: "",
    calcola_cassa: categoria === "Collaboratori",
    calcola_iva: true,
    variazioni: [] as VariazioneCostoDraft[],
    variazioni_originali: [] as string[],
    note: "",
  };
}

function mesiTraDate(inizio: string | null, fine: string | null) {
  if (!inizio || !fine) return "";

  const dataInizio = new Date(inizio);
  const dataFine = new Date(fine);
  if (Number.isNaN(dataInizio.getTime()) || Number.isNaN(dataFine.getTime())) {
    return "";
  }

  const mesi =
    (dataFine.getFullYear() - dataInizio.getFullYear()) * 12 +
    dataFine.getMonth() -
    dataInizio.getMonth() +
    1;

  return mesi > 0 ? String(mesi) : "";
}

type CostoForm = ReturnType<typeof creaFormIniziale>;

export default function EconomiaCostiPage() {
  const annoCorrente = new Date().getFullYear();
  const [annoVisualizzato, setAnnoVisualizzato] = useState(annoCorrente);
  const [tab, setTab] = useState<CostiTab>("studio");
  const [costi, setCosti] = useState<CostoSocieta[]>([]);
  const [personale, setPersonale] = useState<PersonaCosto[]>([]);
  const [form, setForm] = useState<CostoForm>(() =>
    creaFormIniziale(annoCorrente)
  );
  const [caricamento, setCaricamento] = useState(true);
  const [salvataggio, setSalvataggio] = useState(false);
  const [errore, setErrore] = useState("");
  const [formAperto, setFormAperto] = useState(false);

  const caricaCosti = useCallback(async () => {
    const [costiRes, personaleRes, variazioniRes] = await Promise.all([
      supabase
        .from("economia_costi_societa")
        .select("*")
        .order("attivo", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("personale")
        .select(
          "id, nome, attivo, economia_cassa_attiva, economia_cassa_aliquota, economia_iva_attiva, economia_iva_aliquota"
        )
        .order("attivo", { ascending: false })
        .order("nome"),
      supabase
        .from("economia_costi_societa_variazioni")
        .select("id, costo_societa_id, data_decorrenza, importo, note")
        .order("data_decorrenza"),
    ]);

    const error = costiRes.error || personaleRes.error || variazioniRes.error;
    if (error) {
      setErrore(
        error.message.includes("economia_costi_societa_variazioni") ||
          error.message.includes("persona_id")
          ? "Applica la migrazione supabase-economia-collaboratori-continuativi.sql."
          : error.message
      );
      setCaricamento(false);
      return;
    }

    const persone = (personaleRes.data || []) as PersonaCosto[];
    const variazioni = (variazioniRes.data || []) as VariazioneCosto[];
    const righe = (costiRes.data || []) as Array<
      Omit<CostoSocieta, "variazioni">
    >;
    setPersonale(persone);
    setCosti(
      righe.map((costo) => {
        const persona = persone.find((item) => item.id === costo.persona_id);
        const cassaAliquota =
          persona?.economia_cassa_attiva
            ? parseImporto(persona.economia_cassa_aliquota)
            : 0;
        const ivaAliquota =
          persona?.economia_iva_attiva
            ? parseImporto(persona.economia_iva_aliquota)
            : 0;
        const imponibile = parseImporto(costo.importo);
        const cassa = persona
          ? (imponibile * cassaAliquota) / 100
          : parseImporto(costo.cassa);
        const iva = persona
          ? ((imponibile + cassa) * ivaAliquota) / 100
          : parseImporto(costo.iva);
        return {
          ...costo,
          descrizione: persona?.nome || costo.descrizione,
          cassa,
          iva,
          cassa_aliquota: persona ? cassaAliquota : undefined,
          iva_aliquota: persona ? ivaAliquota : undefined,
          variazioni: variazioni.filter(
            (variazione) => variazione.costo_societa_id === costo.id
          ),
        };
      })
    );
    setCaricamento(false);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void caricaCosti(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [caricaCosti]);

  const riepilogo = useMemo(() => {
    const costiAttivi = costi.filter((item) => item.attivo);
    const costiMaturati = costiAttivi
      .flatMap((costo) => movimentiCostoSocietaMaturati(costo))
      .filter((movimento) =>
        movimento.dataPagamento.startsWith(`${annoVisualizzato}-`)
      );
    const costiSostenuti = costiMaturati.reduce(
      (totale, movimento) => totale + movimento.importo,
      0
    );
    const costiPrevisti = costiAttivi.reduce(
      (totale, costo) =>
        totale + costoSocietaAnnualeNetto(costo, annoVisualizzato),
      0
    );
    const cassaTotale = costiMaturati.reduce(
      (totale, movimento) => totale + movimento.cassa,
      0
    );
    const ivaTotale = costiMaturati.reduce(
      (totale, movimento) => totale + movimento.iva,
      0
    );

    return {
      costiSostenuti,
      costiPrevisti,
      cassaTotale,
      ivaTotale,
    };
  }, [annoVisualizzato, costi]);

  const personaSelezionata = personale.find(
    (persona) => persona.id === form.persona_id
  );
  const importoFormNumero = parseImporto(form.importo);
  const cassaAliquotaForm =
    form.categoria === "Collaboratori" &&
    personaSelezionata?.economia_cassa_attiva
      ? parseImporto(personaSelezionata.economia_cassa_aliquota)
      : 0;
  const ivaAliquotaForm =
    form.categoria === "Collaboratori"
      ? personaSelezionata?.economia_iva_attiva
        ? parseImporto(personaSelezionata.economia_iva_aliquota)
        : 0
      : form.calcola_iva
        ? 22
        : 0;
  const cassaFormNumero =
    form.categoria === "Collaboratori" && cassaAliquotaForm > 0
      ? importoFormNumero * (cassaAliquotaForm / 100)
      : 0;
  const ivaFormNumero = ivaAliquotaForm > 0
    ? (importoFormNumero + cassaFormNumero) * (ivaAliquotaForm / 100)
    : 0;
  const totaleFormNumero =
    importoFormNumero + cassaFormNumero + ivaFormNumero;
  const moltiplicatoreForm =
    form.categoria === "Studio" || form.categoria === "Collaboratori"
      ? 1
      : form.frequenza === "Annuale"
      ? 12
      : form.frequenza === "Mensile"
        ? Math.max(1, Math.trunc(Number(form.numero_mesi) || 1))
        : 1;
  const totaleFormStimato = totaleFormNumero * moltiplicatoreForm;
  const speseStudio = costi.filter(
    (costo) => categoriaCosto(costo) === "Studio"
  );
  const acquisti = costi.filter(
    (costo) => categoriaCosto(costo) === "Acquisti"
  );
  const speseCollaboratori = costi.filter(
    (costo) => categoriaCosto(costo) === "Collaboratori"
  );
  const anniDisponibili = useMemo(() => {
    const anni = new Set<number>();
    for (let anno = annoCorrente - 5; anno <= annoCorrente + 5; anno += 1) {
      anni.add(anno);
    }
    costi.forEach((costo) => {
      [costo.data_riferimento, costo.data_inizio, costo.data_fine].forEach(
        (value) => {
          const anno = Number(value?.slice(0, 4));
          if (anno >= 2000 && anno <= 2100) anni.add(anno);
        }
      );
      costo.variazioni.forEach((variazione) => {
        const anno = Number(variazione.data_decorrenza.slice(0, 4));
        if (anno >= 2000 && anno <= 2100) anni.add(anno);
      });
    });
    return [...anni].sort((a, b) => b - a);
  }, [annoCorrente, costi]);

  function aggiornaForm<K extends keyof CostoForm>(
    campo: K,
    valore: CostoForm[K]
  ) {
    setForm((corrente) => {
      const prossimo = { ...corrente, [campo]: valore };

      return prossimo;
    });
  }

  function aggiungiVariazione() {
    const oggi = new Date();
    const dataOggi = new Date(
      oggi.getTime() - oggi.getTimezoneOffset() * 60_000
    )
      .toISOString()
      .slice(0, 10);
    aggiornaForm("variazioni", [
      ...form.variazioni,
      {
        id: crypto.randomUUID(),
        data_decorrenza: dataOggi,
        importo: form.importo,
        note: "",
        nuova: true,
      },
    ]);
  }

  function aggiornaVariazione(
    id: string,
    modifica: Partial<VariazioneCostoDraft>
  ) {
    aggiornaForm(
      "variazioni",
      form.variazioni.map((item) =>
        item.id === id ? { ...item, ...modifica } : item
      )
    );
  }

  function rimuoviVariazione(id: string) {
    aggiornaForm(
      "variazioni",
      form.variazioni.filter((item) => item.id !== id)
    );
  }

  function nuovaVoce(categoria: CategoriaCosto) {
    setForm(creaFormIniziale(annoVisualizzato, categoria));
    setFormAperto(true);
  }

  function chiudiForm() {
    setForm(creaFormIniziale(annoVisualizzato));
    setFormAperto(false);
  }

  function apriCosto(costo: CostoSocieta) {
    const categoria = categoriaCosto(costo);
    setTab(tabCategoria(categoria));
    setFormAperto(true);
    setForm({
      id: costo.id,
      descrizione: costo.descrizione,
      categoria,
      persona_id: costo.persona_id || "",
      frequenza: costo.frequenza,
      anno_riferimento: costo.data_riferimento
        ? String(new Date(costo.data_riferimento).getFullYear())
        : String(annoVisualizzato),
      data_pagamento:
        costo.frequenza === "Una tantum"
          ? costo.data_riferimento?.slice(0, 10) || ""
          : "",
      data_inizio: costo.data_inizio || "",
      data_fine: costo.data_fine || "",
      in_corso: categoria !== "Acquisti" ? !costo.data_fine : false,
      numero_mesi:
        costo.numero_mesi && costo.numero_mesi > 0
          ? String(costo.numero_mesi)
          : mesiTraDate(costo.data_inizio, costo.data_fine) || "12",
      importo: finalizzaInputImporto(costo.importo),
      calcola_cassa:
        categoria === "Collaboratori" && Number(costo.cassa || 0) > 0,
      calcola_iva: Number(costo.iva || 0) > 0,
      variazioni: costo.variazioni.map((variazione) => ({
        id: variazione.id,
        data_decorrenza: variazione.data_decorrenza,
        importo: finalizzaInputImporto(variazione.importo),
        note: variazione.note || "",
        nuova: false,
      })),
      variazioni_originali: costo.variazioni.map((variazione) => variazione.id),
      note: costo.note || "",
    });
  }

  async function salvaCosto() {
    if (form.categoria === "Collaboratori" && !form.persona_id) {
      alert("Seleziona un collaboratore dalla lista del personale.");
      return;
    }

    if (form.categoria !== "Collaboratori" && !form.descrizione.trim()) {
      alert("Inserisci una descrizione del costo.");
      return;
    }

    if (parseImporto(form.importo) <= 0) {
      alert("Inserisci un importo maggiore di zero.");
      return;
    }

    if (
      form.categoria !== "Studio" &&
      form.frequenza === "Annuale" &&
      (Number(form.anno_riferimento) < 2000 ||
        Number(form.anno_riferimento) > 2100)
    ) {
      alert("Inserisci un anno di riferimento valido.");
      return;
    }

    if (form.frequenza === "Una tantum" && !form.data_pagamento) {
      alert("Inserisci la data di pagamento della spesa.");
      return;
    }

    if (
      (form.categoria === "Studio" ||
        form.categoria === "Collaboratori" ||
        form.frequenza === "Mensile") &&
      !form.data_inizio
    ) {
      alert("Inserisci la data di partenza del costo mensile.");
      return;
    }

    if (
      (form.categoria === "Studio" || form.categoria === "Collaboratori") &&
      !form.in_corso &&
      !form.data_fine
    ) {
      alert("Inserisci la data dell'ultima spesa oppure seleziona In corso.");
      return;
    }

    if (
      (form.categoria === "Studio" || form.categoria === "Collaboratori") &&
      !form.in_corso &&
      form.data_fine < form.data_inizio
    ) {
      alert("La data dell'ultima spesa non può precedere la data di partenza.");
      return;
    }

    if (
      form.categoria !== "Studio" &&
      form.categoria !== "Collaboratori" &&
      form.frequenza === "Mensile" &&
      (Number(form.numero_mesi) < 1 || Number(form.numero_mesi) > 120)
    ) {
      alert("Inserisci un numero di mesi valido.");
      return;
    }

    if (form.categoria === "Collaboratori") {
      const dateVariazioni = new Set<string>();
      for (const variazione of form.variazioni) {
        if (!variazione.data_decorrenza) {
          alert("Inserisci la data di decorrenza di ogni variazione.");
          return;
        }
        if (parseImporto(variazione.importo) <= 0) {
          alert("Inserisci un nuovo compenso maggiore di zero.");
          return;
        }
        if (variazione.data_decorrenza <= form.data_inizio) {
          alert("La variazione deve essere successiva alla data di partenza.");
          return;
        }
        if (
          !form.in_corso &&
          form.data_fine &&
          variazione.data_decorrenza > form.data_fine
        ) {
          alert("La variazione non può essere successiva all'ultimo pagamento.");
          return;
        }
        if (dateVariazioni.has(variazione.data_decorrenza)) {
          alert("Non puoi inserire due variazioni con la stessa decorrenza.");
          return;
        }
        dateVariazioni.add(variazione.data_decorrenza);
      }
    }

    setSalvataggio(true);

    const nomePersona = personaSelezionata?.nome || form.descrizione.trim();
    const payload = {
      descrizione: nomePersona,
      categoria: form.categoria,
      persona_id:
        form.categoria === "Collaboratori" ? form.persona_id : null,
      tipo:
        form.categoria === "Acquisti" || form.frequenza === "Una tantum"
          ? "Una tantum"
          : "Fisso",
      frequenza:
        form.categoria === "Studio" || form.categoria === "Collaboratori"
          ? "Mensile"
          : form.frequenza,
      importo: importoFormNumero,
      cassa: cassaFormNumero,
      iva: ivaFormNumero,
      data_riferimento:
        form.categoria === "Studio" || form.categoria === "Collaboratori"
          ? null
          : form.frequenza === "Annuale"
          ? `${form.anno_riferimento || annoVisualizzato}-01-01`
          : form.frequenza === "Una tantum"
            ? form.data_pagamento
            : null,
      data_inizio:
        form.categoria === "Studio" ||
        form.categoria === "Collaboratori" ||
        form.frequenza === "Mensile"
          ? form.data_inizio || null
          : null,
      data_fine:
        (form.categoria === "Studio" ||
          form.categoria === "Collaboratori") &&
        !form.in_corso
          ? form.data_fine || null
          : null,
      numero_mesi:
        form.categoria === "Studio" || form.categoria === "Collaboratori"
          ? null
          : form.frequenza === "Mensile"
          ? Math.trunc(Number(form.numero_mesi) || 1)
          : form.frequenza === "Annuale"
            ? 12
            : null,
      attivo: true,
      note: form.note.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const richiesta = form.id
      ? supabase
          .from("economia_costi_societa")
          .update(payload)
          .eq("id", form.id)
          .select("id")
          .single()
      : supabase
          .from("economia_costi_societa")
          .insert(payload)
          .select("id")
          .single();

    const { data: costoSalvato, error } = await richiesta;

    if (error) {
      alert(`Errore durante il salvataggio del costo: ${error.message}`);
      setSalvataggio(false);
      return;
    }

    const costoId = costoSalvato?.id || form.id;
    if (form.categoria === "Collaboratori" && costoId) {
      const idsCorrenti = new Set(
        form.variazioni.filter((item) => !item.nuova).map((item) => item.id)
      );
      const idsDaEliminare = form.variazioni_originali.filter(
        (id) => !idsCorrenti.has(id)
      );
      const variazioniEsistenti = form.variazioni.filter((item) => !item.nuova);
      const variazioniNuove = form.variazioni.filter((item) => item.nuova);

      if (idsDaEliminare.length > 0) {
        const { error: erroreEliminazione } = await supabase
          .from("economia_costi_societa_variazioni")
          .delete()
          .in("id", idsDaEliminare);
        if (erroreEliminazione) {
          alert(`Costo salvato, ma le variazioni non sono state aggiornate: ${erroreEliminazione.message}`);
          setSalvataggio(false);
          await caricaCosti();
          return;
        }
      }

      const operazioni = [
        ...variazioniEsistenti.map((variazione) =>
          supabase
            .from("economia_costi_societa_variazioni")
            .update({
              data_decorrenza: variazione.data_decorrenza,
              importo: parseImporto(variazione.importo),
              note: variazione.note.trim() || null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", variazione.id)
        ),
        ...(variazioniNuove.length > 0
          ? [
              supabase.from("economia_costi_societa_variazioni").insert(
                variazioniNuove.map((variazione) => ({
                  costo_societa_id: costoId,
                  data_decorrenza: variazione.data_decorrenza,
                  importo: parseImporto(variazione.importo),
                  note: variazione.note.trim() || null,
                }))
              ),
            ]
          : []),
      ];
      const risultati = await Promise.all(operazioni);
      const erroreVariazione = risultati.find((risultato) => risultato.error)?.error;
      if (erroreVariazione) {
        alert(`Costo salvato, ma le variazioni non sono state aggiornate: ${erroreVariazione.message}`);
        setSalvataggio(false);
        await caricaCosti();
        return;
      }
    }

    await caricaCosti();
    setTimeout(() => setSalvataggio(false), 1000);
    chiudiForm();
  }

  async function eliminaCosto() {
    if (!form.id) return;

    const conferma = window.confirm("Eliminare questo costo societario?");
    if (!conferma) return;

    const { error } = await supabase
      .from("economia_costi_societa")
      .delete()
      .eq("id", form.id);

    if (error) {
      alert(error.message);
      return;
    }

    chiudiForm();
    await caricaCosti();
  }

  return (
    <LayoutApp>
      <EconomiaAccessGuard>
        <div className="space-y-5">
          <div>
            <h2 className="page-title">Costi società</h2>
            <p className="mt-1 text-[15px] text-[#D79D06]">
              Spese dello studio, acquisti e costi dei collaboratori
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white bg-white p-1.5 shadow-[0_8px_24px_rgba(15,23,42,0.06)]" role="tablist" aria-label="Sezioni costi società">
            <div className="flex w-full min-w-max items-center gap-1">
              {([
                ["studio", "Spese studio"],
                ["acquisti", "Acquisti"],
                ["collaboratori", "Collaboratori"],
                ["riepilogo", "Riepilogo"],
              ] as Array<[CostiTab, string]>).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  onClick={() => { setTab(id); setFormAperto(false); }}
                  className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition cursor-pointer ${
                    tab === id
                      ? "bg-[#2B2F5E] text-white"
                      : "text-[#2B2F5E] hover:bg-[#F2F2F2]"
                  }`}
                >
                  {label}
                </button>
              ))}

              {tab === "riepilogo" ? (
                <label className="ml-auto flex items-center gap-3 border-l border-gray-100 pl-4">
                  <span className="whitespace-nowrap text-sm font-semibold text-[#2B2F5E]">
                    Anno riepilogo
                  </span>
                  <select
                    value={annoVisualizzato}
                    onChange={(event) =>
                      setAnnoVisualizzato(Number(event.target.value))
                    }
                    className="h-10 min-w-28 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-[#2B2F5E] outline-none focus:border-[#5E9AD3]"
                    aria-label="Anno del riepilogo"
                  >
                    {anniDisponibili.map((anno) => (
                      <option key={anno} value={anno}>
                        {anno}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>
          </div>

          {errore ? (
            <MessaggioDatabase errore={errore} />
          ) : caricamento ? (
            <div className="min-h-[45vh] flex items-center justify-center text-gray-500">
              Caricamento costi società...
            </div>
          ) : (
            <>
              <section
                className={tab === "riepilogo" ? "block" : "hidden"}
                role="tabpanel"
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <Kpi
                    label="Costi sostenuti fino a oggi"
                    value={formattaEuro(riepilogo.costiSostenuti)}
                    description={`Imponibili pagati nel ${annoVisualizzato} entro la data odierna.`}
                  />
                  <Kpi
                    label="Costi previsti entro fine anno"
                    value={formattaEuro(riepilogo.costiPrevisti)}
                    description={`Imponibili pagati e previsti nel ${annoVisualizzato} fino al 31 dicembre.`}
                  />
                  <Kpi
                    label="Cassa totale"
                    value={formattaEuro(riepilogo.cassaTotale)}
                    description={`Cassa versata nel ${annoVisualizzato} entro la data odierna.`}
                  />
                  <Kpi
                    label="IVA totale"
                    value={formattaEuro(riepilogo.ivaTotale)}
                    description={`IVA versata nel ${annoVisualizzato} entro la data odierna.`}
                  />
                </div>
              </section>

              <div className={`${tab === "riepilogo" ? "hidden" : "grid"} grid-cols-1 gap-5 ${formAperto ? "2xl:grid-cols-[420px_minmax(0,1fr)]" : ""}`} role="tabpanel">
                {formAperto ? <Card
                  title={
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-3">
                        <IconBadge />
                        {form.id ? "Modifica costo" : "Nuovo costo"}
                      </span>
                      <button
                        type="button"
                        onClick={chiudiForm}
                        className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 hover:bg-[#F2F2F2] cursor-pointer"
                        aria-label="Chiudi form"
                      >
                        <AppIcon name="x" size={17} />
                      </button>
                    </div>
                  }
                >
                  <div className="space-y-4">
                    {form.categoria === "Collaboratori" ? (
                      <label className="block">
                        <span className="mb-2 block text-sm font-semibold text-[#2B2F5E]">
                          Collaboratore
                        </span>
                        <select
                          value={form.persona_id}
                          onChange={(event) =>
                            aggiornaForm("persona_id", event.target.value)
                          }
                          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-[#2B2F5E] outline-none focus:border-[#5E9AD3]"
                          required
                        >
                          <option value="">Seleziona dalla lista del personale</option>
                          {personale.map((persona) => (
                            <option key={persona.id} value={persona.id}>
                              {persona.nome}{persona.attivo ? "" : " (non attivo)"}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : (
                      <Campo
                        label="Descrizione"
                        value={form.descrizione}
                        onChange={(value) => aggiornaForm("descrizione", value)}
                        placeholder="Es. Affitto studio"
                      />
                    )}

                    {form.categoria === "Studio" ||
                    form.categoria === "Collaboratori" ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <label className="block">
                            <span className="mb-2 block text-sm font-semibold text-[#2B2F5E]">
                              Data di partenza
                            </span>
                            <input
                              type="date"
                              value={form.data_inizio}
                              onChange={(event) =>
                                aggiornaForm("data_inizio", event.target.value)
                              }
                              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-[#2B2F5E] outline-none focus:border-[#5E9AD3]"
                              required
                            />
                          </label>

                          {!form.in_corso && (
                            <label className="block">
                              <span className="mb-2 block text-sm font-semibold text-[#2B2F5E]">
                                {form.categoria === "Collaboratori"
                                  ? "Data ultimo pagamento"
                                  : "Data ultima spesa"}
                              </span>
                              <input
                                type="date"
                                min={form.data_inizio || undefined}
                                value={form.data_fine}
                                onChange={(event) =>
                                  aggiornaForm("data_fine", event.target.value)
                                }
                                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-[#2B2F5E] outline-none focus:border-[#5E9AD3]"
                                required
                              />
                            </label>
                          )}
                        </div>

                        <label className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-[#F2F2F2]/70 p-4 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={form.in_corso}
                            onChange={(event) =>
                              aggiornaForm("in_corso", event.target.checked)
                            }
                            className="h-4 w-4 accent-[#64B445]"
                          />
                          <span>
                            <span className="block text-sm font-semibold text-[#2B2F5E]">
                              In corso
                            </span>
                            <span className="block text-xs text-gray-500">
                              {form.categoria === "Collaboratori"
                                ? "Il pagamento si ripete ogni mese nello stesso giorno della data di partenza."
                                : "La spesa si ripete ogni mese nello stesso giorno della data di partenza."}
                            </span>
                          </span>
                        </label>
                      </div>
                    ) : (
                      <label className="block">
                        <span className="mb-2 block text-sm font-semibold text-[#2B2F5E]">
                          Data di pagamento
                        </span>
                        <input
                          type="date"
                          value={form.data_pagamento}
                          onChange={(event) =>
                            aggiornaForm("data_pagamento", event.target.value)
                          }
                          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-[#2B2F5E] outline-none focus:border-[#5E9AD3]"
                          required
                        />
                      </label>
                    )}

                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-[#2B2F5E]">
                        {form.categoria === "Collaboratori"
                          ? "Compenso mensile"
                          : "Importo"}
                      </span>
                      <ImportoInput
                        value={form.importo}
                        onChange={(value) => aggiornaForm("importo", value)}
                      />
                    </label>

                    {form.categoria === "Collaboratori" ? (
                      <div className="rounded-2xl border border-[#D7E8F5] bg-[#E8F2FA] p-4">
                        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#2D80B3]">
                          Regime fiscale dal personale
                        </p>
                        <p className="mt-2 text-sm font-semibold text-[#2B2F5E]">
                          Cassa {cassaAliquotaForm > 0 ? `${cassaAliquotaForm}%` : "non prevista"}
                          {" · "}
                          IVA {ivaAliquotaForm > 0 ? `${ivaAliquotaForm}%` : "non prevista"}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          Le aliquote si modificano dalla pagina Personale della gestione economica.
                        </p>
                      </div>
                    ) : (
                      <AccessorioAutomatico
                        label="IVA 22%"
                        checked={form.calcola_iva}
                        onChange={(value) => aggiornaForm("calcola_iva", value)}
                        value={ivaFormNumero}
                      />
                    )}

                    {form.categoria === "Collaboratori" && (
                      <VariazioniCollaboratore
                        variazioni={form.variazioni}
                        onAdd={aggiungiVariazione}
                        onChange={aggiornaVariazione}
                        onRemove={rimuoviVariazione}
                      />
                    )}

                    <div className="rounded-2xl bg-[#F2F2F2]/70 p-4">
                      <p className="text-[11px] uppercase tracking-[0.12em] font-bold text-gray-400">
                        {form.categoria === "Studio" ||
                        form.categoria === "Collaboratori"
                          ? "Costo mensile"
                          : "Totale costo"}
                      </p>
                      <p className="mt-2 text-lg font-semibold text-[#2B2F5E]">
                        {formattaEuro(totaleFormStimato)}
                      </p>
                    </div>

                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-[#2B2F5E]">
                        Note
                      </span>
                      <textarea
                        value={form.note}
                        onChange={(event) => aggiornaForm("note", event.target.value)}
                        rows={3}
                        className="w-full resize-none rounded-xl border border-gray-200 bg-[#F2F2F2]/70 px-4 py-3 text-sm text-[#2B2F5E] outline-none focus:border-[#5E9AD3] focus:bg-white focus:ring-4 focus:ring-[#5E9AD3]/10"
                      />
                    </label>

                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={chiudiForm}
                        className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#2B2F5E] hover:bg-[#F2F2F2] cursor-pointer"
                      >
                        Annulla
                      </button>
                      {form.id && (
                        <button
                          type="button"
                          onClick={eliminaCosto}
                          className="rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 cursor-pointer"
                        >
                          Elimina
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={salvaCosto}
                        disabled={salvataggio}
                        className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm cursor-pointer disabled:cursor-default ${
                          salvataggio
                            ? "bg-gray-400"
                            : "bg-[#64B445] hover:bg-[#5AA03E]"
                        }`}
                      >
                        {salvataggio ? "Salvataggio" : "Salva costo"}
                      </button>
                    </div>
                  </div>
                </Card> : null}

                <div className="space-y-5">
                  {tab === "studio" ? <ArchivioCosti
                    title="Archivio spese studio"
                    emptyText="Nessuna spesa dello studio inserita."
                    costi={speseStudio}
                    annoCorrente={annoVisualizzato}
                    onOpen={apriCosto}
                    onAdd={() => nuovaVoce("Studio")}
                    showPeriodo
                    showFrequency={false}
                  /> : null}
                  {tab === "acquisti" ? <ArchivioCosti
                    title="Archivio acquisti"
                    emptyText="Nessun acquisto inserito."
                    costi={acquisti}
                    annoCorrente={annoVisualizzato}
                    onOpen={apriCosto}
                    onAdd={() => nuovaVoce("Acquisti")}
                    showFrequency={false}
                    showTotal
                  /> : null}
                  {tab === "collaboratori" ? <ArchivioCosti
                    title="Archivio costi collaboratori"
                    emptyText="Nessun costo collaboratore inserito."
                    costi={speseCollaboratori}
                    annoCorrente={annoVisualizzato}
                    onOpen={apriCosto}
                    onAdd={() => nuovaVoce("Collaboratori")}
                    showPeriodo
                    showCassa
                    showFrequency={false}
                  /> : null}
                </div>
              </div>
            </>
          )}
        </div>
      </EconomiaAccessGuard>
    </LayoutApp>
  );
}

function VariazioniCollaboratore({
  variazioni,
  onAdd,
  onChange,
  onRemove,
}: {
  variazioni: VariazioneCostoDraft[];
  onAdd: () => void;
  onChange: (id: string, modifica: Partial<VariazioneCostoDraft>) => void;
  onRemove: (id: string) => void;
}) {
  const ordinate = [...variazioni].sort((a, b) =>
    a.data_decorrenza.localeCompare(b.data_decorrenza)
  );

  return (
    <section className="rounded-2xl border border-gray-100 bg-[#F8F9FB] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[#2B2F5E]">
            Variazioni del compenso
          </h3>
          <p className="mt-1 text-xs text-gray-500">
            Registra il nuovo importo mensile e la relativa decorrenza.
          </p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#2B2F5E] text-white hover:bg-[#23264D] cursor-pointer"
          aria-label="Aggiungi variazione del compenso"
          title="Aggiungi variazione"
        >
          <AppIcon name="plus" size={16} />
        </button>
      </div>

      {ordinate.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-gray-200 bg-white px-4 py-5 text-center text-xs text-gray-400">
          Nessuna variazione inserita.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {ordinate.map((variazione) => (
            <div
              key={variazione.id}
              className="grid grid-cols-1 gap-3 rounded-xl border border-gray-100 bg-white p-3 sm:grid-cols-[150px_minmax(150px,1fr)_minmax(180px,1.4fr)_40px]"
            >
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-[#2B2F5E]">
                  Decorrenza
                </span>
                <input
                  type="date"
                  value={variazione.data_decorrenza}
                  onChange={(event) =>
                    onChange(variazione.id, {
                      data_decorrenza: event.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-[#2B2F5E] outline-none focus:border-[#5E9AD3]"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-[#2B2F5E]">
                  Nuovo compenso
                </span>
                <ImportoInput
                  value={variazione.importo}
                  onChange={(value) =>
                    onChange(variazione.id, { importo: value })
                  }
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-[#2B2F5E]">
                  Nota
                </span>
                <input
                  value={variazione.note}
                  onChange={(event) =>
                    onChange(variazione.id, { note: event.target.value })
                  }
                  placeholder="Es. aumento concordato"
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-[#2B2F5E] outline-none focus:border-[#5E9AD3]"
                />
              </label>

              <button
                type="button"
                onClick={() => onRemove(variazione.id)}
                className="flex h-10 w-10 items-center justify-center self-end rounded-xl text-red-600 hover:bg-red-50 cursor-pointer"
                aria-label="Rimuovi variazione"
                title="Rimuovi variazione"
              >
                <AppIcon name="x" size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Card({
  title,
  children,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-white bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
      <div className="border-b border-gray-100 px-5 py-4 text-[16px] font-semibold text-[#2B2F5E]">
        {title}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Kpi({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description?: string;
}) {
  return (
    <div className="rounded-2xl border border-white bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
      <p className="text-[11px] uppercase tracking-[0.12em] font-bold text-gray-400">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold text-[#2B2F5E]">{value}</p>
      {description ? (
        <p className="mt-2 text-xs leading-relaxed text-gray-500">
          {description}
        </p>
      ) : null}
    </div>
  );
}

function IconBadge() {
  return (
    <span className="h-10 w-10 rounded-xl bg-[#5E9AD3]/12 text-[#2D80B3] flex items-center justify-center shrink-0">
      <AppIcon name="wallet" size={19} />
    </span>
  );
}

function AccessorioAutomatico({
  label,
  checked,
  value,
  onChange,
}: {
  label: string;
  checked: boolean;
  value: number;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-[#F2F2F2]/70 p-4 cursor-pointer">
      <span className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="h-4 w-4 accent-[#64B445]"
        />
        <span>
          <span className="block text-sm font-semibold text-[#2B2F5E]">
            {label}
          </span>
          <span className="block text-xs text-gray-500">
            {checked ? "Calcolata automaticamente" : "Non calcolata"}
          </span>
        </span>
      </span>
      <span className="text-sm font-semibold text-[#2B2F5E]">
        {formattaEuro(value)}
      </span>
    </label>
  );
}

function ArchivioCosti({
  title,
  emptyText,
  costi,
  annoCorrente,
  onOpen,
  onAdd,
  showPeriodo = false,
  showCassa = false,
  showFrequency = true,
  showTotal = false,
}: {
  title: string;
  emptyText: string;
  costi: CostoSocieta[];
  annoCorrente: number;
  onOpen: (costo: CostoSocieta) => void;
  onAdd: () => void;
  showPeriodo?: boolean;
  showCassa?: boolean;
  showFrequency?: boolean;
  showTotal?: boolean;
}) {
  return (
    <Card
      title={
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-3">
            <IconBadge />
            {title}
          </span>
          <button
            type="button"
            onClick={onAdd}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#64B445] text-white hover:bg-[#5AA03E] cursor-pointer"
            aria-label={`Aggiungi voce a ${title}`}
            title="Aggiungi costo"
          >
            <AppIcon name="plus" size={17} />
          </button>
        </div>
      }
    >
      {costi.length === 0 ? (
        <p className="text-sm text-gray-400">{emptyText}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="text-[11px] uppercase tracking-[0.12em] text-gray-400">
              <tr className="border-b border-gray-100">
                <th className="py-3 text-left">Costo</th>
                {showFrequency && (
                  <th className="py-3 text-left">Frequenza</th>
                )}
                <th className="py-3 text-left">
                  {showPeriodo ? "Riferimento" : "Data pagamento"}
                </th>
                <th className="py-3 text-right">Importo</th>
                {showCassa && <th className="py-3 text-right">Cassa</th>}
                <th className="py-3 text-right">IVA</th>
                <th className="py-3 text-right">
                  {showTotal ? "TOTALE" : `Costi ${annoCorrente}`}
                </th>
              </tr>
            </thead>
            <tbody>
              {costi.map((costo) => (
                <tr
                  key={costo.id}
                  onClick={() => onOpen(costo)}
                  className="border-b border-gray-100 hover:bg-[#F2F2F2]/70 cursor-pointer"
                >
                  <td className="py-3 pr-4">
                    <p className="font-semibold text-[#2B2F5E]">
                      {costo.descrizione}
                    </p>
                  </td>
                  {showFrequency && (
                    <td className="py-3 text-[#2B2F5E]">
                      {costo.frequenza}
                    </td>
                  )}
                  <td className="py-3 text-[#2B2F5E]">
                    {showPeriodo
                      ? formattaRiferimentoCosto(costo)
                      : costo.data_riferimento
                        ? formattaData(costo.data_riferimento)
                        : "-"}
                  </td>
                  <td className="py-3 text-right">
                    {formattaEuro(costo.importo)}
                  </td>
                  {showCassa && (
                    <td className="py-3 text-right">
                      {formattaEuro(costo.cassa || 0)}
                    </td>
                  )}
                  <td className="py-3 text-right">
                    {formattaEuro(costo.iva || 0)}
                  </td>
                  <td className="py-3 text-right font-semibold text-[#2B2F5E]">
                    {formattaEuro(
                      showTotal
                        ? totaleCostoSocieta(costo)
                        : costoSocietaAnnuale(costo, annoCorrente)
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function formattaRiferimentoCosto(costo: CostoSocieta) {
  if (
    categoriaCosto(costo) === "Studio" ||
    categoriaCosto(costo) === "Collaboratori"
  ) {
    if (!costo.data_inizio) return "-";
    return costo.data_fine
      ? `Dal ${formattaData(costo.data_inizio)} al ${formattaData(costo.data_fine)}`
      : `Dal ${formattaData(costo.data_inizio)} · In corso`;
  }

  if (costo.frequenza === "Annuale") {
    return costo.data_riferimento
      ? `Anno ${new Date(costo.data_riferimento).getFullYear()}`
      : "-";
  }

  if (costo.frequenza === "Mensile") {
    const mesi =
      costo.numero_mesi && costo.numero_mesi > 0
        ? costo.numero_mesi
        : Number(mesiTraDate(costo.data_inizio, costo.data_fine) || 0);

    return costo.data_inizio
      ? `Dal ${formattaData(costo.data_inizio)} - ${mesi || 1} mesi`
      : "-";
  }

  return costo.data_riferimento
    ? `Pagamento ${formattaData(costo.data_riferimento)}`
    : "-";
}

function formattaData(value: string | null) {
  if (!value) return "-";

  const data = new Date(value);
  if (Number.isNaN(data.getTime())) return "-";

  return data.toLocaleDateString("it-IT");
}

function Campo({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-[#2B2F5E]">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-gray-200 bg-[#F2F2F2]/70 px-4 py-3 text-sm text-[#2B2F5E] outline-none focus:border-[#5E9AD3] focus:bg-white focus:ring-4 focus:ring-[#5E9AD3]/10"
      />
    </label>
  );
}

function MessaggioDatabase({ errore }: { errore: string }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
      <h3 className="text-xl font-semibold text-[#2B2F5E]">
        Tabelle economiche non disponibili
      </h3>
      <p className="mt-2 text-sm text-gray-600">
        Esegui prima il file SQL{" "}
        <span className="font-semibold">supabase-gestione-economica.sql</span>.
      </p>
      <p className="mt-3 text-xs text-red-500">{errore}</p>
    </div>
  );
}
