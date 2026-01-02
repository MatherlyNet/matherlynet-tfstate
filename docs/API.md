# API Reference

## Overview

The tfstate-worker exposes a REST API compatible with Terraform's [HTTP backend](https://developer.hashicorp.com/terraform/language/backend/http). All `/states/*` endpoints require Basic Authentication.

## Authentication

All state endpoints require HTTP Basic Authentication:

```
Authorization: Basic base64(username:password)
```

Credentials are configured via Wrangler secrets:
```bash
wrangler secret put USERNAME
wrangler secret put PASSWORD
```

## Endpoints

### Health Check

```http
GET /health
```

**Response**: `200 OK` with body `OK`

No authentication required.

---

### Get State

Retrieve the current Terraform state for a project.

```http
GET /states/:projectName
```

**Path Parameters**:

| Parameter | Type | Description |
| ---------- | ------ | ------------- |
| `projectName` | string | Unique project identifier |

**Responses**:

| Status | Description |
| -------- | ------------- |
| 200 | State found, JSON body returned |
| 204 | No state exists for this project |
| 401 | Authentication failed |

**Example**:
```bash
curl -u terraform:password https://tfstate.example.com/states/my-project
```

---

### Update State

Store or update the Terraform state for a project.

```http
POST /states/:projectName?ID=<lock_id>
```

**Path Parameters**:

| Parameter | Type | Description |
| ---------- | ------ | ------------- |
| `projectName` | string | Unique project identifier |

**Query Parameters**:

| Parameter | Type | Required | Description |
| ---------- | ------ | ---------- | ------------- |
| `ID` | string | No | Lock ID if state is locked |

**Request Body**: Raw Terraform state JSON

**Responses**:

| Status | Description |
| -------- | ------------- |
| 204 | State updated successfully |
| 401 | Authentication failed |
| 423 | State is locked by another process |

**Lock Behavior**:
- If state is unlocked: Update proceeds
- If state is locked and `ID` matches: Update proceeds
- If state is locked and `ID` doesn't match: Returns `423 Locked` with current lock info

---

### Acquire Lock

Lock the state to prevent concurrent modifications.

```http
LOCK /states/:projectName/lock
# or
PUT /states/:projectName/lock
```

**Request Body** (`LockInfo`):
```json
{
  "ID": "unique-lock-id",
  "Operation": "OperationTypeApply",
  "Info": "terraform apply",
  "Who": "user@hostname",
  "Version": "1.5.0",
  "Created": "2024-01-15T10:30:00Z",
  "Path": "path/to/state"
}
```

**Responses**:

| Status | Description |
| -------- | ------------- |
| 200 | Lock acquired, returns `LockInfo` |
| 401 | Authentication failed |
| 423 | Already locked, returns existing `LockInfo` |

---

### Release Lock

Release a previously acquired lock.

```http
UNLOCK /states/:projectName/lock
# or
DELETE /states/:projectName/lock
```

**Request Body** (`LockInfo`):
```json
{
  "ID": "unique-lock-id"
}
```

**Responses**:

| Status | Description |
| -------- | ------------- |
| 200 | Lock released successfully |
| 400 | Invalid request (missing ID) |
| 401 | Authentication failed |
| 423 | Lock ID doesn't match current lock |

---

### Get Lock Info

Check the current lock status (non-standard, useful for debugging).

```http
GET /states/:projectName/lock
```

**Responses**:

| Status | Description |
| -------- | ------------- |
| 200 | State is locked, returns `LockInfo` |
| 204 | State is not locked |
| 401 | Authentication failed |

---

## Types

### LockInfo

Based on [Terraform's LockInfo struct](https://github.com/hashicorp/terraform/blob/main/internal/states/statemgr/locker.go):

```typescript
type LockInfo = {
  ID: string;        // Unique lock identifier
  Operation: string; // e.g., "OperationTypeApply"
  Info: string;      // Human-readable description
  Who: string;       // User/host acquiring lock
  Version: string;   // Terraform version
  Created: string;   // ISO 8601 timestamp
  Path: string;      // State path
};
```

### LockResult

Internal type for lock operations:

```typescript
type LockResult = {
  status: "locked" | "unlocked" | "already_locked" | "wrong_id" | "error";
  lockInfo: LockInfo;
  error?: string;
};
```

---

## Error Handling

All error responses include appropriate HTTP status codes:

| Status | Meaning |
| -------- | --------- |
| 400 | Bad Request - Invalid lock info |
| 401 | Unauthorized - Invalid credentials |
| 423 | Locked - State is locked by another process |

Lock conflict responses (423) include the current `LockInfo` in the response body.

---

## Storage

States are stored in R2 with the following key structure:
```
{username}/{projectName}.tfstate
```

This provides namespace isolation per authenticated user.
