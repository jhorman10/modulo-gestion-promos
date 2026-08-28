#!/bin/sh
set -e

echo "Generating Prisma Client..."
npx prisma generate

echo "Running database migrations..."
npx prisma migrate deploy

echo "Seeding database with initial products and categories..."
npx tsx prisma/seed.ts

echo "Starting server..."
exec node dist/main.js
