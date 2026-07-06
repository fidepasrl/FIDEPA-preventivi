import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

export const runtime = "nodejs";

type PromemoriaPayload = {
  personaId: string;
  testo: string;
};

type PersonaEmail = {
  id: string;
  nome: string;
  email: string | null;
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

  let payload: PromemoriaPayload;

  try {
    payload = (await request.json()) as PromemoriaPayload;
  } catch {
    return Response.json({ error: "Richiesta non valida." }, { status: 400 });
  }

  const testo = payload?.testo?.trim();
  if (!payload?.personaId || !testo || testo.length > 1500) {
    return Response.json(
      { error: "Dati del promemoria non validi." },
      { status: 400 }
    );
  }

  const [personaResult, consigliResult] = await Promise.all([
    supabase
      .from("personale")
      .select("id, nome, email")
      .eq("id", payload.personaId)
      .single(),
    supabase.from("consigli").select("testo").eq("attivo", true),
  ]);

  if (personaResult.error || !personaResult.data) {
    return Response.json(
      { error: "Destinatario non trovato." },
      { status: 404 }
    );
  }

  const persona = personaResult.data as PersonaEmail;
  if (!persona.email?.trim()) {
    return Response.json(
      { error: "Il destinatario non ha un indirizzo email configurato." },
      { status: 400 }
    );
  }

  const gmailUser = process.env.GMAIL_USER || "fidepasrl@gmail.com";
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, "");

  if (!gmailAppPassword) {
    return Response.json(
      { error: "Configura GMAIL_APP_PASSWORD sul server." },
      { status: 503 }
    );
  }

  const consigli = (consigliResult.data || []) as { testo: string }[];
  const consiglio =
    consigli.length > 0
      ? consigli[Math.floor(Math.random() * consigli.length)].testo
      : null;
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: gmailUser,
      pass: gmailAppPassword,
    },
  });

  try {
    await transporter.sendMail({
      from: `FIDEPA Studio <${gmailUser}>`,
      to: persona.email,
      subject: "[FIDEPA] Promemoria attivit\u00e0",
      html: creaEmailHtml(persona.nome, testo, consiglio),
      text: creaEmailTesto(persona.nome, testo, consiglio),
    });
  } catch (error) {
    console.error("Errore invio promemoria To Do:", error);
    return Response.json(
      { error: "Il promemoria non \u00e8 stato consegnato dal provider email." },
      { status: 502 }
    );
  }

  return Response.json({ destinatario: persona.nome });
}

function estraiBearerToken(header: string | null) {
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7).trim() || null;
}

function creaEmailHtml(
  nome: string,
  testo: string,
  consiglio: string | null
) {
  const portaleUrl = process.env.PORTALE_URL?.trim();
  const pulsante = portaleUrl
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td align="center" style="padding:24px 0 20px;">
            <a href="${escapeHtml(
              portaleUrl.replace(/\/$/, "")
            )}" style="display:inline-block;background:#073a96;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:13px 26px;border-radius:6px;">Apri portale FIDEPA</a>
          </td>
        </tr>
      </table>`
    : "";
  const bloccoConsiglio = consiglio
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#fff9e8;border-left:4px solid #d79d06;border-radius:5px;margin:0 0 18px;">
        <tr>
          <td width="46" align="center" valign="top" style="width:46px;padding:16px 0 16px 14px;">
            <span style="display:inline-block;width:24px;height:24px;background:#d79d06;border-radius:50%;color:#ffffff;font-size:14px;font-weight:700;line-height:24px;text-align:center;">&#9733;</span>
          </td>
          <td style="padding:14px 16px 14px 10px;">
            <p style="margin:0 0 5px;color:#8a6400;font-size:12px;font-weight:700;text-transform:uppercase;">Consiglio del giorno:</p>
            <p style="margin:0;color:#374151;font-size:14px;line-height:1.5;">${escapeHtml(
              consiglio
            )}</p>
          </td>
        </tr>
      </table>`
    : "";

  return `<!doctype html>
<html lang="it">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Promemoria FIDEPA</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f6fb;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">La FIDEPA ti ricorda: ${escapeHtml(
      testo
    )}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f3f6fb;">
      <tr><td style="height:8px;background:#073a96;font-size:0;line-height:0;">&nbsp;</td></tr>
      <tr>
        <td align="center" style="padding:32px 14px 42px;">
          <table role="presentation" width="680" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:680px;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;box-shadow:0 8px 24px rgba(15,56,120,0.10);">
            <tr>
              <td style="padding:34px 42px 30px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td width="78" valign="middle">
                      <table role="presentation" width="64" height="64" cellspacing="0" cellpadding="0" border="0" style="width:64px;height:64px;background:#e8f0ff;border-radius:50%;">
                        <tr><td align="center" valign="middle"><span style="display:inline-block;width:30px;height:30px;border:2px solid #1769e8;border-radius:5px;color:#1769e8;font-size:20px;font-weight:700;line-height:28px;text-align:center;">&#10003;</span></td></tr>
                      </table>
                    </td>
                    <td valign="middle">
                      <h1 style="margin:0;color:#082b6f;font-size:28px;line-height:1.18;font-weight:700;">Promemoria FIDEPA</h1>
                      <div style="width:48px;height:4px;background:#2f73ff;border-radius:2px;margin-top:14px;">&nbsp;</div>
                    </td>
                  </tr>
                </table>

                <p style="margin:28px 0 8px;font-size:16px;line-height:1.5;">Ciao <strong>${escapeHtml(
                  nome
                )}</strong>,</p>
                <p style="margin:0 0 24px;font-size:16px;line-height:1.5;color:#374151;">lo studio FIDEPA ti segnala un promemoria operativo:</p>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#eef4ff;border:1px solid #dbe3ef;border-radius:6px;">
                  <tr>
                    <td style="padding:20px 22px;">
                      <p style="margin:0 0 7px;color:#1769e8;font-size:12px;font-weight:700;text-transform:uppercase;">Da ricordare</p>
                      <p style="margin:0;color:#111827;font-size:17px;line-height:1.55;font-weight:600;">${escapeHtml(
                        testo
                      )}</p>
                    </td>
                  </tr>
                </table>

                <p style="margin:20px 0 0;font-size:14px;line-height:1.6;color:#4b5563;">Quando hai completato l&apos;attivit&agrave;, comunicalo alla persona che ti ha assegnato il promemoria.</p>
                ${pulsante}
                ${bloccoConsiglio}

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#eef4ff;border-radius:5px;">
                  <tr>
                    <td width="42" align="center" style="width:42px;padding:15px 0 15px 14px;color:#1769e8;font-size:17px;font-weight:700;">i</td>
                    <td style="padding:15px 16px 15px 8px;font-size:13px;line-height:1.5;color:#374151;">Questa comunicazione &egrave; stata inviata dal portale gestionale <strong style="color:#0b58d5;">FIDEPA</strong>.</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <table role="presentation" width="680" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:680px;">
            <tr>
              <td align="center" style="padding:30px 20px 0;">
                <p style="margin:0 0 2px;font-size:16px;font-weight:700;color:#374151;">FIDEPA Studio</p>
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
  testo: string,
  consiglio: string | null
) {
  const righe = [
    `Ciao ${nome},`,
    "",
    "Lo studio FIDEPA ti segnala un promemoria operativo:",
    testo,
    "",
    "Quando hai completato l'attivit\u00e0, comunicalo alla persona che ti ha assegnato il promemoria.",
  ];

  if (consiglio) {
    righe.push("", "Consiglio del giorno:", consiglio);
  }

  righe.push("", "Comunicazione automatica del portale FIDEPA.");
  return righe.join("\n");
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
