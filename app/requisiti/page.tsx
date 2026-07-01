import Link from "next/link";
import LayoutApp from "@/components/LayoutApp";

const sezioni = [
  {
    titolo: "Lista commesse",
    descrizione: "Riepilogo lavori, prestazioni e importi per categoria.",
    href: "/requisiti/commesse",
  },
  {
    titolo: "Categorie di gara",
    descrizione: "Riepilogo automatico degli importi dalla lista commesse.",
    href: "/requisiti/categorie",
  },
  {
    titolo: "Verifica gara",
    descrizione: "Controllo requisiti tecnici ed economici da disciplinare.",
    href: "/requisiti/verifica",
  },
  {
    titolo: "Preparazione gara",
    descrizione: "Nuova scheda gara, requisiti e raggruppamento.",
    href: "/requisiti/preparazione",
  },
  {
    titolo: "Archivio gare",
    descrizione: "Schede salvate ordinate per data di creazione.",
    href: "/requisiti/archivio",
  },
];

export default function RequisitiPage() {
  return (
    <LayoutApp>
      <div>
        <div className="mb-6">
          <h2 className="page-title">Gare d&apos;appalto</h2>

          <p className="text-[15px] text-[#D79D06] mt-1">
            Analisi dei requisiti tecnici ed economici per bandi pubblici
          </p>
        </div>

        <div className="bg-white border border-gray-200 shadow-sm rounded-sm overflow-hidden max-w-3xl">
          <div className="px-4 py-3 border-b border-gray-200 bg-[#FAFAFA]">
            <h3 className="text-[17px] font-normal text-[#2B2F5E]">
              Menu gare d&apos;appalto
            </h3>
          </div>

          <nav className="p-3">
            <div className="submenu ml-0">
              {sezioni.map((sezione) => (
                <Link
                  key={sezione.href}
                  href={sezione.href}
                  className="submenu-item"
                >
                  <span className="block">{sezione.titolo}</span>
                  <span className="block text-[12px] font-normal text-gray-500 mt-1">
                    {sezione.descrizione}
                  </span>
                </Link>
              ))}
            </div>
          </nav>
        </div>
      </div>
    </LayoutApp>
  );
}
