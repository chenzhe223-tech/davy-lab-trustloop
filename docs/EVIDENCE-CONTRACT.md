# TrustLoop evidence contract

Every check must be PASS, FAIL, BLOCKED, SKIP, or ERROR.

- **PASS:** the test ran and the expected condition was established by reproducible evidence.
- **FAIL:** the test ran and contradicted its expected condition.
- **BLOCKED:** not run, prerequisites missing, evidence insufficient, or ambiguous result.
- **SKIP:** intentionally excluded under a documented non-critical policy.
- **ERROR:** the runner could not complete the test.

Any critical check not PASS blocks release. UI presence, endpoint existence, source-code naming, or a successful password reset is not sufficient evidence for cryptographic claims.

Evidence should include a stable check ID and test version, timestamp and declared local/test/staging environment, synthetic fixture ID/hash, outcome and relevant assertion, redacted artifact references, known limitations, and repeatable reproduction steps.

Never store passwords, bearer tokens, cookies, encryption keys, real user notes, or production data in JSON, HTML, screenshots, logs, or repair instructions.
