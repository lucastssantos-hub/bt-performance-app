# Botões e rotas — status

Status: ✅ funcionando · 🟡 placeholder com aviso claro · 🔮 futuro

## Login
| Botão | Ação | Status |
|---|---|---|
| Toggle Treinador/Atleta | troca papel + pré-preenche e-mail | ✅ |
| Campos e-mail/senha | inputs reais, validados no enter | ✅ |
| Entrar como treinador/atleta | autentica e redireciona por papel | ✅ |
| Entrar com Face ID | aviso "integração futura" | 🟡 |
| Esqueceu a senha? | aviso com dica da senha seed | 🟡 |

## Treinador
| Tela | Botão/elemento | Ação | Status |
|---|---|---|---|
| Dashboard | sino | notificações (badge = não lidas) | ✅ |
| Dashboard | avatar RC | config | ✅ |
| Dashboard | card prontidão | decisão da semana | ✅ |
| Dashboard | card Atenção/Prontos/Lesão | atletas filtrados | ✅ |
| Dashboard | card Perto de competir | calendário | ✅ |
| Atletas | busca | filtra por nome em tempo real | ✅ |
| Atletas | chips Todos/Atenção/Prontos/Lesão | filtra por status | ✅ |
| Atletas | botão + | aviso "cadastro futuro" | 🟡 |
| Atletas | linha do atleta | perfil | ✅ |
| Perfil | tabs Visão/Avaliação/Histórico | navegam | ✅ |
| Perfil | Ver decisão da semana | decisão | ✅ |
| Avaliação | Nova avaliação | formulário → salva → deltas ▲▼ | ✅ |
| Histórico | sessão recente | abre edição da sessão | ✅ |
| Plano | setas ‹ › | semana anterior/próxima | ✅ |
| Plano | seletor de atleta | troca o plano exibido | ✅ |
| Plano | Adicionar sessão | formulário (com exercícios) | ✅ |
| Plano | sessão | editar/remover (com confirmação) | ✅ |
| Plano | dia de viagem | abre viagens | ✅ |
| Decisão | Aplicar ao plano | confirma → ajusta % das sessões PLANNED | ✅ |
| Decisão | Ajustar | edição manual (decisão + justificativa) | ✅ |
| Relatórios | + Novo relatório | formulário → gera com dados reais | ✅ |
| Relatórios | linha | ver conteúdo / excluir | ✅ |
| Relatórios | ícone download | aviso "PDF futuro" | 🟡 |
| Calendário | + | novo torneio | ✅ |
| Calendário | torneio | editar/remover | ✅ |
| Calendário | card próximo | viagens | ✅ |
| Viagens | + | nova viagem | ✅ |
| Viagens | card voo | editar/remover | ✅ |
| Notificações | linha | marca como lida | ✅ |
| Config | toggle push | persiste + feedback | ✅ |
| Config | dispositivos | aviso "integração futura" (mock) | 🟡 |
| Config | Unidades | aviso | 🟡 |
| Config | Sair da conta | confirma → logout | ✅ |

## Atleta
| Tela | Botão/elemento | Ação | Status |
|---|---|---|---|
| Home | card recovery | check-in | ✅ |
| Home | Iniciar/Continuar treino | inicia sessão (IN_PROGRESS) | ✅ |
| Home | card torneio / sono | telas respectivas | ✅ |
| Home | card mensagem | chat | ✅ |
| Check-in | escalas 1–5 (4 dimensões) | selecionáveis | ✅ |
| Check-in | slider horas de sono | ajusta valor | ✅ |
| Check-in | dor localizada + nota | inputs reais | ✅ |
| Check-in | Enviar | salva, recalcula readiness, notifica treinador | ✅ |
| Treino | exercício | marca/desmarca concluído | ✅ |
| Treino | Concluir exercício N de M | avança próximo | ✅ |
| Treino | Finalizar · registrar RPE | modal RPE → COMPLETED + carga + notificação | ✅ |
| Mensagens | input + enviar (e tecla Enter) | persiste e renderiza | ✅ |
| Perfil | cards treinos/sequência | histórico | ✅ |
| Perfil | Dados pessoais / WHOOP | aviso "integração futura" | 🟡 |
| Perfil | Sair | confirma → logout | ✅ |

## Rotas
Todas as 21 telas têm entrada e saída; back in-app e do navegador funcionam; refresh restaura sessão e tela (sessionStorage); tela de erro amigável com volta ao início se um render falhar.
