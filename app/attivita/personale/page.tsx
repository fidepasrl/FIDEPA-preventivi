"use client";

import { useEffect, useState } from "react";
import AppIcon, { type AppIconName } from "@/components/AppIcon";
import LayoutApp from "@/components/LayoutApp";
import {
  inizialiPersona,
  normalizzaRuoloOrganigramma,
  type RuoloOrganigramma,
} from "@/lib/personaleOrganigramma";
import { supabase } from "@/lib/supabase";

type Persona = {
  id: string;
  nome: string;
  email: string | null;
  colore: string;
  attivo: boolean;
  ruolo_organigramma: RuoloOrganigramma;
  titolo_ruolo: string | null;
  descrizione: string | null;
  foto_url: string | null;
  foto_path: string | null;
};

type AttivitaOrganizzativa = {
  id: string;
  persona_id: string;
  titolo: string;
  tipo: "compito" | "responsabilita";
  completata: boolean;
  created_at: string;
};

type FormPersona = {
  nome: string;
  email: string;
  colore: string;
  attivo: boolean;
  ruolo_organigramma: RuoloOrganigramma;
  titolo_ruolo: string;
  descrizione: string;
};

const GRUPPI: {
  ruolo: RuoloOrganigramma;
  titolo: string;
  descrizione: string;
  icona: AppIconName;
  colore: string;
  sfondo: string;
}[] = [
  {
    ruolo: "amministratore",
    titolo: "Amministratori",
    descrizione: "Direzione e responsabilità societaria",
    icona: "userAdmin",
    colore: "#2B2F5E",
    sfondo: "#EEF0F8",
  },
  {
    ruolo: "project_manager",
    titolo: "Project Manager",
    descrizione: "Coordinamento di commesse e gruppi di lavoro",
    icona: "briefcase",
    colore: "#2D80B3",
    sfondo: "#EAF3FA",
  },
  {
    ruolo: "collaboratore",
    titolo: "Collaboratori",
    descrizione: "Supporto tecnico, operativo e organizzativo",
    icona: "users",
    colore: "#4A8D34",
    sfondo: "#EFF8EB",
  },
];

function nuovoForm(ruolo: RuoloOrganigramma): FormPersona {
  return {
    nome: "",
    email: "",
    colore: "#5E9AD3",
    attivo: true,
    ruolo_organigramma: ruolo,
    titolo_ruolo: "",
    descrizione: "",
  };
}

function emailValida(value: string) {
  return !value.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function normalizzaPersona(item: Record<string, unknown>): Persona {
  return {
    id: String(item.id),
    nome: typeof item.nome === "string" ? item.nome : "",
    email: typeof item.email === "string" ? item.email : null,
    colore:
      typeof item.colore === "string" && item.colore
        ? item.colore
        : "#5E9AD3",
    attivo: item.attivo !== false,
    ruolo_organigramma: normalizzaRuoloOrganigramma(
      typeof item.ruolo_organigramma === "string"
        ? item.ruolo_organigramma
        : null
    ),
    titolo_ruolo:
      typeof item.titolo_ruolo === "string" ? item.titolo_ruolo : null,
    descrizione:
      typeof item.descrizione === "string" ? item.descrizione : null,
    foto_url: typeof item.foto_url === "string" ? item.foto_url : null,
    foto_path: typeof item.foto_path === "string" ? item.foto_path : null,
  };
}

export default function PersonalePage() {
  const [personale, setPersonale] = useState<Persona[]>([]);
  const [attivitaOrganizzative, setAttivitaOrganizzative] = useState<
    AttivitaOrganizzativa[]
  >([]);
  const [caricamento, setCaricamento] = useState(true);
  const [errore, setErrore] = useState("");
  const [avvisoConfigurazione, setAvvisoConfigurazione] = useState("");
  const [conferma, setConferma] = useState("");
  const [personaInModifica, setPersonaInModifica] = useState<Persona | null>(
    null
  );
  const [modalePersonaAperta, setModalePersonaAperta] = useState(false);
  const [personaDaEliminare, setPersonaDaEliminare] =
    useState<Persona | null>(null);
  const [form, setForm] = useState<FormPersona>(() =>
    nuovoForm("collaboratore")
  );
  const [foto, setFoto] = useState<File | null>(null);
  const [salvataggioPersona, setSalvataggioPersona] = useState(false);
  const [nuoveAttivitaPersona, setNuoveAttivitaPersona] = useState<
    Record<string, string>
  >({});
  const [personaTrascinata, setPersonaTrascinata] = useState<string | null>(
    null
  );

  useEffect(() => {
    caricaDati();
  }, []);

  async function caricaDati() {
    setCaricamento(true);
    setErrore("");

    const [personaleRes, organizzativeRes] = await Promise.all([
      supabase.from("personale").select("*").order("nome"),
      supabase
        .from("personale_attivita_organizzative")
        .select("id, persona_id, titolo, tipo, completata, created_at")
        .order("completata")
        .order("created_at", { ascending: false }),
    ]);

    if (personaleRes.error) {
      console.error(personaleRes.error);
      setErrore("Impossibile caricare il personale.");
      setCaricamento(false);
      return;
    }

    setPersonale(
      ((personaleRes.data || []) as Record<string, unknown>[]).map(
        normalizzaPersona
      )
    );

    if (organizzativeRes.error) {
      console.error(organizzativeRes.error);
      setAttivitaOrganizzative([]);
      setAvvisoConfigurazione(
        "I compiti organizzativi e le foto richiedono l’applicazione della nuova configurazione Supabase."
      );
    } else {
      setAttivitaOrganizzative(
        (organizzativeRes.data || []) as AttivitaOrganizzativa[]
      );
      setAvvisoConfigurazione("");
    }

    setCaricamento(false);
  }

  function apriNuovaPersona(ruolo: RuoloOrganigramma) {
    setPersonaInModifica(null);
    setForm(nuovoForm(ruolo));
    setFoto(null);
    setErrore("");
    setModalePersonaAperta(true);
  }

  function apriModificaPersona(persona: Persona) {
    setPersonaInModifica(persona);
    setForm({
      nome: persona.nome,
      email: persona.email || "",
      colore: persona.colore,
      attivo: persona.attivo,
      ruolo_organigramma: persona.ruolo_organigramma,
      titolo_ruolo: persona.titolo_ruolo || "",
      descrizione: persona.descrizione || "",
    });
    setFoto(null);
    setErrore("");
    setModalePersonaAperta(true);
  }

  async function caricaFoto(persona: Persona, file: File) {
    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
      throw new Error("La foto deve essere JPG, PNG oppure WEBP.");
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error("La foto non può superare 5 MB.");
    }

    const estensione = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const percorso = `${persona.id}/${crypto.randomUUID()}.${estensione}`;
    const { error: erroreUpload } = await supabase.storage
      .from("personale-foto")
      .upload(percorso, file, { upsert: false });

    if (erroreUpload) throw erroreUpload;

    const { data } = supabase.storage
      .from("personale-foto")
      .getPublicUrl(percorso);
    const { error: erroreAggiornamento } = await supabase
      .from("personale")
      .update({ foto_url: data.publicUrl, foto_path: percorso })
      .eq("id", persona.id);

    if (erroreAggiornamento) {
      await supabase.storage.from("personale-foto").remove([percorso]);
      throw erroreAggiornamento;
    }

    if (persona.foto_path) {
      await supabase.storage
        .from("personale-foto")
        .remove([persona.foto_path]);
    }

    return { ...persona, foto_url: data.publicUrl, foto_path: percorso };
  }

  async function salvaPersona() {
    setErrore("");
    setConferma("");

    if (!form.nome.trim()) {
      setErrore("Inserisci il nome della persona.");
      return;
    }

    if (!emailValida(form.email)) {
      setErrore("Inserisci un indirizzo email valido.");
      return;
    }

    setSalvataggioPersona(true);
    const dati = {
      nome: form.nome.trim(),
      email: form.email.trim().toLowerCase() || null,
      colore: form.colore,
      attivo: form.attivo,
      ruolo_organigramma: form.ruolo_organigramma,
      titolo_ruolo: form.titolo_ruolo.trim() || null,
      descrizione: form.descrizione.trim() || null,
    };
    const richiesta = personaInModifica
      ? supabase.from("personale").update(dati).eq("id", personaInModifica.id)
      : supabase.from("personale").insert(dati);
    const { data, error } = await richiesta.select("*").single();

    if (error || !data) {
      console.error(error);
      setErrore(
        "Errore durante il salvataggio. Verifica che la configurazione dell’organigramma sia stata applicata."
      );
      setSalvataggioPersona(false);
      return;
    }

    let personaSalvata = normalizzaPersona(data as Record<string, unknown>);

    if (foto) {
      try {
        personaSalvata = await caricaFoto(personaSalvata, foto);
      } catch (erroreFoto) {
        console.error(erroreFoto);
        setErrore(
          erroreFoto instanceof Error
            ? erroreFoto.message
            : "Persona salvata, ma caricamento della foto non riuscito."
        );
        setSalvataggioPersona(false);
        await caricaDati();
        return;
      }
    }

    setPersonale((correnti) =>
      [...correnti.filter((item) => item.id !== personaSalvata.id), personaSalvata].sort(
        (a, b) => a.nome.localeCompare(b.nome, "it-IT")
      )
    );
    setModalePersonaAperta(false);
    setPersonaInModifica(null);
    setFoto(null);
    setSalvataggioPersona(false);
    setConferma(
      personaInModifica ? "Scheda persona aggiornata." : "Persona aggiunta all’organigramma."
    );
  }

  async function cambiaStatoPersona(persona: Persona) {
    const nuovoStato = !persona.attivo;
    const { error } = await supabase
      .from("personale")
      .update({ attivo: nuovoStato })
      .eq("id", persona.id);

    if (error) {
      setErrore("Impossibile aggiornare lo stato della persona.");
      return;
    }

    setPersonale((correnti) =>
      correnti.map((item) =>
        item.id === persona.id ? { ...item, attivo: nuovoStato } : item
      )
    );
  }

  async function spostaPersona(
    personaId: string,
    ruolo: RuoloOrganigramma
  ) {
    const persona = personale.find((item) => item.id === personaId);
    setPersonaTrascinata(null);
    if (!persona || persona.ruolo_organigramma === ruolo) return;

    const { error } = await supabase
      .from("personale")
      .update({ ruolo_organigramma: ruolo })
      .eq("id", personaId);

    if (error) {
      setErrore(
        "Impossibile spostare la persona. Verifica la configurazione dell’organigramma."
      );
      return;
    }

    setPersonale((correnti) =>
      correnti.map((item) =>
        item.id === personaId ? { ...item, ruolo_organigramma: ruolo } : item
      )
    );
  }

  async function eliminaPersona() {
    if (!personaDaEliminare) return;

    const { error } = await supabase
      .from("personale")
      .delete()
      .eq("id", personaDaEliminare.id);

    if (error) {
      console.error(error);
      setErrore(
        "La persona non può essere eliminata perché è collegata ad altri dati. Puoi disattivarla mantenendo lo storico."
      );
      setPersonaDaEliminare(null);
      return;
    }

    if (personaDaEliminare.foto_path) {
      await supabase.storage
        .from("personale-foto")
        .remove([personaDaEliminare.foto_path]);
    }

    setPersonale((correnti) =>
      correnti.filter((item) => item.id !== personaDaEliminare.id)
    );
    setPersonaDaEliminare(null);
    setConferma("Persona eliminata dall’organigramma.");
  }

  async function aggiungiAttivita(personaId: string, titolo: string) {
    const valore = titolo.trim();
    if (!valore) return;

    setErrore("");
    const { data, error } = await supabase
      .from("personale_attivita_organizzative")
      .insert({ persona_id: personaId, titolo: valore, tipo: "compito" })
      .select("id, persona_id, titolo, tipo, completata, created_at")
      .single();

    if (error || !data) {
      console.error(error);
      setErrore(
        "Impossibile aggiungere il compito. Verifica la configurazione Supabase."
      );
      return;
    }

    setAttivitaOrganizzative((correnti) => [
      data as AttivitaOrganizzativa,
      ...correnti,
    ]);

    setNuoveAttivitaPersona((correnti) => ({
      ...correnti,
      [personaId]: "",
    }));
  }

  async function aggiornaAttivita(
    attivita: AttivitaOrganizzativa,
    valori: Pick<AttivitaOrganizzativa, "completata">
  ) {
    const { error } = await supabase
      .from("personale_attivita_organizzative")
      .update(valori)
      .eq("id", attivita.id);

    if (error) {
      setErrore("Impossibile aggiornare il compito.");
      return;
    }

    setAttivitaOrganizzative((correnti) =>
      correnti.map((item) =>
        item.id === attivita.id ? { ...item, ...valori } : item
      )
    );
  }

  async function eliminaAttivita(attivitaId: string) {
    const { error } = await supabase
      .from("personale_attivita_organizzative")
      .delete()
      .eq("id", attivitaId);

    if (error) {
      setErrore("Impossibile eliminare il compito.");
      return;
    }

    setAttivitaOrganizzative((correnti) =>
      correnti.filter((item) => item.id !== attivitaId)
    );
  }

  return (
    <LayoutApp>
      <div>
        <div className="mb-7 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <h1 className="page-title">Organigramma personale</h1>
            <p className="mt-1 text-[15px] text-[#D79D06]">
              Ruoli, responsabilità e compiti dell’organizzazione FIDEPA
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex flex-wrap gap-2">
              <Stat label="Persone" value={personale.length} />
              <Stat
                label="Attive"
                value={personale.filter((item) => item.attivo).length}
                green
              />
            </div>
            <button
              type="button"
              onClick={() => apriNuovaPersona("collaboratore")}
              className="ml-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#64B445] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#58A13D]"
            >
              <AppIcon name="plus" size={17} />
              Inserisci persona
            </button>
          </div>
        </div>

        {errore ? (
          <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errore}
          </div>
        ) : null}
        {avvisoConfigurazione ? (
          <div className="mb-5 rounded-xl border border-[#D79D06]/30 bg-[#FFF8E6] px-4 py-3 text-sm text-[#8A6500]">
            {avvisoConfigurazione}
          </div>
        ) : null}
        {conferma ? (
          <div role="status" className="mb-5 flex items-center gap-2 rounded-xl border border-[#64B445]/25 bg-[#64B445]/10 px-4 py-3 text-sm font-medium text-[#3F7C2C]">
            <AppIcon name="checkSquare" size={17} />
            {conferma}
          </div>
        ) : null}

        {caricamento ? (
          <div className="flex min-h-[45vh] items-center justify-center gap-3 text-sm text-gray-500">
            <AppIcon name="refresh" size={18} className="animate-spin text-[#5E9AD3]" />
            Caricamento organigramma...
          </div>
        ) : (
          <>
            <section className="space-y-5">
              {GRUPPI.map((gruppo, indice) => {
                const personeGruppo = personale.filter(
                  (persona) => persona.ruolo_organigramma === gruppo.ruolo
                );

                return (
                  <div key={gruppo.ruolo} className="relative">
                    {indice > 0 ? (
                      <div className="mx-auto h-5 w-px bg-[#2B2F5E]/15" />
                    ) : null}
                    <div
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => {
                        if (personaTrascinata) {
                          spostaPersona(personaTrascinata, gruppo.ruolo);
                        }
                      }}
                      className="rounded-3xl border border-white bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)] sm:p-6"
                    >
                      <div className="mb-5 flex items-center gap-3">
                        <div className="flex items-center gap-3">
                          <span
                            className="flex h-11 w-11 items-center justify-center rounded-2xl"
                            style={{ color: gruppo.colore, backgroundColor: gruppo.sfondo }}
                          >
                            <AppIcon name={gruppo.icona} size={21} />
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <h2 className="text-lg font-bold uppercase tracking-[0.08em] text-[#2B2F5E]">
                                {gruppo.titolo}
                              </h2>
                              <span className="rounded-full bg-[#F2F2F2] px-2 py-0.5 text-[11px] font-bold text-[#2B2F5E]/55">
                                {personeGruppo.length}
                              </span>
                            </div>
                            <p className="mt-0.5 text-xs text-[#2B2F5E]/50">
                              {gruppo.descrizione}
                            </p>
                          </div>
                        </div>
                      </div>

                      {personeGruppo.length === 0 ? (
                        <div className="rounded-2xl border-2 border-dashed border-[#2B2F5E]/12 px-4 py-8 text-center text-sm text-[#2B2F5E]/40">
                          Nessuna persona in questo livello.
                        </div>
                      ) : (
                        <div className="grid items-start gap-4 xl:grid-cols-2">
                          {personeGruppo.map((persona) => (
                            <PersonaCard
                              key={persona.id}
                              persona={persona}
                              onEdit={() => apriModificaPersona(persona)}
                              onDelete={() => setPersonaDaEliminare(persona)}
                              onToggle={() => cambiaStatoPersona(persona)}
                              onDragStart={() => setPersonaTrascinata(persona.id)}
                              onDragEnd={() => setPersonaTrascinata(null)}
                              attivita={attivitaOrganizzative.filter(
                                (item) => item.persona_id === persona.id
                              )}
                              nuovoTitolo={nuoveAttivitaPersona[persona.id] || ""}
                              onChangeNuovo={(value) =>
                                setNuoveAttivitaPersona((correnti) => ({
                                  ...correnti,
                                  [persona.id]: value,
                                }))
                              }
                              onAdd={() =>
                                aggiungiAttivita(
                                  persona.id,
                                  nuoveAttivitaPersona[persona.id] || ""
                                )
                              }
                              onToggleCompito={(attivita) =>
                                aggiornaAttivita(attivita, {
                                  completata: !attivita.completata,
                                })
                              }
                              onDeleteCompito={eliminaAttivita}
                            />
                          ))}
                        </div>
                      )}

                      <p className="mt-4 text-center text-[10px] text-[#2B2F5E]/35">
                        Trascina una persona in un altro livello per cambiarne il ruolo
                      </p>
                    </div>
                  </div>
                );
              })}
            </section>

          </>
        )}
      </div>

      {modalePersonaAperta ? (
        <PersonaModal
          persona={personaInModifica}
          form={form}
          foto={foto}
          salvataggio={salvataggioPersona}
          onChange={setForm}
          onFoto={setFoto}
          onClose={() => {
            setModalePersonaAperta(false);
            setPersonaInModifica(null);
            setFoto(null);
          }}
          onSave={salvaPersona}
        />
      ) : null}

      {personaDaEliminare ? (
        <ConfermaEliminazione
          persona={personaDaEliminare}
          onClose={() => setPersonaDaEliminare(null)}
          onConfirm={eliminaPersona}
        />
      ) : null}
    </LayoutApp>
  );
}

function Stat({
  label,
  value,
  green = false,
}: {
  label: string;
  value: number;
  green?: boolean;
}) {
  return (
    <span className={`rounded-full px-3 py-1.5 font-semibold ${green ? "bg-[#64B445]/12 text-[#4A8D34]" : "bg-white text-[#2B2F5E] shadow-sm"}`}>
      {value} {label}
    </span>
  );
}

function Avatar({ persona, size = "large" }: { persona: Persona; size?: "small" | "large" }) {
  const dimensione = size === "large" ? "h-16 w-16 text-lg" : "h-11 w-11 text-sm";
  return (
    <span
      role={persona.foto_url ? "img" : undefined}
      aria-label={persona.foto_url ? `Foto di ${persona.nome}` : undefined}
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-2xl font-bold text-white shadow-sm ${dimensione}`}
      style={{
        backgroundColor: persona.colore,
        backgroundImage: persona.foto_url ? `url("${persona.foto_url}")` : undefined,
        backgroundPosition: "center",
        backgroundSize: "cover",
      }}
    >
      {persona.foto_url ? null : inizialiPersona(persona.nome)}
    </span>
  );
}

function PersonaCard({
  persona,
  attivita,
  nuovoTitolo,
  onEdit,
  onDelete,
  onToggle,
  onDragStart,
  onDragEnd,
  onChangeNuovo,
  onAdd,
  onToggleCompito,
  onDeleteCompito,
}: {
  persona: Persona;
  attivita: AttivitaOrganizzativa[];
  nuovoTitolo: string;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onChangeNuovo: (value: string) => void;
  onAdd: () => void;
  onToggleCompito: (attivita: AttivitaOrganizzativa) => void;
  onDeleteCompito: (id: string) => void;
}) {
  return (
    <article
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`group relative overflow-hidden rounded-2xl border border-[#2B2F5E]/8 bg-[#FAFBFC] p-4 transition hover:shadow-md ${persona.attivo ? "" : "opacity-60"}`}
    >
      <span className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: persona.colore }} />
      <div className="flex items-start gap-3">
        <Avatar persona={persona} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate font-semibold text-[#2B2F5E]">{persona.nome}</h3>
              <p className="mt-0.5 truncate text-[10px] font-bold uppercase tracking-[0.08em] text-[#2D80B3]">
                {persona.titolo_ruolo || "Funzione da definire"}
              </p>
              <p className="mt-1 truncate text-xs text-[#2B2F5E]/50">{persona.email || "Email non inserita"}</p>
            </div>
            <div className="flex shrink-0 gap-1">
              <button type="button" onClick={onEdit} className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-[#EAF3FA] hover:text-[#2D80B3]" title="Modifica persona" aria-label={`Modifica ${persona.nome}`}><AppIcon name="settings" size={15} /></button>
              <button type="button" onClick={onDelete} className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600" title="Elimina persona" aria-label={`Elimina ${persona.nome}`}><AppIcon name="trash" size={15} /></button>
            </div>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-[#2B2F5E]/60">{persona.descrizione || "Nessuna descrizione inserita."}</p>
          <button type="button" onClick={onToggle} className={`mt-3 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${persona.attivo ? "bg-[#64B445]/12 text-[#4A8D34]" : "bg-gray-200 text-gray-500"}`}>
            {persona.attivo ? "Attivo" : "Disattivato"}
          </button>
        </div>
      </div>

      <div className="mt-4 border-t border-[#2B2F5E]/8 pt-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#2D80B3]">
            Compiti e responsabilità
          </p>
          <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-[#2B2F5E]/50 shadow-sm">
            {attivita.length}
          </span>
        </div>

        <div className="flex gap-2">
          <input
            value={nuovoTitolo}
            onChange={(event) => onChangeNuovo(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") onAdd();
            }}
            placeholder={`Nuovo compito per ${persona.nome}`}
            className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-[#2B2F5E] outline-none focus:border-[#5E9AD3]"
          />
          <button
            type="button"
            onClick={onAdd}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#5E9AD3] text-white hover:bg-[#2D80B3]"
            aria-label={`Aggiungi compito per ${persona.nome}`}
          >
            <AppIcon name="plus" size={17} />
          </button>
        </div>

        <div className="mt-3 space-y-2">
          {attivita.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#2B2F5E]/10 bg-white/60 px-3 py-4 text-center text-xs text-gray-400">
              Nessun compito inserito.
            </p>
          ) : (
            attivita.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 shadow-[0_2px_8px_rgba(15,23,42,0.03)]"
              >
                {item.tipo === "responsabilita" ? (
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#2B2F5E] text-white">
                      <AppIcon name="briefcase" size={12} />
                    </span>
                    <span className="text-sm leading-relaxed text-[#2B2F5E]">
                      {item.titolo}
                    </span>
                  </div>
                ) : (
                  <AttivitaCheckbox
                    attivita={item}
                    onToggle={() => onToggleCompito(item)}
                  />
                )}
                {item.tipo === "responsabilita" ? (
                  <span className="hidden rounded-full bg-[#2B2F5E]/8 px-2 py-0.5 text-[9px] font-bold uppercase text-[#2B2F5E] sm:inline-flex">
                    Responsabilità
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => onDeleteCompito(item.id)}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-gray-350 hover:bg-red-50 hover:text-red-600"
                  aria-label={`Elimina ${item.titolo}`}
                >
                  <AppIcon name="trash" size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </article>
  );
}

function AttivitaCheckbox({ attivita, onToggle }: { attivita: AttivitaOrganizzativa; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} className="flex min-w-0 flex-1 items-center gap-3 text-left">
      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${attivita.completata ? "border-[#64B445] bg-[#64B445] text-white" : "border-[#2B2F5E]/20 bg-white text-transparent"}`}>
        <AppIcon name="checkSquare" size={13} />
      </span>
      <span className={`min-w-0 text-sm ${attivita.completata ? "text-gray-400 line-through" : "text-[#2B2F5E]"}`}>{attivita.titolo}</span>
    </button>
  );
}

function PersonaModal({ persona, form, foto, salvataggio, onChange, onFoto, onClose, onSave }: { persona: Persona | null; form: FormPersona; foto: File | null; salvataggio: boolean; onChange: (form: FormPersona) => void; onFoto: (file: File | null) => void; onClose: () => void; onSave: () => void }) {
  return (
    <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-[#2B2F5E]/45 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-[0_24px_70px_rgba(43,47,94,0.24)] sm:p-8">
        <div className="mb-6 flex items-start justify-between gap-4"><div><h2 className="text-2xl font-semibold text-[#2B2F5E]">{persona ? "Modifica persona" : "Nuova persona"}</h2><p className="mt-1 text-sm text-gray-500">Profilo, ruolo e presenza nell’organigramma</p></div><button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 hover:bg-[#F2F2F2] hover:text-[#2B2F5E]" aria-label="Chiudi"><AppIcon name="x" size={18} /></button></div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Nome e cognome"><input value={form.nome} onChange={(event) => onChange({ ...form, nome: event.target.value })} className={inputClass} placeholder="Nome della persona" /></Field>
          <Field label="Email"><input type="email" value={form.email} onChange={(event) => onChange({ ...form, email: event.target.value })} className={inputClass} placeholder="nome@fidepa.it" /></Field>
          <Field label="Ruolo nell’organigramma"><select value={form.ruolo_organigramma} onChange={(event) => onChange({ ...form, ruolo_organigramma: event.target.value as RuoloOrganigramma })} className={inputClass}><option value="amministratore">Amministratore</option><option value="project_manager">Project Manager</option><option value="collaboratore">Collaboratore</option></select></Field>
          <Field label="Colore personale"><div className="flex items-center gap-3 rounded-xl border border-gray-200 px-3 py-2"><input type="color" value={form.colore} onChange={(event) => onChange({ ...form, colore: event.target.value })} className="h-9 w-12 cursor-pointer border-0 bg-transparent" /><span className="text-sm font-medium text-[#2B2F5E]">{form.colore.toUpperCase()}</span></div></Field>
          <div className="sm:col-span-2"><Field label="Funzione aziendale"><input value={form.titolo_ruolo} onChange={(event) => onChange({ ...form, titolo_ruolo: event.target.value })} className={inputClass} placeholder="Es. BUSINESS & COMMESSE" /></Field></div>
          <div className="sm:col-span-2"><Field label="Descrizione"><textarea value={form.descrizione} onChange={(event) => onChange({ ...form, descrizione: event.target.value })} rows={4} className={`${inputClass} resize-y`} placeholder="Ruolo, competenze e responsabilità principali..." /></Field></div>
          <div className="sm:col-span-2"><Field label="Foto profilo"><label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-[#5E9AD3]/30 bg-[#EAF3FA]/35 px-4 py-4 text-sm text-[#2D80B3] hover:border-[#5E9AD3]"><AppIcon name="user" size={20} /><span className="min-w-0 flex-1 truncate">{foto?.name || (persona?.foto_url ? "Sostituisci la foto attuale" : "Scegli una foto JPG, PNG o WEBP (max 5 MB)")}</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => onFoto(event.target.files?.[0] || null)} className="sr-only" /></label></Field></div>
          <div className="sm:col-span-2"><label className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-[#F8F9FB] px-4 py-3"><span><span className="block text-sm font-semibold text-[#2B2F5E]">Persona attiva</span><span className="text-xs text-gray-500">Le persone disattivate restano nello storico.</span></span><input type="checkbox" checked={form.attivo} onChange={(event) => onChange({ ...form, attivo: event.target.checked })} className="h-5 w-5 accent-[#64B445]" /></label></div>
        </div>
        <div className="mt-7 flex justify-end gap-3"><button type="button" onClick={onClose} className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-medium text-[#2B2F5E] hover:bg-[#F2F2F2]">Annulla</button><button type="button" onClick={onSave} disabled={salvataggio} className="inline-flex items-center gap-2 rounded-xl bg-[#64B445] px-5 py-3 text-sm font-semibold text-white hover:bg-[#58A13D] disabled:opacity-50">{salvataggio ? <AppIcon name="refresh" size={16} className="animate-spin" /> : <AppIcon name="checkSquare" size={16} />}{salvataggio ? "Salvataggio..." : "Salva persona"}</button></div>
      </div>
    </div>
  );
}

const inputClass = "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-[#2B2F5E] outline-none transition focus:border-[#5E9AD3] focus:ring-4 focus:ring-[#5E9AD3]/10";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-sm font-medium text-[#2B2F5E]">{label}</span>{children}</label>;
}

function ConfermaEliminazione({ persona, onClose, onConfirm }: { persona: Persona; onClose: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-[#2B2F5E]/45 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-[0_24px_70px_rgba(43,47,94,0.24)]"><div className="flex items-start gap-4"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600"><AppIcon name="trash" size={20} /></span><div><h2 className="text-xl font-semibold text-[#2B2F5E]">Eliminare {persona.nome}?</h2><p className="mt-2 text-sm leading-relaxed text-gray-500">L’eliminazione è definitiva. Se la persona possiede dati collegati, il sistema impedirà l’operazione e potrai disattivarla.</p></div></div><div className="mt-7 flex justify-end gap-3"><button type="button" onClick={onClose} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-[#2B2F5E] hover:bg-[#F2F2F2]">Annulla</button><button type="button" onClick={onConfirm} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700">Elimina</button></div></div>
    </div>
  );
}
