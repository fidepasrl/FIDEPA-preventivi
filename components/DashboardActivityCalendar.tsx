"use client";

import {
  useEffect,
  useMemo,
  useRef,
  type Dispatch,
  type SetStateAction,
} from "react";

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

type Appuntamento = {
  id: string;
  commessa_id: string | null;
  tipo_commessa: string | null;
  titolo_commessa: string | null;
  data: string;
  ora: string;
  descrizione: string;
};

type BarraAttivita = {
  tipo: "attivita";
  id: string;
  item: Attivita;
  partecipanti: string;
  titoloCommessa: string;
  startIndex: number;
  endIndex: number;
};

type BarraAppuntamento = {
  tipo: "appuntamento";
  id: string;
  item: Appuntamento;
  titoloCommessa: string;
  startIndex: number;
  endIndex: number;
};

type BarraCalendario = BarraAttivita | BarraAppuntamento;

const SIMBOLO_TIPO: Record<string, string> = {
  Pubblica: "■",
  Privata: "●",
  Gara: "▲",
  Concorso: "⚑",
};

const NUMERO_GIORNI = 11;
const INDICE_GIORNO_CORRENTE = Math.floor(NUMERO_GIORNI / 2);
const ALTEZZA_RIGA = 42;
const INTERVALLO_CAMBIO_GIORNI_WHEEL = 450;
const SOGLIA_CAMBIO_GIORNI_WHEEL = 35;

export default function DashboardActivityCalendar({
  attivita,
  appuntamenti,
  offsetGiorni,
  setOffsetGiorni,
}: {
  attivita: Attivita[];
  appuntamenti: Appuntamento[];
  offsetGiorni: number;
  setOffsetGiorni: Dispatch<SetStateAction<number>>;
}) {
  const contenitoreCalendarioRef = useRef<HTMLDivElement | null>(null);
  const ultimoCambioGiorniWheel = useRef(0);

  const giorni = useMemo(
    () => giorniLavorativiCentrati(NUMERO_GIORNI, offsetGiorni),
    [offsetGiorni]
  );

  const indiceOggi = giorni.findIndex((giorno) => isOggi(giorno));

  const barreGrezzE = attivita
    .map((item) => {
      const indici = getGiorniLavorativiAttivita(item)
        .map((giorno) => indiceGiorno(giorno, giorni))
        .filter((indice) => indice >= 0);

      if (indici.length === 0) return null;

      const titoloCommessa =
        item.commessa_id && item.tipo_commessa
          ? `${SIMBOLO_TIPO[item.tipo_commessa] || ""} ${
              item.titolo_commessa || ""
            }`
          : "Attivita libera";

      return {
        tipo: "attivita" as const,
        id: item.id,
        item,
        partecipanti: getPartecipanti(item),
        titoloCommessa,
        startIndex: Math.min(...indici),
        endIndex: Math.max(...indici) + 1,
      };
    })
    .filter(Boolean) as BarraCalendario[];

  const barreAppuntamenti = appuntamenti
    .map((item) => {
      const indice = indiceGiorno(new Date(item.data), giorni);

      if (indice < 0) return null;

      return {
        tipo: "appuntamento" as const,
        id: item.id,
        item,
        titoloCommessa: getTitoloCommessaAppuntamento(item),
        startIndex: indice,
        endIndex: indice + 1,
      };
    })
    .filter(Boolean) as BarraCalendario[];

  const barre = assegnaRighe([...barreGrezzE, ...barreAppuntamenti]);
  const righe = Math.max(1, numeroRighe(barre));

  useEffect(() => {
    const contenitore = contenitoreCalendarioRef.current;
    if (!contenitore) return;

    function gestisciCambioGiorniWheel(event: WheelEvent) {
      event.preventDefault();
      event.stopPropagation();

      if (Math.abs(event.deltaY) < SOGLIA_CAMBIO_GIORNI_WHEEL) {
        return;
      }

      const adesso = Date.now();
      if (
        adesso - ultimoCambioGiorniWheel.current <
        INTERVALLO_CAMBIO_GIORNI_WHEEL
      ) {
        return;
      }

      ultimoCambioGiorniWheel.current = adesso;
      setOffsetGiorni((corrente) => corrente + (event.deltaY > 0 ? 1 : -1));
    }

    contenitore.addEventListener("wheel", gestisciCambioGiorniWheel, {
      passive: false,
    });

    return () => {
      contenitore.removeEventListener("wheel", gestisciCambioGiorniWheel);
    };
  }, [setOffsetGiorni]);

  return (
    <div
      ref={contenitoreCalendarioRef}
      className="w-full overflow-hidden overscroll-contain rounded-xl border border-gray-100 bg-white"
    >
      <div
        className="relative w-full"
        style={{
          minHeight: `${82 + righe * ALTEZZA_RIGA}px`,
        }}
      >
        <div
          className="grid border-l border-gray-100"
          style={{
            gridTemplateColumns: `repeat(${giorni.length}, minmax(0, 1fr))`,
          }}
        >
          {giorni.map((giorno) => (
            <div
              key={giorno.toISOString()}
              className={`border-r border-b border-gray-100 px-2 py-3 text-center text-[10px] font-semibold uppercase ${
                isOggi(giorno)
                  ? "bg-[#FFF8E7] text-[#D79D06]"
                  : "bg-[#FAFAFA] text-gray-500"
              }`}
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
            top: 41,
            bottom: 0,
            backgroundImage:
              "linear-gradient(to right, #EEF0F3 1px, transparent 1px)",
            backgroundSize: `${100 / giorni.length}% 100%`,
          }}
        />

        {indiceOggi >= 0 && (
          <div
            className="pointer-events-none absolute top-0 bottom-0 z-20 border-2 border-[#D79D06] bg-[#FFF8E7]/20"
            style={{
              left: `${(indiceOggi / giorni.length) * 100}%`,
              width: `${100 / giorni.length}%`,
            }}
          />
        )}

        <div
          className="relative"
          style={{
            height: `${righe * ALTEZZA_RIGA + 18}px`,
          }}
        >
          {barre.length === 0 ? (
            <div className="px-4 py-8 text-sm text-gray-400">
              Nessuna attivita nei giorni visualizzati.
            </div>
          ) : (
            barre.map((barra) => {
              const leftPercent = (barra.startIndex / giorni.length) * 100;
              const widthPercent =
                ((barra.endIndex - barra.startIndex) / giorni.length) * 100;

              if (barra.tipo === "appuntamento") {
                const appuntamentoLibero = !barra.item.commessa_id;

                return (
                  <div
                    key={barra.id}
                    className="absolute flex h-9 flex-col justify-center overflow-hidden rounded-lg border-2 border-[#D79D06] bg-[#FFF8E7] px-2.5 py-1 text-[11px] leading-tight text-[#2B2F5E] shadow-[0_4px_12px_rgba(43,47,94,0.10)]"
                    style={{
                      left: `${leftPercent}%`,
                      width: `calc(${widthPercent}% - 6px)`,
                      top: 14 + barra.riga * ALTEZZA_RIGA,
                    }}
                    title={`${getOraAppuntamento(barra.item)} - ${
                      barra.titoloCommessa
                    }${appuntamentoLibero ? "" : ` - ${barra.item.descrizione}`}`}
                  >
                    <span className="truncate font-semibold text-[#D79D06]">
                      {getOraAppuntamento(barra.item)}
                    </span>
                    <span className="truncate">{barra.titoloCommessa}</span>
                  </div>
                );
              }

              return (
                <div
                  key={barra.id}
                  className="absolute flex h-9 flex-col justify-center overflow-hidden rounded-lg border border-white/30 px-2.5 py-1 text-[11px] font-medium leading-tight text-white shadow-[0_4px_12px_rgba(43,47,94,0.14)]"
                  style={{
                    left: `${leftPercent}%`,
                    width: `calc(${widthPercent}% - 6px)`,
                    top: 14 + barra.riga * ALTEZZA_RIGA,
                    background: getSfondoAttivita(barra.item),
                    textShadow: "0 1px 1px rgba(0, 0, 0, 0.35)",
                  }}
                  title={`${barra.partecipanti} - ${barra.titoloCommessa} - ${barra.item.titolo}`}
                >
                  <span className="truncate">{barra.titoloCommessa}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function assegnaRighe(barre: BarraCalendario[]) {
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

function giorniLavorativiCentrati(numeroGiorni: number, offsetGiorni: number) {
  const centro = spostaGiorniLavorativi(new Date(), offsetGiorni);
  const precedenti: Date[] = [];
  let cursore = centro;

  while (precedenti.length < INDICE_GIORNO_CORRENTE) {
    cursore = spostaGiorniLavorativi(cursore, -1);
    precedenti.unshift(cursore);
  }

  const giorni = [...precedenti, centro];
  cursore = centro;

  while (giorni.length < numeroGiorni) {
    cursore = spostaGiorniLavorativi(cursore, 1);
    giorni.push(cursore);
  }

  return giorni;
}

function spostaGiorniLavorativi(dataInizio: Date, delta: number) {
  const data = normalizzaData(dataInizio);
  const passo = delta >= 0 ? 1 : -1;
  let rimanenti = Math.abs(delta);

  while (rimanenti > 0) {
    data.setDate(data.getDate() + passo);

    if (!isWeekend(data)) {
      rimanenti--;
    }
  }

  return new Date(data);
}

function getGiorniLavorativiAttivita(item: Attivita) {
  const giorniTotali = Math.max(1, Number(item.giorni || 1));
  const giorni: Date[] = [];
  const corrente = normalizzaData(new Date(item.data_inizio));

  while (giorni.length < giorniTotali) {
    if (!isWeekend(corrente)) {
      giorni.push(new Date(corrente));
    }

    corrente.setDate(corrente.getDate() + 1);
  }

  return giorni;
}

function indiceGiorno(data: Date, giorni: Date[]) {
  const chiave = normalizzaData(data).getTime();
  return giorni.findIndex((giorno) => giorno.getTime() === chiave);
}

function getPartecipanti(item: Attivita) {
  return item.persone.map((persona) => persona.nome).join(", ");
}

function getTitoloCommessaAppuntamento(item: Appuntamento) {
  if (!item.commessa_id) {
    return item.descrizione;
  }

  const simbolo = item.tipo_commessa ? SIMBOLO_TIPO[item.tipo_commessa] || "" : "";
  return `${simbolo} ${item.titolo_commessa || "Commessa"}`.trim();
}

function getOraAppuntamento(item: Appuntamento) {
  return item.ora.slice(0, 5);
}

function getSfondoAttivita(item: Attivita) {
  const colori = item.persone
    .map((persona) => persona.colore)
    .filter(Boolean);

  if (colori.length === 0) {
    return "#5E9AD3";
  }

  if (colori.length === 1) {
    return colori[0];
  }

  const ampiezza = 100 / colori.length;
  const stop = colori.flatMap((colore, index) => {
    const inizio = Math.round(index * ampiezza);
    const fine = Math.round((index + 1) * ampiezza);

    return [`${colore} ${inizio}%`, `${colore} ${fine}%`];
  });

  return `linear-gradient(135deg, ${stop.join(", ")})`;
}

function isOggi(data: Date) {
  const oggi = normalizzaData(new Date());
  return normalizzaData(data).getTime() === oggi.getTime();
}

function normalizzaData(data: Date) {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate());
}

function isWeekend(data: Date) {
  const giorno = data.getDay();
  return giorno === 0 || giorno === 6;
}
