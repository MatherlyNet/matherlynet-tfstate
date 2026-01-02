# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Terraform HTTP state backend running on Cloudflare Workers with R2 storage and Durable Objects for state locking. Implements the [Terraform HTTP backend protocol](https://www.terraform.io/language/settings/backends/http).

## Commands

```bash
npm run dev      # Start local development server (wrangler dev)
npm run test     # Run tests with Vitest
npm run lint     # Biome lint + TypeScript type check
npm run format   # Format with Biome
npm run deploy   # Deploy to Cloudflare Workers
```

For local development:
```bash
# Create .dev.vars file (gitignored)
echo "USERNAME=terraform" > .dev.vars
echo "PASSWORD=your-password" >> .dev.vars
```

For production secrets:
```bash
wrangler secret put USERNAME
wrangler secret put PASSWORD
```

For account configuration:
```bash
cp .env.example .env
# Edit .env with CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN
# Create API token using "Edit Cloudflare Workers" template at:
# https://dash.cloudflare.com/profile/api-tokens
```

## Architecture

**Entry Point**: `src/index.ts` - Hono app exposing HTTP endpoints for Terraform state operations

**State Locking**: `src/durableLock.ts` - Durable Object class (`DurableLock`) providing distributed locking with `lock()`, `unlock()`, and `info()` methods

**Storage Pattern**: State files stored in R2 at `{username}/{projectName}.tfstate`

**Lock Coordination**: Each state file has a corresponding Durable Object instance keyed by the same path, ensuring atomic lock operations across distributed requests

## API Endpoints

| Method | Path | Purpose |
| -------- | ------ | --------- |
| GET | `/health` | Health check |
| GET | `/states/:projectName` | Get state (no lock required) |
| POST | `/states/:projectName` | Update state (validates lock if present) |
| LOCK/PUT | `/states/:projectName/lock` | Acquire lock |
| UNLOCK/DELETE | `/states/:projectName/lock` | Release lock |
| GET | `/states/:projectName/lock` | Get current lock info (non-standard, for debugging) |

## Cloudflare Bindings (wrangler.toml)

- `TFSTATE_BUCKET` - R2 bucket for state storage (must remain private, no public access)
- `TFSTATE_LOCK` - Durable Object namespace for locking
- `USERNAME` / `PASSWORD` - Basic auth credentials

## Security Note

The R2 bucket must remain **private**. Do NOT enable R2 Custom Domains or R2.dev public access. The Worker is the only authorized interface to the bucket - enabling public access would bypass authentication.

## Testing

Tests use `@cloudflare/vitest-pool-workers` which runs tests in a simulated Workers environment. Access the worker via the `SELF` binding from `cloudflare:test`.
