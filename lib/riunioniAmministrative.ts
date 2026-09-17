export type ArgomentoAmministrativo = {
  id: string;
  titolo: string;
  discusso: string;
};

export type RiferimentoSettimana = {
  anno: number;
  settimana: number;
  dataInizio: string;
  dataFine: string;
};

function dataIsoLocale(data: Date) {
  const anno = data.getFullYear();
  const mese = String(data.getMonth() + 1).padStart(2, "0");
  const giorno = String(data.getDate()).padStart(2, "0");
  return `${anno}-${mese}-${giorno}`;
}

function dataLocaleDaIso(value: string) {
  return new Date(`${value}T12:00:00`);
}

export function riferimentiSettimanaIso(
  data: Date = new Date()
): RiferimentoSettimana {
  const giornoLocale = new Date(
    data.getFullYear(),
    data.getMonth(),
    data.getDate(),
    12
  );
  const distanzaDaLunedi = (giornoLocale.getDay() + 6) % 7;
  const lunedi = new Date(giornoLocale);
  lunedi.setDate(giornoLocale.getDate() - distanzaDaLunedi);

  const domenica = new Date(lunedi);
  domenica.setDate(lunedi.getDate() + 6);

  const riferimentoUtc = new Date(
    Date.UTC(
      giornoLocale.getFullYear(),
      giornoLocale.getMonth(),
      giornoLocale.getDate()
    )
  );
  const giornoIso = (riferimentoUtc.getUTCDay() + 6) % 7;
  riferimentoUtc.setUTCDate(riferimentoUtc.getUTCDate() - giornoIso + 3);
  const anno = riferimentoUtc.getUTCFullYear();

  const primoGiovedi = new Date(Date.UTC(anno, 0, 4));
  const distanzaPrimoGiovedi = (primoGiovedi.getUTCDay() + 6) % 7;
  primoGiovedi.setUTCDate(
    primoGiovedi.getUTCDate() - distanzaPrimoGiovedi + 3
  );

  const settimana =
    1 +
    Math.round(
      (riferimentoUtc.getTime() - primoGiovedi.getTime()) /
        (7 * 24 * 60 * 60 * 1000)
    );

  return {
    anno,
    settimana,
    dataInizio: dataIsoLocale(lunedi),
    dataFine: dataIsoLocale(domenica),
  };
}

export function fineSettimana(dataInizio: string) {
  const data = dataLocaleDaIso(dataInizio);
  data.setDate(data.getDate() + 6);
  return dataIsoLocale(data);
}

export function formattaIntervalloSettimana(dataInizio: string) {
  const inizio = dataLocaleDaIso(dataInizio);
  const fine = dataLocaleDaIso(fineSettimana(dataInizio));
  const formato: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
  };

  return `${inizio.toLocaleDateString("it-IT", formato)} – ${fine.toLocaleDateString(
    "it-IT",
    formato
  )}`;
}

export function normalizzaArgomenti(
  value: unknown
): ArgomentoAmministrativo[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item, index) => {
    if (!item || typeof item !== "object") return [];

    const record = item as Record<string, unknown>;
    return [
      {
        id:
          typeof record.id === "string" && record.id.trim()
            ? record.id
            : `argomento-${index + 1}`,
        titolo: typeof record.titolo === "string" ? record.titolo : "",
        discusso: typeof record.discusso === "string" ? record.discusso : "",
      },
    ];
  });
}
