import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";
import { readFile } from "node:fs/promises";

const source = await readFile(
  new URL("../lib/personaleOrganigramma.ts", import.meta.url),
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

test("normalizza i ruoli sconosciuti come collaboratore", () => {
  assert.equal(modulo.normalizzaRuoloOrganigramma("amministratore"), "amministratore");
  assert.equal(modulo.normalizzaRuoloOrganigramma("project_manager"), "project_manager");
  assert.equal(modulo.normalizzaRuoloOrganigramma("altro"), "collaboratore");
});

test("genera iniziali leggibili per la foto profilo", () => {
  assert.equal(modulo.inizialiPersona("Mario Rossi"), "MR");
  assert.equal(modulo.inizialiPersona("  Anna  "), "A");
});
