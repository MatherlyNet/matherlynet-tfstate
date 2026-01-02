# Project Index: tfstate-worker

Generated: 2026-01-02

## Overview

A Terraform state backend using the HTTP backend protocol, backed by Cloudflare Workers and R2 storage. Supports state locking via Durable Objects.

**Tech Stack**: TypeScript, Hono (web framework), Cloudflare Workers, R2, Durable Objects

## Project Structure

```
matherlynet-tfstate/
├── src/
│   ├── index.ts          # Main worker entry point & HTTP routes
│   ├── durableLock.ts    # Durable Object for state locking
│   └── types/
│       └── env.ts        # Environment type definitions
├── test/
│   ├── index.spec.ts     # Vitest tests
│   └── env.d.ts          # Test environment types
├── example/
│   └── main.tf           # Example Terraform configuration
├── .github/
│   └── workflows/
│       ├── test.yaml     # CI test pipeline
│       └── deploy.yaml   # Production deployment pipeline
├── wrangler.toml         # Cloudflare Worker config
├── package.json          # Dependencies & scripts
├── tsconfig.json         # TypeScript config
└── biome.json            # Linting/formatting config
```

## Entry Points

| Type | Path | Purpose |
| ------ | ------ | --------- |
| Main | `src/index.ts` | Worker entry, exports Hono app |
| Durable Object | `src/durableLock.ts` | Lock management class |
| Tests | `test/index.spec.ts` | Vitest test suite |

## Core Modules

### `src/types/env.ts` - Type Definitions
Exports:
- `Env` - Environment interface for Worker bindings (USERNAME, PASSWORD, TFSTATE_BUCKET, TFSTATE_LOCK)

### `src/index.ts` - HTTP API
Exports:
- `default` - Hono app instance (worker entry)
- `DurableLock` - Re-exported Durable Object class
- `Env` - Re-exported environment type
- `LockInfo` - Type definition for lock metadata

Routes:

| Method | Path | Description |
| -------- | ------ | ------------- |
| GET | `/health` | Health check |
| GET | `/states/:projectName` | Get terraform state |
| POST | `/states/:projectName` | Update terraform state |
| LOCK/PUT | `/states/:projectName/lock` | Acquire lock |
| UNLOCK/DELETE | `/states/:projectName/lock` | Release lock |
| GET | `/states/:projectName/lock` | Get current lock info |

### `src/durableLock.ts` - Lock Manager
Exports:
- `DurableLock` - Durable Object class
- `LockResult` - Type for lock operation results

Methods:
- `info()` - Get current lock state
- `lock(lockInfo)` - Acquire lock
- `unlock(lockInfo)` - Release lock

## Configuration

| File | Purpose |
| ------ | --------- |
| `wrangler.toml` | Cloudflare Worker deployment config (R2 bucket, routes, Durable Objects) |
| `tsconfig.json` | TypeScript compiler options |
| `biome.json` | Code linting and formatting |
| `vitest.config.js` | Test runner configuration |

## Environment Variables

| Variable | Type | Description | Source |
| ---------- | ------ | ------------- | -------- |
| `USERNAME` | Secret | Basic auth username | `.dev.vars` (local) / `wrangler secret` (prod) |
| `PASSWORD` | Secret | Basic auth password | `.dev.vars` (local) / `wrangler secret` (prod) |
| `CLOUDFLARE_ACCOUNT_ID` | Env | Cloudflare account ID | `.env` file or environment variable |
| `CLOUDFLARE_API_TOKEN` | Env | API token for deployments | `.env` file (use "Edit Cloudflare Workers" template) |
| `TFSTATE_BUCKET` | Binding | R2 bucket for state storage | `wrangler.toml` |
| `TFSTATE_LOCK` | Binding | Durable Object namespace for locks | `wrangler.toml` |

## Dependencies

| Package | Version | Purpose |
| --------- | --------- | --------- |
| `hono` | ^4.11.3 | Web framework for Workers |
| `wrangler` | ^4.4.0 | Cloudflare CLI (dev) |
| `vitest` | 4.0.16 | Test runner (dev) |
| `@biomejs/biome` | 2.3.10 | Linter/formatter (dev) |
| `typescript` | ^5.9.3 | Type checking (dev) |

## Scripts

```bash
npm run dev      # Start local dev server
npm run deploy   # Deploy to Cloudflare
npm run test     # Run tests
npm run lint     # Lint and type-check
npm run format   # Format code
```

## Test Coverage

- Unit tests: 1 file (`test/index.spec.ts`)
- Test framework: Vitest with Cloudflare Workers pool
- CI: GitHub Actions on push/PR to main

## Quick Start

1. Clone and install: `npm install`
2. Configure environment: `cp .env.example .env` (add `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`)
3. Create local secrets: Create `.dev.vars` with `USERNAME` and `PASSWORD`
4. Local dev: `npm run dev`
5. Deploy: `npm run deploy`
6. Set production secrets: `wrangler secret put USERNAME && wrangler secret put PASSWORD`

## Terraform Usage

```hcl
terraform {
  backend "http" {
    address        = "https://tfstate.example.com/states/project-name"
    lock_address   = "https://tfstate.example.com/states/project-name/lock"
    lock_method    = "LOCK"
    unlock_address = "https://tfstate.example.com/states/project-name/lock"
    unlock_method  = "UNLOCK"
    username       = "<USERNAME>"
    password       = "<PASSWORD>"
  }
}
```

## Architecture

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────┐
│   Terraform     │────▶│  Cloudflare Worker   │────▶│  R2 Bucket  │
│   (HTTP client) │     │  (Hono + Basic Auth) │     │  (tfstate)  │
└─────────────────┘     └──────────┬───────────┘     └─────────────┘
                                   │
                                   ▼
                        ┌──────────────────────┐
                        │   Durable Object     │
                        │   (DurableLock)      │
                        └──────────────────────┘
```

## Security Notes

- All `/states/*` routes require Basic Auth
- mTLS can be configured via Cloudflare
- State is stored per-username namespace in R2
