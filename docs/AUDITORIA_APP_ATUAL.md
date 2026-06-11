# Auditoria do app atual — BT Performance

Data: 2026-06-10 · Auditor: Claude (sessão de implementação do MVP)

## Estado atual

**Stack:** HTML/CSS/JS vanilla, arquivo único `index.html` (~120 KB), sem framework, sem build, sem TypeScript, sem lint, sem testes. Fontes Google (Space Grotesk + Manrope). Deploy: Vercel (`bt-performance-app.vercel.app`) com auto-deploy no push para `main` (GitHub `lucastssantos-hub/bt-performance-app`).

**Banco/Auth:** nenhum. Supabase foi escolhido (projeto `rkoqcvylamvnkxnaegna`, compartilhado) e o schema v1 está escrito em `supabase/001_schema_bt.sql`, mas o projeto está **pausado** (INACTIVE desde out/2025) aguardando Restore manual — portanto não há backend utilizável hoje.

**Estado global / rotas:** router de pilha em JS puro (`stack` + `role`), sincronizado com a History API. Funciona. Sem persistência: refresh volta ao login.

**Estrutura:** 21 `<section class="screen">` estáticas dentro de uma moldura de telefone; delegação de cliques por `data-go`/`data-tab`/`data-nav`/`data-role`.

## O que funciona de verdade

- Navegação completa entre as 21 telas (tabs, push, back in-app e do navegador).
- Toggle Treinador/Atleta no login (muda destino do Entrar).
- Visual fiel ao protótipo em desktop (moldura) e mobile (full-bleed).
- Zero erros de console; deploy de produção ok.

## O que só parece pronto (dados mockados — 100% das telas)

Todos os números, nomes, listas, gráficos e mensagens são hardcoded no HTML: prontidão da equipe (74), recovery dos atletas (88/54/79/61/84), avaliação física, histórico de carga, plano semanal, decisão da semana, relatórios, torneios, viagens, notificações, check-in, treino do dia, mensagens, perfis.

## Botões/elementos mortos (sem ação real)

| Tela | Elemento morto |
|---|---|
| Login | campos e-mail/senha (são `div`, não inputs); "Entrar com Face ID"; "Esqueceu a senha?" |
| Dashboard treinador | — (cards navegam, ok) |
| Atletas | busca (div fake); chips de filtro; botão "+" |
| Perfil atleta | menu "⋯" |
| Avaliação | "Nova avaliação" (volta para trás em vez de abrir formulário) |
| Plano | setas de semana; "Adicionar sessão"; sessões não editáveis |
| Decisão | "Aplicar ao plano" (só navega); "Ajustar" (só volta) |
| Relatórios | "+ Novo relatório"; ícones de download |
| Calendário | sem cadastro/edição de torneio |
| Viagens | sem cadastro/edição |
| Notificações | sem marcar como lida |
| Config | toggle push; "Unidades"; dispositivos "conectar" |
| Check-in | escalas não selecionáveis; "Enviar" só volta |
| Treino | exercícios não marcáveis; "Continuar" morto; sem RPE final/finalizar |
| Mensagens | input e enviar mortos |
| Perfil atleta (próprio) | "Dados pessoais" |

## Erros

- Build/TS/lint: N/A (não existem).
- Console/runtime: nenhum erro.
- Rotas quebradas: nenhuma (auditoria programática: todo `data-go`/`data-tab` aponta para tela existente).
- Componentes duplicados: a tab bar é repetida em cada tela (cópia colada 9×) — será unificada.
- Refresh: não quebra, mas perde sessão/tela (volta ao login).

## Prioridade de correção

1. Camada de dados persistente + seed (pré-requisito de tudo).
2. Autenticação simples + sessão que sobrevive a refresh.
3. Conectar telas de leitura (dashboard, atletas, perfil, histórico, calendário…).
4. Formulários (avaliação, sessão, torneio, viagem, relatório, check-in).
5. Fluxos do atleta (check-in → readiness; treino iniciar/concluir/finalizar; mensagens).
6. Feedback de UX (toasts, confirmação em ação destrutiva, placeholders "Integração futura").
7. Documentação + checklist de validação.

## Plano de execução

Ordem das etapas 13 da spec, implementadas sobre a estrutura atual: `index.html` (shell + CSS) + `js/db.js` (modelos, seed, cálculos, auth) + `js/ui.js` (toast/modal/confirm) + `js/screens-coach.js` + `js/screens-athlete.js` (render dinâmico) + `js/app.js` (router + ações).

**Persistência:** localStorage estruturado (opção temporária prevista na spec), com modelos exatamente como especificado, isolados em `db.js` para troca futura pelo Supabase (`supabase/001_schema_bt.sql` já escrito; projeto aguardando Restore).

## O que NÃO será feito agora

- Motor de prescrição de treinos / periodização / lógica científica.
- OAuth, Face ID real, integrações WHOOP/Garmin/Oura (placeholders com aviso).
- Onboarding, pagamento/assinatura.
- Novas telas além das 21 existentes (formulários abrem como modais dentro das telas atuais).
- Integração Supabase efetiva (bloqueada pelo projeto pausado; schema pronto para quando religar).
