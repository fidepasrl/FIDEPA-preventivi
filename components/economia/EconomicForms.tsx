"use client";

import { useState } from "react";
import ImportoInput from "@/components/ImportoInput";
import AppIcon from "@/components/AppIcon";
import { finalizzaInputImporto, formattaEuro, parseImporto } from "@/lib/importi";
import {
  aliquotePagamentoCollaboratore,
  calcolaCompensoCollaboratore,
  calcolaRigaFiscale,
  sommaImporti,
} from "@/lib/economia-commesse/calcoli";
import { validaAllocazioni, validaDocumento, validaMovimento } from "@/lib/economia-commesse/validazioni";
import type {
  AllocazioneMovimento,
  CollaboratoreAssegnato,
  CommessaEconomica,
  CostoProgettoLegacy,
  DocumentoAttivo,
  DocumentoCollaboratore,
  ModalitaCalcoloCollaboratore,
  MovimentoFinanziario,
  PersonaEconomica,
  ProfessionistaEconomico,
  ProfiloFiscale,
  RigaDocumentoAttivo,
  SoggettoFiscale,
  TipoDocumentoAttivo,
  TipoVariazione,
  VariazioneEconomica,
} from "@/lib/economia-commesse/types";
import {
  caricaAllegatoEconomico,
  type RigaDocumentoDaSalvare,
} from "@/lib/economia-commesse/api";
import {
  Field,
  FormError,
  Modal,
  PrimaryButton,
  SecondaryButton,
  inputClass,
} from "./EconomicCommon";

function oggi() {
  const data = new Date();
  const offset = data.getTimezoneOffset() * 60_000;
  return new Date(data.getTime() - offset).toISOString().slice(0, 10);
}

function erroreDa(value: unknown) {
  return value instanceof Error ? value.message : "Operazione non riuscita.";
}

export function ReceiptModal({
  economiaId,
  commessa,
  movimento,
  onClose,
  onSave,
}: {
  economiaId: string;
  commessa: CommessaEconomica;
  movimento?: MovimentoFinanziario | null;
  onClose: () => void;
  onSave: (
    value: Omit<MovimentoFinanziario, "created_at" | "updated_at" | "deleted_at">
  ) => Promise<void>;
}) {
  const tipoIniziale = movimento
    ? movimento.modalita === "contanti" ? "contanti" : "elettronico"
    : "elettronico";
  const [tipo, setTipo] = useState<"contanti" | "elettronico">(tipoIniziale);
  const [data, setData] = useState(movimento?.data_movimento || oggi());
  const [imponibile, setImponibile] = useState(
    finalizzaInputImporto(movimento?.imponibile ?? movimento?.importo ?? "")
  );
  const [note, setNote] = useState(movimento?.note || "");
  const [errore, setErrore] = useState("");
  const [salvataggio, setSalvataggio] = useState(false);

  const elettronico = tipo === "elettronico";
  const fiscale = calcolaRigaFiscale({
    imponibile,
    cassaAliquota: elettronico ? 4 : 0,
    ivaAliquota: elettronico ? 22 : 0,
    ritenutaAliquota: 0,
    bollo: 0,
    cassaBase: elettronico ? "imponibile" : "nessuna",
    ivaBase: elettronico ? "imponibile_cassa" : "nessuna",
    ritenutaBase: "nessuna",
  });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!data || parseImporto(imponibile) <= 0) {
      setErrore("Indica una data e un importo maggiore di zero.");
      return;
    }

    setSalvataggio(true);
    setErrore("");
    try {
      await onSave({
        id: movimento?.id || "",
        economia_commessa_id: economiaId,
        direzione: "entrata",
        tipologia: "incasso_cliente",
        collaboratore_id: null,
        costo_progetto_id: null,
        data_movimento: data,
        importo: fiscale.totale,
        imponibile: fiscale.imponibile,
        cassa_aliquota: elettronico ? 4 : 0,
        cassa: fiscale.cassa,
        iva_aliquota: elettronico ? 22 : 0,
        iva: fiscale.iva,
        modalita: elettronico ? "bonifico" : "contanti",
        soggetto: commessa.cliente_nome || "Cliente",
        conto_cassa: elettronico ? "Conto corrente" : "Cassa",
        causale: "Incasso",
        note: note.trim() || null,
        stato_riconciliazione: "riconciliato",
        anticipo_da_fatturare: false,
        allegato_nome: movimento?.allegato_nome || null,
        allegato_url: movimento?.allegato_url || null,
        legacy_source: movimento?.legacy_source || null,
        legacy_id: movimento?.legacy_id || null,
      });
      onClose();
    } catch (error) {
      setErrore(erroreDa(error));
    } finally {
      setSalvataggio(false);
    }
  }

  return (
    <Modal
      title={movimento ? "Modifica incasso" : "Registra incasso"}
      description="Indica l’importo base. Per gli incassi elettronici Cassa e IVA vengono calcolate automaticamente."
      onClose={onClose}
      size="lg"
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Data">
            <input type="date" value={data} onChange={(event) => setData(event.target.value)} className={inputClass} required />
          </Field>
          <Field label="Modalità di pagamento">
            <select value={tipo} onChange={(event) => setTipo(event.target.value as "contanti" | "elettronico")} className={inputClass}>
              <option value="contanti">Contanti</option>
              <option value="elettronico">Elettronico</option>
            </select>
          </Field>
        </div>

        <Field label={elettronico ? "Importo imponibile" : "Importo"}>
          <ImportoInput value={imponibile} onChange={setImponibile} />
        </Field>

        {elettronico ? (
          <div className="grid grid-cols-2 gap-3 rounded-xl bg-[#E8F2FA] p-4 sm:grid-cols-4">
            <MiniFiscalValue label="Imponibile" value={fiscale.imponibile} />
            <MiniFiscalValue label="Cassa 4%" value={fiscale.cassa} />
            <MiniFiscalValue label="IVA 22%" value={fiscale.iva} />
            <MiniFiscalValue label="Totale incasso" value={fiscale.totale} strong />
          </div>
        ) : (
          <div className="rounded-xl bg-[#F2F2F2] px-4 py-3 text-sm text-[#2B2F5E]">
            Totale incasso: <strong>{formattaEuro(fiscale.totale)}</strong>
          </div>
        )}

        <Field label="Note">
          <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} className={inputClass} />
        </Field>
        <FormError message={errore} />
        <div className="flex justify-end gap-2">
          <SecondaryButton onClick={onClose}>Annulla</SecondaryButton>
          <PrimaryButton type="submit" disabled={salvataggio} icon="checkSquare">
            {salvataggio ? "Salvataggio..." : movimento ? "Salva modifiche" : "Registra incasso"}
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

export function ReceiptAttachmentModal({
  economiaId,
  movimento,
  onClose,
  onSave,
}: {
  economiaId: string;
  movimento: MovimentoFinanziario;
  onClose: () => void;
  onSave: (nome: string, percorso: string) => Promise<void>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [errore, setErrore] = useState("");
  const [salvataggio, setSalvataggio] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!file) {
      setErrore("Seleziona il documento da allegare.");
      return;
    }
    setSalvataggio(true);
    setErrore("");
    try {
      const allegato = await caricaAllegatoEconomico(file, economiaId, "movimenti");
      await onSave(allegato.nome, allegato.percorso);
      onClose();
    } catch (error) {
      setErrore(erroreDa(error));
    } finally {
      setSalvataggio(false);
    }
  }

  return (
    <Modal
      title="Allega documento"
      description="Carica una ricevuta o un altro documento che attesta il pagamento."
      onClose={onClose}
      size="lg"
    >
      <form onSubmit={submit} className="space-y-4">
        {movimento.allegato_nome ? (
          <div className="rounded-xl bg-[#F2F2F2] px-4 py-3 text-sm text-[#2B2F5E]">
            Documento attuale: <strong>{movimento.allegato_nome}</strong>
          </div>
        ) : null}
        <Field label={movimento.allegato_nome ? "Sostituisci documento" : "Documento"} hint="PDF, immagini o altri documenti fino a 20 MB.">
          <input type="file" onChange={(event) => setFile(event.target.files?.[0] || null)} className={inputClass} required />
        </Field>
        <FormError message={errore} />
        <div className="flex justify-end gap-2">
          <SecondaryButton onClick={onClose}>Annulla</SecondaryButton>
          <PrimaryButton type="submit" disabled={salvataggio} icon="fileText">
            {salvataggio ? "Caricamento..." : "Allega documento"}
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

export function VariationModal({
  economiaId,
  documenti,
  variazione,
  onClose,
  onSave,
}: {
  economiaId: string;
  documenti: DocumentoAttivo[];
  variazione?: VariazioneEconomica | null;
  onClose: () => void;
  onSave: (value: {
    id?: string;
    economia_commessa_id: string;
    data_variazione: string;
    descrizione: string;
    importo: number;
    tipologia: TipoVariazione;
    documento_attivo_id: string | null;
  }) => Promise<void>;
}) {
  const [data, setData] = useState(variazione?.data_variazione || oggi());
  const [descrizione, setDescrizione] = useState(variazione?.descrizione || "");
  const [importo, setImporto] = useState(finalizzaInputImporto(variazione?.importo || ""));
  const [tipologia, setTipologia] = useState<TipoVariazione>(variazione?.tipologia || "aumento");
  const [documentoId, setDocumentoId] = useState(variazione?.documento_attivo_id || "");
  const [errore, setErrore] = useState("");
  const [salvataggio, setSalvataggio] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!data || !descrizione.trim() || parseImporto(importo) <= 0) {
      setErrore("Inserisci data, descrizione e un importo maggiore di zero.");
      return;
    }
    setSalvataggio(true);
    setErrore("");
    try {
      await onSave({
        id: variazione?.id,
        economia_commessa_id: economiaId,
        data_variazione: data,
        descrizione: descrizione.trim(),
        importo: parseImporto(importo),
        tipologia,
        documento_attivo_id: documentoId || null,
      });
      onClose();
    } catch (error) {
      setErrore(erroreDa(error));
    } finally {
      setSalvataggio(false);
    }
  }

  return (
    <Modal title={variazione ? "Modifica variazione" : "Aggiungi variazione"} onClose={onClose} size="lg">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Data">
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} className={inputClass} required />
          </Field>
          <Field label="Tipologia">
            <select value={tipologia} onChange={(e) => setTipologia(e.target.value as TipoVariazione)} className={inputClass}>
              <option value="aumento">Aumento</option>
              <option value="diminuzione">Diminuzione</option>
            </select>
          </Field>
        </div>
        <Field label="Descrizione">
          <input value={descrizione} onChange={(e) => setDescrizione(e.target.value)} className={inputClass} required />
        </Field>
        <Field label="Importo">
          <ImportoInput value={importo} onChange={setImporto} />
        </Field>
        <Field label="Documento collegato" hint="Facoltativo; può essere associato anche in un secondo momento.">
          <select value={documentoId} onChange={(e) => setDocumentoId(e.target.value)} className={inputClass}>
            <option value="">Nessun documento</option>
            {documenti.filter((item) => item.stato !== "annullato").map((item) => (
              <option key={item.id} value={item.id}>
                {item.numero || "Senza numero"} · {item.descrizione}
              </option>
            ))}
          </select>
        </Field>
        <FormError message={errore} />
        <div className="flex justify-end gap-2">
          <SecondaryButton onClick={onClose}>Annulla</SecondaryButton>
          <PrimaryButton type="submit" disabled={salvataggio} icon="checkSquare">
            {salvataggio ? "Salvataggio..." : "Salva variazione"}
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

type RigaDocumentoDraft = {
  localId: string;
  descrizione: string;
  imponibile: string;
  cassaAliquota: string;
  ivaAliquota: string;
  ritenutaAliquota: string;
  bollo: string;
};

function rigaVuota(soggetto?: SoggettoFiscale, importo?: number): RigaDocumentoDraft {
  return {
    localId: crypto.randomUUID(),
    descrizione: "",
    imponibile: importo ? finalizzaInputImporto(importo) : "",
    cassaAliquota: String(parseImporto(soggetto?.cassa_aliquota || 0)),
    ivaAliquota: String(parseImporto(soggetto?.iva_aliquota || 0)),
    ritenutaAliquota: String(parseImporto(soggetto?.ritenuta_aliquota || 0)),
    bollo: "",
  };
}

const TIPI_DOCUMENTO: Array<[TipoDocumentoAttivo, string]> = [
  ["proforma", "Proforma"],
  ["fattura", "Fattura"],
  ["fattura_acconto", "Fattura di acconto"],
  ["nota_credito", "Nota di credito"],
  ["richiesta_pagamento", "Richiesta di pagamento"],
  ["rimborso_spese", "Rimborso spese"],
  ["altro", "Altro documento"],
];

export function ActiveDocumentModal({
  economiaId,
  commessa,
  soggetti,
  documento,
  righeEsistenti,
  importoProposto,
  onClose,
  onSave,
}: {
  economiaId: string;
  commessa: CommessaEconomica;
  soggetti: SoggettoFiscale[];
  documento?: DocumentoAttivo | null;
  righeEsistenti?: RigaDocumentoAttivo[];
  importoProposto?: number;
  onClose: () => void;
  onSave: (documento: Omit<DocumentoAttivo, "created_at" | "updated_at" | "deleted_at">, righe: RigaDocumentoDaSalvare[]) => Promise<void>;
}) {
  const soggettoIniziale = soggetti.find((item) => item.id === documento?.soggetto_fiscale_id) || soggetti[0];
  const [numero, setNumero] = useState(documento?.numero || "");
  const [data, setData] = useState(documento?.data_documento || oggi());
  const [tipologia, setTipologia] = useState<TipoDocumentoAttivo>(documento?.tipologia || "fattura");
  const [soggettoId, setSoggettoId] = useState(documento?.soggetto_fiscale_id || soggettoIniziale?.id || "");
  const [cliente, setCliente] = useState(documento?.cliente || commessa.cliente_nome || "");
  const [descrizione, setDescrizione] = useState(documento?.descrizione || "");
  const [scadenza, setScadenza] = useState(documento?.scadenza || "");
  const [stato, setStato] = useState<DocumentoAttivo["stato"]>(documento?.stato || "bozza");
  const [rilevanzaFiscale, setRilevanzaFiscale] = useState(
    documento?.rilevanza_fiscale ?? true
  );
  const [note, setNote] = useState(documento?.note || "");
  const [allegatoNome, setAllegatoNome] = useState(documento?.allegato_nome || "");
  const [allegatoUrl, setAllegatoUrl] = useState(documento?.allegato_url || "");
  const [allegatoFile, setAllegatoFile] = useState<File | null>(null);
  const [righe, setRighe] = useState<RigaDocumentoDraft[]>(() =>
    righeEsistenti?.length
      ? righeEsistenti.map((riga) => ({
          localId: riga.id,
          descrizione: riga.descrizione,
          imponibile: finalizzaInputImporto(riga.imponibile),
          cassaAliquota: String(parseImporto(riga.cassa_aliquota)),
          ivaAliquota: String(parseImporto(riga.iva_aliquota)),
          ritenutaAliquota: String(parseImporto(riga.ritenuta_aliquota)),
          bollo: finalizzaInputImporto(riga.bollo),
        }))
      : [rigaVuota(soggettoIniziale, importoProposto)]
  );
  const [errore, setErrore] = useState("");
  const [salvataggio, setSalvataggio] = useState(false);

  const soggetto = soggetti.find((item) => item.id === soggettoId);
  const righeCalcolate = righe.map((riga) => ({
    ...riga,
    calcolo: calcolaRigaFiscale({
      imponibile: riga.imponibile,
      cassaAliquota: riga.cassaAliquota,
      ivaAliquota: riga.ivaAliquota,
      ritenutaAliquota: riga.ritenutaAliquota,
      bollo: riga.bollo,
      cassaBase: parseImporto(riga.cassaAliquota) > 0 ? "imponibile" : "nessuna",
      ivaBase: parseImporto(riga.ivaAliquota) > 0 ? "imponibile_cassa" : "nessuna",
      ritenutaBase: parseImporto(riga.ritenutaAliquota) > 0 ? "imponibile" : "nessuna",
    }),
  }));
  const totali = {
    imponibile: sommaImporti(righeCalcolate.map((item) => item.calcolo.imponibile)),
    cassa: sommaImporti(righeCalcolate.map((item) => item.calcolo.cassa)),
    iva: sommaImporti(righeCalcolate.map((item) => item.calcolo.iva)),
    ritenuta: sommaImporti(righeCalcolate.map((item) => item.calcolo.ritenuta)),
    bollo: sommaImporti(righeCalcolate.map((item) => item.calcolo.bollo)),
    totale: sommaImporti(righeCalcolate.map((item) => item.calcolo.totale)),
  };

  function aggiornaRiga(localId: string, campo: keyof RigaDocumentoDraft, valore: string) {
    setRighe((correnti) => correnti.map((item) => (item.localId === localId ? { ...item, [campo]: valore } : item)));
  }

  function cambiaSoggetto(id: string) {
    setSoggettoId(id);
    const prossimo = soggetti.find((item) => item.id === id);
    if (!prossimo) return;
    setRighe((correnti) => correnti.map((riga) => ({
      ...riga,
      cassaAliquota: String(parseImporto(prossimo.cassa_aliquota)),
      ivaAliquota: String(parseImporto(prossimo.iva_aliquota)),
      ritenutaAliquota: String(parseImporto(prossimo.ritenuta_aliquota)),
    })));
  }

  function cambiaTipologia(value: TipoDocumentoAttivo) {
    setTipologia(value);
    const nonFiscale = ["proforma", "richiesta_pagamento"].includes(value);
    setRilevanzaFiscale(!nonFiscale);
    if (value === "rimborso_spese") {
      setRighe((correnti) => correnti.map((riga) => ({ ...riga, cassaAliquota: "0", ivaAliquota: "0", ritenutaAliquota: "0" })));
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!righe.length || righe.some((item) => !item.descrizione.trim() || parseImporto(item.imponibile) <= 0)) {
      setErrore("Ogni riga deve avere una descrizione e un imponibile maggiore di zero.");
      return;
    }
    const errori = validaDocumento({ data, descrizione, imponibile: totali.imponibile, totale: totali.totale, stato });
    if (!cliente.trim()) errori.push({ campo: "cliente", messaggio: "Il cliente è obbligatorio." });
    if (!soggettoId) errori.push({ campo: "soggetto_fiscale_id", messaggio: "Seleziona il soggetto fiscale emittente." });
    if (errori.length) {
      setErrore(errori[0].messaggio);
      return;
    }
    setSalvataggio(true);
    setErrore("");
    try {
      const allegatoCaricato = allegatoFile
        ? await caricaAllegatoEconomico(
            allegatoFile,
            economiaId,
            "documenti-attivi"
          )
        : null;
      await onSave(
        {
          id: documento?.id || "",
          economia_commessa_id: economiaId,
          numero: numero.trim() || null,
          data_documento: data,
          tipologia,
          soggetto_fiscale_id: soggettoId,
          cliente: cliente.trim(),
          descrizione: descrizione.trim(),
          ...totali,
          scadenza: scadenza || null,
          stato,
          rilevanza_fiscale: rilevanzaFiscale,
          note: note.trim() || null,
          allegato_nome:
            allegatoCaricato?.nome || allegatoNome.trim() || null,
          allegato_url:
            allegatoCaricato?.percorso || allegatoUrl.trim() || null,
        },
        righeCalcolate.map((riga, ordine) => ({
          descrizione: riga.descrizione.trim(),
          imponibile: riga.calcolo.imponibile,
          cassa_aliquota: parseImporto(riga.cassaAliquota),
          cassa: riga.calcolo.cassa,
          iva_aliquota: parseImporto(riga.ivaAliquota),
          iva: riga.calcolo.iva,
          ritenuta_aliquota: parseImporto(riga.ritenutaAliquota),
          ritenuta: riga.calcolo.ritenuta,
          bollo: riga.calcolo.bollo,
          totale: riga.calcolo.totale,
          ordine,
          override_fiscale:
            parseImporto(riga.cassaAliquota) !== parseImporto(soggetto?.cassa_aliquota) ||
            parseImporto(riga.ivaAliquota) !== parseImporto(soggetto?.iva_aliquota) ||
            parseImporto(riga.ritenutaAliquota) !== parseImporto(soggetto?.ritenuta_aliquota),
        }))
      );
      onClose();
    } catch (error) {
      setErrore(erroreDa(error));
    } finally {
      setSalvataggio(false);
    }
  }

  return (
    <Modal title={documento ? "Modifica documento attivo" : "Crea documento"} description="Cassa, IVA e ritenuta sono calcolate sulle singole righe." onClose={onClose} size="4xl">
      <form onSubmit={submit} className="space-y-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Tipologia">
            <select value={tipologia} onChange={(e) => cambiaTipologia(e.target.value as TipoDocumentoAttivo)} className={inputClass}>
              {TIPI_DOCUMENTO.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </Field>
          <Field label="Numero">
            <input value={numero} onChange={(e) => setNumero(e.target.value)} className={inputClass} placeholder="Assegnabile anche dopo" />
          </Field>
          <Field label="Data">
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} className={inputClass} required />
          </Field>
          <Field label="Scadenza">
            <input type="date" value={scadenza} onChange={(e) => setScadenza(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Soggetto fiscale emittente">
            <select value={soggettoId} onChange={(e) => cambiaSoggetto(e.target.value)} className={inputClass} required>
              {soggetti.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
            </select>
          </Field>
          <Field label="Cliente">
            <input value={cliente} onChange={(e) => setCliente(e.target.value)} className={inputClass} required />
          </Field>
          <Field label="Stato">
            <select value={stato} onChange={(e) => setStato(e.target.value as DocumentoAttivo["stato"])} className={inputClass}>
              {[["bozza","Bozza"],["da_emettere","Da emettere"],["emesso","Emesso"],["parzialmente_pagato","Parzialmente pagato"],["pagato","Pagato"],["scaduto","Scaduto"],["annullato","Annullato"]].map(([value,label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </Field>
          <label className="flex items-center gap-3 self-end rounded-xl border border-gray-200 bg-[#F8F9FB] px-3 py-2.5 text-sm text-[#2B2F5E] cursor-pointer">
            <input type="checkbox" checked={rilevanzaFiscale} onChange={(e) => setRilevanzaFiscale(e.target.checked)} className="h-4 w-4 accent-[#64B445]" />
            Rilevante nel riepilogo fiscale
          </label>
        </div>
        <Field label="Descrizione documento">
          <input value={descrizione} onChange={(e) => setDescrizione(e.target.value)} className={inputClass} required />
        </Field>

        <div className="rounded-2xl border border-gray-200 bg-[#F8F9FB] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-[#2B2F5E]">Righe documento</h4>
              <p className="text-xs text-gray-500">Ogni riga può avere aliquote differenti.</p>
            </div>
            <SecondaryButton onClick={() => setRighe((correnti) => [...correnti, rigaVuota(soggetto)])} icon="plus">Aggiungi riga</SecondaryButton>
          </div>
          <div className="mt-4 space-y-3">
            {righeCalcolate.map((riga) => (
              <div key={riga.localId} className="rounded-xl border border-gray-100 bg-white p-3">
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(180px,1fr)_150px_92px_92px_92px_120px_38px]">
                  <Field label="Descrizione">
                    <input value={riga.descrizione} onChange={(e) => aggiornaRiga(riga.localId, "descrizione", e.target.value)} className={inputClass} required />
                  </Field>
                  <Field label="Imponibile"><ImportoInput value={riga.imponibile} onChange={(v) => aggiornaRiga(riga.localId, "imponibile", v)} compact /></Field>
                  <Field label="Cassa %"><input inputMode="decimal" value={riga.cassaAliquota} onChange={(e) => aggiornaRiga(riga.localId, "cassaAliquota", e.target.value)} className={inputClass} /></Field>
                  <Field label="IVA %"><input inputMode="decimal" value={riga.ivaAliquota} onChange={(e) => aggiornaRiga(riga.localId, "ivaAliquota", e.target.value)} className={inputClass} /></Field>
                  <Field label="Ritenuta %"><input inputMode="decimal" value={riga.ritenutaAliquota} onChange={(e) => aggiornaRiga(riga.localId, "ritenutaAliquota", e.target.value)} className={inputClass} /></Field>
                  <Field label="Bollo"><ImportoInput value={riga.bollo} onChange={(v) => aggiornaRiga(riga.localId, "bollo", v)} compact /></Field>
                  <button type="button" onClick={() => setRighe((correnti) => correnti.filter((item) => item.localId !== riga.localId))} disabled={righe.length === 1} className="mt-6 flex h-10 w-10 items-center justify-center rounded-xl text-red-500 hover:bg-red-50 disabled:opacity-30 cursor-pointer" aria-label="Rimuovi riga"><AppIcon name="x" size={15} /></button>
                </div>
                <p className="mt-2 text-right text-xs text-gray-500">Cassa {formattaEuro(riga.calcolo.cassa)} · IVA {formattaEuro(riga.calcolo.iva)} · Ritenuta {formattaEuro(riga.calcolo.ritenuta)} · <strong className="text-[#2B2F5E]">Totale {formattaEuro(riga.calcolo.totale)}</strong></p>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
            {Object.entries(totali).map(([label, value]) => (
              <div key={label} className="rounded-xl bg-white px-3 py-2"><p className="text-[10px] font-bold uppercase text-gray-400">{label}</p><p className="mt-1 text-sm font-semibold text-[#2B2F5E]">{formattaEuro(value)}</p></div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="Carica allegato" hint="PDF, immagini o altri documenti fino a 20 MB."><input type="file" onChange={(e) => setAllegatoFile(e.target.files?.[0] || null)} className={inputClass} /></Field>
          <Field label="Nome allegato"><input value={allegatoNome} onChange={(e) => setAllegatoNome(e.target.value)} className={inputClass} /></Field>
          <Field label="Oppure URL allegato"><input type="url" value={allegatoUrl} onChange={(e) => setAllegatoUrl(e.target.value)} className={inputClass} placeholder="https://..." /></Field>
        </div>
        <Field label="Note"><textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={inputClass} /></Field>
        <FormError message={errore} />
        <div className="flex flex-wrap justify-end gap-2">
          <SecondaryButton onClick={onClose}>Annulla</SecondaryButton>
          <PrimaryButton type="submit" disabled={salvataggio} icon="checkSquare">{salvataggio ? "Salvataggio..." : "Salva documento"}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

export function CollaboratorModal({
  economiaId,
  personale,
  professionisti,
  profili,
  collaboratore,
  valoreCommessa,
  quotaFidepa,
  onClose,
  onSave,
}: {
  economiaId: string;
  personale: PersonaEconomica[];
  professionisti: ProfessionistaEconomico[];
  profili: ProfiloFiscale[];
  collaboratore?: CollaboratoreAssegnato | null;
  valoreCommessa: number;
  quotaFidepa: number;
  onClose: () => void;
  onSave: (value: Omit<CollaboratoreAssegnato, "created_at" | "updated_at" | "deleted_at">) => Promise<void>;
}) {
  const modalitaIniziale: ModalitaCalcoloCollaboratore = collaboratore && [
    "importo_fisso",
    "percentuale_compenso",
    "percentuale_quota_fidepa",
  ].includes(collaboratore.modalita_calcolo)
    ? collaboratore.modalita_calcolo
    : "importo_fisso";
  const [tipo, setTipo] = useState<"personale" | "esterno">(collaboratore?.tipo || "personale");
  const [personaId, setPersonaId] = useState(collaboratore?.persona_id || personale[0]?.id || "");
  const professionistaIniziale = collaboratore?.professionista_id || professionisti.find((item) => {
    const nomeCompleto = `${item.cognome || ""} ${item.nome || ""}`.trim();
    return nomeCompleto === collaboratore?.collaboratore_esterno_nome;
  })?.id || "";
  const [professionistaId, setProfessionistaId] = useState(professionistaIniziale);
  const [modalita, setModalita] = useState<ModalitaCalcoloCollaboratore>(modalitaIniziale);
  const [compenso, setCompenso] = useState(finalizzaInputImporto(collaboratore?.compenso || ""));
  const [percentuale, setPercentuale] = useState(String(parseImporto(collaboratore?.percentuale || 0) || ""));
  const cassaSalvata = parseImporto(collaboratore?.cassa_aliquota);
  const ivaSalvata = parseImporto(collaboratore?.iva_aliquota);
  const [cassaAttiva, setCassaAttiva] = useState(
    collaboratore ? cassaSalvata > 0 : true
  );
  const [ivaAttiva, setIvaAttiva] = useState(
    collaboratore ? ivaSalvata > 0 : true
  );
  const [cassaPercentuale, setCassaPercentuale] = useState(
    String(cassaSalvata || 4)
  );
  const [ivaPercentuale, setIvaPercentuale] = useState(
    String(ivaSalvata || 22)
  );
  const [note, setNote] = useState(collaboratore?.note || "");
  const [errore, setErrore] = useState("");
  const [salvataggio, setSalvataggio] = useState(false);
  const compensoCalcolato = calcolaCompensoCollaboratore({ modalita, importo: compenso, percentuale, valoreCommessa, quotaFidepa });
  const personaSelezionata = personale.find((item) => item.id === personaId);
  const professionistaSelezionato = professionisti.find(
    (item) => item.id === professionistaId
  );
  const profiloPersonale = profili.find((item) => item.codice === "personale_interno");

  function cambiaTipo(value: "personale" | "esterno") {
    setTipo(value);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if ((tipo === "personale" && !personaId) || (tipo === "esterno" && !professionistaId)) {
      setErrore("Indica il collaboratore.");
      return;
    }
    if (compensoCalcolato <= 0) {
      setErrore("Il compenso concordato deve essere maggiore di zero.");
      return;
    }
    const cassaEsterna = cassaAttiva ? parseImporto(cassaPercentuale) : 0;
    const ivaEsterna = ivaAttiva ? parseImporto(ivaPercentuale) : 0;
    if (
      tipo === "esterno" &&
      (cassaEsterna < 0 ||
        cassaEsterna > 100 ||
        ivaEsterna < 0 ||
        ivaEsterna > 100)
    ) {
      setErrore("Le aliquote di Cassa e IVA devono essere comprese tra 0 e 100%.");
      return;
    }
    const cassaAliquota = tipo === "personale" && personaSelezionata?.economia_cassa_attiva
      ? parseImporto(personaSelezionata.economia_cassa_aliquota)
      : tipo === "esterno" ? cassaEsterna : 0;
    const ivaAliquota = tipo === "personale" && personaSelezionata?.economia_iva_attiva
      ? parseImporto(personaSelezionata.economia_iva_aliquota)
      : tipo === "esterno" ? ivaEsterna : 0;
    const fiscale = calcolaRigaFiscale({
      imponibile: compensoCalcolato,
      cassaAliquota,
      ivaAliquota,
      ritenutaAliquota: 0,
      bollo: 0,
      cassaBase: cassaAliquota > 0 ? "imponibile" : "nessuna",
      ivaBase: ivaAliquota > 0 ? "imponibile_cassa" : "nessuna",
      ritenutaBase: "nessuna",
    });
    setSalvataggio(true);
    try {
      await onSave({
        id: collaboratore?.id || "",
        economia_commessa_id: economiaId,
        persona_id: tipo === "personale" ? personaId : null,
        professionista_id: tipo === "esterno" ? professionistaId : null,
        collaboratore_esterno_nome: tipo === "esterno"
          ? `${professionistaSelezionato?.cognome || ""} ${professionistaSelezionato?.nome || ""}`.trim()
          : null,
        tipo,
        compenso: compensoCalcolato,
        percentuale: parseImporto(percentuale),
        modalita_calcolo: modalita,
        profilo_fiscale_id: tipo === "personale" ? profiloPersonale?.id || null : null,
        cassa_aliquota: cassaAliquota,
        iva_aliquota: ivaAliquota,
        cassa: fiscale.cassa,
        iva: fiscale.iva,
        note: note.trim() || null,
      });
      onClose();
    } catch (error) {
      setErrore(erroreDa(error));
    } finally {
      setSalvataggio(false);
    }
  }

  const percentualeRichiesta = ["percentuale_compenso", "percentuale_quota_fidepa"].includes(modalita);
  return (
    <Modal title={collaboratore ? "Modifica collaboratore" : "Aggiungi collaboratore"} onClose={onClose} size="2xl">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Tipologia">
            <select value={tipo} onChange={(e) => cambiaTipo(e.target.value as "personale" | "esterno")} className={inputClass}>
              <option value="personale">Personale interno</option><option value="esterno">Collaboratore esterno</option>
            </select>
          </Field>
          {tipo === "personale" ? (
            <Field label="Nominativo"><select value={personaId} onChange={(e) => setPersonaId(e.target.value)} className={inputClass}>{personale.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></Field>
          ) : (
            <Field label="Professionista dalla rubrica">
              {professionisti.length ? (
                <select value={professionistaId} onChange={(e) => setProfessionistaId(e.target.value)} className={inputClass} required>
                  <option value="">Seleziona professionista</option>
                  {professionisti.map((item) => {
                    const nome = `${item.cognome || ""} ${item.nome || ""}`.trim() || "Professionista senza nome";
                    return <option key={item.id} value={item.id}>{nome}{item.professione ? ` · ${item.professione}` : ""}</option>;
                  })}
                </select>
              ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
                  Nessun professionista disponibile. <a href="/rubrica/professionisti" className="font-semibold underline">Apri la rubrica professionisti</a>.
                </div>
              )}
              {!professionistaId && collaboratore?.collaboratore_esterno_nome ? <p className="mt-1.5 text-xs text-gray-500">Collaboratore storico: {collaboratore.collaboratore_esterno_nome}. Selezionalo dalla rubrica per collegarlo.</p> : null}
            </Field>
          )}
          <Field label="Modalità di calcolo">
            <select value={modalita} onChange={(e) => setModalita(e.target.value as ModalitaCalcoloCollaboratore)} className={inputClass}>
              <option value="importo_fisso">Importo fisso</option>
              <option value="percentuale_compenso">Percentuale sul compenso</option>
              <option value="percentuale_quota_fidepa">Percentuale sulla trattenuta FIDEPA</option>
            </select>
          </Field>
          {percentualeRichiesta ? (
            <Field label="Percentuale"><input inputMode="decimal" value={percentuale} onChange={(e) => setPercentuale(e.target.value)} className={inputClass} /></Field>
          ) : (
            <Field label="Compenso concordato"><ImportoInput value={compenso} onChange={setCompenso} /></Field>
          )}
          {tipo === "esterno" ? (
            <div className="space-y-3 rounded-xl border border-[#2B2F5E]/10 bg-[#F8F9FB] p-4 sm:col-span-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Impostazioni fiscali</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="flex items-center gap-3 rounded-xl bg-white p-3 text-sm font-semibold text-[#2B2F5E]">
                  <input type="checkbox" checked={cassaAttiva} onChange={(event) => setCassaAttiva(event.target.checked)} className="h-4 w-4 accent-[#64B445]" />
                  <span className="flex-1">Cassa</span>
                  <input type="number" min="0" max="100" step="0.01" value={cassaPercentuale} onChange={(event) => setCassaPercentuale(event.target.value)} disabled={!cassaAttiva} aria-label="Aliquota Cassa" className="w-24 rounded-lg border border-gray-200 px-2 py-1.5 text-right disabled:bg-gray-100 disabled:text-gray-400" />
                  <span>%</span>
                </label>
                <label className="flex items-center gap-3 rounded-xl bg-white p-3 text-sm font-semibold text-[#2B2F5E]">
                  <input type="checkbox" checked={ivaAttiva} onChange={(event) => setIvaAttiva(event.target.checked)} className="h-4 w-4 accent-[#64B445]" />
                  <span className="flex-1">IVA</span>
                  <input type="number" min="0" max="100" step="0.01" value={ivaPercentuale} onChange={(event) => setIvaPercentuale(event.target.value)} disabled={!ivaAttiva} aria-label="Aliquota IVA" className="w-24 rounded-lg border border-gray-200 px-2 py-1.5 text-right disabled:bg-gray-100 disabled:text-gray-400" />
                  <span>%</span>
                </label>
              </div>
              <p className="text-xs text-gray-500">Valori iniziali: Cassa 4% e IVA 22%. Puoi disattivarli o modificare le aliquote.</p>
            </div>
          ) : (
            <div className="rounded-xl bg-[#E8F2FA] px-4 py-3"><p className="text-[10px] font-bold uppercase text-[#2D80B3]">Dati fiscali del personale</p><p className="mt-1 text-sm font-semibold text-[#2B2F5E]">Cassa {personaSelezionata?.economia_cassa_attiva ? `${parseImporto(personaSelezionata.economia_cassa_aliquota)}%` : "non prevista"} · IVA {personaSelezionata?.economia_iva_attiva ? `${parseImporto(personaSelezionata.economia_iva_aliquota)}%` : "non prevista"}</p></div>
          )}
          {tipo === "esterno" && professionistaSelezionato ? (
            <div className="rounded-xl bg-[#E8F2FA] px-4 py-3"><p className="text-[10px] font-bold uppercase text-[#2D80B3]">Dati dalla rubrica</p><p className="mt-1 text-sm font-semibold text-[#2B2F5E]">{professionistaSelezionato.professione || "Professione non indicata"}</p><p className="mt-1 text-xs text-gray-500">{professionistaSelezionato.partita_iva || "Partita IVA non indicata"}{professionistaSelezionato.pec ? ` · ${professionistaSelezionato.pec}` : ""}</p></div>
          ) : null}
          <div className="rounded-xl bg-[#F2F2F2] px-4 py-3"><p className="text-[10px] font-bold uppercase text-gray-400">Compenso calcolato</p><p className="mt-1 text-lg font-semibold text-[#2B2F5E]">{formattaEuro(compensoCalcolato)}</p></div>
        </div>
        <Field label="Note"><textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className={inputClass} /></Field>
        <FormError message={errore} />
        <div className="flex justify-end gap-2"><SecondaryButton onClick={onClose}>Annulla</SecondaryButton><PrimaryButton type="submit" disabled={salvataggio} icon="checkSquare">{salvataggio ? "Salvataggio..." : "Salva collaboratore"}</PrimaryButton></div>
      </form>
    </Modal>
  );
}

export function CollaboratorPaymentModal({
  economiaId,
  collaboratore,
  nomeCollaboratore,
  persona,
  onClose,
  onSave,
}: {
  economiaId: string;
  collaboratore: CollaboratoreAssegnato;
  nomeCollaboratore: string;
  persona?: PersonaEconomica | null;
  onClose: () => void;
  onSave: (
    documento: Omit<DocumentoCollaboratore, "created_at" | "updated_at" | "deleted_at">,
    movimento: Omit<MovimentoFinanziario, "created_at" | "updated_at" | "deleted_at">
  ) => Promise<void>;
}) {
  const [tipoPagamento, setTipoPagamento] = useState<"contanti" | "fattura">("contanti");
  const [data, setData] = useState(oggi());
  const [importo, setImporto] = useState("");
  const [numeroFattura, setNumeroFattura] = useState("");
  const [causale, setCausale] = useState("Compenso collaboratore");
  const [note, setNote] = useState("");
  const [errore, setErrore] = useState("");
  const [salvataggio, setSalvataggio] = useState(false);

  const personaleInterno = collaboratore.tipo === "personale";
  const { cassaAliquota, ivaAliquota } = aliquotePagamentoCollaboratore({
    tipo: collaboratore.tipo,
    conFattura: tipoPagamento === "fattura",
    cassaSalvata: collaboratore.cassa_aliquota,
    ivaSalvata: collaboratore.iva_aliquota,
    persona,
  });
  const fiscale = calcolaRigaFiscale({
    imponibile: importo,
    cassaAliquota,
    ivaAliquota,
    ritenutaAliquota: 0,
    bollo: 0,
    cassaBase: cassaAliquota > 0 ? "imponibile" : "nessuna",
    ivaBase: ivaAliquota > 0 ? "imponibile_cassa" : "nessuna",
    ritenutaBase: "nessuna",
  });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!data || parseImporto(importo) <= 0) {
      setErrore("Indica una data e un importo maggiore di zero.");
      return;
    }
    if (!causale.trim()) {
      setErrore("La causale è obbligatoria.");
      return;
    }
    setSalvataggio(true);
    setErrore("");
    try {
      await onSave(
        {
          id: "",
          collaboratore_id: collaboratore.id,
          data_documento: data,
          numero: tipoPagamento === "fattura" ? numeroFattura.trim() || null : null,
          tipologia: tipoPagamento === "fattura" ? "fattura" : "pagamento_contanti",
          descrizione: causale.trim(),
          imponibile: fiscale.imponibile,
          cassa_aliquota: cassaAliquota,
          cassa: fiscale.cassa,
          iva_aliquota: ivaAliquota,
          iva: fiscale.iva,
          ritenuta_aliquota: 0,
          ritenuta: 0,
          bollo: 0,
          totale: fiscale.totale,
          stato: "emesso",
          profilo_fiscale_id:
            tipoPagamento === "fattura" && personaleInterno
              ? collaboratore.profilo_fiscale_id
              : null,
          override_fiscale: false,
          override_fiscale_by: null,
          override_fiscale_at: null,
          valori_fiscali_precedenti: null,
          allegato_nome: null,
          allegato_url: null,
          note: note.trim() || null,
        },
        {
          id: "",
          economia_commessa_id: economiaId,
          direzione: "uscita",
          tipologia: "pagamento_collaboratore",
          collaboratore_id: collaboratore.id,
          costo_progetto_id: null,
          data_movimento: data,
          importo: fiscale.totale,
          imponibile: fiscale.imponibile,
          cassa_aliquota: cassaAliquota,
          cassa: fiscale.cassa,
          iva_aliquota: ivaAliquota,
          iva: fiscale.iva,
          modalita: tipoPagamento === "contanti" ? "contanti" : "bonifico",
          soggetto: nomeCollaboratore,
          conto_cassa: tipoPagamento === "contanti" ? "Cassa" : "Conto corrente",
          causale: causale.trim(),
          note: note.trim() || null,
          stato_riconciliazione: "da_documentare",
          anticipo_da_fatturare: false,
          legacy_source: null,
          legacy_id: null,
        }
      );
      onClose();
    } catch (error) {
      setErrore(erroreDa(error));
    } finally {
      setSalvataggio(false);
    }
  }

  return (
    <Modal title="Registra pagamento" description={`Pagamento a ${nomeCollaboratore}.`} onClose={onClose} size="lg">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Tipo di pagamento">
            <select value={tipoPagamento} onChange={(event) => setTipoPagamento(event.target.value as "contanti" | "fattura")} className={inputClass}>
              <option value="contanti">Contanti</option>
              <option value="fattura">Con fattura</option>
            </select>
          </Field>
          <Field label="Data"><input type="date" value={data} onChange={(event) => setData(event.target.value)} className={inputClass} required /></Field>
          <Field label="Importo compenso"><ImportoInput value={importo} onChange={setImporto} /></Field>
          {tipoPagamento === "fattura" ? <Field label="Numero fattura"><input value={numeroFattura} onChange={(event) => setNumeroFattura(event.target.value)} className={inputClass} /></Field> : null}
        </div>

        {tipoPagamento === "fattura" ? (
          <div className="grid grid-cols-2 gap-3 rounded-xl bg-[#E8F2FA] p-4 sm:grid-cols-4">
            <div className="col-span-2 border-b border-[#2D80B3]/15 pb-3 sm:col-span-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#2D80B3]">
                Profilo fiscale applicato
              </p>
              <p className="mt-1 text-sm font-semibold text-[#2B2F5E]">
                {personaleInterno
                  ? persona
                    ? "Dati aggiornati dalla pagina Personale"
                    : "Dati fiscali salvati nella commessa"
                  : "Aliquote salvate sul collaboratore"}
                {` · Cassa ${cassaAliquota > 0 ? `${cassaAliquota}%` : "non prevista"} · IVA ${ivaAliquota > 0 ? `${ivaAliquota}%` : "non prevista"}`}
              </p>
            </div>
            <MiniFiscalValue label={`Cassa ${cassaAliquota}%`} value={fiscale.cassa} />
            <MiniFiscalValue label={`IVA ${ivaAliquota}%`} value={fiscale.iva} />
            <MiniFiscalValue label="Imponibile" value={fiscale.imponibile} />
            <MiniFiscalValue label="Totale pagamento" value={fiscale.totale} strong />
          </div>
        ) : (
          <div className="rounded-xl bg-[#F2F2F2] px-4 py-3 text-sm text-[#2B2F5E]">Il pagamento in contanti non applica Cassa o IVA.</div>
        )}

        <Field label="Causale"><input value={causale} onChange={(event) => setCausale(event.target.value)} className={inputClass} required /></Field>
        <Field label="Note"><textarea value={note} onChange={(event) => setNote(event.target.value)} rows={2} className={inputClass} /></Field>
        <FormError message={errore} />
        <div className="flex justify-end gap-2"><SecondaryButton onClick={onClose}>Annulla</SecondaryButton><PrimaryButton type="submit" disabled={salvataggio} icon="checkSquare">{salvataggio ? "Salvataggio..." : "Registra pagamento"}</PrimaryButton></div>
      </form>
    </Modal>
  );
}

function MiniFiscalValue({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) {
  return <div><p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">{label}</p><p className={`mt-1 text-sm text-[#2B2F5E] ${strong ? "font-bold" : "font-semibold"}`}>{formattaEuro(value)}</p></div>;
}

export function CollaboratorDocumentModal({
  economiaId,
  collaboratore,
  profili,
  documento,
  importoProposto,
  onClose,
  onSave,
}: {
  economiaId: string;
  collaboratore: CollaboratoreAssegnato;
  profili: ProfiloFiscale[];
  documento?: DocumentoCollaboratore | null;
  importoProposto?: number;
  onClose: () => void;
  onSave: (value: Omit<DocumentoCollaboratore, "created_at" | "updated_at" | "deleted_at">) => Promise<void>;
}) {
  const personaleInterno = collaboratore.tipo === "personale";
  const profiloIniziale = profili.find((item) => item.id === (documento?.profilo_fiscale_id || collaboratore.profilo_fiscale_id));
  const [data, setData] = useState(documento?.data_documento || oggi());
  const [numero, setNumero] = useState(documento?.numero || "");
  const [tipologia, setTipologia] = useState(documento?.tipologia || "fattura");
  const [descrizione, setDescrizione] = useState(documento?.descrizione || "");
  const [imponibile, setImponibile] = useState(finalizzaInputImporto(documento?.imponibile || importoProposto || ""));
  const [profiloId, setProfiloId] = useState(documento?.profilo_fiscale_id || profiloIniziale?.id || "");
  const [cassaAliquota, setCassaAliquota] = useState(String(parseImporto(documento?.cassa_aliquota ?? (personaleInterno ? collaboratore.cassa_aliquota : profiloIniziale?.cassa_aliquota) ?? 0)));
  const [ivaAliquota, setIvaAliquota] = useState(String(parseImporto(documento?.iva_aliquota ?? (personaleInterno ? collaboratore.iva_aliquota : profiloIniziale?.iva_aliquota) ?? 0)));
  const [ritenutaAliquota, setRitenutaAliquota] = useState(String(parseImporto(documento?.ritenuta_aliquota ?? profiloIniziale?.ritenuta_aliquota ?? 0)));
  const [bollo, setBollo] = useState(finalizzaInputImporto(documento?.bollo ?? profiloIniziale?.bollo ?? ""));
  const [stato, setStato] = useState<DocumentoCollaboratore["stato"]>(documento?.stato || "emesso");
  const [override, setOverride] = useState(documento?.override_fiscale || false);
  const [allegatoNome, setAllegatoNome] = useState(documento?.allegato_nome || "");
  const [allegatoUrl, setAllegatoUrl] = useState(documento?.allegato_url || "");
  const [allegatoFile, setAllegatoFile] = useState<File | null>(null);
  const [note, setNote] = useState(documento?.note || "");
  const [errore, setErrore] = useState("");
  const [salvataggio, setSalvataggio] = useState(false);
  const profilo = profili.find((item) => item.id === profiloId);
  const fiscale = calcolaRigaFiscale({
    imponibile,
    cassaAliquota,
    ivaAliquota,
    ritenutaAliquota,
    bollo,
    cassaBase: personaleInterno ? (parseImporto(cassaAliquota) > 0 ? "imponibile" : "nessuna") : profilo?.cassa_base,
    ivaBase: personaleInterno ? (parseImporto(ivaAliquota) > 0 ? "imponibile_cassa" : "nessuna") : profilo?.iva_base,
    ritenutaBase: personaleInterno ? "nessuna" : profilo?.ritenuta_base,
  });

  function cambiaProfilo(id: string) {
    setProfiloId(id);
    const prossimo = profili.find((item) => item.id === id);
    if (!prossimo) return;
    setCassaAliquota(String(parseImporto(prossimo.cassa_aliquota)));
    setIvaAliquota(String(parseImporto(prossimo.iva_aliquota)));
    setRitenutaAliquota(String(parseImporto(prossimo.ritenuta_aliquota)));
    setBollo(finalizzaInputImporto(prossimo.bollo));
    setOverride(false);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const errori = validaDocumento({ data, descrizione, imponibile, totale: fiscale.totale, stato });
    if (!personaleInterno && !profiloId) errori.push({ campo: "profilo", messaggio: "Seleziona un profilo fiscale." });
    if (errori.length) { setErrore(errori[0].messaggio); return; }
    setSalvataggio(true);
    try {
      const allegatoCaricato = allegatoFile
        ? await caricaAllegatoEconomico(
            allegatoFile,
            economiaId,
            "documenti-collaboratori"
          )
        : null;
      await onSave({
        id: documento?.id || "",
        collaboratore_id: collaboratore.id,
        data_documento: data,
        numero: numero.trim() || null,
        tipologia,
        descrizione: descrizione.trim(),
        imponibile: fiscale.imponibile,
        cassa_aliquota: parseImporto(cassaAliquota),
        cassa: fiscale.cassa,
        iva_aliquota: parseImporto(ivaAliquota),
        iva: fiscale.iva,
        ritenuta_aliquota: parseImporto(ritenutaAliquota),
        ritenuta: fiscale.ritenuta,
        bollo: fiscale.bollo,
        totale: fiscale.totale,
        stato,
        profilo_fiscale_id: profiloId || collaboratore.profilo_fiscale_id,
        override_fiscale: override,
        override_fiscale_by: documento?.override_fiscale_by || null,
        override_fiscale_at: override ? new Date().toISOString() : null,
        valori_fiscali_precedenti: override && documento ? {
          cassa_aliquota: documento.cassa_aliquota,
          iva_aliquota: documento.iva_aliquota,
          ritenuta_aliquota: documento.ritenuta_aliquota,
        } : null,
        allegato_nome:
          allegatoCaricato?.nome || allegatoNome.trim() || null,
        allegato_url:
          allegatoCaricato?.percorso || allegatoUrl.trim() || null,
        note: note.trim() || null,
      });
      onClose();
    } catch (error) { setErrore(erroreDa(error)); } finally { setSalvataggio(false); }
  }

  function modificaAliquota(setter: (value: string) => void, value: string) { setter(value); setOverride(true); }
  return (
    <Modal title={documento ? "Modifica documento collaboratore" : "Inserisci documento collaboratore"} description="Il profilo fiscale determina Cassa, IVA, ritenuta e bollo; le modifiche manuali vengono evidenziate e registrate." onClose={onClose} size="2xl">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Data"><input type="date" value={data} onChange={(e) => setData(e.target.value)} className={inputClass} required /></Field>
          <Field label="Numero documento"><input value={numero} onChange={(e) => setNumero(e.target.value)} className={inputClass} /></Field>
          <Field label="Tipo documento"><input value={tipologia} onChange={(e) => setTipologia(e.target.value)} className={inputClass} required /></Field>
          <Field label="Stato"><select value={stato} onChange={(e) => setStato(e.target.value as DocumentoCollaboratore["stato"])} className={inputClass}>{["bozza","emesso","parzialmente_pagato","pagato","scaduto","annullato"].map((item) => <option key={item} value={item}>{item.replaceAll("_"," ")}</option>)}</select></Field>
          {personaleInterno ? (
            <div className="rounded-xl bg-[#E8F2FA] px-4 py-3"><p className="text-[10px] font-bold uppercase text-[#2D80B3]">Profilo fiscale interno</p><p className="mt-1 text-sm font-semibold text-[#2B2F5E]">Cassa {parseImporto(cassaAliquota)}% · IVA {parseImporto(ivaAliquota)}%</p></div>
          ) : (
            <Field label="Profilo fiscale"><select value={profiloId} onChange={(e) => cambiaProfilo(e.target.value)} className={inputClass} required><option value="">Seleziona profilo</option>{profili.filter((item) => item.codice !== "personale_interno").map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></Field>
          )}
          <Field label="Imponibile"><ImportoInput value={imponibile} onChange={setImponibile} /></Field>
        </div>
        <Field label="Descrizione"><input value={descrizione} onChange={(e) => setDescrizione(e.target.value)} className={inputClass} required /></Field>
        <div className={`rounded-xl border p-4 ${override ? "border-[#D79D06]/40 bg-[#FFF8E7]" : "border-gray-200 bg-[#F8F9FB]"}`}>
          <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold text-[#2B2F5E]">Trattamento fiscale</p>{override ? <span className="rounded-full bg-[#FFF4D6] px-2.5 py-1 text-[11px] font-semibold text-[#9A6800]">Override manuale</span> : null}</div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field label="Cassa %"><input inputMode="decimal" value={cassaAliquota} onChange={(e) => modificaAliquota(setCassaAliquota, e.target.value)} className={inputClass} /></Field>
            <Field label="IVA %"><input inputMode="decimal" value={ivaAliquota} onChange={(e) => modificaAliquota(setIvaAliquota, e.target.value)} className={inputClass} /></Field>
            <Field label="Ritenuta %"><input inputMode="decimal" value={ritenutaAliquota} onChange={(e) => modificaAliquota(setRitenutaAliquota, e.target.value)} className={inputClass} /></Field>
            <Field label="Bollo"><ImportoInput value={bollo} onChange={(value) => { setBollo(value); setOverride(true); }} compact /></Field>
          </div>
          <p className="mt-3 text-right text-sm text-[#2B2F5E]">Cassa {formattaEuro(fiscale.cassa)} · IVA {formattaEuro(fiscale.iva)} · Ritenuta {formattaEuro(fiscale.ritenuta)} · <strong>Totale {formattaEuro(fiscale.totale)}</strong></p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3"><Field label="Carica allegato" hint="Dimensione massima 20 MB."><input type="file" onChange={(e) => setAllegatoFile(e.target.files?.[0] || null)} className={inputClass} /></Field><Field label="Nome allegato"><input value={allegatoNome} onChange={(e) => setAllegatoNome(e.target.value)} className={inputClass} /></Field><Field label="Oppure URL allegato"><input type="url" value={allegatoUrl} onChange={(e) => setAllegatoUrl(e.target.value)} className={inputClass} placeholder="https://..." /></Field></div>
        <Field label="Note"><textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={inputClass} /></Field>
        <FormError message={errore} />
        <div className="flex justify-end gap-2"><SecondaryButton onClick={onClose}>Annulla</SecondaryButton><PrimaryButton type="submit" disabled={salvataggio} icon="checkSquare">{salvataggio ? "Salvataggio..." : "Salva documento"}</PrimaryButton></div>
      </form>
    </Modal>
  );
}

function nomeCollaboratore(item: CollaboratoreAssegnato, personale: PersonaEconomica[]) {
  return item.tipo === "personale"
    ? personale.find((persona) => persona.id === item.persona_id)?.nome || "Personale interno"
    : item.collaboratore_esterno_nome || "Collaboratore esterno";
}

export function MovementModal({
  economiaId,
  commessa,
  collaboratori,
  personale,
  movimento,
  direzioneIniziale = "entrata",
  collaboratoreIniziale,
  onClose,
  onSave,
}: {
  economiaId: string;
  commessa: CommessaEconomica;
  collaboratori: CollaboratoreAssegnato[];
  personale: PersonaEconomica[];
  movimento?: MovimentoFinanziario | null;
  direzioneIniziale?: MovimentoFinanziario["direzione"];
  collaboratoreIniziale?: string | null;
  onClose: () => void;
  onSave: (value: Omit<MovimentoFinanziario, "created_at" | "updated_at" | "deleted_at">) => Promise<void>;
}) {
  const direzione = movimento?.direzione || direzioneIniziale;
  const collaboratorePredefinito = collaboratori.find((item) => item.id === (movimento?.collaboratore_id || collaboratoreIniziale));
  const [data, setData] = useState(movimento?.data_movimento || oggi());
  const [importo, setImporto] = useState(finalizzaInputImporto(movimento?.importo || ""));
  const [modalita, setModalita] = useState<MovimentoFinanziario["modalita"]>(movimento?.modalita || "bonifico");
  const [collaboratoreId, setCollaboratoreId] = useState(movimento?.collaboratore_id || collaboratoreIniziale || "");
  const [soggetto, setSoggetto] = useState(movimento?.soggetto || (direzione === "entrata" ? commessa.cliente_nome || "" : collaboratorePredefinito ? nomeCollaboratore(collaboratorePredefinito, personale) : ""));
  const [contoCassa, setContoCassa] = useState(movimento?.conto_cassa || "");
  const [causale, setCausale] = useState(movimento?.causale || "");
  const [note, setNote] = useState(movimento?.note || "");
  const [anticipo, setAnticipo] = useState(movimento?.anticipo_da_fatturare || false);
  const [errore, setErrore] = useState("");
  const [salvataggio, setSalvataggio] = useState(false);

  function cambiaCollaboratore(id: string) {
    setCollaboratoreId(id);
    const item = collaboratori.find((collaboratore) => collaboratore.id === id);
    if (item) setSoggetto(nomeCollaboratore(item, personale));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const stato: MovimentoFinanziario["stato_riconciliazione"] =
      movimento?.stato_riconciliazione === "riconciliato"
        ? "riconciliato"
        : anticipo
          ? "da_associare"
          : "da_documentare";
    const bozza = {
      importo: parseImporto(importo), data_movimento: data, causale, soggetto, conto_cassa: contoCassa, stato_riconciliazione: stato,
    };
    const errori = validaMovimento(bozza, movimento?.stato_riconciliazione === "riconciliato" ? 1 : 0);
    if (direzione === "uscita" && !collaboratoreId) errori.push({ campo: "collaboratore", messaggio: "Seleziona il collaboratore pagato." });
    if (errori.length) { setErrore(errori[0].messaggio); return; }
    setSalvataggio(true);
    try {
      await onSave({
        id: movimento?.id || "",
        economia_commessa_id: economiaId,
        direzione,
        tipologia: direzione === "entrata" ? (anticipo ? "anticipo" : "incasso_cliente") : (anticipo ? "anticipo" : "pagamento_collaboratore"),
        collaboratore_id: direzione === "uscita" ? collaboratoreId : null,
        costo_progetto_id: movimento?.costo_progetto_id || null,
        data_movimento: data,
        importo: parseImporto(importo),
        modalita,
        soggetto: soggetto.trim(),
        conto_cassa: contoCassa.trim(),
        causale: causale.trim(),
        note: note.trim() || null,
        stato_riconciliazione: stato,
        anticipo_da_fatturare: anticipo,
        legacy_source: movimento?.legacy_source || null,
        legacy_id: movimento?.legacy_id || null,
      });
      onClose();
    } catch (error) { setErrore(erroreDa(error)); } finally { setSalvataggio(false); }
  }

  return (
    <Modal title={movimento ? "Modifica movimento" : direzione === "entrata" ? "Registra incasso" : "Registra pagamento"} description="La modalità di pagamento è indipendente dalla presenza del documento." onClose={onClose} size="2xl">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Data"><input type="date" value={data} onChange={(e) => setData(e.target.value)} className={inputClass} required /></Field>
          <Field label="Importo"><ImportoInput value={importo} onChange={setImporto} /></Field>
          <Field label="Modalità di pagamento"><select value={modalita} onChange={(e) => setModalita(e.target.value as MovimentoFinanziario["modalita"])} className={inputClass}>{["bonifico","contanti","carta","assegno","compensazione","altro"].map((item) => <option key={item} value={item}>{item}</option>)}</select></Field>
          {direzione === "uscita" ? <Field label="Collaboratore"><select value={collaboratoreId} onChange={(e) => cambiaCollaboratore(e.target.value)} className={inputClass} required><option value="">Seleziona collaboratore</option>{collaboratori.map((item) => <option key={item.id} value={item.id}>{nomeCollaboratore(item, personale)}</option>)}</select></Field> : null}
          <Field label={direzione === "entrata" ? "Soggetto pagante" : "Soggetto beneficiario"}><input value={soggetto} onChange={(e) => setSoggetto(e.target.value)} className={inputClass} required /></Field>
          <Field label="Conto o cassa"><input value={contoCassa} onChange={(e) => setContoCassa(e.target.value)} className={inputClass} placeholder="Es. conto corrente FIDEPA" required /></Field>
        </div>
        <Field label="Causale"><input value={causale} onChange={(e) => setCausale(e.target.value)} className={inputClass} required /></Field>
        <Field label="Note"><textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={inputClass} /></Field>
        <label className="flex items-start gap-3 rounded-xl border border-[#D79D06]/25 bg-[#FFF8E7] p-3 text-sm text-[#2B2F5E] cursor-pointer"><input type="checkbox" checked={anticipo} onChange={(e) => setAnticipo(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#D79D06]" /><span><strong className="block">Classifica come anticipo da fatturare/documentare</strong><span className="mt-0.5 block text-xs text-gray-500">Il movimento entra nel flusso finanziario, ma resta fuori dai totali fiscali finché non viene associato.</span></span></label>
        <FormError message={errore} />
        <div className="flex justify-end gap-2"><SecondaryButton onClick={onClose}>Annulla</SecondaryButton><PrimaryButton type="submit" disabled={salvataggio} icon="checkSquare">{salvataggio ? "Salvataggio..." : "Salva movimento"}</PrimaryButton></div>
      </form>
    </Modal>
  );
}

type AllocazioneDraft = { localId: string; documentoId: string; importo: string; consentiEccedenza: boolean };

export function ReconciliationModal({
  movimento,
  documentiAttivi,
  documentiCollaboratori,
  allocazioni,
  onCreateDocument,
  onClose,
  onSave,
}: {
  movimento: MovimentoFinanziario;
  documentiAttivi: DocumentoAttivo[];
  documentiCollaboratori: DocumentoCollaboratore[];
  allocazioni: AllocazioneMovimento[];
  onCreateDocument: () => void;
  onClose: () => void;
  onSave: (values: Array<Pick<AllocazioneMovimento, "documento_attivo_id" | "documento_collaboratore_id" | "importo" | "consenti_eccedenza">>) => Promise<void>;
}) {
  const opzioni = movimento.direzione === "entrata"
    ? documentiAttivi.filter((item) => item.stato !== "annullato" && item.tipologia !== "nota_credito")
    : documentiCollaboratori.filter((item) => item.stato !== "annullato" && (!movimento.collaboratore_id || item.collaboratore_id === movimento.collaboratore_id));
  const esistenti = allocazioni.filter((item) => item.movimento_id === movimento.id && !item.deleted_at);
  const [righe, setRighe] = useState<AllocazioneDraft[]>(() => esistenti.length ? esistenti.map((item) => ({ localId: item.id, documentoId: item.documento_attivo_id || item.documento_collaboratore_id || "", importo: finalizzaInputImporto(item.importo), consentiEccedenza: item.consenti_eccedenza })) : [{ localId: crypto.randomUUID(), documentoId: opzioni[0]?.id || "", importo: finalizzaInputImporto(movimento.importo), consentiEccedenza: false }]);
  const [errore, setErrore] = useState("");
  const [salvataggio, setSalvataggio] = useState(false);
  const totale = sommaImporti(righe.map((item) => item.importo));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const values = righe.filter((item) => item.documentoId && parseImporto(item.importo) > 0).map((item) => ({
      documento_attivo_id: movimento.direzione === "entrata" ? item.documentoId : null,
      documento_collaboratore_id: movimento.direzione === "uscita" ? item.documentoId : null,
      importo: parseImporto(item.importo),
      consenti_eccedenza: item.consentiEccedenza,
    }));
    const errori = validaAllocazioni({ movimento, allocazioni: values, documentiAttivi, documentiCollaboratori, allocazioniEsistenti: allocazioni });
    if (!values.length) errori.push({ campo: "allocazioni", messaggio: "Aggiungi almeno un'associazione valida." });
    if (errori.length) { setErrore(errori[0].messaggio); return; }
    setSalvataggio(true);
    try { await onSave(values); onClose(); } catch (error) { setErrore(erroreDa(error)); } finally { setSalvataggio(false); }
  }

  return (
    <Modal title="Riconcilia movimento" description={`Movimento di ${formattaEuro(movimento.importo)}. Può essere ripartito tra più documenti.`} onClose={onClose} size="2xl">
      {opzioni.length === 0 ? (
        <div className="space-y-4"><p className="rounded-xl border border-[#D79D06]/25 bg-[#FFF8E7] p-4 text-sm text-[#2B2F5E]">Non sono presenti documenti associabili.</p><div className="flex justify-end gap-2"><SecondaryButton onClick={onClose}>Chiudi</SecondaryButton><PrimaryButton onClick={onCreateDocument} icon="fileText">Crea documento</PrimaryButton></div></div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-3">
            {righe.map((riga) => (
              <div key={riga.localId} className="grid grid-cols-1 items-end gap-3 rounded-xl bg-[#F8F9FB] p-3 sm:grid-cols-[minmax(0,1fr)_170px_150px_40px]">
                <Field label="Documento"><select value={riga.documentoId} onChange={(e) => setRighe((correnti) => correnti.map((item) => item.localId === riga.localId ? { ...item, documentoId: e.target.value } : item))} className={inputClass}>{opzioni.map((item) => <option key={item.id} value={item.id}>{item.numero || "Senza numero"} · {item.descrizione} · {formattaEuro(item.totale)}</option>)}</select></Field>
                <Field label="Importo allocato"><ImportoInput value={riga.importo} onChange={(value) => setRighe((correnti) => correnti.map((item) => item.localId === riga.localId ? { ...item, importo: value } : item))} compact /></Field>
                <label className="flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-xs text-[#2B2F5E] cursor-pointer"><input type="checkbox" checked={riga.consentiEccedenza} onChange={(e) => setRighe((correnti) => correnti.map((item) => item.localId === riga.localId ? { ...item, consentiEccedenza: e.target.checked } : item))} className="h-4 w-4 accent-[#D79D06]" />Conferma eccedenza</label>
                <button type="button" onClick={() => setRighe((correnti) => correnti.filter((item) => item.localId !== riga.localId))} className="flex h-10 w-10 items-center justify-center rounded-xl text-red-500 hover:bg-red-50 cursor-pointer" aria-label="Rimuovi allocazione"><AppIcon name="x" size={15} /></button>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3"><SecondaryButton onClick={() => setRighe((correnti) => [...correnti, { localId: crypto.randomUUID(), documentoId: opzioni[0]?.id || "", importo: "", consentiEccedenza: false }])} icon="plus">Aggiungi allocazione</SecondaryButton><p className={`text-sm font-semibold ${totale > parseImporto(movimento.importo) ? "text-red-600" : "text-[#2B2F5E]"}`}>Allocato {formattaEuro(totale)} / {formattaEuro(movimento.importo)}</p></div>
          <FormError message={errore} />
          <div className="flex justify-end gap-2"><SecondaryButton onClick={onClose}>Annulla</SecondaryButton><PrimaryButton type="submit" disabled={salvataggio} icon="checkSquare">{salvataggio ? "Salvataggio..." : "Salva riconciliazione"}</PrimaryButton></div>
        </form>
      )}
    </Modal>
  );
}

export function ProjectCostModal({
  economiaId,
  costo,
  onClose,
  onSave,
}: {
  economiaId: string;
  costo?: CostoProgettoLegacy | null;
  onClose: () => void;
  onSave: (value: Omit<CostoProgettoLegacy, "id"> & { id?: string }) => Promise<void>;
}) {
  const [descrizione, setDescrizione] = useState(costo?.descrizione || "");
  const [importo, setImporto] = useState(finalizzaInputImporto(costo?.importo || ""));
  const [cassa, setCassa] = useState(finalizzaInputImporto(costo?.cassa || ""));
  const [iva, setIva] = useState(finalizzaInputImporto(costo?.iva || ""));
  const [errore, setErrore] = useState("");
  const [salvataggio, setSalvataggio] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!descrizione.trim() || parseImporto(importo) <= 0) { setErrore("Inserisci descrizione e importo maggiore di zero."); return; }
    setSalvataggio(true);
    try { await onSave({ id: costo?.id, economia_commessa_id: economiaId, descrizione: descrizione.trim(), importo: parseImporto(importo), cassa: parseImporto(cassa), iva: parseImporto(iva) }); onClose(); } catch (error) { setErrore(erroreDa(error)); } finally { setSalvataggio(false); }
  }
  return (
    <Modal title={costo ? "Modifica costo previsto" : "Aggiungi costo previsto"} onClose={onClose} size="lg">
      <form onSubmit={submit} className="space-y-4"><Field label="Descrizione"><input value={descrizione} onChange={(e) => setDescrizione(e.target.value)} className={inputClass} required /></Field><div className="grid grid-cols-1 gap-4 sm:grid-cols-3"><Field label="Imponibile"><ImportoInput value={importo} onChange={setImporto} /></Field><Field label="Cassa prevista"><ImportoInput value={cassa} onChange={setCassa} /></Field><Field label="IVA prevista"><ImportoInput value={iva} onChange={setIva} /></Field></div><FormError message={errore} /><div className="flex justify-end gap-2"><SecondaryButton onClick={onClose}>Annulla</SecondaryButton><PrimaryButton type="submit" disabled={salvataggio} icon="checkSquare">{salvataggio ? "Salvataggio..." : "Salva costo"}</PrimaryButton></div></form>
    </Modal>
  );
}
