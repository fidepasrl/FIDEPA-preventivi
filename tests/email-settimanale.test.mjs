import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const sorgente = await readFile(
  new URL("../lib/email-settimanale.ts", import.meta.url),
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
  creaEmailSettimanaleHtml,
  creaOggettoEmail,
  giorniLavorativiAttivita,
  intervalloSettimana,
  limitaAttivitaAllaSettimana,
  scegliFraseMotivazionale,
} = await import(moduloUrl);

test("calcola la settimana ISO completa a partire da un giorno qualsiasi", () => {
  assert.deepEqual(intervalloSettimana("2026-09-03"), {
    dataInizio: "2026-08-31",
    dataFine: "2026-09-06",
    numeroSettimana: 36,
  });
  assert.equal(creaOggettoEmail(36), "La tua week 36 in FIDEPA");
});

test("le attività di più giorni saltano sabato e domenica", () => {
  assert.deepEqual(giorniLavorativiAttivita("2026-09-04", 3), [
    "2026-09-04",
    "2026-09-07",
    "2026-09-08",
  ]);
  assert.deepEqual(
    limitaAttivitaAllaSettimana(
      "2026-09-04",
      3,
      "2026-09-07",
      "2026-09-13"
    ),
    { dataInizio: "2026-09-07", dataFine: "2026-09-08" }
  );
});

test("l'email senza programmazione contiene il messaggio e la scheda personale", () => {
  const html = creaEmailSettimanaleHtml({
    persona: {
      id: "1",
      nome: "Mario Rossi",
      email: "mario@example.com",
      attivo: true,
      ruolo_organigramma: "project_manager",
      titolo_ruolo: "Operation manager",
      descrizione: "Coordina il lavoro.",
      foto_url: "https://example.com/mario.jpg",
    },
    numeroSettimana: 36,
    dataInizio: "2026-08-31",
    dataFine: "2026-09-06",
    attivita: [],
    profilo: [
      {
        titolo: "Organizzare il lavoro operativo",
        tipo: "responsabilita",
        completata: false,
      },
    ],
    fraseMotivazionale: "Il mondo si cambia un pezzo alla volta.",
  });
  assert.match(html, /non hai attività calendarizzate/);
  assert.match(html, /Operation manager/);
  assert.match(html, /Organizzare il lavoro operativo/);
  assert.match(html, /https:\/\/example.com\/mario.jpg/);
  assert.match(html, /Il mondo si cambia un pezzo alla volta/);
});

test("la scheda attività mostra prima la commessa e distingue la priorità", () => {
  const html = creaEmailSettimanaleHtml({
    persona: {
      id: "1",
      nome: "Mario Rossi",
      email: "mario@example.com",
      attivo: true,
      ruolo_organigramma: "collaboratore",
      titolo_ruolo: "Project engineer",
      descrizione: null,
      foto_url: null,
    },
    numeroSettimana: 36,
    dataInizio: "2026-08-31",
    dataFine: "2026-09-06",
    attivita: [
      {
        tipo: "attivita",
        titolo: "Preparare il PFTE",
        commessaTitolo: "Velaria",
        commessaCodice: "25_026",
        priorita: "Alta",
        dataInizio: "2026-08-31",
        dataFine: "2026-09-02",
      },
    ],
    profilo: [],
    fraseMotivazionale: "Stay hungry. Stay foolish.",
  });
  assert.ok(html.indexOf("Velaria") < html.indexOf("Preparare il PFTE"));
  assert.match(html, /▲&nbsp; Alta/);
  assert.match(html, /Codice 25_026/);
});

test("la frase motivazionale cambia tra settimane consecutive", () => {
  assert.notEqual(
    scegliFraseMotivazionale("persona-1", 36, "2026-08-31"),
    scegliFraseMotivazionale("persona-1", 37, "2026-09-07")
  );
});
