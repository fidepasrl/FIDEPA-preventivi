"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AppIcon from "@/components/AppIcon";
import { isDeveloperRole, normalizeRole, roleLabel } from "@/lib/roles";
import { supabase } from "@/lib/supabase";

type SearchItem = {
  id: string;
  titolo: string;
  dettaglio: string;
  href: string;
  tipo: "Commessa" | "Attivita" | "Riunione";
};

export default function Topbar({
  onToggleSidebar,
}: {
  onToggleSidebar: () => void;
}) {
  const [ruolo, setRuolo] = useState("user");
  const [email, setEmail] = useState("");
  const [ricerca, setRicerca] = useState("");
  const [ricercaAperta, setRicercaAperta] = useState(false);
  const [elementiRicerca, setElementiRicerca] = useState<SearchItem[]>([]);
  const [profiloAperto, setProfiloAperto] = useState(false);

  const today = new Date().toLocaleDateString("it-IT", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  useEffect(() => {
    let componenteAttivo = true;

    async function caricaTopbar() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !componenteAttivo) return;

      setEmail(user.email || "");

      const [profilo, commesse, attivita, riunioni] = await Promise.all([
          supabase
            .from("profili_utente")
            .select("ruolo")
            .eq("id", user.id)
            .single(),
          supabase
            .from("commesse")
            .select("id, titolo, codice")
            .order("titolo")
            .limit(150),
          supabase
            .from("attivita_commesse")
            .select("id, titolo, data_inizio")
            .order("data_inizio", { ascending: false })
            .limit(100),
          supabase
            .from("riunioni")
            .select("id, titolo, data_riunione")
            .order("data_riunione", { ascending: false })
            .limit(50),
        ]);

      if (!componenteAttivo) return;

      setRuolo(normalizeRole(profilo.data?.ruolo));
      setElementiRicerca([
        ...(commesse.data || []).map((item) => ({
          id: `commessa-${item.id}`,
          titolo: item.titolo,
          dettaglio: item.codice || "Scheda commessa",
          href: `/commesse/${item.id}`,
          tipo: "Commessa" as const,
        })),
        ...(attivita.data || []).map((item) => ({
          id: `attivita-${item.id}`,
          titolo: item.titolo,
          dettaglio: item.data_inizio
            ? new Date(item.data_inizio).toLocaleDateString("it-IT")
            : "Calendario attivita",
          href: "/attivita/calendario",
          tipo: "Attivita" as const,
        })),
        ...(riunioni.data || []).map((item) => ({
          id: `riunione-${item.id}`,
          titolo: item.titolo,
          dettaglio: item.data_riunione
            ? new Date(item.data_riunione).toLocaleDateString("it-IT")
            : "Archivio riunioni",
          href: "/riunioni/archivio",
          tipo: "Riunione" as const,
        })),
      ]);
    }

    caricaTopbar();

    return () => {
      componenteAttivo = false;
    };
  }, []);

  const risultatiRicerca = useMemo(() => {
    const termine = ricerca.trim().toLocaleLowerCase("it-IT");
    if (termine.length < 2) return [];

    return elementiRicerca
      .filter((item) =>
        `${item.titolo} ${item.dettaglio} ${item.tipo}`
          .toLocaleLowerCase("it-IT")
          .includes(termine)
      )
      .slice(0, 8);
  }, [elementiRicerca, ricerca]);

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const puoVedereFeedback = isDeveloperRole(ruolo);
  const iconaProfilo = puoVedereFeedback
    ? "userDeveloper"
    : ruolo === "admin"
      ? "userAdmin"
      : "user";

  return (
    <header className="sticky top-0 z-[1000] h-[72px] bg-[#5E9AD3] text-white shadow-[0_8px_24px_rgba(43,47,94,0.12)]">
      <div className="h-full px-4 lg:px-6 flex items-center gap-4">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="lg:hidden h-10 w-10 shrink-0 rounded-xl flex items-center justify-center bg-white/10 hover:bg-white/20 transition cursor-pointer"
          aria-label="Apri menu"
          title="Menu"
        >
          <AppIcon name="menu" size={21} />
        </button>

        <div className="flex items-center gap-3 shrink-0">
          {puoVedereFeedback ? (
            <Link
              href="/feedback"
              className="hidden sm:inline-flex rounded-full ring-2 ring-white/20 hover:ring-white/50 transition"
              title="Feedback"
              aria-label="Apri feedback"
            >
              <Image
                src="/fidepabutton.png"
                alt=""
                width={38}
                height={38}
                className="rounded-full"
              />
            </Link>
          ) : (
            <span
              className="hidden sm:inline-flex rounded-full ring-2 ring-white/20"
              aria-hidden="true"
            >
              <Image
                src="/fidepabutton.png"
                alt=""
                width={38}
                height={38}
                className="rounded-full"
              />
            </span>
          )}

          <Image
            src="/fidepa.png"
            alt="FIDEPA"
            width={124}
            height={38}
            priority
            className="h-auto"
          />

          <span className="hidden 2xl:block text-[13px] font-medium text-white/85 border-l border-white/30 pl-3">
            Portale di gestione aziendale
          </span>
        </div>

        <div className="group relative hidden md:block flex-1 max-w-2xl mx-auto">
          <AppIcon
            name="search"
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/70 group-focus-within:text-[#2B2F5E]/55"
          />
          <input
            value={ricerca}
            onChange={(event) => {
              setRicerca(event.target.value);
              setRicercaAperta(true);
            }}
            onFocus={() => setRicercaAperta(true)}
            onBlur={() => window.setTimeout(() => setRicercaAperta(false), 150)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && risultatiRicerca[0]) {
                window.location.href = risultatiRicerca[0].href;
              }
            }}
            placeholder="Cerca commesse, attività, riunioni..."
            className="w-full h-11 rounded-xl border border-white/20 bg-white/12 pl-11 pr-4 text-sm text-white placeholder:text-white/65 outline-none hover:bg-white/16 focus:border-white focus:bg-white focus:text-[#2B2F5E] focus:placeholder:text-[#2B2F5E]/45 focus:ring-4 focus:ring-white/15 transition"
          />

          {ricercaAperta && ricerca.trim().length >= 2 && (
            <div className="absolute top-[calc(100%+10px)] left-0 right-0 overflow-hidden rounded-2xl border border-gray-200 bg-white text-[#2B2F5E] shadow-[0_18px_45px_rgba(43,47,94,0.18)]">
              {risultatiRicerca.length === 0 ? (
                <p className="px-4 py-5 text-sm text-gray-500">
                  Nessun risultato trovato.
                </p>
              ) : (
                risultatiRicerca.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-[#F2F2F2] transition"
                  >
                    <span className="h-9 w-9 rounded-xl bg-[#5E9AD3]/12 text-[#2D80B3] flex items-center justify-center shrink-0">
                      <AppIcon
                        name={
                          item.tipo === "Commessa"
                            ? "briefcase"
                            : item.tipo === "Attivita"
                              ? "activity"
                              : "message"
                        }
                        size={17}
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">
                        {item.titolo}
                      </span>
                      <span className="block truncate text-xs text-gray-500">
                        {item.tipo} - {item.dettaglio}
                      </span>
                    </span>
                  </Link>
                ))
              )}
            </div>
          )}
        </div>

        <div className="ml-auto flex items-center gap-1.5 shrink-0">
          <span className="hidden xl:block mr-2 text-[12px] font-medium text-white/85 capitalize">
            {today}
          </span>

          <div className="relative">
            <button
              type="button"
              onClick={() => setProfiloAperto((corrente) => !corrente)}
              className="h-10 pl-1.5 pr-2 rounded-xl flex items-center gap-2 hover:bg-white/15 transition cursor-pointer"
              aria-label="Profilo utente"
              title="Profilo"
            >
              <span className="h-8 w-8 rounded-lg bg-white text-[#2D80B3] flex items-center justify-center shadow-sm">
                <AppIcon name={iconaProfilo} size={18} />
              </span>
              <span className="hidden lg:block text-[11px] font-bold">
                {roleLabel(ruolo)}
              </span>
              <AppIcon
                name="chevronDown"
                size={14}
                className="hidden lg:block"
              />
            </button>

            {profiloAperto && (
              <div className="absolute right-0 top-[calc(100%+10px)] w-64 rounded-2xl border border-gray-200 bg-white p-3 text-[#2B2F5E] shadow-[0_18px_45px_rgba(43,47,94,0.18)]">
                <div className="px-2 py-2 border-b border-gray-100">
                  <p className="text-sm font-semibold">{roleLabel(ruolo)}</p>
                  <p className="mt-0.5 truncate text-xs text-gray-500">
                    {email || "Utente FIDEPA"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="mt-2 w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-left hover:bg-[#F2F2F2] transition cursor-pointer"
                >
                  <AppIcon name="logOut" size={17} />
                  Esci
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
