"use client";

import { MetricCard } from "./EconomicCommon";
import type { RiepilogoEconomico } from "@/lib/economia-commesse/types";

export default function EconomicDashboard({ riepilogo }: { riepilogo: RiepilogoEconomico }) {
  return (
    <div className="space-y-3" aria-label="Riepilogo economico della commessa">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MetricCard
          label="Valore iniziale"
          value={riepilogo.valoreIniziale}
          tooltip="Imponibile acquisito dal preventivo e modificabile nel quadro economico."
        />
        <MetricCard
          label="Variazioni nette"
          value={riepilogo.variazioniNette}
          tooltip="Aumenti meno diminuzioni registrati nello storico contrattuale."
        />
        <MetricCard
          label="Valore aggiornato"
          value={riepilogo.valoreAggiornato}
          tooltip="Valore iniziale più aumenti e meno diminuzioni registrati."
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          label="Incassato"
          value={riepilogo.incassiTotali}
          tooltip="Totale effettivamente incassato, comprensivo di eventuali Cassa e IVA."
          tone="positive"
        />
        <MetricCard
          label="Da incassare"
          value={riepilogo.daIncassare}
          tooltip="Valore aggiornato della commessa meno quanto è già stato incassato."
          tone={riepilogo.daIncassare > 0 ? "danger" : "default"}
        />
        <MetricCard
          label="Costi previsti"
          value={riepilogo.costiPrevisti}
          tooltip="Compensi concordati dei collaboratori più gli altri costi previsti della commessa."
          tone="danger"
        />
        <MetricCard
          label="Costi già pagati"
          value={riepilogo.costiPagati}
          tooltip="Totale dei pagamenti già effettuati per collaboratori e altri costi della commessa."
          tone="danger"
        />
        <MetricCard
          label="Costi da pagare"
          value={riepilogo.costiDaPagare}
          tooltip="Costi previsti meno i costi già pagati."
          tone={riepilogo.costiDaPagare > 0 ? "danger" : "default"}
        />
        <MetricCard
          label="Cassa da versare"
          value={riepilogo.cassaDaVersare}
          tooltip="Cassa incassata meno Cassa pagata. Un valore negativo rappresenta un credito."
          tone={riepilogo.cassaDaVersare < 0 ? "positive" : riepilogo.cassaDaVersare > 0 ? "danger" : "default"}
        />
        <MetricCard
          label="IVA da versare"
          value={riepilogo.ivaDaVersare}
          tooltip="IVA incassata meno IVA pagata. Un valore negativo rappresenta un credito."
          tone={riepilogo.ivaDaVersare < 0 ? "positive" : riepilogo.ivaDaVersare > 0 ? "danger" : "default"}
        />
        <MetricCard
          label="Margine attuale"
          value={riepilogo.margineAttuale}
          tooltip="Valore aggiornato della commessa meno i costi già pagati."
          tone={riepilogo.margineAttuale < 0 ? "danger" : "positive"}
        />
        <MetricCard
          label="Margine previsto"
          value={riepilogo.marginePrevisto}
          tooltip="Valore aggiornato della commessa meno i costi previsti."
          tone={riepilogo.marginePrevisto < 0 ? "danger" : "positive"}
          strong
        />
      </div>
    </div>
  );
}
