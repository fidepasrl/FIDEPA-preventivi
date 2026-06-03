"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
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
    <div className="fixed bottom-6 right-6 z-50">
      {aperto && (
        <div className="mb-3 w-80 bg-white border border-gray-200 shadow-2xl rounded-md p-4">
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-[17px] font-semibold text-[#2B2F5E]">
              Invia feedback
            </h3>

            <button
              type="button"
              onClick={() => setAperto(false)}
              className="text-xl text-gray-400 hover:text-[#2B2F5E] cursor-pointer"
            >
              ×
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
        className="bg-[#0078D4] text-white px-4 py-2 rounded-md text-sm font-semibold shadow-lg hover:bg-[#106EBE] transition cursor-pointer flex items-center gap-2"
      >
        <span>◎</span>
        Feedback
      </button>
    </div>
  );
}