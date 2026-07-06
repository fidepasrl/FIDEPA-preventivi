create extension if not exists pgcrypto;

create table if not exists public.gara_categorie (
  codice text primary key,
  categoria text,
  destinazione text,
  descrizione text,
  grado_complessita numeric,
  importo_fidepa numeric not null default 0,
  ordine integer,
  updated_at timestamptz not null default now()
);

alter table public.gara_categorie add column if not exists ordine integer;

create table if not exists public.gara_lavori (
  id uuid primary key default gen_random_uuid(),
  titolo text not null unique,
  committente text,
  data_inizio date,
  data_fine date,
  importo_lavori numeric not null default 0,
  percentuale_prestazione numeric,
  prestazioni text[] not null default '{}',
  fonte text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.gara_lavori add column if not exists prestazioni text[] not null default '{}';
alter table public.gara_lavori add column if not exists updated_at timestamptz not null default now();

create table if not exists public.gara_lavori_categorie (
  lavoro_id uuid not null references public.gara_lavori(id) on delete cascade,
  categoria_codice text not null references public.gara_categorie(codice) on delete cascade,
  importo numeric not null default 0,
  primary key (lavoro_id, categoria_codice)
);

create table if not exists public.gara_fatturati (
  anno integer primary key,
  importo numeric not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.gara_preparazioni (
  id uuid primary key default gen_random_uuid(),
  titolo text not null,
  ente text,
  oggetto text,
  disciplinare text,
  scadenza date,
  stato text not null default 'bozza',
  fatturato_richiesto numeric not null default 0,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gara_preparazione_requisiti (
  id uuid primary key default gen_random_uuid(),
  preparazione_id uuid not null references public.gara_preparazioni(id) on delete cascade,
  categoria_codice text not null references public.gara_categorie(codice) on delete cascade,
  importo_richiesto numeric not null default 0
);

create table if not exists public.gara_preparazione_partecipanti (
  id uuid primary key default gen_random_uuid(),
  preparazione_id uuid not null references public.gara_preparazioni(id) on delete cascade,
  tipo text not null default 'societa',
  nome text not null,
  professionista_id uuid references public.professionisti(id) on delete set null,
  ruolo text,
  note text
);

create table if not exists public.gara_preparazione_partecipante_requisiti (
  id uuid primary key default gen_random_uuid(),
  partecipante_id uuid not null references public.gara_preparazione_partecipanti(id) on delete cascade,
  categoria_codice text not null references public.gara_categorie(codice) on delete cascade,
  importo numeric not null default 0
);

create table if not exists public.professionisti_requisiti_gara (
  id uuid primary key default gen_random_uuid(),
  professionista_id uuid not null references public.professionisti(id) on delete cascade,
  categoria_codice text not null references public.gara_categorie(codice) on delete cascade,
  importo numeric not null default 0,
  descrizione text,
  created_at timestamptz not null default now()
);

create index if not exists gara_lavori_categorie_categoria_idx on public.gara_lavori_categorie(categoria_codice);
create index if not exists gara_preparazione_requisiti_preparazione_idx on public.gara_preparazione_requisiti(preparazione_id);
create index if not exists gara_partecipanti_preparazione_idx on public.gara_preparazione_partecipanti(preparazione_id);
create index if not exists professionisti_requisiti_gara_professionista_idx on public.professionisti_requisiti_gara(professionista_id);

alter table public.gara_categorie enable row level security;
drop policy if exists "gara_categorie_select" on public.gara_categorie;
create policy "gara_categorie_select" on public.gara_categorie for select to authenticated using (true);
drop policy if exists "gara_categorie_insert" on public.gara_categorie;
create policy "gara_categorie_insert" on public.gara_categorie for insert to authenticated with check (true);
drop policy if exists "gara_categorie_update" on public.gara_categorie;
create policy "gara_categorie_update" on public.gara_categorie for update to authenticated using (true) with check (true);
drop policy if exists "gara_categorie_delete" on public.gara_categorie;
create policy "gara_categorie_delete" on public.gara_categorie for delete to authenticated using (true);

alter table public.gara_lavori enable row level security;
drop policy if exists "gara_lavori_select" on public.gara_lavori;
create policy "gara_lavori_select" on public.gara_lavori for select to authenticated using (true);
drop policy if exists "gara_lavori_insert" on public.gara_lavori;
create policy "gara_lavori_insert" on public.gara_lavori for insert to authenticated with check (true);
drop policy if exists "gara_lavori_update" on public.gara_lavori;
create policy "gara_lavori_update" on public.gara_lavori for update to authenticated using (true) with check (true);
drop policy if exists "gara_lavori_delete" on public.gara_lavori;
create policy "gara_lavori_delete" on public.gara_lavori for delete to authenticated using (true);

alter table public.gara_lavori_categorie enable row level security;
drop policy if exists "gara_lavori_categorie_select" on public.gara_lavori_categorie;
create policy "gara_lavori_categorie_select" on public.gara_lavori_categorie for select to authenticated using (true);
drop policy if exists "gara_lavori_categorie_insert" on public.gara_lavori_categorie;
create policy "gara_lavori_categorie_insert" on public.gara_lavori_categorie for insert to authenticated with check (true);
drop policy if exists "gara_lavori_categorie_update" on public.gara_lavori_categorie;
create policy "gara_lavori_categorie_update" on public.gara_lavori_categorie for update to authenticated using (true) with check (true);
drop policy if exists "gara_lavori_categorie_delete" on public.gara_lavori_categorie;
create policy "gara_lavori_categorie_delete" on public.gara_lavori_categorie for delete to authenticated using (true);

alter table public.gara_fatturati enable row level security;
drop policy if exists "gara_fatturati_select" on public.gara_fatturati;
create policy "gara_fatturati_select" on public.gara_fatturati for select to authenticated using (true);
drop policy if exists "gara_fatturati_insert" on public.gara_fatturati;
create policy "gara_fatturati_insert" on public.gara_fatturati for insert to authenticated with check (true);
drop policy if exists "gara_fatturati_update" on public.gara_fatturati;
create policy "gara_fatturati_update" on public.gara_fatturati for update to authenticated using (true) with check (true);
drop policy if exists "gara_fatturati_delete" on public.gara_fatturati;
create policy "gara_fatturati_delete" on public.gara_fatturati for delete to authenticated using (true);

alter table public.gara_preparazioni enable row level security;
drop policy if exists "gara_preparazioni_select" on public.gara_preparazioni;
create policy "gara_preparazioni_select" on public.gara_preparazioni for select to authenticated using (true);
drop policy if exists "gara_preparazioni_insert" on public.gara_preparazioni;
create policy "gara_preparazioni_insert" on public.gara_preparazioni for insert to authenticated with check (true);
drop policy if exists "gara_preparazioni_update" on public.gara_preparazioni;
create policy "gara_preparazioni_update" on public.gara_preparazioni for update to authenticated using (true) with check (true);
drop policy if exists "gara_preparazioni_delete" on public.gara_preparazioni;
create policy "gara_preparazioni_delete" on public.gara_preparazioni for delete to authenticated using (true);

alter table public.gara_preparazione_requisiti enable row level security;
drop policy if exists "gara_preparazione_requisiti_select" on public.gara_preparazione_requisiti;
create policy "gara_preparazione_requisiti_select" on public.gara_preparazione_requisiti for select to authenticated using (true);
drop policy if exists "gara_preparazione_requisiti_insert" on public.gara_preparazione_requisiti;
create policy "gara_preparazione_requisiti_insert" on public.gara_preparazione_requisiti for insert to authenticated with check (true);
drop policy if exists "gara_preparazione_requisiti_update" on public.gara_preparazione_requisiti;
create policy "gara_preparazione_requisiti_update" on public.gara_preparazione_requisiti for update to authenticated using (true) with check (true);
drop policy if exists "gara_preparazione_requisiti_delete" on public.gara_preparazione_requisiti;
create policy "gara_preparazione_requisiti_delete" on public.gara_preparazione_requisiti for delete to authenticated using (true);

alter table public.gara_preparazione_partecipanti enable row level security;
drop policy if exists "gara_preparazione_partecipanti_select" on public.gara_preparazione_partecipanti;
create policy "gara_preparazione_partecipanti_select" on public.gara_preparazione_partecipanti for select to authenticated using (true);
drop policy if exists "gara_preparazione_partecipanti_insert" on public.gara_preparazione_partecipanti;
create policy "gara_preparazione_partecipanti_insert" on public.gara_preparazione_partecipanti for insert to authenticated with check (true);
drop policy if exists "gara_preparazione_partecipanti_update" on public.gara_preparazione_partecipanti;
create policy "gara_preparazione_partecipanti_update" on public.gara_preparazione_partecipanti for update to authenticated using (true) with check (true);
drop policy if exists "gara_preparazione_partecipanti_delete" on public.gara_preparazione_partecipanti;
create policy "gara_preparazione_partecipanti_delete" on public.gara_preparazione_partecipanti for delete to authenticated using (true);

alter table public.gara_preparazione_partecipante_requisiti enable row level security;
drop policy if exists "gara_preparazione_partecipante_requisiti_select" on public.gara_preparazione_partecipante_requisiti;
create policy "gara_preparazione_partecipante_requisiti_select" on public.gara_preparazione_partecipante_requisiti for select to authenticated using (true);
drop policy if exists "gara_preparazione_partecipante_requisiti_insert" on public.gara_preparazione_partecipante_requisiti;
create policy "gara_preparazione_partecipante_requisiti_insert" on public.gara_preparazione_partecipante_requisiti for insert to authenticated with check (true);
drop policy if exists "gara_preparazione_partecipante_requisiti_update" on public.gara_preparazione_partecipante_requisiti;
create policy "gara_preparazione_partecipante_requisiti_update" on public.gara_preparazione_partecipante_requisiti for update to authenticated using (true) with check (true);
drop policy if exists "gara_preparazione_partecipante_requisiti_delete" on public.gara_preparazione_partecipante_requisiti;
create policy "gara_preparazione_partecipante_requisiti_delete" on public.gara_preparazione_partecipante_requisiti for delete to authenticated using (true);

alter table public.professionisti_requisiti_gara enable row level security;
drop policy if exists "professionisti_requisiti_gara_select" on public.professionisti_requisiti_gara;
create policy "professionisti_requisiti_gara_select" on public.professionisti_requisiti_gara for select to authenticated using (true);
drop policy if exists "professionisti_requisiti_gara_insert" on public.professionisti_requisiti_gara;
create policy "professionisti_requisiti_gara_insert" on public.professionisti_requisiti_gara for insert to authenticated with check (true);
drop policy if exists "professionisti_requisiti_gara_update" on public.professionisti_requisiti_gara;
create policy "professionisti_requisiti_gara_update" on public.professionisti_requisiti_gara for update to authenticated using (true) with check (true);
drop policy if exists "professionisti_requisiti_gara_delete" on public.professionisti_requisiti_gara;
create policy "professionisti_requisiti_gara_delete" on public.professionisti_requisiti_gara for delete to authenticated using (true);

begin;

insert into public.gara_categorie (codice, categoria, destinazione, descrizione, grado_complessita, importo_fidepa) values
  ('E.01', 'EDILIZIA', 'Insediamenti Produttivi Agricoltura – Industria – Artigianato', 'Edifici rurali per l''attività agricola con corredi tecnici di tipo semplice (quali tettoie, depositi e ricoveri) ‐ Edifici industriali o artigianali di importanza costruttiva corrente
con corredi tecnici di base.', 0.65, 0.0),
  ('E.02', 'EDILIZIA', 'Insediamenti Produttivi Agricoltura – Industria – Artigianato', 'Edifici rurali per l''attività agricola con corredi tecnici di tipo complesso ‐ Edifici
industriali o artigianali con organizzazione e corredi tecnici di tipo complesso', 0.95, 0.0),
  ('E.03', 'EDILIZIA', 'Industria Alberghiera, Turismo e Commercio e Servizi per la Mobilità', 'Ostelli, Pensioni, Case albergo – Ristoranti ‐ Motel e stazioni di servizio ‐ negozi ‐
mercati coperti di tipo semplice', 0.95, 0.0),
  ('E.04', 'EDILIZIA', 'Industria Alberghiera, Turismo e Commercio e Servizi per la Mobilità', 'Alberghi, Villaggi turistici ‐ Mercati e Centri commerciali complessi', 1.2, 0.0),
  ('E.05', 'EDILIZIA', 'Residenza', 'Edifici, pertinenze, autorimesse semplici, senza particolari esigenze tecniche. Edifici
provvisori di modesta importanza', 0.65, 0.0),
  ('E.06', 'EDILIZIA', 'Residenza', 'Edilizia residenziale privata e pubblica di tipo corrente con costi di costruzione nella
media di mercato e con tipologie standardizzate', 0.95, 3676817.6800000006),
  ('E.07', 'EDILIZIA', 'Residenza', 'Edifici residenziali di tipo pregiato con costi di costruzione eccedenti la media di
mercato e con tipologie diversificate', 1.2, 0.0),
  ('E.08', 'EDILIZIA', 'Sanità, Istruzione, Ricerca', 'Sede Azienda Sanitaria, Distretto sanitario, Ambulatori di base. Asilo Nido, Scuola Materna, Scuola elementare, Scuole secondarie di primo grado fino a 24 classi, Scuole
secondarie di secondo grado fino a 25 classi', 0.95, 1197494.08),
  ('E.09', 'EDILIZIA', 'Sanità, Istruzione, Ricerca', 'Scuole secondarie di primo grado oltre 24 classi‐Istituti scolastici superiori oltre 25
classi‐ Case di cura', 1.15, 0.0),
  ('E.10', 'EDILIZIA', 'Sanità, Istruzione, Ricerca', 'Poliambulatori, Ospedali, Istituti di ricerca, Centri di riabilitazione, Poli scolastici,
Università, Accademie, Istituti di ricerca universitaria', 1.2, 0.0),
  ('E.11', 'EDILIZIA', 'Cultura, Vita Sociale, Sport, Culto', 'Padiglioni provvisori per esposizioni ‐ Costruzioni relative ad opere cimiteriali di tipo normale (colombari, ossari, loculari, edicole funerarie con caratteristiche costruttive semplici), Case parrocchiali, Oratori ‐ Stabilimenti balneari ‐ Aree ed attrezzature per lo
sport all''aperto, Campo sportivo e servizi annessi, di tipo semplice', 0.95, 0.0),
  ('E.12', 'EDILIZIA', 'Cultura, Vita Sociale, Sport, Culto', 'Aree ed attrezzature per lo sport all''aperto, Campo sportivo e servizi annessi, di tipo
complesso ‐ Palestre e piscine coperte', 1.15, 0.0),
  ('E.13', 'EDILIZIA', 'Cultura, Vita Sociale, Sport, Culto', 'Biblioteca, Cinema, Teatro, Pinacoteca, Centro Culturale, Sede congressuale, Auditorium, Museo, Galleria d''arte, Discoteca, Studio radiofonico o televisivo o di produzione cinematografica ‐ Opere cimiteriali di tipo monumentale, Monumenti
commemorativi, Palasport, Stadio, Chiese', 1.2, 0.0),
  ('E.14', 'EDILIZIA', 'Sedi amministrative, giudiziarie, delle forze dell’ordine', 'Edifici provvisori di modesta importanza a servizio di caserme', 0.65, 0.0),
  ('E.15', 'EDILIZIA', 'Sedi amministrative, giudiziarie, delle forze dell’ordine', 'Caserme con corredi tecnici di importanza corrente', 0.95, 0.0),
  ('E.16', 'EDILIZIA', 'Sedi amministrative, giudiziarie, delle forze dell’ordine', 'Sedi ed Uffici di Società ed Enti, Sedi ed Uffici comunali, Sedi ed Uffici provinciali, Sedi ed Uffici regionali, Sedi ed Uffici ministeriali, Pretura, Tribunale, Palazzo di giustizia,
Penitenziari, Caserme con corredi tecnici di importanza maggiore, Questura', 1.2, 0.0),
  ('E.17', 'EDILIZIA', 'Arredi, Forniture, Aree esterne pertinenziali allestite', 'Verde ed opere di arredo urbano improntate a grande semplicità, pertinenziali agli
edifici ed alla viabilità, Campeggi e simili', 0.65, 0.0),
  ('E.18', 'EDILIZIA', 'Arredi, Forniture, Aree esterne pertinenziali allestite', 'Arredamenti con elementi acquistati dal mercato, Giardini, Parchi gioco, Piazze e spazi
pubblici all’aperto', 0.95, 0.0),
  ('E.19', 'EDILIZIA', 'Arredi, Forniture, Aree esterne pertinenziali allestite', 'Arredamenti con elementi singolari, Parchi urbani, Parchi ludici attrezzati, Giardini e
piazze storiche, Opere di riqualificazione paesaggistica e ambientale di aree urbane.', 1.2, 0.0),
  ('E.20', 'EDILIZIA', 'Edifici e manufatti esistenti', 'Interventi di manutenzione straordinaria, ristrutturazione, riqualificazione, su edifici e
manufatti esistenti', 0.95, 4847208.03),
  ('E.21', 'EDILIZIA', 'Edifici e manufatti esistenti', 'Interventi di manutenzione straordinaria, restauro, ristrutturazione, riqualificazione, su edifici e manufatti di interesse storico artistico non soggetti a tutela ai sensi del decreto
legislativo n. 42/2004', 1.2, 0.0),
  ('E.22', 'EDILIZIA', 'Edifici e manufatti esistenti', 'Interventi di manutenzione, restauro, risanamento conservativo, riqualificazione, su edifici e manufatti di interesse storico artistico soggetti a tutela ai sensi del decreto
legislativo n. 42/2004, oppure di particolare importanza', 1.55, 0.0),
  ('S.01', 'STRUTTURE', 'Strutture, Opere infrastrutturali puntuali, non soggette ad azioni sismiche, ai sensi delle Norme Tecniche per le
Costruzioni', 'Strutture o parti di strutture in cemento armato, non soggette ad azioni sismiche ‐
riparazione o intervento locale ‐ Verifiche strutturali relative ‐ Ponteggi, centinature e
strutture provvisionali di durata inferiore a due anni', 0.7, 0.0),
  ('S.02', 'STRUTTURE', 'Strutture, Opere infrastrutturali puntuali, non soggette ad azioni sismiche, ai sensi delle Norme Tecniche per le
Costruzioni', 'Strutture o parti di strutture in muratura, legno, metallo, non soggette ad azioni sismiche ‐ riparazione o intervento locale – Verifiche strutturali relative.', 0.5, 0.0),
  ('S.03', 'STRUTTURE', 'Strutture, Opere infrastrutturali puntuali', 'Strutture o parti di strutture in cemento armato ‐ Verifiche strutturali relative ‐
Ponteggi, centinature e strutture provvisionali di durata superiore a due anni.', 0.95, 4321961.466079469),
  ('S.04', 'STRUTTURE', 'Strutture, Opere infrastrutturali puntuali', 'Strutture o parti di strutture in muratura, legno, metallo ‐ Verifiche strutturali relative ‐ Consolidamento delle opere di fondazione di manufatti dissestati ‐ Ponti, Paratie e tiranti, Consolidamento di pendii e di fronti rocciosi ed opere connesse, di tipo corrente
‐ Verifiche strutturali relative.', 0.9, 0.0),
  ('S.05', 'STRUTTURE', 'Strutture speciali', 'Dighe, Conche, Elevatori, Opere di ritenuta e di difesa, rilevati, colmate. Gallerie, Opere
sotterranee e subacquee, Fondazioni speciali.', 1.05, 0.0),
  ('S.06', 'STRUTTURE', 'Strutture speciali', 'Opere strutturali di notevole importanza costruttiva e richiedenti calcolazioni particolari
‐ Verifiche strutturali relative ‐ Strutture con metodologie normative che richiedono
modellazione particolare: edifici alti con necessità di valutazioni di secondo ordine.', 1.15, 0.0),
  ('IA.01', 'IMPIANTI', 'Impianti meccanici a fluido a servizio delle costruzioni', 'Impianti per l''approvvigionamento, la preparazione e la distribuzione di acqua nell''interno di edifici o per scopi industriali – Impianti sanitari ‐ Impianti di fognatura domestica od industriale ed opere relative al trattamento delle acque di rifiuto ‐ Reti di distribuzione di combustibili liquidi o gassosi ‐ Impianti per la distribuzione dell’aria
compressa del vuoto e di gas medicali ‐ Impianti e reti antincendio', 0.75, 881147.5314269238),
  ('IA.02', 'IMPIANTI', 'Impianti meccanici a fluido a servizio delle costruzioni', 'Impianti di riscaldamento ‐ Impianto di raffrescamento, climatizzazione, trattamento
dell’aria ‐ Impianti meccanici di distribuzione fluidi ‐ Impianto solare termico', 0.85, 258380.4179363249),
  ('IA.03', 'IMPIANTI', 'Impianti elettrici e speciali a servizio delle costruzioni ‐ Singole apparecchiature per laboratori e impianti pilota', 'Impianti elettrici in genere, impianti di illuminazione, telefonici, di rivelazione incendi, fotovoltaici, a corredo di edifici e costruzioni di importanza corrente ‐ singole
apparecchiature per laboratori e impianti pilota di tipo semplice', 1.15, 1107425.38855168),
  ('IA.04', 'IMPIANTI', 'Impianti elettrici e speciali a servizio delle costruzioni ‐ Singole apparecchiature per laboratori e impianti pilota', 'Impianti elettrici in genere, impianti di illuminazione, telefonici, di sicurezza , di rivelazione incendi , fotovoltaici, a corredo di edifici e costruzioni complessi ‐ cablaggi strutturati ‐ impianti in fibra ottica ‐ singole apparecchiature per laboratori e impianti
pilota di tipo complesso', 1.3, 0.0),
  ('IB.04', 'IMPIANTI', 'Impianti industriali ‐ Impianti pilota e impianti di depurazione con ridotte problematiche tecniche ‐
Discariche inerti', 'Depositi e discariche senza trattamento dei rifiuti.', 0.55, 0.0),
  ('IB.05', 'IMPIANTI', 'Impianti industriali ‐ Impianti pilota e impianti di depurazione con ridotte problematiche tecniche ‐
Discariche inerti', 'Impianti per le industrie molitorie, cartarie, alimentari, delle fibre tessili naturali, del legno, del cuoio e simili.', 0.7, 0.0),
  ('IB.06', 'IMPIANTI', 'Impianti industriali – Impianti pilota e impianti di depurazione complessi ‐ Discariche con trattamenti e termovalorizzatori', 'Impianti della industria chimica inorganica ‐ Impianti della preparazione e distillazione dei combustibili ‐ Impianti siderurgici ‐ Officine meccaniche e laboratori ‐ Cantieri navali ‐ Fabbriche di cemento, calce, laterizi, vetrerie e ceramiche ‐ Impianti per le industrie della fermentazione, chimico‐alimentari e tintorie ‐ Impianti termovalorizzatori e impianti di trattamento dei rifiuti ‐ Impianti della industria chimica organica ‐ Impianti della piccola industria chimica speciale ‐ Impianti di metallurgia (esclusi quelli relativi al ferro) ‐ Impianti per la preparazione ed il
trattamento dei minerali per la sistemazione e coltivazione delle cave e miniere', 0.7, 0.0),
  ('IB.07', 'IMPIANTI', 'Impianti industriali – Impianti pilota e impianti di depurazione complessi ‐ Discariche con trattamenti e termovalorizzatori', 'Gli impianti precedentemente esposti quando siano di complessità particolarmente
rilevante o comportanti rischi e problematiche ambientali molto rilevanti', 0.75, 0.0),
  ('IB.08', 'IMPIANTI', 'Opere elettriche per reti di trasmissione e  distribu‐ zione energia e segnali – Laboratori con ridotte problematiche tecniche', 'Impianti di linee e reti per trasmissioni e distribuzione di energia elettrica, telegrafia,
telefonia.', 0.5, 0.0),
  ('IB.09', 'IMPIANTI', 'Opere elettriche per reti di trasmissione e  distribu‐ zione energia e segnali – Laboratori con ridotte problematiche tecniche', 'Centrali idroelettriche ordinarie ‐ Stazioni di trasformazioni e di conversione impianti di
trazione elettrica', 0.6, 0.0),
  ('IB.10', 'IMPIANTI', 'Opere elettriche per reti di trasmissione e  distribu‐ zione energia e segnali – Laboratori con ridotte problematiche tecniche', 'Impianti termoelettrici‐Impianti dell''elettrochimica ‐ Impianti della elettrometallurgia ‐
Laboratori con ridotte problematiche tecniche', 0.75, 0.0),
  ('IB.11', 'IMPIANTI', 'Impianti per la produzione di energia – Laboratori
complessi', 'Campi fotovoltaici ‐ Parchi eolici', 0.9, 0.0),
  ('IB.12', 'IMPIANTI', 'Impianti per la produzione di energia – Laboratori
complessi', 'Micro Centrali idroelettriche‐Impianti termoelettrici‐Impianti della elettrometallurgia di
tipo complesso', 1.0, 0.0),
  ('V.01', 'INFRASTRUT‐ TURE PER LA MOBILITA’', 'Manutenzione', 'Interventi di manutenzione su viabilità ordinaria', 0.4, 0.0),
  ('V.02', 'INFRASTRUT‐ TURE PER LA MOBILITA’', 'Viabilità ordinaria', 'Strade, linee tramviarie, ferrovie, strade ferrate, di tipo ordinario, escluse le opere d''arte
da compensarsi a parte ‐ Piste ciclabili', 0.45, 0.0),
  ('V.03', 'INFRASTRUT‐ TURE PER LA MOBILITA’', 'Viabilità speciale', 'Strade, linee tramviarie, ferrovie, strade ferrate, con particolari difficoltà di studio, escluse le opere d''arte e le stazioni, da compensarsi a parte ‐ Impianti teleferici e
funicolari ‐ Piste aeroportuali e simili.', 0.75, 0.0),
  ('D.01', 'IDRAULICA', 'Navigazione', 'Opere di navigazione interna e portuali', 0.65, 0.0),
  ('D.02', 'IDRAULICA', 'Opere di bonifica e derivazioni', 'Bonifiche ed irrigazioni a deflusso naturale, sistemazione di corsi d''acqua e di bacini
montani', 0.45, 0.0),
  ('D.03', 'IDRAULICA', 'Opere di bonifica e derivazioni', 'Bonifiche ed irrigazioni con sollevamento meccanico di acqua (esclusi i macchinari) ‐
Derivazioni d''acqua per forza motrice e produzione di energia elettrica', 0.55, 0.0),
  ('D.04', 'IDRAULICA', 'Acquedotti e fognature', 'Impianti per provvista, condotta, distribuzione d''acqua, improntate a grande semplicità ‐
Fognature urbane improntate a grande semplicità ‐ Condotte subacquee in genere,
metanodotti e gasdotti, di tipo ordinario', 0.65, 0.0),
  ('D.05', 'IDRAULICA', 'Acquedotti e fognature', 'Impianti per provvista, condotta, distribuzione d''acqua ‐ Fognature urbane ‐ Condotte
subacquee in genere, metanodotti e gasdotti, con problemi tecnici di tipo speciale.', 0.8, 0.0),
  ('T.01', 'TECNOLOGIE DELL’INFOR‐ MAZIONE E COMUNICA‐ ZIONE', 'Sistemi informativi', 'Sistemi informativi, gestione elettronica del flusso documentale, dematerializzazione e gestione archivi, ingegnerizzazione dei processi, sistemi di gestione delle attività
produttive, Data center, server farm.', 0.95, 0.0),
  ('T.02', 'TECNOLOGIE DELL’INFOR‐ MAZIONE E COMUNICA‐ ZIONE', 'Sistemi e reti di telecomunicazione', 'Reti locali e geografiche, cablaggi strutturati, impianti in fibra ottica, Impianti di videosorveglianza, controllo accessi, identificazione targhe di veicoli ecc. Sistemi
wireless, reti wifi, ponti radio.', 0.7, 0.0),
  ('T.03', 'TECNOLOGIE DELL’INFOR‐ MAZIONE E COMUNICA‐ ZIONE', 'Sistemi elettronici ed
automazione', 'Elettronica Industriale Sistemi a controllo numerico, Sistemi di automazione, Robotica', 1.2, 0.0),
  ('P.01', 'PAESAGGIO, AMBIENTE, NATURALIZ‐ ZAZIONE, AGROALI‐ MENTARE, ZOOTECNICA, RURALITA’, FORESTE', 'Interventi di sistemazione naturalistica o paesaggistica', 'Opere relative alla sistemazione di ecosistemi naturali o naturalizzati, alle aree naturali protette ed alle aree a rilevanza faunistica.
Opere relative al restauro paesaggistico di territori compromessi ed agli interventi su
elementi strutturali del paesaggio. Opere di configurazione di assetto paesaggistico.', 0.85, 0.0),
  ('P.02', 'PAESAGGIO, AMBIENTE, NATURALIZ‐ ZAZIONE, AGROALI‐ MENTARE, ZOOTECNICA, RURALITA’, FORESTE', 'Interventi del verde e opere per attività ricreativa o
sportiva', 'Opere a verde sia su piccola scala o grande scala dove la rilevanza dell’opera è prevalente rispetto alle opere di tipo costruttivo.', 0.85, 0.0),
  ('P.03', 'PAESAGGIO, AMBIENTE, NATURALIZ‐ ZAZIONE, AGROALI‐ MENTARE, ZOOTECNICA, RURALITA’, FORESTE', 'Interventi recupero, riqualificazione ambientale', 'Opere di riqualificazione e risanamento di ambiti naturali, rurali e forestali o urbani finalizzati al ripristino delle condizioni originarie, al riassetto delle componenti biotiche
ed abiotiche.', 0.85, 0.0),
  ('P.04', 'PAESAGGIO, AMBIENTE, NATURALIZ‐ ZAZIONE, AGROALI‐ MENTARE, ZOOTECNICA, RURALITA’, FORESTE', 'Interventi di sfruttamento di
cave e torbiere', 'Opere di utilizzazione di bacini estrattivi a parete o a fossa', 0.85, 0.0),
  ('P.05', 'PAESAGGIO, AMBIENTE, NATURALIZ‐ ZAZIONE, AGROALI‐ MENTARE, ZOOTECNICA, RURALITA’, FORESTE', 'Interventi di miglioramento e qualificazione della filiera forestale', 'Opere di assetto ed utilizzazione forestale nonché dell’impiego ai fini industriali, energetici ed ambientali. Piste forestali, strade forestali– percorsi naturalistici, aree di sosta e di stazionamento dei mezzi forestali. Meccanizzazione forestale', 0.85, 0.0),
  ('P.06', 'PAESAGGIO, AMBIENTE, NATURALIZ‐ ZAZIONE, AGROALI‐ MENTARE, ZOOTECNICA, RURALITA’, FORESTE', 'Interventi di miglioramento fondiario agrario e rurale; interventi di pianificazione
alimentare', 'Opere di intervento per la realizzazione di infrastrutture e di miglioramento dell’assetto rurale.', 0.85, 0.0),
  ('U.01', 'TERRITORIO E URBANISTICA', 'Interventi per la valorizza‐ zione delle filiere produttive agroalimentari e zootecni‐ che; interventi di controllo –
vigilanza alimentare', 'Opere ed infrastrutture complesse, anche a carattere immateriale, volte a migliorare l’assetto del territorio rurale per favorire lo sviluppo dei processi agricoli e zootecnici. Opere e strutture per la valorizzazione delle filiere (produzione, trasformazione e commercializzazione delle produzioni agricole e agroalimentari)', 0.9, 0.0),
  ('U.02', 'TERRITORIO E URBANISTICA', 'Interventi per la valorizza‐ zione della filiera
naturalistica e faunistica', 'Interventi di valorizzazione degli ambiti naturali sia di tipo vegetazionale che faunistico', 0.95, 0.0),
  ('U.03', 'TERRITORIO E URBANISTICA', 'Pianificazione', 'Strumenti di pianificazione generale ed attuativa e di pianificazione di settore', 1.0, 0.0)
on conflict (codice) do update set
  categoria = excluded.categoria,
  destinazione = excluded.destinazione,
  descrizione = excluded.descrizione,
  grado_complessita = excluded.grado_complessita,
  importo_fidepa = excluded.importo_fidepa,
  updated_at = now();

update public.gara_categorie as categoria
set ordine = ordine_dm.ordine
from (
  values
    ('E.01', 1), ('E.02', 2), ('E.03', 3), ('E.04', 4),
    ('E.05', 5), ('E.06', 6), ('E.07', 7), ('E.08', 8),
    ('E.09', 9), ('E.10', 10), ('E.11', 11), ('E.12', 12),
    ('E.13', 13), ('E.14', 14), ('E.15', 15), ('E.16', 16),
    ('E.17', 17), ('E.18', 18), ('E.19', 19), ('E.20', 20),
    ('E.21', 21), ('E.22', 22), ('S.01', 23), ('S.02', 24),
    ('S.03', 25), ('S.04', 26), ('S.05', 27), ('S.06', 28),
    ('IA.01', 29), ('IA.02', 30), ('IA.03', 31), ('IA.04', 32),
    ('IB.04', 33), ('IB.05', 34), ('IB.06', 35), ('IB.07', 36),
    ('IB.08', 37), ('IB.09', 38), ('IB.10', 39), ('IB.11', 40),
    ('IB.12', 41), ('V.01', 42), ('V.02', 43), ('V.03', 44),
    ('D.01', 45), ('D.02', 46), ('D.03', 47), ('D.04', 48),
    ('D.05', 49), ('T.01', 50), ('T.02', 51), ('T.03', 52),
    ('P.01', 53), ('P.02', 54), ('P.03', 55), ('P.04', 56),
    ('P.05', 57), ('P.06', 58), ('U.01', 59), ('U.02', 60),
    ('U.03', 61)
) as ordine_dm(codice, ordine)
where categoria.codice = ordine_dm.codice;

insert into public.gara_lavori (id, titolo, committente, data_inizio, data_fine, importo_lavori, percentuale_prestazione, fonte) values
  ('afcdb215-fa1e-5fb9-9242-a8da883656ee', 'Istituto Comprensivo Statale B. Cozzolino L. Davino a San Gernnaro Vesuviano', 'Comune di San Gennaro Vesuviano', '2023-11-07', '2024-01-17', 2086226.6097560977, 0.82, 'Requisiti FIDEPA.xlsx'),
  ('88b9db4c-4740-5f47-bd7a-ca2be08e5070', 'Fabbricato Condominio “Amabile Palazzo A” sito in Montoro', 'Privato', '2022-09-12', '2023-11-27', 1525190.2100000002, 1.0, 'Requisiti FIDEPA.xlsx'),
  ('6bced31a-dd13-5042-b0ec-43a372004a24', 'Fabbricato Condominio “Vesuvio” sito in Scisciano', 'Privato', '2022-11-21', '2023-12-18', 1459844.2200000002, 1.0, 'Requisiti FIDEPA.xlsx'),
  ('c2472658-48e8-55a4-b9d2-0555f849c89a', 'Fabbricato Condominio “Vastola” sito in San Valentino Torio', 'Privato', '2022-11-16', '2023-12-22', 253338.08, 1.0, 'Requisiti FIDEPA.xlsx'),
  ('b034a84b-4ad1-56eb-928b-9e4995e6d856', 'Fabbricato Condominio “Parco Delle Rose” sito in San Valentino Torio', 'Privato', '2022-11-14', '2023-12-19', 797014.56, 1.0, 'Requisiti FIDEPA.xlsx'),
  ('278be4e0-ca1d-5de0-88b6-a1358021d79f', 'Fabbricato Condominio “Basta” sito in San Valentino Torio', 'Privato', '2021-09-28', '2023-11-22', 462246.46, 1.0, 'Requisiti FIDEPA.xlsx'),
  ('fe7e07e1-0d21-57ce-9e55-7c26075bce92', 'Fabbricato Condominio “Navarra” sito in Siano', 'Privato', '2021-09-28', '2023-11-22', 622451.2999999999, 1.0, 'Requisiti FIDEPA.xlsx'),
  ('cc7e42c4-c95b-50ab-a3cc-3aa6986f3c7d', 'Fabbricato Condominio "Palazzo Di Giacomo" sito in Pagani', 'Privato', '2021-12-03', '2022-11-24', 7736226.799235436, 1.0, 'Requisiti FIDEPA.xlsx'),
  ('4b062a69-d508-51f1-b627-1e5742efde7e', 'Fabbricato Condominio "Palazzo De Caro" sito in Montoro', 'Privato', '2022-10-11', '2022-11-25', 1723417.1447589614, 1.0, 'Requisiti FIDEPA.xlsx')
on conflict (titolo) do update set
  committente = excluded.committente,
  data_inizio = excluded.data_inizio,
  data_fine = excluded.data_fine,
  importo_lavori = excluded.importo_lavori,
  percentuale_prestazione = excluded.percentuale_prestazione,
  fonte = excluded.fonte;

delete from public.gara_lavori_categorie;
insert into public.gara_lavori_categorie (lavoro_id, categoria_codice, importo) values
  ('afcdb215-fa1e-5fb9-9242-a8da883656ee', 'E.08', 1197494.08),
  ('afcdb215-fa1e-5fb9-9242-a8da883656ee', 'S.03', 513211.74),
  ('88b9db4c-4740-5f47-bd7a-ca2be08e5070', 'E.06', 1260070.6),
  ('88b9db4c-4740-5f47-bd7a-ca2be08e5070', 'IA.01', 60103.26),
  ('88b9db4c-4740-5f47-bd7a-ca2be08e5070', 'IA.02', 73459.55),
  ('88b9db4c-4740-5f47-bd7a-ca2be08e5070', 'IA.03', 131556.8),
  ('6bced31a-dd13-5042-b0ec-43a372004a24', 'E.06', 1125660.1),
  ('6bced31a-dd13-5042-b0ec-43a372004a24', 'IA.01', 72607.38),
  ('6bced31a-dd13-5042-b0ec-43a372004a24', 'IA.02', 18151.85),
  ('6bced31a-dd13-5042-b0ec-43a372004a24', 'IA.03', 243424.89),
  ('c2472658-48e8-55a4-b9d2-0555f849c89a', 'S.03', 253338.08),
  ('b034a84b-4ad1-56eb-928b-9e4995e6d856', 'E.06', 444391.91),
  ('b034a84b-4ad1-56eb-928b-9e4995e6d856', 'IA.01', 9479.38),
  ('b034a84b-4ad1-56eb-928b-9e4995e6d856', 'IA.02', 22116.56),
  ('b034a84b-4ad1-56eb-928b-9e4995e6d856', 'IA.03', 321026.71),
  ('278be4e0-ca1d-5de0-88b6-a1358021d79f', 'E.06', 293048.45),
  ('278be4e0-ca1d-5de0-88b6-a1358021d79f', 'IA.01', 14177.84),
  ('278be4e0-ca1d-5de0-88b6-a1358021d79f', 'IA.02', 56711.37),
  ('278be4e0-ca1d-5de0-88b6-a1358021d79f', 'IA.03', 98308.8),
  ('fe7e07e1-0d21-57ce-9e55-7c26075bce92', 'E.06', 553646.62),
  ('fe7e07e1-0d21-57ce-9e55-7c26075bce92', 'IA.01', 55255.2),
  ('fe7e07e1-0d21-57ce-9e55-7c26075bce92', 'IA.02', 13549.48),
  ('cc7e42c4-c95b-50ab-a3cc-3aa6986f3c7d', 'E.20', 3471823.24),
  ('cc7e42c4-c95b-50ab-a3cc-3aa6986f3c7d', 'S.03', 3555411.646079469),
  ('cc7e42c4-c95b-50ab-a3cc-3aa6986f3c7d', 'IA.01', 522456.3381638586),
  ('cc7e42c4-c95b-50ab-a3cc-3aa6986f3c7d', 'IA.02', 58050.70424042874),
  ('cc7e42c4-c95b-50ab-a3cc-3aa6986f3c7d', 'IA.03', 128484.87075167974),
  ('4b062a69-d508-51f1-b627-1e5742efde7e', 'E.20', 1375384.79),
  ('4b062a69-d508-51f1-b627-1e5742efde7e', 'IA.01', 147068.13326306528),
  ('4b062a69-d508-51f1-b627-1e5742efde7e', 'IA.02', 16340.90369589614),
  ('4b062a69-d508-51f1-b627-1e5742efde7e', 'IA.03', 184623.3178)
on conflict (lavoro_id, categoria_codice) do update set importo = excluded.importo;

insert into public.gara_fatturati (anno, importo) values
  (2021, 89323.0),
  (2022, 338642.0),
  (2023, 1167759.0),
  (2024, 0.0),
  (2025, 0.0)
on conflict (anno) do update set importo = excluded.importo, updated_at = now();

commit;
