-- ============================================================================
-- BT Performance — SCHEMA CANÔNICO v2 (F1 da Arquitetura V2 · 2026-06-11)
-- Substitui integralmente o schema v1 (que nunca foi aplicado — fonte única).
-- Projeto Supabase: compartilhado btjsweysefmbceqqlyxx (decisão 2026-06-11;
--   por isso tudo prefixado bt_). APLICADO em 2026-06-11 via SQL API e validado
--   (tabelas, view, seeds, checks e RLS por papel — inclusive security_invoker).
-- Especificação: bt-performance-lab/docs/F1_MODELO_CANONICO_APP.md
-- Escalas/réguas/vocabulários: bt-performance-lab/CANONICAL_MODEL.md (v1.2)
-- ============================================================================

-- ── Perfis (auth por papel) ─────────────────────────────────────────────────
create table if not exists bt_perfis (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  papel       text not null check (papel in ('treinador','atleta')),
  nome        text not null,
  atleta_id   text,            -- preenchido quando papel='atleta'
  criado_em   timestamptz not null default now()
);

-- ── 1. Atletas (+ anamnese de 1ª classe, grupo e tenant mínimo — F1 §1.7) ──
create table if not exists bt_atletas (
  atleta_id        text primary key,
  treinador_id     uuid references bt_perfis(user_id),   -- tenant mínimo: dono do atleta
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
  status           text not null default 'ativo' check (status in ('ativo','lesionado','off-season')),
  grupo            text,                                  -- nível 2 (V2) — agrupamento livre
  -- anamnese mínima do motor (antes em observacoes texto livre)
  disponibilidade_semanal integer,                        -- treinos físicos/semana
  acesso_academia  boolean,
  acesso_areia     boolean,
  experiencia_forca text check (experiencia_forca in ('nenhuma','baixa','media','alta')),
  tolerancia_plio  text check (tolerancia_plio in ('nunca','basica','avancada')),
  objetivo         text,
  observacoes      text
);

-- ── 2. Avaliações físicas (formato longo; slugs do CANONICAL §6) ───────────
-- Bateria obrigatória V2: cmj, sj, sprint_5m, sprint_10m, mb_lateral_d, mb_lateral_e
create table if not exists bt_avaliacoes (
  id           bigint generated always as identity primary key,
  avaliacao_id text,                 -- <atleta_id>-<data>
  atleta_id    text not null references bt_atletas(atleta_id),
  data         date not null,
  fase         text check (fase in ('base','pre-competitivo','competitivo','transicao')),
  teste        text not null,       -- slug canônico (cmj, sj, sprint_5m, ...)
  variavel     text not null,
  valor        numeric,
  unidade      text,
  tentativas   text,                 -- F1 §1.4: lista "39.1;39.8;39.5" (era integer no v1 — bug)
  equipamento  text,
  observacoes  text
);
create index if not exists bt_avaliacoes_atleta_data on bt_avaliacoes (atleta_id, data desc);

-- ── 3. Wellness canônico (CANONICAL §2 — campos renomeados; 5 = melhor) ────
-- DOR SAIU DESTA TABELA (vira bt_dor_registros). Prontidão NUNCA é gravada (view).
create table if not exists bt_monitoramento_diario (
  atleta_id            text not null references bt_atletas(atleta_id),
  data                 date not null,
  sono_horas           numeric,
  qualidade_sono       integer check (qualidade_sono between 1 and 5),
  energia              integer check (energia between 1 and 5),               -- era "fadiga"
  recuperacao_muscular integer check (recuperacao_muscular between 1 and 5),  -- era "dor_muscular"
  tranquilidade        integer check (tranquilidade between 1 and 5),         -- era "estresse"
  humor                integer check (humor between 1 and 5),
  observacoes          text,
  primary key (atleta_id, data)
);

-- ── 3b. Dor — registros próprios, N por dia (CANONICAL §1; F1 §1.2) ────────
create table if not exists bt_dor_registros (
  id               bigint generated always as identity primary key,
  atleta_id        text not null references bt_atletas(atleta_id),
  data             date not null,
  regiao           text not null,
  intensidade_0a10 integer not null check (intensidade_0a10 between 0 and 10),
  altera_movimento boolean default false,   -- exigido pela régua do dia (motor §8.3)
  em_impacto       boolean default false,
  observacoes      text
);
create index if not exists bt_dor_atleta_data on bt_dor_registros (atleta_id, data desc);

-- ── 3c. Prontidão v1 — DERIVADA, nunca digitada (CANONICAL §3) ──────────────
-- security_invoker: sem isso a view roda como dona (postgres) e VAZA dados
-- ignorando a RLS das tabelas-base (vazamento encontrado e corrigido 2026-06-11)
create or replace view bt_prontidao_v1 with (security_invoker = true) as
select
  atleta_id,
  data,
  (qualidade_sono + energia + recuperacao_muscular + tranquilidade + humor) as prontidao,
  case
    when (qualidade_sono + energia + recuperacao_muscular + tranquilidade + humor) >= 18 then 'VERDE'
    when (qualidade_sono + energia + recuperacao_muscular + tranquilidade + humor) >= 15 then 'AMARELO'
    else 'VERMELHO'
  end as banda,
  'v1-subjetiva' as versao
from bt_monitoramento_diario
where qualidade_sono is not null and energia is not null
  and recuperacao_muscular is not null and tranquilidade is not null and humor is not null;

-- ── 4. Carga de sessões (taxonomia canônica §5.1; derivados nunca gravados) ─
create table if not exists bt_carga_sessoes (
  id              bigint generated always as identity primary key,
  atleta_id       text not null references bt_atletas(atleta_id),
  data            date not null,
  tipo            text not null check (tipo in ('tecnica','tatica','fisica','jogo-treino','jogo-oficial')),
  duracao_min     integer,
  pse_0a10        numeric check (pse_0a10 between 0 and 10),
  sets_disputados integer,
  superficie      text check (superficie in ('areia','piso-firme','academia') or superficie is null),
  condicao_areia  text,
  sessao_codigo   text,            -- sessão física executada (A1–B7); null p/ quadra. FK adicionada após a criação da biblioteca (§7)
  observacoes     text
);
create index if not exists bt_carga_atleta_data on bt_carga_sessoes (atleta_id, data desc);

-- ── 5. Torneios (prioridade A/B/C obrigatória quando informada) ────────────
create table if not exists bt_torneios (
  id               bigint generated always as identity primary key,
  torneio_id       text,
  atleta_id        text not null references bt_atletas(atleta_id),
  nome             text not null,
  categoria        text,
  data_inicio      date,
  data_fim         date,
  local            text,
  prioridade       text check (prioridade in ('A','B','C')),
  resultado        text,
  jogos_disputados integer,
  observacoes      text
);

-- ── 6. Viagens ──────────────────────────────────────────────────────────────
create table if not exists bt_viagens (
  id                 bigint generated always as identity primary key,
  viagem_id          text,
  atleta_id          text not null references bt_atletas(atleta_id),
  data_ida           date,
  data_volta         date,
  destino            text,
  motivo             text,
  horas_deslocamento numeric,
  fuso_horas         numeric,
  observacoes        text
);

-- ── 7. BIBLIOTECA FECHADA (motor-prescricao.md §6–7 transcrito como DADO) ──
-- Fundação das camadas 6–7 da V2. Nenhum exercício/sessão fora daqui, nunca.
create table if not exists bt_biblioteca_sessoes (
  codigo          text primary key check (codigo in
    ('A1','A2','A3','A4','A5','A6','B1','B2','B3','B4','B5','B6','B7')),
  nome            text not null,
  ambiente        text not null check (ambiente in ('academia','areia')),
  objetivo        text not null,
  quando_usar     text,
  quando_nao_usar text,
  faixas          jsonb    -- {series, repeticoes, intensidade, descanso, fadiga_esperada}
);

create table if not exists bt_biblioteca_exercicios (
  exercicio_id text primary key,    -- slug
  nome         text not null,
  grupo        text not null,       -- centro | membros-inferiores | membros-superiores | lancamentos | pliometria | areia-cod | areia-aceleracao
  ambiente     text not null check (ambiente in ('academia','areia'))
);

-- FK adiada (bt_carga_sessoes é criada antes da biblioteca neste arquivo)
do $$ begin
  alter table bt_carga_sessoes
    add constraint bt_carga_sessao_codigo_fk
    foreign key (sessao_codigo) references bt_biblioteca_sessoes(codigo);
exception when duplicate_object then null; end $$;

-- ── 8. Sessões PRESCRITAS (referência à biblioteca por ID — F1 §1.6) ───────
create table if not exists bt_sessoes_prescritas (
  id             bigint generated always as identity primary key,
  atleta_id      text not null references bt_atletas(atleta_id),
  data           date not null,
  sessao_codigo  text not null references bt_biblioteca_sessoes(codigo),
  -- exercícios escolhidos da biblioteca: [{exercicio_id, series, repeticoes, intensidade, descanso, ordem}]
  -- validação exercicio_id ∈ bt_biblioteca_exercicios: feita pelo motor/app (FK não alcança jsonb; trigger é melhoria futura)
  exercicios     jsonb not null default '[]',
  origem         text,              -- ex.: 'bloco-01', 'ajuste-semana-2026-06-15', decisão que originou
  status         text not null default 'PLANEJADA' check (status in ('PLANEJADA','CONCLUIDA','PULADA')),
  pse_final      numeric check (pse_final between 0 and 10),
  observacoes    text,
  criado_em      timestamptz not null default now()
);
create index if not exists bt_prescritas_atleta_data on bt_sessoes_prescritas (atleta_id, data desc);

-- ── 9. Decisão da Semana (6 valores + evidências + versão — CANONICAL §4.1 v1.1)
create table if not exists bt_decisoes_semana (
  atleta_id        text not null references bt_atletas(atleta_id),
  semana_inicio    date not null,
  tipo_semana      text check (tipo_semana in ('TREINO','PRE-COMPETICAO','VIAGEM','COMPETICAO','POS-COMPETICAO')),
  decisao_sugerida text check (decisao_sugerida in ('PROGREDIR','MANTER','REDUZIR','DESCARREGAR','REAVALIAR','ENCAMINHAR')),
  confianca        text check (confianca in ('ALTA','MEDIA','BAIXA')),
  justificativa    text,             -- 4 dimensões em linguagem simples
  evidencias       jsonb,            -- [{sinal, valor, peso, regra}] — trilha do "por quê" (métrica do 1 min da V2)
  inputs           jsonb,            -- snapshot dos derivados usados (inclui prontidao_versao: 'v1-subjetiva')
  versao_regras    text,             -- ex.: 'regras-alertas v1.3 / canonical v1.2'
  objetivo_semana  text,             -- vocabulário do motor §8.7, subordinado (CANONICAL §4.2)
  decisao_final    text check (decisao_final in ('PROGREDIR','MANTER','REDUZIR','DESCARREGAR','REAVALIAR','ENCAMINHAR')),
  motivo_ajuste    text,             -- obrigatório (no app) quando decisao_final != decisao_sugerida
  decidido_em      timestamptz,
  primary key (atleta_id, semana_inicio)
);

-- ============================================================================
-- SEED DA BIBLIOTECA (transcrição fiel do motor-prescricao.md — nada inventado)
-- ============================================================================
insert into bt_biblioteca_sessoes (codigo, nome, ambiente, objetivo, quando_usar, quando_nao_usar, faixas) values
('A1','Força máxima','academia','Aumentar a capacidade de aplicar força em padrões básicos, com baixa fadiga desnecessária','Sem dor relevante; wellness bom; sem torneio em 48h; fase de desenvolvimento; déficit de força','Dor lombar/joelho/quadril/ombro; fadiga alta; viagem recente; torneio próximo; iniciante sem familiarização','{"series":"3-4 principal / 2-3 complementares","repeticoes":"2-5 principal / 4-6 complementares","intensidade":"75-85% ou perda de velocidade 10-20%","descanso":"180-300s principal / 120-180s complementares","fadiga_esperada":"moderada, nunca alta"}'),
('A2','Força-velocidade','academia','Deslocar cargas moderadas com alta velocidade e baixa perda de velocidade','Melhorar aceleração/saída/COD; wellness bom-moderado; até 72h pré-competição se volume baixo','Dor articular; fadiga neuromuscular alta; técnica instável','{"series":"2-4","repeticoes":"3-5","intensidade":"50-70% / perda de velocidade 5-15%","descanso":"120-180s","fadiga_esperada":"baixa a moderada"}'),
('A3','Potência','academia','Melhorar produção rápida de força, CAE, salto, arremesso e transferência explosiva','Atleta recuperado; longe de competição pesada; após base de força e controle','Dor em tendão/tornozelo/joelho/quadril/lombar/ombro; wellness ruim; pós-torneio imediato; técnica de queda ruim','{"series":"2-4","repeticoes":"3-6 (parar antes de perder altura/reatividade)","intensidade":"máxima intenção; carga leve-moderada","descanso":"90-180s","fadiga_esperada":"baixa"}'),
('A4','Manutenção','academia','Manter força e potência com baixa fadiga residual em períodos de jogos/torneios/carga técnica alta','Semana de torneio; muito treino técnico; carga semanal alta','Dor aguda; fadiga extrema; necessidade de recuperação total','{"series":"2-3","repeticoes":"3-5","intensidade":"60-75% / perda de velocidade 5-10%","descanso":"120-180s","fadiga_esperada":"baixa"}'),
('A5','Descarga','academia','Reduzir fadiga, manter padrão de movimento e preservar prontidão','Wellness ruim; sono ruim; dor leve; pós-torneio; viagem recente; decisão = recuperar','Atleta recuperado em semana que exige desenvolvimento','{"series":"1-2","repeticoes":"4-8 ou tempo curto","intensidade":"leve a moderada","descanso":"60-120s","fadiga_esperada":"muito baixa"}'),
('A6','Prevenção','academia','Estabilidade proximal, controle de tronco, padrões básicos e tolerância de tecidos','Início de ciclo; retorno de dor leve; déficit de controle; complemento de força/potência','Dor aguda; lesão ativa sem liberação; como desculpa para evitar força necessária','{"series":"2-3","repeticoes":"6-10 ou tempo técnico","intensidade":"baixa a moderada","descanso":"60-120s","fadiga_esperada":"baixa"}'),
('B1','Aceleração','areia','Melhorar saída, primeiros passos e força no menor tempo possível na areia','Déficit de aceleração; atleta recuperado; sem torneio imediato','Dor em panturrilha/tendão/tornozelo/joelho/quadril/adutor/lombar; pós-torneio; wellness ruim','{"series":"8-16 esforços","repeticoes":"5-10m ou 3-5s","intensidade":"90-95%","descanso":"20-60s (densidade 1:4-1:6)","fadiga_esperada":"baixa a moderada"}'),
('B2','Mudança de direção','areia','Melhorar freio, reposicionamento, corte, crossover e controle do centro de massa','Déficit de COD; perde postura ao mudar direção; sem dor articular','Dor articular MMII/lombar; fadiga alta; torneio <48h com volume alto; não controla desaceleração','{"series":"8-18 ações","repeticoes":"3-6s ou 3-8m por direção","intensidade":"85-95%","descanso":"20-60s","fadiga_esperada":"moderada, com controle"}'),
('B3','Reatividade','areia','Resposta rápida a estímulos imprevisíveis (cognição + leitura + deslocamento) — só é agilidade com estímulo externo','Boa base física mas responde tarde; fase de transferência; sem fadiga elevada','Não domina COD fechado; dor; fadiga alta; sessão técnica já teve muitos pontos competitivos','{"series":"6-12 ações","repeticoes":"3-6s","intensidade":"85-95%, priorizando acerto","descanso":"30-90s","fadiga_esperada":"baixa a moderada"}'),
('B4','Potência rotacional','areia','Transferência de força para lançamento/golpe SEM repetir gesto esportivo com sobrecarga','Déficit em arremesso MB; golpe sem transferência; sem dor lombar/ombro','Dor lombar/ombro/cotovelo; compensa com hiperextensão; véspera de torneio com fadiga','{"series":"2-4","repeticoes":"3-6 por lado","intensidade":"máxima intenção, bola leve-moderada","descanso":"60-120s","fadiga_esperada":"baixa"}'),
('B5','Deslocamentos específicos','areia','Padrões de deslocamento do jogo sem virar repetição caótica de gesto','Dificuldade de cobrir espaço; fase de transferência; sessão técnica leve','Dor; fadiga alta; semana com muito volume de areia; perde postura rápido','{"series":"8-16","repeticoes":"3-8s","intensidade":"80-95%","descanso":"20-60s","fadiga_esperada":"moderada"}'),
('B6','Pré-torneio','areia','Ativar o sistema neuromuscular sem gerar fadiga residual','24-48h antes do torneio, atleta recuperado','Dor; fadiga muito alta; já jogou/treinou forte no dia; viagem longa sem recuperação','{"series":"1-2 por exercício (3-5 exercícios)","repeticoes":"3-5 reps ou 3-5s","intensidade":"70-85%, sensação de velocidade","descanso":"45-90s","fadiga_esperada":"muito baixa"}'),
('B7','Pós-torneio','areia','Restaurar padrão, reduzir rigidez e iniciar recuperação sem adicionar carga','24-72h após torneio; dor leve/tensão; viagem pós-jogo','Dor aguda ou suspeita de lesão; necessidade de avaliação clínica; ainda em competição','{"series":"1-2","repeticoes":"4-8 ou 10-20s técnico","intensidade":"leve","descanso":"livre","fadiga_esperada":"muito baixa"}')
on conflict (codigo) do nothing;

insert into bt_biblioteca_exercicios (exercicio_id, nome, grupo, ambiente) values
-- centro do corpo (motor §6.1)
('estabilidade-lateral-ajoelhado','Estabilidade lateral ajoelhado','centro','academia'),
('estabilidade-lateral-em-pe','Estabilidade lateral em pé','centro','academia'),
('cortador-ajoelhado','Cortador ajoelhado','centro','academia'),
('prancha-semiajoelhada','Prancha semiajoelhada','centro','academia'),
('prancha-no-chao','Prancha no chão','centro','academia'),
('prancha-na-bola','Prancha na bola','centro','academia'),
('prancha-no-slide','Prancha no slide','centro','academia'),
('ponte-na-bola','Ponte na bola','centro','academia'),
('flexao-joelhos-bola','Flexão de joelhos na bola','centro','academia'),
('flexao-joelhos-slide','Flexão de joelhos no slide','centro','academia'),
-- membros inferiores
('goblet-squat','Goblet squat','membros-inferiores','academia'),
('double-front-squat','Double front squat','membros-inferiores','academia'),
('agachamento-barra','Agachamento com barra','membros-inferiores','academia'),
('passada-simples','Passada simples','membros-inferiores','academia'),
('passada-2-steps','Passada 2 steps','membros-inferiores','academia'),
('passada-suspensao','Passada com suspensão','membros-inferiores','academia'),
('terra-kettlebell','Terra kettlebell','membros-inferiores','academia'),
('terra-hexagonal','Terra hexagonal','membros-inferiores','academia'),
('terra-barra','Terra com barra','membros-inferiores','academia'),
-- membros superiores
('apoio','Apoio','membros-superiores','academia'),
('supino-halter','Supino halter','membros-superiores','academia'),
('supino-barra','Supino com barra','membros-superiores','academia'),
('empurrar-barra-semiajoelhado','Empurrar barra semiajoelhado','membros-superiores','academia'),
('supino-inclinado','Supino inclinado','membros-superiores','academia'),
('double-press','Double press','membros-superiores','academia'),
('face-pull','Face pull','membros-superiores','academia'),
('puxada-inclinada','Puxada inclinada','membros-superiores','academia'),
('barra-fixa','Barra fixa','membros-superiores','academia'),
-- potência / lançamentos
('mb-af-semiajoelhado','Arremesso med ball AF semiajoelhado','lancamentos','academia'),
('mb-af-em-pe','Arremesso med ball AF em pé','lancamentos','academia'),
('mb-af-contralateral','Arremesso med ball AF base contralateral','lancamentos','academia'),
('mb-ac-semiajoelhado','Arremesso med ball AC semiajoelhado','lancamentos','academia'),
('mb-ac-em-pe','Arremesso med ball AC em pé','lancamentos','academia'),
('mb-ac-contralateral','Arremesso med ball AC base contralateral','lancamentos','academia'),
-- pliometria (ordem de progressão obrigatória: motor §11.2)
('pogo-vertical','Pogo jump vertical','pliometria','academia'),
('pogo-lateral','Pogo jump lateral','pliometria','academia'),
('pogo-frente-tras','Pogo jump frente/trás','pliometria','academia'),
('pogo-unilateral','Pogo jump unilateral','pliometria','academia'),
('queda-solo-bilateral','Queda no solo bilateral','pliometria','academia'),
('queda-solo-assimetrica','Queda no solo assimétrica','pliometria','academia'),
('queda-caixa-bilateral','Queda da caixa bilateral','pliometria','academia'),
('queda-caixa-assimetrica','Queda da caixa assimétrica','pliometria','academia'),
('hop-linear-dc','Hop linear DC','pliometria','academia'),
('hop-linear-continuo','Hop linear contínuo','pliometria','academia'),
('hop-lateral-continuo','Hop lateral contínuo','pliometria','academia'),
('bound-continuo','Bound contínuo','pliometria','academia'),
('bound-lateral-dp','Bound lateral DP','pliometria','academia'),
('bound-continuo-sobrecarga','Bound contínuo com sobrecarga','pliometria','academia'),
('drop-vertical-bilateral','Drop vertical bilateral','pliometria','academia'),
('drop-vertical-barreira','Drop vertical barreira','pliometria','academia'),
('drop-diagonal-barreira','Drop diagonal barreira','pliometria','academia'),
-- areia: mudança de direção / deslocamentos (motor §6.2)
('load-and-lift','Load and lift','areia-cod','areia'),
('lateral-shuffle','Lateral shuffle','areia-cod','areia'),
('double-shuffle','Double shuffle','areia-cod','areia'),
('cut-and-shuffle','Cut and shuffle','areia-cod','areia'),
('lateral-shuffle-continuo','Lateral shuffle contínuo','areia-cod','areia'),
('lean-and-crossover','Lean and crossover','areia-cod','areia'),
('crossover-potente','Crossover potente','areia-cod','areia'),
('cut-and-crossover','Cut and crossover','areia-cod','areia'),
-- areia: aceleração
('load-and-lift-alternancia','Load and lift com alternância de pernas','areia-aceleracao','areia'),
('marcha-contra-parede','Marcha contra a parede','areia-aceleracao','areia'),
('marcha-frente-resistencia','Marcha à frente com resistência','areia-aceleracao','areia'),
('skip-resistencia','Skip com resistência','areia-aceleracao','areia'),
('bound-resistencia','Bound com resistência','areia-aceleracao','areia'),
('corrida-resistida','Corrida resistida','areia-aceleracao','areia'),
('treno','Utilização de trenós','areia-aceleracao','areia')
on conflict (exercicio_id) do nothing;
-- Nota: B3 (reatividade) e B5 (deslocamentos) reutilizam padrões de areia-cod/areia-aceleracao
-- e itens de pliometria com estímulo externo — conforme motor §6.2; não são exercícios novos.

-- ============================================================================
-- RLS — treinador vê SÓ os próprios atletas (corrige vazamento do v1 — F1 §4.6)
-- ============================================================================
alter table bt_perfis               enable row level security;
alter table bt_atletas              enable row level security;
alter table bt_avaliacoes           enable row level security;
alter table bt_monitoramento_diario enable row level security;
alter table bt_dor_registros        enable row level security;
alter table bt_carga_sessoes        enable row level security;
alter table bt_torneios             enable row level security;
alter table bt_viagens              enable row level security;
alter table bt_biblioteca_sessoes   enable row level security;
alter table bt_biblioteca_exercicios enable row level security;
alter table bt_sessoes_prescritas   enable row level security;
alter table bt_decisoes_semana      enable row level security;

create or replace function bt_papel() returns text
language sql stable security definer set search_path = public as
$$ select papel from bt_perfis where user_id = auth.uid() $$;

create or replace function bt_meu_atleta() returns text
language sql stable security definer set search_path = public as
$$ select atleta_id from bt_perfis where user_id = auth.uid() $$;

-- atleta pertence ao treinador logado?
create or replace function bt_e_meu_atleta(p_atleta text) returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from bt_atletas a where a.atleta_id = p_atleta and a.treinador_id = auth.uid()) $$;

-- perfis: cada um vê o próprio
create policy perfil_proprio on bt_perfis for select using (user_id = auth.uid());
-- usuário autenticado cria o PRÓPRIO perfil no primeiro login (papel auto-declarado — nível
-- demo; antes de atleta real, mover criação de perfil para fluxo controlado pelo treinador)
create policy perfil_cria_proprio on bt_perfis for insert with check (user_id = auth.uid());

-- atleta pode ler o perfil do treinador dono dele (nome no chat/home do app)
create or replace function bt_meu_treinador() returns uuid
language sql stable security definer set search_path = public as
$$ select a.treinador_id from bt_atletas a where a.atleta_id = (select atleta_id from bt_perfis where user_id = auth.uid()) $$;
create policy atleta_le_treinador on bt_perfis for select using (user_id = bt_meu_treinador());

-- atletas: treinador só os seus; atleta lê o próprio
create policy treinador_meus_atletas on bt_atletas for all
  using (bt_papel() = 'treinador' and treinador_id = auth.uid());
create policy atleta_le_proprio on bt_atletas for select using (atleta_id = bt_meu_atleta());

-- dados por atleta: treinador dono = tudo; atleta = leitura (ou escrita onde é dele)
create policy trein_aval   on bt_avaliacoes           for all    using (bt_papel()='treinador' and bt_e_meu_atleta(atleta_id));
create policy atleta_aval  on bt_avaliacoes           for select using (atleta_id = bt_meu_atleta());
create policy trein_monit  on bt_monitoramento_diario for all    using (bt_papel()='treinador' and bt_e_meu_atleta(atleta_id));
create policy atleta_monit on bt_monitoramento_diario for all    using (atleta_id = bt_meu_atleta());  -- check-in é do atleta
create policy trein_dor    on bt_dor_registros        for all    using (bt_papel()='treinador' and bt_e_meu_atleta(atleta_id));
create policy atleta_dor   on bt_dor_registros        for all    using (atleta_id = bt_meu_atleta());  -- dor é do atleta
create policy trein_carga  on bt_carga_sessoes        for all    using (bt_papel()='treinador' and bt_e_meu_atleta(atleta_id));
create policy atleta_carga on bt_carga_sessoes        for all    using (atleta_id = bt_meu_atleta());  -- PSE pós-treino
create policy trein_torn   on bt_torneios             for all    using (bt_papel()='treinador' and bt_e_meu_atleta(atleta_id));
create policy atleta_torn  on bt_torneios             for select using (atleta_id = bt_meu_atleta());
create policy trein_viag   on bt_viagens              for all    using (bt_papel()='treinador' and bt_e_meu_atleta(atleta_id));
create policy atleta_viag  on bt_viagens              for select using (atleta_id = bt_meu_atleta());
create policy trein_presc  on bt_sessoes_prescritas   for all    using (bt_papel()='treinador' and bt_e_meu_atleta(atleta_id));
create policy atleta_presc on bt_sessoes_prescritas   for select using (atleta_id = bt_meu_atleta());
create policy atleta_presc_exec on bt_sessoes_prescritas for update using (atleta_id = bt_meu_atleta());  -- concluir + pse_final
create policy trein_dec    on bt_decisoes_semana      for all    using (bt_papel()='treinador' and bt_e_meu_atleta(atleta_id));
create policy atleta_dec   on bt_decisoes_semana      for select using (atleta_id = bt_meu_atleta());

-- bibliotecas: leitura para qualquer usuário autenticado; escrita só treinador
create policy biblio_sessoes_leitura  on bt_biblioteca_sessoes    for select using (auth.uid() is not null);
create policy biblio_sessoes_escrita  on bt_biblioteca_sessoes    for all    using (bt_papel() = 'treinador');
create policy biblio_exerc_leitura    on bt_biblioteca_exercicios for select using (auth.uid() is not null);
create policy biblio_exerc_escrita    on bt_biblioteca_exercicios for all    using (bt_papel() = 'treinador');
