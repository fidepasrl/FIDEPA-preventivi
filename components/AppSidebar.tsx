"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Consiglio = {
  id: string;
  testo: string;
};

export default function AppSidebar() {
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

  const [confermaUscita, setConfermaUscita] = useState<string | null>(null);

  const [consiglio, setConsiglio] = useState<string>("");

  const [attivitaOpen, setAttivitaOpen] = useState(
    pathname.startsWith("/attivita")
  );

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

  useEffect(() => {
  caricaConsiglioCasuale();
}, []);

  async function caricaConsiglioCasuale() {
    const { data, error } = await supabase
      .from("consigli")
      .select("id, testo")
      .eq("attivo", true);

    if (error || !data || data.length === 0) return;

    const casuale = data[Math.floor(Math.random() * data.length)];
    setConsiglio(casuale.testo);
  }

  return (
    <aside className="w-72 min-h-[calc(100vh-4rem)] bg-[#F2F2F2] flex flex-col justify-between">
      <nav className="p-4 space-y-2">
        <button
          type="button"
          onClick={() => gestisciNavigazione("/")}
          className={pathname === "/" ? "menu-item-active" : "menu-item"}
        >
          <span>⌂</span>
          Dashboard
        </button>

        <button
          type="button"
          onClick={() => gestisciNavigazione("/commesse")}
          className={pathname.startsWith("/commesse") ? "menu-item-active" : "menu-item"}
        >
          <span>▦</span>
          Commesse
        </button>

        <button
          type="button"
          onClick={() => setAttivitaOpen((prev) => !prev)}
          className="menu-item-button"
        >
          <span className="flex items-center gap-3">
            <span>▥</span>
            Attività
          </span>

          <span className={`transition-transform ${attivitaOpen ? "rotate-180" : ""}`}>
            ⌃
          </span>
        </button>

        {attivitaOpen && (
          <div className="submenu">
            <button
              type="button"
              onClick={() => gestisciNavigazione("/attivita/calendario")}
              className={
                pathname === "/attivita/calendario"
                  ? "submenu-item-active"
                  : "submenu-item"
              }
            >
              Calendario
            </button>

            <button
              type="button"
              onClick={() => gestisciNavigazione("/attivita/personale")}
              className={
                pathname === "/attivita/personale"
                  ? "submenu-item-active"
                  : "submenu-item"
              }
            >
              Personale
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => setRiunioniOpen((prev) => !prev)}
          className="menu-item-button"
        >
          <span className="flex items-center gap-3">
            <span>◷</span>
            Riunioni
          </span>

          <span className={`transition-transform ${riunioniOpen ? "rotate-180" : ""}`}>
            ⌃
          </span>
        </button>

        {riunioniOpen && (
          <div className="submenu">
            <button
              type="button"
              onClick={() => gestisciNavigazione("/riunioni/nuova")}
              className={
                pathname === "/riunioni/nuova"
                  ? "submenu-item-active"
                  : "submenu-item"
              }
            >
              Nuova
            </button>

            <button
              type="button"
              onClick={() => gestisciNavigazione("/riunioni/archivio")}
              className={
                pathname === "/riunioni/archivio"
                  ? "submenu-item-active"
                  : "submenu-item"
              }
            >
              Archivio
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => setPreventiviOpen((prev) => !prev)}
          className="menu-item-button"
        >
          <span className="flex items-center gap-3">
            <span>▤</span>
            Preventivi
          </span>

          <span
            className={`transition-transform ${
              preventiviOpen ? "rotate-180" : ""
            }`}
          >
            ⌃
          </span>
        </button>

        {preventiviOpen && (
          <div className="submenu">
            <button
              type="button"
              onClick={() => gestisciNavigazione("/preventivo/nuovo/step1")}
              className={
                pathname.startsWith("/preventivo/nuovo") ||
                pathname === "/preventivo/step1" ||
                pathname === "/preventivo/step2" ||
                pathname === "/preventivo/step3"
                  ? "submenu-item-active"
                  : "submenu-item"
              }
            >
              Nuovo
            </button>

            <button
              type="button"
              onClick={() => gestisciNavigazione("/preventivo/lavorazioni")}
              className={
                pathname === "/preventivo/lavorazioni"
                  ? "submenu-item-active"
                  : "submenu-item"
              }
            >
              Lavorazioni
            </button>

            <button
              type="button"
              onClick={() => gestisciNavigazione("/preventivo/archivio")}
              className={
                pathname === "/preventivo/archivio"
                  ? "submenu-item-active"
                  : "submenu-item"
              }
            >
              Archivio
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => setRequisitiOpen((prev) => !prev)}
          className="menu-item-button"
        >
          <span className="flex items-center gap-3">
            <span>&#9873;</span>
            Gare d&apos;appalto
          </span>

          <span
            className={`transition-transform ${
              requisitiOpen ? "rotate-180" : ""
            }`}
          >
            ^
          </span>
          <span className="hidden">
          <span>â—Ž</span>
          Gare d&apos;appalto
          </span>
        </button>

        {requisitiOpen && (
          <div className="submenu">
            <button
              type="button"
              onClick={() => gestisciNavigazione("/requisiti/commesse")}
              className={
                pathname === "/requisiti/commesse"
                  ? "submenu-item-active"
                  : "submenu-item"
              }
            >
              Lista commesse
            </button>

            <button
              type="button"
              onClick={() => gestisciNavigazione("/requisiti/categorie")}
              className={
                pathname === "/requisiti/categorie"
                  ? "submenu-item-active"
                  : "submenu-item"
              }
            >
              Categorie
            </button>

            <button
              type="button"
              onClick={() => gestisciNavigazione("/requisiti/verifica")}
              className={
                pathname === "/requisiti/verifica"
                  ? "submenu-item-active"
                  : "submenu-item"
              }
            >
              Verifica gara
            </button>

            <button
              type="button"
              onClick={() => gestisciNavigazione("/requisiti/preparazione")}
              className={
                pathname === "/requisiti/preparazione"
                  ? "submenu-item-active"
                  : "submenu-item"
              }
            >
              Preparazione
            </button>

            <button
              type="button"
              onClick={() => gestisciNavigazione("/requisiti/archivio")}
              className={
                pathname === "/requisiti/archivio"
                  ? "submenu-item-active"
                  : "submenu-item"
              }
            >
              Archivio gare
            </button>
          </div>
        )}

        <div className="hidden">
          <span>◎</span>
          Requisiti di gara
        </div>

        <button
          type="button"
          onClick={() => setRubricaOpen((prev) => !prev)}
          className="menu-item-button"
        >
          <span className="flex items-center gap-3">
            <span>◫</span>
            Rubrica
          </span>

          <span
            className={`transition-transform ${
              rubricaOpen ? "rotate-180" : ""
            }`}
          >
            ⌃
          </span>
        </button>

        {rubricaOpen && (
          <div className="submenu">
            <button
              type="button"
              onClick={() => gestisciNavigazione("/rubrica/clienti")}
              className={
                pathname === "/rubrica/clienti"
                  ? "submenu-item-active"
                  : "submenu-item"
              }
            >
              Clienti
            </button>

            <button
              type="button"
              onClick={() => gestisciNavigazione("/rubrica/professionisti")}
              className={
                pathname === "/rubrica/professionisti"
                  ? "submenu-item-active"
                  : "submenu-item"
              }
            >
              Professionisti
            </button>
          </div>
        )}
      </nav>

      <div className="p-4 space-y-4">
        {consiglio && (
          <div className="bg-white border border-gray-200 shadow-sm rounded-sm p-4">
            <p className="text-[12px] uppercase tracking-[0.12em] text-gray-400 font-medium mb-2">
              Consiglio:
            </p>

            <p className="text-[13px] text-[#2B2F5E] leading-snug">
              {consiglio}
            </p>
          </div>
        )}

        <div className="text-xs text-[#2B2F5E]/60">
          Versione 2.2.1 - Creato da Antonio Carbone
        </div>
      </div>

      {confermaUscita && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-md shadow-2xl w-full max-w-xl p-8">
            <div className="flex justify-between items-start mb-6">
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
                className="text-2xl text-gray-400 hover:text-[#2B2F5E] cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfermaUscita(null)}
                className="border border-gray-300 text-[#2B2F5E] px-5 py-3 rounded-md text-sm font-medium bg-transparent hover:bg-[#e8e8e8] transition cursor-pointer"
              >
                Annulla
              </button>

              <button
                type="button"
                onClick={confermaNavigazione}
                className="bg-red-600 text-white px-5 py-3 rounded-md text-sm font-medium hover:bg-red-700 transition cursor-pointer"
              >
                Conferma
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
