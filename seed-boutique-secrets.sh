#!/usr/bin/env bash
# Seed boutique app secrets into Azure Key Vault.
# All values come from environment variables — no interactive prompts.
# Safe to re-run: skips secrets that already exist.
#
# Required env vars (set as pipeline secret variables):
#   KEYVAULT          - Key Vault name
#   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM
#
# Generated automatically if not set:
#   POSTGRES_PASSWORD, RABBITMQ_PASSWORD

set -euo pipefail

KEYVAULT="${KEYVAULT:-crud-kv-24cc}"

# ── Helper ────────────────────────────────────────────────────────────────────

kv_set() {
  local name="$1" value="$2"
  if az keyvault secret show --vault-name "$KEYVAULT" --name "$name" &>/dev/null; then
    echo "    $name already exists, skipping."
  else
    az keyvault secret set --vault-name "$KEYVAULT" --name "$name" --value "$value" --output none
    echo "    $name set."
  fi
}

gen_password() {
  openssl rand -base64 24 | tr -d '/+=' | head -c 32
}

# ── Validate required SMTP vars ───────────────────────────────────────────────

REQUIRED_SMTP=(SMTP_HOST SMTP_PORT SMTP_USER SMTP_PASS EMAIL_FROM)
MISSING=()
for var in "${REQUIRED_SMTP[@]}"; do
  [[ -z "${!var:-}" ]] && MISSING+=("$var")
done

if [[ ${#MISSING[@]} -gt 0 ]]; then
  echo "WARNING: The following SMTP variables are not set — those secrets will be skipped:"
  printf '  %s\n' "${MISSING[@]}"
  echo "  Set them as secret pipeline variables and re-run to populate."
  echo ""
fi

# ── Generate infrastructure credentials ──────────────────────────────────────

POSTGRES_USER="boutique"
POSTGRES_DB="boutique"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-$(gen_password)}"

RABBITMQ_USER="boutique"
RABBITMQ_PASSWORD="${RABBITMQ_PASSWORD:-$(gen_password)}"

PG_HOST="postgres.boutique.svc.cluster.local"

AUTH_DB_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${PG_HOST}:5432/auth_db"
PRODUCTS_DB_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${PG_HOST}:5432/products_db"
ORDERS_DB_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${PG_HOST}:5432/orders_db"
USERS_DB_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${PG_HOST}:5432/users_db"

RABBIT_URL="amqp://${RABBITMQ_USER}:${RABBITMQ_PASSWORD}@rabbitmq.boutique.svc.cluster.local:5672"

# ── Push to Key Vault ─────────────────────────────────────────────────────────

echo "==> Writing secrets to Key Vault '$KEYVAULT'..."

kv_set "boutique-POSTGRES-DB"       "$POSTGRES_DB"
kv_set "boutique-POSTGRES-USER"     "$POSTGRES_USER"
kv_set "boutique-POSTGRES-PASSWORD" "$POSTGRES_PASSWORD"
kv_set "boutique-AUTH-DB-URL"       "$AUTH_DB_URL"
kv_set "boutique-PRODUCTS-DB-URL"   "$PRODUCTS_DB_URL"
kv_set "boutique-ORDERS-DB-URL"     "$ORDERS_DB_URL"
kv_set "boutique-USERS-DB-URL"      "$USERS_DB_URL"
kv_set "boutique-RABBITMQ-USER"     "$RABBITMQ_USER"
kv_set "boutique-RABBITMQ-PASSWORD" "$RABBITMQ_PASSWORD"
kv_set "boutique-RABBIT-URL"        "$RABBIT_URL"

[[ -n "${SMTP_HOST:-}"  ]] && kv_set "boutique-SMTP-HOST"  "$SMTP_HOST"
[[ -n "${SMTP_PORT:-}"  ]] && kv_set "boutique-SMTP-PORT"  "$SMTP_PORT"
[[ -n "${SMTP_USER:-}"  ]] && kv_set "boutique-SMTP-USER"  "$SMTP_USER"
[[ -n "${SMTP_PASS:-}"  ]] && kv_set "boutique-SMTP-PASS"  "$SMTP_PASS"
[[ -n "${EMAIL_FROM:-}" ]] && kv_set "boutique-EMAIL-FROM" "$EMAIL_FROM"

echo ""
echo "Done. All available secrets written to '$KEYVAULT'."
