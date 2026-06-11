-- 003 — Descontinua o espelho legado bt_app_estado (2026-06-11)
-- O app não usa mais esta tabela desde a migração para Auth + PostgREST nas
-- tabelas canônicas bt_* (commit "App canônico v2"). Ela guardava apenas um
-- snapshot JSON do estado demo do localStorage — nenhum dado real.
-- Verificado em 2026-06-11: zero referências no código (js/*), zero chamadas
-- na rede durante os testes de publicação.
--
-- ✅ APLICADO em 2026-06-11 via `supabase db query --linked` (repo da Copa,
-- projeto compartilhado btjsweysefmbceqqlyxx). A tabela continha 1 linha de
-- snapshot demo. Verificação pós-drop: namespace bt_ = 12 tabelas canônicas
-- + view bt_prontidao_v1; app respondendo normal (bt_atletas 200, bt_app_estado 404).
-- Este arquivo fica como registro — NÃO precisa ser reaplicado.

drop table if exists bt_app_estado;

-- 002_app_estado.sql fica no repositório apenas como histórico — não reaplicar.
