"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import AppIcon, { type AppIconName } from "@/components/AppIcon";
import { isAdminOrDeveloperRole, normalizeRole } from "@/lib/roles";
import { supabase } from "@/lib/supabase";

export default function AppSidebar({
  mobileOpen,
  onClose,
}: {
  mobileOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const [riunioniOpen, setRiunioniOpen] = useState(
    pathname.startsWith("/riunioni")
  );
  const [preventiviOpen, setPreventiviOpen] = useState(
    pathname.startsWith("/preventivo")
  );
  const [rubricaOpen, setRubricaOpen] = useState(
    pathname.startsWith("/rubrica")
  );
  const [requisitiOpen, setRequisitiOpen] = useState(
    pathname.startsWith("/requisiti")
  );
  const [economiaOpen, setEconomiaOpen] = useState(
    pathname.startsWith("/economia")
  );
  const [attivitaOpen, setAttivitaOpen] = useState(
    pathname.startsWith("/attivita")
  );
  const [confermaUscita, setConfermaUscita] = useState<string | null>(null);
  const [consiglio, setConsiglio] = useState("");
  const [ruolo, setRuolo] = useState("user");

  const isPreventivoInCompilazione =
    pathname.startsWith("/preventivo/nuovo") ||
    pathname === "/preventivo/step1" ||
    pathname === "/preventivo/step2" ||
    pathname === "/preventivo/step3";

  function gestisciNavigazione(href: string) {
    if (isPreventivoInCompilazione && href !== pathname) {
      setConfermaUscita(href);
      return;
    }

    onClose();
    window.location.href = href;
  }

  function confermaNavigazione() {
    localStorage.removeItem("datiClientePreventivo");
    localStorage.removeItem("lavorazioniSelezionate");
    localStorage.removeItem("riepilogoPreventivo");

    if (confermaUscita) {
      window.location.href = confermaUscita;
    }
  }

  async function caricaConsiglioCasuale() {
    const { data, error } = await supabase
      .from("consigli")
      .select("id, testo")
      .eq("attivo", true);

    if (error || !data || data.length === 0) return;

    const casuale = data[Math.floor(Math.random() * data.length)];
    setConsiglio(casuale.testo);
  }

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

    setRuolo(normalizeRole(data?.ruolo));
  }

  useEffect(() => {
    // Il consiglio viene caricato dal database dopo il primo rendering.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    caricaConsiglioCasuale();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    caricaRuolo();
  }, []);

  const puoVedereEconomia = isAdminOrDeveloperRole(ruolo);

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Chiudi menu"
          onClick={onClose}
          className="fixed inset-0 top-[72px] z-[800] bg-[#2B2F5E]/25 backdrop-blur-[2px] lg:hidden"
        />
      )}

      <aside
        className={`fixed lg:sticky top-[72px] left-0 z-[900] h-[calc(100vh-72px)] w-[276px] shrink-0 border-r border-[#2B2F5E]/8 bg-[#F2F2F2] flex flex-col justify-between overflow-y-auto transform transition-transform duration-200 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <nav className="p-4 lg:p-5 space-y-1.5">
          <SidebarItem
            icon="home"
            label="Dashboard"
            active={pathname === "/"}
            onClick={() => gestisciNavigazione("/")}
          />

          <SidebarItem
            icon="building"
            label="Commesse"
            active={pathname.startsWith("/commesse")}
            onClick={() => gestisciNavigazione("/commesse")}
          />

          <SidebarGroup
            icon="calendar"
            label="Attività"
            open={attivitaOpen}
            onClick={() => setAttivitaOpen((corrente) => !corrente)}
          >
            <SidebarSubItem
              label="Calendario"
              active={pathname === "/attivita/calendario"}
              onClick={() => gestisciNavigazione("/attivita/calendario")}
            />
            <SidebarSubItem
              label="Personale"
              active={pathname === "/attivita/personale"}
              onClick={() => gestisciNavigazione("/attivita/personale")}
            />
          </SidebarGroup>

          <SidebarGroup
            icon="message"
            label="Riunioni"
            open={riunioniOpen}
            onClick={() => setRiunioniOpen((corrente) => !corrente)}
          >
            <SidebarSubItem
              label="Nuova"
              active={pathname === "/riunioni/nuova"}
              onClick={() => gestisciNavigazione("/riunioni/nuova")}
            />
            <SidebarSubItem
              label="Archivio"
              active={pathname === "/riunioni/archivio"}
              onClick={() => gestisciNavigazione("/riunioni/archivio")}
            />
          </SidebarGroup>

          <SidebarGroup
            icon="fileText"
            label="Preventivi"
            open={preventiviOpen}
            onClick={() => setPreventiviOpen((corrente) => !corrente)}
          >
            <SidebarSubItem
              label="Nuovo"
              active={
                pathname.startsWith("/preventivo/nuovo") ||
                pathname === "/preventivo/step1" ||
                pathname === "/preventivo/step2" ||
                pathname === "/preventivo/step3"
              }
              onClick={() => gestisciNavigazione("/preventivo/nuovo/step1")}
            />
            <SidebarSubItem
              label="Lavorazioni"
              active={pathname === "/preventivo/lavorazioni"}
              onClick={() => gestisciNavigazione("/preventivo/lavorazioni")}
            />
            <SidebarSubItem
              label="Archivio"
              active={pathname === "/preventivo/archivio"}
              onClick={() => gestisciNavigazione("/preventivo/archivio")}
            />
          </SidebarGroup>

          <SidebarGroup
            icon="flag"
            label="Gare d'appalto"
            open={requisitiOpen}
            onClick={() => setRequisitiOpen((corrente) => !corrente)}
          >
            <SidebarSubItem
              label="Lista commesse"
              active={pathname === "/requisiti/commesse"}
              onClick={() => gestisciNavigazione("/requisiti/commesse")}
            />
            <SidebarSubItem
              label="Categorie"
              active={pathname === "/requisiti/categorie"}
              onClick={() => gestisciNavigazione("/requisiti/categorie")}
            />
            <SidebarSubItem
              label="Verifica gara"
              active={pathname === "/requisiti/verifica"}
              onClick={() => gestisciNavigazione("/requisiti/verifica")}
            />
            <SidebarSubItem
              label="Preparazione"
              active={pathname === "/requisiti/preparazione"}
              onClick={() => gestisciNavigazione("/requisiti/preparazione")}
            />
            <SidebarSubItem
              label="Archivio gare"
              active={pathname === "/requisiti/archivio"}
              onClick={() => gestisciNavigazione("/requisiti/archivio")}
            />
          </SidebarGroup>

          {puoVedereEconomia && (
            <SidebarGroup
              icon="euro"
              label="Gestione Economica"
              open={economiaOpen}
              onClick={() => setEconomiaOpen((corrente) => !corrente)}
            >
              <SidebarSubItem
                label="Report"
                active={pathname === "/economia"}
                onClick={() => gestisciNavigazione("/economia")}
              />
              <SidebarSubItem
                label="Commesse"
                active={pathname === "/economia/commesse"}
                onClick={() => gestisciNavigazione("/economia/commesse")}
              />
              <SidebarSubItem
                label="Costi società"
                active={pathname === "/economia/costi"}
                onClick={() => gestisciNavigazione("/economia/costi")}
              />
            </SidebarGroup>
          )}

          <SidebarGroup
            icon="addressBook"
            label="Rubrica"
            open={rubricaOpen}
            onClick={() => setRubricaOpen((corrente) => !corrente)}
          >
            <SidebarSubItem
              label="Clienti"
              active={pathname === "/rubrica/clienti"}
              onClick={() => gestisciNavigazione("/rubrica/clienti")}
            />
            <SidebarSubItem
              label="Professionisti"
              active={pathname === "/rubrica/professionisti"}
              onClick={() => gestisciNavigazione("/rubrica/professionisti")}
            />
          </SidebarGroup>
        </nav>

        <div className="p-4 lg:p-5 pt-8 space-y-4">
          {consiglio && (
            <div className="relative overflow-hidden rounded-2xl border border-white bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
              <div className="absolute inset-y-0 left-0 w-1 bg-[#D79D06]" />
              <div className="flex items-center gap-2 text-[#D79D06]">
                <span className="h-8 w-8 rounded-xl bg-[#D79D06]/10 flex items-center justify-center">
                  <AppIcon name="lightbulb" size={17} />
                </span>
                <p className="text-[11px] uppercase tracking-[0.12em] font-bold">
                  Consiglio
                </p>
              </div>
              <p className="mt-3 text-[13px] text-[#2B2F5E] leading-relaxed">
                {consiglio}
              </p>
            </div>
          )}

          <div className="px-1 text-[11px] text-[#2B2F5E]/55">
            Versione 2.3.0 - Creato da Antonio Carbone
          </div>
        </div>
      </aside>

      {confermaUscita && (
        <div className="fixed inset-0 bg-[#2B2F5E]/45 backdrop-blur-sm z-[1200] flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl shadow-[0_24px_60px_rgba(43,47,94,0.22)] w-full max-w-xl p-7">
            <div className="flex justify-between items-start gap-5 mb-6">
              <div>
                <h3 className="text-2xl font-semibold text-[#2B2F5E]">
                  Annullare la compilazione del preventivo?
                </h3>
                <p className="text-sm text-gray-500 mt-2">
                  Uscendo da questa sezione i dati inseriti verranno cancellati.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConfermaUscita(null)}
                className="h-9 w-9 rounded-xl flex items-center justify-center text-gray-400 hover:bg-[#F2F2F2] hover:text-[#2B2F5E] transition cursor-pointer"
                aria-label="Chiudi"
              >
                <AppIcon name="x" size={19} />
              </button>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfermaUscita(null)}
                className="border border-gray-200 text-[#2B2F5E] px-5 py-3 rounded-xl text-sm font-medium bg-white hover:bg-[#F2F2F2] transition cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={confermaNavigazione}
                className="bg-red-600 text-white px-5 py-3 rounded-xl text-sm font-medium hover:bg-red-700 transition cursor-pointer"
              >
                Conferma
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SidebarItem({
  icon,
  label,
  active,
  onClick,
}: {
  icon: AppIconName;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={active ? "menu-item-active" : "menu-item"}
    >
      <span className="menu-icon">
        <AppIcon name={icon} size={18} />
      </span>
      <span>{label}</span>
    </button>
  );
}

function SidebarGroup({
  icon,
  label,
  open,
  onClick,
  children,
}: {
  icon: AppIconName;
  label: string;
  open: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button type="button" onClick={onClick} className="menu-item-button">
          <span className="flex items-center gap-3">
            <span className="menu-icon">
              <AppIcon name={icon} size={18} />
            </span>
          <span className="text-left leading-tight">{label}</span>
        </span>
        <AppIcon
          name="chevronDown"
          size={16}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div className="submenu">{children}</div>}
    </div>
  );
}

function SidebarSubItem({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={active ? "submenu-item-active" : "submenu-item"}
    >
      {label}
    </button>
  );
}
