export function parseImporto(value: string | number | null | undefined) {
  if (typeof value === "number") return value;
  if (!value) return 0;

  const testo = String(value)
    .trim()
    .replace(/[€\s]/g, "")
    .replace(/[^\d,.-]/g, "");

  if (!testo) return 0;

  const negativo = testo.startsWith("-");
  const senzaSegno = testo.replace(/-/g, "");
  const normalizzato = normalizzaSeparatoreDecimale(senzaSegno);

  return Number(normalizzato || 0) * (negativo ? -1 : 1);
}

export function formattaEuro(value: number | string | null | undefined) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(parseImporto(value));
}

export function formattaNumeroItaliano(value: number | string | null | undefined) {
  return new Intl.NumberFormat("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(parseImporto(value));
}

export function formattaInputImporto(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "";

  return String(value)
    .replace(/[€\s]/g, "")
    .replace(/[^\d,.-]/g, "");
}

export function preparaInputImporto(value: string | number | null | undefined) {
  const testo = formattaInputImporto(value);

  // I valori gia formattati in italiano hanno la virgola decimale: in modifica
  // togliamo solo i separatori delle migliaia, lasciando intatti i decimali.
  return testo.includes(",") ? testo.replace(/\./g, "") : testo;
}

export function finalizzaInputImporto(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "";

  return formattaNumeroItaliano(value);
}

function normalizzaSeparatoreDecimale(value: string) {
  if (value.includes(",")) {
    const parti = value.split(",");
    const decimali = parti.pop() || "";
    const interi = parti.join("").replace(/\./g, "");
    return `${interi || "0"}.${decimali.replace(/\D/g, "")}`;
  }

  if (value.includes(".")) {
    const parti = value.split(".");
    const dopoPunto = parti[1] || "";
    const puntiSonoMigliaia =
      parti.length > 2 ||
      dopoPunto.length > 2 ||
      (dopoPunto.length === 3 && parti[0].length <= 3);

    if (puntiSonoMigliaia) {
      return parti.join("");
    }

    return `${parti[0] || "0"}.${dopoPunto.replace(/\D/g, "")}`;
  }

  return value.replace(/\D/g, "");
}
