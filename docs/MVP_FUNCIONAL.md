# MVP Funcional — BT Performance

## O que foi implementado

O app deixou de ser protótipo estático (HTML hardcoded) e virou um MVP funcional: as mesmas 21 telas, mesma identidade visual, agora renderizadas dinamicamente a partir de um banco local persistente, com autenticação, formulários, cálculos simples e feedback de UX. **Sem motor de prescrição** — decisão da semana é administrativa/manual.

## Como rodar

- **Produção:** https://bt-performance-app.vercel.app (auto-deploy no push para `main`)
- **Local:** `python3 -m http.server 4173 --directory bt-performance-lab/app` e abrir `http://localhost:4173` (precisa ser servido por HTTP — usa ES modules; abrir o arquivo direto não funciona). Há config `bt-performance-app` no `.claude/launch.json`.

## Usuários de teste

| Papel | E-mail | Senha |
|---|---|---|
| Treinador | rafael@equipebrasil.com | 123456 |
| Atleta | joao@atleta.com | 123456 |

O toggle Treinador/Atleta no login pré-preenche o e-mail correspondente.

## Fluxo do treinador

Dashboard (prontidão da equipe calculada + grupos por status) → Atletas (busca + filtros) → Perfil do atleta (métricas reais) → Avaliação (bateria + nova avaliação) → Histórico de carga (4 semanas calculadas + sessões) → Plano semanal (navegar semanas, criar/editar/remover sessão, trocar atleta) → Decisão da semana (sugestão por regras simples + aplicar % ao plano + ajuste manual) → Relatórios (resumo calculado + gerar/ver/excluir) → Calendário (CRUD torneios) → Viagens (CRUD) → Notificações (marcar lida) → Config (push, logout).

## Fluxo do atleta

Home (recovery do check-in + treino de hoje + torneio + sono + mensagem do treinador) → Check-in (escalas interativas + horas de sono + dor localizada → recalcula readiness, atualiza status e notifica o treinador se baixo/dor) → Treino (iniciar → concluir exercícios → finalizar com RPE → vira carga concluída e notifica treinador) → Torneio (countdown + sessões até lá) → Recovery (score + recomendações) → Histórico (sequência + volume 12 semanas) → Mensagens (chat persistente) → Perfil (stats + logout).

## Cálculos do MVP (sem ciência, regras simples)

- **Readiness:** base 100 − penalidades por sono ruim/curto, energia baixa, dor muscular, estresse e dor localizada; clamp 0–100 (`db.js → readinessFrom`).
- **Status:** INJURED (dor ≥7) > ATTENTION (readiness <65) > COMPETING_SOON (torneio ≤7 dias) > READY.
- **Carga semanal:** Σ sessões da semana — concluída = duração × RPE final; planejada = plannedLoad.
- **Decisão aplicada:** PROGREDIR +10% / REDUZIR −20% / DESCARREGAR −40% sobre plannedLoad das sessões PLANNED da semana.

## Funcionalidades ainda mockadas / placeholder

- Dispositivos (WHOOP/Garmin/Oura): visual mock, toca aviso "integração futura".
- Face ID, esqueci a senha, exportar PDF, unidades, dados pessoais, cadastro de atleta: aviso "integração futura".
- Persistência: **localStorage** (cada navegador tem seus dados). Supabase é o próximo passo — schema pronto em `supabase/001_schema_bt.sql`, projeto `rkoqcvylamvnkxnaegna` aguardando Restore.
- Mensagens: thread única treinador↔atleta seed (sem lista de conversas para o treinador).

## Próximos passos

1. Restore do projeto Supabase + aplicar schema + adaptador em `db.js` (interface já isolada).
2. Auth real (Supabase Auth) substituindo o login seed.
3. Multi-atleta no login de atleta (hoje só João tem conta).
4. Sincronizar com os CSVs do BT Performance Lab (`../dados/`) e a Decisão da Semana do `/fechar-semana`.
