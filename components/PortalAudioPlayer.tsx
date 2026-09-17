"use client";

import { useEffect, useRef, useState } from "react";
import AppIcon from "@/components/AppIcon";

const CHIAVE_STATO = "fidepa-audio-stato";
const CHIAVE_POSIZIONE = "fidepa-audio-posizione";
const CHIAVE_MUTO = "fidepa-audio-muto";

function formattaTempo(secondi: number) {
  if (!Number.isFinite(secondi) || secondi < 0) return "0:00";

  const minuti = Math.floor(secondi / 60);
  const secondiResidui = Math.floor(secondi % 60);
  return `${minuti}:${String(secondiResidui).padStart(2, "0")}`;
}

export default function PortalAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [inRiproduzione, setInRiproduzione] = useState(false);
  const [muto, setMuto] = useState(false);
  const [posizione, setPosizione] = useState(0);
  const [durata, setDurata] = useState(0);
  const [autoplayBloccato, setAutoplayBloccato] = useState(false);
  const [erroreAudio, setErroreAudio] = useState(false);

  useEffect(() => {
    function riprovaDopoInterazione() {
      const audio = audioRef.current;
      if (!audio || sessionStorage.getItem(CHIAVE_STATO) === "pausa") return;

      audio
        .play()
        .then(() => setAutoplayBloccato(false))
        .catch(() => setAutoplayBloccato(true));
    }

    document.addEventListener("click", riprovaDopoInterazione, { once: true });

    return () => {
      document.removeEventListener("click", riprovaDopoInterazione);
    };
  }, []);

  function preparaAudio() {
    const audio = audioRef.current;
    if (!audio) return;

    const durataDisponibile = Number.isFinite(audio.duration) ? audio.duration : 0;
    const posizioneSalvata = Number(sessionStorage.getItem(CHIAVE_POSIZIONE));
    const mutoSalvato = localStorage.getItem(CHIAVE_MUTO) === "true";

    setDurata(durataDisponibile);
    setMuto(mutoSalvato);
    audio.muted = mutoSalvato;

    if (
      Number.isFinite(posizioneSalvata) &&
      posizioneSalvata > 0 &&
      posizioneSalvata < durataDisponibile
    ) {
      audio.currentTime = posizioneSalvata;
      setPosizione(posizioneSalvata);
    }

    if (sessionStorage.getItem(CHIAVE_STATO) === "pausa") return;

    audio
      .play()
      .then(() => setAutoplayBloccato(false))
      .catch(() => setAutoplayBloccato(true));
  }

  async function alternaRiproduzione() {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      sessionStorage.setItem(CHIAVE_STATO, "riproduzione");
      try {
        await audio.play();
        setAutoplayBloccato(false);
      } catch {
        setAutoplayBloccato(true);
      }
      return;
    }

    sessionStorage.setItem(CHIAVE_STATO, "pausa");
    audio.pause();
  }

  function alternaMuto() {
    const audio = audioRef.current;
    if (!audio) return;

    const prossimoValore = !audio.muted;
    audio.muted = prossimoValore;
    setMuto(prossimoValore);
    localStorage.setItem(CHIAVE_MUTO, String(prossimoValore));
  }

  function aggiornaPosizione() {
    const audio = audioRef.current;
    if (!audio) return;

    setPosizione(audio.currentTime);
    sessionStorage.setItem(CHIAVE_POSIZIONE, String(audio.currentTime));
  }

  function spostaRiproduzione(value: string) {
    const audio = audioRef.current;
    if (!audio) return;

    const nuovaPosizione = Number(value);
    audio.currentTime = nuovaPosizione;
    setPosizione(nuovaPosizione);
    sessionStorage.setItem(CHIAVE_POSIZIONE, String(nuovaPosizione));
  }

  return (
    <div
      className="mt-0.5 flex w-[236px] items-center gap-1.5"
      role="group"
      aria-label="Player musicale FIDEPA"
    >
      <audio
        ref={audioRef}
        src="/audio/FIDEPA.mp3"
        preload="auto"
        loop
        onLoadedMetadata={preparaAudio}
        onDurationChange={(event) =>
          setDurata(
            Number.isFinite(event.currentTarget.duration)
              ? event.currentTarget.duration
              : 0
          )
        }
        onTimeUpdate={aggiornaPosizione}
        onPlay={() => {
          setInRiproduzione(true);
          setErroreAudio(false);
          sessionStorage.setItem(CHIAVE_STATO, "riproduzione");
        }}
        onPause={() => setInRiproduzione(false)}
        onError={() => setErroreAudio(true)}
      />

      <button
        type="button"
        onClick={alternaRiproduzione}
        disabled={erroreAudio}
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40 ${
          autoplayBloccato ? "bg-white/20 ring-1 ring-white/60" : "bg-white/10"
        }`}
        title={
          erroreAudio
            ? "Brano non disponibile"
            : inRiproduzione
              ? "Pausa"
              : autoplayBloccato
                ? "Avvia la musica"
                : "Play"
        }
        aria-label={inRiproduzione ? "Metti in pausa" : "Avvia la musica"}
      >
        <AppIcon name={inRiproduzione ? "pause" : "play"} size={11} />
      </button>

      <button
        type="button"
        onClick={alternaMuto}
        disabled={erroreAudio}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white/90 transition hover:bg-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        title={muto ? "Riattiva audio" : "Disattiva audio"}
        aria-label={muto ? "Riattiva audio" : "Disattiva audio"}
      >
        <AppIcon name={muto ? "volumeMuted" : "volume"} size={13} />
      </button>

      <input
        type="range"
        min="0"
        max={durata || 0}
        step="0.1"
        value={Math.min(posizione, durata || 0)}
        onChange={(event) => spostaRiproduzione(event.target.value)}
        disabled={!durata || erroreAudio}
        className="h-1 min-w-0 flex-1 cursor-pointer accent-white disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Posizione della canzone"
      />

      <span className="w-[52px] shrink-0 text-right text-[9px] tabular-nums text-white/75">
        {formattaTempo(posizione)} / {formattaTempo(durata)}
      </span>
    </div>
  );
}
