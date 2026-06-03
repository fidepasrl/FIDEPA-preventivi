"use client";

import { useEffect, useState } from "react";
import LayoutApp from "@/components/LayoutApp";
import { supabase } from "@/lib/supabase";

type Feedback = {
  id: string;
  testo: string;
  pagina: string | null;
  created_at: string;
};

type Consiglio = {
  id: string;
  testo: string;
  attivo: boolean;
  created_at: string;
};

export default function FeedbackPage() {
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [consigli, setConsigli] = useState<Consiglio[]>([]);

  const [caricamentoFeedback, setCaricamentoFeedback] = useState(true);
  const [caricamentoConsigli, setCaricamentoConsigli] = useState(true);

  const [feedbackDaEliminare, setFeedbackDaEliminare] =
    useState<Feedback | null>(null);

  const [consiglioDaEliminare, setConsiglioDaEliminare] =
    useState<Consiglio | null>(null);

  const [nuovoConsiglio, setNuovoConsiglio] = useState("");

  useEffect(() => {
    caricaFeedback();
    caricaConsigli();
  }, []);

  async function caricaFeedback() {
    setCaricamentoFeedback(true);

    const { data, error } = await supabase
      .from("feedback")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setFeedback([]);
    } else {
      setFeedback(data || []);
    }

    setCaricamentoFeedback(false);
  }

  async function caricaConsigli() {
    setCaricamentoConsigli(true);

    const { data, error } = await supabase
      .from("consigli")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setConsigli([]);
    } else {
      setConsigli(data || []);
    }

    setCaricamentoConsigli(false);
  }

  async function eliminaFeedback() {
    if (!feedbackDaEliminare) return;

    const { error } = await supabase
      .from("feedback")
      .delete()
      .eq("id", feedbackDaEliminare.id);

    if (error) {
      console.error(error);
      return;
    }

    setFeedback((correnti) =>
      correnti.filter((item) => item.id !== feedbackDaEliminare.id)
    );

    setFeedbackDaEliminare(null);
  }

  async function aggiungiConsiglio() {
    if (!nuovoConsiglio.trim()) return;

    const { data, error } = await supabase
      .from("consigli")
      .insert({
        testo: nuovoConsiglio.trim(),
        attivo: true,
      })
      .select()
      .single();

    if (error) {
      console.error(error);
      return;
    }

    if (data) {
      setConsigli((correnti) => [data, ...correnti]);
    }

    setNuovoConsiglio("");
  }

  async function eliminaConsiglio() {
    if (!consiglioDaEliminare) return;

    const { error } = await supabase
      .from("consigli")
      .delete()
      .eq("id", consiglioDaEliminare.id);

    if (error) {
      console.error(error);
      return;
    }

    setConsigli((correnti) =>
      correnti.filter((item) => item.id !== consiglioDaEliminare.id)
    );

    setConsiglioDaEliminare(null);
  }

  async function toggleConsiglio(consiglio: Consiglio) {
    const nuovoValore = !consiglio.attivo;

    const { error } = await supabase
      .from("consigli")
      .update({ attivo: nuovoValore })
      .eq("id", consiglio.id);

    if (error) {
      console.error(error);
      return;
    }

    setConsigli((correnti) =>
      correnti.map((item) =>
        item.id === consiglio.id ? { ...item, attivo: nuovoValore } : item
      )
    );
  }

  function formattaData(data: string) {
    return new Date(data).toLocaleString("it-IT");
  }

  return (
    <LayoutApp>
      <div className="space-y-10">
        <section>
          <div className="flex justify-between items-center mb-6">
            <h2 className="page-title">Feedback</h2>
          </div>

          {caricamentoFeedback ? (
            <p className="text-center text-gray-500 py-10">
              Caricamento feedback...
            </p>
          ) : feedback.length === 0 ? (
            <p className="text-center text-gray-500 py-10">
              Nessun feedback ricevuto.
            </p>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              {feedback.map((item) => (
                <div
                  key={item.id}
                  className="bg-white border border-gray-200 shadow-sm rounded-sm overflow-hidden"
                >
                  <div className="px-4 py-3 border-b border-gray-200 bg-[#FAFAFA] flex justify-between items-center">
                    <p className="text-[15px] text-[#D79D06]">
                      {formattaData(item.created_at)}
                    </p>

                    <button
                      type="button"
                      onClick={() => setFeedbackDaEliminare(item)}
                      className="bg-red-600 hover:bg-red-700 text-white w-8 h-8 flex items-center justify-center rounded-sm transition cursor-pointer"
                    >
                      ×
                    </button>
                  </div>

                  <div className="p-4">
                    <p className="text-[14px] text-[#2B2F5E] whitespace-pre-line">
                      {item.testo}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="page-title">Consigli sidebar</h2>
            </div>
          </div>

          <div className="bg-white border border-gray-200 shadow-sm rounded-sm overflow-hidden mb-3">
            <div className="px-4 py-3 border-b border-gray-200 bg-[#FAFAFA]">
              <h3 className="text-[17px] font-normal text-[#2B2F5E]">
                Nuovo consiglio
              </h3>
            </div>

            <div className="p-4">
              <textarea
                value={nuovoConsiglio}
                onChange={(e) => setNuovoConsiglio(e.target.value)}
                rows={3}
                placeholder="Es. Ricorda di prendere almeno un caffè ogni ora..."
                className="w-full border border-gray-300 rounded-md px-4 py-3 bg-transparent outline-none transition focus:bg-white focus:border-[#64B445] focus:shadow-sm text-[14px] text-[#2B2F5E] resize-none"
              />

              <div className="flex justify-end mt-3">
                <button
                  type="button"
                  onClick={aggiungiConsiglio}
                  disabled={!nuovoConsiglio.trim()}
                  className="bg-[#64B445] text-white w-12 h-12 rounded-md text-2xl font-light hover:bg-[#5AA03E] hover:scale-105 transition flex items-center justify-center shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {caricamentoConsigli ? (
            <p className="text-center text-gray-500 py-10">
              Caricamento consigli...
            </p>
          ) : consigli.length === 0 ? (
            <p className="text-center text-gray-500 py-10">
              Nessun consiglio inserito.
            </p>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              {consigli.map((item) => (
                <div
                  key={item.id}
                  className={`bg-white border shadow-sm rounded-sm overflow-hidden ${
                    item.attivo ? "border-gray-200" : "border-gray-100 opacity-50"
                  }`}
                >
                  <div className="px-4 py-3 border-b border-gray-200 bg-[#FAFAFA] flex justify-between items-center">
                    <p className="text-[15px] text-[#D79D06]">
                      {item.attivo ? "Attivo" : "Disattivato"}
                    </p>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => toggleConsiglio(item)}
                        className="border border-gray-300 text-[#2B2F5E] w-8 h-8 flex items-center justify-center rounded-sm bg-transparent hover:bg-[#e8e8e8] transition cursor-pointer"
                        title={item.attivo ? "Disattiva" : "Attiva"}
                      >
                        {item.attivo ? "✓" : "○"}
                      </button>

                      <button
                        type="button"
                        onClick={() => setConsiglioDaEliminare(item)}
                        className="bg-red-600 hover:bg-red-700 text-white w-8 h-8 flex items-center justify-center rounded-sm transition cursor-pointer"
                      >
                        ×
                      </button>
                    </div>
                  </div>

                  <div className="p-4">
                    <p className="text-[14px] text-[#2B2F5E] whitespace-pre-line">
                      {item.testo}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {feedbackDaEliminare && (
        <Popup title="Elimina feedback" onClose={() => setFeedbackDaEliminare(null)}>
          <p className="text-sm text-gray-600 mb-8">
            Sei sicuro di voler eliminare questo feedback?
          </p>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setFeedbackDaEliminare(null)}
              className="border border-gray-300 text-[#2B2F5E] px-5 py-3 rounded-sm text-sm font-medium bg-transparent hover:bg-[#e8e8e8] transition cursor-pointer"
            >
              Annulla
            </button>

            <button
              type="button"
              onClick={eliminaFeedback}
              className="bg-red-600 hover:bg-red-700 text-white px-5 py-3 rounded-sm text-sm font-medium transition cursor-pointer"
            >
              Elimina
            </button>
          </div>
        </Popup>
      )}

      {consiglioDaEliminare && (
        <Popup title="Elimina consiglio" onClose={() => setConsiglioDaEliminare(null)}>
          <p className="text-sm text-gray-600 mb-8">
            Sei sicuro di voler eliminare questo consiglio?
          </p>

          <div className="border border-gray-200 rounded-sm p-4 bg-[#F2F2F2] mb-8">
            <p className="text-sm text-[#2B2F5E]">
              {consiglioDaEliminare.testo}
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setConsiglioDaEliminare(null)}
              className="border border-gray-300 text-[#2B2F5E] px-5 py-3 rounded-sm text-sm font-medium bg-transparent hover:bg-[#e8e8e8] transition cursor-pointer"
            >
              Annulla
            </button>

            <button
              type="button"
              onClick={eliminaConsiglio}
              className="bg-red-600 hover:bg-red-700 text-white px-5 py-3 rounded-sm text-sm font-medium transition cursor-pointer"
            >
              Elimina
            </button>
          </div>
        </Popup>
      )}
    </LayoutApp>
  );
}

function Popup({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-sm shadow-2xl w-full max-w-md p-8">
        <div className="flex justify-between items-start mb-6">
          <h3 className="text-xl font-semibold text-[#2B2F5E]">{title}</h3>

          <button
            type="button"
            onClick={onClose}
            className="text-2xl text-gray-400 hover:text-[#2B2F5E] cursor-pointer"
          >
            ×
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}