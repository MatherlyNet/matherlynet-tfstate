# Architecture

## System Overview

tfstate-worker is a Terraform HTTP state backend built on Cloudflare's edge infrastructure. It provides state storage via R2 and distributed locking via Durable Objects.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Cloudflare Edge                                │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      Worker (Hono App)                           │   │
│  │  ┌───────────┐  ┌──────────────────┐  ┌────────────────────┐   │   │
│  │  │  Logger   │  │   Basic Auth     │  │   Route Handlers   │   │   │
│  │  │Middleware │──│   Middleware     │──│  (GET/POST/LOCK)   │   │   │
│  │  └───────────┘  └──────────────────┘  └─────────┬──────────┘   │   │
│  └─────────────────────────────────────────────────┼───────────────┘   │
│                                                     │                    │
│            ┌────────────────────────────────────────┼────────────┐      │
│            │                                        │            │      │
│            ▼                                        ▼            │      │
│  ┌──────────────────┐                    ┌──────────────────┐   │      │
│  │    R2 Bucket     │                    │  Durable Object  │   │      │
│  │   (tfstate)      │                    │  (DurableLock)   │   │      │
│  │                  │                    │                  │   │      │
│  │ /{user}/{proj}   │                    │ Lock State:      │   │      │
│  │   .tfstate       │                    │ - LockInfo       │   │      │
│  └──────────────────┘                    │ - Storage API    │   │      │
│                                          └──────────────────┘   │      │
│                                                                  │      │
└─────────────────────────────────────────────────────────────────────────┘
            ▲
            │ HTTP (Basic Auth / mTLS)
            │
┌───────────┴───────────┐
│      Terraform        │
│   (HTTP Backend)      │
└───────────────────────┘
```

## Components

### 1. Hono Application (`src/index.ts`)

The main Worker entry point using [Hono](https://hono.dev/), a lightweight web framework optimized for edge runtimes.

**Responsibilities**:
- HTTP routing and request handling
- Middleware orchestration (logging, authentication)
- Coordination between R2 storage and Durable Objects
- Response formatting per Terraform HTTP backend spec

**Middleware Stack**:
```
Request → Logger → Basic Auth (for /states/*) → Route Handler → Response
```

### 2. Durable Object (`src/durableLock.ts`)

A [Cloudflare Durable Object](https://developers.cloudflare.com/durable-objects/) providing distributed, consistent locking.

**Responsibilities**:
- Maintain lock state with strong consistency
- Persist lock info across Worker invocations
- Provide atomic lock/unlock operations

**State Management**:
```typescript
// Lock stored in Durable Object storage
await this.state.storage.put("_lock", lockInfo);

// Concurrency control during initialization
this.state.blockConcurrencyWhile(async () => {
  this.lockInfo = await this.state.storage.get("_lock");
});
```

### 3. R2 Storage

[Cloudflare R2](https://developers.cloudflare.com/r2/) provides S3-compatible object storage for Terraform state files.

**Key Structure**:
```
{username}/{projectName}.tfstate
```

**Benefits**:
- No egress fees
- S3-compatible API
- Global distribution
- Integrated with Workers

**Security Requirement**:
The R2 bucket must remain **private** with no public access enabled:
- Do NOT enable R2 Custom Domains (public access)
- Do NOT enable R2.dev subdomain

The Worker is the only authorized interface to the bucket. Enabling public access
on the R2 bucket would bypass the Worker's authentication entirely.

## Data Flow

### State Read

```
1. GET /states/:projectName
2. Construct key: `{username}/{projectName}.tfstate`
3. Fetch from R2 bucket
4. Return JSON or 204 if not found
```

### State Write (with lock)

```
1. POST /states/:projectName?ID=<lock_id>
2. Get Durable Object stub for this state
3. Verify lock ID matches (if state is locked)
4. Write state to R2 bucket
5. Return 204 success
```

### Lock Acquisition

```
1. LOCK /states/:projectName/lock
2. Get Durable Object stub by state key
3. Call locker.lock(lockInfo)
4. If already locked: return 423 + existing LockInfo
5. If success: persist lock, return 200 + LockInfo
```

### Lock Release

```
1. UNLOCK /states/:projectName/lock
2. Get Durable Object stub by state key
3. Call locker.unlock(lockInfo)
4. Verify lock ID matches
5. Delete lock from storage, return 200
```

## Bindings

Configured in `wrangler.toml`:

```toml
# R2 bucket for state storage
r2_buckets = [
    { binding = "TFSTATE_BUCKET", bucket_name = "tfstate" }
]

# Durable Object for locking
[durable_objects]
bindings = [{ name = "TFSTATE_LOCK", class_name = "DurableLock" }]
```

## Security Model

### Authentication Layers

1. **Basic Auth**: Username/password verified per request
2. **mTLS** (optional): Client certificate verification at Cloudflare edge

### Namespace Isolation

States are stored per-username:
```
terraform-user-1/project-a.tfstate
terraform-user-1/project-b.tfstate
terraform-user-2/project-a.tfstate  # Different user, same project name
```

### Secrets Management

Credentials stored as Worker secrets (encrypted at rest):
```bash
wrangler secret put USERNAME
wrangler secret put PASSWORD
```

## Consistency Guarantees

| Operation | Consistency |
| ---------- | ------------- |
| State Read | Eventual (R2) |
| State Write | Strong (R2 + lock check) |
| Lock Operations | Strong (Durable Objects) |

Durable Objects provide single-threaded execution with transactional storage, ensuring lock operations are atomic and consistent.

## Scalability

- **Workers**: Auto-scale globally, run at edge closest to client
- **R2**: Distributed object storage with global replication
- **Durable Objects**: Single instance per lock, but globally addressable

The design supports many concurrent Terraform projects while ensuring each project's lock has strong consistency.
