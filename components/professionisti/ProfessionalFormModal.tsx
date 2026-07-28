"use client";

import { useState } from "react";
import type { ProfessionistaForm } from "@/lib/professionisti/types";
import {
  FormField,
  Modal,
  inputClass,
  primaryButton,
  secondaryButton,
} from "@/components/rappresentanti/Common";

export default function ProfessionalFormModal({
  title,
  initialValue,
  onClose,
  onSave,
}: {
  title: string;
  initialValue: ProfessionistaForm;
  onClose: () => void;
  onSave: (value: ProfessionistaForm) => Promise<void>;
}) {
  const [form, setForm] = useState(initialValue);
  const [errore, setErrore] = useState("");
  const [salvataggio, setSalvataggio] = useState(false);

  function set<K extends keyof ProfessionistaForm>(
    key: K,
    value: ProfessionistaForm[K]
  ) {
    setForm((corrente) => ({ ...corrente, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.nome.trim() || !form.cognome.trim()) {
      setErrore("Nome e cognome sono obbligatori.");
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

  return (
    <Modal title={title} onClose={onClose} width="max-w-5xl">
      <form onSubmit={submit} className="space-y-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="Nome" required>
            <input
              value={form.nome}
              onChange={(event) => set("nome", event.target.value)}
              className={inputClass}
              required
            />
          </FormField>
          <FormField label="Cognome" required>
            <input
              value={form.cognome}
              onChange={(event) => set("cognome", event.target.value)}
              className={inputClass}
              required
            />
          </FormField>
          <FormField label="Professione">
            <input
              value={form.professione}
              onChange={(event) => set("professione", event.target.value)}
              className={inputClass}
            />
          </FormField>
          <FormField label="Data di nascita">
            <input
              type="date"
              value={form.data_nascita}
              onChange={(event) => set("data_nascita", event.target.value)}
              className={inputClass}
            />
          </FormField>
          <FormField label="Luogo di nascita">
            <input
              value={form.luogo_nascita}
              onChange={(event) => set("luogo_nascita", event.target.value)}
              className={inputClass}
            />
          </FormField>
          <FormField label="Codice fiscale">
            <input
              value={form.codice_fiscale}
              onChange={(event) => set("codice_fiscale", event.target.value)}
              className={inputClass}
            />
          </FormField>
          <FormField label="Residenza">
            <input
              value={form.residenza}
              onChange={(event) => set("residenza", event.target.value)}
              className={inputClass}
            />
          </FormField>
          <FormField label="Domicilio fiscale">
            <input
              value={form.domicilio_fiscale}
              onChange={(event) => set("domicilio_fiscale", event.target.value)}
              className={inputClass}
            />
          </FormField>
          <FormField label="Albo">
            <input
              value={form.albo}
              onChange={(event) => set("albo", event.target.value)}
              className={inputClass}
            />
          </FormField>
          <FormField label="Provincia">
            <input
              value={form.provincia}
              onChange={(event) => set("provincia", event.target.value)}
              className={inputClass}
            />
          </FormField>
          <FormField label="Sezione">
            <input
              value={form.sezione}
              onChange={(event) => set("sezione", event.target.value)}
              className={inputClass}
            />
          </FormField>
          <FormField label="Numero di iscrizione">
            <input
              value={form.numero}
              onChange={(event) => set("numero", event.target.value)}
              className={inputClass}
            />
          </FormField>
          <FormField label="Prima iscrizione">
            <input
              type="date"
              value={form.prima_iscrizione}
              onChange={(event) => set("prima_iscrizione", event.target.value)}
              className={inputClass}
            />
          </FormField>
          <FormField label="Partita IVA">
            <input
              value={form.partita_iva}
              onChange={(event) => set("partita_iva", event.target.value)}
              className={inputClass}
            />
          </FormField>
          <FormField label="PEC">
            <input
              type="email"
              value={form.pec}
              onChange={(event) => set("pec", event.target.value)}
              className={inputClass}
            />
          </FormField>
          <div className="md:col-span-2">
            <FormField label="Abilitazioni">
              <textarea
                value={form.abilitazioni}
                onChange={(event) => set("abilitazioni", event.target.value)}
                rows={5}
                className={inputClass}
              />
            </FormField>
          </div>
        </div>

        {errore && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
            {errore}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={secondaryButton}>
            Annulla
          </button>
          <button type="submit" disabled={salvataggio} className={primaryButton}>
            {salvataggio ? "Salvataggio..." : "Salva professionista"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
