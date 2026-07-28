import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function importaModuloTypeScript(percorso, sostituzioni = []) {
  let sorgente = await readFile(new URL(percorso, import.meta.url), "utf8");
  for (const [da, a] of sostituzioni) sorgente = sorgente.replaceAll(da, a);
  const compilato = ts.transpileModule(sorgente, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  return `data:text/javascript;base64,${Buffer.from(compilato).toString("base64")}`;
}

const importiUrl = await importaModuloTypeScript("../lib/importi.ts");
const calcoliUrl = await importaModuloTypeScript("../lib/economia-commesse/calcoli.ts", [
  ['"@/lib/importi"', `"${importiUrl}"`],
]);
const economiaUrl = await importaModuloTypeScript("../lib/economia.ts", [
  ['"@/lib/importi"', `"${importiUrl}"`],
]);
const {
  aliquotePagamentoCollaboratore,
  calcolaQuoteTrattenutaFidepa,
  calcolaRigaFiscale,
  calcolaRiepilogoEconomico,
} = await import(calcoliUrl);
const { costoSocietaAnnualeNetto, movimentiCostoSocietaMaturati } = await import(
  economiaUrl
);

const schedaBase = {
  compenso_iniziale: 19_325,
  compenso: 19_325,
  rimborso_spese: 500,
};

function documentoAttivo(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    tipologia: "fattura",
    stato: "emesso",
    rilevanza_fiscale: true,
    imponibile: 1_000,
    totale: 1_268.8,
    deleted_at: null,
    ...overrides,
  };
}

function documentoCollaboratore(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    collaboratore_id: "collab-1",
    stato: "emesso",
    imponibile: 1_000,
    totale: 1_068.8,
    deleted_at: null,
    ...overrides,
  };
}

function movimento(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    direzione: "entrata",
    importo: 100,
    stato_riconciliazione: "da_documentare",
    collaboratore_id: null,
    deleted_at: null,
    ...overrides,
  };
}

function riepilogo(overrides = {}) {
  return calcolaRiepilogoEconomico({
    scheda: schedaBase,
    variazioni: [],
    documentiAttivi: [],
    collaboratori: [],
    documentiCollaboratori: [],
    movimenti: [],
    allocazioni: [],
    costiProgetto: [],
    ...overrides,
  });
}

test("1. incasso completamente riconciliato", () => {
  const doc = documentoAttivo({ totale: 100 });
  const mov = movimento({ stato_riconciliazione: "riconciliato" });
  const result = riepilogo({
    documentiAttivi: [doc],
    movimenti: [mov],
    allocazioni: [{ movimento_id: mov.id, documento_attivo_id: doc.id, documento_collaboratore_id: null, importo: 100, deleted_at: null }],
  });
  assert.equal(result.incassiRiconciliati, 100);
  assert.equal(result.incassiDaDocumentare, 0);
});

test("2. incasso non documentato", () => {
  const result = riepilogo({ movimenti: [movimento({ importo: 100 })] });
  assert.equal(result.incassiTotali, 100);
  assert.equal(result.incassiDaDocumentare, 100);
  assert.equal(result.ricaviDocumentati, 0);
});

test("3. incasso parzialmente associato", () => {
  const doc = documentoAttivo({ totale: 100 });
  const mov = movimento({ importo: 100, stato_riconciliazione: "parzialmente_riconciliato" });
  const result = riepilogo({ documentiAttivi: [doc], movimenti: [mov], allocazioni: [{ movimento_id: mov.id, documento_attivo_id: doc.id, documento_collaboratore_id: null, importo: 40, deleted_at: null }] });
  assert.equal(result.incassiRiconciliati, 40);
  assert.equal(result.incassiDaDocumentare, 60);
});

test("4. fattura pagata con più incassi", () => {
  const doc = documentoAttivo({ totale: 100 });
  const a = movimento({ importo: 40 });
  const b = movimento({ importo: 60 });
  const result = riepilogo({ documentiAttivi: [doc], movimenti: [a, b], allocazioni: [{ movimento_id: a.id, documento_attivo_id: doc.id, documento_collaboratore_id: null, importo: 40, deleted_at: null }, { movimento_id: b.id, documento_attivo_id: doc.id, documento_collaboratore_id: null, importo: 60, deleted_at: null }] });
  assert.equal(result.fattureDaIncassare, 0);
});

test("5. incasso diviso tra più fatture", () => {
  const a = documentoAttivo({ totale: 40 });
  const b = documentoAttivo({ totale: 60 });
  const mov = movimento({ importo: 100 });
  const result = riepilogo({ documentiAttivi: [a, b], movimenti: [mov], allocazioni: [{ movimento_id: mov.id, documento_attivo_id: a.id, documento_collaboratore_id: null, importo: 40, deleted_at: null }, { movimento_id: mov.id, documento_attivo_id: b.id, documento_collaboratore_id: null, importo: 60, deleted_at: null }] });
  assert.equal(result.incassiRiconciliati, 100);
});

test("6. pagamento collaboratore senza documento", () => {
  const mov = movimento({ direzione: "uscita", collaboratore_id: "collab-1", importo: 100 });
  const result = riepilogo({ movimenti: [mov] });
  assert.equal(result.pagatoCollaboratori, 100);
  assert.equal(result.pagamentiDaDocumentare, 100);
  assert.equal(result.costiDocumentati, 0);
});

test("7. documento collaboratore pagato in più tranche", () => {
  const doc = documentoCollaboratore({ totale: 100 });
  const a = movimento({ direzione: "uscita", collaboratore_id: "collab-1", importo: 30 });
  const b = movimento({ direzione: "uscita", collaboratore_id: "collab-1", importo: 70 });
  const result = riepilogo({ documentiCollaboratori: [doc], movimenti: [a, b], allocazioni: [{ movimento_id: a.id, documento_attivo_id: null, documento_collaboratore_id: doc.id, importo: 30, deleted_at: null }, { movimento_id: b.id, documento_attivo_id: null, documento_collaboratore_id: doc.id, importo: 70, deleted_at: null }] });
  assert.equal(result.documentiCollaboratoriDaPagare, 0);
});

test("8. collaboratore con Cassa 4%, IVA 22% e ritenuta 20%", () => {
  assert.deepEqual(calcolaRigaFiscale({ imponibile: 1_000, cassaAliquota: 4, ivaAliquota: 22, ritenutaAliquota: 20, cassaBase: "imponibile", ivaBase: "imponibile_cassa", ritenutaBase: "imponibile" }), {
    imponibile: 1_000, cassa: 40, iva: 228.8, ritenuta: 200, bollo: 0, totale: 1_068.8,
  });
});

test("9. collaboratore forfettario", () => {
  const result = calcolaRigaFiscale({ imponibile: 1_000, cassaAliquota: 4, ivaAliquota: 0, ritenutaAliquota: 0, bollo: 2, cassaBase: "imponibile", ivaBase: "nessuna", ritenutaBase: "nessuna" });
  assert.equal(result.totale, 1_042);
  assert.equal(result.iva, 0);
  assert.equal(result.ritenuta, 0);
});

test("10. nota di credito riduce i ricavi", () => {
  const result = riepilogo({ documentiAttivi: [documentoAttivo({ imponibile: 1_000, totale: 1_000 }), documentoAttivo({ tipologia: "nota_credito", imponibile: 100, totale: 100 })] });
  assert.equal(result.ricaviDocumentati, 900);
  assert.equal(result.fattureDaIncassare, 900);
});

test("11. variazione economica", () => {
  const result = riepilogo({ variazioni: [{ tipologia: "aumento", importo: 100, deleted_at: null }] });
  assert.equal(result.valoreAggiornato, 19_925);
});

test("12. calcolo del margine previsto", () => {
  const result = riepilogo({ collaboratori: [{ compenso: 1_000, deleted_at: null }], variazioni: [{ tipologia: "aumento", importo: 100, deleted_at: null }] });
  assert.equal(result.marginePrevisto, 18_925);
});

test("13. calcolo del margine documentato", () => {
  const result = riepilogo({ documentiAttivi: [documentoAttivo({ imponibile: 1_000 })], documentiCollaboratori: [documentoCollaboratore({ imponibile: 300 })] });
  assert.equal(result.margineDocumentato, 700);
});

test("14. calcolo del saldo finanziario", () => {
  const result = riepilogo({ movimenti: [movimento({ direzione: "entrata", importo: 100 }), movimento({ direzione: "uscita", importo: 40 })] });
  assert.equal(result.saldoFinanziario, 60);
});

test("15. movimenti non documentati esclusi dai totali fiscali", () => {
  const result = riepilogo({ movimenti: [movimento({ importo: 500 }), movimento({ direzione: "uscita", importo: 200 })] });
  assert.equal(result.ricaviDocumentati, 0);
  assert.equal(result.costiDocumentati, 0);
  assert.equal(result.saldoFinanziario, 300);
});

test("16. compatibilità con compenso legacy", () => {
  const result = riepilogo({ scheda: { compenso_iniziale: null, compenso: 19_325, rimborso_spese: 500 } });
  assert.equal(result.valoreIniziale, 19_825);
  assert.equal(result.rimborsiPrevisti, 0);
  assert.equal(result.valoreAggiornato, 19_825);
});

test("17. aliquote fiscali del personale interno", () => {
  const result = calcolaRigaFiscale({
    imponibile: 1_000,
    cassaAliquota: 4,
    ivaAliquota: 22,
    ritenutaAliquota: 0,
    cassaBase: "imponibile",
    ivaBase: "imponibile_cassa",
    ritenutaBase: "nessuna",
  });
  assert.equal(result.cassa, 40);
  assert.equal(result.iva, 228.8);
  assert.equal(result.totale, 1_268.8);
});

test("18. pagamento in contanti senza Cassa e IVA", () => {
  const result = calcolaRigaFiscale({
    imponibile: 1_000,
    cassaAliquota: 0,
    ivaAliquota: 0,
    ritenutaAliquota: 0,
    cassaBase: "nessuna",
    ivaBase: "nessuna",
    ritenutaBase: "nessuna",
  });
  assert.equal(result.cassa, 0);
  assert.equal(result.iva, 0);
  assert.equal(result.totale, 1_000);
});

test("19. incasso elettronico con Cassa 4% e IVA 22%", () => {
  const result = calcolaRigaFiscale({
    imponibile: 1_000,
    cassaAliquota: 4,
    ivaAliquota: 22,
    ritenutaAliquota: 0,
    cassaBase: "imponibile",
    ivaBase: "imponibile_cassa",
    ritenutaBase: "nessuna",
  });
  assert.equal(result.cassa, 40);
  assert.equal(result.iva, 228.8);
  assert.equal(result.totale, 1_268.8);
});

test("20. incasso semplificato non richiede associazioni", () => {
  const result = riepilogo({
    movimenti: [movimento({ importo: 1_268.8, imponibile: 1_000, stato_riconciliazione: "riconciliato" })],
  });
  assert.equal(result.incassiRiconciliati, 1_268.8);
  assert.equal(result.incassiDaDocumentare, 0);
});

test("21. riepilogo compatto con imposte e margini", () => {
  const result = riepilogo({
    collaboratori: [{ compenso: 1_000, deleted_at: null }],
    movimenti: [
      movimento({ importo: 1_268.8, imponibile: 1_000, cassa: 40, iva: 228.8 }),
      movimento({
        direzione: "uscita",
        collaboratore_id: "collab-1",
        importo: 634.4,
        imponibile: 500,
        cassa: 20,
        iva: 114.4,
      }),
    ],
  });
  assert.equal(result.daIncassare, 18_556.2);
  assert.equal(result.costiPagati, 634.4);
  assert.equal(result.costiDaPagare, 365.6);
  assert.equal(result.cassaDaVersare, 20);
  assert.equal(result.ivaDaVersare, 114.4);
  assert.equal(result.margineAttuale, 19_190.6);
  assert.equal(result.marginePrevisto, 18_825);
});

test("22. costi annuali maturati al primo giorno del mese", () => {
  const movimenti = movimentiCostoSocietaMaturati(
    {
      frequenza: "Annuale",
      importo: 100,
      cassa: 4,
      iva: 22.88,
      data_riferimento: "2026-01-01",
      attivo: true,
    },
    new Date(2026, 6, 27)
  );
  assert.equal(movimenti.length, 7);
  assert.equal(movimenti[0].dataPagamento, "2026-01-01");
  assert.equal(movimenti[6].dataPagamento, "2026-07-01");
});

test("23. costi mensili normalizzati al primo giorno", () => {
  const movimenti = movimentiCostoSocietaMaturati(
    {
      frequenza: "Mensile",
      importo: 100,
      data_inizio: "2026-03-15",
      numero_mesi: 3,
      attivo: true,
    },
    new Date(2026, 11, 31)
  );
  assert.deepEqual(
    movimenti.map((movimento) => movimento.dataPagamento),
    ["2026-03-01", "2026-04-01", "2026-05-01"]
  );
});

test("24. pagamento con fattura usa il profilo aggiornato del personale", () => {
  const aliquote = aliquotePagamentoCollaboratore({
    tipo: "personale",
    conFattura: true,
    cassaSalvata: 0,
    ivaSalvata: 0,
    persona: {
      economia_cassa_attiva: true,
      economia_cassa_aliquota: 4,
      economia_iva_attiva: true,
      economia_iva_aliquota: 22,
    },
  });
  const fiscale = calcolaRigaFiscale({
    imponibile: 1_000,
    ...aliquote,
    ritenutaAliquota: 0,
    cassaBase: "imponibile",
    ivaBase: "imponibile_cassa",
    ritenutaBase: "nessuna",
  });

  assert.deepEqual(aliquote, { cassaAliquota: 4, ivaAliquota: 22 });
  assert.equal(fiscale.cassa, 40);
  assert.equal(fiscale.iva, 228.8);
  assert.equal(fiscale.totale, 1_268.8);
});

test("25. collaboratore esterno usa le aliquote salvate senza profilo fiscale", () => {
  const aliquote = aliquotePagamentoCollaboratore({
    tipo: "esterno",
    conFattura: true,
    cassaSalvata: 4,
    ivaSalvata: 22,
  });
  const fiscale = calcolaRigaFiscale({
    imponibile: 1_000,
    ...aliquote,
    ritenutaAliquota: 0,
    cassaBase: "imponibile",
    ivaBase: "imponibile_cassa",
    ritenutaBase: "nessuna",
  });
  assert.deepEqual(aliquote, { cassaAliquota: 4, ivaAliquota: 22 });
  assert.equal(fiscale.cassa, 40);
  assert.equal(fiscale.iva, 228.8);
  assert.equal(fiscale.totale, 1_268.8);
});

test("26. FISSO e OPERATIVO sono calcolati entrambi sul totale", () => {
  const quote = calcolaQuoteTrattenutaFidepa({
    valoreTotale: 19_825,
    fissoPercentuale: 10,
    operativoPercentuale: 5,
  });

  assert.deepEqual(quote, {
    quotaFisso: 1_982.5,
    quotaOperativo: 991.25,
    quotaTotale: 2_973.75,
  });
});

test("27. spesa una tantum matura alla data effettiva di pagamento", () => {
  const costo = {
    categoria: "Collaboratori",
    frequenza: "Una tantum",
    importo: 500,
    cassa: 20,
    iva: 114.4,
    data_riferimento: "2026-07-15",
    attivo: true,
  };

  assert.deepEqual(
    movimentiCostoSocietaMaturati(costo, new Date(2026, 6, 14)),
    []
  );
  assert.deepEqual(
    movimentiCostoSocietaMaturati(costo, new Date(2026, 6, 15)),
    [
      {
        dataPagamento: "2026-07-15",
        importo: 500,
        cassa: 20,
        iva: 114.4,
      },
    ]
  );
});

test("28. la Cassa è conteggiata solo nei costi collaboratori", () => {
  const base = {
    frequenza: "Una tantum",
    importo: 500,
    cassa: 20,
    iva: 114.4,
    data_riferimento: "2026-07-15",
    attivo: true,
  };
  const [studio] = movimentiCostoSocietaMaturati(
    { ...base, categoria: "Studio" },
    new Date(2026, 6, 15)
  );
  const [collaboratore] = movimentiCostoSocietaMaturati(
    { ...base, categoria: "Collaboratori" },
    new Date(2026, 6, 15)
  );

  assert.equal(studio.cassa, 0);
  assert.equal(studio.iva, 114.4);
  assert.equal(collaboratore.cassa, 20);
  assert.equal(collaboratore.iva, 114.4);
});

test("29. le spese studio ricorrono nel giorno di partenza", () => {
  const movimenti = movimentiCostoSocietaMaturati(
    {
      categoria: "Studio",
      frequenza: "Mensile",
      importo: 100,
      iva: 22,
      data_inizio: "2026-01-31",
      data_fine: "2026-04-30",
      attivo: true,
    },
    new Date(2026, 3, 30)
  );

  assert.deepEqual(
    movimenti.map((movimento) => movimento.dataPagamento),
    ["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"]
  );
});

test("30. una spesa studio in corso resta prevista per tutto l'anno", () => {
  const costo = {
    categoria: "Studio",
    frequenza: "Mensile",
    importo: 100,
    data_inizio: "2025-05-15",
    data_fine: null,
    numero_mesi: null,
    attivo: true,
  };

  assert.equal(costoSocietaAnnualeNetto(costo, 2026), 1_200);
  assert.equal(
    movimentiCostoSocietaMaturati(costo, new Date(2026, 2, 14)).filter(
      (movimento) => movimento.dataPagamento.startsWith("2026-")
    ).length,
    2
  );
});

test("31. la data ultima interrompe i costi prima della ricorrenza successiva", () => {
  const costo = {
    categoria: "Studio",
    frequenza: "Mensile",
    importo: 100,
    data_inizio: "2025-05-15",
    data_fine: "2026-03-10",
    numero_mesi: null,
    attivo: true,
  };

  assert.equal(costoSocietaAnnualeNetto(costo, 2026), 200);
});

test("32. il compenso continuativo applica le variazioni dalla decorrenza", () => {
  const costo = {
    categoria: "Collaboratori",
    frequenza: "Mensile",
    importo: 1_000,
    cassa: 0,
    iva: 0,
    cassa_aliquota: 4,
    iva_aliquota: 22,
    data_inizio: "2026-01-31",
    data_fine: "2026-04-30",
    numero_mesi: null,
    variazioni: [{ data_decorrenza: "2026-03-01", importo: 1_200 }],
    attivo: true,
  };
  const movimenti = movimentiCostoSocietaMaturati(
    costo,
    new Date(2026, 3, 30)
  );

  assert.deepEqual(
    movimenti.map((movimento) => movimento.importo),
    [1_000, 1_000, 1_200, 1_200]
  );
  assert.deepEqual(
    movimenti.map((movimento) => movimento.cassa),
    [40, 40, 48, 48]
  );
  assert.deepEqual(
    movimenti.map((movimento) => movimento.iva),
    [228.8, 228.8, 274.56, 274.56]
  );
  assert.equal(costoSocietaAnnualeNetto(costo, 2026), 4_400);
});

test("33. il collaboratore in corso prosegue senza data finale", () => {
  const movimenti = movimentiCostoSocietaMaturati(
    {
      categoria: "Collaboratori",
      frequenza: "Mensile",
      importo: 1_000,
      cassa_aliquota: 0,
      iva_aliquota: 0,
      data_inizio: "2026-01-15",
      data_fine: null,
      variazioni: [],
      attivo: true,
    },
    new Date(2026, 2, 14)
  );

  assert.deepEqual(
    movimenti.map((movimento) => movimento.dataPagamento),
    ["2026-01-15", "2026-02-15"]
  );
});

test("34. il profilo personale disattivato prevale sui vecchi importi fiscali", () => {
  const [movimento] = movimentiCostoSocietaMaturati(
    {
      categoria: "Collaboratori",
      frequenza: "Mensile",
      importo: 1_000,
      cassa: 40,
      iva: 228.8,
      cassa_aliquota: 0,
      iva_aliquota: 0,
      data_inizio: "2026-01-15",
      data_fine: "2026-01-15",
      variazioni: [],
      attivo: true,
    },
    new Date(2026, 0, 15)
  );

  assert.equal(movimento.cassa, 0);
  assert.equal(movimento.iva, 0);
});

test("35. il riepilogo annuale isola pagato e previsto per l'anno scelto", () => {
  const costo = {
    categoria: "Collaboratori",
    frequenza: "Mensile",
    importo: 1_000,
    cassa_aliquota: 4,
    iva_aliquota: 22,
    data_inizio: "2026-12-15",
    data_fine: null,
    variazioni: [{ data_decorrenza: "2027-03-01", importo: 1_200 }],
    attivo: true,
  };
  const movimentiAllaDataOdierna = movimentiCostoSocietaMaturati(
    costo,
    new Date(2026, 6, 28)
  );

  assert.equal(
    movimentiAllaDataOdierna.filter((movimento) =>
      movimento.dataPagamento.startsWith("2027-")
    ).length,
    0
  );
  assert.equal(costoSocietaAnnualeNetto(costo, 2027), 14_000);
});
