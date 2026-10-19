# Phase 1 acceptance criteria

- [ ] TypeScript typecheck passes.
- [ ] Unit tests pass.
- [ ] Non-allowlisted hosts are rejected before browser navigation.
- [ ] Only HTTP(S); embedded URL credentials rejected.
- [ ] POST/PUT/PATCH/DELETE blocked by default.
- [ ] Sensitive headers and secret-like query parameters redacted.
- [ ] JSON, HTML, Markdown reports generated from the same result object.
- [ ] Any critical security check not PASS yields BLOCKED and exit code 3.
- [ ] GitHub Actions evidence artifacts retained for 30 days.
- [ ] No application database required.
- [ ] No production credentials or production writes.

## NianBox adapter
- [ ] Authentication and session behavior
- [ ] Client-side encryption and key ownership
- [ ] Password recovery distinguished from encryption-key recovery
- [ ] Device/session revocation
- [ ] Cloud-side plaintext readability
- [ ] Cross-device sync integrity and conflict handling
- [ ] Local persistence and offline recovery

Every security PASS needs reproducible evidence and a documented test method. Missing evidence means BLOCKED.


## Phase 2: NianBox adapter
- [ ] Adapter config rejects production mode and production-looking hosts.
- [ ] Adapter requires an exact host allowlist and disposable test-account label.
- [ ] Stable checks exist for session expiry, logout revocation, client-side encryption, key recovery, device revocation, cloud plaintext readability, cross-device sync, and local persistence.
- [ ] All unimplemented adapter checks remain BLOCKED.
- [ ] Stateful tests remain opt-in and are never run against production.
- [ ] Evidence includes repeatable method and synthetic fixture hashes, not raw sensitive content.
- [ ] Adapter-specific test execution is verified in GitHub Actions.
