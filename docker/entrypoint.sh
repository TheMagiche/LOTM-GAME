#!/bin/sh
set -eu

mkdir -p /app/data/campaigns /app/data/backups /app/data/portraits /app/data/mods

# Named volumes start empty and would hide image-baked mods. Copy each shipped
# mod only when the persisted folder does not already have that name, so user
# edits survive redeploys.
if [ -d /app/mods.shipped ]; then
  for item in /app/mods.shipped/*; do
    [ -e "$item" ] || continue
    name=$(basename "$item")
    if [ ! -e "/app/data/mods/$name" ]; then
      cp -a "$item" "/app/data/mods/$name"
    fi
  done
fi

if [ "$(id -u)" = "0" ]; then
  chown -R node:node /app/data
  exec gosu node "$@"
fi

exec "$@"
