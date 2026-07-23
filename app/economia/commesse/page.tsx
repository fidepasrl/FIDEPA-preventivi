"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AppIcon from "@/components/AppIcon";
import EconomiaAccessGuard from "@/components/EconomiaAccessGuard";
import ImportoInput from "@/components/ImportoInput";
import LayoutApp from "@/components/LayoutApp";
import { finalizzaInputImporto, formattaEuro, parseImporto } from "@/lib/importi";
import { supabase } from "@/lib/supabase";

type Commessa = {
  id: string;
  titolo: string;
  codice: string | null;
  cliente_nome: string | null;
  data_inizio: string | null;
  data_fine: string | null;
  created_at: string;
};

type Persona = {
  id: string;
  nome: string;
  colore: string;
  attivo: boolean;
};

type EconomiaCommessa = {
  id: string;
  commessa_id: string;
  anno: number;
  compenso: number;
  trattenuta_percentuale: number;
  cassa: number;
  iva: number;
  fatturato_come_ing_pascale: boolean | null;
  note: string | null;
  created_at: string;
};

type CollaboratoreDb = {
  id: string;
  economia_commessa_id: string;
  persona_id: string | null;
  collaboratore_esterno_nome: string | null;
  compenso: number;
  cassa: number;
  iva: number;
};

type CostoProgettoDb = {
  id: string;
  economia_commessa_id: string;
  descrizione: string;
  importo: number;
  cassa: number;
  iva: number;
};

type SalCollaboratoreDb = {
  id: string;
  collaboratore_id: string;
  importo: number;
  cassa: number;
  iva: number;
  data_pagamento: string | null;
};

type SalCostoProgettoDb = {
  id: string;
  costo_progetto_id: string;
  importo: number;
  cassa: number;
  iva: number;
  data_pagamento: string | null;
};

type SalForm = {
  localId: string;
  importo: string;
  calcola_cassa: boolean;
  calcola_iva: boolean;
  data_pagamento: string;
};

type CollaboratoreForm = {
  localId: string;
  tipo: "personale" | "esterno";
  persona_id: string;
  collaboratore_esterno_nome: string;
  compenso: string;
  percentuale: string;
  calcolo: "importo" | "percentuale";
  calcola_cassa: boolean;
  calcola_iva: boolean;
  sal: SalForm[];
};

type CostoProgettoForm = {
  localId: string;
  descrizione: string;
  importo: string;
  cassa: string;
  iva: string;
  sal: SalForm[];
};

function creaIdLocale() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
}

function calcolaCassa(importo: number, attiva: boolean) {
  return attiva ? importo * 0.04 : 0;
}

function calcolaIva(importo: number, cassa: number, attiva: boolean) {
  return attiva ? (importo + cassa) * 0.22 : 0;
}

function formattaPercentuale(value: number) {
  if (!Number.isFinite(value)) return "";

  return new Intl.NumberFormat("it-IT", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function creaSalVuoto(): SalForm {
  return {
    localId: creaIdLocale(),
    importo: "",
    calcola_cassa: true,
    calcola_iva: true,
    data_pagamento: "",
  };
}

const collatorCommesse = new Intl.Collator("it", {
  numeric: true,
  sensitivity: "base",
});

function ordinaCommesse(a: Commessa, b: Commessa) {
  if (a.codice && !b.codice) return -1;
  if (!a.codice && b.codice) return 1;

  const confrontoCodice = collatorCommesse.compare(b.codice || "", a.codice || "");
  if (confrontoCodice !== 0) return confrontoCodice;

  return collatorCommesse.compare(a.titolo || "", b.titolo || "");
}

function ordinaSchedeEconomiche(a: EconomiaCommessa, b: EconomiaCommessa) {
  if (b.anno !== a.anno) return b.anno - a.anno;

  return (
    new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  );
}

function trovaSchedaCommessa(
  commessaId: string,
  schede: EconomiaCommessa[],
  annoPreferito: number
) {
  const schedeCommessa = schede
    .filter((item) => item.commessa_id === commessaId)
    .sort(ordinaSchedeEconomiche);

  return (
    schedeCommessa.find((item) => item.anno === annoPreferito) ||
    schedeCommessa[0] ||
    null
  );
}

export default function EconomiaCommessePage() {
  const annoCorrente = new Date().getFullYear();
  const [anno, setAnno] = useState(() => {
    if (typeof window === "undefined") return annoCorrente;

    const annoSalvato = Number(window.localStorage.getItem("economia_commesse_anno"));
    return annoSalvato >= 2000 && annoSalvato <= 2100
      ? annoSalvato
      : annoCorrente;
  });
  const [commesse, setCommesse] = useState<Commessa[]>([]);
  const [personale, setPersonale] = useState<Persona[]>([]);
  const [economia, setEconomia] = useState<EconomiaCommessa[]>([]);
  const [collaboratoriDb, setCollaboratoriDb] = useState<CollaboratoreDb[]>([]);
  const [costiDb, setCostiDb] = useState<CostoProgettoDb[]>([]);
  const [salCollaboratoriDb, setSalCollaboratoriDb] = useState<
    SalCollaboratoreDb[]
  >([]);
  const [salCostiDb, setSalCostiDb] = useState<SalCostoProgettoDb[]>([]);
  const [commessaSelezionata, setCommessaSelezionata] =
    useState<Commessa | null>(null);
  const [economiaId, setEconomiaId] = useState("");
  const [annoFatturazione, setAnnoFatturazione] = useState(annoCorrente);
  const [compenso, setCompenso] = useState("");
  const [trattenutaPercentuale, setTrattenutaPercentuale] = useState("0");
  const [fatturatoComeIngPascale, setFatturatoComeIngPascale] = useState(false);
  const [note, setNote] = useState("");
  const [collaboratori, setCollaboratori] = useState<CollaboratoreForm[]>([]);
  const [costiProgetto, setCostiProgetto] = useState<CostoProgettoForm[]>([]);
  const [ricerca, setRicerca] = useState("");
  const [caricamento, setCaricamento] = useState(true);
  const [salvataggio, setSalvataggio] = useState(false);
  const [errore, setErrore] = useState("");

  useEffect(() => {
    window.localStorage.setItem("economia_commesse_anno", String(anno));
  }, [anno]);

  async function caricaDati(commessaDaRiaprire?: string) {
    setCaricamento(true);
    setErrore("");

    const [commesseRes, personaleRes, economiaRes] = await Promise.all([
      supabase
        .from("commesse")
        .select("id, titolo, codice, cliente_nome, data_inizio, data_fine, created_at")
        .eq("lavoro_privato_non_fidepa", false)
        .order("codice", { ascending: false, nullsFirst: false }),
      supabase
        .from("personale")
        .select("id, nome, colore, attivo")
        .eq("attivo", true)
        .order("nome", { ascending: true }),
      supabase
        .from("economia_commesse")
        .select("*, commesse!inner(lavoro_privato_non_fidepa)")
        .eq("commesse.lavoro_privato_non_fidepa", false)
        .order("anno", { ascending: false })
        .order("created_at", { ascending: false }),
    ]);

    if (commesseRes.error || personaleRes.error || economiaRes.error) {
      setErrore(
        commesseRes.error?.message ||
          personaleRes.error?.message ||
          economiaRes.error?.message ||
          "Errore durante il caricamento dei dati economici."
      );
      setCaricamento(false);
      return;
    }

    const commesseDb = ((commesseRes.data || []) as Commessa[]).sort(
      ordinaCommesse
    );
    const personaleDb = (personaleRes.data || []) as Persona[];
    const economiaDb = ((economiaRes.data || []) as EconomiaCommessa[]).sort(
      ordinaSchedeEconomiche
    );
    const economiaIds = economiaDb.map((item) => item.id);

    let collaboratori = [] as CollaboratoreDb[];
    let costi = [] as CostoProgettoDb[];
    let salCollaboratori = [] as SalCollaboratoreDb[];
    let salCosti = [] as SalCostoProgettoDb[];

    if (economiaIds.length > 0) {
      const [collaboratoriRes, costiRes] = await Promise.all([
        supabase
          .from("economia_commesse_collaboratori")
          .select("*")
          .in("economia_commessa_id", economiaIds),
        supabase
          .from("economia_commesse_costi")
          .select("*")
          .in("economia_commessa_id", economiaIds)
          .order("created_at", { ascending: true }),
      ]);

      if (collaboratoriRes.error || costiRes.error) {
        setErrore(
          collaboratoriRes.error?.message ||
            costiRes.error?.message ||
            "Errore durante il caricamento dei dettagli economici."
        );
        setCaricamento(false);
        return;
      }

      collaboratori = (collaboratoriRes.data || []) as CollaboratoreDb[];
      costi = (costiRes.data || []) as CostoProgettoDb[];

      const collaboratoriIds = collaboratori.map((item) => item.id);
      const costiIds = costi.map((item) => item.id);

      const [salCollaboratoriRes, salCostiRes] = await Promise.all([
        collaboratoriIds.length > 0
          ? supabase
              .from("economia_collaboratori_sal")
              .select("*")
              .in("collaboratore_id", collaboratoriIds)
              .order("data_pagamento", { ascending: true })
          : Promise.resolve({ data: [], error: null }),
        costiIds.length > 0
          ? supabase
              .from("economia_costi_progetto_sal")
              .select("*")
              .in("costo_progetto_id", costiIds)
              .order("data_pagamento", { ascending: true })
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (salCollaboratoriRes.error || salCostiRes.error) {
        setErrore(
          salCollaboratoriRes.error?.message ||
            salCostiRes.error?.message ||
            "Errore durante il caricamento dei SAL."
        );
        setCaricamento(false);
        return;
      }

      salCollaboratori = (salCollaboratoriRes.data || []) as SalCollaboratoreDb[];
      salCosti = (salCostiRes.data || []) as SalCostoProgettoDb[];
    }

    setCommesse(commesseDb);
    setPersonale(personaleDb);
    setEconomia(economiaDb);
    setCollaboratoriDb(collaboratori);
    setCostiDb(costi);
    setSalCollaboratoriDb(salCollaboratori);
    setSalCostiDb(salCosti);
    setCaricamento(false);

    const idDaAprire = commessaDaRiaprire || commessaSelezionata?.id;
    const prossimaCommessa =
      commesseDb.find((item) => item.id === idDaAprire) || commesseDb[0] || null;

    if (prossimaCommessa) {
      apriCommessa(
        prossimaCommessa,
        economiaDb,
        collaboratori,
        costi,
        salCollaboratori,
        salCosti
      );
    } else {
      resetScheda();
    }
  }

  useEffect(() => {
    async function caricaDatiAnno() {
      await caricaDati();
    }

    void caricaDatiAnno();
    // Il cambio anno deve ricaricare la scheda economica selezionata.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anno]);

  function resetScheda() {
    setCommessaSelezionata(null);
    setEconomiaId("");
    setAnnoFatturazione(anno);
    setCompenso("");
    setTrattenutaPercentuale("0");
    setFatturatoComeIngPascale(false);
    setNote("");
    setCollaboratori([]);
    setCostiProgetto([]);
  }

  function apriCommessa(
    commessa: Commessa,
    economiaDisponibile = economia,
    collaboratoriDisponibili = collaboratoriDb,
    costiDisponibili = costiDb,
    salCollaboratoriDisponibili = salCollaboratoriDb,
    salCostiDisponibili = salCostiDb
  ) {
    const scheda = trovaSchedaCommessa(
      commessa.id,
      economiaDisponibile,
      anno
    );

    setCommessaSelezionata(commessa);

    if (!scheda) {
      setEconomiaId("");
      setAnnoFatturazione(anno);
      setCompenso("");
      setTrattenutaPercentuale("0");
      setFatturatoComeIngPascale(false);
      setNote("");
      setCollaboratori([]);
      setCostiProgetto([]);
      return;
    }

    setEconomiaId(scheda.id);
    setAnnoFatturazione(scheda.anno || anno);
    if (scheda.anno && scheda.anno !== anno) {
      setAnno(scheda.anno);
    }
    setCompenso(finalizzaInputImporto(scheda.compenso));
    setTrattenutaPercentuale(String(scheda.trattenuta_percentuale || 0));
    setFatturatoComeIngPascale(Boolean(scheda.fatturato_come_ing_pascale));
    setNote(scheda.note || "");
    setCollaboratori(
      collaboratoriDisponibili
        .filter((item) => item.economia_commessa_id === scheda.id)
        .map((item) => ({
          localId: item.id,
          tipo: item.persona_id ? ("personale" as const) : ("esterno" as const),
          persona_id: item.persona_id || "",
          collaboratore_esterno_nome: item.collaboratore_esterno_nome || "",
          compenso: finalizzaInputImporto(item.compenso),
          percentuale: "",
          calcolo: "importo" as const,
          calcola_cassa: Number(item.cassa || 0) > 0,
          calcola_iva: Number(item.iva || 0) > 0,
          sal: salCollaboratoriDisponibili
            .filter((sal) => sal.collaboratore_id === item.id)
            .map((sal) => ({
              localId: sal.id,
              importo: finalizzaInputImporto(sal.importo),
              calcola_cassa: Number(sal.cassa || 0) > 0,
              calcola_iva: Number(sal.iva || 0) > 0,
              data_pagamento: sal.data_pagamento || "",
            })),
        }))
    );
    setCostiProgetto(
      costiDisponibili
        .filter((item) => item.economia_commessa_id === scheda.id)
        .map((item) => ({
          localId: item.id,
          descrizione: item.descrizione,
          importo: finalizzaInputImporto(item.importo),
          cassa: finalizzaInputImporto(item.cassa || 0),
          iva: finalizzaInputImporto(item.iva || 0),
          sal: salCostiDisponibili
            .filter((sal) => sal.costo_progetto_id === item.id)
            .map((sal) => ({
              localId: sal.id,
              importo: finalizzaInputImporto(sal.importo),
              calcola_cassa: Number(sal.cassa || 0) > 0,
              calcola_iva: Number(sal.iva || 0) > 0,
              data_pagamento: sal.data_pagamento || "",
            })),
        }))
    );
  }

  const economiaPerCommessa = useMemo(() => {
    const mappa = new Map<string, EconomiaCommessa>();

    commesse.forEach((commessa) => {
      const scheda = trovaSchedaCommessa(commessa.id, economia, anno);
      if (scheda) {
        mappa.set(commessa.id, scheda);
      }
    });

    return mappa;
  }, [anno, commesse, economia]);

  const collaboratoriPerEconomia = useMemo(() => {
    const mappa = new Map<string, CollaboratoreDb[]>();

    collaboratoriDb.forEach((item) => {
      const correnti = mappa.get(item.economia_commessa_id) || [];
      correnti.push(item);
      mappa.set(item.economia_commessa_id, correnti);
    });

    return mappa;
  }, [collaboratoriDb]);

  const costiPerEconomia = useMemo(() => {
    const mappa = new Map<string, CostoProgettoDb[]>();

    costiDb.forEach((item) => {
      const correnti = mappa.get(item.economia_commessa_id) || [];
      correnti.push(item);
      mappa.set(item.economia_commessa_id, correnti);
    });

    return mappa;
  }, [costiDb]);

  const commesseFiltrate = commesse.filter((commessa) => {
    const testo = `${commessa.codice || ""} ${commessa.titolo} ${
      commessa.cliente_nome || ""
    }`.toLowerCase();

    return testo.includes(ricerca.toLowerCase());
  });

  const compensoNumero = parseImporto(compenso);
  const trattenutaNumero = parseImporto(trattenutaPercentuale);
  const cassaCommessaNumero = compensoNumero * 0.04;
  const ivaCommessaNumero = (compensoNumero + cassaCommessaNumero) * 0.22;
  const quotaTrattenuta = (compensoNumero * trattenutaNumero) / 100;
  const totaleCostiProgetto = costiProgetto.reduce((totale, item) => {
    const importo = parseImporto(item.importo);
    return totale + importo + parseImporto(item.cassa);
  }, 0);
  const baseCalcoloCollaboratori =
    compensoNumero - quotaTrattenuta - totaleCostiProgetto;
  const totaleCollaboratori = collaboratori.reduce(
    (totale, item) => {
      const importo = parseImporto(item.compenso);
      const cassa = calcolaCassa(importo, item.calcola_cassa);
      return totale + importo + cassa;
    },
    0
  );
  const residuoFidepa =
    compensoNumero - quotaTrattenuta - totaleCollaboratori - totaleCostiProgetto;
  const risultato = compensoNumero - totaleCollaboratori - totaleCostiProgetto;

  useEffect(() => {
    // Il ricalcolo sincronizza importi e percentuali già presenti nel form.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCollaboratori((correnti) =>
      correnti.map((item) => {
        const importo = parseImporto(item.compenso);

        if (item.calcolo === "percentuale") {
          const nuovoImporto =
            baseCalcoloCollaboratori > 0
              ? (baseCalcoloCollaboratori * parseImporto(item.percentuale)) / 100
              : 0;

          return {
            ...item,
            compenso: nuovoImporto > 0 ? finalizzaInputImporto(nuovoImporto) : "",
          };
        }

        return {
          ...item,
          percentuale:
            baseCalcoloCollaboratori > 0 && importo > 0
              ? formattaPercentuale((importo / baseCalcoloCollaboratori) * 100)
              : "",
        };
      })
    );
  }, [baseCalcoloCollaboratori]);

  function getRiepilogoCommessa(commessaId: string) {
    const scheda = economiaPerCommessa.get(commessaId);
    if (!scheda) {
      return { compenso: 0, costi: 0, risultato: 0, anno: null };
    }

    const costiCollaboratori = (
      collaboratoriPerEconomia.get(scheda.id) || []
    ).reduce(
      (totale, item) => totale + Number(item.compenso || 0) + Number(item.cassa || 0),
      0
    );
    const costiProgetto = (costiPerEconomia.get(scheda.id) || []).reduce(
      (totale, item) =>
        totale +
        Number(item.importo || 0) +
        Number(item.cassa || 0),
      0
    );
    const costi = costiCollaboratori + costiProgetto;

    return {
      compenso: Number(scheda.compenso || 0),
      costi,
      risultato: Number(scheda.compenso || 0) - costi,
      anno: scheda.anno,
    };
  }

  function aggiungiCollaboratore() {
    const giaSelezionati = new Set(
      collaboratori
        .filter((item) => item.tipo === "personale")
        .map((item) => item.persona_id)
        .filter(Boolean)
    );
    const disponibile = personale.find((persona) => !giaSelezionati.has(persona.id));

    if (!disponibile) {
      alert("Tutto il personale attivo e gia inserito in questa commessa.");
      return;
    }

    setCollaboratori((correnti) => [
      ...correnti,
      {
        localId: creaIdLocale(),
        tipo: "personale",
        persona_id: disponibile.id,
        collaboratore_esterno_nome: "",
        compenso: "",
        percentuale: "",
        calcolo: "importo",
        calcola_cassa: true,
        calcola_iva: true,
        sal: [],
      },
    ]);
  }

  function aggiungiCollaboratoreEsterno() {
    setCollaboratori((correnti) => [
      ...correnti,
      {
        localId: creaIdLocale(),
        tipo: "esterno",
        persona_id: "",
        collaboratore_esterno_nome: "",
        compenso: "",
        percentuale: "",
        calcolo: "importo",
        calcola_cassa: true,
        calcola_iva: true,
        sal: [],
      },
    ]);
  }

  function aggiornaCollaboratore(
    indice: number,
    campo: keyof CollaboratoreForm,
    valore: string
  ) {
    setCollaboratori((correnti) =>
      correnti.map((item, i) => {
        if (i !== indice) return item;

        if (campo === "tipo" && valore === "personale") {
          const giaSelezionati = new Set(
            correnti
              .filter((collaboratore, altroIndice) =>
                altroIndice !== indice && collaboratore.tipo === "personale"
              )
              .map((collaboratore) => collaboratore.persona_id)
              .filter(Boolean)
          );
          const disponibile = personale.find(
            (persona) => !giaSelezionati.has(persona.id)
          );

          return {
            ...item,
            tipo: "personale",
            persona_id: item.persona_id || disponibile?.id || "",
          };
        }

        if (campo === "tipo" && valore === "esterno") {
          return {
            ...item,
            tipo: "esterno",
            persona_id: "",
          };
        }

        return { ...item, [campo]: valore };
      })
    );
  }

  function aggiornaCompensoCollaboratore(indice: number, valore: string) {
    setCollaboratori((correnti) =>
      correnti.map((item, i) => {
        if (i !== indice) return item;

        const importo = parseImporto(valore);
        return {
          ...item,
          compenso: valore,
          calcolo: "importo",
          percentuale:
            baseCalcoloCollaboratori > 0 && importo > 0
              ? formattaPercentuale((importo / baseCalcoloCollaboratori) * 100)
              : "",
        };
      })
    );
  }

  function aggiornaPercentualeCollaboratore(indice: number, valore: string) {
    const percentuale = parseImporto(valore);
    const importo =
      baseCalcoloCollaboratori > 0 ? (baseCalcoloCollaboratori * percentuale) / 100 : 0;

    setCollaboratori((correnti) =>
      correnti.map((item, i) =>
        i === indice
          ? {
              ...item,
              percentuale: valore,
              calcolo: "percentuale",
              compenso: importo > 0 ? finalizzaInputImporto(importo) : "",
            }
          : item
      )
    );
  }

  function aggiornaAccessorioCollaboratore(
    indice: number,
    campo: "calcola_cassa" | "calcola_iva",
    valore: boolean
  ) {
    setCollaboratori((correnti) =>
      correnti.map((item, i) => (i === indice ? { ...item, [campo]: valore } : item))
    );
  }

  function rimuoviCollaboratore(indice: number) {
    setCollaboratori((correnti) => correnti.filter((_, i) => i !== indice));
  }

  function aggiungiSalCollaboratore(indice: number) {
    setCollaboratori((correnti) =>
      correnti.map((item, i) =>
        i === indice
          ? {
              ...item,
              sal: [
                ...item.sal,
                creaSalVuoto(),
              ],
            }
          : item
      )
    );
  }

  function aggiornaSalCollaboratore(
    indice: number,
    salIndice: number,
    campo: "importo" | "data_pagamento" | "calcola_cassa" | "calcola_iva",
    valore: string | boolean
  ) {
    setCollaboratori((correnti) =>
      correnti.map((item, i) =>
        i === indice
          ? {
              ...item,
              sal: item.sal.map((sal, j) =>
                j === salIndice ? { ...sal, [campo]: valore } : sal
              ),
            }
          : item
      )
    );
  }

  function rimuoviSalCollaboratore(indice: number, salIndice: number) {
    setCollaboratori((correnti) =>
      correnti.map((item, i) =>
        i === indice
          ? { ...item, sal: item.sal.filter((_, j) => j !== salIndice) }
          : item
      )
    );
  }

  function aggiungiCostoProgetto() {
    setCostiProgetto((correnti) => [
      ...correnti,
      {
        localId: creaIdLocale(),
        descrizione: "",
        importo: "",
        cassa: "",
        iva: "",
        sal: [],
      },
    ]);
  }

  function aggiornaCostoProgetto(
    indice: number,
    campo: keyof CostoProgettoForm,
    valore: string
  ) {
    setCostiProgetto((correnti) =>
      correnti.map((item, i) => (i === indice ? { ...item, [campo]: valore } : item))
    );
  }

  function rimuoviCostoProgetto(indice: number) {
    setCostiProgetto((correnti) => correnti.filter((_, i) => i !== indice));
  }

  function aggiungiSalCosto(indice: number) {
    setCostiProgetto((correnti) =>
      correnti.map((item, i) =>
        i === indice
          ? {
              ...item,
              sal: [
                ...item.sal,
                creaSalVuoto(),
              ],
            }
          : item
      )
    );
  }

  function aggiornaSalCosto(
    indice: number,
    salIndice: number,
    campo: "importo" | "data_pagamento" | "calcola_cassa" | "calcola_iva",
    valore: string | boolean
  ) {
    setCostiProgetto((correnti) =>
      correnti.map((item, i) =>
        i === indice
          ? {
              ...item,
              sal: item.sal.map((sal, j) =>
                j === salIndice ? { ...sal, [campo]: valore } : sal
              ),
            }
          : item
      )
    );
  }

  function rimuoviSalCosto(indice: number, salIndice: number) {
    setCostiProgetto((correnti) =>
      correnti.map((item, i) =>
        i === indice
          ? { ...item, sal: item.sal.filter((_, j) => j !== salIndice) }
          : item
      )
    );
  }

  async function salvaScheda() {
    if (!commessaSelezionata) {
      alert("Seleziona una commessa.");
      return;
    }

    if (annoFatturazione < 2000 || annoFatturazione > 2100) {
      alert("Inserisci un anno di fatturazione valido.");
      return;
    }

    if (trattenutaNumero < 0 || trattenutaNumero > 100) {
      alert("La trattenuta FIDEPA deve essere tra 0 e 100.");
      return;
    }

    const collaboratoriDuplicati =
      new Set(
        collaboratori
          .filter((item) => item.tipo === "personale")
          .map((item) => item.persona_id)
          .filter(Boolean)
      ).size !==
      collaboratori.filter((item) => item.tipo === "personale").length;

    if (collaboratoriDuplicati) {
      alert("Ogni persona puo comparire una sola volta nella stessa commessa.");
      return;
    }

    const collaboratoreEsternoIncompleto = collaboratori.some(
      (item) =>
        item.tipo === "esterno" &&
        parseImporto(item.compenso) > 0 &&
        !item.collaboratore_esterno_nome.trim()
    );

    if (collaboratoreEsternoIncompleto) {
      alert("Inserisci il nome per ogni collaboratore esterno.");
      return;
    }

    const costoIncompleto = costiProgetto.some(
      (item) => parseImporto(item.importo) > 0 && !item.descrizione.trim()
    );

    if (costoIncompleto) {
      alert("Inserisci una descrizione per ogni costo progetto.");
      return;
    }

    const salCollaboratoriIncompleti = collaboratori.some((item) =>
      item.sal.some((sal) => parseImporto(sal.importo) > 0 && !sal.data_pagamento)
    );

    if (salCollaboratoriIncompleti) {
      alert("Inserisci la data per ogni SAL collaboratore valorizzato.");
      return;
    }

    const salCostiIncompleti = costiProgetto.some((item) =>
      item.sal.some((sal) => parseImporto(sal.importo) > 0 && !sal.data_pagamento)
    );

    if (salCostiIncompleti) {
      alert("Inserisci la data per ogni SAL dei costi progetto valorizzato.");
      return;
    }

    setSalvataggio(true);

    const payload = {
      commessa_id: commessaSelezionata.id,
      anno: annoFatturazione,
      compenso: compensoNumero,
      trattenuta_percentuale: trattenutaNumero,
      cassa: cassaCommessaNumero,
      iva: ivaCommessaNumero,
      fatturato_come_ing_pascale: fatturatoComeIngPascale,
      note: note.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const richiesta = economiaId
      ? supabase
          .from("economia_commesse")
          .update(payload)
          .eq("id", economiaId)
          .select()
          .single()
      : supabase.from("economia_commesse").insert(payload).select().single();

    const { data, error } = await richiesta;

    if (error || !data) {
      alert(
        `Errore durante il salvataggio della scheda economica: ${
          error?.message || "controlla il database"
        }`
      );
      setSalvataggio(false);
      return;
    }

    const idScheda = data.id as string;

    const [deleteCollaboratori, deleteCosti] = await Promise.all([
      supabase
        .from("economia_commesse_collaboratori")
        .delete()
        .eq("economia_commessa_id", idScheda),
      supabase
        .from("economia_commesse_costi")
        .delete()
        .eq("economia_commessa_id", idScheda),
    ]);

    if (deleteCollaboratori.error || deleteCosti.error) {
      alert(
        deleteCollaboratori.error?.message ||
          deleteCosti.error?.message ||
          "Errore durante l'aggiornamento dei dettagli."
      );
      setSalvataggio(false);
      return;
    }

    const collaboratoriDaSalvare = collaboratori
      .filter(
        (item) =>
          (item.tipo === "personale" && item.persona_id) ||
          (item.tipo === "esterno" && item.collaboratore_esterno_nome.trim())
      )
      .map((item) => ({
        payload: (() => {
          const importo = parseImporto(item.compenso);
          const cassa = calcolaCassa(importo, item.calcola_cassa);

          return {
            economia_commessa_id: idScheda,
            persona_id: item.tipo === "personale" ? item.persona_id : null,
            collaboratore_esterno_nome:
              item.tipo === "esterno"
                ? item.collaboratore_esterno_nome.trim()
                : null,
            compenso: importo,
            cassa,
            iva: calcolaIva(importo, cassa, item.calcola_iva),
          };
        })(),
        sal: item.sal,
      }));

    const costiDaSalvare = costiProgetto
      .filter((item) => item.descrizione.trim() && parseImporto(item.importo) > 0)
      .map((item) => ({
        payload: {
          economia_commessa_id: idScheda,
          descrizione: item.descrizione.trim(),
          importo: parseImporto(item.importo),
          cassa: parseImporto(item.cassa),
          iva: parseImporto(item.iva),
        },
        sal: item.sal,
      }));

    if (collaboratoriDaSalvare.length > 0) {
      const { data: collaboratoriInseriti, error: insertCollaboratoriError } =
        await supabase
        .from("economia_commesse_collaboratori")
          .insert(collaboratoriDaSalvare.map((item) => item.payload))
          .select("id");

      if (insertCollaboratoriError) {
        alert(insertCollaboratoriError.message);
        setSalvataggio(false);
        return;
      }

      const salPayload = (collaboratoriInseriti || []).flatMap((collaboratore, indice) =>
        collaboratoriDaSalvare[indice].sal
          .filter((sal) => parseImporto(sal.importo) > 0)
          .map((sal) => ({
            ...(() => {
              const importo = parseImporto(sal.importo);
              const cassa = calcolaCassa(importo, sal.calcola_cassa);

              return {
                importo,
                cassa,
                iva: calcolaIva(importo, cassa, sal.calcola_iva),
              };
            })(),
            collaboratore_id: collaboratore.id,
            data_pagamento: sal.data_pagamento,
          }))
      );

      if (salPayload.length > 0) {
        const { error: insertSalError } = await supabase
          .from("economia_collaboratori_sal")
          .insert(salPayload);

        if (insertSalError) {
          alert(insertSalError.message);
          setSalvataggio(false);
          return;
        }
      }
    }

    if (costiDaSalvare.length > 0) {
      const { data: costiInseriti, error: insertCostiError } = await supabase
        .from("economia_commesse_costi")
        .insert(costiDaSalvare.map((item) => item.payload))
        .select("id");

      if (insertCostiError) {
        alert(insertCostiError.message);
        setSalvataggio(false);
        return;
      }

      const salPayload = (costiInseriti || []).flatMap((costo, indice) =>
        costiDaSalvare[indice].sal
          .filter((sal) => parseImporto(sal.importo) > 0)
          .map((sal) => ({
            ...(() => {
              const importo = parseImporto(sal.importo);
              const cassa = calcolaCassa(importo, sal.calcola_cassa);

              return {
                importo,
                cassa,
                iva: calcolaIva(importo, cassa, sal.calcola_iva),
              };
            })(),
            costo_progetto_id: costo.id,
            data_pagamento: sal.data_pagamento,
          }))
      );

      if (salPayload.length > 0) {
        const { error: insertSalError } = await supabase
          .from("economia_costi_progetto_sal")
          .insert(salPayload);

        if (insertSalError) {
          alert(insertSalError.message);
          setSalvataggio(false);
          return;
        }
      }
    }

    if (annoFatturazione !== anno) {
      setAnno(annoFatturazione);
    } else {
      await caricaDati(commessaSelezionata.id);
    }
    setTimeout(() => setSalvataggio(false), 1000);
  }

  async function eliminaScheda() {
    if (!economiaId || !commessaSelezionata) return;

    const conferma = window.confirm(
      "Eliminare la scheda economica di questa commessa?"
    );
    if (!conferma) return;

    const { error } = await supabase
      .from("economia_commesse")
      .delete()
      .eq("id", economiaId);

    if (error) {
      alert(error.message);
      return;
    }

    await caricaDati(commessaSelezionata.id);
  }

  return (
    <LayoutApp>
      <EconomiaAccessGuard>
        <div className="space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div>
              <h2 className="page-title">Economia commesse</h2>
              <p className="text-[15px] text-[#D79D06] mt-1">
                Compensi, collaboratori, costi progetto e risultato netto
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-[#2B2F5E] shadow-sm">
                Filtro anno
                <input
                  type="number"
                  value={anno}
                  onChange={(event) => setAnno(Number(event.target.value))}
                  className="w-20 border-0 bg-transparent text-right font-semibold outline-none"
                />
              </label>
              <Link
                href="/economia"
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-[#2B2F5E] shadow-sm hover:bg-[#F2F2F2]"
              >
                <AppIcon name="chartBar" size={17} />
                Report
              </Link>
              <Link
                href="/economia/costi"
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-[#2B2F5E] shadow-sm hover:bg-[#F2F2F2]"
              >
                <AppIcon name="wallet" size={17} />
                Costi società
              </Link>
            </div>
          </div>

          {errore ? (
            <MessaggioDatabase errore={errore} />
          ) : caricamento ? (
            <div className="min-h-[45vh] flex items-center justify-center text-gray-500">
              Caricamento commesse economiche...
            </div>
          ) : (
            <div className="grid grid-cols-1 2xl:grid-cols-[380px_minmax(0,1fr)] gap-5">
              <aside className="overflow-hidden rounded-2xl border border-white bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
                <div className="border-b border-gray-100 p-4">
                  <div className="flex items-center gap-3">
                    <span className="h-10 w-10 rounded-xl bg-[#5E9AD3]/12 text-[#2D80B3] flex items-center justify-center">
                      <AppIcon name="briefcase" size={19} />
                    </span>
                    <div>
                      <h3 className="font-semibold text-[#2B2F5E]">Commesse</h3>
                      <p className="text-xs text-gray-500">
                        {commesse.length} schede disponibili
                      </p>
                    </div>
                  </div>
                  <input
                    value={ricerca}
                    onChange={(event) => setRicerca(event.target.value)}
                    placeholder="Cerca commessa..."
                    className="mt-4 w-full rounded-xl border border-gray-200 bg-[#F2F2F2]/70 px-4 py-3 text-sm text-[#2B2F5E] outline-none focus:border-[#5E9AD3] focus:bg-white focus:ring-4 focus:ring-[#5E9AD3]/10"
                  />
                </div>

                <div className="max-h-[72vh] space-y-2 overflow-y-auto p-3">
                  {commesseFiltrate.map((commessa) => {
                    const riepilogo = getRiepilogoCommessa(commessa.id);
                    const attiva = commessaSelezionata?.id === commessa.id;

                    return (
                      <button
                        key={commessa.id}
                        type="button"
                        onClick={() => apriCommessa(commessa)}
                        className={`w-full rounded-xl border p-3 text-left transition cursor-pointer ${
                          attiva
                            ? "border-[#D79D06] bg-[#FFF8E7]"
                            : "border-gray-100 bg-white hover:bg-[#F2F2F2]/65"
                        }`}
                      >
                        <p className="text-sm font-semibold text-[#2B2F5E] leading-snug">
                          {commessa.codice
                            ? `${commessa.codice} | ${commessa.titolo}`
                            : commessa.titolo}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {commessa.cliente_nome || "Committente non indicato"}
                        </p>
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <span className="text-xs text-gray-400">
                            {riepilogo.compenso > 0
                              ? `${formattaEuro(riepilogo.compenso)}${
                                  riepilogo.anno && riepilogo.anno !== anno
                                    ? ` - ${riepilogo.anno}`
                                    : ""
                                }`
                              : "Non compilata"}
                          </span>
                          <span
                            className={`text-xs font-semibold ${
                              riepilogo.risultato < 0
                                ? "text-red-600"
                                : "text-[#2B2F5E]"
                            }`}
                          >
                            {formattaEuro(riepilogo.risultato)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </aside>

              <main className="min-w-0 space-y-5">
                {!commessaSelezionata ? (
                  <Card
                    title={
                      <span className="flex items-center gap-3">
                        <IconBadge icon="briefcase" />
                        Seleziona una commessa
                      </span>
                    }
                  >
                    <p className="text-sm text-gray-500">
                      Scegli una commessa dalla lista per compilare la scheda
                      economica.
                    </p>
                  </Card>
                ) : (
                  <>
                    <Card
                      title={
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <span className="flex items-center gap-3">
                            <IconBadge icon="euro" />
                            {commessaSelezionata.codice
                              ? `${commessaSelezionata.codice} | ${commessaSelezionata.titolo}`
                              : commessaSelezionata.titolo}
                          </span>
                          <label className="flex items-center gap-2 rounded-xl border border-[#D79D06]/30 bg-[#FFF8E7] px-3 py-2 text-xs font-semibold text-[#2B2F5E] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={fatturatoComeIngPascale}
                              onChange={(event) =>
                                setFatturatoComeIngPascale(event.target.checked)
                              }
                              className="h-4 w-4 accent-[#D79D06]"
                            />
                            Fatturato come Ing. Pascale
                          </label>
                        </div>
                      }
                    >
                      <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-4 gap-4">
                        <label className="block">
                          <span className="mb-2 block text-sm font-semibold text-[#2B2F5E]">
                            Anno fatturazione
                          </span>
                          <input
                            type="number"
                            value={annoFatturazione}
                            onChange={(event) =>
                              setAnnoFatturazione(Number(event.target.value))
                            }
                            className="w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-right outline-none focus:border-[#64B445]"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-2 block text-sm font-semibold text-[#2B2F5E]">
                            Compenso commessa
                          </span>
                          <ImportoInput value={compenso} onChange={setCompenso} />
                        </label>
                        <RiepilogoBox
                          label="Cassa 4%"
                          value={cassaCommessaNumero}
                        />
                        <RiepilogoBox
                          label="IVA 22%"
                          value={ivaCommessaNumero}
                        />
                      </div>

                      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-6 gap-4">
                        <label className="block">
                          <span className="mb-2 block text-sm font-semibold text-[#2B2F5E]">
                            Trattenuta FIDEPA %
                          </span>
                          <input
                            inputMode="decimal"
                            value={trattenutaPercentuale}
                            onChange={(event) =>
                              setTrattenutaPercentuale(event.target.value)
                            }
                            className="w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-right outline-none focus:border-[#64B445]"
                          />
                        </label>
                        <RiepilogoBox
                          label="Quota trattenuta"
                          value={quotaTrattenuta}
                        />
                        <RiepilogoBox
                          label="Residuo FIDEPA"
                          value={residuoFidepa}
                          danger={residuoFidepa < 0}
                        />
                        <RiepilogoBox label="Collaboratori" value={totaleCollaboratori} />
                        <RiepilogoBox label="Costi progetto" value={totaleCostiProgetto} />
                        <RiepilogoBox
                          label="Risultato FIDEPA"
                          value={risultato}
                          danger={risultato < 0}
                        />
                      </div>

                      <label className="mt-4 block">
                        <span className="mb-2 block text-sm font-semibold text-[#2B2F5E]">
                          Note economiche
                        </span>
                        <textarea
                          value={note}
                          onChange={(event) => setNote(event.target.value)}
                          rows={3}
                          className="w-full resize-none rounded-xl border border-gray-200 bg-[#F2F2F2]/70 px-4 py-3 text-sm text-[#2B2F5E] outline-none focus:border-[#5E9AD3] focus:bg-white focus:ring-4 focus:ring-[#5E9AD3]/10"
                          placeholder="Annotazioni interne sulla commessa..."
                        />
                      </label>
                    </Card>

                    <Card
                      title={
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <span className="flex items-center gap-3">
                            <IconBadge icon="users" />
                            Collaboratori
                          </span>
                          <span className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={aggiungiCollaboratore}
                              className="inline-flex items-center gap-2 rounded-xl bg-[#64B445] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#5AA03E] cursor-pointer"
                            >
                              <AppIcon name="plus" size={16} />
                              Personale
                            </button>
                            <button
                              type="button"
                              onClick={aggiungiCollaboratoreEsterno}
                              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#2B2F5E] shadow-sm hover:bg-[#F2F2F2] cursor-pointer"
                            >
                              <AppIcon name="plus" size={16} />
                              Esterno
                            </button>
                          </span>
                        </div>
                      }
                    >
                      {collaboratori.length === 0 ? (
                        <p className="text-sm text-gray-400">
                          Nessun collaboratore inserito.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {collaboratori.map((collaboratore, indice) => {
                            const selezionati = new Set(
                              collaboratori
                                .map((item, i) =>
                                  i === indice ? "" : item.persona_id
                                )
                                .filter(Boolean)
                            );
                            const importoCollaboratore = parseImporto(
                              collaboratore.compenso
                            );
                            const cassaCollaboratore = calcolaCassa(
                              importoCollaboratore,
                              collaboratore.calcola_cassa
                            );
                            const ivaCollaboratore = calcolaIva(
                              importoCollaboratore,
                              cassaCollaboratore,
                              collaboratore.calcola_iva
                            );

                            return (
                              <div
                                key={collaboratore.localId}
                                className="rounded-xl bg-[#F2F2F2]/70 p-3"
                              >
                                <div className="grid grid-cols-1 xl:grid-cols-[140px_minmax(0,1fr)_210px_150px_40px] gap-3">
                                  <select
                                    value={collaboratore.tipo}
                                    onChange={(event) =>
                                      aggiornaCollaboratore(
                                        indice,
                                        "tipo",
                                        event.target.value
                                      )
                                    }
                                    className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-[#2B2F5E] outline-none focus:border-[#5E9AD3]"
                                  >
                                    <option value="personale">Personale</option>
                                    <option value="esterno">Esterno</option>
                                  </select>

                                  {collaboratore.tipo === "personale" ? (
                                    <select
                                      value={collaboratore.persona_id}
                                      onChange={(event) =>
                                        aggiornaCollaboratore(
                                          indice,
                                          "persona_id",
                                          event.target.value
                                        )
                                      }
                                      className="min-w-0 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-[#2B2F5E] outline-none focus:border-[#5E9AD3]"
                                    >
                                      {personale
                                        .filter(
                                          (persona) =>
                                            !selezionati.has(persona.id) ||
                                            persona.id === collaboratore.persona_id
                                        )
                                        .map((persona) => (
                                          <option key={persona.id} value={persona.id}>
                                            {persona.nome}
                                          </option>
                                        ))}
                                    </select>
                                  ) : (
                                    <input
                                      value={collaboratore.collaboratore_esterno_nome}
                                      onChange={(event) =>
                                        aggiornaCollaboratore(
                                          indice,
                                          "collaboratore_esterno_nome",
                                          event.target.value
                                        )
                                      }
                                      placeholder="Nome collaboratore esterno"
                                      className="min-w-0 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-[#2B2F5E] outline-none focus:border-[#5E9AD3]"
                                    />
                                  )}
                                  <ImportoInput
                                    value={collaboratore.compenso}
                                    onChange={(value) =>
                                      aggiornaCompensoCollaboratore(indice, value)
                                    }
                                    compact
                                  />
                                  <div className="relative">
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400 pointer-events-none">
                                      %
                                    </span>
                                    <input
                                      inputMode="decimal"
                                      value={collaboratore.percentuale}
                                      onChange={(event) =>
                                        aggiornaPercentualeCollaboratore(
                                          indice,
                                          event.target.value
                                        )
                                      }
                                      className="w-full min-w-0 rounded-md border border-gray-300 bg-white py-2 pl-3 pr-8 text-right text-sm text-[#2B2F5E] outline-none focus:border-[#64B445]"
                                      placeholder="% residuo"
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => rimuoviCollaboratore(indice)}
                                    className="h-10 w-10 rounded-xl text-red-500 hover:bg-red-50 flex items-center justify-center cursor-pointer"
                                    aria-label="Rimuovi collaboratore"
                                  >
                                    <AppIcon name="x" size={16} />
                                  </button>
                                </div>
                                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <AccessorioAutomatico
                                    label="Cassa 4%"
                                    checked={collaboratore.calcola_cassa}
                                    value={cassaCollaboratore}
                                    onChange={(value) =>
                                      aggiornaAccessorioCollaboratore(
                                        indice,
                                        "calcola_cassa",
                                        value
                                      )
                                    }
                                  />
                                  <AccessorioAutomatico
                                    label="IVA 22%"
                                    checked={collaboratore.calcola_iva}
                                    value={ivaCollaboratore}
                                    onChange={(value) =>
                                      aggiornaAccessorioCollaboratore(
                                        indice,
                                        "calcola_iva",
                                        value
                                      )
                                    }
                                  />
                                </div>
                                <SalPagamenti
                                  importoBase={
                                    importoCollaboratore + cassaCollaboratore
                                  }
                                  sal={collaboratore.sal}
                                  onAdd={() => aggiungiSalCollaboratore(indice)}
                                  onUpdate={(salIndice, campo, valore) =>
                                    aggiornaSalCollaboratore(
                                      indice,
                                      salIndice,
                                      campo,
                                      valore
                                    )
                                  }
                                  onRemove={(salIndice) =>
                                    rimuoviSalCollaboratore(indice, salIndice)
                                  }
                                />
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </Card>

                    <Card
                      title={
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <span className="flex items-center gap-3">
                            <IconBadge icon="wallet" />
                            Costi progetto
                          </span>
                          <button
                            type="button"
                            onClick={aggiungiCostoProgetto}
                            className="inline-flex items-center gap-2 rounded-xl bg-[#64B445] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#5AA03E] cursor-pointer"
                          >
                            <AppIcon name="plus" size={16} />
                            Aggiungi
                          </button>
                        </div>
                      }
                    >
                      {costiProgetto.length === 0 ? (
                        <p className="text-sm text-gray-400">
                          Nessun costo progetto inserito.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {costiProgetto.map((costo, indice) => (
                            <div
                              key={costo.localId}
                              className="rounded-xl bg-[#F2F2F2]/70 p-3"
                            >
                              <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_180px_180px_180px_40px] gap-3">
                                <input
                                  value={costo.descrizione}
                                  onChange={(event) =>
                                    aggiornaCostoProgetto(
                                      indice,
                                      "descrizione",
                                      event.target.value
                                    )
                                  }
                                  placeholder="Es. prove di laboratorio"
                                  className="min-w-0 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-[#2B2F5E] outline-none focus:border-[#5E9AD3]"
                                />
                                <ImportoInput
                                  value={costo.importo}
                                  onChange={(value) =>
                                    aggiornaCostoProgetto(indice, "importo", value)
                                  }
                                  placeholder="Importo"
                                  compact
                                />
                                <ImportoInput
                                  value={costo.cassa}
                                  onChange={(value) =>
                                    aggiornaCostoProgetto(indice, "cassa", value)
                                  }
                                  placeholder="Cassa"
                                  compact
                                />
                                <ImportoInput
                                  value={costo.iva}
                                  onChange={(value) =>
                                    aggiornaCostoProgetto(indice, "iva", value)
                                  }
                                  placeholder="IVA"
                                  compact
                                />
                                <button
                                  type="button"
                                  onClick={() => rimuoviCostoProgetto(indice)}
                                  className="h-10 w-10 rounded-xl text-red-500 hover:bg-red-50 flex items-center justify-center cursor-pointer"
                                  aria-label="Rimuovi costo"
                                >
                                  <AppIcon name="x" size={16} />
                                </button>
                              </div>
                              <SalPagamenti
                                importoBase={
                                  parseImporto(costo.importo) +
                                  parseImporto(costo.cassa)
                                }
                                sal={costo.sal}
                                onAdd={() => aggiungiSalCosto(indice)}
                                onUpdate={(salIndice, campo, valore) =>
                                  aggiornaSalCosto(indice, salIndice, campo, valore)
                                }
                                onRemove={(salIndice) =>
                                  rimuoviSalCosto(indice, salIndice)
                                }
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>

                    <div className="flex flex-wrap justify-end gap-3">
                      {economiaId && (
                        <button
                          type="button"
                          onClick={eliminaScheda}
                          className="rounded-xl border border-red-200 bg-white px-5 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 cursor-pointer"
                        >
                          Elimina scheda
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={salvaScheda}
                        disabled={salvataggio}
                        className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-sm cursor-pointer disabled:cursor-default ${
                          salvataggio
                            ? "bg-gray-400"
                            : "bg-[#64B445] hover:bg-[#5AA03E]"
                        }`}
                      >
                        <AppIcon name="checkSquare" size={17} />
                        {salvataggio ? "Salvataggio" : "Salva scheda"}
                      </button>
                    </div>
                  </>
                )}
              </main>
            </div>
          )}
        </div>
      </EconomiaAccessGuard>
    </LayoutApp>
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

function IconBadge({
  icon,
}: {
  icon: "briefcase" | "euro" | "users" | "wallet";
}) {
  return (
    <span className="h-10 w-10 rounded-xl bg-[#5E9AD3]/12 text-[#2D80B3] flex items-center justify-center shrink-0">
      <AppIcon name={icon} size={19} />
    </span>
  );
}

function RiepilogoBox({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: number;
  danger?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-[#F2F2F2]/70 p-4">
      <p className="text-[11px] uppercase tracking-[0.12em] font-bold text-gray-400">
        {label}
      </p>
      <p
        className={`mt-2 text-lg font-semibold ${
          danger ? "text-red-600" : "text-[#2B2F5E]"
        }`}
      >
        {formattaEuro(value)}
      </p>
    </div>
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
    <label className="flex items-center justify-between gap-3 rounded-xl border border-white/80 bg-white/70 px-4 py-3 cursor-pointer">
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

function AccessorioCompatto({
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
    <label className="flex min-h-9 items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 cursor-pointer">
      <span className="flex items-center gap-2 text-xs font-semibold text-[#2B2F5E]">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="h-3.5 w-3.5 accent-[#64B445]"
        />
        {label}
      </span>
      <span className="text-xs font-semibold text-[#2B2F5E]">
        {formattaEuro(value)}
      </span>
    </label>
  );
}

function SalPagamenti({
  importoBase,
  sal,
  onAdd,
  onUpdate,
  onRemove,
}: {
  importoBase: number;
  sal: SalForm[];
  onAdd: () => void;
  onUpdate: (
    indice: number,
    campo: "importo" | "data_pagamento" | "calcola_cassa" | "calcola_iva",
    valore: string | boolean
  ) => void;
  onRemove: (indice: number) => void;
}) {
  const pagato = sal.reduce((totale, item) => {
    const importo = parseImporto(item.importo);
    return totale + importo + calcolaCassa(importo, item.calcola_cassa);
  }, 0);
  const ivaPagata = sal.reduce((totale, item) => {
    const importo = parseImporto(item.importo);
    const cassa = calcolaCassa(importo, item.calcola_cassa);
    return totale + calcolaIva(importo, cassa, item.calcola_iva);
  }, 0);
  const residuo = importoBase - pagato;

  return (
    <div className="mt-3 rounded-xl border border-white/70 bg-white/70 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-gray-400">
            SAL pagamenti
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Pagato {formattaEuro(pagato)} -{" "}
            <span className={residuo < 0 ? "font-semibold text-red-600" : ""}>
              Residuo {formattaEuro(residuo)}
            </span>{" "}
            - IVA {formattaEuro(ivaPagata)}
          </p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-[#2B2F5E] shadow-sm hover:bg-[#F2F2F2] cursor-pointer"
        >
          <AppIcon name="plus" size={14} />
          Aggiungi SAL
        </button>
      </div>

      {sal.length > 0 && (
        <div className="mt-3 space-y-2">
          {sal.map((riga, indice) => (
            <div
              key={riga.localId}
              className="grid grid-cols-1 xl:grid-cols-[160px_minmax(0,1fr)_160px_160px_36px] gap-2"
            >
              <input
                type="date"
                value={riga.data_pagamento}
                onChange={(event) =>
                  onUpdate(indice, "data_pagamento", event.target.value)
                }
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-[#2B2F5E] outline-none focus:border-[#5E9AD3]"
              />
              <ImportoInput
                value={riga.importo}
                onChange={(value) => onUpdate(indice, "importo", value)}
                compact
                placeholder="Importo pagato"
              />
              <AccessorioCompatto
                label="Cassa"
                checked={riga.calcola_cassa}
                value={calcolaCassa(parseImporto(riga.importo), riga.calcola_cassa)}
                onChange={(value) => onUpdate(indice, "calcola_cassa", value)}
              />
              <AccessorioCompatto
                label="IVA"
                checked={riga.calcola_iva}
                value={calcolaIva(
                  parseImporto(riga.importo),
                  calcolaCassa(parseImporto(riga.importo), riga.calcola_cassa),
                  riga.calcola_iva
                )}
                onChange={(value) => onUpdate(indice, "calcola_iva", value)}
              />
              <button
                type="button"
                onClick={() => onRemove(indice)}
                className="h-9 w-9 rounded-xl text-red-500 hover:bg-red-50 flex items-center justify-center cursor-pointer"
                aria-label="Rimuovi SAL"
              >
                <AppIcon name="x" size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
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
