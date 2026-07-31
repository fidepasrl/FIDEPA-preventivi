"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import AppIcon from "@/components/AppIcon";
import { supabase } from "@/lib/supabase";

export default function AppFeedbackButton() {
  const pathname = usePathname();

  const [aperto, setAperto] = useState(false);
  const [testo, setTesto] = useState("");
  const [invio, setInvio] = useState(false);
  const [messaggio, setMessaggio] = useState("");

  async function inviaFeedback() {
    if (!testo.trim()) return;

    setInvio(true);
    setMessaggio("");

    const { error } = await supabase.from("feedback").insert({
      testo: testo.trim(),
      pagina: pathname,
    });

    setInvio(false);

    if (error) {
      console.error("Errore invio feedback:", error);
      setMessaggio("Errore durante l’invio.");
      return;
    }

    setTesto("");
    setMessaggio("Feedback inviato.");
    setTimeout(() => {
      setAperto(false);
      setMessaggio("");
    }, 1200);
  }

  return (
    <div className="fixed bottom-0 right-3 z-[1150] flex flex-col items-end sm:right-6">
      {aperto && (
        <div className="mb-2 w-[min(20rem,calc(100vw-1.5rem))] rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl">
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-[17px] font-semibold text-[#2B2F5E]">
              Invia feedback
            </h3>

            <button
              type="button"
              onClick={() => setAperto(false)}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-gray-400 hover:bg-[#F2F2F2] hover:text-[#2B2F5E]"
              aria-label="Chiudi feedback"
            >
              <AppIcon name="x" size={17} />
            </button>
          </div>

          <textarea
            value={testo}
            onChange={(e) => setTesto(e.target.value)}
            placeholder="Scrivi un suggerimento di miglioramento..."
            rows={5}
            className="w-full border border-gray-300 rounded-md px-3 py-2 bg-transparent outline-none transition focus:bg-white focus:border-[#64B445] focus:shadow-sm text-sm resize-none"
          />

          {messaggio && (
            <p className="text-sm text-[#D79D06] mt-2">{messaggio}</p>
          )}

          <div className="flex justify-end mt-3">
            <button
              type="button"
              onClick={inviaFeedback}
              disabled={invio || !testo.trim()}
              className="bg-[#64B445] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-[#5AA03E] transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {invio ? "Invio..." : "Invia"}
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setAperto((prev) => !prev)}
        className="flex min-h-11 cursor-pointer items-center gap-2 rounded-t-xl rounded-b-none border border-b-0 border-white/20 bg-[#0078D4] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_-4px_14px_rgba(43,47,94,0.16)] hover:bg-[#106EBE]"
        aria-expanded={aperto}
        aria-label={aperto ? "Chiudi pannello feedback" : "Apri pannello feedback"}
      >
        <AppIcon name="message" size={17} />
        Feedback
      </button>
    </div>
  );
}
