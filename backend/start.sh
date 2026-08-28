#!/bin/sh
set -e

echo "Syncing database schema..."
npx prisma db push --accept-data-loss

echo "Seeding database with initial products and categories..."
npx tsx prisma/seed.ts

echo "Starting server..."
exec node dist/main.js
