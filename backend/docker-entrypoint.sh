#!/bin/sh
set -e

echo "Running database migrations..."
npx drizzle-kit push

