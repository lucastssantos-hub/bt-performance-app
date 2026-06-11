# BT Performance — App (MVP funcional)

App mobile-web do BT Performance: 21 telas (design do handoff Claude Design, jun/2026) funcionando de ponta a ponta — login por papel, dados persistentes, formulários, cálculos simples e fluxos completos de treinador e atleta. **Sem motor de prescrição** (decisão da semana é administrativa).

- **Produção:** https://lucastssantos-hub.github.io/bt-performance-app/ (GitHub Pages, repo público, deploy automático no push para `main` — decisão 2026-06-11; a Vercel foi abandonada por deploys travando no plano free)
- **Stack:** HTML/CSS/JS vanilla (ES modules), sem build. Persistência local-first: localStorage sempre + espelho remoto opcional no Supabase (`js/remote.js`; liga preenchendo `js/supabase-config.js` e rodando `supabase/002_app_estado.sql`). Schema relacional para a v2 em `supabase/001_schema_bt.sql`.
- **Usuários de teste:** `rafael@equipebrasil.com` / `123456` (treinador) · `joao@atleta.com` / `123456` (atleta)

## Rodar local

```
python3 -m http.server 4173 --directory bt-performance-lab/app
```

(ES modules exigem servir por HTTP; abrir o index.html direto não funciona.)

## Estrutura

| Arquivo | Papel |
|---|---|
| `index.html` | shell (moldura de phone no desktop, full-bleed no mobile) + CSS |
| `js/db.js` | modelos, seed (datas relativas a hoje), CRUD, cálculos, auth |
| `js/ui.js` | toasts, modais, confirmação, formatação |
| `js/screens-coach.js` / `js/screens-athlete.js` | render das 21 telas |
| `js/app.js` | router de pilha, ações, formulários |
| `js/remote.js` + `js/supabase-config.js` | espelho remoto do estado (PostgREST, last-write-wins, off por padrão) |
| `supabase/002_app_estado.sql` | tabela do espelho de estado (rodar após restore do projeto) |
| `supabase/001_schema_bt.sql` | schema relacional v2 (projeto `rkoqcvylamvnkxnaegna`) |

### Ligar a nuvem (projeto compartilhado btjsweysefmbceqqlyxx — 1 migração)

Decisão 2026-06-11: usar o Supabase compartilhado (BeachFlow + Copa) em vez do projeto pausado `rkoqcvylamvnkxnaegna`. A config (`js/supabase-config.js`) já aponta para ele; falta só criar a tabela, via migração já preparada no repo da Copa:

```bash
cd "/Users/lucassantos/Desktop/Workoom Projetos/Projetos/Copa-do-Mundo/copa-vite"
supabase migration repair --status applied 20260610130000 20260610150000 20260610180000 20260610200000
supabase db push   # aplica só 20260611120000_bt_app_estado.sql
```

(O `repair` registra no histórico 4 migrações da Copa que já foram aplicadas à mão pelo SQL Editor — sem ele, o `db push` tentaria re-rodá-las.) Alternativa: colar `supabase/002_app_estado.sql` no SQL Editor do projeto.

Sem a tabela o app funciona normal (localStorage + um aviso). Com ela, o estado sincroniza entre dispositivos. Política da tabela é nível demo (anon lê/escreve, dados fictícios) — antes de atleta real, migrar para Supabase Auth + RLS do `001_schema_bt.sql`.
| `docs/` | auditoria, MVP, botões/rotas, dados/modelos, checklist |

## Documentação

- [docs/AUDITORIA_APP_ATUAL.md](docs/AUDITORIA_APP_ATUAL.md) — estado anterior e plano
- [docs/MVP_FUNCIONAL.md](docs/MVP_FUNCIONAL.md) — o que existe, como rodar, fluxos
- [docs/BOTOES_E_ROTAS.md](docs/BOTOES_E_ROTAS.md) — cada botão e seu status
- [docs/DADOS_E_MODELOS.md](docs/DADOS_E_MODELOS.md) — modelos e persistência
- [docs/CHECKLIST_VALIDACAO.md](docs/CHECKLIST_VALIDACAO.md) — 23 validações executadas
