#!/bin/bash
set -e

export $(pnpm run --silent generate-secret)

echo "✓ JWT_SECRET generated"

exec "$@"