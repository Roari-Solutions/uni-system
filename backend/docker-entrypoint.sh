#!/bin/sh
set -e

echo "Running database migrations..."
bunx drizzle-kit push --force

exec "$@"

