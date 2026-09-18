#!/bin/sh
set -e

echo "Running database migrations..."
bunx drizzle-kit push --force

exec "$@"

echo "Starting app..."
exec node dist/src/main.js

