
"use client";

import { useEffect, useState } from "react";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";

import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";
import { supabase } from "@/lib/supabase";

type MacroCategoria = "Progettazione" | "Realizzazione" | "Chiusura dei lavori";

const MACROCATEGORIE: MacroCategoria[] = [
  "Progettazione",
  "Realizzazione",
  "Chiusura dei lavori",
];

type Lavorazione = {
  id: string;
  macrocategoria: MacroCategoria;
  categoria: string;
  nome: string;
  descrizione: string;
  importo: number;
  ordine: number;
  categoria_ordine: number;
};

type Categoria = {
  nome: string;
  macrocategoria: MacroCategoria;
  ordine: number;
};

function RigaLavorazione({
  lav,
  aggiornaCampo,
  eliminaLavorazione,
}: {
  lav: Lavorazione;
  aggiornaCampo: (
    id: string,
    campo: keyof Lavorazione,
    valore: string | number
  ) => void;
  eliminaLavorazione: (id: string) => void;
}) {
  const [descrizioneAperta, setDescrizioneAperta] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: lav.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border rounded-xl p-4 bg-white"
    >
      <div className="grid grid-cols-12 gap-3 items-center">
        <button
          {...attributes}
          {...listeners}
          className="col-span-1 cursor-grab active:cursor-grabbing rounded-lg border p-2 font-bold"
          title="Trascina"
        >
          ☰
        </button>

        <div className="col-span-9 flex gap-2 items-center">
          <input
            value={lav.nome}
            onChange={(e) => aggiornaCampo(lav.id, "nome", e.target.value)}
            className="border rounded-lg p-2 flex-1"
          />

          <button
            type="button"
            onClick={() => setDescrizioneAperta((aperta) => !aperta)}
            className="px-3 py-2 rounded-lg border font-semibold cursor-pointer"
            title="Apri descrizione"
          >
            {descrizioneAperta ? "−" : "Descr."}
          </button>
        </div>

        <input
          type="number"
          value={lav.importo}
          onChange={(e) =>
            aggiornaCampo(lav.id, "importo", Number(e.target.value))
          }
          className="col-span-1 border rounded-lg p-2 text-right"
        />

        <button
          onClick={() => eliminaLavorazione(lav.id)}
          className="col-span-1 bg-red-700 text-white rounded-lg p-2 flex items-center justify-center text-xl cursor-pointer"
          title="Elimina lavorazione"
        >
          🗑
        </button>
      </div>

      {descrizioneAperta && (
        <textarea
          value={lav.descrizione}
          onChange={(e) =>
            aggiornaCampo(lav.id, "descrizione", e.target.value)
          }
          className="mt-3 w-full border rounded-lg p-3 min-h-24"
          placeholder="Descrizione della lavorazione"
        />
      )}
    </div>
  );
}

export default function LavorazioniPage() {
  const [lavorazioni, setLavorazioni] = useState<Lavorazione[]>([]);
  const [loading, setLoading] = useState(true);

  const sensors = useSensors(useSensor(PointerSensor));

  useEffect(() => {
    caricaLavorazioni();
  }, []);

  async function caricaLavorazioni() {
    const { data, error } = await supabase
      .from("lavorazioni")
      .select("*")
      .order("macrocategoria")
      .order("categoria_ordine")
      .order("categoria")
      .order("ordine");

    if (!error && data) {
      setLavorazioni(
        data.map((lav) => ({
          ...lav,
          macrocategoria: lav.macrocategoria || "Progettazione",
        }))
      );
    }

    setLoading(false);
  }

  function aggiornaCampo(
    id: string,
    campo: keyof Lavorazione,
    valore: string | number
  ) {
    setLavorazioni((correnti) =>
      correnti.map((lav) =>
        lav.id === id ? { ...lav, [campo]: valore } : lav
      )
    );
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const activeLav = lavorazioni.find((lav) => lav.id === active.id);
    const overLav = lavorazioni.find((lav) => lav.id === over.id);

    if (!activeLav || !overLav) return;

    // Per ora il drag riordina solo lavorazioni dentro la stessa categoria.
    if (activeLav.categoria !== overLav.categoria) return;

    const lavorazioniCategoria = lavorazioni
      .filter((lav) => lav.categoria === activeLav.categoria)
      .sort((a, b) => a.ordine - b.ordine);

    const oldIndex = lavorazioniCategoria.findIndex((lav) => lav.id === active.id);
    const newIndex = lavorazioniCategoria.findIndex((lav) => lav.id === over.id);

    const riordinate = arrayMove(lavorazioniCategoria, oldIndex, newIndex).map(
      (lav, index) => ({
        ...lav,
        ordine: index + 1,
      })
    );

    const ordinePerId = new Map(riordinate.map((lav) => [lav.id, lav.ordine]));

    setLavorazioni((correnti) =>
      correnti.map((lav) => ({
        ...lav,
        ordine: ordinePerId.get(lav.id) ?? lav.ordine,
      }))
    );
  }

  function categoriePerMacro(macrocategoria: MacroCategoria): Categoria[] {
    return Array.from(
      new Map(
        lavorazioni
          .filter((lav) => lav.macrocategoria === macrocategoria)
          .map((lav) => [
            lav.categoria,
            {
              nome: lav.categoria,
              macrocategoria: lav.macrocategoria,
              ordine: lav.categoria_ordine ?? 0,
            },
          ])
      ).values()
    ).sort((a, b) => a.ordine - b.ordine || a.nome.localeCompare(b.nome));
  }

  function rinominaCategoria(vecchioNome: string, nuovoNome: string) {
    setLavorazioni((correnti) =>
      correnti.map((lav) =>
        lav.categoria === vecchioNome ? { ...lav, categoria: nuovoNome } : lav
      )
    );
  }

  function cambiaMacroCategoria(
    categoria: string,
    nuovaMacroCategoria: MacroCategoria
  ) {
    const massimoOrdineNuovaMacro = Math.max(
      0,
      ...lavorazioni
        .filter((lav) => lav.macrocategoria === nuovaMacroCategoria)
        .map((lav) => lav.categoria_ordine || 0)
    );

    setLavorazioni((correnti) =>
      correnti.map((lav) =>
        lav.categoria === categoria
          ? {
              ...lav,
              macrocategoria: nuovaMacroCategoria,
              categoria_ordine: massimoOrdineNuovaMacro + 1,
            }
          : lav
      )
    );
  }

  async function aggiungiCategoria(macrocategoria: MacroCategoria) {
    const nuovaCategoria = prompt("Nome nuova categoria:");

    if (!nuovaCategoria) return;

    const massimoOrdine = Math.max(
      0,
      ...lavorazioni
        .filter((lav) => lav.macrocategoria === macrocategoria)
        .map((lav) => lav.categoria_ordine || 0)
    );

    const nuova = {
      macrocategoria,
      categoria: nuovaCategoria,
      categoria_ordine: massimoOrdine + 1,
      nome: "Nuova lavorazione",
      descrizione: "",
      importo: 0,
      ordine: 1,
    };

    const { data, error } = await supabase
      .from("lavorazioni")
      .insert([nuova])
      .select();

    if (!error && data) {
      setLavorazioni([...lavorazioni, data[0]]);
    }
  }

  async function eliminaCategoria(categoria: string) {
    const conferma = confirm(
      `Vuoi eliminare l'intera categoria "${categoria}" e tutte le lavorazioni contenute?`
    );

    if (!conferma) return;

    const { error } = await supabase
      .from("lavorazioni")
      .delete()
      .eq("categoria", categoria);

    if (error) {
      alert("Errore durante l'eliminazione della categoria");
      return;
    }

    setLavorazioni(lavorazioni.filter((lav) => lav.categoria !== categoria));
  }

  async function salvaModifiche() {
    for (const lavorazione of lavorazioni) {
      await supabase
        .from("lavorazioni")
        .update({
          macrocategoria: lavorazione.macrocategoria,
          categoria: lavorazione.categoria,
          nome: lavorazione.nome,
          descrizione: lavorazione.descrizione,
          importo: lavorazione.importo,
          ordine: lavorazione.ordine,
          categoria_ordine: lavorazione.categoria_ordine,
        })
        .eq("id", lavorazione.id);
    }

    alert("Modifiche salvate correttamente");
    window.location.href = "/";
  }

  async function aggiungiLavorazione(categoria: string) {
    const categoriaBase = lavorazioni.find((lav) => lav.categoria === categoria);

    if (!categoriaBase) return;

    const nuova = {
      macrocategoria: categoriaBase.macrocategoria,
      categoria,
      categoria_ordine: categoriaBase.categoria_ordine || 0,
      nome: "Nuova lavorazione",
      descrizione: "",
      importo: 0,
      ordine: lavorazioni.filter((lav) => lav.categoria === categoria).length + 1,
    };

    const { data, error } = await supabase
      .from("lavorazioni")
      .insert([nuova])
      .select();

    if (!error && data) {
      setLavorazioni([...lavorazioni, data[0]]);
    }
  }

  async function eliminaLavorazione(id: string) {
    const conferma = confirm("Vuoi eliminare questa lavorazione?");

    if (!conferma) return;

    await supabase.from("lavorazioni").delete().eq("id", id);

    setLavorazioni(lavorazioni.filter((lav) => lav.id !== id));
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#2B2E65] text-white p-10">
        Caricamento...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#2B2E65] text-white p-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <p className="text-sm opacity-70">
              FIDEPA Preventivi - Versione 1.0
            </p>

            <h1 className="text-4xl font-bold mt-2">
              Gestione Lavorazioni
            </h1>
          </div>

          <div className="flex gap-4">
            <a
              href="/"
              className="px-5 py-3 rounded-xl border border-white text-white font-semibold hover:bg-white hover:text-[#2B2E65] transition cursor-pointer"
            >
              Home
            </a>

            <button
              onClick={salvaModifiche}
              className="px-5 py-3 rounded-xl bg-green-700 text-white font-semibold cursor-pointer"
            >
              Salva modifiche
            </button>
          </div>
        </div>

        <div className="space-y-8">
          {MACROCATEGORIE.map((macrocategoria) => {
            const categorie = categoriePerMacro(macrocategoria);

            return (
              <section
                key={macrocategoria}
                className="bg-white rounded-3xl p-8 text-[#2B2E65]"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-3xl font-bold">{macrocategoria}</h2>

                  <button
                    onClick={() => aggiungiCategoria(macrocategoria)}
                    className="px-5 py-3 rounded-xl bg-[#2B2E65] text-white font-semibold cursor-pointer"
                  >
                    Aggiungi categoria
                  </button>
                </div>

                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={lavorazioni
                      .filter((lav) => lav.macrocategoria === macrocategoria)
                      .map((lav) => lav.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {categorie.length === 0 && (
                      <p className="text-sm opacity-70">
                        Nessuna categoria presente in questa macrocategoria.
                      </p>
                    )}

                    {categorie.map((categoria) => (
                      <div
                        id={`categoria-${categoria.nome}`}
                        key={`categoria-${categoria.nome}`}
                        className="mb-12 last:mb-0"
                      >
                        <div className="flex items-center gap-3 mb-4">
                          <input
                            value={categoria.nome}
                            onChange={(e) =>
                              rinominaCategoria(categoria.nome, e.target.value)
                            }
                            className="text-2xl font-bold border rounded-lg p-2 flex-1"
                          />

                          <select
                            value={categoria.macrocategoria}
                            onChange={(e) =>
                              cambiaMacroCategoria(
                                categoria.nome,
                                e.target.value as MacroCategoria
                              )
                            }
                            className="border rounded-lg p-2"
                          >
                            {MACROCATEGORIE.map((macro) => (
                              <option key={macro} value={macro}>
                                {macro}
                              </option>
                            ))}
                          </select>

                          <button
                            onClick={() => aggiungiLavorazione(categoria.nome)}
                            className="px-4 py-2 rounded-lg bg-[#2B2E65] text-white font-bold cursor-pointer"
                            title="Aggiungi lavorazione"
                          >
                            +
                          </button>

                          <button
                            onClick={() => eliminaCategoria(categoria.nome)}
                            className="px-4 py-2 rounded-lg bg-red-700 text-white font-semibold cursor-pointer"
                          >
                            Elimina categoria
                          </button>
                        </div>

                        <div className="space-y-3">
                          {lavorazioni
                            .filter((lav) => lav.categoria === categoria.nome)
                            .sort((a, b) => a.ordine - b.ordine)
                            .map((lav) => (
                              <RigaLavorazione
                                key={lav.id}
                                lav={lav}
                                aggiornaCampo={aggiornaCampo}
                                eliminaLavorazione={eliminaLavorazione}
                              />
                            ))}
                        </div>
                      </div>
                    ))}
                  </SortableContext>
                </DndContext>
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}
