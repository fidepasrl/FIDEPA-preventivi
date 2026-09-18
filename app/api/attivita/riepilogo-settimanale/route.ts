import { createClient } from "@supabase/supabase-js";
import { inviaEmailSettimana } from "@/lib/email-settimanale-server";

export const runtime = "nodejs";

type PayloadManuale = {
  dataInizioSettimana?: string;
  personaId?: string | null;
};

function configurazioneSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("Configurazione Supabase incompleta.");
  return { url, anonKey };
}

function bearer(request: Request) {
  const header = request.headers.get("authorization");
  return header?.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

function dataValida(value: string | null | undefined) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function riferimentoRoma(data = new Date()) {
  const parti = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(data);
  const leggi = (tipo: Intl.DateTimeFormatPartTypes) =>
    parti.find((parte) => parte.type === tipo)?.value || "";
  return {
    data: `${leggi("year")}-${leggi("month")}-${leggi("day")}`,
    giorno: leggi("weekday"),
    ora: Number(leggi("hour")),
  };
}

export async function POST(request: Request) {
  const token = bearer(request);
  if (!token) {
    return Response.json({ error: "Accesso non autorizzato." }, { status: 401 });
  }

  let payload: PayloadManuale;
  try {
    payload = (await request.json()) as PayloadManuale;
  } catch {
    return Response.json({ error: "Richiesta non valida." }, { status: 400 });
  }
  if (!dataValida(payload.dataInizioSettimana)) {
    return Response.json(
      { error: "Indica una settimana valida." },
      { status: 400 }
    );
  }

  try {
    const { url, anonKey } = configurazioneSupabase();
    const supabase = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const {
      data: { user },
    } = await supabase.auth.getUser(token);
    if (!user) {
      return Response.json({ error: "Sessione non valida." }, { status: 401 });
    }

    const esito = await inviaEmailSettimana({
      supabase,
      dataInizio: payload.dataInizioSettimana!,
      personaId: payload.personaId?.trim() || undefined,
      automatico: false,
    });
    return Response.json(esito, { status: esito.fallite ? 502 : 200 });
  } catch (error) {
    console.error("Errore riepilogo settimanale manuale:", error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Invio del riepilogo non riuscito.",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const segreto = process.env.CRON_SECRET?.trim();
  if (!segreto || bearer(request) !== segreto) {
    return Response.json({ error: "Accesso non autorizzato." }, { status: 401 });
  }

  const riferimento = riferimentoRoma();
  if (riferimento.giorno !== "Mon" || riferimento.ora !== 8) {
    return Response.json({
      eseguito: false,
      motivo: "Fuori dalla finestra del lunedì alle 08:00 Europe/Rome.",
    });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    return Response.json(
      { error: "Configura SUPABASE_SERVICE_ROLE_KEY sul server." },
      { status: 503 }
    );
  }

  try {
    const supabase = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const esito = await inviaEmailSettimana({
      supabase,
      dataInizio: riferimento.data,
      automatico: true,
    });
    return Response.json({ eseguito: true, ...esito }, { status: esito.fallite ? 502 : 200 });
  } catch (error) {
    console.error("Errore riepilogo settimanale automatico:", error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Invio automatico non riuscito.",
      },
      { status: 500 }
    );
  }
}
