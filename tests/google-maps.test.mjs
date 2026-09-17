import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const sorgente = await readFile(
  new URL("../lib/googleMaps.ts", import.meta.url),
  "utf8"
);
const compilato = ts.transpileModule(sorgente, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const moduloUrl = `data:text/javascript;base64,${Buffer.from(compilato).toString("base64")}`;
const { creaUrlGoogleMaps } = await import(moduloUrl);

test("crea il collegamento Google Maps con le coordinate esatte", () => {
  assert.equal(
    creaUrlGoogleMaps(40.745, 14.62),
    "https://www.google.com/maps/search/?api=1&query=40.745%2C14.62"
  );
  assert.equal(
    creaUrlGoogleMaps("40,745", "14,62"),
    "https://www.google.com/maps/search/?api=1&query=40.745%2C14.62"
  );
});

test("non crea collegamenti quando le coordinate sono mancanti o non valide", () => {
  assert.equal(creaUrlGoogleMaps(null, 14.62), null);
  assert.equal(creaUrlGoogleMaps(40.745, ""), null);
  assert.equal(creaUrlGoogleMaps(91, 14.62), null);
  assert.equal(creaUrlGoogleMaps(40.745, 181), null);
});
