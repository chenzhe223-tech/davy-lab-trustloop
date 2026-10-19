# DAVYLAB TrustLoop

Evidence-based QA gate for AI-built web applications. Phase 1 provides a local CLI, Playwright browser smoke checks, a versioned JSON report, HTML report, Markdown repair instructions, and a GitHub Actions entry point.

## Safety defaults
- Only HTTP(S) targets whose host is explicitly allowlisted are accepted.
- Requests to hosts outside the allowlist and POST, PUT, PATCH, DELETE requests are blocked by default.
- URL query parameters that look like credentials are redacted in reports and diagnostics.
- Critical security checks without reproducible evidence remain BLOCKED; page availability is not security evidence.
- No application database is required; reports are file-based.

## Setup
Requires Node.js 22+ and pnpm.

```bash
pnpm install
pnpm exec playwright install chromium
cp .env.example .env
# Use only a test/staging host you control.
pnpm verify
pnpm test:site
```

Set `TARGET_URL` and `TRUSTLOOP_ALLOWED_HOSTS` before running the site test. Reports are written to `reports/latest/`. Exit codes: `0` PASS, `1` quality failure, `2` configuration/runner error, `3` critical security gate failed or unverified.

This is an early scaffold, not a security certification. NianBox-specific security adapters and a full CI verification pass are still pending.