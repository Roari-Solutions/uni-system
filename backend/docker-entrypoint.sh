#!/bin/sh
set -e

echo "Running database migrations..."
npx drizzle-kit push --config=drizzle.config.ts

echo "Starting app..."
exec node dist/src/main.js

