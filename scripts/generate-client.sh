#!/usr/bin/env bash
# Fetch an OpenAPI schema from the backend and regenerate the TypeScript client.
#
# This is the only contract between the frontend and backend repositories.
# SPEC_SOURCE may be an HTTP(S) URL or a local file path.
set -euo pipefail

SPEC_SOURCE="${SPEC_SOURCE:-http://localhost:8000/api/v1/openapi.json}"

case "$SPEC_SOURCE" in
  http://*|https://*)
    echo "Fetching OpenAPI schema from $SPEC_SOURCE"
    curl -fsS "$SPEC_SOURCE" -o openapi.json
    ;;
  *)
    echo "Using OpenAPI schema from $SPEC_SOURCE"
    cp "$SPEC_SOURCE" openapi.json
    ;;
esac

bun run generate-client
