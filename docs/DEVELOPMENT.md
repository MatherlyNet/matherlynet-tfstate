# Development Guide

## Setup

```bash
# Clone repository
git clone <repo-url>
cd matherlynet-tfstate

# Install dependencies
npm install

# Configure local secrets
cp .env.example .env
# Edit .env with your Cloudflare account ID

# Create local development secrets
cat > .dev.vars << 'EOF'
USERNAME=terraform
PASSWORD=password
EOF
```

## Project Structure

```
├── src/
│   ├── index.ts          # Main entry point, Hono app, routes
│   └── durableLock.ts    # Durable Object class for locking
├── test/
│   ├── index.spec.ts     # Vitest tests
│   └── env.d.ts          # Test environment types
├── example/
│   └── main.tf           # Example Terraform config
├── wrangler.toml         # Cloudflare Worker config
├── tsconfig.json         # TypeScript config
├── biome.json            # Linting/formatting config
└── vitest.config.js      # Test configuration
```

## Scripts

| Script | Description |
| -------- | ------------- |
| `npm run dev` | Start local dev server with hot reload |
| `npm run test` | Run Vitest tests |
| `npm run lint` | Run Biome linter + TypeScript type check |
| `npm run format` | Format code with Biome |
| `npm run deploy` | Deploy to Cloudflare |

## Local Development

### Start Dev Server

```bash
npm run dev
# Server starts at http://localhost:8787
```

### Test with Example Project

```bash
# Terminal 1: Start worker
npm run dev

# Terminal 2: Initialize Terraform
cd example
terraform init
terraform plan
terraform apply
```

The example uses default credentials (`terraform:password`) matching `.dev.vars`.

## Testing

### Run Tests

```bash
npm run test

# Watch mode
npm run test -- --watch

# Coverage
npm run test -- --coverage
```

### Test Framework

Uses Vitest with `@cloudflare/vitest-pool-workers` for Workers runtime simulation.

```typescript
import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

describe("Health endpoint", () => {
  it("responds with 200 OK", async () => {
    const response = await SELF.fetch("https://example.com/health");
    expect(response.status).toBe(200);
  });
});
```

### Adding Tests

Create tests in `test/` directory with `.spec.ts` extension:

```typescript
// test/lock.spec.ts
import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import "../src";

describe("Lock operations", () => {
  it("acquires lock", async () => {
    const response = await SELF.fetch("https://example.com/states/test/lock", {
      method: "LOCK",
      headers: {
        Authorization: "Basic " + btoa("terraform:password"),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ID: "test-lock-id",
        Operation: "test",
        Who: "vitest",
        Version: "1.0.0",
        Created: new Date().toISOString(),
        Path: "test",
        Info: "test lock",
      }),
    });
    expect(response.status).toBe(200);
  });
});
```

## Code Style

### Linting

```bash
# Check and auto-fix
npm run lint

# Check only
npx biome lint ./
npx tsc --noEmit
```

### Formatting

```bash
# Format all files
npm run format

# Check formatting
npx biome format ./
```

### Biome Configuration

See `biome.json` for rules. Key settings:
- Indentation: tabs
- Quote style: double
- Semicolons: required

## Architecture Overview

### Hono Application

Main app in `src/index.ts`:

```typescript
const app = new Hono<{ Bindings: Bindings }>();

// Middleware
app.use(logger());
app.use("/states/*", basicAuth({ ... }));

// Routes
app.get("/health", ...);
app.get("/states/:projectName", ...);
app.post("/states/:projectName", ...);
app.on(["LOCK", "PUT"], "/states/:projectName/lock", ...);
app.on(["UNLOCK", "DELETE"], "/states/:projectName/lock", ...);

export default app;
```

### Durable Object

Lock manager in `src/durableLock.ts`:

```typescript
export class DurableLock extends DurableObject {
  async info(): Promise<LockInfo | null> { ... }
  async lock(lockInfo: LockInfo): Promise<LockResult> { ... }
  async unlock(lockInfo: LockInfo): Promise<LockResult> { ... }
}
```

### Environment Bindings

```typescript
type Bindings = {
  USERNAME: string;           // Basic auth username (secret)
  PASSWORD: string;           // Basic auth password (secret)
  TFSTATE_BUCKET: R2Bucket;   // R2 storage binding
  TFSTATE_LOCK: DurableObjectNamespace<DurableLock>;  // DO binding
};
```

## Adding Features

### New Route

```typescript
// src/index.ts
app.get("/states/:projectName/history", async (c) => {
  const projectName = c.req.param("projectName");
  // Implementation
  return c.json({ ... });
});
```

### New Middleware

```typescript
// src/index.ts
const rateLimiter = (): MiddlewareHandler => async (c, next) => {
  // Rate limiting logic
  await next();
};

app.use("/states/*", rateLimiter());
```

## Debugging

### Local Logs

```bash
npm run dev
# Logs appear in terminal
```

### Production Logs

```bash
wrangler tail
# Real-time logs from deployed Worker
```

### Common Debug Commands

```bash
# Check current lock
curl -u terraform:password http://localhost:8787/states/test/lock

# Get state
curl -u terraform:password http://localhost:8787/states/test

# Force unlock
curl -X DELETE -u terraform:password \
  -H "Content-Type: application/json" \
  -d '{"ID":"lock-id"}' \
  http://localhost:8787/states/test/lock
```
