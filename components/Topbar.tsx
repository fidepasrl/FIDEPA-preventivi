"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { isDeveloperRole, normalizeRole, roleLabel } from "@/lib/roles";
import { supabase } from "@/lib/supabase";

export default function Topbar() {
  const today = new Date().toLocaleDateString("it-IT", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const [ruolo, setRuolo] = useState("user");

  useEffect(() => {
    let componenteAttivo = true;

    async function caricaRuolo() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !componenteAttivo) return;

      const { data } = await supabase
        .from("profili_utente")
        .select("ruolo")
        .eq("id", user.id)
        .single();

      if (componenteAttivo) {
        setRuolo(normalizeRole(data?.ruolo));
      }
    }

    caricaRuolo();

    return () => {
      componenteAttivo = false;
    };
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const puoVedereFeedback = isDeveloperRole(ruolo);
  const logoFeedback = (
    <Image
      src="/fidepabutton.png"
      alt="Feedback"
      width={36}
      height={36}
      className="rounded-full"
    />
  );

  return (
    <header className="h-16 bg-[#5E9AD3] text-white flex items-center justify-between px-8 shadow-sm">
      <div className="flex items-center gap-4">
        {puoVedereFeedback ? (
          <Link
            href="/feedback"
            className="cursor-pointer"
            title="Feedback"
            aria-label="Apri feedback"
          >
            {logoFeedback}
          </Link>
        ) : (
          <span className="inline-flex" aria-hidden="true">
            {logoFeedback}
          </span>
        )}

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
          {roleLabel(ruolo)}
        </span>

        <button
          type="button"
          onClick={logout}
          className="text-white/90 hover:text-[#2B2F5E] transition cursor-pointer"
        >
          Esci
        </button>
      </div>

    </header>
  );
}

