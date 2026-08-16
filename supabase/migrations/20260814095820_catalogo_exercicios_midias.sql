-- Catálogo canônico e mídia versionada dos exercícios do BT Performance.
-- O app tem somente leitura. Importação/administração ocorre por ambiente confiável.

alter table public.bt_biblioteca_exercicios
  add column if not exists nome_curto text,
  add column if not exists descricao_curta text,
  add column if not exists padrao_movimento text,
  add column if not exists capacidade text,
  add column if not exists regiao text,
  add column if not exists equipamento text[] not null default '{}',
  add column if not exists complexidade text,
  add column if not exists lateralidade text,
  add column if not exists papel_treino text[] not null default '{}',
  add column if not exists instrucoes text[] not null default '{}',
  add column if not exists criterios_interrupcao text[] not null default '{}',
  add column if not exists restricoes text[] not null default '{}',
  add column if not exists ativo boolean not null default true,
  add column if not exists versao integer not null default 1,
  add column if not exists atualizado_em timestamptz not null default now();

do $$ begin
  alter table public.bt_biblioteca_exercicios
    add constraint bt_exercicio_complexidade_check
    check (complexidade is null or complexidade in ('basico','intermediario','avancado'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.bt_biblioteca_exercicios
    add constraint bt_exercicio_lateralidade_check
    check (lateralidade is null or lateralidade in ('bilateral','unilateral','alternado','multidirecional'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.bt_biblioteca_exercicios
    add constraint bt_exercicio_versao_check check (versao > 0);
exception when duplicate_object then null; end $$;

create table if not exists public.bt_exercicio_midias (
  id bigint generated always as identity primary key,
  exercicio_id text not null references public.bt_biblioteca_exercicios(exercicio_id) on update cascade on delete restrict,
  storage_bucket text not null default 'bt-exercicios',
  storage_path text not null,
  tipo text not null check (tipo in ('gif','video','imagem')),
  demonstrador text not null default 'neutro' check (demonstrador in ('feminino','masculino','neutro')),
  angulo text not null default 'lateral' check (angulo in ('lateral','frontal','diagonal','outro')),
  finalidade text not null default 'execucao' check (finalidade in ('execucao','educativo','erro_comum')),
  mime_type text,
  largura integer check (largura is null or largura > 0),
  altura integer check (altura is null or altura > 0),
  duracao_ms integer check (duracao_ms is null or duracao_ms > 0),
  tamanho_bytes bigint check (tamanho_bytes is null or tamanho_bytes > 0),
  checksum_sha256 text,
  fonte text,
  fonte_arquivo text,
  ordem smallint not null default 0,
  versao integer not null default 1 check (versao > 0),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (storage_bucket, storage_path)
);

create index if not exists bt_exercicio_midias_exercicio_ativo
  on public.bt_exercicio_midias (exercicio_id, ativo, ordem);

create unique index if not exists bt_exercicio_midias_variante_atual
  on public.bt_exercicio_midias (exercicio_id, demonstrador, angulo, finalidade)
  where ativo;

-- Metadados iniciais derivados dos grupos já validados pelo motor fechado.
update public.bt_biblioteca_exercicios
set
  nome_curto = coalesce(nome_curto, nome),
  padrao_movimento = coalesce(padrao_movimento, case
    when grupo = 'centro' then 'estabilidade-core'
    when grupo = 'membros-inferiores' then 'membros-inferiores'
    when grupo = 'membros-superiores' then 'membros-superiores'
    when grupo = 'lancamentos' then 'rotacional'
    when grupo = 'pliometria' then 'pliometria'
    when grupo = 'areia-cod' then 'mudanca-direcao'
    when grupo = 'areia-aceleracao' then 'locomocao-aceleracao'
    else grupo end),
  capacidade = coalesce(capacidade, case
    when grupo = 'centro' then 'estabilidade'
    when grupo in ('membros-inferiores','membros-superiores') then 'forca'
    when grupo = 'lancamentos' then 'potencia-rotacional'
    when grupo = 'pliometria' then 'reatividade'
    when grupo = 'areia-cod' then 'mudanca-direcao'
    when grupo = 'areia-aceleracao' then 'aceleracao'
    else null end),
  regiao = coalesce(regiao, case
    when grupo = 'centro' then 'core'
    when grupo = 'membros-inferiores' then 'membros-inferiores'
    when grupo = 'membros-superiores' then 'membros-superiores'
    when grupo = 'lancamentos' then 'corpo-inteiro'
    when grupo in ('pliometria','areia-cod','areia-aceleracao') then 'membros-inferiores'
    else null end),
  papel_treino = case when cardinality(papel_treino) = 0 then case
    when grupo = 'centro' then array['acessorio','prevencao']
    when grupo in ('membros-inferiores','membros-superiores') then array['principal']
    when grupo in ('lancamentos','pliometria','areia-cod','areia-aceleracao') then array['principal','potencia']
    else '{}'::text[] end else papel_treino end,
  atualizado_em = now();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'bt-exercicios',
  'bt-exercicios',
  false,
  26214400,
  array['image/gif','image/webp','image/jpeg','image/png','video/mp4','video/webm']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.bt_exercicio_midias enable row level security;

drop policy if exists bt_exercicio_midias_leitura on public.bt_exercicio_midias;
create policy bt_exercicio_midias_leitura
on public.bt_exercicio_midias for select
to authenticated
using (
  ativo and exists (
    select 1 from public.bt_perfis p
    where p.user_id = (select auth.uid())
      and p.papel in ('treinador','atleta')
  )
);

-- O cliente autenticado só lê o bucket. Upload/alteração são tarefas administrativas.
drop policy if exists bt_exercicios_storage_leitura on storage.objects;
create policy bt_exercicios_storage_leitura
on storage.objects for select
to authenticated
using (
  bucket_id = 'bt-exercicios'
  and exists (
    select 1 from public.bt_perfis p
    where p.user_id = (select auth.uid())
      and p.papel in ('treinador','atleta')
  )
);

revoke all on table public.bt_exercicio_midias from anon;
grant select on table public.bt_exercicio_midias to authenticated;
grant select on table public.bt_biblioteca_exercicios to authenticated;
