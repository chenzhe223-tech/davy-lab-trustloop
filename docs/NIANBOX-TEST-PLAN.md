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
2. Configure GitHub Actions variables: `TRUSTLOOP_ENVIRONMENT=staging`, `TRUSTLOOP_TARGET_URL` for the app URL, `TRUSTLOOP_ALLOWED_HOSTS` containing both exact app and Worker hostnames, `TRUSTLOOP_ADAPTER=niantou-box`, and `TRUSTLOOP_TEST_ACCOUNT_LABEL=trustloop-disposable-user-a`.
3. Keep `TRUSTLOOP_NIANBOX_STATEFUL_TESTS` unset or false by default. For a manual `workflow_dispatch` run only, set this repository variable to `true` after confirming the separate staging database and test account are disposable.
4. Configure Actions secrets `TRUSTLOOP_NIANBOX_STAGING_CONFIRMATION=I_CONFIRM_STAGING_ONLY`, `TRUSTLOOP_NIANBOX_TEST_EMAIL`, and `TRUSTLOOP_NIANBOX_TEST_PASSWORD`. Configure `TRUSTLOOP_NIANBOX_CLOUD_URL` as a variable pointing to the isolated Worker origin.
5. The opt-in integration test logs in twice using the disposable account, creates one uniquely-named synthetic idea, reads and updates it via the second session, confirms the update from the first session, then attempts a purge and tests whether the first session token is rejected after logout. Raw tokens, response bodies, and user content are not written to reports.
6. Both app and Worker hosts must be explicitly allowlisted and clearly marked staging/test/preview (unless loopback local testing). The code rejects production environment labels and non-staging-looking hostnames before the write test. These naming checks supplement, but do not replace, operator confirmation that the target and database are actually isolated.
7. Re-test after fixes and compare reports using stable check IDs. If cleanup cannot be confirmed, the report fails and instructs an operator to inspect staging and remove only the TrustLoop-generated fixture.
8. E2EE, encryption-key recovery, per-device revocation, session expiry, server-side plaintext inspection, and offline local persistence remain BLOCKED until their separate evidence collectors are implemented.

## Code-review leads (not a complete audit)
Prior source inspection found that the Worker appears to serialize document objects into a D1 `doc` field as JSON and parse them back on reads. This is a lead to verify potential plaintext storage, not proof of every deployed behavior. Password reset does not establish encryption-key recovery. A device/session list and current-session logout do not establish per-device revocation.

Confirm these against the isolated deployment and current source revision. No security certification is implied.
