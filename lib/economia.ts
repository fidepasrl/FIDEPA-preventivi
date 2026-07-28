import { parseImporto } from "@/lib/importi";

export type FrequenzaCostoSocieta = "Mensile" | "Annuale" | "Una tantum";

export type CostoSocietaCalcolabile = {
  importo: number | string | null;
  categoria?: string | null;
  persona_id?: string | null;
  cassa?: number | string | null;
  iva?: number | string | null;
  cassa_aliquota?: number | string | null;
  iva_aliquota?: number | string | null;
  frequenza: FrequenzaCostoSocieta | string;
  data_riferimento?: string | null;
  data_inizio?: string | null;
  data_fine?: string | null;
  numero_mesi?: number | string | null;
  variazioni?: Array<{
    data_decorrenza: string;
    importo: number | string | null;
  }>;
  attivo?: boolean | null;
};

export type MovimentoCostoSocietaMaturato = {
  dataPagamento: string;
  importo: number;
  cassa: number;
  iva: number;
};

function costoCollaboratore(costo: CostoSocietaCalcolabile) {
  return costo.categoria?.trim().toLocaleLowerCase("it-IT") === "collaboratori";
}

function costoStudio(costo: CostoSocietaCalcolabile) {
  return costo.categoria?.trim().toLocaleLowerCase("it-IT") === "studio";
}

function costoContinuativo(costo: CostoSocietaCalcolabile) {
  return (
    costo.frequenza === "Mensile" &&
    (costoStudio(costo) || costoCollaboratore(costo))
  );
}

function arrotondaImporto(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function dataLocaleIso(data: Date) {
  const anno = data.getFullYear();
  const mese = String(data.getMonth() + 1).padStart(2, "0");
  const giorno = String(data.getDate()).padStart(2, "0");
  return `${anno}-${mese}-${giorno}`;
}

function primoGiornoDelMese(data: Date) {
  return new Date(data.getFullYear(), data.getMonth(), 1);
}

function dataRicorrenzaMensile(anno: number, mese: number, giorno: number) {
  const ultimoGiornoDelMese = new Date(anno, mese + 1, 0).getDate();
  return new Date(anno, mese, Math.min(giorno, ultimoGiornoDelMese));
}

function ricorrenzeCostoContinuativo(
  costo: CostoSocietaCalcolabile,
  limiteMassimo: Date
) {
  const inizio = leggiData(costo.data_inizio);
  if (!inizio) return [];

  const fineConfigurata = leggiData(costo.data_fine);
  const fine =
    fineConfigurata && fineConfigurata < limiteMassimo
      ? fineConfigurata
      : limiteMassimo;
  if (fine < inizio) return [];

  const ricorrenze: Date[] = [];
  const giornoRicorrenza = inizio.getDate();
  let anno = inizio.getFullYear();
  let mese = inizio.getMonth();

  while (true) {
    const data = dataRicorrenzaMensile(anno, mese, giornoRicorrenza);
    if (data > fine) break;
    if (data >= inizio) ricorrenze.push(data);

    mese += 1;
    if (mese > 11) {
      mese = 0;
      anno += 1;
    }
  }

  return ricorrenze;
}

function numeroRicorrenzeStudio(
  costo: CostoSocietaCalcolabile,
  anno: number,
  fineMassima = new Date(anno, 11, 31)
) {
  const fineAnno = new Date(anno, 11, 31);
  const limite = fineMassima < fineAnno ? fineMassima : fineAnno;
  return ricorrenzeCostoContinuativo(costo, limite).filter(
    (data) => data.getFullYear() === anno
  ).length;
}

function importoCostoAllaData(costo: CostoSocietaCalcolabile, data: Date) {
  const dataIso = dataLocaleIso(data);
  const variazioni = [...(costo.variazioni || [])]
    .filter(
      (variazione) =>
        Boolean(variazione.data_decorrenza) &&
        variazione.data_decorrenza <= dataIso &&
        parseImporto(variazione.importo) > 0
    )
    .sort((a, b) => a.data_decorrenza.localeCompare(b.data_decorrenza));

  return variazioni.length > 0
    ? parseImporto(variazioni[variazioni.length - 1].importo)
    : parseImporto(costo.importo);
}

function importiCostoAllaData(costo: CostoSocietaCalcolabile, data: Date) {
  const importoBase = parseImporto(costo.importo);
  const cassaBase = costoCollaboratore(costo) ? parseImporto(costo.cassa) : 0;
  const ivaBase = parseImporto(costo.iva);
  const haCassaAliquotaEsplicita =
    costo.cassa_aliquota !== undefined && costo.cassa_aliquota !== null;
  const haIvaAliquotaEsplicita =
    costo.iva_aliquota !== undefined && costo.iva_aliquota !== null;
  const cassaAliquota = costoCollaboratore(costo)
    ? haCassaAliquotaEsplicita
      ? parseImporto(costo.cassa_aliquota)
      : importoBase > 0
        ? (cassaBase / importoBase) * 100
        : 0
    : 0;
  const ivaAliquota = haIvaAliquotaEsplicita
    ? parseImporto(costo.iva_aliquota)
    : importoBase + cassaBase > 0
      ? (ivaBase / (importoBase + cassaBase)) * 100
      : 0;
  const importo = costoContinuativo(costo)
    ? importoCostoAllaData(costo, data)
    : importoBase;
  const cassa = costoCollaboratore(costo)
    ? arrotondaImporto((importo * cassaAliquota) / 100)
    : 0;
  const iva = arrotondaImporto(((importo + cassa) * ivaAliquota) / 100);

  return { importo, cassa, iva };
}

export function movimentiCostoSocietaMaturati(
  costo: CostoSocietaCalcolabile,
  oggi = new Date()
): MovimentoCostoSocietaMaturato[] {
  if (costo.attivo === false) return [];

  const limite = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate());
  const risultato: MovimentoCostoSocietaMaturato[] = [];
  const aggiungi = (data: Date) => {
    if (data <= limite) {
      risultato.push({
        dataPagamento: dataLocaleIso(data),
        ...importiCostoAllaData(costo, data),
      });
    }
  };

  if (costo.frequenza === "Mensile") {
    if (costoContinuativo(costo)) {
      ricorrenzeCostoContinuativo(costo, limite).forEach(aggiungi);
      return risultato;
    }

    const dataInizio = leggiData(costo.data_inizio);
    if (!dataInizio) return [];
    const inizio = primoGiornoDelMese(dataInizio);
    const numeroMesi = Math.max(0, Math.trunc(parseImporto(costo.numero_mesi)));
    const dataFine = leggiData(costo.data_fine);
    const fine = numeroMesi > 0
      ? new Date(inizio.getFullYear(), inizio.getMonth() + numeroMesi - 1, 1)
      : dataFine
        ? primoGiornoDelMese(dataFine)
        : inizio;

    for (
      let data = new Date(inizio);
      data <= fine && data <= limite;
      data = new Date(data.getFullYear(), data.getMonth() + 1, 1)
    ) {
      aggiungi(data);
    }
    return risultato;
  }

  if (costo.frequenza === "Annuale") {
    const riferimento = leggiData(costo.data_riferimento);
    if (!riferimento) return [];
    for (let mese = 0; mese < 12; mese += 1) {
      aggiungi(new Date(riferimento.getFullYear(), mese, 1));
    }
    return risultato;
  }

  const riferimento = leggiData(costo.data_riferimento);
  if (riferimento && riferimento <= limite) {
    risultato.push({
      dataPagamento: dataLocaleIso(riferimento),
      ...importiCostoAllaData(costo, riferimento),
    });
  }
  return risultato;
}

export function totaleCostoSocieta(costo: CostoSocietaCalcolabile) {
  return (
    parseImporto(costo.importo) +
    (costoCollaboratore(costo) ? parseImporto(costo.cassa) : 0) +
    parseImporto(costo.iva)
  );
}

export function totaleCostoSocietaSenzaIva(costo: CostoSocietaCalcolabile) {
  return (
    parseImporto(costo.importo) +
    (costoCollaboratore(costo) ? parseImporto(costo.cassa) : 0)
  );
}

export function totaleCostoSocietaNetto(costo: CostoSocietaCalcolabile) {
  return parseImporto(costo.importo);
}

function movimentiContinuativiAnno(
  costo: CostoSocietaCalcolabile,
  anno: number,
  limite = new Date(anno, 11, 31)
) {
  return movimentiCostoSocietaMaturati(costo, limite).filter((movimento) =>
    movimento.dataPagamento.startsWith(`${anno}-`)
  );
}

export function costoSocietaAnnuale(
  costo: CostoSocietaCalcolabile,
  anno: number
) {
  if (costo.attivo === false) return 0;
  if (costoContinuativo(costo)) {
    return movimentiContinuativiAnno(costo, anno).reduce(
      (totale, movimento) =>
        totale + movimento.importo + movimento.cassa + movimento.iva,
      0
    );
  }

  return costoSocietaAnnualeDaImporto(costo, anno, totaleCostoSocieta(costo));
}

export function costoSocietaAnnualeSenzaIva(
  costo: CostoSocietaCalcolabile,
  anno: number
) {
  if (costo.attivo === false) return 0;
  if (costoContinuativo(costo)) {
    return movimentiContinuativiAnno(costo, anno).reduce(
      (totale, movimento) => totale + movimento.importo + movimento.cassa,
      0
    );
  }

  return costoSocietaAnnualeDaImporto(
    costo,
    anno,
    totaleCostoSocietaSenzaIva(costo)
  );
}

export function costoSocietaAnnualeNetto(
  costo: CostoSocietaCalcolabile,
  anno: number
) {
  if (costo.attivo === false) return 0;
  if (costoContinuativo(costo)) {
    return movimentiContinuativiAnno(costo, anno).reduce(
      (totale, movimento) => totale + movimento.importo,
      0
    );
  }

  return costoSocietaAnnualeDaImporto(costo, anno, totaleCostoSocietaNetto(costo));
}

function costoSocietaAnnualeDaImporto(
  costo: CostoSocietaCalcolabile,
  anno: number,
  importo: number
) {
  if (costo.frequenza === "Mensile") {
    if (costoStudio(costo)) {
      return importo * numeroRicorrenzeStudio(costo, anno);
    }
    return importo * mesiCostoMensile(costo, anno);
  }

  if (costo.frequenza === "Annuale") {
    return costoAttivoNellAnnoRiferimento(costo, anno) ? importo * 12 : 0;
  }

  if (!costo.data_riferimento) return importo;

  return new Date(costo.data_riferimento).getFullYear() === anno ? importo : 0;
}

export function costoSocietaMaturato(
  costo: CostoSocietaCalcolabile,
  anno: number,
  oggi = new Date()
) {
  if (costo.attivo === false) return 0;
  if (costoContinuativo(costo)) {
    return movimentiContinuativiAnno(costo, anno, oggi).reduce(
      (totale, movimento) =>
        totale + movimento.importo + movimento.cassa + movimento.iva,
      0
    );
  }

  return costoSocietaMaturatoDaImporto(
    costo,
    anno,
    totaleCostoSocieta(costo),
    oggi
  );
}

export function costoSocietaMaturatoSenzaIva(
  costo: CostoSocietaCalcolabile,
  anno: number,
  oggi = new Date()
) {
  if (costo.attivo === false) return 0;
  if (costoContinuativo(costo)) {
    return movimentiContinuativiAnno(costo, anno, oggi).reduce(
      (totale, movimento) => totale + movimento.importo + movimento.cassa,
      0
    );
  }

  return costoSocietaMaturatoDaImporto(
    costo,
    anno,
    totaleCostoSocietaSenzaIva(costo),
    oggi
  );
}

export function costoSocietaMaturatoNetto(
  costo: CostoSocietaCalcolabile,
  anno: number,
  oggi = new Date()
) {
  if (costo.attivo === false) return 0;
  if (costoContinuativo(costo)) {
    return movimentiContinuativiAnno(costo, anno, oggi).reduce(
      (totale, movimento) => totale + movimento.importo,
      0
    );
  }

  return costoSocietaMaturatoDaImporto(
    costo,
    anno,
    totaleCostoSocietaNetto(costo),
    oggi
  );
}

function costoSocietaMaturatoDaImporto(
  costo: CostoSocietaCalcolabile,
  anno: number,
  importo: number,
  oggi: Date
) {
  const fineMaturazione =
    oggi.getFullYear() === anno
      ? oggi
      : oggi.getFullYear() > anno
        ? new Date(anno, 11, 31)
        : null;

  if (!fineMaturazione) return 0;

  if (costo.frequenza === "Mensile") {
    if (costoStudio(costo)) {
      return importo * numeroRicorrenzeStudio(costo, anno, fineMaturazione);
    }
    return importo * mesiCostoMensile(costo, anno, fineMaturazione);
  }

  if (costo.frequenza === "Annuale") {
    if (!costoAttivoNellAnnoRiferimento(costo, anno)) return 0;

    const mesi =
      fineMaturazione.getFullYear() === anno ? fineMaturazione.getMonth() + 1 : 12;

    return importo * mesi;
  }

  if (!costo.data_riferimento) return importo;

  const data = new Date(costo.data_riferimento);
  return data.getFullYear() === anno && data <= oggi ? importo : 0;
}

export function cassaSocietaAnnuale(
  costo: CostoSocietaCalcolabile,
  anno: number
) {
  return quotaAccessorioSocieta(costo, anno, "cassa");
}

export function ivaSocietaAnnuale(costo: CostoSocietaCalcolabile, anno: number) {
  return quotaAccessorioSocieta(costo, anno, "iva");
}

function quotaAccessorioSocieta(
  costo: CostoSocietaCalcolabile,
  anno: number,
  campo: "cassa" | "iva"
) {
  if (costo.attivo === false) return 0;
  if (campo === "cassa" && !costoCollaboratore(costo)) return 0;
  if (costoContinuativo(costo)) {
    return movimentiContinuativiAnno(costo, anno).reduce(
      (totale, movimento) => totale + movimento[campo],
      0
    );
  }

  const importo = parseImporto(costo[campo]);

  if (costo.frequenza === "Mensile") {
    if (costoStudio(costo)) {
      return importo * numeroRicorrenzeStudio(costo, anno);
    }
    return importo * mesiCostoMensile(costo, anno);
  }

  if (costo.frequenza === "Annuale") {
    return costoAttivoNellAnnoRiferimento(costo, anno) ? importo * 12 : 0;
  }

  if (!costo.data_riferimento) return importo;

  return new Date(costo.data_riferimento).getFullYear() === anno ? importo : 0;
}

export function meseDaData(value: string | null | undefined) {
  if (!value) return null;

  const data = new Date(value);
  if (Number.isNaN(data.getTime())) return null;

  return data.getMonth();
}

function leggiData(value: string | null | undefined) {
  if (!value) return null;

  const dataIso = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dataIso) {
    const dataLocale = new Date(
      Number(dataIso[1]),
      Number(dataIso[2]) - 1,
      Number(dataIso[3])
    );
    return Number.isNaN(dataLocale.getTime()) ? null : dataLocale;
  }

  const data = new Date(value);
  return Number.isNaN(data.getTime()) ? null : data;
}

function periodoAnno(anno: number) {
  return {
    inizio: new Date(anno, 0, 1),
    fine: new Date(anno, 11, 31),
  };
}

function periodoCostoMensile(costo: CostoSocietaCalcolabile) {
  const inizioCosto = leggiData(costo.data_inizio);
  const fineCostoLegacy = leggiData(costo.data_fine);
  const numeroMesi = Math.max(0, Math.trunc(parseImporto(costo.numero_mesi)));

  if (!inizioCosto) {
    return null;
  }

  if (numeroMesi > 0) {
    return {
      inizio: inizioCosto,
      fine: new Date(
        inizioCosto.getFullYear(),
        inizioCosto.getMonth() + numeroMesi,
        0
      ),
    };
  }

  if (fineCostoLegacy) {
    return { inizio: inizioCosto, fine: fineCostoLegacy };
  }

  return { inizio: inizioCosto, fine: inizioCosto };
}

function mesiCostoMensile(
  costo: CostoSocietaCalcolabile,
  anno: number,
  fineMassima?: Date
) {
  const periodo = periodoCostoMensile(costo);

  if (!periodo) {
    const annoCorrente = new Date().getFullYear();
    if (!fineMassima) return 12;
    if (anno < annoCorrente) return 12;
    if (anno > annoCorrente) return 0;
    return fineMassima.getMonth() + 1;
  }

  const annoPeriodo = periodoAnno(anno);
  const inizio =
    periodo.inizio > annoPeriodo.inizio ? periodo.inizio : annoPeriodo.inizio;
  const fineAnno =
    fineMassima && fineMassima < annoPeriodo.fine ? fineMassima : annoPeriodo.fine;
  const fine = periodo.fine < fineAnno ? periodo.fine : fineAnno;

  if (fine < inizio) return 0;

  return (
    (fine.getFullYear() - inizio.getFullYear()) * 12 +
    fine.getMonth() -
    inizio.getMonth() +
    1
  );
}

function costoAttivoNellAnnoRiferimento(
  costo: CostoSocietaCalcolabile,
  anno: number
) {
  if (!costo.data_riferimento) return true;

  const data = leggiData(costo.data_riferimento);
  return data ? data.getFullYear() === anno : true;
}
