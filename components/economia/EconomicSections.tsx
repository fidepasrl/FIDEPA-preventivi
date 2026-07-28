"use client";

import { useMemo, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import AppIcon from "@/components/AppIcon";
import ImportoInput from "@/components/ImportoInput";
import PreventivoPDF from "@/components/pdf/PreventivoPDF";
import { finalizzaInputImporto, formattaEuro, parseImporto } from "@/lib/importi";
import {
  calcolaQuoteTrattenutaFidepa,
  sommaImporti,
} from "@/lib/economia-commesse/calcoli";
import type {
  AllocazioneMovimento,
  AnomaliaEconomica,
  CollaboratoreAssegnato,
  CommessaEconomica,
  CostoProgettoLegacy,
  DocumentoAttivo,
  DocumentoCollaboratore,
  MovimentoFinanziario,
  PersonaEconomica,
  ProfessionistaEconomico,
  PreventivoEconomico,
  ProfiloFiscale,
  RiepilogoEconomico,
  SchedaEconomica,
  SoggettoFiscale,
  StatoAnomalia,
  VariazioneEconomica,
} from "@/lib/economia-commesse/types";
import { creaUrlAllegatoEconomico } from "@/lib/economia-commesse/api";
import {
  CollaboratorModal,
  CollaboratorPaymentModal,
  MovementModal,
  ProjectCostModal,
  ReceiptAttachmentModal,
  ReceiptModal,
  ReconciliationModal,
  VariationModal,
} from "./EconomicForms";
import {
  EconomicCard,
  EmptyState,
  Field,
  FormError,
  Modal,
  PrimaryButton,
  SecondaryButton,
  StatusBadge,
  inputClass,
} from "./EconomicCommon";

function dataIt(value: string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("it-IT").format(new Date(`${value}T00:00:00`));
}

async function apriAllegato(percorso: string) {
  try {
    const url = await creaUrlAllegatoEconomico(percorso);
    window.open(url, "_blank", "noopener,noreferrer");
  } catch (error) {
    window.alert(error instanceof Error ? error.message : "Impossibile aprire l’allegato.");
  }
}

function nomeCollaboratore(
  item: CollaboratoreAssegnato,
  personale: PersonaEconomica[],
  professionisti: ProfessionistaEconomico[] = []
) {
  const professionista = professionisti.find(
    (voce) => voce.id === item.professionista_id
  );
  return item.tipo === "personale"
    ? personale.find((persona) => persona.id === item.persona_id)?.nome || "Personale interno"
    : professionista
      ? `${professionista.cognome || ""} ${professionista.nome || ""}`.trim()
      : item.collaboratore_esterno_nome || "Collaboratore esterno";
}

function importoAllocato(movimentoId: string, allocazioni: AllocazioneMovimento[]) {
  return sommaImporti(
    allocazioni
      .filter((item) => item.movimento_id === movimentoId && !item.deleted_at)
      .map((item) => item.importo)
  );
}

export function OverviewSection({
  scheda,
  preventivi,
  soggetti,
  variazioni,
  documenti,
  riepilogo,
  onSaveSummary,
  onSaveVariation,
  onDeleteVariation,
}: {
  scheda: SchedaEconomica | null;
  preventivi: PreventivoEconomico[];
  soggetti: SoggettoFiscale[];
  variazioni: VariazioneEconomica[];
  documenti: DocumentoAttivo[];
  riepilogo: RiepilogoEconomico;
  onSaveSummary: (value: {
    id?: string;
    compenso_iniziale: number;
    preventivo_numero: string | null;
    soggetto_fiscale_id: string | null;
  }) => Promise<void>;
  onSaveVariation: Parameters<typeof VariationModal>[0]["onSave"];
  onDeleteVariation: (id: string) => Promise<void>;
}) {
  const [preventivoNumero, setPreventivoNumero] = useState(scheda?.preventivo_numero || "");
  const [inModifica, setInModifica] = useState(!scheda);
  const preventivo = preventivi.find((item) => item.numero === preventivoNumero);
  const imponibileSalvato = parseImporto(scheda?.compenso_iniziale) + parseImporto(scheda?.rimborso_spese);
  const [imponibile, setImponibile] = useState(finalizzaInputImporto(imponibileSalvato || ""));
  const imponibileNumero = parseImporto(imponibile);
  const [soggettoId, setSoggettoId] = useState(scheda?.soggetto_fiscale_id || soggetti[0]?.id || "");
  const [variazioneAperta, setVariazioneAperta] = useState<VariazioneEconomica | "nuova" | null>(null);
  const [errore, setErrore] = useState("");
  const [salvataggio, setSalvataggio] = useState(false);
  const campiModificabili = !scheda || inModifica;
  const valoreAggiornatoAnteprima = imponibileNumero + riepilogo.variazioniNette;

  function cambiaPreventivo(numero: string) {
    setPreventivoNumero(numero);
    const selezionato = preventivi.find((item) => item.numero === numero);
    if (selezionato) setImponibile(finalizzaInputImporto(selezionato.imponibile));
    setErrore("");
  }

  async function visualizzaPreventivo() {
    if (!preventivo) {
      setErrore("Seleziona un preventivo da visualizzare.");
      return;
    }
    const finestra = window.open("", "_blank");
    try {
      const blob = await pdf(
        <PreventivoPDF
          cliente={{ cliente: preventivo.cliente, oggetto: preventivo.oggetto }}
          lavorazioni={preventivo.lavorazioni || []}
          imponibile={parseImporto(preventivo.imponibile)}
          cassa={parseImporto(preventivo.cassa)}
          iva={parseImporto(preventivo.iva)}
          sconto={parseImporto(preventivo.sconto)}
          totale={parseImporto(preventivo.totale)}
          numeroPreventivo={preventivo.numero}
          pagamento={preventivo.pagamento || undefined}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      if (finestra) finestra.location.href = url;
      else window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      finestra?.close();
      setErrore(error instanceof Error ? error.message : "Impossibile visualizzare il preventivo.");
    }
  }

  function annullaModifica() {
    setPreventivoNumero(scheda?.preventivo_numero || "");
    setImponibile(finalizzaInputImporto(imponibileSalvato));
    setSoggettoId(scheda?.soggetto_fiscale_id || soggetti[0]?.id || "");
    setErrore("");
    setInModifica(false);
  }

  async function salva() {
    if (imponibileNumero <= 0) {
      setErrore("Indica un imponibile valido per creare il quadro economico.");
      return;
    }
    setSalvataggio(true);
    setErrore("");
    try {
      await onSaveSummary({
        id: scheda?.id,
        compenso_iniziale: imponibileNumero,
        preventivo_numero: preventivoNumero || null,
        soggetto_fiscale_id: soggettoId || null,
      });
      setInModifica(false);
    } catch (error) {
      setErrore(error instanceof Error ? error.message : "Salvataggio non riuscito.");
    } finally {
      setSalvataggio(false);
    }
  }

  return (
    <div className="space-y-5">
      <EconomicCard
        title="Quadro contrattuale"
        subtitle="Associa facoltativamente un preventivo, indica l’imponibile e registra separatamente le variazioni economiche."
        actions={scheda && !inModifica ? (
          <SecondaryButton onClick={() => { setErrore(""); setInModifica(true); }} icon="settings">Modifica quadro</SecondaryButton>
        ) : (
          <div className="flex flex-wrap gap-2">
            {scheda ? <SecondaryButton onClick={annullaModifica} disabled={salvataggio}>Annulla</SecondaryButton> : null}
            <PrimaryButton onClick={salva} disabled={salvataggio} icon="checkSquare">{salvataggio ? "Salvataggio..." : scheda ? "Salva modifiche" : "Crea quadro"}</PrimaryButton>
          </div>
        )}
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Field label="Soggetto fiscale emittente"><select value={soggettoId} onChange={(e) => setSoggettoId(e.target.value)} disabled={!campiModificabili} className={`${inputClass} disabled:cursor-not-allowed disabled:bg-[#F2F2F2] disabled:text-gray-500`}><option value="">Seleziona soggetto</option>{soggetti.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></Field>
            <div className="min-w-0">
              <label htmlFor="preventivo-approvato" className="mb-1.5 block text-xs font-semibold text-[#2B2F5E]">Preventivo approvato <span className="font-normal text-gray-400">(facoltativo)</span></label>
            <div className="flex gap-2">
              <select id="preventivo-approvato" value={preventivoNumero} onChange={(e) => cambiaPreventivo(e.target.value)} disabled={!campiModificabili} className={`${inputClass} min-w-0 flex-1 disabled:cursor-not-allowed disabled:bg-[#F2F2F2] disabled:text-gray-500`}>
                <option value="">Seleziona preventivo</option>
                {preventivi.map((item) => <option key={item.numero} value={item.numero}>{item.numero} · {item.cliente || "Cliente"}</option>)}
              </select>
              <button type="button" onClick={() => void visualizzaPreventivo()} disabled={!preventivoNumero} aria-label="Visualizza preventivo" title="Visualizza preventivo" className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-[#2B2F5E] shadow-sm transition hover:bg-[#F2F2F2] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"><AppIcon name="eye" size={18} /></button>
            </div>
              <p className="mt-1 text-[11px] text-gray-400">{scheda && !inModifica ? "Premi Modifica quadro per cambiare il preventivo associato." : "Se selezionato, compila automaticamente l’imponibile; altrimenti inseriscilo manualmente."}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Field label="Imponibile da preventivo" hint="Compilato automaticamente e modificabile quando il quadro è in modifica."><ImportoInput value={imponibile} onChange={setImponibile} disabled={!campiModificabili} /></Field>
            <div className="rounded-xl bg-[#EAF6E5] px-4 py-3"><p className="text-[10px] font-bold uppercase tracking-wide text-[#4D9635]">Valore aggiornato</p><p className="mt-2 text-lg font-semibold text-[#2B2F5E]">{formattaEuro(valoreAggiornatoAnteprima)}</p></div>
          </div>
        </div>
        <FormError message={errore} />
      </EconomicCard>

      <EconomicCard
        title="Storico variazioni"
        subtitle="Aumenti e diminuzioni modificano il valore aggiornato senza alterare il preventivo originario."
        actions={<PrimaryButton onClick={() => setVariazioneAperta("nuova")}>Aggiungi variazione</PrimaryButton>}
      >
        {!scheda ? (
          <EmptyState>Salva prima il quadro contrattuale per registrare le variazioni.</EmptyState>
        ) : variazioni.length === 0 ? (
          <EmptyState>Non sono ancora presenti variazioni economiche.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead><tr className="border-b border-gray-100 text-[11px] uppercase tracking-wide text-gray-400"><th className="px-3 py-2">Data</th><th className="px-3 py-2">Descrizione</th><th className="px-3 py-2">Documento</th><th className="px-3 py-2 text-right">Importo</th><th className="px-3 py-2 text-right">Azioni</th></tr></thead>
              <tbody>{variazioni.map((item) => { const doc = documenti.find((documento) => documento.id === item.documento_attivo_id); return <tr key={item.id} className="border-b border-gray-50"><td className="px-3 py-3">{dataIt(item.data_variazione)}</td><td className="px-3 py-3 font-medium text-[#2B2F5E]">{item.descrizione}</td><td className="px-3 py-3 text-gray-500">{doc?.numero || (item.documento_attivo_id ? "Documento collegato" : "Da documentare")}</td><td className={`px-3 py-3 text-right font-semibold ${item.tipologia === "diminuzione" ? "text-red-600" : "text-[#4D9635]"}`}>{item.tipologia === "diminuzione" ? "−" : "+"}{formattaEuro(item.importo)}</td><td className="px-3 py-3"><div className="flex justify-end gap-1"><button type="button" onClick={() => setVariazioneAperta(item)} className="rounded-lg px-2 py-1 text-xs font-semibold text-[#2D80B3] hover:bg-[#E8F2FA] cursor-pointer">Modifica</button><button type="button" onClick={async () => { if (window.confirm("Archiviare questa variazione?")) await onDeleteVariation(item.id); }} className="rounded-lg px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 cursor-pointer">Archivia</button></div></td></tr>; })}</tbody>
            </table>
          </div>
        )}
      </EconomicCard>

      {variazioneAperta && scheda ? <VariationModal economiaId={scheda.id} documenti={documenti} variazione={variazioneAperta === "nuova" ? null : variazioneAperta} onClose={() => setVariazioneAperta(null)} onSave={onSaveVariation} /> : null}
    </div>
  );
}

export function ReceiptsSection({
  scheda,
  commessa,
  movimenti,
  onSaveReceipt,
  onAttachReceipt,
  onDeleteReceipt,
}: {
  scheda: SchedaEconomica;
  commessa: CommessaEconomica;
  movimenti: MovimentoFinanziario[];
  onSaveReceipt: Parameters<typeof ReceiptModal>[0]["onSave"];
  onAttachReceipt: (movimentoId: string, nome: string, percorso: string) => Promise<void>;
  onDeleteReceipt: (id: string) => Promise<void>;
}) {
  const [incassoAperto, setIncassoAperto] = useState<MovimentoFinanziario | "nuovo" | null>(null);
  const [allegatoAperto, setAllegatoAperto] = useState<MovimentoFinanziario | null>(null);
  const incassi = movimenti.filter(
    (item) => item.direzione === "entrata" && item.stato_riconciliazione !== "annullato"
  );

  return (
    <div>
      <EconomicCard
        title="Incassi"
        subtitle="Registra i pagamenti ricevuti e allega eventuali ricevute o documenti comprovanti."
        actions={<PrimaryButton onClick={() => setIncassoAperto("nuovo")} icon="euro">Registra incasso</PrimaryButton>}
      >
        {incassi.length === 0 ? (
          <EmptyState>Nessun incasso registrato.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-[11px] uppercase tracking-wide text-gray-400">
                  <th className="px-3 py-2">Data</th>
                  <th className="px-3 py-2">Modalità</th>
                  <th className="px-3 py-2 text-right">Imponibile</th>
                  <th className="px-3 py-2 text-right">Cassa</th>
                  <th className="px-3 py-2 text-right">IVA</th>
                  <th className="px-3 py-2 text-right">Totale</th>
                  <th className="px-3 py-2">Documento</th>
                  <th className="px-3 py-2 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {incassi.map((item) => {
                  const contanti = item.modalita === "contanti";
                  return (
                    <tr key={item.id} className="border-b border-gray-50">
                      <td className="px-3 py-3 font-medium text-[#2B2F5E]">{dataIt(item.data_movimento)}</td>
                      <td className="px-3 py-3"><StatusBadge value={contanti ? "contanti" : "elettronico"} /></td>
                      <td className="px-3 py-3 text-right">{formattaEuro(item.imponibile ?? item.importo)}</td>
                      <td className="px-3 py-3 text-right">{formattaEuro(item.cassa || 0)}</td>
                      <td className="px-3 py-3 text-right">{formattaEuro(item.iva || 0)}</td>
                      <td className="px-3 py-3 text-right font-semibold text-[#2B2F5E]">{formattaEuro(item.importo)}</td>
                      <td className="max-w-[180px] px-3 py-3">
                        {item.allegato_url ? (
                          <button type="button" onClick={() => void apriAllegato(item.allegato_url!)} className="max-w-full truncate text-left text-xs font-semibold text-[#2D80B3] hover:underline cursor-pointer" title={item.allegato_nome || "Apri documento"}>
                            {item.allegato_nome || "Apri documento"}
                          </button>
                        ) : <span className="text-xs text-gray-400">Nessun documento</span>}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap justify-end gap-1">
                          <button type="button" onClick={() => setIncassoAperto(item)} className="rounded-lg px-2 py-1 text-xs font-semibold text-[#2D80B3] hover:bg-[#E8F2FA] cursor-pointer">Modifica</button>
                          <button type="button" onClick={() => setAllegatoAperto(item)} className="rounded-lg px-2 py-1 text-xs font-semibold text-[#4D9635] hover:bg-[#EAF6E5] cursor-pointer">Allega documento</button>
                          <button type="button" onClick={async () => { if (window.confirm("Eliminare questo incasso?")) await onDeleteReceipt(item.id); }} className="rounded-lg px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 cursor-pointer">Elimina</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </EconomicCard>

      {incassoAperto ? (
        <ReceiptModal
          economiaId={scheda.id}
          commessa={commessa}
          movimento={incassoAperto === "nuovo" ? null : incassoAperto}
          onClose={() => setIncassoAperto(null)}
          onSave={onSaveReceipt}
        />
      ) : null}
      {allegatoAperto ? (
        <ReceiptAttachmentModal
          economiaId={scheda.id}
          movimento={allegatoAperto}
          onClose={() => setAllegatoAperto(null)}
          onSave={(nome, percorso) => onAttachReceipt(allegatoAperto.id, nome, percorso)}
        />
      ) : null}
    </div>
  );
}

export function CollaboratorsCostsSection({
  scheda,
  personale,
  professionisti,
  profili,
  collaboratori,
  documentiCollaboratori,
  movimenti,
  allocazioni,
  costi,
  valoreCommessa,
  onSaveRetention,
  onSaveCollaborator,
  onArchiveCollaborator,
  onSavePayment,
  onCancelPayment,
  onSaveCost,
  onArchiveCost,
}: {
  scheda: SchedaEconomica;
  personale: PersonaEconomica[];
  professionisti: ProfessionistaEconomico[];
  profili: ProfiloFiscale[];
  collaboratori: CollaboratoreAssegnato[];
  documentiCollaboratori: DocumentoCollaboratore[];
  movimenti: MovimentoFinanziario[];
  allocazioni: AllocazioneMovimento[];
  costi: CostoProgettoLegacy[];
  valoreCommessa: number;
  onSaveRetention: (percentuali: {
    fisso: number;
    operativo: number;
  }) => Promise<void>;
  onSaveCollaborator: Parameters<typeof CollaboratorModal>[0]["onSave"];
  onArchiveCollaborator: (id: string) => Promise<void>;
  onSavePayment: Parameters<typeof CollaboratorPaymentModal>[0]["onSave"];
  onCancelPayment: (movimentoId: string, documentoId: string | null) => Promise<void>;
  onSaveCost: Parameters<typeof ProjectCostModal>[0]["onSave"];
  onArchiveCost: (id: string) => Promise<void>;
}) {
  const [collaboratoreAperto, setCollaboratoreAperto] = useState<CollaboratoreAssegnato | "nuovo" | null>(null);
  const [pagamentoAperto, setPagamentoAperto] = useState<CollaboratoreAssegnato | null>(null);
  const [costoAperto, setCostoAperto] = useState<CostoProgettoLegacy | "nuovo" | null>(null);
  const [trattenutaFisso, setTrattenutaFisso] = useState(
    String(
      parseImporto(
        scheda.trattenuta_fisso_percentuale ?? scheda.trattenuta_percentuale
      )
    )
  );
  const [trattenutaOperativo, setTrattenutaOperativo] = useState(
    String(parseImporto(scheda.trattenuta_operativo_percentuale))
  );
  const [salvataggioTrattenuta, setSalvataggioTrattenuta] = useState(false);
  const [erroreTrattenuta, setErroreTrattenuta] = useState("");
  const quoteFidepa = calcolaQuoteTrattenutaFidepa({
    valoreTotale: valoreCommessa,
    fissoPercentuale: trattenutaFisso,
    operativoPercentuale: trattenutaOperativo,
  });
  const quotaFidepa = quoteFidepa.quotaTotale;

  async function salvaTrattenuta() {
    const fisso = parseImporto(trattenutaFisso);
    const operativo = parseImporto(trattenutaOperativo);
    if (fisso < 0 || fisso > 100 || operativo < 0 || operativo > 100) {
      setErroreTrattenuta("FISSO e OPERATIVO devono essere compresi tra 0 e 100%.");
      return;
    }
    if (fisso + operativo > 100) {
      setErroreTrattenuta("La somma di FISSO e OPERATIVO non può superare il 100%.");
      return;
    }
    setSalvataggioTrattenuta(true);
    setErroreTrattenuta("");
    try {
      await onSaveRetention({ fisso, operativo });
    } catch (error) {
      setErroreTrattenuta(error instanceof Error ? error.message : "Salvataggio non riuscito.");
    } finally {
      setSalvataggioTrattenuta(false);
    }
  }

  return (
    <div className="space-y-5">
      <EconomicCard
        title="Trattenuta FIDEPA"
        subtitle="FISSO e OPERATIVO sono calcolati separatamente sul valore aggiornato della commessa."
        actions={<PrimaryButton onClick={salvaTrattenuta} disabled={salvataggioTrattenuta} icon="checkSquare">{salvataggioTrattenuta ? "Salvataggio..." : "Salva trattenuta"}</PrimaryButton>}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Field label="FISSO %"><input inputMode="decimal" value={trattenutaFisso} onChange={(event) => setTrattenutaFisso(event.target.value)} className={inputClass} /></Field>
          <Field label="OPERATIVO %"><input inputMode="decimal" value={trattenutaOperativo} onChange={(event) => setTrattenutaOperativo(event.target.value)} className={inputClass} /></Field>
          <div className="rounded-xl bg-[#F2F2F2] px-4 py-3"><p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Quota FISSO</p><p className="mt-2 text-lg font-semibold text-[#2B2F5E]">{formattaEuro(quoteFidepa.quotaFisso)}</p></div>
          <div className="rounded-xl bg-[#F2F2F2] px-4 py-3"><p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Quota OPERATIVO</p><p className="mt-2 text-lg font-semibold text-[#2B2F5E]">{formattaEuro(quoteFidepa.quotaOperativo)}</p></div>
          <div className="rounded-xl bg-[#E8F2FA] px-4 py-3"><p className="text-[10px] font-bold uppercase tracking-wide text-[#2D80B3]">Trattenuta totale</p><p className="mt-2 text-lg font-bold text-[#2B2F5E]">{formattaEuro(quotaFidepa)}</p></div>
        </div>
        <FormError message={erroreTrattenuta} />
      </EconomicCard>

      <EconomicCard title="Collaboratori" subtitle="Compenso concordato e pagamenti effettuati." actions={<PrimaryButton onClick={() => setCollaboratoreAperto("nuovo")} icon="users">Aggiungi collaboratore</PrimaryButton>}>
        {collaboratori.length === 0 ? <EmptyState>Nessun collaboratore associato alla commessa.</EmptyState> : <div className="space-y-3">{collaboratori.map((item) => {
          const docs = documentiCollaboratori.filter((doc) => doc.collaboratore_id === item.id && doc.stato !== "annullato");
          const pagamenti = movimenti.filter((mov) => mov.collaboratore_id === item.id && mov.direzione === "uscita" && mov.stato_riconciliazione !== "annullato");
          const righePagamento = pagamenti.map((movimento) => {
            const allocazione = allocazioni.find((voce) => voce.movimento_id === movimento.id && voce.documento_collaboratore_id && !voce.deleted_at);
            const documento = docs.find((voce) => voce.id === allocazione?.documento_collaboratore_id);
            return { movimento, documento };
          });
          const compensoPagato = sommaImporti(righePagamento.map(({ movimento, documento }) => documento?.imponibile ?? movimento.importo));
          const oneriFiscali = sommaImporti(righePagamento.map(({ documento }) => documento ? parseImporto(documento.cassa) + parseImporto(documento.iva) : 0));
          const residuo = parseImporto(item.compenso) - compensoPagato;
          return <details key={item.id} className="group rounded-2xl border border-gray-100 bg-[#F8F9FB]"><summary className="grid cursor-pointer list-none grid-cols-1 items-center gap-3 p-4 lg:grid-cols-[minmax(180px,1.5fr)_repeat(4,minmax(105px,1fr))_auto]"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#5E9AD3]/12 text-[#2D80B3]"><AppIcon name="user" size={17} /></span><div><p className="font-semibold text-[#2B2F5E]">{nomeCollaboratore(item, personale, professionisti)}</p><p className="text-xs text-gray-500">{item.tipo === "personale" ? "Personale interno" : "Collaboratore esterno"}</p></div></div><MiniValue label="Concordato" value={parseImporto(item.compenso)} /><MiniValue label="Compenso pagato" value={compensoPagato} /><MiniValue label="Cassa e IVA" value={oneriFiscali} /><MiniValue label="Residuo" value={residuo} danger={residuo < 0} /><AppIcon name="chevronDown" size={17} className="justify-self-end transition group-open:rotate-180" /></summary><div className="border-t border-gray-100 bg-white p-4">
            <div className="flex flex-wrap justify-between gap-3"><div className="flex flex-wrap gap-2"><SecondaryButton onClick={() => setCollaboratoreAperto(item)}>Modifica</SecondaryButton><PrimaryButton onClick={() => setPagamentoAperto(item)} icon="euro">Registra pagamento</PrimaryButton></div><SecondaryButton danger onClick={async () => { if (window.confirm("Archiviare il collaboratore mantenendo i pagamenti storici?")) await onArchiveCollaborator(item.id); }}>Archivia</SecondaryButton></div>
            <div className="mt-4"><h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">Pagamenti</h4>{righePagamento.length === 0 ? <EmptyState>Nessun pagamento effettuato.</EmptyState> : <div className="space-y-2">{righePagamento.map(({ movimento, documento }) => { const conFattura = documento?.tipologia === "fattura"; return <div key={movimento.id} className="grid grid-cols-1 items-center gap-3 rounded-xl border border-gray-100 p-3 md:grid-cols-[110px_minmax(0,1fr)_repeat(4,minmax(90px,auto))_auto]"><div><p className="text-sm font-semibold text-[#2B2F5E]">{dataIt(movimento.data_movimento)}</p><StatusBadge value={conFattura ? "fattura" : "contanti"} /></div><div className="min-w-0"><p className="truncate text-sm font-medium text-[#2B2F5E]">{movimento.causale}</p>{conFattura && documento?.numero ? <p className="text-xs text-gray-500">Fattura {documento.numero}</p> : null}</div><MiniValue label="Compenso" value={parseImporto(documento?.imponibile ?? movimento.importo)} /><MiniValue label="Cassa" value={parseImporto(documento?.cassa)} /><MiniValue label="IVA" value={parseImporto(documento?.iva)} /><MiniValue label="Totale" value={parseImporto(movimento.importo)} /><button type="button" onClick={async () => { if (window.confirm("Annullare questo pagamento?")) await onCancelPayment(movimento.id, documento?.id || null); }} className="rounded-lg px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 cursor-pointer">Annulla</button></div>; })}</div>}</div>
          </div></details>;
        })}</div>}
      </EconomicCard>

      <EconomicCard title="Altri costi previsti" subtitle="Costi di progetto distinti dai compensi dei collaboratori." actions={<PrimaryButton onClick={() => setCostoAperto("nuovo")} icon="wallet">Aggiungi costo</PrimaryButton>}>
        {costi.length === 0 ? <EmptyState>Nessun altro costo previsto.</EmptyState> : <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{costi.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-[#F8F9FB] p-3"><div><p className="text-sm font-semibold text-[#2B2F5E]">{item.descrizione}</p><p className="text-xs text-gray-500">Imponibile {formattaEuro(item.importo)} · Cassa {formattaEuro(item.cassa)} · IVA {formattaEuro(item.iva)}</p></div><div className="flex gap-1"><button type="button" onClick={() => setCostoAperto(item)} className="rounded-lg px-2 py-1 text-xs font-semibold text-[#2D80B3] hover:bg-[#E8F2FA] cursor-pointer">Modifica</button><button type="button" onClick={async () => { if (window.confirm("Archiviare questo costo?")) await onArchiveCost(item.id); }} className="rounded-lg px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 cursor-pointer">Archivia</button></div></div>)}</div>}
      </EconomicCard>

      {collaboratoreAperto ? <CollaboratorModal economiaId={scheda.id} personale={personale} professionisti={professionisti} profili={profili} collaboratore={collaboratoreAperto === "nuovo" ? null : collaboratoreAperto} valoreCommessa={valoreCommessa} quotaFidepa={quotaFidepa} onClose={() => setCollaboratoreAperto(null)} onSave={onSaveCollaborator} /> : null}
      {pagamentoAperto ? <CollaboratorPaymentModal economiaId={scheda.id} collaboratore={pagamentoAperto} nomeCollaboratore={nomeCollaboratore(pagamentoAperto, personale, professionisti)} persona={personale.find((item) => item.id === pagamentoAperto.persona_id)} onClose={() => setPagamentoAperto(null)} onSave={onSavePayment} /> : null}
      {costoAperto ? <ProjectCostModal economiaId={scheda.id} costo={costoAperto === "nuovo" ? null : costoAperto} onClose={() => setCostoAperto(null)} onSave={onSaveCost} /> : null}
    </div>
  );
}

function MiniValue({ label, value, danger = false }: { label: string; value: number; danger?: boolean }) {
  return <div><p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{label}</p><p className={`mt-1 text-sm font-semibold ${danger ? "text-red-600" : "text-[#2B2F5E]"}`}>{formattaEuro(value)}</p></div>;
}

export function FinancialMovementsSection({
  scheda,
  commessa,
  movimenti,
  allocazioni,
  documentiAttivi,
  documentiCollaboratori,
  collaboratori,
  personale,
  onSaveMovement,
  onCancelMovement,
  onReconcile,
  onCreateDocument,
}: {
  scheda: SchedaEconomica;
  commessa: CommessaEconomica;
  movimenti: MovimentoFinanziario[];
  allocazioni: AllocazioneMovimento[];
  documentiAttivi: DocumentoAttivo[];
  documentiCollaboratori: DocumentoCollaboratore[];
  collaboratori: CollaboratoreAssegnato[];
  personale: PersonaEconomica[];
  onSaveMovement: Parameters<typeof MovementModal>[0]["onSave"];
  onCancelMovement: (id: string) => Promise<void>;
  onReconcile: (movimento: MovimentoFinanziario, values: Array<Pick<AllocazioneMovimento, "documento_attivo_id" | "documento_collaboratore_id" | "importo" | "consenti_eccedenza">>) => Promise<void>;
  onCreateDocument: (movimento: MovimentoFinanziario) => void;
}) {
  const [movimentoAperto, setMovimentoAperto] = useState<{ item?: MovimentoFinanziario; direzione: "entrata" | "uscita" } | null>(null);
  const [riconciliazione, setRiconciliazione] = useState<MovimentoFinanziario | null>(null);
  const [dal, setDal] = useState(""); const [al, setAl] = useState(""); const [direzione, setDirezione] = useState(""); const [soggetto, setSoggetto] = useState(""); const [modalita, setModalita] = useState(""); const [conto, setConto] = useState(""); const [stato, setStato] = useState(""); const [associazione, setAssociazione] = useState("");
  const filtrati = useMemo(() => movimenti.filter((item) => {
    if (dal && item.data_movimento < dal) return false; if (al && item.data_movimento > al) return false; if (direzione && item.direzione !== direzione) return false; if (soggetto && !`${item.soggetto} ${item.causale}`.toLowerCase().includes(soggetto.toLowerCase())) return false; if (modalita && item.modalita !== modalita) return false; if (conto && !item.conto_cassa.toLowerCase().includes(conto.toLowerCase())) return false; if (stato && item.stato_riconciliazione !== stato) return false; const collegato = allocazioni.some((a) => a.movimento_id === item.id && !a.deleted_at); if (associazione === "associato" && !collegato) return false; if (associazione === "non_associato" && collegato) return false; return true;
  }), [movimenti, allocazioni, dal, al, direzione, soggetto, modalita, conto, stato, associazione]);

  return <div className="space-y-5"><EconomicCard title="Movimenti finanziari" subtitle="Vista unificata di entrate e uscite della commessa." actions={<div className="flex flex-wrap gap-2"><PrimaryButton onClick={() => setMovimentoAperto({ direzione: "entrata" })} icon="euro">Registra incasso</PrimaryButton><SecondaryButton onClick={() => setMovimentoAperto({ direzione: "uscita" })} icon="wallet">Registra pagamento</SecondaryButton></div>}>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-8"><Field label="Dal"><input type="date" value={dal} onChange={(e) => setDal(e.target.value)} className={inputClass} /></Field><Field label="Al"><input type="date" value={al} onChange={(e) => setAl(e.target.value)} className={inputClass} /></Field><Field label="Entrata/uscita"><select value={direzione} onChange={(e) => setDirezione(e.target.value)} className={inputClass}><option value="">Tutte</option><option value="entrata">Entrate</option><option value="uscita">Uscite</option></select></Field><Field label="Soggetto"><input value={soggetto} onChange={(e) => setSoggetto(e.target.value)} className={inputClass} /></Field><Field label="Modalità"><select value={modalita} onChange={(e) => setModalita(e.target.value)} className={inputClass}><option value="">Tutte</option>{["bonifico","contanti","carta","assegno","compensazione","altro"].map((item) => <option key={item} value={item}>{item}</option>)}</select></Field><Field label="Conto/cassa"><input value={conto} onChange={(e) => setConto(e.target.value)} className={inputClass} /></Field><Field label="Stato"><select value={stato} onChange={(e) => setStato(e.target.value)} className={inputClass}><option value="">Tutti</option>{["riconciliato","parzialmente_riconciliato","da_associare","da_documentare","anomalia","da_verificare","annullato"].map((item) => <option key={item} value={item}>{item.replaceAll("_"," ")}</option>)}</select></Field><Field label="Documento"><select value={associazione} onChange={(e) => setAssociazione(e.target.value)} className={inputClass}><option value="">Tutti</option><option value="associato">Associato</option><option value="non_associato">Non associato</option></select></Field></div>
    <div className="mt-4">{filtrati.length === 0 ? <EmptyState>Nessun movimento corrisponde ai filtri.</EmptyState> : <div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-sm"><thead><tr className="border-b border-gray-100 text-[11px] uppercase tracking-wide text-gray-400"><th className="px-3 py-2">Data</th><th className="px-3 py-2">Tipo</th><th className="px-3 py-2">Soggetto / causale</th><th className="px-3 py-2 text-right">Entrata</th><th className="px-3 py-2 text-right">Uscita</th><th className="px-3 py-2">Modalità</th><th className="px-3 py-2">Conto/cassa</th><th className="px-3 py-2">Documento</th><th className="px-3 py-2">Stato</th><th className="px-3 py-2 text-right">Azioni</th></tr></thead><tbody>{filtrati.map((item) => { const allocato = importoAllocato(item.id, allocazioni); return <tr key={item.id} className="border-b border-gray-50"><td className="px-3 py-3">{dataIt(item.data_movimento)}</td><td className="px-3 py-3">{item.tipologia.replaceAll("_"," ")}</td><td className="max-w-[260px] px-3 py-3"><p className="truncate font-semibold text-[#2B2F5E]">{item.soggetto}</p><p className="truncate text-xs text-gray-500">{item.causale}</p></td><td className="px-3 py-3 text-right font-semibold text-[#4D9635]">{item.direzione === "entrata" ? formattaEuro(item.importo) : "-"}</td><td className="px-3 py-3 text-right font-semibold text-red-600">{item.direzione === "uscita" ? formattaEuro(item.importo) : "-"}</td><td className="px-3 py-3">{item.modalita}</td><td className="px-3 py-3">{item.conto_cassa}</td><td className="px-3 py-3">{allocato > 0 ? `${formattaEuro(allocato)} associati` : "Documento mancante"}</td><td className="px-3 py-3"><StatusBadge value={item.stato_riconciliazione} /></td><td className="px-3 py-3"><div className="flex justify-end gap-1"><button type="button" onClick={() => setMovimentoAperto({ item, direzione: item.direzione })} className="rounded-lg px-2 py-1 text-xs font-semibold text-[#2D80B3] hover:bg-[#E8F2FA] cursor-pointer">Modifica</button>{!["riconciliato","annullato"].includes(item.stato_riconciliazione) ? <><button type="button" onClick={() => setRiconciliazione(item)} className="rounded-lg px-2 py-1 text-xs font-semibold text-[#4D9635] hover:bg-[#EAF6E5] cursor-pointer">Riconcilia</button><button type="button" onClick={() => onCreateDocument(item)} className="rounded-lg px-2 py-1 text-xs font-semibold text-[#9A6800] hover:bg-[#FFF4D6] cursor-pointer">Crea documento</button></> : null}{item.stato_riconciliazione !== "annullato" ? <button type="button" onClick={async () => { if (window.confirm("Annullare il movimento?")) await onCancelMovement(item.id); }} className="rounded-lg px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 cursor-pointer">Annulla</button> : null}</div></td></tr>; })}</tbody></table></div>}</div>
  </EconomicCard>{movimentoAperto ? <MovementModal economiaId={scheda.id} commessa={commessa} collaboratori={collaboratori} personale={personale} movimento={movimentoAperto.item} direzioneIniziale={movimentoAperto.direzione} onClose={() => setMovimentoAperto(null)} onSave={onSaveMovement} /> : null}{riconciliazione ? <ReconciliationModal movimento={riconciliazione} documentiAttivi={documentiAttivi} documentiCollaboratori={documentiCollaboratori} allocazioni={allocazioni} onCreateDocument={() => { onCreateDocument(riconciliazione); setRiconciliazione(null); }} onClose={() => setRiconciliazione(null)} onSave={(values) => onReconcile(riconciliazione, values)} /> : null}</div>;
}

export function SummaryAnomaliesSection({ riepilogo, anomalie, onUpdateAnomaly }: { riepilogo: RiepilogoEconomico; anomalie: AnomaliaEconomica[]; onUpdateAnomaly: (anomalia: AnomaliaEconomica, stato: StatoAnomalia, motivazione: string) => Promise<void> }) {
  const [daIgnorare, setDaIgnorare] = useState<AnomaliaEconomica | null>(null); const [motivazione, setMotivazione] = useState(""); const [errore, setErrore] = useState("");
  const gruppi = [
    { titolo: "Quadro economico", valori: [["Valore iniziale",riepilogo.valoreIniziale],["Variazioni nette",riepilogo.variazioniNette],["Valore aggiornato",riepilogo.valoreAggiornato],["Costi previsti",riepilogo.costiPrevisti],["Margine previsto",riepilogo.marginePrevisto]] as const },
    { titolo: "Ciclo documentale", valori: [["Ricavi documentati (imponibile)",riepilogo.ricaviDocumentati],["Costi documentati (imponibile)",riepilogo.costiDocumentati],["Residuo da fatturare (imponibile)",riepilogo.residuoDaFatturare],["Fatture da incassare (totale documento)",riepilogo.fattureDaIncassare],["Documenti collaboratori da ricevere",riepilogo.documentiCollaboratoriDaRicevere],["Documenti collaboratori da pagare",riepilogo.documentiCollaboratoriDaPagare],["Margine documentato (imponibile)",riepilogo.margineDocumentato]] as const },
    { titolo: "Flusso finanziario", valori: [["Incassi totali",riepilogo.incassiTotali],["Pagamenti totali",riepilogo.pagamentiTotali],["Incassi riconciliati",riepilogo.incassiRiconciliati],["Incassi da documentare",riepilogo.incassiDaDocumentare],["Pagamenti riconciliati",riepilogo.pagamentiRiconciliati],["Pagamenti da documentare",riepilogo.pagamentiDaDocumentare],["Saldo finanziario",riepilogo.saldoFinanziario]] as const },
  ];
  return <div className="space-y-5"><div className="grid grid-cols-1 gap-5 xl:grid-cols-3">{gruppi.map((gruppo) => <EconomicCard key={gruppo.titolo} title={gruppo.titolo}><div className="space-y-2">{gruppo.valori.map(([label,value]) => <div key={label} className="flex items-center justify-between gap-3 rounded-xl bg-[#F8F9FB] px-3 py-2.5"><span className="text-xs text-gray-600">{label}</span><strong className={`${value < 0 ? "text-red-600" : "text-[#2B2F5E]"}`}>{formattaEuro(value)}</strong></div>)}</div></EconomicCard>)}</div><EconomicCard title="Anomalie e attività da completare" subtitle="I movimenti non documentati restano nel flusso finanziario ma non nei totali fiscali.">{anomalie.length === 0 ? <EmptyState>Non ci sono anomalie aperte.</EmptyState> : <div className="space-y-2">{anomalie.map((item) => <div key={item.id} className="grid grid-cols-1 items-center gap-3 rounded-xl border border-gray-100 bg-[#F8F9FB] p-3 md:grid-cols-[120px_minmax(0,1fr)_160px_auto]"><div><StatusBadge value={item.gravita} /><p className="mt-1 text-xs text-gray-500">{dataIt(item.data_anomalia)}</p></div><div><p className="text-sm font-semibold text-[#2B2F5E]">{item.descrizione}</p>{item.azione_suggerita ? <p className="mt-0.5 text-xs text-gray-500">Azione suggerita: {item.azione_suggerita}</p> : null}{item.motivazione_ignorata ? <p className="mt-1 text-xs italic text-gray-500">Motivazione: {item.motivazione_ignorata}</p> : null}</div><StatusBadge value={item.stato} /><div className="flex flex-wrap justify-end gap-1">{item.stato === "aperta" ? <button type="button" onClick={() => onUpdateAnomaly(item,"in_lavorazione","")} className="rounded-lg px-2 py-1 text-xs font-semibold text-[#2D80B3] hover:bg-[#E8F2FA] cursor-pointer">Prendi in carico</button> : null}{!["risolta","ignorata"].includes(item.stato) ? <><button type="button" onClick={() => onUpdateAnomaly(item,"risolta","")} className="rounded-lg px-2 py-1 text-xs font-semibold text-[#4D9635] hover:bg-[#EAF6E5] cursor-pointer">Risolta</button><button type="button" onClick={() => { setDaIgnorare(item); setMotivazione(""); setErrore(""); }} className="rounded-lg px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-100 cursor-pointer">Ignora</button></> : null}</div></div>)}</div>}</EconomicCard>{daIgnorare ? <Modal title="Ignora anomalia" description="La motivazione è obbligatoria e resta nello storico." onClose={() => setDaIgnorare(null)} size="lg"><div className="space-y-4"><Field label="Motivazione"><textarea value={motivazione} onChange={(e) => setMotivazione(e.target.value)} rows={4} className={inputClass} /></Field><FormError message={errore} /><div className="flex justify-end gap-2"><SecondaryButton onClick={() => setDaIgnorare(null)}>Annulla</SecondaryButton><PrimaryButton onClick={async () => { if (!motivazione.trim()) { setErrore("Inserisci la motivazione."); return; } await onUpdateAnomaly(daIgnorare,"ignorata",motivazione); setDaIgnorare(null); }} icon="checkSquare">Conferma</PrimaryButton></div></div></Modal> : null}</div>;
}
