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
the backend schema changes. Prefer the backend's committed artifact, which is
generated with the development-only `/private/users/` router excluded:

```bash
make generate-client-backend
# equivalent to:
make generate-client SPEC_SOURCE=../redbackend/openapi.json
```

To fetch from a running backend instead (development only, includes
`/private/users/`):

```bash
make generate-client
```

`SPEC_SOURCE` is the only cross-repository input. No backend code is imported.
`openapi.json` is gitignored here; commit the regenerated `src/client` files.

## Authentication

The login screen is driven by `GET /api/v1/utils/config`:

- `password_login` — render the email/password form and signup link.
- `google_login` — render the Google sign-in button.

Google sign-in uses the backend's authorization-code flow. The button navigates
to `GET /api/v1/auth/google/start`; the backend redirects to Google, exchanges
the code with the server-side client secret, and returns to
`/auth/callback#access_token=...`. The SPA stores that token and loads the user.
The client secret is never shipped to the browser.

Accounts with `has_password: false` (created through Google) do not see the
password tab in settings.

The access token is currently kept in `localStorage`; moving sessions to
httpOnly cookies is tracked as a follow-up hardening item.

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
