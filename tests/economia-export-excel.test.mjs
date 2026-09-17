import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
const excelJsUrl = pathToFileURL(require.resolve("exceljs")).href;

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
const exportUrl = await importaModuloTypeScript("../lib/economia-commesse/export-excel.ts", [
  ['"@/lib/importi"', `"${importiUrl}"`],
  ['import("exceljs")', `import("${excelJsUrl}")`],
]);
const { creaFileExcelCommessa } = await import(exportUrl);

function inputBase() {
  return {
    commessa: {
      id: "commessa-1",
      codice: "26_001",
      titolo: "Riqualificazione uffici",
      cliente_nome: "Cliente Demo",
      data_inizio: "2026-01-15",
      data_fine: "2026-09-30",
      created_at: "2026-01-10T10:00:00Z",
    },
    scheda: {
      id: "economia-1",
      commessa_id: "commessa-1",
      anno: 2026,
      compenso: 10000,
      compenso_iniziale: 10000,
      preventivo_numero: "26001",
      rimborso_spese: 0,
      trattenuta_percentuale: 15,
      trattenuta_fisso_percentuale: 10,
      trattenuta_operativo_percentuale: 5,
      cassa: 0,
      iva: 0,
      fatturato_come_ing_pascale: false,
      soggetto_fiscale_id: "soggetto-1",
      note: "Nota commessa",
      created_at: "2026-01-10T10:00:00Z",
      updated_at: null,
      deleted_at: null,
    },
    workspace: {
      variazioni: [
        {
          id: "v-1",
          economia_commessa_id: "economia-1",
          data_variazione: "2026-02-01",
          descrizione: "Servizio aggiuntivo",
          importo: 500,
          tipologia: "aumento",
          documento_attivo_id: null,
          created_by: null,
          created_at: "2026-02-01T10:00:00Z",
          updated_at: null,
          deleted_at: null,
        },
      ],
      documentiAttivi: [],
      righeDocumentiAttivi: [],
      collaboratori: [],
      documentiCollaboratori: [],
      movimenti: [
        {
          id: "m-1",
          economia_commessa_id: "economia-1",
          direzione: "entrata",
          tipologia: "incasso_cliente",
          collaboratore_id: null,
          costo_progetto_id: null,
          data_movimento: "2026-03-15",
          importo: 2500,
          imponibile: 2000,
          cassa: 80,
          iva: 457.6,
          modalita: "bonifico",
          soggetto: "Cliente Demo",
          conto_cassa: "Banca",
          causale: "Acconto",
          note: null,
          stato_riconciliazione: "riconciliato",
          anticipo_da_fatturare: false,
          legacy_source: null,
          legacy_id: null,
          created_at: "2026-03-15T10:00:00Z",
          updated_at: null,
          deleted_at: null,
        },
      ],
      allocazioni: [],
      anomalie: [],
      costiProgetto: [{ id: "c-1", economia_commessa_id: "economia-1", descrizione: "Pratiche", importo: 300, cassa: 0, iva: 66 }],
    },
    riepilogo: {
      valoreIniziale: 10000,
      variazioniAumento: 500,
      variazioniDiminuzione: 0,
      variazioniNette: 500,
      rimborsiPrevisti: 0,
      valoreAggiornato: 10500,
      costiPrevisti: 300,
      costiPagati: 0,
      costiDaPagare: 300,
      marginePrevisto: 10200,
      margineAttuale: 10500,
      ricaviDocumentati: 0,
      costiDocumentati: 0,
      residuoDaFatturare: 10500,
      fattureDaIncassare: 0,
      documentiCollaboratoriDaRicevere: 0,
      documentiCollaboratoriDaPagare: 0,
      margineDocumentato: 0,
      incassiTotali: 2500,
      daIncassare: 8000,
      pagamentiTotali: 0,
      incassiRiconciliati: 2500,
      incassiDaDocumentare: 0,
      pagamentiRiconciliati: 0,
      pagamentiDaDocumentare: 0,
      pagatoCollaboratori: 0,
      cassaIncassata: 80,
      cassaPagata: 0,
      cassaDaVersare: 80,
      ivaIncassata: 457.6,
      ivaPagata: 0,
      ivaDaVersare: 457.6,
      saldoFinanziario: 2500,
    },
    preventivo: {
      numero: "26001",
      cliente: "Cliente Demo",
      oggetto: "Riqualificazione uffici",
      imponibile: 10000,
      cassa: 400,
      iva: 2288,
      sconto: 0,
      totale: 12688,
      data: "15/01/2026",
      lavorazioni: [
        {
          nome: "Progetto esecutivo",
          descrizione: "Elaborati e coordinamento",
          categoria: "Progettazione",
          macrocategoria: "Progettazione",
          importo: 10000,
        },
      ],
      pagamento: { anticipo: 20, progettazione: 80 },
    },
    soggettoFiscale: {
      id: "soggetto-1",
      nome: "FIDEPA S.R.L.",
      intestazione: null,
      cassa_aliquota: 4,
      iva_aliquota: 22,
      ritenuta_aliquota: 0,
      attivo: true,
    },
    personale: [],
    professionisti: [],
    profili: [],
  };
}

test("l'export crea un workbook FIDEPA completo e stampabile in A4", async () => {
  const contenuto = await creaFileExcelCommessa(inputBase());
  const excelJsModule = await import(excelJsUrl);
  const ExcelJS = excelJsModule.default || excelJsModule;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(contenuto);

  assert.deepEqual(
    workbook.worksheets.slice(0, 5).map((foglio) => foglio.name),
    ["Riepilogo", "Dati commessa", "Preventivo", "Attività lavorative", "Piano pagamenti"]
  );
  assert.ok(workbook.getWorksheet("Incassi e pagamenti"));
  assert.ok(workbook.getWorksheet("Documenti ricavi"));
  assert.equal(workbook.getWorksheet("Riepilogo").pageSetup.paperSize, 9);
  assert.equal(workbook.getWorksheet("Riepilogo").pageSetup.orientation, "portrait");
  assert.equal(workbook.getWorksheet("Riepilogo").getCell("A1").fill.fgColor.argb, "2B2F5E");
  assert.equal(workbook.getWorksheet("Attività lavorative").pageSetup.fitToWidth, 1);
  assert.equal(workbook.getWorksheet("Attività lavorative").pageSetup.printTitlesRow, "4:4");
  assert.equal(workbook.getWorksheet("Attività lavorative").getCell("A4").fill.fgColor.argb, "5E9AD3");
  assert.equal(workbook.getWorksheet("Attività lavorative").getCell("D5").value, "Progetto esecutivo");
  assert.equal(workbook.getWorksheet("Piano pagamenti").getCell("C5").value, 0.2);
  assert.equal(workbook.getWorksheet("Incassi e pagamenti").getCell("F5").value, 2500);
});
