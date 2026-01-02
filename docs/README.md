# Documentation Index

## Overview

This documentation covers the tfstate-worker, a Terraform HTTP state backend built on Cloudflare Workers and R2.

## Quick Links

| Document | Description |
| ---------- | ------------- |
| [API Reference](./API.md) | REST API endpoints, request/response formats |
| [Architecture](./ARCHITECTURE.md) | System design, components, data flow |
| [Deployment](./DEPLOYMENT.md) | Production deployment and configuration |
| [Development](./DEVELOPMENT.md) | Local setup, testing, contributing |

## Project Summary

**tfstate-worker** provides:
- Terraform state storage via Cloudflare R2
- Distributed locking via Durable Objects
- Basic auth + optional mTLS security
- HTTP backend protocol compatibility

## Architecture at a Glance

```
Terraform → Worker (Hono) → R2 (state storage)
                         → Durable Objects (locking)
```

## Key Files

| File | Purpose |
| ---------- | ------------- |
| `src/index.ts` | Main worker, routes, middleware |
| `src/durableLock.ts` | Durable Object for locking |
| `wrangler.toml` | Cloudflare deployment config |

## Getting Started

1. **Deploy**: See [Deployment Guide](./DEPLOYMENT.md)
2. **Configure Terraform**: See [API Reference](./API.md#terraform-usage)
3. **Develop locally**: See [Development Guide](./DEVELOPMENT.md)

## External References

- [Terraform HTTP Backend](https://developer.hashicorp.com/terraform/language/backend/http)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Cloudflare R2](https://developers.cloudflare.com/r2/)
- [Cloudflare Durable Objects](https://developers.cloudflare.com/durable-objects/)
- [Hono Framework](https://hono.dev/)
