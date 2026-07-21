import { parseImporto } from "@/lib/importi";

export type FrequenzaCostoSocieta = "Mensile" | "Annuale" | "Una tantum";

export type CostoSocietaCalcolabile = {
  importo: number | string | null;
  cassa?: number | string | null;
  iva?: number | string | null;
  frequenza: FrequenzaCostoSocieta | string;
  data_riferimento?: string | null;
  data_inizio?: string | null;
  data_fine?: string | null;
  numero_mesi?: number | string | null;
  attivo?: boolean | null;
};

export function totaleCostoSocieta(costo: CostoSocietaCalcolabile) {
  return (
    parseImporto(costo.importo) +
    parseImporto(costo.cassa) +
    parseImporto(costo.iva)
  );
}

export function totaleCostoSocietaSenzaIva(costo: CostoSocietaCalcolabile) {
  return parseImporto(costo.importo) + parseImporto(costo.cassa);
}

export function totaleCostoSocietaNetto(costo: CostoSocietaCalcolabile) {
  return parseImporto(costo.importo);
}

export function costoSocietaAnnuale(
  costo: CostoSocietaCalcolabile,
  anno: number
) {
  if (costo.attivo === false) return 0;

  return costoSocietaAnnualeDaImporto(costo, anno, totaleCostoSocieta(costo));
}

export function costoSocietaAnnualeSenzaIva(
  costo: CostoSocietaCalcolabile,
  anno: number
) {
  if (costo.attivo === false) return 0;

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

  return costoSocietaAnnualeDaImporto(costo, anno, totaleCostoSocietaNetto(costo));
}

function costoSocietaAnnualeDaImporto(
  costo: CostoSocietaCalcolabile,
  anno: number,
  importo: number
) {
  if (costo.frequenza === "Mensile") {
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

  const importo = parseImporto(costo[campo]);

  if (costo.frequenza === "Mensile") {
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
