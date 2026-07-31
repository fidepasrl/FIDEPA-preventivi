import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const sorgente = await readFile(
  new URL("../lib/commesse/lista.ts", import.meta.url),
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
  creaCsvCommesse,
  filtraCommesse,
  leggiCsvCommesse,
  ordinaCommesse,
  raggruppaCommesse,
} =
  await import(moduloUrl);

const filtriVuoti = {
  priorita: "",
  tipo: "",
  posizione: "",
  cliente: "",
  stato: "tutte",
};

const commesse = [
  {
    id: "1",
    titolo: "Casa Verde",
    codice: "26_010",
    cliente_nome: "Rossi",
    posizione: "Napoli",
    tipo_commessa: "Privata",
    priorita: "Bassa",
    descrizione: "Ristrutturazione",
    ultimaNota: "Sopralluogo completato",
  },
  {
    id: "2",
    titolo: "Scuola Centro",
    codice: "26_011",
    cliente_nome: "Comune",
    posizione: "Caserta",
    tipo_commessa: "Pubblica",
    priorita: "Urgente",
    descrizione: null,
  },
  {
    id: "3",
    titolo: "Ex deposito",
    codice: "25_020",
    cliente_nome: "Bianchi",
    posizione: "Napoli",
    tipo_commessa: "Urbanistica",
    priorita: "Terminato",
    descrizione: null,
  },
];

test("ricerca globale e filtri combinabili selezionano le commesse corrette", () => {
  assert.deepEqual(
    filtraCommesse(commesse, "sopralluogo", filtriVuoti).map((item) => item.id),
    ["1"]
  );
  assert.deepEqual(
    filtraCommesse(commesse, "", {
      ...filtriVuoti,
      posizione: "Napoli",
      stato: "attive",
    }).map((item) => item.id),
    ["1"]
  );
});

test("l'ordinamento iniziale segue la priorità", () => {
  assert.deepEqual(
    ordinaCommesse(commesse, "priorita").map((item) => item.id),
    ["2", "1", "3"]
  );
});

test("la tabella crea blocchi coerenti con l'ordinamento selezionato", () => {
  const perPriorita = raggruppaCommesse(
    ordinaCommesse(commesse, "priorita"),
    "priorita"
  );
  assert.deepEqual(
    perPriorita.map((gruppo) => [gruppo.etichetta, gruppo.commesse.length]),
    [
      ["Priorità Urgente", 1],
      ["Priorità Bassa", 1],
      ["Priorità Terminato", 1],
    ]
  );

  const perPosizione = raggruppaCommesse(
    ordinaCommesse(commesse, "posizione"),
    "posizione"
  );
  assert.deepEqual(
    perPosizione.map((gruppo) => gruppo.etichetta),
    ["Posizione · Caserta", "Posizione · Napoli"]
  );
});

test("esportazione e importazione CSV conservano i campi principali", () => {
  const csv = creaCsvCommesse(commesse);
  const importate = leggiCsvCommesse(csv);
  assert.equal(importate.length, 3);
  assert.equal(importate[0].titolo, "Casa Verde");
  assert.equal(importate[0].cliente_nome, "Rossi");
  assert.equal(importate[1].tipo_commessa, "Pubblica");
});
