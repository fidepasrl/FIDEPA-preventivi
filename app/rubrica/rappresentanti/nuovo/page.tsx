"use client";

import LayoutApp from "@/components/LayoutApp";
import RepresentativeForm from "@/components/rappresentanti/RepresentativeForm";
import { Breadcrumb, PageHeader } from "@/components/rappresentanti/Common";

export default function NuovoRappresentantePage() {
  return <LayoutApp><Breadcrumb items={[{ label: "Rubrica", href: "/rubrica/rappresentanti" }, { label: "Rappresentanti", href: "/rubrica/rappresentanti" }, { label: "Nuovo" }]} /><PageHeader title="Nuovo rappresentante" subtitle="Inserisci i dati personali, i contatti e le aziende rappresentate." /><RepresentativeForm /></LayoutApp>;
}
