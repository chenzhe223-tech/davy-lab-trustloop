import { randomUUID } from "node:crypto";
import type { CheckResult, Category, CheckStatus } from "../types.js";
import { validateTarget, validateSafeEnvironment } from "../policy.js";

export type NianBoxCheckId =
  | "auth.session-expiry" | "auth.logout-revocation" | "crypto.client-side-encryption"
  | "crypto.key-recovery" | "security.device-revocation" | "security.account-isolation" | "privacy.cloud-plaintext"
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
  {id:"security.account-isolation",title:"Cross-account data isolation",category:"security",severity:"critical",critical:true,objective:"Verify a separate test account cannot read another account's synthetic records.",evidenceRequired:["two disposable account labels","synthetic record identifier","second account pull result"],safeMethod:"Use two separately created staging-only test accounts and synthetic content; never use real user notes."},
  {id:"privacy.cloud-plaintext",title:"Cloud storage does not expose sensitive plaintext",category:"privacy",severity:"critical",critical:true,objective:"Inspect isolated test storage for a synthetic marker and establish whether document content is readable server-side.",evidenceRequired:["synthetic marker hash","isolated storage record","marker search result","conclusion and limitations"],safeMethod:"Read only an isolated test database or fixture; never query production data."},
  {id:"sync.cross-device-integrity",title:"Cross-device sync integrity and conflict handling",category:"functional",severity:"high",critical:false,objective:"Verify a synthetic record appears intact on a second test device and conflict handling is deterministic.",evidenceRequired:["source record hash","destination record hash","sync timestamps","conflict scenario result"],safeMethod:"Use synthetic records, two browser contexts, and test-only accounts."},
  {id:"storage.local-persistence",title:"Local persistence and offline recovery",category:"functional",severity:"high",critical:false,objective:"Verify an unsynced synthetic record survives reload/offline transitions with a clear recovery outcome.",evidenceRequired:["record hash before reload","offline/reload sequence","record hash after recovery"],safeMethod:"Use a clean browser profile and synthetic records; do not clear a user's real storage."}
] as const;

export interface NianBoxAdapterConfig {
  targetUrl: string;
  allowedHosts: string[];
  environment: "local" | "test" | "staging";
  testAccountLabel: string;
  dataMode: "synthetic-only";
  statefulTestsEnabled: boolean;
  cloudUrl?: string;
  testEmail?: string;
  testPassword?: string;
  testEmailB?: string;
  testPasswordB?: string;
}
const STAGING_CONFIRMATION = "I_CONFIRM_STAGING_ONLY";
const STAGING_HOST_PATTERN = /(^|[.-])(staging|stage|stg|test|testing|qa|preview)([.-]|$)/i;
const isLoopback = (hostname: string) => ["localhost", "127.0.0.1", "::1", "[::1]"].includes(hostname);

export function loadNianBoxAdapterConfig(env: NodeJS.ProcessEnv): NianBoxAdapterConfig {
  const environment = env.TRUSTLOOP_ENVIRONMENT;
  if (environment !== "local" && environment !== "test" && environment !== "staging") {
    throw new Error("NianBox adapter requires TRUSTLOOP_ENVIRONMENT=local, test, or staging; production is not permitted.");
  }
  const allowedHosts = (env.TRUSTLOOP_ALLOWED_HOSTS || "").split(",").map(v => v.trim().toLowerCase()).filter(Boolean);
  const target = validateTarget(env.TARGET_URL || "", allowedHosts);
  validateSafeEnvironment(environment, target);
  const testAccountLabel = (env.TRUSTLOOP_TEST_ACCOUNT_LABEL || "").trim();
  if (!testAccountLabel) throw new Error("Set TRUSTLOOP_TEST_ACCOUNT_LABEL to a non-sensitive label for the disposable test account.");

  const statefulFlag = (env.TRUSTLOOP_NIANBOX_STATEFUL_TESTS || "false").trim().toLowerCase();
  if (statefulFlag !== "true" && statefulFlag !== "false") {
    throw new Error("TRUSTLOOP_NIANBOX_STATEFUL_TESTS must be true or false.");
  }
  const statefulTestsEnabled = statefulFlag === "true";
  const config: NianBoxAdapterConfig = {
    targetUrl: target.toString(), allowedHosts, environment, testAccountLabel,
    dataMode: "synthetic-only", statefulTestsEnabled
  };
  if (!statefulTestsEnabled) return config;

  if (environment !== "staging") {
    throw new Error("State-changing NianBox integration tests require TRUSTLOOP_ENVIRONMENT=staging.");
  }
  if (env.TRUSTLOOP_NIANBOX_STAGING_CONFIRMATION !== STAGING_CONFIRMATION) {
    throw new Error("Stateful tests require explicit dispatch confirmation: TRUSTLOOP_NIANBOX_STAGING_CONFIRMATION=I_CONFIRM_STAGING_ONLY.");
  }
  if (!/^trustloop-(test|disposable)-[a-z0-9-]+$/i.test(testAccountLabel)) {
    throw new Error("Stateful tests require a disposable label like trustloop-test-sync-a; no real-user account labels are accepted.");
  }
  const rawCloudUrl = (env.TRUSTLOOP_NIANBOX_CLOUD_URL || "").trim();
  if (!rawCloudUrl) throw new Error("Set TRUSTLOOP_NIANBOX_CLOUD_URL to the isolated NianBox staging Worker origin.");
  const cloud = validateTarget(rawCloudUrl, allowedHosts);
  validateSafeEnvironment(environment, cloud);
  if (cloud.pathname !== "/" || cloud.search || cloud.hash) {
    throw new Error("TRUSTLOOP_NIANBOX_CLOUD_URL must be the Worker origin without a path, query, or fragment.");
  }
  if (!isLoopback(target.hostname) && !STAGING_HOST_PATTERN.test(target.hostname)) {
    throw new Error("Stateful tests require an app hostname clearly marked staging/test/preview; production writes are forbidden.");
  }
  if (!isLoopback(cloud.hostname) && !STAGING_HOST_PATTERN.test(cloud.hostname)) {
    throw new Error("Stateful tests require a cloud hostname clearly marked staging/test/preview; production writes are forbidden.");
  }
  const testEmail = (env.TRUSTLOOP_NIANBOX_TEST_EMAIL || "").trim();
  const testPassword = env.TRUSTLOOP_NIANBOX_TEST_PASSWORD || "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail) || testEmail.length > 200) {
    throw new Error("Set TRUSTLOOP_NIANBOX_TEST_EMAIL to a dedicated disposable test account.");
  }
  if (testPassword.length < 8 || testPassword.length > 200) {
    throw new Error("Set TRUSTLOOP_NIANBOX_TEST_PASSWORD for that disposable test account (8–200 characters).");
  }
  const testEmailB = (env.TRUSTLOOP_NIANBOX_TEST_EMAIL_B || "").trim();
  const testPasswordB = env.TRUSTLOOP_NIANBOX_TEST_PASSWORD_B || "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmailB) || testEmailB.length > 200) {
    throw new Error("Set TRUSTLOOP_NIANBOX_TEST_EMAIL_B to a second dedicated disposable account.");
  }
  if (testEmailB.toLowerCase() === testEmail.toLowerCase()) {
    throw new Error("NianBox account-isolation testing requires two different test account emails.");
  }
  if (testPasswordB.length < 8 || testPasswordB.length > 200) {
    throw new Error("Set TRUSTLOOP_NIANBOX_TEST_PASSWORD_B for the second disposable account (8–200 characters).");
  }
  config.cloudUrl = cloud.origin;
  config.testEmail = testEmail;
  config.testPassword = testPassword;
  config.testEmailB = testEmailB;
  config.testPasswordB = testPasswordB;
  return config;
}
export function pendingNianBoxChecks(): CheckResult[] {
  return NIANBOX_CHECKS.map(spec => ({
    id:"nianbox."+spec.id, category:spec.category, severity:spec.severity, status:"BLOCKED",
    title:spec.title, details:"Not executed: adapter evidence is not wired. Objective: "+spec.objective,
    critical:spec.critical,
    repairHint:"Safe method: "+spec.safeMethod+" Evidence required: "+spec.evidenceRequired.join("; ")
  }));
}

type JsonObject = Record<string, unknown>;
interface ApiResult { status: number; body: JsonObject | null }
const asObject = (value: unknown): JsonObject | null =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : null;
const numeric = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : null;
function opStatus(body: JsonObject | null, id: string): string | null {
  const results = body?.results;
  if (!Array.isArray(results)) return null;
  const found = results.map(asObject).find(item => item?.id === id);
  return typeof found?.status === "string" ? found.status : null;
}
async function requestJson(config: NianBoxAdapterConfig, route: string, token?: string, method = "GET", body?: JsonObject): Promise<ApiResult> {
  if (!config.cloudUrl) throw new Error("staging cloud URL not configured");
  const headers: Record<string, string> = { accept: "application/json" };
  if (token) headers.authorization = "Bearer " + token;
  if (body) headers["content-type"] = "application/json";
  const response = await fetch(new URL(route, config.cloudUrl), {
    method, headers, body: body ? JSON.stringify(body) : undefined,
    redirect: "error", signal: AbortSignal.timeout(12000)
  });
  let parsed: JsonObject | null = null;
  try { parsed = asObject(await response.json()); } catch { /* response bodies are not copied into reports */ }
  return {status:response.status,body:parsed};
}
function checkUpdate(checks: CheckResult[], id: NianBoxCheckId, status: CheckStatus, details: string): void {
  const existing = checks.find(item => item.id === "nianbox." + id);
  if (!existing) return;
  existing.status = status;
  existing.details = details;
}

export async function runNianBoxStagingChecks(config: NianBoxAdapterConfig): Promise<CheckResult[]> {
  if (!config.statefulTestsEnabled || !config.cloudUrl || !config.testEmail || !config.testPassword || !config.testEmailB || !config.testPasswordB) {
    throw new Error("NianBox staging checks require explicit stateful-test opt-in and validated disposable credentials.");
  }
  const checks = pendingNianBoxChecks();
  const recordId = "trustloop-" + randomUUID();
  const plainMarker = "TrustLoop synthetic marker " + recordId;
  const updatedMarker = "TrustLoop synthetic updated marker " + recordId;
  let tokenA: string | undefined;
  let tokenB: string | undefined;
  let tokenOther: string | undefined;
  let baselineA: number | null = null;
  let baselineB: number | null = null;
  let baselineOther: number | null = null;
  let writeAttempted = false;
  let syncStatus: CheckStatus = "BLOCKED";
  let syncDetails = "Not run: disposable-account login prerequisites were not met.";
  let logoutStatus: CheckStatus = "BLOCKED";
  let logoutDetails = "Not run: disposable-account login prerequisites were not met.";
  let isolationStatus: CheckStatus = "BLOCKED";
  let isolationDetails = "Not run: second disposable account prerequisites were not met.";

  try {
    const loginA = await requestJson(config, "/auth/login", undefined, "POST", {
      email: config.testEmail, password: config.testPassword, deviceLabel: config.testAccountLabel + "-a"
    });
    const loginBodyA = loginA.body;
    const cursorA = numeric(loginBodyA?.cursor);
    if (typeof loginBodyA?.token === "string") tokenA = loginBodyA.token;
    if (loginA.status !== 200 || typeof tokenA !== "string" || cursorA === null) {
      syncDetails = "BLOCKED: first disposable test session could not be established (HTTP " + loginA.status + "); response body withheld.";
      logoutDetails = "BLOCKED: session revocation test requires a valid disposable test session.";
      return checks.map(c => c.id === "nianbox.sync.cross-device-integrity" ? {...c,status:"BLOCKED",details:syncDetails}
        : c.id === "nianbox.auth.logout-revocation" ? {...c,status:"BLOCKED",details:logoutDetails} : c);
    }
    baselineA = cursorA;

    const loginB = await requestJson(config, "/auth/login", undefined, "POST", {
      email: config.testEmail, password: config.testPassword, deviceLabel: config.testAccountLabel + "-b"
    });
    const loginBodyB = loginB.body;
    const cursorB = numeric(loginBodyB?.cursor);
    if (typeof loginBodyB?.token === "string") tokenB = loginBodyB.token;
    if (loginB.status !== 200 || typeof tokenB !== "string" || cursorB === null) {
      syncDetails = "BLOCKED: second disposable test session could not be established (HTTP " + loginB.status + "); response body withheld.";
      logoutDetails = "BLOCKED: session revocation test requires a valid disposable test session.";
    } else {
      baselineB = cursorB;
      const loginOther = await requestJson(config, "/auth/login", undefined, "POST", {
        email: config.testEmailB, password: config.testPasswordB, deviceLabel: config.testAccountLabel + "-isolation"
      });
      const loginBodyOther = loginOther.body;
      const cursorOther = numeric(loginBodyOther?.cursor);
      if (typeof loginBodyOther?.token === "string") tokenOther = loginBodyOther.token;
      if (loginOther.status !== 200 || typeof tokenOther !== "string" || cursorOther === null) {
        isolationStatus = "BLOCKED";
        isolationDetails = "A separate disposable account could not be established (HTTP " + loginOther.status + "); isolation was not tested.";
      } else {
        baselineOther = cursorOther;
        isolationDetails = "Second disposable account is ready; isolation assertion will run after the synthetic record is created.";
      }
      let contentUpdated = false;
      try {
        const createdAt = Date.now();
        writeAttempted = true;
        const initialWrite = await requestJson(config, "/sync/push", tokenA, "POST", {ops:[{
          entity:"idea", id:recordId, op:"upsert", doc:{
            id:recordId, title:"TrustLoop synthetic cross-device check", content:plainMarker,
            category:"other", status:"inbox", tags:["trustloop-synthetic"], pinned:false, notes:"",
            problem:"", targetUsers:"", productForm:"other", projectUrl:"", projectId:null,
            createdAt, updatedAt:createdAt, deletedAt:null, categorySource:"manual"
          }
        }]});
        if (initialWrite.status !== 200 || opStatus(initialWrite.body, recordId) !== "applied") {
          syncStatus = "FAIL";
          syncDetails = "Initial synthetic record write was not acknowledged as applied (HTTP " + initialWrite.status + ").";
        } else {
          if (tokenOther && baselineOther !== null) {
            const otherPull = await requestJson(config, "/sync/pull?since=" + encodeURIComponent(String(baselineOther)), tokenOther);
            const otherIdeas = Array.isArray(otherPull.body?.ideas) ? otherPull.body.ideas.map(asObject) : null;
            if (otherPull.status === 200 && otherIdeas !== null) {
              const otherSawFixture = otherIdeas.some(item => item?.id === recordId);
              isolationStatus = otherSawFixture ? "FAIL" : "PASS";
              isolationDetails = otherSawFixture
                ? "FAIL: the second disposable account received the first account's synthetic record."
                : "PASS: the separate account could not read the synthetic record. Record identifiers were not included in evidence.";
            } else {
              isolationStatus = "ERROR";
              isolationDetails = "The separate account could not complete a valid sync pull (HTTP " + otherPull.status + "); isolation remains unverified.";
            }
          }
          const readOnB = await requestJson(config, "/sync/pull?since=" + encodeURIComponent(String(baselineB)), tokenB);
          const ideasB = Array.isArray(readOnB.body?.ideas) ? readOnB.body.ideas.map(asObject) : [];
          const foundB = ideasB.find(item => item?.id === recordId);
          if (readOnB.status !== 200 || foundB == null || foundB.content !== plainMarker) {
            syncStatus = "FAIL";
            syncDetails = "The second session did not read back the exact synthetic record written by the first session (HTTP " + readOnB.status + ").";
          } else {
            const updatedAt = Date.now() + 1000;
            const updateWrite = await requestJson(config, "/sync/push", tokenB, "POST", {ops:[{
              entity:"idea", id:recordId, op:"upsert", doc:{
                ...foundB, id:recordId, content:updatedMarker,
                createdAt:typeof foundB.createdAt === "number" ? foundB.createdAt : createdAt,
                updatedAt, deletedAt:null
              }
            }]});
            if (updateWrite.status !== 200 || opStatus(updateWrite.body, recordId) !== "applied") {
              syncStatus = "FAIL";
              syncDetails = "The second session's synthetic update was not acknowledged as applied (HTTP " + updateWrite.status + ").";
            } else {
              const readBackOnA = await requestJson(config, "/sync/pull?since=" + encodeURIComponent(String(baselineA)), tokenA);
              const ideasA = Array.isArray(readBackOnA.body?.ideas) ? readBackOnA.body.ideas.map(asObject) : [];
              const foundA = ideasA.find(item => item?.id === recordId);
              contentUpdated = readBackOnA.status === 200 && foundA?.content === updatedMarker;
              syncStatus = contentUpdated ? "PASS" : "FAIL";
              syncDetails = contentUpdated
                ? "PASS: disposable session A wrote a synthetic record, session B read and updated it, and session A read the update. The record ID/content values are not included in evidence."
                : "The first session did not read the exact synthetic update written by the second session (HTTP " + readBackOnA.status + ").";
            }
          }
        }
      } catch {
        syncStatus = "ERROR";
        syncDetails = "Synthetic cross-device flow could not complete due to a network, timeout, or unexpected response error; raw response and credentials were withheld.";
      }
      logoutDetails = "Logout/revocation test is pending verification after the synthetic sync flow.";
    }
  } catch {
    syncStatus = "ERROR";
    syncDetails = "Disposable-account integration flow failed before assertions completed; raw errors, response bodies, and credentials were withheld.";
    logoutDetails = "ERROR: authentication integration request failed; raw errors and credentials were withheld.";
  } finally {
    if (writeAttempted && tokenB) {
      try {
        const cleanup = await requestJson(config, "/sync/push", tokenB, "POST", {ops:[{entity:"idea",id:recordId,op:"purge"}]});
        if (cleanup.status !== 200 || opStatus(cleanup.body, recordId) !== "applied") {
          syncStatus = "FAIL";
          syncDetails += " Cleanup of the synthetic record could not be confirmed; inspect staging and remove only the TrustLoop-generated fixture.";
        }
      } catch {
        syncStatus = "FAIL";
        syncDetails += " Cleanup request failed; inspect staging and remove only the TrustLoop-generated fixture.";
      }
    }
    if (tokenA) {
      try {
        const logout = await requestJson(config, "/auth/logout", tokenA, "POST");
        const afterLogout = await requestJson(config, "/auth/me", tokenA);
        if (logout.status === 200 && (afterLogout.status === 401 || afterLogout.status === 403)) {
          logoutStatus = "PASS";
          logoutDetails = "PASS: the same session token was rejected by a protected endpoint after logout; token value was not recorded.";
        } else {
          logoutStatus = "FAIL";
          logoutDetails = "Logout/session revocation did not meet the expected contract (logout HTTP " + logout.status + ", protected request HTTP " + afterLogout.status + ").";
        }
      } catch {
        logoutStatus = "ERROR";
        logoutDetails = "Logout/session revocation evidence could not be collected due to a network or response error; credentials were withheld.";
      }
    }
    if (tokenB) {
      try { await requestJson(config, "/auth/logout", tokenB, "POST"); } catch { /* best-effort cleanup only; never record token */ }
    }
  }

  checkUpdate(checks, "sync.cross-device-integrity", syncStatus, syncDetails);
  checkUpdate(checks, "auth.logout-revocation", logoutStatus, logoutDetails);
  return checks;
}
