#!/usr/bin/env bash
#
# Gera o dump AUTORITATIVO do schema do banco, para substituir a reconstrução
# em supabase/schema/baseline-reconstruido.sql.
#
# Uso:
#   export SUPABASE_DB_URL='postgresql://postgres.<ref>:<senha>@<host>:6543/postgres'
#   ./supabase/dump-schema.sh
#
# Onde achar a URL: painel do Supabase → Project Settings → Database →
# Connection string → URI (marque "Use connection pooling" e troque
# [YOUR-PASSWORD] pela senha do banco).
#
# Requer apenas Node/npx — o CLI do Supabase é baixado sob demanda.
# Só faz leitura: `db dump` não altera nada no banco.

set -euo pipefail

cd "$(dirname "$0")/.."
OUT_DIR="supabase/schema"
mkdir -p "$OUT_DIR"

if [[ -z "${SUPABASE_DB_URL:-}" ]]; then
  echo "erro: defina SUPABASE_DB_URL antes de rodar (veja o cabeçalho deste script)." >&2
  exit 1
fi

echo "→ estrutura (tabelas, tipos, funções, constraints)…"
npx --yes supabase db dump --db-url "$SUPABASE_DB_URL" -f "$OUT_DIR/schema.sql"

echo "→ policies de RLS e grants…"
npx --yes supabase db dump --db-url "$SUPABASE_DB_URL" --role-only -f "$OUT_DIR/roles.sql" || \
  echo "  (aviso: --role-only falhou; as policies já saem dentro de schema.sql)"

echo
echo "Pronto:"
ls -la "$OUT_DIR"
echo
echo "Próximo passo: confira o diff contra baseline-reconstruido.sql, apague a"
echo "reconstrução se o dump cobrir tudo, e commite o resultado."
