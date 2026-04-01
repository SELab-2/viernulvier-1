#!/usr/bin/env sh
set -e

echo ">>> Waiting for Garage to be ready..."
until docker exec viernulvier-garage /garage -c /etc/garage.toml status > /dev/null 2>&1; do
  sleep 2
done
echo ">>> Garage is up."

# ── Get node ID ───────────────────────────────────────────────────────────────
NODE_ID=$(docker exec viernulvier-garage /garage -c /etc/garage.toml node id -q 2>/dev/null | head -n1 | cut -d@ -f1)
echo ">>> Node ID: $NODE_ID"

# ── Apply layout ──────────────────────────────────────────────────────────────
LAYOUT_VERSION=$(docker exec viernulvier-garage /garage -c /etc/garage.toml layout show 2>/dev/null | grep "Current cluster layout version" | grep -o '[0-9]*')
echo ">>> Layout version: $LAYOUT_VERSION"

if [ "$LAYOUT_VERSION" = "0" ] || [ -z "$LAYOUT_VERSION" ]; then
  echo ">>> Assigning layout..."
  docker exec viernulvier-garage /garage -c /etc/garage.toml layout assign -z default -c 1G "$NODE_ID"
  docker exec viernulvier-garage /garage -c /etc/garage.toml layout apply --version 1
  echo ">>> Layout applied."
else
  echo ">>> Layout already applied (version $LAYOUT_VERSION), skipping."
fi

# ── Create buckets ────────────────────────────────────────────────────────────
BUCKET_LIST=$(docker exec viernulvier-garage /garage -c /etc/garage.toml bucket list)

if echo "$BUCKET_LIST" | grep -q "crops"; then
  echo ">>> Bucket 'crops' already exists, skipping."
else
  docker exec viernulvier-garage /garage -c /etc/garage.toml bucket create crops
  echo ">>> Bucket 'crops' created."
fi

if echo "$BUCKET_LIST" | grep -q "profile-pictures"; then
  echo ">>> Bucket 'profile-pictures' already exists, skipping."
else
  docker exec viernulvier-garage /garage -c /etc/garage.toml bucket create profile-pictures
  echo ">>> Bucket 'profile-pictures' created."
fi

# ── Create key ────────────────────────────────────────────────────────────────
CREDS_FILE="/garage-credentials/credentials.env"

if docker exec viernulvier-garage /garage -c /etc/garage.toml key list | grep -q "backend-key"; then
  if [ ! -s "$CREDS_FILE" ]; then
    echo ">>> Key exists but credentials file is empty, recreating key..."
    KEY_ID=$(docker exec viernulvier-garage /garage -c /etc/garage.toml key list \
      | grep "backend-key" \
      | cut -d' ' -f1)
    docker exec viernulvier-garage /garage -c /etc/garage.toml key delete --yes "$KEY_ID"
  else
    KEY_ID=$(grep GARAGE_ACCESS_KEY_ID "$CREDS_FILE" | cut -d= -f2 | tr -d '\r')
    echo ">>> Key already exists ($KEY_ID), skipping creation."
  fi
fi

if [ ! -s "$CREDS_FILE" ]; then
  echo ">>> Creating access key 'backend-key'..."
  KEY_OUTPUT=$(docker exec viernulvier-garage /garage -c /etc/garage.toml key create backend-key)

  # ✅ tr -s ' ' squeezes multiple spaces before cutting
  KEY_ID=$(echo "$KEY_OUTPUT"     | grep "Key ID"     | tr -s ' ' | cut -d' ' -f3)
  KEY_SECRET=$(echo "$KEY_OUTPUT" | grep "Secret key" | tr -s ' ' | cut -d' ' -f3)

  # Abort early if parsing failed so we don't write empty values
  if [ -z "$KEY_ID" ] || [ -z "$KEY_SECRET" ]; then
    echo ">>> ERROR: Failed to parse key output:"
    echo "$KEY_OUTPUT"
    exit 1
  fi

  echo "GARAGE_ACCESS_KEY_ID=$KEY_ID"         > "$CREDS_FILE"
  echo "GARAGE_SECRET_ACCESS_KEY=$KEY_SECRET" >> "$CREDS_FILE"
  echo ">>> Key created: $KEY_ID"
  echo ">>> Key created and credentials written."
fi

# ── Grant key access to buckets ───────────────────────────────────────────────
echo ">>> Granting key access to bucket 'crops'..."
docker exec viernulvier-garage /garage -c /etc/garage.toml bucket allow \
  --read --write --owner crops --key "$KEY_ID"

echo ">>> Granting key access to bucket 'profile-pictures'..."
docker exec viernulvier-garage /garage -c /etc/garage.toml bucket allow \
  --read --write --owner profile-pictures --key "$KEY_ID"

echo ">>> Init complete."