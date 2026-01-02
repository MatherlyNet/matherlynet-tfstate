# Deployment Guide

## Prerequisites

- Node.js LTS (v18+)
- Cloudflare account with Workers and R2 enabled
- Wrangler CLI (`npm install -g wrangler`)

## Initial Setup

### 1. Create R2 Bucket

```bash
# Create the bucket via Cloudflare dashboard or API
# Name: tfstate (or customize in wrangler.toml)
```

> **IMPORTANT**: Keep the R2 bucket **private**. Do NOT enable:
> - Custom Domains (R2 public access)
> - R2.dev subdomain (public access)
>
> The Worker provides authenticated access to the bucket. Enabling public access
> on the R2 bucket itself would bypass authentication entirely.

### 2. Configure Environment

Copy the example environment file and fill in your Cloudflare Account ID:

```bash
cp .env.example .env
# Edit .env with your account ID
```

Or set as an environment variable:
```bash
export CLOUDFLARE_ACCOUNT_ID="your-account-id"
```

### 3. Configure wrangler.toml

The `wrangler.toml` should already be configured with:
- R2 bucket binding
- Durable Object bindings
- Custom domain route

Update the custom domain to match your domain:
```toml
routes = [{ pattern = "tfstate.yourdomain.com", custom_domain = true }]
```

### 4. Local Development Secrets

Create `.dev.vars` for local development:
```bash
# .dev.vars (gitignored)
USERNAME=terraform
PASSWORD=your-local-dev-password
```

## Deployment

### Local Development

```bash
npm install
npm run dev
# Worker available at http://localhost:8787
```

### Production Deployment

```bash
npm run deploy
# or
wrangler deploy
```

### Set Production Secrets

After deploying the Worker, set the authentication secrets:
```bash
# Set authentication credentials (prompted for values)
wrangler secret put USERNAME
wrangler secret put PASSWORD

# Or pipe values for CI/CD
echo "your-username" | wrangler secret put USERNAME
echo "your-secure-password" | wrangler secret put PASSWORD
```

### Verify Deployment

```bash
# Health check
curl https://tfstate.yourdomain.com/health
# Expected: "OK"

# Test authentication
curl -u username:password https://tfstate.yourdomain.com/states/test
# Expected: 204 No Content (no state yet)
```

## Custom Domain Setup (Worker Route)

This configures a custom domain for the **Worker**, not the R2 bucket.

1. Add domain to Cloudflare (must be proxied through Cloudflare)
2. Update `wrangler.toml`:
   ```toml
   routes = [{ pattern = "tfstate.yourdomain.com", custom_domain = true }]
   ```
3. Deploy: `wrangler deploy`
4. Cloudflare automatically provisions SSL

> **Note**: This is different from R2's "Custom Domains" feature. The R2 bucket
> should remain private with no public access enabled.

## mTLS Configuration (Optional)

For additional security, enable mutual TLS:

1. Go to Cloudflare Dashboard → SSL/TLS → Client Certificates
2. Create a CA and client certificates
3. Enable mTLS for your Worker domain
4. Configure Terraform with certificates:
   ```hcl
   backend "http" {
     # ... other config
     client_certificate_pem    = file("client.crt")
     client_private_key_pem    = file("client.key")
     client_ca_certificate_pem = file("ca.crt")
   }
   ```

## CI/CD Integration

### GitHub Actions

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: lts/*
      - run: npm install
      - run: npm run test
      - name: Deploy
        run: npx wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

### Required GitHub Secrets

| Secret | Description |
| -------- | ------------- |
| `CLOUDFLARE_API_TOKEN` | API token (use "Edit Cloudflare Workers" template) |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID |

### Creating the API Token

1. Go to [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Click **Create Token**
3. Select **Edit Cloudflare Workers** template
4. Configure:
   - Account Resources: Select your account
   - Zone Resources: All zones (or specific zone)
5. Create and copy the token

## Terraform Configuration

After deployment, configure Terraform:

```hcl
terraform {
  backend "http" {
    address        = "https://tfstate.yourdomain.com/states/my-project"
    lock_address   = "https://tfstate.yourdomain.com/states/my-project/lock"
    lock_method    = "LOCK"
    unlock_address = "https://tfstate.yourdomain.com/states/my-project/lock"
    unlock_method  = "UNLOCK"
    username       = "your-username"
    password       = "your-password"
  }
}
```

Initialize the backend:
```bash
terraform init
```

## Monitoring

### Logs

View Worker logs in real-time:
```bash
wrangler tail
```

Or via Cloudflare Dashboard → Workers → tfstate → Logs

### Metrics

Available in Cloudflare Dashboard:
- Request count
- Error rate
- CPU time
- Memory usage

## Troubleshooting

### Common Issues

**401 Unauthorized**
- Verify USERNAME and PASSWORD secrets are set
- Check credentials in Terraform config

**423 Locked**
- Another Terraform process holds the lock
- Force unlock: `terraform force-unlock <LOCK_ID>`
- Manual unlock: `curl -X DELETE -u user:pass https://tfstate.yourdomain.com/states/project/lock`

**500 Internal Server Error**
- Check R2 bucket exists and is bound correctly
- Verify Durable Object migrations are applied
- Review logs: `wrangler tail`

### Viewing Lock Status

```bash
curl -u user:pass https://tfstate.yourdomain.com/states/project/lock
```

### Manual Lock Release

```bash
curl -X DELETE -u user:pass \
  -H "Content-Type: application/json" \
  -d '{"ID": "lock-id-from-error"}' \
  https://tfstate.yourdomain.com/states/project/lock
```
