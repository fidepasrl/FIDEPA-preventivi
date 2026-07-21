"use client";

import { useEffect, useState } from "react";
import AppIcon from "@/components/AppIcon";
import { isAdminOrDeveloperRole, normalizeRole } from "@/lib/roles";
import { supabase } from "@/lib/supabase";

export default function EconomiaAccessGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const [caricamento, setCaricamento] = useState(true);
  const [autorizzato, setAutorizzato] = useState(false);

  useEffect(() => {
    let componenteAttivo = true;

    async function verificaRuolo() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (componenteAttivo) {
          setAutorizzato(false);
          setCaricamento(false);
        }
        return;
      }

      const { data } = await supabase
        .from("profili_utente")
        .select("ruolo")
        .eq("id", user.id)
        .single();

      if (componenteAttivo) {
        setAutorizzato(isAdminOrDeveloperRole(normalizeRole(data?.ruolo)));
        setCaricamento(false);
      }
    }

    verificaRuolo();

    return () => {
      componenteAttivo = false;
    };
  }, []);

  if (caricamento) {
    return (
      <div className="min-h-[45vh] flex items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span className="h-8 w-8 rounded-xl bg-white shadow-sm flex items-center justify-center text-[#5E9AD3]">
            <AppIcon name="refresh" size={17} className="animate-spin" />
          </span>
          Verifica permessi...
        </div>
      </div>
    );
  }

  if (!autorizzato) {
    return (
      <div className="rounded-2xl border border-white bg-white p-8 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
        <div className="flex items-start gap-4">
          <span className="h-12 w-12 rounded-2xl bg-[#D79D06]/12 text-[#D79D06] flex items-center justify-center shrink-0">
            <AppIcon name="wallet" size={22} />
          </span>
          <div>
            <h2 className="text-xl font-semibold text-[#2B2F5E]">
              Accesso riservato
            </h2>
            <p className="mt-2 text-sm text-gray-500 leading-relaxed">
              La Gestione Economica è disponibile solo per account ADMIN e
              DEVELOPER.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
