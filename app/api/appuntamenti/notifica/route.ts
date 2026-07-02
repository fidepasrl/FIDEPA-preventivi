import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

export const runtime = "nodejs";

type TipoNotifica = "creato" | "modificato" | "spostato" | "eliminato";

type NotificaAppuntamentoPayload = {
  tipo: TipoNotifica;
  appuntamentoId: string;
  personaIds: string[];
  personaRimossiIds: string[];
  commessaTitolo: string;
  data: string;
  ora: string;
  posizione: string;
  descrizione: string;
  requestId: string;
};

type PersonaEmail = {
  id: string;
  nome: string;
  email: string | null;
};

type ConsiglioEmail = {
  testo: string;
};

const TITOLI_NOTIFICA: Record<TipoNotifica | "rimosso", string> = {
  creato: "Nuovo appuntamento",
  modificato: "Appuntamento modificato",
  spostato: "Appuntamento spostato",
  eliminato: "Appuntamento annullato",
  rimosso: "Rimozione da un appuntamento",
};

export async function POST(request: Request) {
  const token = estraiBearerToken(request.headers.get("authorization"));

  if (!token) {
    return Response.json({ error: "Accesso non autorizzato." }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return Response.json(
      { error: "Configurazione Supabase server incompleta." },
      { status: 503 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser(token);

  if (!user) {
    return Response.json({ error: "Sessione non valida." }, { status: 401 });
  }

  let payload: NotificaAppuntamentoPayload;

  try {
    payload = (await request.json()) as NotificaAppuntamentoPayload;
  } catch {
    return Response.json({ error: "Richiesta non valida." }, { status: 400 });
  }

  if (!payloadValido(payload)) {
    return Response.json(
      { error: "Dati della notifica incompleti." },
      { status: 400 }
    );
  }

  const personaIds = [
    ...new Set([...payload.personaIds, ...payload.personaRimossiIds]),
  ];

  if (personaIds.length === 0) {
    return Response.json({ inviate: 0, senzaEmail: 0 });
  }

  const [personeResult, consigliResult] = await Promise.all([
    supabase
      .from("personale")
      .select("id, nome, email")
      .in("id", personaIds),
    supabase.from("consigli").select("testo").eq("attivo", true),
  ]);

  if (personeResult.error) {
    console.error(
      "Errore lettura destinatari appuntamento:",
      personeResult.error
    );
    return Response.json(
      { error: "Impossibile leggere gli indirizzi del personale." },
      { status: 500 }
    );
  }

  if (consigliResult.error) {
    console.error("Errore lettura consigli email:", consigliResult.error);
  }

  const persone = (personeResult.data || []) as PersonaEmail[];
  const consigli = (consigliResult.data || []) as ConsiglioEmail[];
  const personeConEmail = persone.filter((persona) => persona.email?.trim());
  const senzaEmail = personaIds.length - personeConEmail.length;
  const gmailUser = process.env.GMAIL_USER || "fidepasrl@gmail.com";
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, "");

  if (!gmailAppPassword) {
    return Response.json(
      {
        error: "Configura GMAIL_APP_PASSWORD sul server.",
      },
      { status: 503 }
    );
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: gmailUser,
      pass: gmailAppPassword,
    },
  });
  const sequenzaCalendario = Math.floor(Date.now() / 1000);

  const esiti = await Promise.all(
    personeConEmail.map(async (persona) => {
      const rimossa = payload.personaRimossiIds.includes(persona.id);
      const tipoMessaggio = rimossa ? "rimosso" : payload.tipo;
      const titolo = TITOLI_NOTIFICA[tipoMessaggio];
      const consiglio = scegliConsiglioCasuale(consigli);
      const metodoCalendario =
        tipoMessaggio === "eliminato" || tipoMessaggio === "rimosso"
          ? "CANCEL"
          : "REQUEST";

      try {
        await transporter.sendMail({
          from: `FIDEPA Studio <${gmailUser}>`,
          to: persona.email!,
          subject: `[FIDEPA] ${titolo}: ${payload.commessaTitolo}`,
          html: creaEmailHtml(
            persona.nome,
            payload,
            tipoMessaggio,
            consiglio
          ),
          text: creaEmailTesto(
            persona.nome,
            payload,
            tipoMessaggio,
            consiglio
          ),
          messageId: `<${normalizzaId(payload.requestId)}-${persona.id}@fidepa-app>`,
          icalEvent: {
            filename: "appuntamento-fidepa.ics",
            method: metodoCalendario,
            content: creaEventoCalendario({
              persona,
              payload,
              metodo: metodoCalendario,
              organizzatore: gmailUser,
              sequenza: sequenzaCalendario,
            }),
          },
        });
        return true;
      } catch (error) {
        console.error("Errore invio Gmail:", error);
        return false;
      }
    })
  );
  const fallite = esiti.filter((esito) => !esito).length;

  if (fallite > 0) {
    return Response.json(
      {
        error: `${fallite} notifiche non sono state consegnate al provider.`,
        inviate: esiti.length - fallite,
        senzaEmail,
      },
      { status: 502 }
    );
  }

  return Response.json({ inviate: esiti.length, senzaEmail });
}

function payloadValido(
  payload: NotificaAppuntamentoPayload | null | undefined
): payload is NotificaAppuntamentoPayload {
  return Boolean(
    payload &&
      ["creato", "modificato", "spostato", "eliminato"].includes(
        payload.tipo
      ) &&
      payload.appuntamentoId &&
      Array.isArray(payload.personaIds) &&
      Array.isArray(payload.personaRimossiIds) &&
      payload.commessaTitolo?.trim() &&
      payload.data &&
      payload.ora &&
      typeof payload.posizione === "string" &&
      payload.descrizione?.trim() &&
      payload.requestId
  );
}

function estraiBearerToken(header: string | null) {
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7).trim() || null;
}

function creaEmailHtml(
  nome: string,
  payload: NotificaAppuntamentoPayload,
  tipo: TipoNotifica | "rimosso",
  consiglio: string | null
) {
  const titolo = TITOLI_NOTIFICA[tipo];
  const messaggio = messaggioAzione(tipo);
  const portaleUrl = process.env.PORTALE_URL?.trim();
  const linkCalendario = portaleUrl
    ? `${portaleUrl.replace(/\/$/, "")}/attivita/calendario`
    : "https://calendar.google.com/calendar/u/0/r";
  const testoPulsante =
    portaleUrl && tipo !== "eliminato" && tipo !== "rimosso"
      ? "Apri appuntamento"
      : "Apri calendario";

  return `<!doctype html>
<html lang="it">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(titolo)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f6fb;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(
      `${titolo} - ${payload.commessaTitolo}`
    )}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f3f6fb;">
      <tr>
        <td style="height:8px;background:#073a96;font-size:0;line-height:0;">&nbsp;</td>
      </tr>
      <tr>
        <td align="center" style="padding:32px 14px 42px;">
          <table role="presentation" width="680" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:680px;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;box-shadow:0 8px 24px rgba(15,56,120,0.10);">
            <tr>
              <td style="padding:34px 42px 30px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td width="78" valign="middle" style="width:78px;">
                      <table role="presentation" width="64" height="64" cellspacing="0" cellpadding="0" border="0" style="width:64px;height:64px;background:#e8f0ff;border-radius:50%;">
                        <tr><td align="center" valign="middle">${iconaCalendarioEmail(
                          true
                        )}</td></tr>
                      </table>
                    </td>
                    <td valign="middle">
                      <h1 style="margin:0;color:#082b6f;font-size:28px;line-height:1.18;font-weight:700;">${escapeHtml(
                        titolo
                      )}</h1>
                      <div style="width:48px;height:4px;background:#2f73ff;border-radius:2px;margin-top:14px;">&nbsp;</div>
                    </td>
                  </tr>
                </table>

                <p style="margin:28px 0 8px;font-size:16px;line-height:1.5;">Ciao <strong>${escapeHtml(
                  nome
                )}</strong>,</p>
                <p style="margin:0 0 26px;font-size:16px;line-height:1.5;color:#374151;">${escapeHtml(
                  messaggio
                )}</p>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-collapse:separate;border-spacing:0;border:1px solid #dbe3ef;border-radius:6px;overflow:hidden;">
                  ${rigaEmail("commessa", "Commessa", payload.commessaTitolo, false)}
                  ${rigaEmail("data", "Data", formattaData(payload.data), true)}
                  ${rigaEmail("ora", "Ora", payload.ora.slice(0, 5), true)}
                  ${rigaEmail("posizione", "Posizione", payload.posizione || "Non indicata", false)}
                  ${rigaEmail("descrizione", "Descrizione", payload.descrizione, false, true)}
                </table>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td align="center" style="padding:24px 0 20px;">
                      <a href="${escapeHtml(
                        linkCalendario
                      )}" style="display:inline-block;background:#073a96;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:13px 26px;border-radius:6px;">${iconaCalendarioPulsante()}${escapeHtml(
                        testoPulsante
                      )}</a>
                    </td>
                  </tr>
                </table>

                ${creaBloccoConsiglio(consiglio)}

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#eef4ff;border-radius:5px;">
                  <tr>
                    <td width="42" align="center" style="width:42px;padding:15px 0 15px 14px;">${iconaInfoEmail()}</td>
                    <td style="padding:15px 16px 15px 8px;font-size:13px;line-height:1.5;color:#374151;">Se non riconosci questa comunicazione, contatta l&apos;amministratore del portale <strong style="color:#0b58d5;">FIDEPA</strong>.</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <table role="presentation" width="680" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:680px;">
            <tr>
              <td align="center" style="padding:30px 20px 0;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="height:1px;background:#d7dfeb;font-size:0;line-height:0;">&nbsp;</td>
                    <td width="62" align="center" style="width:62px;">
                      ${logoFidepaEmail()}
                    </td>
                    <td style="height:1px;background:#d7dfeb;font-size:0;line-height:0;">&nbsp;</td>
                  </tr>
                </table>
                <p style="margin:12px 0 2px;font-size:16px;font-weight:700;color:#374151;">FIDEPA Studio</p>
                <p style="margin:0;font-size:13px;color:#4b5563;">Gestione Commesse</p>
                <div style="width:30px;height:2px;background:#4f83ff;margin:16px auto;">&nbsp;</div>
                <p style="margin:0;font-size:11px;line-height:1.5;color:#8a94a3;">Questa &egrave; una comunicazione automatica, si prega di non rispondere a questa email.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function creaEmailTesto(
  nome: string,
  payload: NotificaAppuntamentoPayload,
  tipo: TipoNotifica | "rimosso",
  consiglio: string | null
) {
  const righe = [
    `Ciao ${nome},`,
    "",
    TITOLI_NOTIFICA[tipo],
    messaggioAzione(tipo),
    "",
    `Commessa: ${payload.commessaTitolo}`,
    `Data: ${formattaData(payload.data)}`,
    `Ora: ${payload.ora.slice(0, 5)}`,
    `Posizione: ${payload.posizione || "Non indicata"}`,
    `Descrizione: ${payload.descrizione}`,
  ];

  if (consiglio) {
    righe.push("", "Consiglio del giorno:", consiglio);
  }

  righe.push("", "Notifica automatica del portale FIDEPA.");
  return righe.join("\n");
}

function creaBloccoConsiglio(consiglio: string | null) {
  if (!consiglio) return "";

  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#fff9e8;border-left:4px solid #d79d06;border-radius:5px;margin:0 0 16px;">
    <tr>
      <td width="48" align="center" valign="top" style="width:48px;padding:16px 0 16px 14px;">
        <table role="presentation" width="24" height="24" cellspacing="0" cellpadding="0" border="0" style="width:24px;height:24px;background:#d79d06;border-radius:50%;">
          <tr><td align="center" valign="middle" style="color:#ffffff;font-size:14px;font-weight:700;line-height:1;">&#9733;</td></tr>
        </table>
      </td>
      <td style="padding:14px 16px 14px 10px;">
        <p style="margin:0 0 5px;color:#8a6400;font-size:12px;font-weight:700;text-transform:uppercase;">Consiglio del giorno:</p>
        <p style="margin:0;color:#374151;font-size:14px;line-height:1.5;">${escapeHtml(
          consiglio
        )}</p>
      </td>
    </tr>
  </table>`;
}

function scegliConsiglioCasuale(consigli: ConsiglioEmail[]) {
  if (consigli.length === 0) return null;

  return consigli[Math.floor(Math.random() * consigli.length)].testo;
}

function messaggioAzione(tipo: TipoNotifica | "rimosso") {
  if (tipo === "creato") return "Sei stato assegnato a un nuovo appuntamento.";
  if (tipo === "spostato") return "L'appuntamento a cui sei assegnato \u00e8 stato spostato.";
  if (tipo === "eliminato") return "L'appuntamento indicato \u00e8 stato annullato.";
  if (tipo === "rimosso") return "Non sei pi\u00f9 assegnato all'appuntamento indicato.";
  return "L'appuntamento a cui sei assegnato \u00e8 stato modificato.";
}

function rigaEmail(
  icona: "commessa" | "data" | "ora" | "posizione" | "descrizione",
  etichetta: string,
  valore: string,
  evidenziato: boolean,
  ultima = false
) {
  return `<tr>
    <td width="52" align="center" style="width:52px;padding:14px 6px;border-bottom:${
      ultima ? "0" : "1px solid #dbe3ef"
    };color:#1769e8;">${iconaRigaEmail(icona)}</td>
    <td width="130" style="width:130px;padding:14px 8px;border-bottom:${
      ultima ? "0" : "1px solid #dbe3ef"
    };color:#1769e8;font-size:14px;font-weight:700;">${escapeHtml(etichetta)}</td>
    <td style="padding:14px 14px;border-bottom:${
      ultima ? "0" : "1px solid #dbe3ef"
    };color:#111827;font-size:14px;line-height:1.4;font-weight:${
      evidenziato ? "700" : "400"
    };">${escapeHtml(valore)}</td>
  </tr>`;
}

function iconaCalendarioEmail(grande = false) {
  const larghezza = grande ? 30 : 22;
  const altezza = grande ? 28 : 21;
  const testata = grande ? 7 : 5;
  const carattere = grande ? 13 : 10;

  return `<table role="presentation" width="${larghezza}" height="${altezza}" cellspacing="0" cellpadding="0" border="0" style="width:${larghezza}px;height:${altezza}px;border:2px solid #1769e8;border-radius:3px;border-collapse:separate;">
    <tr><td height="${testata}" style="height:${testata}px;border-bottom:2px solid #1769e8;font-size:0;line-height:0;">&nbsp;</td></tr>
    <tr><td align="center" valign="middle" style="color:#1769e8;font-size:${carattere}px;font-weight:700;line-height:1;">&#10003;</td></tr>
  </table>`;
}

function iconaRigaEmail(
  tipo: "commessa" | "data" | "ora" | "posizione" | "descrizione"
) {
  if (tipo === "data") return iconaCalendarioEmail();

  if (tipo === "ora") {
    return `<table role="presentation" width="24" height="24" cellspacing="0" cellpadding="0" border="0" style="width:24px;height:24px;border:2px solid #1769e8;border-radius:50%;border-collapse:separate;">
      <tr><td align="center" valign="middle" style="color:#1769e8;font-size:13px;font-weight:700;line-height:1;">&#8599;</td></tr>
    </table>`;
  }

  if (tipo === "descrizione") {
    return `<table role="presentation" width="21" height="25" cellspacing="0" cellpadding="0" border="0" style="width:21px;height:25px;border:2px solid #1769e8;border-radius:2px;border-collapse:separate;">
      <tr><td align="center" valign="middle" style="color:#1769e8;font-size:15px;font-weight:700;line-height:1;">&#8801;</td></tr>
    </table>`;
  }

  if (tipo === "posizione") {
    return `<table role="presentation" width="24" height="24" cellspacing="0" cellpadding="0" border="0" style="width:24px;height:24px;border:2px solid #1769e8;border-radius:50% 50% 50% 4px;border-collapse:separate;">
      <tr><td align="center" valign="middle" style="color:#1769e8;font-size:16px;font-weight:700;line-height:1;">&#8226;</td></tr>
    </table>`;
  }

  return `<table role="presentation" width="25" cellspacing="0" cellpadding="0" border="0">
    <tr><td align="center" style="font-size:0;line-height:0;"><span style="display:inline-block;width:10px;height:4px;border:2px solid #1769e8;border-bottom:0;border-radius:2px 2px 0 0;">&nbsp;</span></td></tr>
    <tr><td align="center"><span style="display:inline-block;width:22px;height:14px;border:2px solid #1769e8;border-radius:2px;color:#1769e8;font-size:0;line-height:0;">&nbsp;</span></td></tr>
  </table>`;
}

function iconaCalendarioPulsante() {
  return `<span style="display:inline-block;margin-right:9px;font-size:17px;line-height:1;vertical-align:-1px;">&#9638;</span>`;
}

function iconaInfoEmail() {
  return `<table role="presentation" width="20" height="20" cellspacing="0" cellpadding="0" border="0" style="width:20px;height:20px;border:2px solid #1769e8;border-radius:50%;border-collapse:separate;">
    <tr><td align="center" valign="middle" style="color:#1769e8;font-size:12px;font-weight:700;line-height:1;">i</td></tr>
  </table>`;
}

function logoFidepaEmail() {
  return `<table role="presentation" width="42" height="42" cellspacing="0" cellpadding="0" border="0" style="width:42px;height:42px;background:#073a96;border-radius:50%;">
    <tr>
      <td align="center" valign="middle">
        <table role="presentation" width="20" cellspacing="0" cellpadding="0" border="0">
          <tr><td height="4" style="height:4px;background:#ffffff;font-size:0;line-height:0;">&nbsp;</td></tr>
          <tr><td height="5" style="height:5px;font-size:0;line-height:0;">&nbsp;</td></tr>
          <tr><td><table role="presentation" width="14" cellspacing="0" cellpadding="0" border="0"><tr><td height="4" style="height:4px;background:#ffffff;font-size:0;line-height:0;">&nbsp;</td></tr></table></td></tr>
        </table>
      </td>
    </tr>
  </table>`;
}

function formattaData(value: string) {
  const formattata = new Date(`${value}T00:00:00`).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return formattata.replace(/\b\p{L}/u, (lettera) => lettera.toUpperCase());
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

function normalizzaId(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 120) || "notifica";
}

function creaEventoCalendario({
  persona,
  payload,
  metodo,
  organizzatore,
  sequenza,
}: {
  persona: PersonaEmail;
  payload: NotificaAppuntamentoPayload;
  metodo: "REQUEST" | "CANCEL";
  organizzatore: string;
  sequenza: number;
}) {
  const inizio = dataOraRomaInUtc(payload.data, payload.ora);
  const fine = new Date(inizio.getTime() + 60 * 60 * 1000);
  const stato = metodo === "CANCEL" ? "CANCELLED" : "CONFIRMED";
  const adesso = new Date();
  const righe = [
    "BEGIN:VCALENDAR",
    "PRODID:-//FIDEPA//Portale Gestionale//IT",
    "VERSION:2.0",
    "CALSCALE:GREGORIAN",
    `METHOD:${metodo}`,
    "BEGIN:VEVENT",
    `UID:appuntamento-${payload.appuntamentoId}@fidepa.local`,
    `DTSTAMP:${formattaDataIcsUtc(adesso)}`,
    `LAST-MODIFIED:${formattaDataIcsUtc(adesso)}`,
    `DTSTART:${formattaDataIcsUtc(inizio)}`,
    `DTEND:${formattaDataIcsUtc(fine)}`,
    `SEQUENCE:${sequenza}`,
    `STATUS:${stato}`,
    "CLASS:PUBLIC",
    "TRANSP:OPAQUE",
    `ORGANIZER;CN="FIDEPA Studio":mailto:${organizzatore}`,
    `ATTENDEE;CN=${escapeParametroIcs(persona.nome)};ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${persona.email}`,
    `SUMMARY:${escapeTestoIcs(`Appuntamento FIDEPA - ${payload.commessaTitolo}`)}`,
    `DESCRIPTION:${escapeTestoIcs(payload.descrizione)}`,
    `LOCATION:${escapeTestoIcs(payload.posizione || payload.commessaTitolo)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return righe.flatMap(piegaRigaIcs).join("\r\n") + "\r\n";
}

function dataOraRomaInUtc(data: string, ora: string) {
  const [anno, mese, giorno] = data.split("-").map(Number);
  const [ore, minuti] = ora.split(":").map(Number);
  const obiettivoLocale = Date.UTC(anno, mese - 1, giorno, ore, minuti, 0);
  let tentativoUtc = obiettivoLocale;

  for (let passaggio = 0; passaggio < 3; passaggio += 1) {
    const parti = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Rome",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(tentativoUtc));
    const valori = new Map(parti.map((parte) => [parte.type, parte.value]));
    const rappresentatoComeUtc = Date.UTC(
      Number(valori.get("year")),
      Number(valori.get("month")) - 1,
      Number(valori.get("day")),
      Number(valori.get("hour")),
      Number(valori.get("minute")),
      Number(valori.get("second"))
    );

    tentativoUtc += obiettivoLocale - rappresentatoComeUtc;
  }

  return new Date(tentativoUtc);
}

function formattaDataIcsUtc(data: Date) {
  return data
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function escapeTestoIcs(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

function escapeParametroIcs(value: string) {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, "'")}"`;
}

function piegaRigaIcs(riga: string) {
  const righe: string[] = [];
  let corrente = "";

  for (const carattere of riga) {
    if (Buffer.byteLength(corrente + carattere, "utf8") > 75) {
      righe.push(corrente);
      corrente = ` ${carattere}`;
    } else {
      corrente += carattere;
    }
  }

  if (corrente) righe.push(corrente);
  return righe;
}
