export type PersonaEmailSettimanale = {
  id: string;
  nome: string;
  email: string | null;
  attivo: boolean;
  ruolo_organigramma: string | null;
  titolo_ruolo: string | null;
  descrizione: string | null;
  foto_url: string | null;
};

export type VoceProfiloSettimanale = {
  titolo: string;
  tipo: "compito" | "responsabilita";
  completata: boolean;
};

export type AttivitaEmailSettimanale = {
  tipo: "attivita" | "appuntamento";
  titolo: string;
  commessaTitolo: string | null;
  commessaCodice: string | null;
  priorita: string | null;
  dataInizio: string;
  dataFine?: string | null;
  ora?: string | null;
  posizione?: string | null;
};

export type ContenutoEmailSettimanale = {
  persona: PersonaEmailSettimanale;
  numeroSettimana: number;
  dataInizio: string;
  dataFine: string;
  attivita: AttivitaEmailSettimanale[];
  profilo: VoceProfiloSettimanale[];
  fraseMotivazionale: string;
};

const FRASI_MOTIVAZIONALI = [
  "Stay hungry. Stay foolish.",
  "Il mondo si cambia un pezzo alla volta.",
  "La costanza trasforma il lavoro in risultato.",
  "Ogni progetto importante comincia da un passo fatto bene.",
  "Le idee prendono forma quando qualcuno decide di iniziare.",
  "La qualità nasce dalle attenzioni di ogni giorno.",
  "Fai oggi ciò che avvicina il progetto alla sua forma migliore.",
  "Un buon lavoro cresce un dettaglio alla volta.",
] as const;

const STILE_PRIORITA: Record<
  string,
  { colore: string; sfondo: string; simbolo: string }
> = {
  Urgente: { colore: "#B84929", sfondo: "#FFF3EE", simbolo: "!" },
  Alta: { colore: "#A87500", sfondo: "#FFF9E8", simbolo: "▲" },
  Normale: { colore: "#2D80B3", sfondo: "#F2F8FC", simbolo: "●" },
  Bassa: { colore: "#4D9634", sfondo: "#F3FAF0", simbolo: "▼" },
  Terminato: { colore: "#667085", sfondo: "#F5F5F5", simbolo: "✓" },
};

const NOMI_RUOLO: Record<string, string> = {
  amministratore: "Amministratore",
  project_manager: "Project Manager",
  collaboratore: "Collaboratore",
};

export function parseDataItaliana(value: string) {
  const [anno, mese, giorno] = value.slice(0, 10).split("-").map(Number);
  return new Date(anno, mese - 1, giorno, 12, 0, 0, 0);
}

export function formattaDataIso(data: Date) {
  const anno = data.getFullYear();
  const mese = String(data.getMonth() + 1).padStart(2, "0");
  const giorno = String(data.getDate()).padStart(2, "0");
  return `${anno}-${mese}-${giorno}`;
}

export function lunediDellaSettimana(data: Date) {
  const risultato = new Date(
    data.getFullYear(),
    data.getMonth(),
    data.getDate(),
    12
  );
  const giorno = risultato.getDay() || 7;
  risultato.setDate(risultato.getDate() - giorno + 1);
  return risultato;
}

export function intervalloSettimana(dataInizio: string) {
  const lunedi = lunediDellaSettimana(parseDataItaliana(dataInizio));
  const domenica = new Date(lunedi);
  domenica.setDate(domenica.getDate() + 6);
  return {
    dataInizio: formattaDataIso(lunedi),
    dataFine: formattaDataIso(domenica),
    numeroSettimana: numeroSettimanaIso(lunedi),
  };
}

export function numeroSettimanaIso(data: Date) {
  const dataUtc = new Date(
    Date.UTC(data.getFullYear(), data.getMonth(), data.getDate())
  );
  const giorno = dataUtc.getUTCDay() || 7;
  dataUtc.setUTCDate(dataUtc.getUTCDate() + 4 - giorno);
  const inizioAnno = new Date(Date.UTC(dataUtc.getUTCFullYear(), 0, 1));
  return Math.ceil(
    ((dataUtc.getTime() - inizioAnno.getTime()) / 86400000 + 1) / 7
  );
}

export function giorniLavorativiAttivita(dataInizio: string, giorni: number) {
  const risultato: string[] = [];
  const corrente = parseDataItaliana(dataInizio);
  const totale = Math.max(1, Math.trunc(Number(giorni) || 1));

  while (risultato.length < totale) {
    if (corrente.getDay() !== 0 && corrente.getDay() !== 6) {
      risultato.push(formattaDataIso(corrente));
    }
    corrente.setDate(corrente.getDate() + 1);
  }
  return risultato;
}

export function limitaAttivitaAllaSettimana(
  dataInizio: string,
  giorni: number,
  inizioSettimana: string,
  fineSettimana: string
) {
  const giorniNellaSettimana = giorniLavorativiAttivita(dataInizio, giorni).filter(
    (data) => data >= inizioSettimana && data <= fineSettimana
  );
  if (!giorniNellaSettimana.length) return null;
  return {
    dataInizio: giorniNellaSettimana[0],
    dataFine: giorniNellaSettimana.at(-1) || giorniNellaSettimana[0],
  };
}

export function creaOggettoEmail(numeroSettimana: number) {
  return `La tua week ${numeroSettimana} in FIDEPA`;
}

export function scegliFraseMotivazionale(
  personaId: string,
  numeroSettimana: number,
  dataInizio: string
) {
  let hash = numeroSettimana + Number(dataInizio.slice(0, 4));
  for (const carattere of personaId) {
    hash = (hash * 31 + carattere.charCodeAt(0)) >>> 0;
  }
  return FRASI_MOTIVAZIONALI[hash % FRASI_MOTIVAZIONALI.length];
}

function dataEstesa(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(parseDataItaliana(value));
}

function dataBreve(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parseDataItaliana(value));
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (carattere) => {
    const entita: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };
    return entita[carattere];
  });
}

function etichettaRuolo(persona: PersonaEmailSettimanale) {
  return (
    persona.titolo_ruolo?.trim() ||
    NOMI_RUOLO[persona.ruolo_organigramma || ""] ||
    "Componente del personale"
  );
}

function rigaAttivitaHtml(item: AttivitaEmailSettimanale) {
  const data =
    item.dataFine && item.dataFine !== item.dataInizio
      ? `${dataBreve(item.dataInizio)} – ${dataBreve(item.dataFine)}`
      : dataEstesa(item.dataInizio);
  const dettagli = [
    item.tipo === "appuntamento" && item.ora
      ? `ore ${item.ora.slice(0, 5)}`
      : null,
    item.posizione,
  ]
    .filter(Boolean)
    .join(" · ");
  const priorita = item.priorita || "Non indicata";
  const stile = STILE_PRIORITA[item.priorita || ""] || {
    colore: "#667085",
    sfondo: "#F8F9FB",
    simbolo: "○",
  };
  const titoloCommessa =
    item.commessaTitolo ||
    (item.tipo === "appuntamento" ? "Appuntamento non associato" : "Attività non associata");

  return `<tr>
    <td style="padding:0 0 10px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid ${stile.colore}33;border-left:5px solid ${stile.colore};border-radius:8px;background:${stile.sfondo};">
        <tr><td style="padding:15px 17px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr>
            <td valign="middle"><p style="margin:0;color:${stile.colore};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;">${escapeHtml(
              item.tipo === "appuntamento" ? "Appuntamento" : "Attività"
            )} · ${escapeHtml(data)}</p></td>
            <td align="right" valign="middle"><span style="display:inline-block;border:1px solid ${stile.colore}55;border-radius:999px;background:#ffffff;padding:4px 9px;color:${stile.colore};font-size:11px;font-weight:700;white-space:nowrap;">${stile.simbolo}&nbsp; ${escapeHtml(
              priorita
            )}</span></td>
          </tr></table>
          <p style="margin:9px 0 0;color:#2B2F5E;font-size:17px;line-height:1.35;font-weight:700;">${escapeHtml(
            titoloCommessa
          )}</p>
          ${
            item.commessaCodice
              ? `<p style="margin:3px 0 0;color:#667085;font-size:12px;">Codice ${escapeHtml(
                  item.commessaCodice
                )}</p>`
              : ""
          }
          <p style="margin:12px 0 3px;color:${stile.colore};font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;">${
            item.tipo === "appuntamento" ? "Appuntamento previsto" : "Attività da svolgere"
          }</p>
          <p style="margin:0;color:#344054;font-size:15px;line-height:1.45;font-weight:600;">${escapeHtml(
            item.titolo
          )}</p>
          ${
            dettagli
              ? `<p style="margin:5px 0 0;color:#667085;font-size:13px;line-height:1.45;">${escapeHtml(
                  dettagli
                )}</p>`
              : ""
          }
        </td></tr>
      </table>
    </td>
  </tr>`;
}

function iniziali(nome: string) {
  return (
    nome
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((parte) => parte.charAt(0).toLocaleUpperCase("it-IT"))
      .join("") || "F"
  );
}

function avatarHtml(persona: PersonaEmailSettimanale) {
  const foto = persona.foto_url?.trim();
  if (foto && /^https:\/\//i.test(foto)) {
    return `<img src="${escapeHtml(foto)}" width="64" height="64" alt="Foto di ${escapeHtml(
      persona.nome
    )}" style="display:block;width:64px;height:64px;border-radius:50%;object-fit:cover;border:3px solid #EAF3FA;">`;
  }
  return `<span style="display:inline-block;width:64px;height:64px;border-radius:50%;background:#EAF3FA;color:#2D80B3;font-size:20px;font-weight:700;line-height:64px;text-align:center;">${escapeHtml(
    iniziali(persona.nome)
  )}</span>`;
}

function elencoProfiloHtml(titolo: string, items: VoceProfiloSettimanale[]) {
  if (!items.length) return "";
  return `<h3 style="margin:22px 0 9px;color:#2B2F5E;font-size:14px;">${escapeHtml(
    titolo
  )}</h3>
  <ul style="margin:0;padding:0 0 0 20px;color:#475467;font-size:13px;line-height:1.55;">
    ${items.map((item) => `<li style="padding:2px 0;">${escapeHtml(item.titolo)}</li>`).join("")}
  </ul>`;
}

export function creaEmailSettimanaleHtml(input: ContenutoEmailSettimanale) {
  const attivitaHtml = input.attivita.length
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">${input.attivita
        .map(rigaAttivitaHtml)
        .join("")}</table>`
    : `<div style="padding:20px;border:1px solid #f0d68a;border-left:4px solid #D79D06;border-radius:8px;background:#fff9e8;color:#5f4a12;font-size:15px;line-height:1.55;">
        Questa settimana non hai attività calendarizzate, quindi vedi di darti da fare in qualche modo.
      </div>`;
  const responsabilita = input.profilo.filter(
    (item) => item.tipo === "responsabilita"
  );
  const compiti = input.profilo.filter(
    (item) => item.tipo === "compito" && !item.completata
  );
  const portaleUrl = process.env.PORTALE_URL?.trim()?.replace(/\/$/, "");
  const link = portaleUrl
    ? `<div style="text-align:center;margin:26px 0 6px;"><a href="${escapeHtml(
        `${portaleUrl}/attivita/calendario`
      )}" style="display:inline-block;border-radius:8px;background:#64B445;color:#ffffff;text-decoration:none;padding:13px 24px;font-size:14px;font-weight:700;">Apri il calendario FIDEPA</a></div>`
    : "";

  return `<!doctype html>
  <html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(
    creaOggettoEmail(input.numeroSettimana)
  )}</title></head>
  <body style="margin:0;background:#F2F2F2;font-family:Arial,Helvetica,sans-serif;color:#344054;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Le attività FIDEPA previste dal ${escapeHtml(
      dataBreve(input.dataInizio)
    )} al ${escapeHtml(dataBreve(input.dataFine))}.</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#F2F2F2;"><tr><td align="center" style="padding:30px 12px 42px;">
      <table role="presentation" width="680" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:680px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 10px 30px rgba(43,47,94,.10);">
        <tr><td style="height:8px;background:#5E9AD3;font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td style="padding:34px 38px;">
          <p style="margin:0 0 7px;color:#D79D06;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;">FIDEPA · Programmazione settimanale</p>
          <h1 style="margin:0;color:#2B2F5E;font-size:28px;line-height:1.2;">${escapeHtml(
            creaOggettoEmail(input.numeroSettimana)
          )}</h1>
          <p style="margin:12px 0 26px;color:#667085;font-size:14px;">Dal ${escapeHtml(
            dataBreve(input.dataInizio)
          )} al ${escapeHtml(dataBreve(input.dataFine))}</p>
          <p style="margin:0 0 20px;font-size:16px;line-height:1.5;">Ciao <strong style="color:#2B2F5E;">${escapeHtml(
            input.persona.nome
          )}</strong>, ecco la tua programmazione della settimana.</p>
          ${attivitaHtml}
          ${link}
          <div style="height:1px;background:#e4e7ec;margin:30px 0 25px;">&nbsp;</div>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr>
            <td width="80" valign="middle">${avatarHtml(input.persona)}</td>
            <td valign="middle">
              <p style="margin:0 0 5px;color:#D79D06;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;">La tua scheda in FIDEPA</p>
              <h2 style="margin:0;color:#2B2F5E;font-size:22px;">${escapeHtml(
                input.persona.nome
              )}</h2>
              <p style="margin:5px 0 0;color:#2D80B3;font-size:14px;font-weight:700;">${escapeHtml(
                etichettaRuolo(input.persona)
              )}</p>
            </td>
          </tr></table>
          ${
            input.persona.descrizione
              ? `<p style="margin:12px 0 0;color:#475467;font-size:14px;line-height:1.55;">${escapeHtml(
                  input.persona.descrizione
                )}</p>`
              : ""
          }
          ${elencoProfiloHtml("Responsabilità", responsabilita)}
          ${elencoProfiloHtml("Compiti", compiti)}
          <div style="margin:30px 0 0;padding:20px 22px;border-radius:10px;background:#2B2F5E;text-align:center;">
            <p style="margin:0 0 6px;color:#D79D06;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;">Pensiero della settimana</p>
            <p style="margin:0;color:#ffffff;font-size:17px;font-style:italic;line-height:1.5;font-weight:600;">“${escapeHtml(
              input.fraseMotivazionale
            )}”</p>
          </div>
        </td></tr>
      </table>
      <p style="margin:22px 0 0;color:#98A2B3;font-size:11px;">Comunicazione automatica del gestionale FIDEPA.</p>
    </td></tr></table>
  </body></html>`;
}

export function creaEmailSettimanaleTesto(input: ContenutoEmailSettimanale) {
  const righe = [
    creaOggettoEmail(input.numeroSettimana),
    `Dal ${dataBreve(input.dataInizio)} al ${dataBreve(input.dataFine)}`,
    "",
    `Ciao ${input.persona.nome},`,
    "",
  ];
  if (input.attivita.length) {
    righe.push("ATTIVITÀ PREVISTE");
    for (const item of input.attivita) {
      const dettagli = [
        item.dataInizio,
        item.ora?.slice(0, 5),
        item.commessaTitolo,
        item.priorita ? `Priorità ${item.priorita}` : null,
      ]
        .filter(Boolean)
        .join(" · ");
      righe.push(`- ${item.titolo}${dettagli ? ` (${dettagli})` : ""}`);
    }
  } else {
    righe.push(
      "Questa settimana non hai attività calendarizzate, quindi vedi di darti da fare in qualche modo."
    );
  }
  righe.push("", "LA TUA SCHEDA", input.persona.nome, etichettaRuolo(input.persona));
  if (input.persona.descrizione) righe.push(input.persona.descrizione);
  const responsabilita = input.profilo.filter((item) => item.tipo === "responsabilita");
  const compiti = input.profilo.filter(
    (item) => item.tipo === "compito" && !item.completata
  );
  if (responsabilita.length) {
    righe.push("", "Responsabilità:", ...responsabilita.map((item) => `- ${item.titolo}`));
  }
  if (compiti.length) {
    righe.push("", "Compiti:", ...compiti.map((item) => `- ${item.titolo}`));
  }
  righe.push("", `Pensiero della settimana: “${input.fraseMotivazionale}”`);
  righe.push("", "Comunicazione automatica del gestionale FIDEPA.");
  return righe.join("\n");
}
