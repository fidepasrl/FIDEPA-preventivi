export default function Home() {

  const today = new Date().toLocaleDateString("it-IT");

  return (
    <main className="min-h-screen bg-[#2B2E65] p-10">

      <div className="max-w-6xl mx-auto">

        {/* HEADER */}

        <div className="flex justify-between items-center mb-10">

          <div>
            <h1 className="text-5xl font-bold text-white">
              FIDEPA Preventivi
            </h1>

            <p className="text-white/70 mt-2 text-lg">
              Gestionale interno per la creazione dei preventivi
            </p>
          </div>

          <div className="text-right text-white">
            <p className="text-sm opacity-70">
              Versione 1.0
            </p>

            <p className="text-lg font-semibold">
              {today}
            </p>
          </div>

        </div>

        {/* CARD PRINCIPALE */}

        <div className="bg-white rounded-3xl shadow-2xl p-10">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            <a
              href="/preventivi/nuovo"
              className="bg-[#2B2E65] text-white p-8 rounded-2xl text-2xl font-semibold hover:scale-[1.02] transition text-center"
            >
             + Nuovo Preventivo
            </a>

            <button className="border-2 border-[#2B2E65] text-[#2B2E65] p-8 rounded-2xl text-2xl font-semibold hover:bg-gray-100 transition">
              Archivio Preventivi
            </button>

            <button className="border-2 border-[#2B2E65] text-[#2B2E65] p-8 rounded-2xl text-2xl font-semibold hover:bg-gray-100 transition">
              Clienti
            </button>

            <button className="border-2 border-[#2B2E65] text-[#2B2E65] p-8 rounded-2xl text-2xl font-semibold hover:bg-gray-100 transition">
              Lavorazioni
            </button>

          </div>

        </div>

      </div>

    </main>
  );
}