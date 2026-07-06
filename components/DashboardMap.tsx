"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import AppIcon from "@/components/AppIcon";

type CommessaMappa = {
  id: string;
  titolo: string;
  posizione: string | null;
  latitudine: number | null;
  longitudine: number | null;
  tipo_commessa: string | null;
  priorita: Priorita | null;
};

type Priorita = "Urgente" | "Alta" | "Normale" | "Bassa" | "Terminato";

const COLORE_PRIORITA: Record<Priorita, string> = {
  Urgente: "#d96f4b",
  Alta: "#d79d06",
  Normale: "#5e9ad3",
  Bassa: "#64b445",
  Terminato: "#BFE3C0",
};

const PRIORITA_LEGENDA: Priorita[] = [
  "Urgente",
  "Alta",
  "Normale",
  "Bassa",
  "Terminato",
];

function creaMarkerIcon(colore: string) {
  return L.divIcon({
    className: "commessa-marker",
    html: `
      <span style="
        position: relative;
        display: block;
        width: 28px;
        height: 28px;
        background: ${colore};
        border: 2px solid #ffffff;
        border-radius: 50% 50% 50% 0;
        box-shadow: 0 3px 10px rgba(43, 47, 94, 0.35);
        transform: rotate(-45deg);
      ">
        <span style="
          position: absolute;
          top: 8px;
          left: 8px;
          width: 8px;
          height: 8px;
          background: #ffffff;
          border-radius: 999px;
          opacity: 0.95;
        "></span>
      </span>
    `,
    iconSize: [28, 40],
    iconAnchor: [14, 34],
    popupAnchor: [0, -32],
  });
}

const markerIcons = Object.fromEntries(
  Object.entries(COLORE_PRIORITA).map(([priorita, colore]) => [
    priorita,
    creaMarkerIcon(colore),
  ])
) as Record<Priorita, L.DivIcon>;

function getMarkerIcon(priorita: Priorita | null) {
  return priorita ? markerIcons[priorita] : markerIcons.Normale;
}

const CENTRO_AGRO: [number, number] = [40.745, 14.62];

function ResizeMap() {
  const map = useMap();

  useEffect(() => {
    const aggiorna = () => {
      setTimeout(() => map.invalidateSize(), 100);
      setTimeout(() => map.invalidateSize(), 500);
      setTimeout(() => map.invalidateSize(), 1000);
    };

    aggiorna();

    const observer = new ResizeObserver(() => {
      map.invalidateSize();
    });

    observer.observe(map.getContainer());

    return () => observer.disconnect();
  }, [map]);

  return null;
}

export default function DashboardMap({
  commesse,
}: {
  commesse: CommessaMappa[];
}) {
  const contenitoreRef = useRef<HTMLDivElement | null>(null);
  const [schermoIntero, setSchermoIntero] = useState(false);
  const commesseValide = commesse.filter(
    (item) => item.latitudine !== null && item.longitudine !== null
  );

  useEffect(() => {
    function aggiornaStatoFullscreen() {
      setSchermoIntero(document.fullscreenElement === contenitoreRef.current);
    }

    document.addEventListener("fullscreenchange", aggiornaStatoFullscreen);
    return () =>
      document.removeEventListener("fullscreenchange", aggiornaStatoFullscreen);
  }, []);

  async function toggleSchermoIntero() {
    if (!contenitoreRef.current) return;

    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await contenitoreRef.current.requestFullscreen();
    }
  }

  return (
    <div
      ref={contenitoreRef}
      className={
        "relative w-full overflow-hidden border border-gray-100 bg-white " +
        (schermoIntero
          ? "h-screen rounded-none"
          : "h-[440px] sm:h-[520px] rounded-xl")
      }
    >
      <button
        type="button"
        onClick={toggleSchermoIntero}
        className="absolute right-3 top-3 z-[500] h-10 w-10 rounded-xl border border-gray-200 bg-white/95 text-[#2B2F5E] shadow-md backdrop-blur-sm flex items-center justify-center hover:border-[#5E9AD3] hover:text-[#2D80B3] cursor-pointer"
        aria-label={schermoIntero ? "Riduci mappa" : "Espandi mappa"}
        title={schermoIntero ? "Riduci" : "Espandi"}
      >
        <AppIcon
          name={schermoIntero ? "minimize" : "maximize"}
          size={18}
        />
      </button>

      <MapContainer
        center={CENTRO_AGRO}
        zoom={11}
        scrollWheelZoom
        className="w-full h-full"
      >
        <ResizeMap />

        <TileLayer
          attribution="&copy; OpenStreetMap &copy; CARTO"
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        {commesseValide.map((commessa) => (
          <Marker
            key={commessa.id}
            position={[
              Number(commessa.latitudine),
              Number(commessa.longitudine),
            ]}
            icon={getMarkerIcon(commessa.priorita)}
          >
            <Popup>
              <Link
                href={`/commesse/${commessa.id}`}
                prefetch={false}
                className="block min-w-44 text-[#2B2F5E] no-underline hover:text-[#0b73c9]"
              >
                <strong>{commessa.titolo}</strong>
                <span className="block mt-1 text-[13px] text-gray-600">
                  {commessa.posizione || "Posizione non indicata"}
                </span>
              </Link>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <div className="pointer-events-none absolute bottom-3 left-3 z-[500] rounded-xl border border-gray-100 bg-white/95 px-3 py-2.5 shadow-md backdrop-blur-sm">
        <p className="mb-1 text-[12px] font-semibold text-[#2B2F5E]">
          Priorita
        </p>

        <div className="flex flex-col gap-1">
          {PRIORITA_LEGENDA.map((priorita) => (
            <div key={priorita} className="flex items-center gap-2">
              <span
                className="h-3 w-3 rounded-full border border-white shadow-sm"
                style={{ backgroundColor: COLORE_PRIORITA[priorita] }}
              />
              <span className="text-[12px] leading-none text-[#2B2F5E]">
                {priorita}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
