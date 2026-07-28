"use client";

import type { Professionista } from "@/lib/professionisti/types";
import { formattaDataProfessionista } from "@/lib/professionisti/utils";
import {
  Modal,
  primaryButton,
  secondaryButton,
} from "@/components/rappresentanti/Common";

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

export default function ProfessionalDetailsModal({
  professionista,
  onClose,
  onEdit,
}: {
  professionista: Professionista;
  onClose: () => void;
  onEdit: () => void;
}) {
  return (
    <Modal
      title={`${professionista.cognome || ""} ${professionista.nome || ""}`.trim()}
      onClose={onClose}
      width="max-w-4xl"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Info label="Professione" value={professionista.professione} />
        <Info
          label="Data di nascita"
          value={formattaDataProfessionista(professionista.data_nascita)}
        />
        <Info label="Luogo di nascita" value={professionista.luogo_nascita} />
        <Info label="Codice fiscale" value={professionista.codice_fiscale} />
        <Info label="Residenza" value={professionista.residenza} />
        <Info
          label="Domicilio fiscale"
          value={professionista.domicilio_fiscale}
        />
        <Info label="Albo" value={professionista.albo} />
        <Info label="Provincia" value={professionista.provincia} />
        <Info label="Sezione" value={professionista.sezione} />
        <Info label="Numero di iscrizione" value={professionista.numero} />
        <Info
          label="Prima iscrizione"
          value={formattaDataProfessionista(professionista.prima_iscrizione)}
        />
        <Info label="Partita IVA" value={professionista.partita_iva} />
        <Info label="PEC" value={professionista.pec} />
      </div>

      <div className="mt-4 rounded-xl border border-[#2B2F5E]/8 p-4">
        <p className="text-[10px] font-bold uppercase tracking-wide text-[#2B2F5E]/45">
          Abilitazioni
        </p>
        <p className="mt-2 whitespace-pre-line text-sm text-[#2B2F5E]">
          {professionista.abilitazioni || "Nessuna abilitazione indicata."}
        </p>
      </div>

      <div className="mt-5 flex flex-wrap justify-end gap-2">
        {professionista.pec && (
          <a href={`mailto:${professionista.pec}`} className={secondaryButton}>
            Invia PEC
          </a>
        )}
        <button type="button" onClick={onEdit} className={primaryButton}>
          Modifica
        </button>
      </div>
    </Modal>
  );
}
