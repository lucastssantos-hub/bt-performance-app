# BT Performance — App (protótipo implementado)

Implementação do protótipo de 21 telas exportado do Claude Design (`BT performance-handoff-2.zip`, jun/2026). Web app estático, sem build e sem dependências — um único `index.html` com HTML/CSS/JS vanilla.

## Como rodar

- Abrir `index.html` direto no navegador, **ou**
- Servir a pasta: `python3 -m http.server 4173 --directory bt-performance-lab/app` (há config `bt-performance-app` no `.claude/launch.json` da raiz).

No desktop o app aparece dentro de uma moldura de iPhone (como no protótipo); em telas pequenas (< 520px) fica full-bleed, sem moldura e sem status bar falsa.

## O que está implementado

- **21 telas** em PT-BR, fiéis ao protótipo: login (papel Treinador/Atleta) + 12 telas do treinador (dashboard, atletas, perfil, avaliação, histórico, plano, decisão da semana, relatórios, calendário, viagens, notificações, config) + 8 do atleta (home, check-in wellness, treino, torneio, recovery, histórico, mensagens, perfil).
- **Navegação real por pilha**: tabs resetam a pilha, cards empilham telas, botão voltar in-app e do navegador funcionam (History API).
- **Toggle de papel** no login muda o destino do "Entrar" (treinador → dashboard, atleta → home).

## O que ainda é mock

Todos os dados são estáticos (os mesmos do protótipo: João Silva, Recovery 88, Itália Open etc.). Inputs de login, busca, check-in e chat não persistem nada. Próximo passo natural: ligar as telas aos CSVs de `../dados/` e à Decisão da Semana gerada pelo `/fechar-semana`.
