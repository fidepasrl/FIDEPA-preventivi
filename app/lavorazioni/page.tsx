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

type Lavorazione = {
  id: string;
  categoria: string;
  nome: string;
  descrizione: string;
  importo: number;
  ordine: number;
  categoria_ordine: number;
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
      className="grid grid-cols-12 gap-3 border rounded-xl p-4 items-center bg-white"
    >
      <button
        {...attributes}
        {...listeners}
        className="col-span-1 cursor-grab active:cursor-grabbing rounded-lg border p-2 font-bold"
        title="Trascina"
      >
        ☰
      </button>

      <input
        value={lav.nome}
        onChange={(e) => aggiornaCampo(lav.id, "nome", e.target.value)}
        className="col-span-4 border rounded-lg p-2"
      />

      <input
        value={lav.descrizione}
        onChange={(e) => aggiornaCampo(lav.id, "descrizione", e.target.value)}
        className="col-span-5 border rounded-lg p-2"
      />

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
      .order("categoria_ordine")
      .order("categoria")
      .order("ordine");

    if (!error && data) {
      setLavorazioni(data);
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
    setTimeout(() => {
        document
            .getElementById(`categoria-${categoria}`)
            ?.scrollIntoView({
            behavior: "smooth",
            block: "center",
            });
        }, 100);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = lavorazioni.findIndex((lav) => lav.id === active.id);
    const newIndex = lavorazioni.findIndex((lav) => lav.id === over.id);

    const nuovaLista = arrayMove(lavorazioni, oldIndex, newIndex).map(
      (lav, index) => ({
        ...lav,
        ordine: index + 1,
      })
    );

    setLavorazioni(nuovaLista);
  }

  function spostaCategoria(categoria: string, direzione: "su" | "giu") {
    const categorie = Array.from(
      new Map(
        lavorazioni.map((lav) => [
          lav.categoria,
          {
            nome: lav.categoria,
            ordine: lav.categoria_ordine ?? 0,
          },
        ])
      ).values()
    ).sort((a, b) => a.ordine - b.ordine || a.nome.localeCompare(b.nome));

    const index = categorie.findIndex((cat) => cat.nome === categoria);
    const nuovoIndex = direzione === "su" ? index - 1 : index + 1;

    if (nuovoIndex < 0 || nuovoIndex >= categorie.length) return;

    const categorieRiordinate = [...categorie];

    const temp = categorieRiordinate[index];

    categorieRiordinate[index] = categorieRiordinate[nuovoIndex];
    categorieRiordinate[nuovoIndex] = temp;

    const ordinePerCategoria = new Map(
      categorieRiordinate.map((cat, idx) => [cat.nome, idx + 1])
    );

    setLavorazioni((correnti) =>
      correnti.map((lav) => ({
        ...lav,
        categoria_ordine: ordinePerCategoria.get(lav.categoria) || 999,
      }))
    );
  }

  async function aggiungiCategoria() {
    const nuovaCategoria = prompt("Nome nuova categoria:");

    if (!nuovaCategoria) return;

    const massimoOrdine = Math.max(
      0,
      ...lavorazioni.map((lav) => lav.categoria_ordine || 0)
    );

    const nuova = {
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

    setLavorazioni(
      lavorazioni.filter((lav) => lav.categoria !== categoria)
    );
  }

  function rinominaCategoria(vecchioNome: string, nuovoNome: string) {
    setLavorazioni((correnti) =>
      correnti.map((lav) =>
        lav.categoria === vecchioNome
          ? { ...lav, categoria: nuovoNome }
          : lav
      )
    );
  }

  async function salvaModifiche() {
    for (const lavorazione of lavorazioni) {
      await supabase
        .from("lavorazioni")
        .update({
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
    const ordineCategoria =
      lavorazioni.find((lav) => lav.categoria === categoria)
        ?.categoria_ordine || 0;

    const nuova = {
      categoria,
      categoria_ordine: ordineCategoria,
      nome: "Nuova lavorazione",
      descrizione: "",
      importo: 0,
      ordine:
        lavorazioni.filter((lav) => lav.categoria === categoria).length + 1,
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

  const categorie = Array.from(
    new Map(
      lavorazioni.map((lav) => [
        lav.categoria,
        {
          nome: lav.categoria,
          ordine: lav.categoria_ordine ?? 0,
        },
      ])
    ).values()
  ).sort((a, b) => a.ordine - b.ordine || a.nome.localeCompare(b.nome));

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
              onClick={aggiungiCategoria}
              className="px-5 py-3 rounded-xl bg-white text-[#2B2E65] font-semibold cursor-pointer"
            >
              Aggiungi categoria
            </button>

            <button
              onClick={salvaModifiche}
              className="px-5 py-3 rounded-xl bg-green-700 text-white font-semibold cursor-pointer"
            >
              Salva modifiche
            </button>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-8 text-[#2B2E65]">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={lavorazioni.map((lav) => lav.id)}
              strategy={verticalListSortingStrategy}
            >
              {categorie.map((categoria, index) => (
                    <div
                        id={`categoria-${categoria.nome}`}
                        key={`categoria-${categoria.nome}`}
                        className="mb-12"
                    >
                  <div className="flex items-center gap-3 mb-4">
                    <button
                      onClick={() => spostaCategoria(categoria.nome, "su")}
                      disabled={index === 0}
                      className="px-3 py-2 rounded-lg border disabled:opacity-30 cursor-pointer"
                    >
                      ↑
                    </button>

                    <button
                      onClick={() => spostaCategoria(categoria.nome, "giu")}
                      disabled={index === categorie.length - 1}
                      className="px-3 py-2 rounded-lg border disabled:opacity-30 cursor-pointer"
                    >
                      ↓
                    </button>

                    <input
                      value={categoria.nome}
                      onChange={(e) =>
                        rinominaCategoria(categoria.nome, e.target.value)
                      }
                      className="text-2xl font-bold border rounded-lg p-2 flex-1"
                    />

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
        </div>
      </div>
    </main>
  );
}