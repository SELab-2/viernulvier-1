#!/bin/bash
set -e

# export $(pnpm run --silent generate-secret)

echo "✓ JWT_SECRET generated"


# Source Garage credentials into the environment
if [ -f /garage-credentials/credentials.env ]; then
  set -a
  . /garage-credentials/credentials.env
  set +a
  echo "Loaded Garage credentials."
else
  echo "WARNING: /garage-credentials/credentials.env not found."
fi

exec "$@"