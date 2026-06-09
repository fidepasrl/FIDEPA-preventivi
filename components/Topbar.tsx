"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const FEEDBACK_PASSWORD =
  process.env.NEXT_PUBLIC_FEEDBACK_PASSWORD || "";

export default function Topbar() {
  const now = new Date();

  const today = new Date().toLocaleDateString("it-IT", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const [ruolo, setRuolo] = useState("USER");

  const [showFeedbackLogin, setShowFeedbackLogin] = useState(false);
  const [feedbackPassword, setFeedbackPassword] = useState("");

  useEffect(() => {
    caricaRuolo();
  }, []);

  async function caricaRuolo() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data } = await supabase
      .from("profili_utente")
      .select("ruolo")
      .eq("id", user.id)
      .single();

    if (data?.ruolo === "admin") {
      setRuolo("ADMIN");
    } else {
      setRuolo("USER");
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <header className="h-16 bg-[#5E9AD3] text-white flex items-center justify-between px-8 shadow-sm">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => setShowFeedbackLogin(true)}
          className="cursor-pointer"
        >
          <Image
            src="/fidepabutton.png"
            alt="Feedback"
            width={36}
            height={36}
            className="rounded-full"
          />
        </button>

        <Image
          src="/fidepa.png"
          alt="FIDEPA"
          width={130}
          height={40}
          priority
        />

        <span className="text-sm font-medium text-white/90 border-l border-white/40 pl-4">
          Portale di gestione aziendale
        </span>
      </div>

      <div className="flex items-center gap-4 text-sm font-medium tracking-wide">
        <span>
          {today.charAt(0).toUpperCase() + today.slice(1)}
        </span>

        <span className="text-white/80">
          {ruolo}
        </span>

        <button
          type="button"
          onClick={logout}
          className="text-white/90 hover:text-[#2B2F5E] transition cursor-pointer"
        >
          Esci
        </button>
      </div>

      {showFeedbackLogin && (
        <div className="fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center">
          <div className="bg-white rounded-md shadow-xl p-6 w-[360px]">
            <h3 className="text-lg font-medium text-[#2B2F5E] mb-4">
              Accesso
            </h3>

            <input
              type="password"
              value={feedbackPassword}
              onChange={(e) => setFeedbackPassword(e.target.value)}
              placeholder="Password"
              className="w-full border border-gray-300 rounded-md px-3 py-2 mb-4 text-[#2B2F5E] placeholder:text-gray-400 bg-white outline-none"
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowFeedbackLogin(false);
                  setFeedbackPassword("");
                }}
                className="px-3 py-2 text-gray-600"
              >
                Annulla
              </button>

              <button
                type="button"
                onClick={() => {
                  if (feedbackPassword === FEEDBACK_PASSWORD) {
                    window.location.href = "/feedback";
                  } else {
                    alert("Password non corretta.");
                  }
                }}
                className="px-4 py-2 bg-[#64B445] text-white rounded-md"
              >
                Accedi
              </button>
            </div>
          </div>
        </div>
      )}

    </header>
  );
}

