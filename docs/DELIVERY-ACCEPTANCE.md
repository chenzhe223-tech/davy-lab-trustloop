# Delivery path: TrustLoop → NianBox → Standard App Template → Multi-device Release

This is the project acceptance contract. A merged commit, a green typecheck, or a page that loads is not by itself proof of a working or secure product.

## Stage 1 — TrustLoop verification baseline

### Required evidence
- `pnpm verify` completes in GitHub Actions with a visible result.
- A target smoke test runs only when an explicit local/test/staging target and exact host allowlist are configured.
- If no target is configured, the workflow summary must explicitly say the target test was NOT RUN.
- Reports are generated as JSON, HTML, and Markdown repair instructions; secret-like URL values are redacted.
- Off-host requests and state-changing HTTP methods are blocked by default.
- Any critical security check that is FAIL, ERROR, BLOCKED, or absent prevents release approval.

### Exit criteria
- [ ] Typecheck and unit tests pass on the actual CI run.
- [ ] The CI run and artifact are inspectable.
- [ ] One controlled test/staging URL passes the basic smoke test.
- [ ] An intentionally failing critical check is shown to block the gate.
- [ ] Report schema and status meanings are documented and stable.

## Stage 2 — NianBox as the reference app

Use a dedicated staging deployment, disposable accounts, synthetic notes, and an isolated test database. Do not use production credentials or real user data.

| Check | Required acceptance evidence |
|---|---|
| Authentication/session expiry | A protected operation rejects an expired or invalid session |
| Logout | The same session is rejected after logout |
| End-to-end encryption | Synthetic plaintext is encrypted on the client before cloud persistence; server/key custody analysis supports the claim |
| Key recovery | Password reset and encryption-key recovery are tested and documented as separate behaviors |
| Device revocation | Two disposable sessions; revoked session denied; effect on the other session recorded |
| Cloud plaintext | Synthetic marker search in isolated storage, with limitations documented |
| Cross-device sync | Same synthetic record/hash on two independent clients |
| Conflict handling | Concurrent edits and delete/update behavior are deterministic and tested |
| Offline recovery | Unsynced record survives the defined reload/offline scenario or reports a clear recoverable error |
| Data isolation | Account A cannot read or mutate Account B's records |

A control is PASS only with reproducible evidence. If the implementation does not provide a capability (for example, per-device revocation or E2EE), record the gap as FAIL or BLOCKED according to whether the behavior was actually tested; do not mask the gap by weakening the gate.

## Stage 3 — Standard application template

Template must be independent of NianBox business logic and data.

- [ ] Shared project manifest documents stack, routes, data model, API contracts, permissions, environment variables, and deployment target.
- [ ] Auth and user-data isolation have documented interfaces and tests.
- [ ] Sync contract defines stable record IDs, ownership, versioning, timestamps, tombstones, idempotency, conflict rules, and device/session revocation.
- [ ] Secrets are server-side only; no private API keys in browser bundles or committed files.
- [ ] Environment setup distinguishes local/test/staging/production and fails closed when required settings are missing.
- [ ] CI runs typecheck, unit tests, smoke tests, and critical security gates.
- [ ] Template can be instantiated without importing NianBox user data or app-specific logic.

## Stage 4 — One complete deployment and multi-device acceptance

Run the flow from a clean template checkout through a dedicated staging deployment.

1. Create a new app from the template.
2. Configure test-only environment values and secrets.
3. Run CI and deploy to staging.
4. Open the staging URL on a desktop browser and a separate mobile browser/device.
5. Sign in to the same disposable account on both clients.
6. Create a synthetic record on desktop and verify it on mobile.
7. Edit on mobile and verify the change on desktop.
8. Test reload, duplicate/retry behavior, offline recovery, concurrent edits, delete/tombstone propagation, and session/device revocation.
9. Confirm a different account cannot access the first account's data.
10. Run TrustLoop again and compare reports against the baseline.
11. Review all critical security checks and require human approval before any production release.

### Release decision
- **PASS / eligible for human review:** all required acceptance tests have reproducible evidence, no critical security gate is blocked, and rollback is documented.
- **BLOCKED:** critical evidence is missing or the isolated environment is unavailable.
- **FAIL:** a tested requirement is violated.
- **NOT RUN:** test was not executed; never reinterpret as PASS.

## Current known limitations

The current NianBox adapter defines stable check IDs but its checks are placeholders and remain BLOCKED until evidence collectors are implemented. The generic smoke test does not prove authentication, encryption, sync, authorization isolation, or deployment correctness. CI must be observed in GitHub Actions before any claim that verification passed. No production writes are permitted as part of this plan.
