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

Set `TARGET_URL`, `TRUSTLOOP_ALLOWED_HOSTS`, and `TRUSTLOOP_ENVIRONMENT=local|test|staging` before running the site test. Every run requires an explicit non-production environment; production mode and production-looking hosts are rejected. Reports are written to `reports/latest/`. Exit codes: `0` PASS, `1` quality failure, `2` configuration/runner error, `3` critical security gate failed or unverified.

This is an early scaffold, not a security certification. NianBox-specific security adapters and a full CI verification pass are still pending.

## NianBox adapter (Phase 2)

The first adapter version defines eight stable check IDs and safe test/evidence contracts. It does **not** yet execute authenticated or state-changing scenarios; those remain BLOCKED until isolated test fixtures and specific evidence collectors are implemented.

For a test/staging deployment only, set:
- `TRUSTLOOP_ADAPTER=niantou-box`
- `TRUSTLOOP_ENVIRONMENT=staging` (or `test` / `local`)
- `TRUSTLOOP_TEST_ACCOUNT_LABEL` to a non-secret label for a disposable test account
- `TARGET_URL` and `TRUSTLOOP_ALLOWED_HOSTS` to the exact test host

Then run `pnpm test:site`. The report includes NianBox-specific check IDs and keeps unimplemented checks BLOCKED. Do not set the adapter to production or use production data.


## Compare before/after runs

After a previous run, keep its `report.json` as the baseline. Pass that file to the next run:

```bash
pnpm test:site -- --url "$TARGET_URL" --out reports/current --compare reports/baseline/report.json
```

The runner writes `comparison.json` and `comparison.md` alongside the current report. Comparisons use stable check IDs and explicitly flag when the target URL differs. A changed status is not automatically proof that a security issue is fixed; inspect the underlying evidence.


## CI exit behavior

- Exit code `0`: no observed quality failure and no critical gate failure.
- Exit code `1`: observed quality failure or a report regression.
- Exit code `2`: invalid configuration, comparison failure, or a comparison against a different target URL.
- Exit code `3`: at least one critical security control is not PASS.

A different target URL is explicitly flagged in the comparison and is not treated as an apples-to-apples comparison. The declared environment is written into report metadata; it is not guessed from words in a hostname.
