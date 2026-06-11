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
R=$(curl -sf -X POST "$URL/auth/v1/signup" -H "apikey: $KEY" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$SENHA\"}")
UID_NOVO=$(echo "$R" | jqpy ".get('id') or d.get('user',{}).get('id')")
TOK_NOVO=$(echo "$R" | jqpy ".get('access_token','')")
[ -z "$UID_NOVO" ] && { echo "ERRO no signup: $R"; exit 1; }

echo "2/4 criando perfil de atleta (vínculo $SLUG)…"
curl -sf -X POST "$URL/rest/v1/bt_perfis" -H "apikey: $KEY" -H "Authorization: Bearer $TOK_NOVO" \
  -H "Content-Type: application/json" \
  -d "[{\"user_id\":\"$UID_NOVO\",\"papel\":\"atleta\",\"nome\":\"$NOME\",\"atleta_id\":\"$SLUG\"}]" > /dev/null

echo "3/4 logando como treinador e criando a ficha…"
TOK_COACH=$(curl -sf -X POST "$URL/auth/v1/token?grant_type=password" -H "apikey: $KEY" \
  -H "Content-Type: application/json" -d "{\"email\":\"$COACH_EMAIL\",\"password\":\"$COACH_SENHA\"}" | jqpy "['access_token']")
COACH_UID=$(curl -sf -H "apikey: $KEY" -H "Authorization: Bearer $TOK_COACH" \
  "$URL/rest/v1/bt_perfis?select=user_id&papel=eq.treinador" | jqpy "[0]['user_id']")
curl -sf -X POST "$URL/rest/v1/bt_atletas" -H "apikey: $KEY" -H "Authorization: Bearer $TOK_COACH" \
  -H "Content-Type: application/json" -H "Prefer: resolution=merge-duplicates" \
  -d "[{\"atleta_id\":\"$SLUG\",\"treinador_id\":\"$COACH_UID\",\"nome\":\"$NOME\",\"status\":\"ativo\"}]" > /dev/null

echo "4/4 validando login do atleta…"
curl -sf -X POST "$URL/auth/v1/token?grant_type=password" -H "apikey: $KEY" \
  -H "Content-Type: application/json" -d "{\"email\":\"$EMAIL\",\"password\":\"$SENHA\"}" > /dev/null

echo "✅ Atleta criado: $EMAIL → $SLUG (treinador $COACH_EMAIL)."
echo "   Oriente a troca da senha inicial. Slug deve bater com a planilha do lab."
