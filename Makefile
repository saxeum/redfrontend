# Frontend repository (Vite + React).
#
# Self-contained: it never imports backend source.
# The only contract with the backend is the OpenAPI schema.

SHELL := /bin/bash
.DEFAULT_GOAL := help

BUN          ?= $(shell command -v bun 2>/dev/null || printf '%s' "$$HOME/.bun/bin/bun")
API_URL      ?= http://localhost:8000
SPEC_SOURCE  ?= $(API_URL)/api/v1/openapi.json

export PATH := $(dir $(BUN)):$(PATH)

##@ Getting started

help: ## Show this help
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} \
	/^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } \
	/^[a-zA-Z_0-9-]+:.*?##/ { printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

doctor: ## Check tooling and required files
	@printf '%-12s' 'bun:'; if command -v $(BUN) >/dev/null 2>&1; then $(BUN) --version; else echo 'MISSING — https://bun.sh/'; fi
	@printf '%-12s' 'docker:'; if command -v docker >/dev/null 2>&1; then docker --version; else echo 'MISSING (Docker optional)'; fi
	@printf '%-12s' '.env:'; if [ -f .env ]; then echo 'present'; else echo 'MISSING — cp .env.example .env'; fi

urls: ## Print local URLs
	@echo 'Frontend dev server: http://localhost:5173'
	@echo 'Backend API:         $(API_URL)'

env-check: ## Verify .env exists
	@test -f .env || { echo 'Missing .env — run: cp .env.example .env'; exit 1; }

##@ Setup

setup: ## Install dependencies
	cd $(CURDIR) && $(BUN) install

dev: ## Run the Vite dev server (port 5173)
	cd $(CURDIR) && $(BUN) run dev

##@ Build

build: ## Build static assets into dist/
	cd $(CURDIR) && $(BUN) run build

preview: ## Preview the production build
	cd $(CURDIR) && $(BUN) run preview

##@ Quality

lint: ## Run biome (writes fixes)
	cd $(CURDIR) && $(BUN) run lint

##@ Tests

test-e2e: ## Run Playwright E2E serially (needs a running backend)
	@curl -fsS $(API_URL)/api/v1/utils/health-check/ >/dev/null || { echo "Backend not reachable at $(API_URL)."; exit 1; }
	cd $(CURDIR) && $(BUN) x playwright test --workers=1

test-e2e-ui: ## Run Playwright in UI mode
	cd $(CURDIR) && $(BUN) x playwright test --ui

##@ OpenAPI client

generate-client: ## Regenerate src/client from the backend spec
	cd $(CURDIR) && SPEC_SOURCE=$(SPEC_SOURCE) bash scripts/generate-client.sh

##@ Docker

docker-build: ## Build the static frontend image
	docker build --build-arg VITE_API_URL=$(API_URL) -t frontend:latest .

##@ Cleanup

clean: ## Remove build and test artifacts
	@rm -rf dist openapi.json test-results playwright-report blob-report playwright/.auth
	@echo 'Build and test artifacts removed.'

.PHONY: help doctor urls env-check setup dev build preview lint \
	test-e2e test-e2e-ui generate-client docker-build clean
