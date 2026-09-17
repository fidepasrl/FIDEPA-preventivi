import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";
import { readFile } from "node:fs/promises";

const source = await readFile(
  new URL("../lib/riunioniAmministrative.ts", import.meta.url),
  "utf8"
);
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const modulo = await import(
  `data:text/javascript;base64,${Buffer.from(transpiled).toString("base64")}`
);

test("calcola correttamente una settimana ISO ordinaria", () => {
  assert.deepEqual(
    modulo.riferimentiSettimanaIso(new Date(2026, 8, 17, 12)),
    {
      anno: 2026,
      settimana: 38,
      dataInizio: "2026-09-14",
      dataFine: "2026-09-20",
    }
  );
});

test("gestisce il cambio anno secondo lo standard ISO", () => {
  const riferimento = modulo.riferimentiSettimanaIso(
    new Date(2027, 0, 1, 12)
  );

  assert.equal(riferimento.anno, 2026);
  assert.equal(riferimento.settimana, 53);
  assert.equal(riferimento.dataInizio, "2026-12-28");
  assert.equal(riferimento.dataFine, "2027-01-03");
});

test("normalizza gli argomenti salvati senza fidarsi del JSON", () => {
  assert.deepEqual(
    modulo.normalizzaArgomenti([
      { id: "a-1", titolo: "Pagamenti", discusso: "Verifica scadenze" },
      null,
      { titolo: 123, discusso: "Testo" },
    ]),
    [
      { id: "a-1", titolo: "Pagamenti", discusso: "Verifica scadenze" },
      { id: "argomento-3", titolo: "", discusso: "Testo" },
    ]
  );
});
