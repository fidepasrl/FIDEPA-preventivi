"use client";

import { useState } from "react";
import {
  FormField,
  Modal,
  inputClass,
  primaryButton,
  secondaryButton,
} from "@/components/rappresentanti/Common";
import type { ClienteForm, TipoCliente } from "@/lib/clienti/types";

function TitoloSezione({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="border-b border-[#2B2F5E]/8 pb-2">
      <h3 className="text-sm font-semibold text-[#2B2F5E]">{title}</h3>
      {description && (
        <p className="mt-0.5 text-xs text-[#2B2F5E]/50">{description}</p>
      )}
    </div>
  );
}

export default function ClientFormModal({
  title,
  initialValue,
  onClose,
  onSave,
}: {
  title: string;
  initialValue: ClienteForm;
  onClose: () => void;
  onSave: (value: ClienteForm) => Promise<void>;
}) {
  const [form, setForm] = useState(initialValue);
  const [errore, setErrore] = useState("");
  const [salvataggio, setSalvataggio] = useState(false);
  const azienda = form.tipo_cliente === "azienda";

  function set<K extends keyof ClienteForm>(
    key: K,
    value: ClienteForm[K]
  ) {
    setForm((corrente) => ({ ...corrente, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.cliente.trim()) {
      setErrore(
        azienda
          ? "La ragione sociale è obbligatoria."
          : "Il nome del cliente è obbligatorio."
      );
      return;
    }
    if (azienda && !form.piva.trim()) {
      setErrore("La partita IVA dell’azienda è obbligatoria.");
      return;
    }
    setSalvataggio(true);
    setErrore("");
    try {
      await onSave(form);
    } catch (error) {
      setErrore(
        error instanceof Error ? error.message : "Salvataggio non riuscito."
      );
      setSalvataggio(false);
    }
  }

  const campo = (
    label: string,
    key: keyof ClienteForm,
    options?: { type?: string; required?: boolean; placeholder?: string }
  ) => (
    <FormField label={label} required={options?.required}>
      <input
        type={options?.type || "text"}
        value={String(form[key] || "")}
        onChange={(event) => set(key, event.target.value as never)}
        className={inputClass}
        required={options?.required}
        placeholder={options?.placeholder}
      />
    </FormField>
  );

  return (
    <Modal title={title} onClose={onClose} width="max-w-5xl">
      <form onSubmit={submit} className="space-y-6">
        <div>
          <span className="mb-2 block text-sm font-medium text-[#2B2F5E]">
            Tipo cliente
          </span>
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-[#F2F2F2] p-1 sm:w-[420px]">
            {[
              ["persona_fisica", "Persona fisica"],
              ["azienda", "Azienda"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => set("tipo_cliente", value as TipoCliente)}
                className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                  form.tipo_cliente === value
                    ? "bg-white text-[#2B2F5E] shadow-sm"
                    : "text-[#2B2F5E]/55"
                }`}
                aria-pressed={form.tipo_cliente === value}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <TitoloSezione
            title={azienda ? "Dati aziendali" : "Dati anagrafici"}
            description={
              azienda
                ? "Informazioni fiscali e identificative dell’impresa."
                : "Informazioni principali del cliente."
            }
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {campo(azienda ? "Ragione sociale" : "Nome e cognome", "cliente", {
              required: true,
            })}
            {campo(azienda ? "Partita IVA" : "P. IVA / Codice fiscale", "piva", {
              required: azienda,
            })}
            {azienda && (
              <>
                {campo("Codice fiscale azienda", "codice_fiscale")}
                {campo("Forma giuridica", "forma_giuridica", {
                  placeholder: "es. S.r.l., S.p.A., S.n.c.",
                })}
                {campo("Numero REA", "rea")}
                {campo("Codice destinatario SDI", "codice_sdi")}
                {campo("Sito web", "sito_web", {
                  type: "url",
                  placeholder: "https://...",
                })}
              </>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <TitoloSezione
            title={azienda ? "Sede legale e contatti aziendali" : "Indirizzo e contatti"}
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {campo(azienda ? "Indirizzo sede legale" : "Indirizzo", "indirizzo")}
            {campo("Comune", "comune")}
            {azienda && (
              <>
                {campo("CAP", "cap")}
                {campo("Provincia", "provincia")}
                {campo("Nazione", "nazione")}
              </>
            )}
            {campo("Telefono", "telefono", { type: "tel" })}
            {campo("Email", "email", { type: "email" })}
            {campo("PEC", "pec", { type: "email" })}
            {!azienda && campo("Referente", "referente")}
          </div>
        </div>

        {azienda && (
          <div className="space-y-4">
            <TitoloSezione
              title="Referente / rappresentante"
              description="Dati della persona che rappresenta o costituisce il referente dell’azienda."
            />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {campo("Nome e cognome", "referente")}
              {campo("Qualifica o ruolo", "referente_qualifica", {
                placeholder: "es. Legale rappresentante",
              })}
              {campo("Codice fiscale", "referente_codice_fiscale")}
              {campo("Data di nascita", "referente_data_nascita", {
                type: "date",
              })}
              {campo("Luogo di nascita", "referente_luogo_nascita")}
              {campo("Residenza", "referente_residenza")}
              {campo("Email", "referente_email", { type: "email" })}
              {campo("Telefono", "referente_telefono", { type: "tel" })}
            </div>
          </div>
        )}

        {errore && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
            {errore}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={secondaryButton}>
            Annulla
          </button>
          <button
            type="submit"
            disabled={salvataggio}
            className={primaryButton}
          >
            {salvataggio ? "Salvataggio..." : "Salva cliente"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
