import type { CheckResult, Category } from "../types.js";
import { validateTarget } from "../policy.js";

export type NianBoxCheckId =
  | "auth.session-expiry" | "auth.logout-revocation" | "crypto.client-side-encryption"
  | "crypto.key-recovery" | "security.device-revocation" | "privacy.cloud-plaintext"
  | "sync.cross-device-integrity" | "storage.local-persistence";
export interface NianBoxCheckSpec {
  id: NianBoxCheckId; title: string; category: Category; severity: "high" | "critical"; critical: boolean;
  objective: string; evidenceRequired: string[]; safeMethod: string;
}
export const NIANBOX_CHECKS: readonly NianBoxCheckSpec[] = [
  {id:"auth.session-expiry",title:"Session expiry and authentication enforcement",category:"security",severity:"critical",critical:true,objective:"Confirm protected access is rejected after a session expires or becomes invalid.",evidenceRequired:["test-account session creation record","protected-route response before and after expiry","redacted request/response evidence"],safeMethod:"Use a dedicated synthetic test account and read-only protected endpoint. Never log bearer tokens."},
  {id:"auth.logout-revocation",title:"Logout invalidates the active session",category:"security",severity:"critical",critical:true,objective:"Confirm the same session token is rejected after logout, not merely removed from the browser UI.",evidenceRequired:["session identifier hash before logout","logout response status","same-token protected request rejected after logout"],safeMethod:"Use a disposable test account; store only a one-way token fingerprint."},
  {id:"crypto.client-side-encryption",title:"Client-side encryption before cloud persistence",category:"privacy",severity:"critical",critical:true,objective:"Determine whether sensitive content is encrypted client-side before cloud persistence and whether the server can decrypt it.",evidenceRequired:["synthetic plaintext marker","browser-side write payload capture","isolated stored representation","key custody analysis"],safeMethod:"Use a unique synthetic marker in an isolated test environment; never use real user notes."},
  {id:"crypto.key-recovery",title:"Encryption key recovery is distinct from password reset",category:"security",severity:"critical",critical:true,objective:"Verify account password recovery does not imply recovery of an encryption key the service does not possess.",evidenceRequired:["test account key fingerprint before recovery","documented recovery flow result","decryption result for synthetic fixture"],safeMethod:"Use disposable test data and documented recovery semantics in an isolated environment."},
  {id:"security.device-revocation",title:"Per-device session revocation",category:"security",severity:"critical",critical:true,objective:"Verify revoking one device blocks its future access without unintentionally revoking or preserving another session.",evidenceRequired:["two session fingerprints","revocation action/result","revoked session rejected","other session behavior documented"],safeMethod:"Use two disposable browser contexts; never invalidate real user sessions."},
  {id:"privacy.cloud-plaintext",title:"Cloud storage does not expose sensitive plaintext",category:"privacy",severity:"critical",critical:true,objective:"Inspect isolated test storage for a synthetic marker and establish whether document content is readable server-side.",evidenceRequired:["synthetic marker hash","isolated storage record","marker search result","conclusion and limitations"],safeMethod:"Read only an isolated test database or fixture; never query production data."},
  {id:"sync.cross-device-integrity",title:"Cross-device sync integrity and conflict handling",category:"functional",severity:"high",critical:false,objective:"Verify a synthetic record appears intact on a second test device and conflict handling is deterministic.",evidenceRequired:["source record hash","destination record hash","sync timestamps","conflict scenario result"],safeMethod:"Use synthetic records, two browser contexts, and test-only accounts."},
  {id:"storage.local-persistence",title:"Local persistence and offline recovery",category:"functional",severity:"high",critical:false,objective:"Verify an unsynced synthetic record survives reload/offline transitions with a clear recovery outcome.",evidenceRequired:["record hash before reload","offline/reload sequence","record hash after recovery"],safeMethod:"Use a clean browser profile and synthetic records; do not clear a user's real storage."}
] as const;

export interface NianBoxAdapterConfig {
  targetUrl: string; allowedHosts: string[]; environment: "local" | "test" | "staging";
  testAccountLabel: string; dataMode: "synthetic-only";
}
export function loadNianBoxAdapterConfig(env: NodeJS.ProcessEnv): NianBoxAdapterConfig {
  const environment = env.TRUSTLOOP_ENVIRONMENT;
  if (environment !== "local" && environment !== "test" && environment !== "staging") {
    throw new Error("NianBox adapter requires TRUSTLOOP_ENVIRONMENT=local, test, or staging; production is not permitted.");
  }
  const allowedHosts = (env.TRUSTLOOP_ALLOWED_HOSTS || "").split(",").map(v => v.trim().toLowerCase()).filter(Boolean);
  const parsed = validateTarget(env.TARGET_URL || "", allowedHosts);
  if (environment === "local" && !["localhost","127.0.0.1","::1","[::1]"].includes(parsed.hostname)) throw new Error("Local mode requires a loopback host.");
  if (environment !== "local" && /(^|[-.])(prod|production)([-.]|$)/i.test(parsed.hostname)) throw new Error("Production-looking hostnames are not permitted in NianBox test mode.");
  const testAccountLabel = (env.TRUSTLOOP_TEST_ACCOUNT_LABEL || "").trim();
  if (!testAccountLabel) throw new Error("Set TRUSTLOOP_TEST_ACCOUNT_LABEL to a non-sensitive label for the disposable test account.");
  return {targetUrl:parsed.toString(),allowedHosts,environment,testAccountLabel,dataMode:"synthetic-only"};
}
export function pendingNianBoxChecks(): CheckResult[] {
  return NIANBOX_CHECKS.map(spec => ({
    id:"nianbox."+spec.id, category:spec.category, severity:spec.severity, status:"BLOCKED",
    title:spec.title, details:"Not executed: adapter evidence is not wired. Objective: "+spec.objective,
    critical:spec.critical,
    repairHint:"Safe method: "+spec.safeMethod+" Evidence required: "+spec.evidenceRequired.join("; ")
  }));
}
