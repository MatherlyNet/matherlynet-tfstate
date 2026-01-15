# Security Policy

## Supported Versions

This project follows a rolling release model. Only the latest version receives security updates.

| Version | Supported          |
| ------- | ------------------ |
| latest  | :white_check_mark: |
| < latest | :x:               |

## Reporting a Vulnerability

**Please do NOT report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability in this project, please report it responsibly:

1. **GitHub Security Advisories**: Use the "Report a vulnerability" button in the [Security tab](https://github.com/MatherlyNet/matherlynet-tfstate/security)
2. **Email**: Contact the repository maintainer directly

### What to Include

When reporting a vulnerability, please provide:

- Type of vulnerability (e.g., injection, authentication bypass, cryptographic weakness)
- Full path(s) of affected source file(s)
- Location of affected source code (tag/branch/commit or direct URL)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact assessment and potential consequences

### Response Timeline

- **Initial Response**: Within 48 hours (2 business days)
- **Status Update**: Within 7 days
- **Resolution Target**: Within 30 days for critical issues (complex issues may take longer)

## Disclosure Policy

We follow coordinated disclosure practices:

- We will work with you to validate and remediate the vulnerability
- After a fix or mitigation is available, we'll publish release notes
- Security researchers who wish to be acknowledged will be credited in release notes

## Scope

Security issues that impact the confidentiality, integrity, or availability of this project are in scope.

**In scope:**
- Authentication bypass vulnerabilities
- State file access control issues
- Lock mechanism race conditions or bypasses
- Secrets exposure or credential leaks
- Injection vulnerabilities (command injection, path traversal)
- Denial of service affecting state locking

**Out of scope (non-exhaustive):**
- Vulnerabilities requiring privileged access to the Cloudflare Workers environment
- Issues in third-party dependencies (please report upstream)
- R2 bucket misconfigurations (user responsibility)
- Network-level attacks on Cloudflare's infrastructure

## Safe Harbor

We will not pursue legal action against security researchers conducting good-faith research aligned with this policy.

Please avoid:
- Privacy violations
- Service degradation or denial of service
- Data destruction or corruption
- Testing against production deployments you do not own

Only test against your own Terraform state backend deployment.

## Receiving Security Fixes

Security fixes are shipped in the latest version. We recommend:

- Monitoring the repository for security advisories
- Enabling GitHub Dependabot alerts
- Keeping your deployment up-to-date with the latest commit

We may issue public advisories (GitHub Security Advisory) when appropriate.

## Security Best Practices

This project follows security best practices including:

- **Code scanning**: GitHub CodeQL for static analysis
- **Dependency scanning**: Renovate for automated vulnerability detection
- **Dependency review**: Automated blocking of high-severity vulnerable dependencies in PRs
- **Least-privilege Actions**: GitHub Actions workflows use minimal permissions
- **Encrypted secrets**: All sensitive configuration encrypted at rest

## Authentication & Authorization

This Terraform HTTP backend implements multiple authentication layers:

### Basic Authentication
- Username/password authentication via HTTP Basic Auth
- Credentials stored as Cloudflare Worker secrets
- Required for all state operations (GET, POST, LOCK, UNLOCK)

### Client Certificate Authentication (mTLS)
- Optional client certificate validation
- Provides cryptographic authentication beyond passwords
- Recommended for production deployments

### State Locking
- Distributed locking via Cloudflare Durable Objects
- Prevents concurrent state modifications
- Lock information includes user ID and timestamp for audit trail

### Storage Security
- State files stored in private Cloudflare R2 bucket
- **CRITICAL**: R2 bucket must remain private (no public access)
- Worker is the only authorized interface to the bucket
- Enabling R2 public access bypasses authentication entirely

## Required Environment Variables

**Local Development** (.dev.vars file):
```bash
USERNAME=terraform
PASSWORD=your-secure-password
```

**Production** (Cloudflare Worker secrets):
```bash
wrangler secret put USERNAME
wrangler secret put PASSWORD
```

**Deployment** (.env file):
```bash
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_API_TOKEN=your-api-token
```

## Security Recommendations

For production deployments:

1. **Use strong passwords**: Generate cryptographically random passwords (32+ characters)
2. **Enable mTLS**: Use client certificates for additional authentication layer
3. **Restrict R2 access**: Never enable R2 Custom Domains or R2.dev public access
4. **Monitor access logs**: Review Cloudflare Workers logs for suspicious activity
5. **Rotate credentials**: Periodically rotate USERNAME and PASSWORD secrets
6. **Use custom domains**: Deploy on your own domain with TLS (avoid *.workers.dev)
7. **Implement IP allowlisting**: Use Cloudflare WAF rules to restrict access by IP

## Credits

With permission from reporters, we will credit security researchers in release notes and acknowledge their contributions to improving the security of this project.

Thank you for helping keep matherlynet-tfstate and its users safe!
