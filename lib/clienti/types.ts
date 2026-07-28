export type Cliente = {
  id: string;
  tipo_cliente: TipoCliente;
  cliente: string | null;
  piva: string | null;
  codice_fiscale: string | null;
  forma_giuridica: string | null;
  rea: string | null;
  indirizzo: string | null;
  comune: string | null;
  cap: string | null;
  provincia: string | null;
  nazione: string | null;
  codice_sdi: string | null;
  sito_web: string | null;
  pec: string | null;
  email: string | null;
  telefono: string | null;
  referente: string | null;
  referente_qualifica: string | null;
  referente_codice_fiscale: string | null;
  referente_data_nascita: string | null;
  referente_luogo_nascita: string | null;
  referente_residenza: string | null;
  referente_email: string | null;
  referente_telefono: string | null;
  created_at?: string | null;
};

export type TipoCliente = "persona_fisica" | "azienda";

export type ClienteForm = Omit<Cliente, "id" | "created_at"> & {
  tipo_cliente: TipoCliente;
  cliente: string;
  piva: string;
  codice_fiscale: string;
  forma_giuridica: string;
  rea: string;
  indirizzo: string;
  comune: string;
  cap: string;
  provincia: string;
  nazione: string;
  codice_sdi: string;
  sito_web: string;
  pec: string;
  email: string;
  telefono: string;
  referente: string;
  referente_qualifica: string;
  referente_codice_fiscale: string;
  referente_data_nascita: string;
  referente_luogo_nascita: string;
  referente_residenza: string;
  referente_email: string;
  referente_telefono: string;
};

export type FiltriClienti = {
  tipo_cliente: "tutti" | TipoCliente;
  comune: string;
  email: "tutti" | "presente" | "assente";
  pec: "tutti" | "presente" | "assente";
  telefono: "tutti" | "presente" | "assente";
  piva: "tutti" | "presente" | "assente";
  referente: "tutti" | "presente" | "assente";
};

export type OrdinamentoClienti =
  | "cliente_asc"
  | "cliente_desc"
  | "comune"
  | "referente"
  | "inserimento";

export const CLIENTE_FORM_VUOTO: ClienteForm = {
  tipo_cliente: "persona_fisica",
  cliente: "",
  piva: "",
  codice_fiscale: "",
  forma_giuridica: "",
  rea: "",
  indirizzo: "",
  comune: "",
  cap: "",
  provincia: "",
  nazione: "Italia",
  codice_sdi: "",
  sito_web: "",
  pec: "",
  email: "",
  telefono: "",
  referente: "",
  referente_qualifica: "",
  referente_codice_fiscale: "",
  referente_data_nascita: "",
  referente_luogo_nascita: "",
  referente_residenza: "",
  referente_email: "",
  referente_telefono: "",
};

export const FILTRI_CLIENTI_INIZIALI: FiltriClienti = {
  tipo_cliente: "tutti",
  comune: "",
  email: "tutti",
  pec: "tutti",
  telefono: "tutti",
  piva: "tutti",
  referente: "tutti",
};
