-- Autocadastro de atleta (Fase 3/Player, adiantada por pedido explícito em
-- 2026-08-16) exige registrar que o atleta aceitou o TERMO_CONSENTIMENTO.md
-- antes de qualquer dado de saúde ser coletado.
alter table bt_atletas add column if not exists consentimento_aceito_em timestamptz;
alter table bt_atletas add column if not exists consentimento_versao text;
