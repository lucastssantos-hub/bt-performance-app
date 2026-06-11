# BT Performance — App (MVP funcional)

App mobile-web do BT Performance: 21 telas (design do handoff Claude Design, jun/2026) funcionando de ponta a ponta — login por papel, dados persistentes, formulários, cálculos simples e fluxos completos de treinador e atleta. **Sem motor de prescrição** (decisão da semana é administrativa).

- **Produção:** https://lucastssantos-hub.github.io/bt-performance-app/ (GitHub Pages, repo público, deploy automático no push para `main`; a Vercel foi abandonada por deploys travando no plano free). **Versão canônica v2 publicada e validada em 2026-06-11** (commit "App canônico v2"): Auth real + PostgREST nas tabelas `bt_*`, zero uso de `bt_app_estado`, console limpo nos fluxos de treinador e atleta.
- **Stack (desde 2026-06-11):** HTML/CSS/JS vanilla (ES modules), sem build. **Supabase Auth real + tabelas canônicas `bt_*`** (`supabase/001_schema_bt.sql`, aplicado no projeto compartilhado): o cache em memória é hidratado no boot e cada escrita vira PostgREST. O localStorage guarda só snapshot (render instantâneo) e as coleções sem tabela canônica (notificações, mensagens, relatórios, settings — **legado, por dispositivo**). A tabela `bt_app_estado` (`supabase/002_app_estado.sql`) é **LEGADO** e não é mais lida/escrita.
- **Usuários de teste:** `rafael@equipebrasil.com` / `123456` (treinador) · `joao@atleta.com` / `123456` (atleta) — reais no Supabase Auth. **`intruso@teste.com` / `123456` é mantido de propósito**: treinador sem atletas, usado para regredir o RLS (deve sempre ver 0 atletas/0 dados e tomar 403 em escrita). Remover os três quando entrar atleta real.

## Rodar local

```
python3 -m http.server 4173 --directory bt-performance-lab/app
```

(ES modules exigem servir por HTTP; abrir o index.html direto não funciona.)

## Estrutura

| Arquivo | Papel |
|---|---|
| `index.html` | shell (moldura de phone no desktop, full-bleed no mobile) + CSS |
| `js/db.js` | camada de dados canônica: cache em memória ⇄ tabelas `bt_*` (mapeadores, fila de escrita), cálculos derivados, auth |
| `js/ui.js` | toasts, modais, confirmação, formatação |
| `js/screens-coach.js` / `js/screens-athlete.js` | render das 21 telas |
| `js/app.js` | router de pilha, ações, formulários |
| `js/remote.js` + `js/supabase-config.js` | cliente Supabase (Auth GoTrue + PostgREST) |
| `supabase/001_schema_bt.sql` | schema canônico v2 — **APLICADO** no projeto compartilhado `btjsweysefmbceqqlyxx` (2026-06-11) |
| `supabase/002_app_estado.sql` | **LEGADO (histórico)** — antigo espelho de estado (pré-canônico); tabela **dropada em 2026-06-11** |
| `supabase/003_drop_app_estado.sql` | descontinuação do legado — **✅ aplicado em 2026-06-11** (`bt_app_estado` não existe mais; registro apenas) |
| `docs/` | auditoria, MVP, botões/rotas, dados/modelos, checklist |

## Documentação

- [docs/AUDITORIA_APP_ATUAL.md](docs/AUDITORIA_APP_ATUAL.md) — estado anterior e plano
- [docs/MVP_FUNCIONAL.md](docs/MVP_FUNCIONAL.md) — o que existe, como rodar, fluxos
- [docs/BOTOES_E_ROTAS.md](docs/BOTOES_E_ROTAS.md) — cada botão e seu status
- [docs/DADOS_E_MODELOS.md](docs/DADOS_E_MODELOS.md) — modelos e persistência
- [docs/CHECKLIST_VALIDACAO.md](docs/CHECKLIST_VALIDACAO.md) — 23 validações executadas
