import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const sorgente = await readFile(
  new URL("../lib/clienti/utils.ts", import.meta.url),
  "utf8"
);
const compilato = ts.transpileModule(sorgente, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const moduloUrl = `data:text/javascript;base64,${Buffer.from(compilato).toString("base64")}`;
const { chiaveCliente, filtraClienti, leggiCsvClienti, ordinaClienti } =
  await import(moduloUrl);

const filtriVuoti = {
  tipo_cliente: "tutti",
  comune: "",
  email: "tutti",
  pec: "tutti",
  telefono: "tutti",
  piva: "tutti",
  referente: "tutti",
};

const clienti = [
  {
    id: "1",
    tipo_cliente: "azienda",
    cliente: "Edilizia Alfa S.r.l.",
    piva: "01234567890",
    indirizzo: "Via Roma 1",
    comune: "Napoli",
    email: "info@alfa.it",
    pec: "alfa@pec.it",
    telefono: "0811234567",
    referente: "Mario Rossi",
    rea: "NA-123456",
    referente_qualifica: "Legale rappresentante",
    created_at: "2025-01-01T10:00:00Z",
  },
  {
    id: "2",
    tipo_cliente: "persona_fisica",
    cliente: "Beta Immobiliare",
    piva: null,
    indirizzo: null,
    comune: "Roma",
    email: null,
    pec: null,
    telefono: null,
    referente: null,
    created_at: "2026-01-01T10:00:00Z",
  },
];

test("clienti: ricerca globale e filtri combinati", () => {
  const filtrati = filtraClienti(clienti, "Mario Rossi", {
    ...filtriVuoti,
    comune: "Napoli",
    email: "presente",
  });
  assert.deepEqual(
    filtrati.map((item) => item.id),
    ["1"]
  );
});

test("clienti: distingue aziende e persone fisiche", () => {
  const filtrati = filtraClienti(clienti, "NA-123456", {
    ...filtriVuoti,
    tipo_cliente: "azienda",
  });
  assert.deepEqual(
    filtrati.map((item) => item.id),
    ["1"]
  );
});

test("clienti: ordinamento alfabetico e per inserimento", () => {
  assert.deepEqual(
    ordinaClienti(clienti, "cliente_asc").map((item) => item.id),
    ["2", "1"]
  );
  assert.deepEqual(
    ordinaClienti(clienti, "inserimento").map((item) => item.id),
    ["2", "1"]
  );
});

test("clienti: importazione CSV italiana e controllo duplicati", () => {
  const [riga] = leggiCsvClienti(
    "Tipo cliente;Cliente;Partita IVA o codice fiscale;REA;Indirizzo;Comune;PEC;Email;Telefono;Referente;Data nascita referente\nAzienda;Gamma S.r.l.;98765432100;MI-987654;Via Verdi 5;Milano;gamma@pec.it;info@gamma.it;021234567;Anna Bianchi;05/07/1985"
  );
  assert.equal(riga.tipo_cliente, "azienda");
  assert.equal(riga.cliente, "Gamma S.r.l.");
  assert.equal(riga.comune, "Milano");
  assert.equal(riga.rea, "MI-987654");
  assert.equal(riga.referente, "Anna Bianchi");
  assert.equal(riga.referente_data_nascita, "1985-07-05");
  assert.equal(chiaveCliente(riga), "piva:98765432100");
});
