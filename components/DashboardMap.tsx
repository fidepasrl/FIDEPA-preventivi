"use client";

import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";

type CommessaMappa = {
  id: string;
  titolo: string;
  posizione: string | null;
  latitudine: number | null;
  longitudine: number | null;
  tipo_commessa: string | null;
};

const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

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
  const commesseValide = commesse.filter(
    (item) => item.latitudine !== null && item.longitudine !== null
  );

  return (
    <div className="w-full h-[570px] overflow-hidden rounded-sm border border-gray-200">
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
            icon={markerIcon}
          >
            <Popup>
              <strong>{commessa.titolo}</strong>
              <br />
              {commessa.posizione || "Posizione non indicata"}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}