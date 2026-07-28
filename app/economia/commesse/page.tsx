"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AppIcon from "@/components/AppIcon";
import EconomiaAccessGuard from "@/components/EconomiaAccessGuard";
import LayoutApp from "@/components/LayoutApp";
import EconomicDashboard from "@/components/economia/EconomicDashboard";
import {
  CollaboratorsCostsSection,
  OverviewSection,
  ReceiptsSection,
} from "@/components/economia/EconomicSections";
import { EconomicCard, EmptyState } from "@/components/economia/EconomicCommon";
import {
  aggiornaAllegatoMovimento,
  annullaDocumentoCollaboratore,
  annullaMovimento,
  archiviaCollaboratore,
  archiviaCostoProgetto,
  caricaIndiceEconomia,
  caricaOpzioniEconomia,
  caricaWorkspaceEconomico,
  eliminaVariazione,
  salvaCollaboratore,
  salvaCostoProgetto,
  salvaDocumentoCollaboratore,
  salvaMovimento,
  salvaSchedaEconomica,
  salvaVariazione,
  sostituisciAllocazioniMovimento,
} from "@/lib/economia-commesse/api";
import {
  calcolaRiepilogoEconomico,
} from "@/lib/economia-commesse/calcoli";
import { formattaEuro, parseImporto } from "@/lib/importi";
import type {
  CommessaEconomica,
  PersonaEconomica,
  PreventivoEconomico,
  ProfiloFiscale,
  RiepilogoEconomico,
  SchedaEconomica,
  SoggettoFiscale,
  WorkspaceEconomico,
} from "@/lib/economia-commesse/types";

type TabId = "quadro" | "documenti" | "collaboratori" | "riepilogo";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "quadro", label: "Quadro economico" },
  { id: "collaboratori", label: "Collaboratori e costi" },
  { id: "documenti", label: "Incassi" },
  { id: "riepilogo", label: "Riepilogo" },
];

const WORKSPACE_VUOTO: WorkspaceEconomico = {
  variazioni: [],
  documentiAttivi: [],
  righeDocumentiAttivi: [],
  collaboratori: [],
  documentiCollaboratori: [],
  movimenti: [],
  allocazioni: [],
  anomalie: [],
  costiProgetto: [],
};

const collator = new Intl.Collator("it", { numeric: true, sensitivity: "base" });

function ordinaCommesse(a: CommessaEconomica, b: CommessaEconomica) {
  if (a.codice && !b.codice) return -1;
  if (!a.codice && b.codice) return 1;
  return collator.compare(b.codice || a.titolo, a.codice || b.titolo);
}

function schedaVuota(commessaId: string, anno: number): SchedaEconomica {
  return {
    id: "",
    commessa_id: commessaId,
    anno,
    compenso: 0,
    compenso_iniziale: 0,
    preventivo_numero: null,
    rimborso_spese: 0,
    trattenuta_percentuale: 0,
    trattenuta_fisso_percentuale: 0,
    trattenuta_operativo_percentuale: 0,
    cassa: 0,
    iva: 0,
    fatturato_come_ing_pascale: false,
    soggetto_fiscale_id: null,
    note: null,
    created_at: new Date().toISOString(),
    updated_at: null,
    deleted_at: null,
  };
}

function riepilogoVuoto(): RiepilogoEconomico {
  return {
    valoreIniziale: 0,
    variazioniAumento: 0,
    variazioniDiminuzione: 0,
    variazioniNette: 0,
    rimborsiPrevisti: 0,
    valoreAggiornato: 0,
    costiPrevisti: 0,
    costiPagati: 0,
    costiDaPagare: 0,
    marginePrevisto: 0,
    margineAttuale: 0,
    ricaviDocumentati: 0,
    costiDocumentati: 0,
    residuoDaFatturare: 0,
    fattureDaIncassare: 0,
    documentiCollaboratoriDaRicevere: 0,
    documentiCollaboratoriDaPagare: 0,
    margineDocumentato: 0,
    incassiTotali: 0,
    daIncassare: 0,
    pagamentiTotali: 0,
    incassiRiconciliati: 0,
    incassiDaDocumentare: 0,
    pagamentiRiconciliati: 0,
    pagamentiDaDocumentare: 0,
    pagatoCollaboratori: 0,
    cassaIncassata: 0,
    cassaPagata: 0,
    cassaDaVersare: 0,
    ivaIncassata: 0,
    ivaPagata: 0,
    ivaDaVersare: 0,
    saldoFinanziario: 0,
  };
}

export default function EconomiaCommessePage() {
  const anno = new Date().getFullYear();
  const [commesse, setCommesse] = useState<CommessaEconomica[]>([]);
  const [schede, setSchede] = useState<SchedaEconomica[]>([]);
  const [personale, setPersonale] = useState<PersonaEconomica[]>([]);
  const [soggetti, setSoggetti] = useState<SoggettoFiscale[]>([]);
  const [profili, setProfili] = useState<ProfiloFiscale[]>([]);
  const [preventivi, setPreventivi] = useState<PreventivoEconomico[]>([]);
  const [commessa, setCommessa] = useState<CommessaEconomica | null>(null);
  const [scheda, setScheda] = useState<SchedaEconomica | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceEconomico>(WORKSPACE_VUOTO);
  const [tab, setTab] = useState<TabId>("quadro");
  const [ricerca, setRicerca] = useState("");
  const [caricamento, setCaricamento] = useState(true);
  const [caricamentoWorkspace, setCaricamentoWorkspace] = useState(false);
  const [errore, setErrore] = useState("");
  const [toast, setToast] = useState("");

  const mostraToast = useCallback((messaggio: string) => {
    setToast(messaggio);
    window.setTimeout(() => setToast(""), 3200);
  }, []);

  const caricaWorkspace = useCallback(async (schedaId: string) => {
    setCaricamentoWorkspace(true);
    try {
      setWorkspace(await caricaWorkspaceEconomico(schedaId));
    } finally {
      setCaricamentoWorkspace(false);
    }
  }, []);

  const selezionaCommessa = useCallback(
    async (
      prossima: CommessaEconomica,
      schedeDisponibili: SchedaEconomica[] = schede
    ) => {
      setCommessa(prossima);
      const prossimaScheda =
        schedeDisponibili.find((item) => item.commessa_id === prossima.id) || null;
      setScheda(prossimaScheda);
      setTab("quadro");
      if (prossimaScheda) {
        try {
          await caricaWorkspace(prossimaScheda.id);
        } catch (error) {
          setErrore(error instanceof Error ? error.message : "Caricamento non riuscito.");
        }
      } else {
        setWorkspace(WORKSPACE_VUOTO);
      }
    },
    [caricaWorkspace, schede]
  );

  const caricaPagina = useCallback(
    async (commessaId?: string) => {
      setCaricamento(true);
      setErrore("");
      try {
        const [indice, opzioni] = await Promise.all([
          caricaIndiceEconomia(anno),
          caricaOpzioniEconomia(),
        ]);
        const ordinate = [...indice.commesse].sort(ordinaCommesse);
        setCommesse(ordinate);
        setSchede(indice.schede);
        setPersonale(opzioni.personale);
        setSoggetti(opzioni.soggetti);
        setProfili(opzioni.profili);
        setPreventivi(opzioni.preventivi);
        const prossima =
          ordinate.find((item) => item.id === (commessaId || commessa?.id)) ||
          ordinate[0] ||
          null;
        if (prossima) await selezionaCommessa(prossima, indice.schede);
        else {
          setCommessa(null);
          setScheda(null);
          setWorkspace(WORKSPACE_VUOTO);
        }
      } catch (error) {
        setErrore(error instanceof Error ? error.message : "Caricamento non riuscito.");
      } finally {
        setCaricamento(false);
      }
    },
    [anno, commessa?.id, selezionaCommessa]
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void caricaPagina(), 0);
    return () => window.clearTimeout(timeoutId);
    // La pagina usa automaticamente l'anno corrente.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anno]);

  async function ricaricaWorkspace(messaggio?: string) {
    if (!scheda?.id) return;
    await caricaWorkspace(scheda.id);
    if (messaggio) mostraToast(messaggio);
  }

  const riepilogo = useMemo(() => {
    if (!commessa) return riepilogoVuoto();
    return calcolaRiepilogoEconomico({
      scheda: scheda || schedaVuota(commessa.id, anno),
      ...workspace,
    });
  }, [anno, commessa, scheda, workspace]);

  const schedePerCommessa = useMemo(
    () => new Map(schede.map((item) => [item.commessa_id, item])),
    [schede]
  );
  const commesseFiltrate = commesse.filter((item) =>
    `${item.codice || ""} ${item.titolo} ${item.cliente_nome || ""}`
      .toLowerCase()
      .includes(ricerca.trim().toLowerCase())
  );

  async function salvaQuadro(value: {
    id?: string;
    compenso_iniziale: number;
    preventivo_numero: string | null;
    soggetto_fiscale_id: string | null;
  }) {
    if (!commessa) return;
    const nuovaScheda = await salvaSchedaEconomica({
      ...value,
      commessa_id: commessa.id,
      anno,
      compenso_legacy: value.compenso_iniziale + riepilogo.variazioniNette,
      rimborso_spese: 0,
      trattenuta_fisso_percentuale: parseImporto(
        scheda?.trattenuta_fisso_percentuale ?? scheda?.trattenuta_percentuale
      ),
      trattenuta_operativo_percentuale: parseImporto(
        scheda?.trattenuta_operativo_percentuale
      ),
      note: scheda?.note || null,
    });
    setScheda(nuovaScheda);
    setSchede((correnti) => [
      ...correnti.filter((item) => item.id !== nuovaScheda.id),
      nuovaScheda,
    ]);
    await caricaWorkspace(nuovaScheda.id);
    mostraToast("Quadro economico salvato.");
  }

  async function salvaTrattenuta(percentuali: {
    fisso: number;
    operativo: number;
  }) {
    if (!commessa || !scheda) return;
    const imponibileNormalizzato =
      parseImporto(scheda.compenso_iniziale ?? scheda.compenso) +
      parseImporto(scheda.rimborso_spese);
    const nuovaScheda = await salvaSchedaEconomica({
      id: scheda.id,
      commessa_id: commessa.id,
      anno: scheda.anno,
      compenso_iniziale: imponibileNormalizzato,
      compenso_legacy: imponibileNormalizzato + riepilogo.variazioniNette,
      preventivo_numero: scheda.preventivo_numero,
      rimborso_spese: 0,
      trattenuta_fisso_percentuale: percentuali.fisso,
      trattenuta_operativo_percentuale: percentuali.operativo,
      soggetto_fiscale_id: scheda.soggetto_fiscale_id,
      note: scheda.note,
    });
    setScheda(nuovaScheda);
    setSchede((correnti) => [
      ...correnti.filter((item) => item.id !== nuovaScheda.id),
      nuovaScheda,
    ]);
    mostraToast("Trattenuta FIDEPA salvata.");
  }

  async function salvaVariazioneERicarica(
    value: Parameters<typeof salvaVariazione>[0]
  ) {
    await salvaVariazione(value);
    await ricaricaWorkspace("Variazione salvata.");
  }

  async function eliminaVariazioneERicarica(id: string) {
    await eliminaVariazione(id);
    await ricaricaWorkspace("Variazione archiviata.");
  }

  async function salvaCollaboratoreERicarica(
    value: Parameters<typeof salvaCollaboratore>[0]
  ) {
    await salvaCollaboratore(value);
    await ricaricaWorkspace("Collaboratore salvato.");
  }

  async function salvaPagamentoCollaboratore(
    documento: Parameters<typeof salvaDocumentoCollaboratore>[0],
    movimento: Parameters<typeof salvaMovimento>[0]
  ) {
    const documentoSalvato = await salvaDocumentoCollaboratore(documento);
    const movimentoSalvato = await salvaMovimento(movimento);
    await sostituisciAllocazioniMovimento(movimentoSalvato, [
      {
        documento_attivo_id: null,
        documento_collaboratore_id: documentoSalvato.id,
        importo: parseImporto(movimentoSalvato.importo),
        consenti_eccedenza: false,
      },
    ]);
    await ricaricaWorkspace("Pagamento collaboratore registrato.");
  }

  async function salvaIncassoERicarica(
    value: Parameters<typeof salvaMovimento>[0]
  ) {
    await salvaMovimento(value);
    await ricaricaWorkspace("Incasso salvato.");
  }

  async function allegaDocumentoIncasso(
    movimentoId: string,
    nome: string,
    percorso: string
  ) {
    await aggiornaAllegatoMovimento(movimentoId, nome, percorso);
    await ricaricaWorkspace("Documento allegato all’incasso.");
  }

  async function eliminaIncasso(id: string) {
    await annullaMovimento(id);
    await ricaricaWorkspace("Incasso eliminato.");
  }

  async function annullaPagamentoCollaboratore(
    movimentoId: string,
    documentoId: string | null
  ) {
    await annullaMovimento(movimentoId);
    if (documentoId) await annullaDocumentoCollaboratore(documentoId);
    await ricaricaWorkspace("Pagamento collaboratore annullato.");
  }

  async function archiviaCollaboratoreERicarica(id: string) {
    await archiviaCollaboratore(id);
    await ricaricaWorkspace("Collaboratore archiviato.");
  }

  async function salvaCostoERicarica(value: Parameters<typeof salvaCostoProgetto>[0]) {
    await salvaCostoProgetto(value);
    await ricaricaWorkspace("Costo previsto salvato.");
  }

  async function archiviaCostoERicarica(id: string) {
    await archiviaCostoProgetto(id);
    await ricaricaWorkspace("Costo archiviato.");
  }

  return (
    <LayoutApp>
      <EconomiaAccessGuard>
        <div className="space-y-5">
          <div>
            <div>
              <h2 className="page-title">Economia commesse</h2>
              <p className="mt-1 text-[15px] text-[#D79D06]">
                Quadro economico, collaboratori, incassi e riepilogo
              </p>
            </div>
          </div>

          {errore ? (
            <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-[#2B2F5E]">
                Struttura economica non disponibile
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Esegui la migrazione <strong>supabase-economia-commesse-documentale.sql</strong> nel SQL Editor di Supabase.
              </p>
              <p className="mt-3 text-xs text-red-600">{errore}</p>
            </div>
          ) : caricamento ? (
            <div className="flex min-h-[45vh] items-center justify-center text-gray-500">
              Caricamento gestione economica...
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 2xl:grid-cols-[330px_minmax(0,1fr)]">
              <aside className="self-start overflow-hidden rounded-2xl border border-white bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)] 2xl:sticky 2xl:top-24">
                <div className="border-b border-gray-100 p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5E9AD3]/12 text-[#2D80B3]">
                      <AppIcon name="briefcase" size={19} />
                    </span>
                    <div>
                      <h3 className="font-semibold text-[#2B2F5E]">Commesse</h3>
                      <p className="text-xs text-gray-500">{commesse.length} disponibili</p>
                    </div>
                  </div>
                  <div className="relative mt-4">
                    <AppIcon name="search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input value={ricerca} onChange={(event) => setRicerca(event.target.value)} placeholder="Cerca commessa..." aria-label="Cerca commessa" className="w-full rounded-xl border border-gray-200 bg-[#F2F2F2]/70 py-3 pl-9 pr-3 text-sm text-[#2B2F5E] outline-none focus:border-[#5E9AD3] focus:bg-white" />
                  </div>
                </div>
                <div className="max-h-[72vh] space-y-2 overflow-y-auto p-3">
                  {commesseFiltrate.map((item) => {
                    const economica = schedePerCommessa.get(item.id);
                    const attiva = commessa?.id === item.id;
                    const valore = parseImporto(economica?.compenso_iniziale || economica?.compenso) + parseImporto(economica?.rimborso_spese);
                    return (
                      <button key={item.id} type="button" onClick={() => void selezionaCommessa(item)} className={`w-full rounded-xl border p-3 text-left transition cursor-pointer ${attiva ? "border-[#D79D06] bg-[#FFF8E7]" : "border-gray-100 bg-white hover:bg-[#F2F2F2]/65"}`}>
                        <p className="text-sm font-semibold leading-snug text-[#2B2F5E]">{item.codice ? `${item.codice} | ${item.titolo}` : item.titolo}</p>
                        <p className="mt-1 text-xs text-gray-500">{item.cliente_nome || "Committente non indicato"}</p>
                        <p className="mt-3 text-xs font-semibold text-[#2B2F5E]">{economica ? formattaEuro(valore) : "Quadro da configurare"}</p>
                      </button>
                    );
                  })}
                </div>
              </aside>

              <main className="min-w-0 space-y-5">
                {!commessa ? (
                  <EconomicCard title="Seleziona una commessa"><EmptyState>Scegli una commessa dalla lista.</EmptyState></EconomicCard>
                ) : (
                  <>
                    <div className="overflow-x-auto rounded-2xl border border-white bg-white p-2 shadow-[0_8px_24px_rgba(15,23,42,0.06)]" role="tablist" aria-label="Sezioni gestione economica">
                      <div className="flex min-w-max gap-1">{TABS.map((item) => <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} onClick={() => setTab(item.id)} className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition cursor-pointer ${tab === item.id ? "bg-[#2B2F5E] text-white" : "text-[#2B2F5E] hover:bg-[#F2F2F2]"}`}>{item.label}</button>)}</div>
                    </div>

                    {caricamentoWorkspace ? <div className="rounded-2xl bg-white p-8 text-center text-sm text-gray-500">Aggiornamento dati...</div> : (
                      <div role="tabpanel">
                        {tab === "quadro" ? <OverviewSection key={scheda?.id || `nuova-${commessa.id}`} scheda={scheda} preventivi={preventivi} soggetti={soggetti} variazioni={workspace.variazioni} documenti={workspace.documentiAttivi} riepilogo={riepilogo} onSaveSummary={salvaQuadro} onSaveVariation={salvaVariazioneERicarica} onDeleteVariation={eliminaVariazioneERicarica} /> : null}
                        {!scheda && tab !== "quadro" ? <EconomicCard title="Quadro economico da inizializzare"><EmptyState>Configura e salva prima il quadro economico della commessa.</EmptyState></EconomicCard> : null}
                        {scheda && tab === "documenti" ? <ReceiptsSection scheda={scheda} commessa={commessa} movimenti={workspace.movimenti} onSaveReceipt={salvaIncassoERicarica} onAttachReceipt={allegaDocumentoIncasso} onDeleteReceipt={eliminaIncasso} /> : null}
                        {scheda && tab === "collaboratori" ? <CollaboratorsCostsSection key={scheda.id} scheda={scheda} personale={personale} profili={profili} collaboratori={workspace.collaboratori} documentiCollaboratori={workspace.documentiCollaboratori} movimenti={workspace.movimenti} allocazioni={workspace.allocazioni} costi={workspace.costiProgetto} valoreCommessa={riepilogo.valoreAggiornato} onSaveRetention={salvaTrattenuta} onSaveCollaborator={salvaCollaboratoreERicarica} onArchiveCollaborator={archiviaCollaboratoreERicarica} onSavePayment={salvaPagamentoCollaboratore} onCancelPayment={annullaPagamentoCollaboratore} onSaveCost={salvaCostoERicarica} onArchiveCost={archiviaCostoERicarica} /> : null}
                        {scheda && tab === "riepilogo" ? <EconomicDashboard riepilogo={riepilogo} /> : null}
                      </div>
                    )}
                  </>
                )}
              </main>
            </div>
          )}
        </div>

        {toast ? <div role="status" className="fixed bottom-5 left-1/2 z-[90] -translate-x-1/2 rounded-xl bg-[#2B2F5E] px-4 py-3 text-sm font-semibold text-white shadow-xl">{toast}</div> : null}

      </EconomiaAccessGuard>
    </LayoutApp>
  );
}
