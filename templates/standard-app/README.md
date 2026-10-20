# DAVYLAB Standard App Template

Reusable starting point for small AI-built web apps. It is intentionally local-first and does not pretend that cloud sync exists before an adapter and server contract are implemented.

## Included

- React + TypeScript + Vite with strict type checking.
- IndexedDB persistence with stable record IDs and version timestamps.
- An explicit sync-adapter contract with idempotency, base-version and conflict fields.
- Unit tests for local persistence and sync-result mapping.
- A responsive, Chinese-language sample workbench.
- No external analytics calls, no third-party runtime SDK, and no API secrets.

## Start locally

1. Use Node.js 22.18+ and pnpm 11.25+.
2. Run: pnpm install
3. Run: pnpm dev
4. Run: pnpm verify before opening a pull request.

## Data and privacy boundaries

The current sample writes only to this browser's IndexedDB. It does not send notes to a server, and it does not synchronize to another device. The visible status explicitly says “local only”.

IndexedDB is not application-level encryption. Do not store highly sensitive data in this starter until the threat model and at-rest strategy are decided. Browser extensions, malware, local OS users, and the running application may access local browser data.

The sync contract is an interface, not a connected implementation. Before enabling cloud sync, implement and test all of the following:

- Authenticate each request; derive the user identity on the server, never trust a user ID from the client payload.
- Enforce ownership in every query and mutation.
- Use idempotency keys and stable record IDs.
- Define base-version checks and deterministic conflict handling.
- Propagate soft-delete and permanent-delete tombstones across all devices.
- Revoke sessions on logout and provide a documented device-revocation policy.
- Keep provider/API secrets on the server; never put secrets in Vite variables or browser bundles.
- State clearly whether the service can read stored user content. Do not claim E2EE without client-side cryptographic implementation and evidence.

## Project contract

project.manifest.json is the machine-readable starter manifest. Replace its routes, data model and acceptance tests for each new product. Keep inputs, outputs, failure behavior, permissions and release gates documented before connecting AI tools or a backend.

## Deployment

Vite accepts the BASE_PATH environment variable. Set it to / for a domain root or /<repo-name>/ for a GitHub Pages repository path. Use a dedicated staging/preview target first. A production release must have a successful typecheck, unit tests, build, security review, and explicit human approval.
