# CI verification protocol

This repository deliberately distinguishes three independent claims.

1. **Code verification** — `pnpm verify` must pass typecheck and unit tests on the actual Actions run.
2. **Target smoke test** — runs only when an explicit target URL and exact host allowlist are configured. If skipped, the summary says NOT RUN.
3. **Security/release gate** — any critical control that is failed, errored, or unverified blocks release eligibility. A successful build or reachable web page does not certify privacy or security.

## Safe NianBox staging integration

Ordinary push/PR events keep stateful NianBox writes disabled. A manual `workflow_dispatch` may enable them only when the dedicated staging app and Worker URLs, two different disposable account credentials, an exact host allowlist, and the explicit staging confirmation are configured.

The NianBox integration writes one randomly identified synthetic note, verifies same-account cross-session read/update, checks that a second account cannot read it, then attempts cleanup and verifies logout revocation. If cleanup cannot be confirmed, the check fails and requires staging inspection. Tests never include passwords, session tokens, or raw response bodies in evidence.

## Current acceptance boundary

Passing typecheck/unit tests is not the same as a complete NianBox acceptance. Client-side end-to-end encryption, encryption-key recovery, per-device revocation, session expiry, direct storage plaintext inspection, offline persistence, and real browser-on-desktop/browser-on-mobile behavior still require dedicated evidence. Until then, the associated controls stay BLOCKED.
