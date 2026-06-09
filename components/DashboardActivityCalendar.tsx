"use client";

type Persona = {
  id: string;
  nome: string;
  colore: string;
};

type Attivita = {
  id: string;
  titolo: string;
  data_inizio: string;
  giorni: number;
  commessa_id: string | null;
  tipo_commessa: string | null;
  titolo_commessa: string | null;
  persone: Persona[];
};

const SIMBOLO_TIPO: Record<string, string> = {
  Pubblica: "■",
  Privata: "●",
  Gara: "▲",
  Concorso: "⚑",
};

const NUMERO_GIORNI = 10;
const ALTEZZA_RIGA = 34;

export default function DashboardActivityCalendar({
  attivita,
}: {
  attivita: Attivita[];
}) {
  const giorni = prossimiGiorniLavorativi(NUMERO_GIORNI);

  const barreGrezzE = attivita
    .flatMap((item) =>
      item.persone.map((persona) => {
        const startIndex = indiceGiornoLavorativo(item.data_inizio, giorni);
        if (startIndex === -1) return null;

        const durata = Math.max(1, Number(item.giorni || 1));
        const endIndex = Math.min(startIndex + durata, giorni.length);

        if (startIndex >= giorni.length || endIndex <= 0) return null;

        const titoloCommessa =
          item.commessa_id && item.tipo_commessa
            ? `${SIMBOLO_TIPO[item.tipo_commessa] || ""} ${
                item.titolo_commessa || ""
              }`
            : "Attività libera";

        return {
          id: `${item.id}-${persona.id}`,
          persona,
          item,
          titoloCommessa,
          startIndex,
          endIndex,
        };
      })
    )
    .filter(Boolean) as {
    id: string;
    persona: Persona;
    item: Attivita;
    titoloCommessa: string;
    startIndex: number;
    endIndex: number;
  }[];

  const barre = assegnaRighe(barreGrezzE);

  return (
    <div className="w-full overflow-hidden">
      <div
        className="relative w-full"
        style={{
          minHeight: `${70 + Math.max(1, numeroRighe(barre)) * ALTEZZA_RIGA}px`,
        }}
      >
        <div
          className="grid border-t border-l border-gray-200"
          style={{
            gridTemplateColumns: `repeat(${giorni.length}, minmax(0, 1fr))`,
          }}
        >
          {giorni.map((giorno) => (
            <div
              key={giorno.toISOString()}
              className="border-r border-b border-gray-200 bg-[#FAFAFA] px-2 py-2 text-[11px] uppercase tracking-[0.08em] text-gray-500 font-medium text-center"
            >
              {giorno.toLocaleDateString("it-IT", {
                weekday: "short",
                day: "2-digit",
                month: "2-digit",
              })}
            </div>
          ))}
        </div>

        <div
          className="absolute left-0 right-0"
          style={{
            top: 35,
            bottom: 0,
            backgroundImage:
              "linear-gradient(to right, #E5E7EB 1px, transparent 1px)",
            backgroundSize: `${100 / giorni.length}% 100%`,
          }}
        />

        <div
          className="relative"
          style={{
            height: `${Math.max(1, numeroRighe(barre)) * ALTEZZA_RIGA + 18}px`,
          }}
        >
          {barre.length === 0 ? (
            <div className="text-sm text-gray-400 py-8 px-4">
              Nessuna attività nei prossimi giorni lavorativi.
            </div>
          ) : (
            barre.map((barra) => {
              const leftPercent = (barra.startIndex / giorni.length) * 100;
              const widthPercent =
                ((barra.endIndex - barra.startIndex) / giorni.length) * 100;

              return (
                <div
                  key={barra.id}
                  className="absolute h-7 rounded-sm text-white text-[12px] px-3 flex items-center shadow-sm truncate"
                  style={{
                    left: `${leftPercent}%`,
                    width: `calc(${widthPercent}% - 6px)`,
                    top: 14 + barra.riga * ALTEZZA_RIGA,
                    backgroundColor: barra.persona.colore,
                  }}
                  title={`${barra.persona.nome} - ${barra.titoloCommessa}`}
                >
                  {barra.titoloCommessa}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function assegnaRighe(
  barre: {
    id: string;
    persona: Persona;
    item: Attivita;
    titoloCommessa: string;
    startIndex: number;
    endIndex: number;
  }[]
) {
  const righe: { startIndex: number; endIndex: number }[][] = [];

  return [...barre]
    .sort((a, b) => a.startIndex - b.startIndex || b.endIndex - a.endIndex)
    .map((barra) => {
      let riga = 0;

      while (
        righe[riga]?.some(
          (esistente) =>
            barra.startIndex < esistente.endIndex &&
            barra.endIndex > esistente.startIndex
        )
      ) {
        riga++;
      }

      if (!righe[riga]) righe[riga] = [];

      righe[riga].push({
        startIndex: barra.startIndex,
        endIndex: barra.endIndex,
      });

      return {
        ...barra,
        riga,
      };
    });
}

function numeroRighe(barre: { riga: number }[]) {
  if (barre.length === 0) return 1;
  return Math.max(...barre.map((barra) => barra.riga)) + 1;
}

function prossimiGiorniLavorativi(numeroGiorni: number) {
  const giorni: Date[] = [];
  const data = new Date();
  data.setHours(0, 0, 0, 0);

  while (giorni.length < numeroGiorni) {
    if (!isWeekend(data)) {
      giorni.push(new Date(data));
    }

    data.setDate(data.getDate() + 1);
  }

  return giorni;
}

function indiceGiornoLavorativo(dataInizio: string, giorni: Date[]) {
  const data = new Date(dataInizio);
  data.setHours(0, 0, 0, 0);

  return giorni.findIndex((giorno) => giorno.getTime() === data.getTime());
}

function isWeekend(data: Date) {
  const giorno = data.getDay();
  return giorno === 0 || giorno === 6;
}