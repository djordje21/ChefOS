#!/usr/bin/env bash
# Throwaway local PostgreSQL cluster for `npm run test:db` (no Docker needed).
# Requires PostgreSQL 15+ server binaries (e.g. apt install postgresql).
set -euo pipefail
DIR="${CHEFOS_PG_DIR:-/var/tmp/chefos-pg}"
PORT="${CHEFOS_PG_PORT:-54329}"
BIN="${PG_BIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
[ -x "$BIN/initdb" ] || { echo "PostgreSQL server binaries not found (set PG_BIN)"; exit 1; }
run() { if [ "$(id -u)" = 0 ]; then su postgres -c "$*"; else bash -c "$*"; fi; }
case "${1:-start}" in
  start)
    mkdir -p "$DIR"; [ "$(id -u)" = 0 ] && chown postgres "$DIR"
    [ -f "$DIR/data/PG_VERSION" ] || run "'$BIN/initdb' -D '$DIR/data' -U postgres -A trust >/dev/null"
    run "'$BIN/pg_ctl' -D '$DIR/data' -o \"-p $PORT -k '$DIR' -c listen_addresses=localhost\" -l '$DIR/log' -w status >/dev/null 2>&1 || '$BIN/pg_ctl' -D '$DIR/data' -o \"-p $PORT -k '$DIR' -c listen_addresses=localhost\" -l '$DIR/log' -w start >/dev/null"
    echo "export TEST_DATABASE_URL=postgresql://postgres@localhost:$PORT/postgres"
    ;;
  stop) run "'$BIN/pg_ctl' -D '$DIR/data' -m fast stop" ;;
  *) echo "usage: $0 start|stop"; exit 1 ;;
esac
