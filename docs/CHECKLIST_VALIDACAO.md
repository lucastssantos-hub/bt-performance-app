# Checklist de validação — MVP

Executado em 2026-06-11 via automação no preview (DOM real, sem mock de teste). Re-executável manualmente seguindo os passos.

| # | Validação | Resultado |
|---|---|---|
| 1 | Login treinador funciona (e senha errada mostra erro amigável) | ✅ |
| 2 | Login atleta funciona (toggle pré-preenche e-mail) | ✅ |
| 3 | Menu treinador navega (5 tabs) | ✅ |
| 4 | Menu atleta navega (5 tabs) | ✅ |
| 5 | Lista de atletas abre (6 atletas seed) | ✅ |
| 6 | Filtro de atletas funciona (chips + busca "mar" → 1 resultado) | ✅ |
| 7 | Perfil do atleta abre com métricas calculadas | ✅ |
| 8 | Nova avaliação salva (44cm aparece com delta ▲) | ✅ |
| 9 | Nova sessão salva no plano | ✅ |
| 10 | Sessão pode ser editada | ✅ |
| 11 | Sessão pode ser removida (com confirmação) | ✅ |
| 12 | Check-in salva (dor "ombro D" 5/10 persistida) | ✅ |
| 13 | Recovery muda após check-in (88 → 27, bate com a fórmula) | ✅ |
| 14 | Treino pode ser iniciado (PLANNED → IN_PROGRESS) | ✅ |
| 15 | Exercício pode ser concluído (toque e botão Continuar) | ✅ |
| 16 | Treino pode ser finalizado (RPE 8 → COMPLETED, 480 UA, notifica treinador) | ✅ |
| 17 | Relatório é gerado com dados reais (prontidão, carga, sessões) | ✅ |
| 18 | Torneio pode ser cadastrado (e editado e removido) | ✅ |
| 19 | Viagem pode ser cadastrada (GIG → MAD persistida) | ✅ |
| 20 | Notificação pode ser marcada como lida (contador caiu) | ✅ |
| 21 | Logout funciona (confirmação + volta ao login + sessão limpa) | ✅ |
| 22 | Refresh não quebra sessão (restaura usuário e tela) | ✅ |
| 23 | Build final roda sem erro (estático, zero erros de console em todos os fluxos) | ✅ |

Extras verificados: decisão da semana aplicada altera plannedLoad (+10% PROGREDIR na Ana; MANTER no João por torneio próximo — comportamento correto); check-in ruim gera notificação ao treinador; ações destrutivas pedem confirmação; placeholders mostram "integração futura"; datas do seed são relativas (app nunca abre desatualizado); tela de erro amigável se um render falhar.

## Revalidação canônica — 2026-08-14

- ✅ JavaScript válido em todos os módulos (`node --check`).
- ✅ Motor determinístico testado em 5 cenários: PROGREDIR legítimo, PRÉ-COMPETIÇÃO sem progressão, dor persistente → ENCAMINHAR, avaliação ausente → REAVALIAR/BAIXA e dor aguda 6/10 sem progressão.
- ✅ Radar lê e exibe testes físicos, wellness, carga e contexto competitivo.
- ✅ `PROGREDIR` exige semana TREINO, confiança ALTA, prontidão VERDE, dor ≤ 2, testes estáveis/subindo e risco competitivo não alto.
- ✅ Dor diária ≥ 6 alinhada ao modelo canônico no status e nas cores do app.
- ✅ Aprovação do Copiloto bloqueia código inválido, exercício inventado e violação de bloqueio clínico.
- ✅ Chave Anthropic removida do armazenamento persistente; permanece apenas até fechar a aba.
- ✅ Shell local carregado sem erros ou avisos no console.

Pendente para produção: mover a chamada Anthropic para um backend/Edge Function com segredo do servidor; validar o fluxo autenticado completo contra um ambiente de teste dedicado; persistir a sessão aprovada diretamente em `bt_sessoes_prescritas` com IDs da biblioteca, em vez do adaptador legado de plano.

## Re-auditoria 2026-06-11

Os 23 itens foram re-executados no preview (fluxo treinador completo + fluxo atleta completo + refresh + logout). Zero erros/warnings de console. Duas correções aplicadas:

1. **Tipo do relatório de equipe** — gerar para "Equipe toda" gravava `type: individual` (default do select). Agora o tipo é derivado da seleção: equipe → `equipe`, atleta → `individual`, mensal mantém `mensal`.
2. **Decisão aplicada sem sessões** — aplicar PROGREDIR/REDUZIR num atleta sem sessões planejadas na semana mostrava "aplicado a 0 sessão(ões)". Agora mostra "registrado — sem sessões planejadas nesta semana".

## Nuvem (2026-06-11, mesma data)

Espelho remoto ligado no Supabase compartilhado `btjsweysefmbceqqlyxx` (tabela `bt_app_estado`, migração aplicada via repo da Copa com histórico reparado). Verificado no preview:

- Boot sem linha remota → estado local sobe para a nuvem (pull confirmou 6 atletas, 14 sessões).
- "Segundo dispositivo" (localStorage zerado + reload) → estado volta da nuvem, incluindo dados criados em testes (CMJ 33 da Marina, readiness 0 do João, mensagem de teste).
- Nuvem fora do ar (testado contra projeto pausado) → um toast "Nuvem indisponível — salvando localmente" e o app segue normal.
