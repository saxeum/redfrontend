# Frontend

React + Vite + TypeScript app. This repository is standalone: it does not import
backend source. The only contract with the backend is its **OpenAPI schema**.

## Requirements

- [Bun](https://bun.sh/)
- A running backend for E2E tests (and optionally for client generation)

## Quick start

```bash
cp .env.example .env     # set VITE_API_URL to your backend
make setup
make dev                 # http://localhost:5173
```

The default `.env` points at `http://localhost:8000`, and includes test-only
superuser credentials that must match the backend's seeded superuser.

## Build

```bash
make build               # static assets in dist/
make preview
make docker-build        # nginx image serving dist/
```

For Docker, `VITE_API_URL` is baked in at build time:

```bash
docker build --build-arg VITE_API_URL=https://api.example.com -t frontend .
```

In production, route `/api/*` to the backend at the load balancer, or set
`VITE_API_URL` to the backend origin.

## OpenAPI client

The generated client lives in `src/client` and is committed. Regenerate it when
the backend schema changes:

```bash
# from a running backend
make generate-client

# from an exported spec (backend: make openapi)
make generate-client SPEC_SOURCE=../redbackend/openapi.json
```

`SPEC_SOURCE` is the only cross-repository input. No backend code is imported.

## Tests

Playwright E2E requires a running backend:

```bash
make test-e2e
```

The suite creates users, so the backend database should start clean. From the
backend repository, `make db-reset && make db-init` (or `make e2e-clean`) before
running the frontend suite. `FIRST_SUPERUSER` / `FIRST_SUPERUSER_PASSWORD` in
this repository's `.env` must match the backend.

## Layout

```
src/              React app, routes, hooks, generated client
tests/            Playwright E2E tests
scripts/          OpenAPI client generation
Dockerfile        static nginx image
Dockerfile.playwright
nginx.conf        SPA fallback
```
