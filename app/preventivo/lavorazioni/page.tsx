"use client";

import { useEffect, useState } from "react";
import LayoutApp from "@/components/LayoutApp";
import ImportoInput from "@/components/ImportoInput";
import { supabase } from "@/lib/supabase";
import {
  finalizzaInputImporto,
  formattaNumeroItaliano,
  parseImporto,
} from "@/lib/importi";

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

type MacroCategoria =
  | "Progettazione"
  | "Realizzazione"
  | "Chiusura dei lavori";

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
  importo: number | string;
  ordine: number;
  categoria_ordine: number;
};

type Categoria = {
  nome: string;
  macrocategoria: MacroCategoria;
  ordine: number;
};

export default function LavorazioniPage() {
  const [lavorazioni, setLavorazioni] = useState<Lavorazione[]>([]);
  const [loading, setLoading] = useState(true);
  const [aperta, setAperta] = useState<string | null>(null);

  const [categoriaDaEliminare, setCategoriaDaEliminare] =
    useState<string | null>(null);

  const [lavorazioneDaEliminare, setLavorazioneDaEliminare] =
    useState<Lavorazione | null>(null);

  const [salvataggioOk, setSalvataggioOk] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor));

  const [salvataggioInCorso, setSalvataggioInCorso] = useState(false);

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
          descrizione: lav.descrizione || "",
          importo: finalizzaInputImporto(lav.importo),
          ordine: lav.ordine || 0,
          categoria_ordine: lav.categoria_ordine || 0,
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

  function spostaCategoria(categoria: string, direzione: "su" | "giu") {
    const lavCategoria = lavorazioni.find((lav) => lav.categoria === categoria);
    if (!lavCategoria) return;

    const categorie = categoriePerMacro(lavCategoria.macrocategoria);
    const indice = categorie.findIndex((cat) => cat.nome === categoria);

    if (indice === -1) return;
    if (direzione === "su" && indice === 0) return;
    if (direzione === "giu" && indice === categorie.length - 1) return;

    const nuovoIndice = direzione === "su" ? indice - 1 : indice + 1;

    const categoriaCorrente = categorie[indice];
    const categoriaScambio = categorie[nuovoIndice];

    setLavorazioni((correnti) =>
      correnti.map((lav) => {
        if (lav.categoria === categoriaCorrente.nome) {
          return { ...lav, categoria_ordine: categoriaScambio.ordine };
        }

        if (lav.categoria === categoriaScambio.nome) {
          return { ...lav, categoria_ordine: categoriaCorrente.ordine };
        }

        return lav;
      })
    );
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const activeLav = lavorazioni.find((lav) => lav.id === active.id);
    const overLav = lavorazioni.find((lav) => lav.id === over.id);

    if (!activeLav || !overLav) return;
    if (activeLav.categoria !== overLav.categoria) return;

    const lavorazioniCategoria = lavorazioni
      .filter((lav) => lav.categoria === activeLav.categoria)
      .sort((a, b) => a.ordine - b.ordine);

    const oldIndex = lavorazioniCategoria.findIndex(
      (lav) => lav.id === active.id
    );

    const newIndex = lavorazioniCategoria.findIndex(
      (lav) => lav.id === over.id
    );

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

  async function aggiungiCategoria(macrocategoria: MacroCategoria) {
    const nomeCategoria = prompt("Nome nuova categoria:");

    if (!nomeCategoria) return;

    const massimoOrdine = Math.max(
      0,
      ...lavorazioni
        .filter((lav) => lav.macrocategoria === macrocategoria)
        .map((lav) => lav.categoria_ordine || 0)
    );

    const nuova = {
      macrocategoria,
      categoria: nomeCategoria,
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
      setLavorazioni((correnti) => [
        ...correnti,
        { ...data[0], importo: finalizzaInputImporto(data[0].importo) },
      ]);
      setAperta(data[0].id);
    }
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
      ordine:
        lavorazioni.filter((lav) => lav.categoria === categoria).length + 1,
    };

    const { data, error } = await supabase
      .from("lavorazioni")
      .insert([nuova])
      .select();

    if (!error && data) {
      setLavorazioni((correnti) => [
        ...correnti,
        { ...data[0], importo: finalizzaInputImporto(data[0].importo) },
      ]);
      setAperta(data[0].id);
    }
  }

  async function eliminaCategoria() {
    if (!categoriaDaEliminare) return;

    const { error } = await supabase
      .from("lavorazioni")
      .delete()
      .eq("categoria", categoriaDaEliminare);

    if (error) {
      alert("Errore durante l'eliminazione della categoria");
      return;
    }

    setLavorazioni((correnti) =>
      correnti.filter((lav) => lav.categoria !== categoriaDaEliminare)
    );

    setCategoriaDaEliminare(null);
  }

  async function eliminaLavorazione() {
    if (!lavorazioneDaEliminare) return;

    const { error } = await supabase
      .from("lavorazioni")
      .delete()
      .eq("id", lavorazioneDaEliminare.id);

    if (error) {
      alert("Errore durante l'eliminazione della lavorazione");
      return;
    }

    setLavorazioni((correnti) =>
      correnti.filter((lav) => lav.id !== lavorazioneDaEliminare.id)
    );

    if (aperta === lavorazioneDaEliminare.id) {
      setAperta(null);
    }

    setLavorazioneDaEliminare(null);
  }

  async function salvaModifiche() {
    setSalvataggioInCorso(true);

    try {
      await Promise.all(
        lavorazioni.map((lavorazione) =>
          supabase
            .from("lavorazioni")
            .update({
              macrocategoria: lavorazione.macrocategoria,
              categoria: lavorazione.categoria,
              nome: lavorazione.nome,
              descrizione: lavorazione.descrizione,
              importo: parseImporto(lavorazione.importo),
              ordine: lavorazione.ordine,
              categoria_ordine: lavorazione.categoria_ordine,
            })
            .eq("id", lavorazione.id)
        )
      );

      setSalvataggioOk(true);
    } finally {
      setSalvataggioInCorso(false);
    }
  }

  function formatEuro(valore: number | string) {
    return formattaNumeroItaliano(valore);
  }

  if (loading) {
    return (
      <LayoutApp>
        <p className="text-center text-gray-500 py-10">
          Caricamento lavorazioni...
        </p>
      </LayoutApp>
    );
  }

  return (
    <LayoutApp>
      <div>
        <div className="flex justify-between items-center gap-4 mb-6">
          <div>
            <h2 className="page-title">Gestione lavorazioni</h2>

            <p className="text-[15px] text-[#D79D06] mt-1">
              Archivio delle lavorazioni utilizzate nei preventivi
            </p>
          </div>

          <button
            type="button"
            onClick={salvaModifiche}
            disabled={salvataggioInCorso}
            className="bg-[#64B445] text-white px-5 py-3 rounded-md text-sm font-medium disabled:opacity-50"
          >
            {salvataggioInCorso ? "Salvataggio..." : "Salva modifiche"}
          </button>
        </div>

        <div className="space-y-8">
          {MACROCATEGORIE.map((macrocategoria) => {
            const categorie = categoriePerMacro(macrocategoria);

            return (
              <section key={macrocategoria} className="space-y-5">
                <div className="flex justify-between items-center gap-4">
                  <h3 className="text-[22px] font-semibold text-[#2B2F5E]">
                    {macrocategoria}
                  </h3>

                  <button
                    type="button"
                    onClick={() => aggiungiCategoria(macrocategoria)}
                    className="bg-[#64B445] text-white w-12 h-12 rounded-md text-2xl font-light hover:bg-[#5AA03E] hover:scale-105 transition flex items-center justify-center shadow-sm cursor-pointer"
                    title="Aggiungi categoria"
                  >
                    +
                  </button>
                </div>

                <div className="border-b border-gray-300" />

                {categorie.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    Nessuna categoria presente in questa macrocategoria.
                  </p>
                ) : (
                  <div className="space-y-6">
                    {categorie.map((categoria) => {
                      const lavorazioniCategoria = lavorazioni
                        .filter((lav) => lav.categoria === categoria.nome)
                        .sort((a, b) => a.ordine - b.ordine);

                      return (
                        <div
                          key={`categoria-${categoria.macrocategoria}-${categoria.ordine}`}
                          className="bg-white border border-gray-200 shadow-sm overflow-hidden rounded-sm"
                        >
                          <div className="px-4 py-3 border-b border-gray-200 bg-[#FAFAFA]">
                            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                              <div className="grid grid-cols-1 xl:grid-cols-[1fr_260px] gap-3 flex-1">
                                <input
                                  value={categoria.nome}
                                  onChange={(e) =>
                                    rinominaCategoria(
                                      categoria.nome,
                                      e.target.value
                                    )
                                  }
                                  className="border border-gray-300 rounded-md px-4 py-3 bg-transparent outline-none transition focus:bg-white focus:border-[#64B445] focus:shadow-sm text-[17px] font-normal text-[#2B2F5E]"
                                />

                                <select
                                  value={categoria.macrocategoria}
                                  onChange={(e) =>
                                    cambiaMacroCategoria(
                                      categoria.nome,
                                      e.target.value as MacroCategoria
                                    )
                                  }
                                  className="border border-gray-300 rounded-md px-4 py-3 bg-transparent outline-none transition focus:bg-white focus:border-[#64B445] focus:shadow-sm text-sm text-[#2B2F5E] cursor-pointer"
                                >
                                  {MACROCATEGORIE.map((macro) => (
                                    <option key={macro} value={macro}>
                                      {macro}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    spostaCategoria(categoria.nome, "su")
                                  }
                                  className="border border-gray-300 text-[#2B2F5E] w-12 h-12 rounded-md text-lg font-medium bg-transparent hover:bg-[#e8e8e8] transition cursor-pointer"
                                  title="Sposta categoria sopra"
                                >
                                  ↑
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    spostaCategoria(categoria.nome, "giu")
                                  }
                                  className="border border-gray-300 text-[#2B2F5E] w-12 h-12 rounded-md text-lg font-medium bg-transparent hover:bg-[#e8e8e8] transition cursor-pointer"
                                  title="Sposta categoria sotto"
                                >
                                  ↓
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    aggiungiLavorazione(categoria.nome)
                                  }
                                  className="bg-[#64B445] text-white w-12 h-12 rounded-md text-2xl font-light hover:bg-[#5AA03E] hover:scale-105 transition flex items-center justify-center shadow-sm cursor-pointer"
                                  title="Aggiungi lavorazione"
                                >
                                  +
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    setCategoriaDaEliminare(categoria.nome)
                                  }
                                  className="bg-red-600 text-white w-12 h-12 rounded-md text-xl font-light hover:bg-red-700 hover:scale-105 transition flex items-center justify-center shadow-sm cursor-pointer"
                                  title="Elimina categoria"
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="p-4">
                            {lavorazioniCategoria.length === 0 ? (
                              <p className="text-sm text-gray-500">
                                Nessuna lavorazione presente.
                              </p>
                            ) : (
                              <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                              >
                                <SortableContext
                                  items={lavorazioniCategoria.map(
                                    (lav) => lav.id
                                  )}
                                  strategy={verticalListSortingStrategy}
                                >
                                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                                    {lavorazioniCategoria.map((lav) => (
                                      <LavorazioneCard
                                        key={lav.id}
                                        lav={lav}
                                        isOpen={aperta === lav.id}
                                        setAperta={setAperta}
                                        aggiornaCampo={aggiornaCampo}
                                        setLavorazioneDaEliminare={
                                          setLavorazioneDaEliminare
                                        }
                                        formatEuro={formatEuro}
                                      />
                                    ))}
                                  </div>
                                </SortableContext>
                              </DndContext>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>

      {categoriaDaEliminare && (
        <Popup
          title="Elimina categoria"
          onClose={() => setCategoriaDaEliminare(null)}
        >
          <p className="text-sm text-gray-600 mb-8">
            Vuoi eliminare l’intera categoria{" "}
            <span className="font-semibold text-[#2B2F5E]">
              {categoriaDaEliminare}
            </span>{" "}
            e tutte le lavorazioni contenute?
          </p>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setCategoriaDaEliminare(null)}
              className="border border-gray-300 text-[#2B2F5E] px-5 py-3 rounded-md text-sm font-medium bg-transparent hover:bg-[#e8e8e8] transition cursor-pointer"
            >
              Annulla
            </button>

            <button
              type="button"
              onClick={eliminaCategoria}
              className="bg-red-600 text-white px-5 py-3 rounded-md text-sm font-medium hover:bg-red-700 transition cursor-pointer"
            >
              Elimina
            </button>
          </div>
        </Popup>
      )}

      {lavorazioneDaEliminare && (
        <Popup
          title="Elimina lavorazione"
          onClose={() => setLavorazioneDaEliminare(null)}
        >
          <p className="text-sm text-gray-600 mb-8">
            Vuoi eliminare la lavorazione{" "}
            <span className="font-semibold text-[#2B2F5E]">
              {lavorazioneDaEliminare.nome}
            </span>
            ?
          </p>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setLavorazioneDaEliminare(null)}
              className="border border-gray-300 text-[#2B2F5E] px-5 py-3 rounded-md text-sm font-medium bg-transparent hover:bg-[#e8e8e8] transition cursor-pointer"
            >
              Annulla
            </button>

            <button
              type="button"
              onClick={eliminaLavorazione}
              className="bg-red-600 text-white px-5 py-3 rounded-md text-sm font-medium hover:bg-red-700 transition cursor-pointer"
            >
              Elimina
            </button>
          </div>
        </Popup>
      )}

      {salvataggioOk && (
        <Popup title="Modifiche salvate" onClose={() => setSalvataggioOk(false)}>
          <p className="text-sm text-gray-600 mb-8">
            Le modifiche sono state salvate correttamente.
          </p>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setSalvataggioOk(false)}
              className="bg-[#64B445] text-white px-5 py-3 rounded-md text-sm font-medium hover:bg-[#5AA03E] transition cursor-pointer"
            >
              OK
            </button>
          </div>
        </Popup>
      )}
    </LayoutApp>
  );
}

function LavorazioneCard({
  lav,
  isOpen,
  setAperta,
  aggiornaCampo,
  setLavorazioneDaEliminare,
  formatEuro,
}: {
  lav: Lavorazione;
  isOpen: boolean;
  setAperta: (id: string | null) => void;
  aggiornaCampo: (
    id: string,
    campo: keyof Lavorazione,
    valore: string | number
  ) => void;
  setLavorazioneDaEliminare: (lav: Lavorazione) => void;
  formatEuro: (value: number | string) => string;
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
      className="bg-white border border-gray-200 shadow-sm overflow-hidden rounded-sm"
    >
      <div className="flex">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="w-10 border-r border-gray-200 text-[#2B2F5E] bg-[#FAFAFA] hover:bg-[#e8e8e8] transition cursor-grab active:cursor-grabbing flex items-center justify-center"
          title="Trascina lavorazione"
        >
          ☰
        </button>

        <button
          type="button"
          onClick={() => setAperta(isOpen ? null : lav.id)}
          className="flex-1 flex justify-between items-center px-4 py-3 text-left hover:bg-[#e8e8e8] transition cursor-pointer"
        >
          <div className="leading-tight pr-4">
            <h4 className="text-[17px] font-normal text-[#2B2F5E]">
              {lav.nome || "-"}
            </h4>

            <p className="text-[15px] text-[#D79D06] mt-0">
              € {formatEuro(lav.importo)}
            </p>
          </div>

          <span
            className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
          >
            ⌃
          </span>
        </button>
      </div>

      {isOpen && (
        <div className="px-4 py-4 border-t border-gray-200 bg-[#FAFAFA]">
          <div className="grid grid-cols-1 gap-4">
            <Campo
              label="Nome lavorazione"
              value={lav.nome}
              onChange={(value) => aggiornaCampo(lav.id, "nome", value)}
            />

            <CampoImporto
              label="Importo"
              value={String(lav.importo)}
              onChange={(value) => aggiornaCampo(lav.id, "importo", value)}
            />

            <div>
              <label className="block text-sm font-medium mb-2 text-[#2B2F5E]">
                Descrizione
              </label>

              <textarea
                value={lav.descrizione}
                onChange={(e) =>
                  aggiornaCampo(lav.id, "descrizione", e.target.value)
                }
                rows={5}
                className="w-full border border-gray-300 rounded-md px-4 py-3 bg-transparent outline-none transition focus:bg-white focus:border-[#64B445] focus:shadow-sm text-[14px] text-[#2B2F5E] resize-none"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setLavorazioneDaEliminare(lav)}
                className="bg-red-600 text-white w-10 h-10 rounded-md text-xl font-light hover:bg-red-700 hover:scale-105 transition flex items-center justify-center shadow-sm cursor-pointer"
                title="Elimina lavorazione"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Campo({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2 text-[#2B2F5E]">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-md px-4 py-3 bg-transparent outline-none transition focus:bg-white focus:border-[#64B445] focus:shadow-sm text-[14px] text-[#2B2F5E]"
      />
    </div>
  );
}

function CampoImporto({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2 text-[#2B2F5E]">
        {label}
      </label>

      <ImportoInput value={value} onChange={onChange} />
    </div>
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
      <div className="bg-white rounded-md shadow-2xl w-full max-w-xl p-8">
        <div className="flex justify-between items-start mb-6">
          <h3 className="text-2xl font-semibold text-[#2B2F5E]">{title}</h3>

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
