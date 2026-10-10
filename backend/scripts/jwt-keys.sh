#!/bin/sh
# Prints a fresh ES256 key pair for access tokens, as .env lines:
#
#   sh scripts/jwt-keys.sh 2026-10 >> .env
#
# The private key goes in this service's .env only. The public key and its kid
# go in every service that verifies tokens (the LMS too). The argument is the
# kid; name it after the date, so a rotation can tell the keys apart.
set -e
kid="${1:?usage: sh scripts/jwt-keys.sh <kid>}"
dir="$(mktemp -d)"
trap 'rm -rf "$dir"' EXIT
openssl ecparam -name prime256v1 -genkey -noout -out "$dir/ec.pem"
openssl pkcs8 -topk8 -nocrypt -in "$dir/ec.pem" -out "$dir/private.pem"
openssl ec -in "$dir/ec.pem" -pubout -out "$dir/public.pem" 2>/dev/null
# env files hold one line per value; config.ts turns each \n back into a line break
oneline() { awk 'BEGIN { ORS = "\\n" } { print }' "$1"; }
echo "JWT_ACCESS_KID=$kid"
echo "JWT_ACCESS_PRIVATE_KEY=$(oneline "$dir/private.pem")"
echo "JWT_ACCESS_PUBLIC_KEY=$(oneline "$dir/public.pem")"
