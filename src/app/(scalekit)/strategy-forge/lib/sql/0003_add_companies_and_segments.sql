-- =============================================================================
-- ADD: Option tables for industries and company sizes
-- =============================================================================

-- Table: option_industries
-- Stores available industry options
create table public.option_industries (
  industry_id bigserial not null,
  value text not null,
  created_at timestamptz(6) not null default current_timestamp,
  updated_at timestamptz(6) not null default current_timestamp,
  
  primary key (industry_id)
);

comment on table public.option_industries is 
  'Stores available industry options';

comment on column public.option_industries.industry_id is 
  'Primary key identifier';

comment on column public.option_industries.value is 
  'Industry value/name';

-- Table: option_company_sizes
-- Stores available company size options
create table public.option_company_sizes (
  company_size_id bigserial not null,
  value text not null,
  created_at timestamptz(6) not null default current_timestamp,
  updated_at timestamptz(6) not null default current_timestamp,
  
  primary key (company_size_id)
);

comment on table public.option_company_sizes is 
  'Stores available company size options';

comment on column public.option_company_sizes.company_size_id is 
  'Primary key identifier';

comment on column public.option_company_sizes.value is 
  'Company size value/name';

-- Table: companies
-- Stores company information
create table public.companies (
  company_id uuid primary key default gen_random_uuid(),
  primary_industry_id bigint,
  company_size_id bigint,
  legal_name text,
  display_name text,
  domain text,
  website_url text,
  linkedin_url text,
  description text,
  logo text,
  country text,
  region text,
  address text,
  postal_code text,
  email text,
  phone text,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  revenue numeric(20, 2),
  capitalization numeric(20, 2),
  currency_code char(3),
  employees integer,
  siccodes text[],
  categories text[],
  technologies text[],
  social_links jsonb,
  diffbot_id text,
  diffbot_uri text,
  fetched_at timestamptz(6) not null default current_timestamp,
  created_at timestamptz(6) not null default current_timestamp,
  updated_at timestamptz(6) not null default current_timestamp,
  
  constraint companies_primary_industry_id_fkey
    foreign key (primary_industry_id)
    references public.option_industries(industry_id)
    on delete set null,
  
  constraint companies_company_size_id_fkey
    foreign key (company_size_id)
    references public.option_company_sizes(company_size_id)
    on delete set null,
  
  constraint companies_diffbot_id_unique
    unique (diffbot_id)
);

comment on table public.companies is 
  'Stores company information';

comment on column public.companies.company_id is 
  'Primary key identifier';

comment on column public.companies.primary_industry_id is 
  'Foreign key to option_industries';

comment on column public.companies.company_size_id is 
  'Foreign key to option_company_sizes';

comment on column public.companies.legal_name is 
  'Legal name of the company';

comment on column public.companies.display_name is 
  'Display name of the company';

comment on column public.companies.domain is 
  'Company domain name';

comment on column public.companies.website_url is 
  'Company website URL';

comment on column public.companies.linkedin_url is 
  'Company LinkedIn URL';

comment on column public.companies.description is 
  'Company description';

comment on column public.companies.logo is 
  'Company logo URL or path';

comment on column public.companies.country is 
  'Company country';

comment on column public.companies.region is 
  'Company region';

comment on column public.companies.address is 
  'Company address';

comment on column public.companies.postal_code is 
  'Company postal code';

comment on column public.companies.email is 
  'Company email address';

comment on column public.companies.phone is 
  'Company phone number';

comment on column public.companies.latitude is 
  'Company location latitude';

comment on column public.companies.longitude is 
  'Company location longitude';

comment on column public.companies.revenue is 
  'Company revenue';

comment on column public.companies.capitalization is 
  'Company market capitalization';

comment on column public.companies.currency_code is 
  'Currency code for revenue and capitalization (ISO 4217)';

comment on column public.companies.employees is 
  'Number of employees';

comment on column public.companies.siccodes is 
  'Standard Industrial Classification codes';

comment on column public.companies.categories is 
  'Company categories';

comment on column public.companies.technologies is 
  'Technologies used by the company';

comment on column public.companies.social_links is 
  'Social media links as JSON';

comment on column public.companies.diffbot_id is 
  'Diffbot entity ID (unique identifier)';

comment on column public.companies.diffbot_uri is 
  'Diffbot entity URI';

comment on column public.companies.fetched_at is 
  'Timestamp when data was fetched from external source';

-- =============================================================================
-- ENUM TYPES for lists
-- =============================================================================

-- List type enum
create type ListType as enum (
  'segment',
  'territory',
  'list'
);

comment on type ListType is 
  'Enum defining list type values';

-- List status enum
create type ListStatus as enum (
  'new',
  'processing',
  'completed',
  'failed'
);

comment on type ListStatus is 
  'Enum defining list status values';

-- List subtype enum
create type ListSubtype as enum (
  'people',
  'company'
);

comment on type ListSubtype is 
  'Enum defining list subtype values';

-- =============================================================================
-- Table: lists
-- =============================================================================

-- Table: lists
-- Stores list information (segments, territories, and lists)
create table public.lists (
  list_id uuid primary key default gen_random_uuid(),
  customer_id uuid not null,
  list_type ListType not null,
  name text not null,
  description text,
  filters jsonb,
  user_id uuid,
  status ListStatus not null default 'new',
  subtype ListSubtype not null,
  is_static boolean not null default false,
  created_at timestamp(3) not null default current_timestamp,
  updated_at timestamp(3) not null default current_timestamp,
  deleted_at timestamp(3),
  
  constraint lists_customer_id_fkey
    foreign key (customer_id)
    references public.customers(customer_id)
    on delete cascade,
  
  constraint lists_user_id_fkey
    foreign key (user_id)
    references public.users(user_id)
    on delete set null
);

comment on table public.lists is 
  'Stores list information including segments, territories, and custom lists';

comment on column public.lists.list_id is 
  'Primary key identifier';

comment on column public.lists.customer_id is 
  'Foreign key to customers';

comment on column public.lists.list_type is 
  'Type of list: segment, territory, or list';

comment on column public.lists.name is 
  'Name of the list';

comment on column public.lists.description is 
  'Description of the list';

comment on column public.lists.filters is 
  'Filter criteria as JSON';

comment on column public.lists.user_id is 
  'Foreign key to users (creator/owner)';

comment on column public.lists.status is 
  'Processing status of the list';

comment on column public.lists.subtype is 
  'Subtype: people or company';

comment on column public.lists.is_static is 
  'Whether the list is static (not dynamically generated)';

comment on column public.lists.created_at is 
  'Timestamp when the list was created';

comment on column public.lists.updated_at is 
  'Timestamp when the list was last updated';

comment on column public.lists.deleted_at is 
  'Timestamp when the list was soft deleted';

-- =============================================================================
-- Table: list_companies
-- =============================================================================

-- Table: list_companies
-- Junction table linking companies to lists
create table public.list_companies (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  list_id uuid not null,
  created_at timestamp(3) not null default current_timestamp,
  
  constraint list_companies_company_id_fkey
    foreign key (company_id)
    references public.companies(company_id)
    on delete cascade,
  
  constraint list_companies_list_id_fkey
    foreign key (list_id)
    references public.lists(list_id)
    on delete cascade,
  
  constraint list_companies_unique
    unique (company_id, list_id)
);

comment on table public.list_companies is 
  'Junction table linking companies to lists';

comment on column public.list_companies.id is 
  'Primary key identifier';

comment on column public.list_companies.company_id is 
  'Foreign key to companies';

comment on column public.list_companies.list_id is 
  'Foreign key to lists';

comment on column public.list_companies.created_at is 
  'Timestamp when the company was added to the list';

-- =============================================================================
-- Table: customer_companies
-- =============================================================================

-- Table: customer_companies
-- Stores customer-specific company information and scoring results
create table public.customer_companies (
  customer_companies_id serial not null,
  customer_id uuid not null,
  company_id uuid not null,
  created_at timestamp(3) not null default current_timestamp,
  updated_at timestamp(3) default current_timestamp,
  name text,
  categories text[],
  revenue numeric(20, 2),
  country text,
  region text,
  email text,
  employees integer,
  last_scoring_results jsonb,
  scoring_results_updated_at timestamptz(6),
  
  primary key (customer_companies_id),
  
  constraint customer_companies_customer_id_fkey
    foreign key (customer_id)
    references public.customers(customer_id)
    on delete cascade,
  
  constraint customer_companies_company_id_fkey
    foreign key (company_id)
    references public.companies(company_id)
    on delete cascade,
  
  constraint customer_companies_unique
    unique (customer_id, company_id)
);

comment on table public.customer_companies is 
  'Stores customer-specific company information and scoring results';

comment on column public.customer_companies.customer_companies_id is 
  'Primary key identifier';

comment on column public.customer_companies.customer_id is 
  'Foreign key to customers';

comment on column public.customer_companies.company_id is 
  'Foreign key to companies';

comment on column public.customer_companies.created_at is 
  'Timestamp when the record was created';

comment on column public.customer_companies.updated_at is 
  'Timestamp when the record was last updated';

comment on column public.customer_companies.name is 
  'Customer-specific company name';

comment on column public.customer_companies.categories is 
  'Customer-specific company categories';

comment on column public.customer_companies.revenue is 
  'Customer-specific revenue information';

comment on column public.customer_companies.country is 
  'Customer-specific country information';

comment on column public.customer_companies.region is 
  'Customer-specific region information';

comment on column public.customer_companies.employees is 
  'Customer-specific employee count';

comment on column public.customer_companies.last_scoring_results is 
  'Last scoring results as JSON';

comment on column public.customer_companies.scoring_results_updated_at is 
  'Timestamp when scoring results were last updated';

-- Index on scoring_results_updated_at for efficient queries
create index customer_companies_scoring_results_updated_at_idx 
  on public.customer_companies(scoring_results_updated_at);

-- =============================================================================
-- Table: company_metadata
-- =============================================================================

-- Table: company_metadata
-- Stores company metadata from Diffbot
create table public.company_metadata (
  company_metadata_id serial not null,
  company_id uuid not null,
  diffbot_json jsonb not null,
  created_at timestamptz(6) not null default current_timestamp,
  updated_at timestamptz(6) not null default current_timestamp,
  
  primary key (company_metadata_id),
  
  constraint company_metadata_company_id_fkey
    foreign key (company_id)
    references public.companies(company_id)
    on delete cascade
);

comment on table public.company_metadata is 
  'Stores company metadata from Diffbot';

comment on column public.company_metadata.company_metadata_id is 
  'Primary key identifier';

comment on column public.company_metadata.company_id is 
  'Foreign key to companies';

comment on column public.company_metadata.diffbot_json is 
  'Diffbot JSON data for the company';

comment on column public.company_metadata.created_at is 
  'Timestamp when the record was created';

comment on column public.company_metadata.updated_at is 
  'Timestamp when the record was last updated';

-- =============================================================================
-- INSERT: Initial industry values
-- =============================================================================

insert into public.option_industries (value) values
  ('aerospace and defense companies'),
  ('aircraft manufacturers'),
  ('aircraft parts manufacturers'),
  ('defense companies'),
  ('defense electronic companies'),
  ('weapons manufacturers'),
  ('military vehicles manufacturers'),
  ('space and satellite manufacturers'),
  ('unmanned aerial system companies'),
  ('agricultural organizations'),
  ('animal farms'),
  ('apiculture organizations'),
  ('fruits and vegetables'),
  ('oilseed and grain farming'),
  ('poultry farms'),
  ('associations and societies'),
  ('communities'),
  ('construction associations'),
  ('educational associations'),
  ('engineering societies'),
  ('financial associations'),
  ('journalism associations'),
  ('law associations'),
  ('library associations'),
  ('social sciences organizations'),
  ('standards organizations'),
  ('youth organizations'),
  ('basic materials companies'),
  ('cement companies'),
  ('ceramics manufacturers'),
  ('chemical companies'),
  ('fertilizer companies'),
  ('paint manufacturers'),
  ('plastic producers'),
  ('glassmaking companies'),
  ('mining companies'),
  ('petrochemical companies'),
  ('pulp and paper companies'),
  ('textile mills manufacturers'),
  ('community services'),
  ('amusement parks'),
  ('art galleries'),
  ('bowling centers'),
  ('cinemas and movie theaters'),
  ('cultural centers'),
  ('fitness and sports centers'),
  ('golf courses and country clubs'),
  ('libraries'),
  ('museums'),
  ('parks and recreation area'),
  ('recreational camps'),
  ('ski resort'),
  ('stadiums and arenas'),
  ('theatres'),
  ('zoos and aquaria'),
  ('construction companies'),
  ('electrical contractors'),
  ('flooring contractors'),
  ('general contractors'),
  ('heating and air conditioning contractors'),
  ('infrastructure construction companies'),
  ('landscaping services'),
  ('painting contractors'),
  ('plumbing contractors'),
  ('power plants construction companies'),
  ('recreational facilities construction companies'),
  ('remodeling and restoration contractors'),
  ('residential building constructors'),
  ('roofing contractors'),
  ('consumer products'),
  ('apparel and accessories companies'),
  ('clothing companies'),
  ('eyewear manufacturers'),
  ('jewelry manufacturers'),
  ('luggage manufacturers'),
  ('pen manufacturers'),
  ('shoe brands'),
  ('sportswear brands'),
  ('underwear brands'),
  ('watch manufacturing companies'),
  ('appliance manufacturers'),
  ('air conditioning companies'),
  ('knife manufacturing'),
  ('beauty care companies'),
  ('beverage companies'),
  ('bottled water companies'),
  ('breweries'),
  ('coffee companies'),
  ('distilleries'),
  ('soft drinks companies'),
  ('tea companies'),
  ('wineries'),
  ('food companies'),
  ('cocoa companies'),
  ('dairy companies'),
  ('furniture manufacturers'),
  ('music instruments manufacturers'),
  ('pet care companies'),
  ('animal food manufacturers'),
  ('sporting goods manufacturers'),
  ('cycle manufacturers'),
  ('toys companies'),
  ('consumer services'),
  ('barber shops'),
  ('beauty salons and spa'),
  ('car washes'),
  ('catering services'),
  ('cleaning companies'),
  ('coworking spaces'),
  ('death care services'),
  ('food delivery services'),
  ('laundry companies'),
  ('locksmith services'),
  ('parking services'),
  ('pest control services'),
  ('pet breeders'),
  ('repair and maintenance'),
  ('appliance repair services'),
  ('computer repair services'),
  ('vehicle repair services'),
  ('wellness facility maintenance services'),
  ('restricted services'),
  ('adult entertainment clubs'),
  ('cannabis companies'),
  ('casinos'),
  ('firearms retailers'),
  ('gambling companies'),
  ('liquor stores'),
  ('tobacco companies'),
  ('tobacco stores'),
  ('shopping delivery services'),
  ('tattoo shops'),
  ('tourism agencies'),
  ('educational organizations'),
  ('educational institutions'),
  ('academies'),
  ('k12 schools'),
  ('universities and colleges'),
  ('research institutes'),
  ('sports schools'),
  ('energy companies'),
  ('coal mining companies'),
  ('nuclear energy companies'),
  ('oil and gas companies'),
  ('oil and gas drilling'),
  ('oil and gas exploration and production'),
  ('oil and gas refining and marketing'),
  ('oil and gas storage and transportation'),
  ('renewable energy companies'),
  ('biomass energy companies'),
  ('geothermal energy companies'),
  ('hydroelectric power companies'),
  ('renewable fuels companies'),
  ('solar energy companies'),
  ('wind energy companies'),
  ('thermal power generation companies'),
  ('environmental organizations'),
  ('climate change organizations'),
  ('nature conservation organizations'),
  ('financial services companies'),
  ('banking services'),
  ('banks'),
  ('credit unions'),
  ('currency and lending services'),
  ('currency exchange services'),
  ('money transfer and remittance services'),
  ('mortgage and loans lenders'),
  ('financial research companies'),
  ('credit rating and reporting services'),
  ('esg research'),
  ('financial data vendors'),
  ('investment research services'),
  ('regulatory and compliance research'),
  ('insurance companies'),
  ('health insurance companies'),
  ('life insurance companies'),
  ('property insurance companies'),
  ('investment companies'),
  ('asset management services'),
  ('brokerage firms'),
  ('business incubators'),
  ('investment management companies'),
  ('stock exchanges'),
  ('wealth management services'),
  ('payment services providers'),
  ('b2b payment services'),
  ('credit and debit card payment processing'),
  ('payment cards providers'),
  ('payment technology solutions'),
  ('hospitality companies'),
  ('food and drink companies'),
  ('bars'),
  ('cafes'),
  ('fast food restaurants'),
  ('restaurants'),
  ('tourist accommodations'),
  ('campgrounds'),
  ('cruise lines'),
  ('hostels and motels'),
  ('hotels'),
  ('resorts'),
  ('manufacturing companies'),
  ('agricultural machinery manufacturers'),
  ('construction equipment manufacturers'),
  ('construction supplies manufacturers'),
  ('electrical components manufacturers'),
  ('batteries manufacturers'),
  ('electronic components manufacturers'),
  ('energy equipment manufacturers'),
  ('oil and gas equipment manufacturers'),
  ('photovoltaics manufacturers'),
  ('wind turbine manufacturers'),
  ('engine manufacturers'),
  ('industrial machinery manufacturers'),
  ('medical equipment manufacturers'),
  ('motor vehicle manufacturers'),
  ('bus manufacturers'),
  ('car manufacturers'),
  ('motorcycle manufacturers'),
  ('shipbuilding companies'),
  ('truck manufacturers'),
  ('packaging manufacturers'),
  ('self-service machine manufacturers'),
  ('tool manufacturers'),
  ('vehicle parts manufacturers'),
  ('tires manufacturers'),
  ('media and information companies'),
  ('broadcasting companies'),
  ('radio stations'),
  ('television broadcasting companies'),
  ('digital publishing companies'),
  ('financial news publishers'),
  ('news agencies'),
  ('news aggregators publishers'),
  ('online news publishers'),
  ('price comparison platform'),
  ('reviews platform'),
  ('digital streaming companies'),
  ('music streaming services'),
  ('podcast hosting platforms'),
  ('video streaming services'),
  ('entertainment production companies'),
  ('animation studios'),
  ('film companies'),
  ('music companies'),
  ('publishing companies'),
  ('book publishing companies'),
  ('comics publishing companies'),
  ('education publishing company'),
  ('magazine publishing companies'),
  ('newspaper publishing companies'),
  ('science publishing companies'),
  ('medical organizations'),
  ('alternative medicine organizations'),
  ('biotechnology companies'),
  ('counseling organizations'),
  ('dental companies'),
  ('health care companies'),
  ('home health care'),
  ('hospitals'),
  ('medical associations'),
  ('medical laboratories'),
  ('mental health organizations'),
  ('optometrists'),
  ('pharmaceutical companies'),
  ('physiotherapy organization'),
  ('public health organizations'),
  ('veterinary organizations'),
  ('performing arts companies'),
  ('dance groups'),
  ('musical groups'),
  ('theatre companies'),
  ('professional service companies'),
  ('airports services'),
  ('architectural services'),
  ('architecture firms'),
  ('interior design services'),
  ('business services'),
  ('benefits consulting services'),
  ('corporate training services'),
  ('management consulting services'),
  ('payroll services'),
  ('sales consulting services'),
  ('energy management services'),
  ('engineering consulting firms'),
  ('event management services'),
  ('finance services'),
  ('accounting services'),
  ('auditing services'),
  ('bookkeeping services'),
  ('financial consulting services'),
  ('tax services'),
  ('graphic design services'),
  ('legal services'),
  ('logistics services'),
  ('freight forwarding services'),
  ('moving and storage services'),
  ('postal services'),
  ('market research services'),
  ('marketing services'),
  ('advertising services'),
  ('branding services'),
  ('content marketing services'),
  ('content writing services'),
  ('lead generation services'),
  ('public relations services'),
  ('search engine marketing services'),
  ('social media marketing services'),
  ('video production services'),
  ('website design services'),
  ('photographic studios'),
  ('polling companies'),
  ('private security companies'),
  ('recruitment and staffing services'),
  ('hr services providers'),
  ('peo providers'),
  ('research and development organizations'),
  ('translation services'),
  ('public administration'),
  ('courts'),
  ('embassies and consulates'),
  ('fire departments'),
  ('government agencies'),
  ('intelligence agency'),
  ('regulatory agency'),
  ('government departments'),
  ('intergovernmental organizations'),
  ('international organizations'),
  ('local governments'),
  ('military bases'),
  ('military related organizations'),
  ('ministries'),
  ('police departments'),
  ('political parties'),
  ('real estate companies'),
  ('real estate investment management'),
  ('real estate investment trusts'),
  ('religious organizations'),
  ('places of worship'),
  ('religious administrative units'),
  ('retailers'),
  ('apparel retailers'),
  ('clothing retailers'),
  ('footwear retailers'),
  ('lingerie retailers'),
  ('auction houses'),
  ('automotive retailers'),
  ('automotive part retailers'),
  ('vehicle retailers and dealership'),
  ('bookstores'),
  ('construction supplies retailers'),
  ('floor covering retailers'),
  ('hardware retailers'),
  ('plumbing equipment retailers'),
  ('consumer electronics retailers'),
  ('convenience stores'),
  ('department stores'),
  ('floral retailers'),
  ('food retailers'),
  ('food markets'),
  ('food trucks'),
  ('supermarkets'),
  ('furniture retailers'),
  ('gas station'),
  ('music retailers'),
  ('online retailers'),
  ('personal accessories retailers'),
  ('eyewear retailers'),
  ('jewelry retailers'),
  ('pet stores'),
  ('pharmacies'),
  ('photographic equipment stores'),
  ('sporting goods retailers'),
  ('toy and video game retailers'),
  ('used merchandise retailers'),
  ('vending machine operators'),
  ('sport organizations'),
  ('sports clubs'),
  ('technology companies'),
  ('autonomous vehicles'),
  ('computer hardware companies'),
  ('computer devices companies'),
  ('computer peripherals companies'),
  ('networking equipment companies'),
  ('storage devices companies'),
  ('electronic products companies'),
  ('audio equipment manufacturers'),
  ('cameras manufacturers'),
  ('entertainment systems companies'),
  ('mobile phones companies'),
  ('smart devices companies'),
  ('wearable technology companies'),
  ('financial technology companies'),
  ('banking technology companies'),
  ('crowdfunding technology companies'),
  ('cryptocurrency companies'),
  ('information technology services companies'),
  ('development services providers'),
  ('implementation services providers'),
  ('security services providers'),
  ('medical technology companies'),
  ('optics manufacturing companies'),
  ('robotics companies'),
  ('semiconductor companies'),
  ('software companies'),
  ('accounting and finance software'),
  ('agriculture software'),
  ('apparel software'),
  ('artificial intelligence software'),
  ('association management software'),
  ('auction software'),
  ('automotive software'),
  ('aviation software'),
  ('blockchain software'),
  ('child care software'),
  ('collaboration and productivity software'),
  ('commerce software'),
  ('communication software'),
  ('construction software'),
  ('content aggregation software'),
  ('content management systems'),
  ('creative software'),
  ('customer service software'),
  ('data analytics software'),
  ('data management software'),
  ('data privacy software'),
  ('development software'),
  ('digital advertising software'),
  ('e-commerce software'),
  ('education management software'),
  ('education platforms'),
  ('energy management software'),
  ('equipment rental software'),
  ('event management software'),
  ('financial services software'),
  ('fitness software'),
  ('food software'),
  ('fundraising software'),
  ('grant management software'),
  ('hr software'),
  ('health care software'),
  ('hospitality software'),
  ('hosting providers'),
  ('it infrastructure software'),
  ('it management software'),
  ('iot management platforms'),
  ('laboratory software'),
  ('legal software'),
  ('life sciences software'),
  ('logistics software'),
  ('marine software'),
  ('marketing software'),
  ('nonprofit software'),
  ('office software'),
  ('oil and gas software'),
  ('open source software companies'),
  ('parking management software'),
  ('parks and recreation software'),
  ('physical security software'),
  ('political campaign software'),
  ('property management software'),
  ('public safety software'),
  ('real estate software'),
  ('retail software'),
  ('sales tools'),
  ('security software'),
  ('social network platforms'),
  ('software as a service companies'),
  ('sports software'),
  ('sustainability management software'),
  ('tickets registration platforms'),
  ('translation software'),
  ('travel software'),
  ('veterinary software'),
  ('video software'),
  ('virtual and augmented reality software'),
  ('waste management software'),
  ('telecommunications companies'),
  ('internet service providers'),
  ('telco infrastructure equipment companies'),
  ('video game companies'),
  ('transport companies'),
  ('airlines'),
  ('ferry companies'),
  ('public transport operators'),
  ('railway companies'),
  ('ridesharing and taxi companies'),
  ('vehicle rental companies'),
  ('utility companies'),
  ('electricity distribution companies'),
  ('gas distribution companies'),
  ('heat distribution companies'),
  ('waste and recycling companies'),
  ('recycling companies'),
  ('water distribution companies'),
  ('pre schools'),
  ('primary schools'),
  ('secondary schools'),
  ('online university'),
  ('central banks'),
  ('hedge funds'),
  ('pension funds'),
  ('private equity firms'),
  ('venture capital firms'),
  ('credit card providers'),
  ('fuel card providers'),
  ('prepaid card providers'),
  ('digital payment gateways'),
  ('digital wallet services'),
  ('installment payment and bnpl services'),
  ('mobile payment services'),
  ('peer-to-peer payment services'),
  ('point-of-sale services'),
  ('electric vehicles'),
  ('television news networks'),
  ('children clothing retailers'),
  ('mobile app development companies'),
  ('testing and qa providers'),
  ('web applications developers'),
  ('accounting software'),
  ('accounts payable automation software'),
  ('billing software'),
  ('budgeting and forecasting software'),
  ('expense management software'),
  ('financial close software'),
  ('financial wellness software'),
  ('invoice management software'),
  ('order management software'),
  ('revenue management software'),
  ('travel management software'),
  ('ai writing assistants'),
  ('computer vision software'),
  ('conversational intelligence software'),
  ('data science and machine learning platforms'),
  ('natural language processing software'),
  ('image recognition software'),
  ('chatbots software'),
  ('text to speech software'),
  ('voice recognition software'),
  ('board management software'),
  ('idea management software'),
  ('note-taking software'),
  ('objectives and key results software'),
  ('productivity bots software'),
  ('team collaboration software'),
  ('text editor software'),
  ('employee communications software'),
  ('instant messaging software'),
  ('voip providers'),
  ('web conferencing software'),
  ('webinar platforms'),
  ('bookmarking tools'),
  ('rss feed readers'),
  ('cloud content collaboration software'),
  ('digital asset management software'),
  ('digital experience platforms'),
  ('mobile forms automation software'),
  ('online form builder software'),
  ('user-generated content software'),
  ('virtual data room software'),
  ('web content management software'),
  ('website builder software'),
  ('3d design software'),
  ('audio editing software'),
  ('display ad design software'),
  ('graphic design software'),
  ('photography software'),
  ('software design software'),
  ('stock media platforms'),
  ('video editing software'),
  ('call & contact center software'),
  ('conversational support software'),
  ('customer self-service software'),
  ('customer success software'),
  ('enterprise feedback management software'),
  ('experience management software'),
  ('feedback analytics software'),
  ('field service management software'),
  ('help desk software'),
  ('live chat software'),
  ('social customer service software'),
  ('speech analytics software'),
  ('analytics platforms'),
  ('business intelligence software'),
  ('data visualization tools'),
  ('enterprise search software'),
  ('predictive analytics software'),
  ('text analysis software'),
  ('data extraction software'),
  ('data integration software'),
  ('data labeling software'),
  ('data management tools'),
  ('data migration software'),
  ('data quality tools'),
  ('data warehouse solutions'),
  ('database software'),
  ('etl tools'),
  ('knowledge base software'),
  ('identity verification software'),
  ('application development software'),
  ('devops software'),
  ('software testing tools'),
  ('cross-channel advertising software'),
  ('data management platforms'),
  ('demand side platform'),
  ('display advertising software'),
  ('mobile advertising software'),
  ('publisher ad management software'),
  ('search advertising software'),
  ('social media advertising software'),
  ('video advertising software'),
  ('catalog management software'),
  ('drop shipping software'),
  ('e-commerce analytics software'),
  ('e-commerce personalization software'),
  ('e-commerce platforms'),
  ('e-commerce search software'),
  ('e-commerce tools'),
  ('e-commerce fraud protection software'),
  ('marketplace software'),
  ('mobile e-commerce software'),
  ('multichannel retail software'),
  ('online marketplace optimization tools'),
  ('product information management systems'),
  ('review management software'),
  ('subscription management software'),
  ('learning management systems'),
  ('library management systems'),
  ('mentoring software'),
  ('school management software'),
  ('code development education platforms'),
  ('language education platforms'),
  ('training elearning software'),
  ('financial analytics software'),
  ('insurance software'),
  ('investment management software'),
  ('loan software'),
  ('benefits administration software'),
  ('compensation management software'),
  ('corporate performance management software'),
  ('employee engagement software'),
  ('employee monitoring software'),
  ('employee recognition software'),
  ('employee scheduling software'),
  ('hr analytics software'),
  ('hr case management software'),
  ('job board platforms'),
  ('payroll software'),
  ('performance management systems'),
  ('portfolio board platforms'),
  ('recruiting software'),
  ('talent management software'),
  ('time tracking software'),
  ('workforce management software'),
  ('clinical communication and collaboration software'),
  ('clinical documentation software'),
  ('disease management software'),
  ('ehr software'),
  ('hipaa compliant messaging software'),
  ('healthcare analytics software'),
  ('healthcare claims management software'),
  ('healthcare hr software'),
  ('home health care software'),
  ('medical 3d visualization software'),
  ('medical billing software'),
  ('medical practice management software'),
  ('medical transcription software'),
  ('mental health software'),
  ('patient experience software'),
  ('pharmacy management software'),
  ('population health management software'),
  ('provider data management software'),
  ('radiology information systems'),
  ('revenue cycle management software'),
  ('telemedicine software'),
  ('wellness software'),
  ('hotel management software'),
  ('reservation software'),
  ('restaurant management software'),
  ('spa and salon management software'),
  ('vacation rental platforms'),
  ('content delivery network software'),
  ('domain registration providers'),
  ('managed dns providers software'),
  ('web hosting providers'),
  ('cloud file storage software'),
  ('data center management software'),
  ('data recovery software'),
  ('data transfer tools'),
  ('load balancing software'),
  ('monitoring software'),
  ('network management tools'),
  ('operating systems'),
  ('remote desktop software'),
  ('remote support software'),
  ('server virtualization software'),
  ('storage management software'),
  ('virtual desktop infrastructure software'),
  ('application portfolio management software'),
  ('cloud management software'),
  ('data governance software'),
  ('enterprise mobility management software'),
  ('it asset management software'),
  ('it service management tools'),
  ('mobile device management software'),
  ('ocr software'),
  ('process automation software'),
  ('account-based marketing software'),
  ('affiliate marketing software'),
  ('audience response software'),
  ('content marketing software'),
  ('conversational marketing software'),
  ('conversion rate optimization tools'),
  ('customer data platforms'),
  ('customer journey analytics software'),
  ('demand generation software'),
  ('digital analytics software'),
  ('digital signage software'),
  ('email deliverability tools'),
  ('email marketing software'),
  ('email template builder software'),
  ('inbound call tracking software'),
  ('local marketing software'),
  ('market intelligence software'),
  ('marketing analytics software'),
  ('marketing automation software'),
  ('marketing resource management software'),
  ('mobile marketing software'),
  ('online community management software'),
  ('online reputation management software'),
  ('personalization engines'),
  ('personalization software'),
  ('print fulfillment software'),
  ('public relations software'),
  ('push notification software'),
  ('rewards and incentives software'),
  ('seo tools'),
  ('sms marketing software'),
  ('social media marketing software'),
  ('transactional email software'),
  ('user research software'),
  ('calendar software'),
  ('document creation software'),
  ('email software'),
  ('emergency notification software'),
  ('meeting room booking systems'),
  ('online appointment scheduling software'),
  ('pdf editor software'),
  ('presentation software'),
  ('survey software'),
  ('visitor management software'),
  ('writing assistants software'),
  ('ai sales assistant software'),
  ('crm software'),
  ('contract management software'),
  ('e-signature software'),
  ('erp software'),
  ('field sales software'),
  ('partner management software'),
  ('quote management software'),
  ('sales acceleration software'),
  ('sales analytics software'),
  ('sales gamification software'),
  ('sales intelligence software'),
  ('antivirus software'),
  ('cloud security software'),
  ('data security software'),
  ('devsecops software'),
  ('email security software'),
  ('encryption software'),
  ('endpoint protection software'),
  ('identity management software'),
  ('network security software'),
  ('risk assessment software'),
  ('security awareness training software'),
  ('vulnerability management software'),
  ('web security software'),
  ('dating platforms'),
  ('live stream software'),
  ('video cms software'),
  ('video hosting platforms'),
  ('3d printing software'),
  ('cad software'),
  ('virtual tour software'),
  ('collaborative whiteboard software'),
  ('employee intranet software'),
  ('meeting management software'),
  ('screen sharing software'),
  ('application development platforms'),
  ('cloud platform as a service software'),
  ('integrated development environments'),
  ('low-code development platforms'),
  ('mobile development software'),
  ('no-code development platforms'),
  ('web frameworks'),
  ('aiops tools'),
  ('automation testing'),
  ('bug tracking software'),
  ('ci/cd tools'),
  ('containerization software'),
  ('load testing tools'),
  ('version control software'),
  ('account-based data software'),
  ('account-based execution software'),
  ('content analytics software'),
  ('content creation software'),
  ('content curation software'),
  ('content distribution software'),
  ('content experience platforms'),
  ('landing page builders'),
  ('product analytics software'),
  ('brand advocacy software'),
  ('lead generation software'),
  ('loyalty management software'),
  ('media monitoring software'),
  ('media and influencer targeting software'),
  ('influencer marketing platforms'),
  ('social media analytics software'),
  ('social media management tools'),
  ('social media monitoring tools'),
  ('document generation software'),
  ('asset management software'),
  ('environmental health and safety software'),
  ('manufacturing software'),
  ('procurement software'),
  ('product management software'),
  ('professional services automation software'),
  ('project management software'),
  ('quality management systems'),
  ('strategy and innovation roadmapping tools'),
  ('email tracking software'),
  ('outbound call tracking software'),
  ('sales coaching software'),
  ('sales conversation intelligence software'),
  ('sales enablement software'),
  ('sales engagement software'),
  ('sales performance management software'),
  ('sales training and onboarding software'),
  ('applicant tracking systems'),
  ('employee referral software'),
  ('onboarding software'),
  ('pre-employment screening software'),
  ('recruiting automation software'),
  ('talent acquisition suites software'),
  ('technical skills screening software'),
  ('backup software'),
  ('application performance monitoring tools'),
  ('cloud infrastructure monitoring software'),
  ('database monitoring tools'),
  ('enterprise monitoring software'),
  ('log monitoring software'),
  ('network monitoring software'),
  ('server monitoring software'),
  ('website monitoring software'),
  ('incident management software'),
  ('business process management software'),
  ('digital process automation software'),
  ('robotic process automation software'),
  ('workflow management software'),
  ('distribution software'),
  ('inventory management software'),
  ('shipping software'),
  ('supply chain management software');

-- =============================================================================
-- INSERT: Initial company size values
-- =============================================================================

insert into public.option_company_sizes (value) values
  ('1-10 employees'),
  ('11-50 employees'),
  ('51-200 employees'),
  ('201-500 employees'),
  ('501-1000 employees'),
  ('1001-5000 employees'),
  ('5001-10,000 employees'),
  ('10,001+ employees');
