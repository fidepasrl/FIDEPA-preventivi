export type Professionista = {
  id: string;
  nome: string | null;
  cognome: string | null;
  professione: string | null;
  data_nascita: string | null;
  luogo_nascita: string | null;
  codice_fiscale: string | null;
  residenza: string | null;
  domicilio_fiscale: string | null;
  albo: string | null;
  provincia: string | null;
  sezione: string | null;
  numero: string | null;
  prima_iscrizione: string | null;
  partita_iva: string | null;
  pec: string | null;
  abilitazioni: string | null;
};

export type ProfessionistaForm = Omit<Professionista, "id"> & {
  nome: string;
  cognome: string;
  professione: string;
  data_nascita: string;
  luogo_nascita: string;
  codice_fiscale: string;
  residenza: string;
  domicilio_fiscale: string;
  albo: string;
  provincia: string;
  sezione: string;
  numero: string;
  prima_iscrizione: string;
  partita_iva: string;
  pec: string;
  abilitazioni: string;
};

export type FiltriProfessionisti = {
  professione: string;
  albo: string;
  provincia: string;
  sezione: string;
  pec: "tutti" | "presente" | "assente";
  partita_iva: "tutti" | "presente" | "assente";
  abilitazioni: "tutti" | "presente" | "assente";
};

export type OrdinamentoProfessionisti =
  | "cognome"
  | "nome"
  | "professione"
  | "provincia"
  | "prima_iscrizione";

export const PROFESSIONISTA_FORM_VUOTO: ProfessionistaForm = {
  nome: "",
  cognome: "",
  professione: "",
  data_nascita: "",
  luogo_nascita: "",
  codice_fiscale: "",
  residenza: "",
  domicilio_fiscale: "",
  albo: "",
  provincia: "",
  sezione: "",
  numero: "",
  prima_iscrizione: "",
  partita_iva: "",
  pec: "",
  abilitazioni: "",
};

export const FILTRI_PROFESSIONISTI_INIZIALI: FiltriProfessionisti = {
  professione: "",
  albo: "",
  provincia: "",
  sezione: "",
  pec: "tutti",
  partita_iva: "tutti",
  abilitazioni: "tutti",
};
