"use client";

import { use, useEffect, useState } from "react";
import LayoutApp from "@/components/LayoutApp";
import RepresentativeForm from "@/components/rappresentanti/RepresentativeForm";
import { Breadcrumb, LoadingSkeleton, PageHeader, Toast } from "@/components/rappresentanti/Common";
import { caricaRappresentante, rappresentanteToForm } from "@/lib/rappresentanti/api";
import type { RappresentanteFormData } from "@/lib/rappresentanti/types";

export default function ModificaRappresentantePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params); const [data, setData] = useState<RappresentanteFormData | null>(null); const [nome, setNome] = useState(""); const [error, setError] = useState("");
  useEffect(() => { caricaRappresentante(id).then((r) => { setNome(`${r.nome} ${r.cognome}`); setData(rappresentanteToForm(r)); }).catch((e) => setError(e.message)); }, [id]);
  return <LayoutApp><Breadcrumb items={[{ label: "Rubrica", href: "/rubrica/rappresentanti" }, { label: "Rappresentanti", href: "/rubrica/rappresentanti" }, { label: nome || "Modifica" }]} /><PageHeader title={nome ? `Modifica ${nome}` : "Modifica rappresentante"} />{data ? <RepresentativeForm initialData={data} id={id} /> : <LoadingSkeleton rows={5} />}{error && <Toast message={error} error onClose={() => setError("")} />}</LayoutApp>;
}
