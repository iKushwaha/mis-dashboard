#!/usr/bin/env bash
# Local static file server for the MIS Dashboard.
set -euo pipefail

PORT="${1:-8080}"
cd "$(dirname "$0")/.."
echo "Serving MIS Dashboard at http://localhost:${PORT} (Ctrl-C to stop)"
exec python3 -m http.server "${PORT}"
