-- 003 — Descontinua o espelho legado bt_app_estado (2026-06-11)
-- O app não usa mais esta tabela desde a migração para Auth + PostgREST nas
-- tabelas canônicas bt_* (commit "App canônico v2"). Ela guardava apenas um
-- snapshot JSON do estado demo do localStorage — nenhum dado real.
-- Verificado em 2026-06-11: zero referências no código (js/*), zero chamadas
-- na rede durante os testes de publicação.
--
-- APLICAR NO SQL EDITOR do projeto compartilhado btjsweysefmbceqqlyxx
-- (ou via supabase db push a partir do repo da Copa, conforme README).

drop table if exists bt_app_estado;

-- 002_app_estado.sql fica no repositório apenas como histórico — não reaplicar.
