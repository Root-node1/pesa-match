#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

log() { printf '\n\033[1;34m==>\033[0m %s\n' "$*"; }
err() { printf '\n\033[1;31mERROR:\033[0m %s\n' "$*" >&2; }

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    err "Required command '$1' is not installed."
    if [ -n "${2:-}" ]; then echo "$2" >&2; fi
    exit 1
  fi
}

compose_command() {
  if docker compose version >/dev/null 2>&1; then
    echo "docker compose"
  elif command -v docker-compose >/dev/null 2>&1; then
    echo "docker-compose"
  else
    echo ""
  fi
}

check_node() {
  require_cmd node "Install Node.js 20+ from https://nodejs.org/"
  require_cmd npm "npm is bundled with Node.js."
  local major
  major="$(node -v | sed 's/^v\([0-9]*\).*/\1/')"
  if [ "$major" -lt 18 ]; then
    err "Node.js 18+ is required (found $(node -v))."
    exit 1
  fi
}

cmd_setup() {
  log "Checking required tools"
  check_node
  if ! command -v docker >/dev/null 2>&1; then
    echo "Docker is optional for setup but required for 'db-up'."
  fi

  log "Ensuring npm workspace configuration"
  if [ ! -f package.json ]; then
    cat > package.json <<'EOF'
{
  "name": "pesa-match",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "concurrently -k -n api,web \"npm run dev -w apps/backend\" \"npm run dev -w apps/frontend\"",
    "build": "npm run build -w apps/backend && npm run build -w apps/frontend",
    "lint": "npm run lint -w apps/backend && npm run lint -w apps/frontend",
    "test": "npm run test -w apps/backend && npm run test:e2e -w apps/backend",
    "typecheck": "npm run typecheck -w apps/frontend"
  },
  "devDependencies": {
    "concurrently": "^9.1.2"
  }
}
EOF
  fi

  log "Creating application scaffolds if missing"
  mkdir -p apps packages
  if [ ! -d apps/backend ]; then
    npx --yes @nestjs/cli new backend --directory apps/backend --skip-git --skip-install --package-manager npm
  fi
  if [ ! -d apps/frontend ]; then
    npx --yes nuxi@latest init apps/frontend --template ui --packageManager npm --no-install --no-gitInit
    rm -f apps/frontend/pnpm-workspace.yaml apps/frontend/pnpm-lock.yaml
  fi
  if [ ! -d packages/shared ]; then
    mkdir -p packages/shared/src
    cat > packages/shared/package.json <<'EOF'
{ "name": "@pesa/shared", "version": "0.0.1", "private": true, "type": "module", "main": "src/index.ts" }
EOF
    printf 'export {};\n' > packages/shared/src/index.ts
  fi

  log "Installing dependencies"
  npm install --legacy-peer-deps

  log "Preparing environment files"
  for ex in apps/backend/.env.example apps/frontend/.env.example .env.example; do
    target="${ex%.example}"
    if [ -f "$ex" ] && [ ! -f "$target" ]; then
      cp "$ex" "$target"
      echo "Created $target from $ex"
    fi
  done

  log "Ensuring Docker Compose configuration"
  if [ ! -f docker-compose.yml ]; then
    cat > docker-compose.yml <<'EOF'
services:
  postgres:
    image: postgres:16
    container_name: pesa-match-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: pesa
      POSTGRES_PASSWORD: pesa
      POSTGRES_DB: pesa_match
    ports:
      - "127.0.0.1:5434:5432"
    volumes:
      - pesa_match_pg_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U pesa -d pesa_match"]
      interval: 5s
      timeout: 5s
      retries: 10
volumes:
  pesa_match_pg_data:
EOF
  fi

  if [ -f apps/backend/prisma/schema.prisma ]; then
    log "Generating Prisma client"
    (cd apps/backend && npx prisma generate)
  fi

  log "Verifying backend build"
  npm run build -w apps/backend

  if [ -d apps/frontend ]; then
    log "Preparing frontend types"
    (cd apps/frontend && npm run postinstall || true)
  fi

  log "Setup complete. Run './run.sh db-up' then './run.sh migrate' to prepare the database."
}

cmd_db_up() {
  local compose
  compose="$(compose_command)"
  if [ -z "$compose" ]; then
    err "Neither 'docker compose' nor 'docker-compose' is available."
    echo "Install Docker Compose (https://docs.docker.com/compose/install/) and retry." >&2
    exit 1
  fi
  log "Starting PostgreSQL via $compose"
  $compose up -d
  local status=0
  $compose ps || status=$?
  if [ "$status" -ne 0 ]; then
    err "Docker Compose reported an error."
    exit "$status"
  fi
  echo "PostgreSQL container status shown above. Verify 'healthy' before running migrations."
}

cmd_db_down() {
  local compose
  compose="$(compose_command)"
  if [ -z "$compose" ]; then
    err "Neither 'docker compose' nor 'docker-compose' is available."
    exit 1
  fi
  log "Stopping PostgreSQL via $compose"
  $compose down
}

cmd_migrate() {
  check_node
  require_cmd npx
  if [ ! -f apps/backend/prisma/schema.prisma ]; then
    err "Prisma schema not found at apps/backend/prisma/schema.prisma"
    exit 1
  fi
  log "Applying database migrations"
  (cd apps/backend && npx prisma migrate dev)
}

cmd_generate() {
  check_node
  if [ ! -f apps/backend/prisma/schema.prisma ]; then
    err "Prisma schema not found."
    exit 1
  fi
  log "Generating Prisma client"
  (cd apps/backend && npx prisma generate)
}

cmd_test() {
  check_node
  log "Running backend unit tests"
  npm run test -w apps/backend
  log "Running backend e2e tests"
  npm run test:e2e -w apps/backend
}

cmd_lint() {
  check_node
  log "Linting backend"
  npm run lint -w apps/backend
  log "Linting frontend"
  npm run lint -w apps/frontend
}

cmd_build() {
  check_node
  log "Building backend"
  npm run build -w apps/backend
  log "Building frontend"
  npm run build -w apps/frontend
}

cmd_dev() {
  check_node
  log "Starting backend and frontend (Ctrl+C to stop)"
  # Start backend
  npm run dev -w apps/backend &
  BACKEND_PID=$!
  npm run dev -w apps/frontend &
  FRONTEND_PID=$!
  trap 'echo; echo "Stopping..."; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true; wait $BACKEND_PID $FRONTEND_PID 2>/dev/null || true' INT TERM
  wait $BACKEND_PID $FRONTEND_PID
}

cmd_help() {
  cat <<'EOF'
PesaMatch development helper

Usage: ./run.sh <command>

Commands:
  setup     Bootstrap the monorepo (idempotent)
  dev       Run backend and frontend together
  db-up     Start PostgreSQL via Docker Compose
  db-down   Stop PostgreSQL
  migrate   Apply Prisma migrations (dev)
  generate  Generate Prisma client
  test      Run backend unit and e2e tests
  lint      Lint backend and frontend
  build     Build backend and frontend
  help      Show this help
EOF
}

main() {
  local cmd="${1:-help}"
  case "$cmd" in
    setup) cmd_setup ;;
    dev) cmd_dev ;;
    db-up) cmd_db_up ;;
    db-down) cmd_db_down ;;
    migrate) cmd_migrate ;;
    generate) cmd_generate ;;
    test) cmd_test ;;
    lint) cmd_lint ;;
    build) cmd_build ;;
    help|--help|-h) cmd_help ;;
    *) err "Unknown command: $cmd"; cmd_help; exit 2 ;;
  esac
}

main "$@"
