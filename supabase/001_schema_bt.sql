-- BT Performance — schema v1 (espelha os 6 CSVs de bt-performance-lab/dados/)
-- Projeto Supabase: rkoqcvylamvnkxnaegna (compartilhado — por isso tudo prefixado bt_)
-- Rodar no SQL Editor ou via `supabase db push`.

-- ── Perfis (auth por papel: treinador | atleta) ─────────────────────────────
create table if not exists bt_perfis (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  papel       text not null check (papel in ('treinador','atleta')),
  nome        text not null,
  atleta_id   text,            -- preenchido quando papel='atleta'
  criado_em   timestamptz not null default now()
);

-- ── 1. Atletas ──────────────────────────────────────────────────────────────
create table if not exists bt_atletas (
  atleta_id        text primary key,
  nome             text not null,
  data_nascimento  date,
  sexo             text,
  altura_cm        numeric,
  massa_kg         numeric,
  lado_dominante   text,
  lado_quadra      text,
  categoria        text,
  ranking_itf      integer,
  ranking_nacional integer,
  data_inicio      date,
  status           text not null default 'ativo',
  observacoes      text
);

-- ── 2. Avaliações físicas (formato longo: 1 linha = 1 variável medida) ─────
create table if not exists bt_avaliacoes (
  avaliacao_id text,
  atleta_id    text not null references bt_atletas(atleta_id),
  data         date not null,
  fase         text,
  teste        text not null,
  variavel     text not null,
  valor        numeric,
  unidade      text,
  tentativas   integer,
  equipamento  text,
  observacoes  text,
  id           bigint generated always as identity primary key
);
create index if not exists bt_avaliacoes_atleta_data on bt_avaliacoes (atleta_id, data desc);

-- ── 3. Monitoramento diário (wellness 1–5 onde 5=melhor; dor 0–10) ─────────
create table if not exists bt_monitoramento_diario (
  data                date not null,
  atleta_id           text not null references bt_atletas(atleta_id),
  sono_horas          numeric,
  qualidade_sono      integer check (qualidade_sono between 1 and 5),
  fadiga              integer check (fadiga between 1 and 5),
  dor_muscular        integer check (dor_muscular between 1 and 5),
  estresse            integer check (estresse between 1 and 5),
  humor               integer check (humor between 1 and 5),
  dor_regiao          text,
  dor_intensidade_0a10 integer check (dor_intensidade_0a10 between 0 and 10),
  lesao_ativa         boolean default false,
  observacoes         text,
  primary key (atleta_id, data)
);

-- ── 4. Carga de sessões (sRPE; derivados são sempre calculados, nunca gravados)
create table if not exists bt_carga_sessoes (
  data            date not null,
  atleta_id       text not null references bt_atletas(atleta_id),
  tipo            text not null,   -- fisico | tecnica | tatica | jogo-treino | jogo-oficial | regenerativo...
  duracao_min     integer,
  pse_0a10        numeric check (pse_0a10 between 0 and 10),
  sets_disputados integer,
  superficie      text,
  condicao_areia  text,
  observacoes     text,
  id              bigint generated always as identity primary key
);
create index if not exists bt_carga_atleta_data on bt_carga_sessoes (atleta_id, data desc);

-- ── 5. Torneios ─────────────────────────────────────────────────────────────
create table if not exists bt_torneios (
  torneio_id       text,
  atleta_id        text not null references bt_atletas(atleta_id),
  nome             text not null,
  categoria        text,
  data_inicio      date,
  data_fim         date,
  local            text,
  prioridade       text,
  resultado        text,
  jogos_disputados integer,
  observacoes      text,
  id               bigint generated always as identity primary key
);

-- ── 6. Viagens ──────────────────────────────────────────────────────────────
create table if not exists bt_viagens (
  viagem_id          text,
  atleta_id          text not null references bt_atletas(atleta_id),
  data_ida           date,
  data_volta         date,
  destino            text,
  motivo             text,
  horas_deslocamento numeric,
  fuso_horas         numeric,
  observacoes        text,
  id                 bigint generated always as identity primary key
);

-- ── Decisão da Semana (saída do /fechar-semana; decisão humana final vale) ─
create table if not exists bt_decisoes_semana (
  atleta_id        text not null references bt_atletas(atleta_id),
  semana_inicio    date not null,
  tipo_semana      text check (tipo_semana in ('TREINO','PRE-COMPETICAO','VIAGEM','COMPETICAO','POS-COMPETICAO')),
  decisao_sugerida text check (decisao_sugerida in ('PROGREDIR','MANTER','REDUZIR','DESCARREGAR','ENCAMINHAR')),
  confianca        text check (confianca in ('ALTA','MEDIA','BAIXA')),
  justificativa    text,
  decisao_final    text,           -- preenchida pelo Lucas; é a que vale
  decidido_em      timestamptz,
  primary key (atleta_id, semana_inicio)
);

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table bt_perfis               enable row level security;
alter table bt_atletas              enable row level security;
alter table bt_avaliacoes           enable row level security;
alter table bt_monitoramento_diario enable row level security;
alter table bt_carga_sessoes        enable row level security;
alter table bt_torneios             enable row level security;
alter table bt_viagens              enable row level security;
alter table bt_decisoes_semana      enable row level security;

create or replace function bt_papel() returns text
language sql stable security definer set search_path = public as
$$ select papel from bt_perfis where user_id = auth.uid() $$;

create or replace function bt_meu_atleta() returns text
language sql stable security definer set search_path = public as
$$ select atleta_id from bt_perfis where user_id = auth.uid() $$;

-- perfil: cada um vê o próprio
create policy perfil_proprio on bt_perfis for select using (user_id = auth.uid());

-- treinador lê e escreve tudo; atleta lê só o que é dele
create policy treinador_tudo_atletas  on bt_atletas              for all    using (bt_papel() = 'treinador');
create policy atleta_le_proprio       on bt_atletas              for select using (atleta_id = bt_meu_atleta());
create policy treinador_tudo_aval     on bt_avaliacoes           for all    using (bt_papel() = 'treinador');
create policy atleta_le_aval          on bt_avaliacoes           for select using (atleta_id = bt_meu_atleta());
create policy treinador_tudo_monit    on bt_monitoramento_diario for all    using (bt_papel() = 'treinador');
create policy atleta_rw_monit         on bt_monitoramento_diario for all    using (atleta_id = bt_meu_atleta());  -- check-in é do atleta
create policy treinador_tudo_carga    on bt_carga_sessoes        for all    using (bt_papel() = 'treinador');
create policy atleta_rw_carga         on bt_carga_sessoes        for all    using (atleta_id = bt_meu_atleta());  -- RPE pós-treino
create policy treinador_tudo_torneios on bt_torneios             for all    using (bt_papel() = 'treinador');
create policy atleta_le_torneios      on bt_torneios             for select using (atleta_id = bt_meu_atleta());
create policy treinador_tudo_viagens  on bt_viagens              for all    using (bt_papel() = 'treinador');
create policy atleta_le_viagens       on bt_viagens              for select using (atleta_id = bt_meu_atleta());
create policy treinador_tudo_decisoes on bt_decisoes_semana      for all    using (bt_papel() = 'treinador');
create policy atleta_le_decisoes      on bt_decisoes_semana      for select using (atleta_id = bt_meu_atleta());
