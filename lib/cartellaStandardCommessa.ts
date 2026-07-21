import { getCodiceTipoCommessa } from "@/lib/tipiCommesse";

export type DatiCartellaStandardCommessa = {
  codice: string | null;
  titolo: string;
  posizione: string | null;
  tipo_commessa: string | null;
};

const CARTELLE_STANDARD = [
  "AMMINISTRAZIONE",
  "DOCUMENTI",
  "DOCUMENTI/Rilievo",
  "DOCUMENTI/Foto",
  "DOCUMENTI/Catasto",
  "DOCUMENTI/Urbanistica",
  "INDD",
  "INDD/utili",
  "PDF",
  "ECONOMICS",
  "RENDER",
  "RENDER/bozze",
  "superati",
  "utili",
  "MODELLO 3D",
  "MODELLO 3D/texture",
];

export function creaCartellaStandardCommessa(
  commessa: DatiCartellaStandardCommessa
) {
  const nome = creaNomeCartellaStandardCommessa(commessa);
  const entries = [
    `${nome}/`,
    ...CARTELLE_STANDARD.map((cartella) => `${nome}/${cartella}/`),
  ];

  return {
    nome,
    blob: creaZipVuoto(entries),
  };
}

export function creaNomeCartellaStandardCommessa(
  commessa: DatiCartellaStandardCommessa
) {
  const progressivo = estraiProgressivo(commessa.codice);
  const tipo = getCodiceTipoCommessa(commessa.tipo_commessa);
  const nome = normalizzaSegmento(commessa.titolo, "Commessa");
  const luogo = normalizzaSegmento(commessa.posizione, "Luogo");

  return `${progressivo}_${tipo}_${nome}_${luogo}`;
}

function estraiProgressivo(codice: string | null) {
  const match = codice?.match(/(\d+)(?!.*\d)/);
  const progressivo = match?.[1] || "000";

  return progressivo.length >= 3 ? progressivo : progressivo.padStart(3, "0");
}

function normalizzaSegmento(valore: string | null, fallback: string) {
  const parti = (valore || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean);

  if (parti.length === 0) return fallback;

  return parti
    .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
    .join("");
}

function creaZipVuoto(paths: string[]) {
  const encoder = new TextEncoder();
  const fileParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  paths.forEach((path) => {
    const fileName = encoder.encode(path);
    const data = new Uint8Array();
    const crc = crc32(data);
    const localHeader = new Uint8Array(30 + fileName.length);
    const localView = new DataView(localHeader.buffer);

    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0, true);
    localView.setUint16(8, 0, true);
    localView.setUint16(10, 0, true);
    localView.setUint16(12, 0, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, data.length, true);
    localView.setUint32(22, data.length, true);
    localView.setUint16(26, fileName.length, true);
    localView.setUint16(28, 0, true);
    localHeader.set(fileName, 30);

    fileParts.push(localHeader, data);

    const centralHeader = new Uint8Array(46 + fileName.length);
    const centralView = new DataView(centralHeader.buffer);

    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, 0, true);
    centralView.setUint16(14, 0, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, data.length, true);
    centralView.setUint32(24, data.length, true);
    centralView.setUint16(28, fileName.length, true);
    centralView.setUint16(30, 0, true);
    centralView.setUint16(32, 0, true);
    centralView.setUint16(34, 0, true);
    centralView.setUint16(36, 0, true);
    centralView.setUint32(38, 0x10, true);
    centralView.setUint32(42, offset, true);
    centralHeader.set(fileName, 46);

    centralParts.push(centralHeader);
    offset += localHeader.length + data.length;
  });

  const centralOffset = offset;
  const centralSize = centralParts.reduce((totale, part) => totale + part.length, 0);
  const endHeader = new Uint8Array(22);
  const endView = new DataView(endHeader.buffer);

  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(4, 0, true);
  endView.setUint16(6, 0, true);
  endView.setUint16(8, paths.length, true);
  endView.setUint16(10, paths.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, centralOffset, true);
  endView.setUint16(20, 0, true);

  return new Blob([...fileParts, ...centralParts, endHeader].map(toBlobPart), {
    type: "application/zip",
  });
}

function toBlobPart(part: Uint8Array): BlobPart {
  const copy = new Uint8Array(part.byteLength);
  copy.set(part);

  return copy.buffer as ArrayBuffer;
}

let crcTable: number[] | null = null;

function crc32(data: Uint8Array) {
  const table = getCrcTable();
  let crc = 0xffffffff;

  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ data[i]) & 0xff];
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function getCrcTable() {
  if (crcTable) return crcTable;

  crcTable = Array.from({ length: 256 }, (_, index) => {
    let valore = index;

    for (let bit = 0; bit < 8; bit++) {
      valore = valore & 1 ? 0xedb88320 ^ (valore >>> 1) : valore >>> 1;
    }

    return valore >>> 0;
  });

  return crcTable;
}
