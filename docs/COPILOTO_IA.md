# Copiloto de prescrição

O copiloto sugere uma sessão a partir do Radar de Decisão, avaliações, check-ins,
carga recente, calendário e contexto informado pelo professor. A sugestão nunca é
publicada automaticamente: o professor pode ajustar, rejeitar ou aprovar.

## Arquitetura

- O navegador envia somente o contexto esportivo e o JWT do usuário.
- A Edge Function `copiloto-treino` autoriza apenas perfis `treinador`.
- A chave da Groq fica em Supabase Secrets e nunca é enviada ao navegador.
- A função mantém as regras e a biblioteca fechada no servidor.
- O cliente valida novamente código, duração, exercícios e bloqueios clínicos.
- Uma decisão `ENCAMINHAR` bloqueia a geração.

## Configuração

Execute dentro de `app/`, autenticado na Supabase CLI:

```sh
supabase secrets set GROQ_API_KEY=...
supabase functions deploy copiloto-treino --use-api
```

Opcionalmente, configure `GROQ_MODEL`. Sem essa variável, a função usa
`openai/gpt-oss-120b`.

Nunca coloque a chave do provedor em `supabase-config.js`, no HTML, no
`localStorage` ou no `sessionStorage`.

## Checklist operacional

1. Confirmar que `bt_perfis` não permite que um usuário comum se promova a
   `treinador` por INSERT ou UPDATE.
2. Confirmar RLS de leitura dos dados do atleta vinculada ao professor.
3. Configurar limites de uso e monitorar erros da Edge Function.
4. Fazer um teste com atleta verde e outro com dor que altera movimento.
5. Conferir a sessão no Plano e no aplicativo do atleta após aprovação.
