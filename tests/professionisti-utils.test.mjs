import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const sorgente = await readFile(
  new URL("../lib/professionisti/utils.ts", import.meta.url),
  "utf8"
);
const compilato = ts.transpileModule(sorgente, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const moduloUrl = `data:text/javascript;base64,${Buffer.from(compilato).toString("base64")}`;
const {
  chiaveProfessionista,
  filtraProfessionisti,
  leggiCsvProfessionisti,
  ordinaProfessionisti,
} = await import(moduloUrl);

const filtriVuoti = {
  professione: "",
  albo: "",
  provincia: "",
  sezione: "",
  pec: "tutti",
  partita_iva: "tutti",
  abilitazioni: "tutti",
};

const professionisti = [
  {
    id: "1",
    nome: "Mario",
    cognome: "Rossi",
    professione: "Ingegnere",
    codice_fiscale: "RSSMRA80A01H501Z",
    provincia: "RM",
    albo: "Ingegneri",
    sezione: "A",
    pec: "mario@pec.it",
    partita_iva: "01234567890",
    abilitazioni: "Antincendio",
    prima_iscrizione: "2010-01-01",
  },
  {
    id: "2",
    nome: "Anna",
    cognome: "Bianchi",
    professione: "Architetto",
    codice_fiscale: "",
    provincia: "NA",
    albo: "Architetti",
    sezione: "A",
    pec: null,
    partita_iva: null,
    abilitazioni: null,
    prima_iscrizione: "2020-01-01",
  },
];

test("professionisti: ricerca globale e filtri combinati", () => {
  const filtrati = filtraProfessionisti(professionisti, "antincendio", {
    ...filtriVuoti,
    professione: "Ingegnere",
    pec: "presente",
  });
  assert.deepEqual(
    filtrati.map((item) => item.id),
    ["1"]
  );
});

test("professionisti: ordinamento per cognome e prima iscrizione", () => {
  assert.deepEqual(
    ordinaProfessionisti(professionisti, "cognome").map((item) => item.id),
    ["2", "1"]
  );
  assert.deepEqual(
    ordinaProfessionisti(professionisti, "prima_iscrizione").map(
      (item) => item.id
    ),
    ["2", "1"]
  );
});

test("professionisti: importazione CSV italiana", () => {
  const [riga] = leggiCsvProfessionisti(
    "Nome;Cognome;Professione;Data nascita;Codice fiscale;PEC\nLuca;Verdi;Geometra;05/07/1985;VRDLCU85L05F839X;luca@pec.it"
  );
  assert.equal(riga.nome, "Luca");
  assert.equal(riga.data_nascita, "1985-07-05");
  assert.equal(riga.pec, "luca@pec.it");
  assert.equal(chiaveProfessionista(riga), "cf:VRDLCU85L05F839X");
});
