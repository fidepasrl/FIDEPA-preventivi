import type {
  FiltriRappresentanti,
  OrdinamentoRappresentanti,
  Rappresentante,
} from "@/lib/rappresentanti/types";

export function normalizzaTelefono(valore: string) {
  const pulito = valore.trim().replace(/[^\d+]/g, "");
  if (!pulito) return "";
  if (pulito.startsWith("00")) return `+${pulito.slice(2)}`;
  return pulito;
}

export function validaEmail(valore: string) {
  return !valore || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valore.trim());
}

export function validaUrl(valore: string) {
  if (!valore.trim()) return true;
  try {
    const url = new URL(
      /^https?:\/\//i.test(valore) ? valore : `https://${valore}`
    );
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}

export function normalizzaUrl(valore: string) {
  const pulito = valore.trim();
  if (!pulito) return null;
  return /^https?:\/\//i.test(pulito) ? pulito : `https://${pulito}`;
}

export function slugCategoria(valore: string) {
  return valore
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function inizialiRappresentante(nome: string, cognome: string) {
  return `${nome.charAt(0)}${cognome.charAt(0)}`.toUpperCase() || "R";
}

export function formattaDataIt(valore: string | null | undefined) {
  if (!valore) return "-";
  const data = new Date(valore);
  return Number.isNaN(data.getTime())
    ? "-"
    : data.toLocaleDateString("it-IT");
}

export function giorniDa(valore: string | null | undefined) {
  if (!valore) return Number.POSITIVE_INFINITY;
  const data = new Date(valore).getTime();
  return Number.isNaN(data)
    ? Number.POSITIVE_INFINITY
    : Math.floor((Date.now() - data) / 86400000);
}

export function filtraRappresentanti(
  rappresentanti: Rappresentante[],
  ricerca: string,
  filtri: FiltriRappresentanti
) {
  const termine = ricerca.trim().toLocaleLowerCase("it-IT");

  return rappresentanti.filter((rappresentante) => {
    const testo = [
      rappresentante.nome,
      rappresentante.cognome,
      rappresentante.provincia,
      rappresentante.regione,
      rappresentante.cellulare,
      rappresentante.telefono_secondario,
      rappresentante.email,
      rappresentante.email_secondaria,
      ...rappresentante.aziende.map(
        (item) =>
          item.azienda.nome_commerciale || item.azienda.ragione_sociale
      ),
      ...rappresentante.prodotti.map((item) => item.nome),
      ...rappresentante.categorie.map((item) => item.nome),
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("it-IT");

    if (termine && !testo.includes(termine)) return false;
    if (
      filtri.categoria_id &&
      !rappresentante.categorie.some(
        (item) => item.id === filtri.categoria_id
      )
    )
      return false;
    if (
      filtri.azienda_id &&
      !rappresentante.aziende.some(
        (item) => item.azienda_id === filtri.azienda_id
      )
    )
      return false;
    if (
      filtri.prodotto_id &&
      !rappresentante.prodotti.some((item) => item.id === filtri.prodotto_id)
    )
      return false;
    if (filtri.regione && rappresentante.regione !== filtri.regione)
      return false;
    if (filtri.provincia && rappresentante.provincia !== filtri.provincia)
      return false;
    if (filtri.stato === "attivi" && !rappresentante.active) return false;
    if (filtri.stato === "non_attivi" && rappresentante.active) return false;
    if (filtri.email === "presente" && !rappresentante.email) return false;
    if (filtri.email === "assente" && rappresentante.email) return false;
    if (filtri.telefono === "presente" && !rappresentante.cellulare)
      return false;
    if (filtri.telefono === "assente" && rappresentante.cellulare) return false;

    const giorni = giorniDa(rappresentante.ultimo_contatto_at);
    if (filtri.ultimo_contatto === "30" && giorni > 30) return false;
    if (filtri.ultimo_contatto === "90" && giorni > 90) return false;
    if (
      filtri.ultimo_contatto === "oltre_90" &&
      (!Number.isFinite(giorni) || giorni <= 90)
    )
      return false;
    if (
      filtri.ultimo_contatto === "mai" &&
      rappresentante.ultimo_contatto_at
    )
      return false;

    return true;
  });
}

export function ordinaRappresentanti(
  rappresentanti: Rappresentante[],
  ordinamento: OrdinamentoRappresentanti
) {
  const lista = [...rappresentanti];
  const collator = new Intl.Collator("it", {
    numeric: true,
    sensitivity: "base",
  });

  return lista.sort((a, b) => {
    if (ordinamento === "azienda") {
      const aziendaA =
        a.aziende[0]?.azienda.nome_commerciale ||
        a.aziende[0]?.azienda.ragione_sociale ||
        "";
      const aziendaB =
        b.aziende[0]?.azienda.nome_commerciale ||
        b.aziende[0]?.azienda.ragione_sociale ||
        "";
      return collator.compare(aziendaA, aziendaB);
    }
    if (ordinamento === "ultimo_contatto") {
      return (
        new Date(b.ultimo_contatto_at || 0).getTime() -
        new Date(a.ultimo_contatto_at || 0).getTime()
      );
    }
    if (ordinamento === "created_at" || ordinamento === "updated_at") {
      return (
        new Date(b[ordinamento]).getTime() -
        new Date(a[ordinamento]).getTime()
      );
    }
    return collator.compare(
      `${a.cognome} ${a.nome}`,
      `${b.cognome} ${b.nome}`
    );
  });
}

function csvCell(valore: string | number | boolean | null | undefined) {
  const testo = String(valore ?? "");
  return `"${testo.replace(/"/g, '""')}"`;
}

export function esportaRappresentantiCsv(rappresentanti: Rappresentante[]) {
  const intestazione = [
    "Nome",
    "Cognome",
    "Ruolo",
    "Aziende",
    "Prodotti",
    "Categorie",
    "Regione",
    "Provincia",
    "Cellulare",
    "Email",
    "Ultimo contatto",
    "Attivo",
  ];
  const righe = rappresentanti.map((item) => [
    item.nome,
    item.cognome,
    item.ruolo,
    item.aziende
      .map(
        (azienda) =>
          azienda.azienda.nome_commerciale || azienda.azienda.ragione_sociale
      )
      .join("; "),
    item.prodotti.map((prodotto) => prodotto.nome).join("; "),
    item.categorie.map((categoria) => categoria.nome).join("; "),
    item.regione,
    item.provincia,
    item.cellulare,
    item.email,
    item.ultimo_contatto_at,
    item.active ? "Sì" : "No",
  ]);
  const contenuto = [intestazione, ...righe]
    .map((riga) => riga.map(csvCell).join(","))
    .join("\r\n");
  const blob = new Blob(["\uFEFF", contenuto], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `rubrica-rappresentanti-${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function leggiCsvRappresentanti(testo: string) {
  const righe = testo
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter(Boolean);
  if (righe.length < 2) return [];

  function parseRiga(riga: string) {
    const valori: string[] = [];
    let corrente = "";
    let virgolette = false;
    for (let indice = 0; indice < riga.length; indice += 1) {
      const carattere = riga[indice];
      if (carattere === '"') {
        if (virgolette && riga[indice + 1] === '"') {
          corrente += '"';
          indice += 1;
        } else {
          virgolette = !virgolette;
        }
      } else if (carattere === "," && !virgolette) {
        valori.push(corrente.trim());
        corrente = "";
      } else {
        corrente += carattere;
      }
    }
    valori.push(corrente.trim());
    return valori;
  }

  const intestazioni = parseRiga(righe[0]).map((item) =>
    item.toLocaleLowerCase("it-IT")
  );
  return righe.slice(1).map((riga) => {
    const valori = parseRiga(riga);
    const valore = (nome: string) => valori[intestazioni.indexOf(nome)] || "";
    return {
      nome: valore("nome"),
      cognome: valore("cognome"),
      ruolo: valore("ruolo"),
      cellulare: normalizzaTelefono(valore("cellulare")),
      email: valore("email"),
      regione: valore("regione"),
      provincia: valore("provincia"),
    };
  });
}
