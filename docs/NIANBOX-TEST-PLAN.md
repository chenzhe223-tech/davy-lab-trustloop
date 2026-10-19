# NianBox adapter: Phase 2 test plan

## Safety boundary
- TrustLoop stays isolated in its own repository; this adapter does not modify the NianBox application repository or production cloud resources.
- Only local, test, or staging environments are accepted. Production mode is rejected.
- Use a disposable test account and synthetic records only. Never use real notes, customer records, production tokens, or production database exports.
- Keep the general smoke runner read-only: state-changing HTTP methods remain blocked. Any future stateful scenario must be isolated, opt-in, reviewed, and have verified cleanup.
- Do not mark a security control PASS because an endpoint exists or a UI action appears successful. Require reproducible evidence.

## Check matrix

| ID | Priority | Evidence needed | Default until evidence adapter exists |
|---|---|---|---|
| Session expiry | Critical | Expired session rejected by a protected operation; redacted request/response | BLOCKED |
| Logout revocation | Critical | Same session rejected after logout | BLOCKED |
| Client-side encryption | Critical | Synthetic plaintext marker, client write payload, isolated stored representation, key custody review | BLOCKED |
| Encryption-key recovery | Critical | Key fingerprint and recovery/decryption result; distinguish from password reset | BLOCKED |
| Device revocation | Critical | Two test sessions, revoked session denied, other session behavior recorded | BLOCKED |
| Cloud plaintext readability | Critical | Isolated test storage inspection for synthetic marker; documented limits | BLOCKED |
| Cross-device sync | High | Record hashes on two devices and conflict result | BLOCKED |
| Local persistence/offline recovery | High | Before/after record hashes and offline event sequence | BLOCKED |

## Execution sequence
1. Create a dedicated test/staging deployment and disposable account. The account label is metadata only, never a credential.
2. Configure Actions variables: `TRUSTLOOP_ENVIRONMENT=staging`, `TRUSTLOOP_TARGET_URL` to the test URL, and `TRUSTLOOP_ALLOWED_HOSTS` to the exact host.
3. Start with read-only discovery and UI smoke tests; confirm off-host requests are blocked.
4. Implement stateful checks as separate opt-in scenarios with synthetic fixtures and cleanup verification. Never run them against production.
5. Capture only redacted evidence: outcome, fixture hash, environment, method, and known limitations. Do not retain raw credentials or real user content.
6. Re-test after fixes and compare reports using stable check IDs.

## Code-review leads (not a complete audit)
Prior source inspection found that the Worker appears to serialize document objects into a D1 `doc` field as JSON and parse them back on reads. This is a lead to verify potential plaintext storage, not proof of every deployed behavior. Password reset does not establish encryption-key recovery. A device/session list and current-session logout do not establish per-device revocation.

Confirm these against the isolated deployment and current source revision. No security certification is implied.
