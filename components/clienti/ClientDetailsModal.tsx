"use client";

import {
  Modal,
  primaryButton,
  secondaryButton,
} from "@/components/rappresentanti/Common";
import type { Cliente } from "@/lib/clienti/types";
import { formattaDataCliente } from "@/lib/clienti/utils";

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-xl bg-[#F7F8FA] px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#2B2F5E]/45">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-medium text-[#2B2F5E]">
        {value || "—"}
      </p>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-3 text-sm font-semibold text-[#2B2F5E]">{title}</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {children}
      </div>
    </section>
  );
}

export default function ClientDetailsModal({
  cliente,
  onClose,
  onEdit,
}: {
  cliente: Cliente;
  onClose: () => void;
  onEdit: () => void;
}) {
  const azienda = cliente.tipo_cliente === "azienda";
  const sito = cliente.sito_web
    ? /^https?:\/\//i.test(cliente.sito_web)
      ? cliente.sito_web
      : `https://${cliente.sito_web}`
    : null;

  return (
    <Modal
      title={cliente.cliente || "Dettaglio cliente"}
      onClose={onClose}
      width="max-w-5xl"
    >
      <div className="space-y-6">
        <Section title={azienda ? "Dati aziendali" : "Dati anagrafici"}>
          <Info
            label="Tipo cliente"
            value={azienda ? "Azienda" : "Persona fisica"}
          />
          <Info
            label={azienda ? "Ragione sociale" : "Nome e cognome"}
            value={cliente.cliente}
          />
          <Info
            label={azienda ? "Partita IVA" : "P. IVA / Codice fiscale"}
            value={cliente.piva}
          />
          {azienda && (
            <>
              <Info label="Codice fiscale" value={cliente.codice_fiscale} />
              <Info label="Forma giuridica" value={cliente.forma_giuridica} />
              <Info label="REA" value={cliente.rea} />
              <Info label="Codice SDI" value={cliente.codice_sdi} />
              <Info label="Sito web" value={cliente.sito_web} />
            </>
          )}
          <Info
            label="Data inserimento"
            value={formattaDataCliente(cliente.created_at)}
          />
        </Section>

        <Section title={azienda ? "Sede legale e contatti" : "Indirizzo e contatti"}>
          <Info label="Indirizzo" value={cliente.indirizzo} />
          <Info label="Comune" value={cliente.comune} />
          {azienda && (
            <>
              <Info label="CAP" value={cliente.cap} />
              <Info label="Provincia" value={cliente.provincia} />
              <Info label="Nazione" value={cliente.nazione} />
            </>
          )}
          <Info label="Telefono" value={cliente.telefono} />
          <Info label="Email" value={cliente.email} />
          <Info label="PEC" value={cliente.pec} />
          {!azienda && <Info label="Referente" value={cliente.referente} />}
        </Section>

        {azienda && (
          <Section title="Referente / rappresentante">
            <Info label="Nome e cognome" value={cliente.referente} />
            <Info label="Qualifica o ruolo" value={cliente.referente_qualifica} />
            <Info
              label="Codice fiscale"
              value={cliente.referente_codice_fiscale}
            />
            <Info
              label="Data di nascita"
              value={formattaDataCliente(cliente.referente_data_nascita)}
            />
            <Info
              label="Luogo di nascita"
              value={cliente.referente_luogo_nascita}
            />
            <Info label="Residenza" value={cliente.referente_residenza} />
            <Info label="Email" value={cliente.referente_email} />
            <Info label="Telefono" value={cliente.referente_telefono} />
          </Section>
        )}
      </div>

      <div className="mt-6 flex flex-wrap justify-end gap-2">
        {cliente.telefono && (
          <a href={`tel:${cliente.telefono}`} className={secondaryButton}>
            Chiama
          </a>
        )}
        {cliente.email && (
          <a href={`mailto:${cliente.email}`} className={secondaryButton}>
            Invia email
          </a>
        )}
        {cliente.pec && (
          <a href={`mailto:${cliente.pec}`} className={secondaryButton}>
            Invia PEC
          </a>
        )}
        {sito && (
          <a
            href={sito}
            target="_blank"
            rel="noreferrer"
            className={secondaryButton}
          >
            Apri sito
          </a>
        )}
        <button type="button" onClick={onEdit} className={primaryButton}>
          Modifica
        </button>
      </div>
    </Modal>
  );
}
