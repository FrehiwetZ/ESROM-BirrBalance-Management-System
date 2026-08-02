#!/bin/sh
set -e

echo "Applying database migrations..."
until npx prisma migrate deploy; do
  echo "Database not ready — retrying in 3 seconds..."
  sleep 3
done

echo "Starting ESROM BirrBalance API..."
exec node server.js
