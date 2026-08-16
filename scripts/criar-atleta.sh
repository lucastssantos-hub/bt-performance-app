#!/bin/bash
# criar-atleta.sh — cria o acesso completo de um atleta no BT Performance
# (auth via signup oficial + perfil + ficha vinculada ao treinador), sem SQL.
#
# Uso:
#   ./scripts/criar-atleta.sh <email> <senha-inicial> "<Nome Completo>" <atleta-slug>
# Ex.:
#   ./scripts/criar-atleta.sh maria@exemplo.com 'S3nha-F0rte!' "Maria Souza" maria-souza
#
# Requisitos: rodar da pasta do app; treinador informado via env ou prompt:
#   BT_COACH_EMAIL / BT_COACH_SENHA  (default: pergunta no terminal)
# O <atleta-slug> DEVE ser o mesmo atleta_id da planilha/CSVs do lab.
set -euo pipefail
cd "$(dirname "$0")/.."

EMAIL="${1:?uso: criar-atleta.sh <email> <senha> <nome> <slug>}"
SENHA="${2:?falta a senha inicial}"
NOME="${3:?falta o nome completo}"
SLUG="${4:?falta o atleta-slug (igual ao da planilha)}"

URL=$(grep SUPABASE_URL js/supabase-config.js | cut -d"'" -f2)
KEY=$(grep ANON_KEY js/supabase-config.js | cut -d"'" -f2)
COACH_EMAIL="${BT_COACH_EMAIL:-}"; COACH_SENHA="${BT_COACH_SENHA:-}"
[ -z "$COACH_EMAIL" ] && read -rp "E-mail do treinador: " COACH_EMAIL
[ -z "$COACH_SENHA" ] && read -rsp "Senha do treinador: " COACH_SENHA && echo

jqpy() { python3 -c "import sys,json;d=json.load(sys.stdin);print(d$1)"; }

echo "1/4 criando usuário (signup)…"
R=$(curl -s -X POST "$URL/auth/v1/signup" -H "apikey: $KEY" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$SENHA\"}")
UID_NOVO=$(echo "$R" | jqpy ".get('id') or d.get('user',{}).get('id')" 2>/dev/null || true)
TOK_NOVO=$(echo "$R" | jqpy ".get('access_token','')" 2>/dev/null || true)
[ -z "$UID_NOVO" ] && { echo "ERRO no signup ($EMAIL): $R"; exit 1; }
if [ -z "$TOK_NOVO" ]; then
  # conta criada (ou já existia) sem sessão imediata — normalmente o projeto
  # exige confirmação de e-mail antes do primeiro login. Tenta logar direto
  # pra confirmar a causa com uma mensagem clara em vez de falhar mais na frente.
  echo "   sem sessão imediata no signup — tentando login pra confirmar a causa…"
  RL=$(curl -s -X POST "$URL/auth/v1/token?grant_type=password" -H "apikey: $KEY" \
    -H "Content-Type: application/json" -d "{\"email\":\"$EMAIL\",\"password\":\"$SENHA\"}")
  TOK_NOVO=$(echo "$RL" | jqpy ".get('access_token','')" 2>/dev/null || true)
  if [ -z "$TOK_NOVO" ]; then
    echo "ERRO: conta $EMAIL existe, mas não há sessão disponível ainda."
    echo "Resposta do login: $RL"
    echo "Se a mensagem falar de confirmação de e-mail, confirme o e-mail (verifique a caixa de $EMAIL) e rode este script de novo com os mesmos dados."
    exit 1
  fi
fi

echo "2/4 criando perfil de atleta (vínculo $SLUG)…"
RB=$(curl -s -w '\n%{http_code}' -X POST "$URL/rest/v1/bt_perfis" -H "apikey: $KEY" -H "Authorization: Bearer $TOK_NOVO" \
  -H "Content-Type: application/json" \
  -d "[{\"user_id\":\"$UID_NOVO\",\"papel\":\"atleta\",\"nome\":\"$NOME\",\"atleta_id\":\"$SLUG\"}]")
CODE_B="${RB##*$'\n'}"
[ "$CODE_B" -ge 300 ] && { echo "ERRO ao criar perfil em bt_perfis (HTTP $CODE_B): ${RB%$'\n'*}"; exit 1; }

echo "3/4 logando como treinador e criando a ficha…"
RC=$(curl -s -X POST "$URL/auth/v1/token?grant_type=password" -H "apikey: $KEY" \
  -H "Content-Type: application/json" -d "{\"email\":\"$COACH_EMAIL\",\"password\":\"$COACH_SENHA\"}")
TOK_COACH=$(echo "$RC" | jqpy ".get('access_token','')")
[ -z "$TOK_COACH" ] && { echo "ERRO no login do treinador ($COACH_EMAIL): $RC"; exit 1; }
RP=$(curl -s -H "apikey: $KEY" -H "Authorization: Bearer $TOK_COACH" \
  "$URL/rest/v1/bt_perfis?select=user_id&papel=eq.treinador")
COACH_UID=$(echo "$RP" | jqpy "[0]['user_id']" 2>/dev/null || true)
[ -z "$COACH_UID" ] && { echo "ERRO: $COACH_EMAIL logou, mas não tem perfil papel=treinador em bt_perfis. Resposta: $RP"; exit 1; }
RA=$(curl -s -w '\n%{http_code}' -X POST "$URL/rest/v1/bt_atletas" -H "apikey: $KEY" -H "Authorization: Bearer $TOK_COACH" \
  -H "Content-Type: application/json" -H "Prefer: resolution=merge-duplicates" \
  -d "[{\"atleta_id\":\"$SLUG\",\"treinador_id\":\"$COACH_UID\",\"nome\":\"$NOME\",\"status\":\"ativo\"}]")
CODE_A="${RA##*$'\n'}"
[ "$CODE_A" -ge 300 ] && { echo "ERRO ao criar ficha em bt_atletas (HTTP $CODE_A): ${RA%$'\n'*}"; exit 1; }

echo "4/4 validando login do atleta…"
RV=$(curl -s -X POST "$URL/auth/v1/token?grant_type=password" -H "apikey: $KEY" \
  -H "Content-Type: application/json" -d "{\"email\":\"$EMAIL\",\"password\":\"$SENHA\"}")
[ -z "$(echo "$RV" | jqpy ".get('access_token','')")" ] && { echo "ERRO ao validar login do atleta ($EMAIL): $RV"; exit 1; }

echo "✅ Atleta criado: $EMAIL → $SLUG (treinador $COACH_EMAIL)."
echo "   Oriente a troca da senha inicial. Slug deve bater com a planilha do lab."
