import { URL } from "node:url";
const BLOCKED_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const SENSITIVE_HEADERS = new Set(["authorization", "cookie", "set-cookie", "x-api-key"]);
export function validateTarget(raw: string, allowedHosts: string[]): URL {
  let u: URL;
  try { u = new URL(raw); } catch { throw new Error("TARGET_URL must be an absolute URL."); }
  if (!["http:", "https:"].includes(u.protocol)) throw new Error("Only HTTP(S) targets are allowed.");
  if (!allowedHosts.length || !allowedHosts.includes(u.hostname)) throw new Error(`Target host "${u.hostname}" is not explicitly allowlisted.`);
  if (u.username || u.password) throw new Error("Credentials embedded in target URLs are forbidden.");
  return u;
}
export function isAllowedRequestUrl(raw: string, allowedHosts: string[]): boolean {
  try { const u = new URL(raw); return ["http:", "https:"].includes(u.protocol) && allowedHosts.includes(u.hostname); }
  catch { return false; }
}
export function shouldBlockRequest(method: string): boolean { return BLOCKED_METHODS.has(method.toUpperCase()); }
export function redactHeaders(h: Record<string,string>): Record<string,string> {
  return Object.fromEntries(Object.entries(h).map(([k,v]) => [k, SENSITIVE_HEADERS.has(k.toLowerCase()) ? "[REDACTED]" : v]));
}
export function safeUrl(raw: string): string {
  try {
    const u = new URL(raw);
    for (const k of [...u.searchParams.keys()]) if (/(token|key|secret|password|auth|session|code)/i.test(k)) u.searchParams.set(k,"[REDACTED]");
    u.username = ""; u.password = ""; u.hash = ""; return u.toString();
  } catch { return "[INVALID_URL]"; }
}
export function redactDiagnostic(text: string): string {
  return text.replace(/https?:\/\/[^\s"'<>]+/gi, (raw) => safeUrl(raw)).slice(0, 2000);
}

export type SafeEnvironment = "local" | "test" | "staging";
export function validateSafeEnvironment(raw: string | undefined, target: URL): SafeEnvironment {
  if (raw !== "local" && raw !== "test" && raw !== "staging") {
    throw new Error("TRUSTLOOP_ENVIRONMENT must be explicitly set to local, test, or staging; production is not supported.");
  }
  if (raw === "local" && !["localhost", "127.0.0.1", "::1", "[::1]"].includes(target.hostname)) {
    throw new Error("Local mode requires a loopback host.");
  }
  if (raw !== "local" && /(^|[-.])(prod|production)([-.]|$)/i.test(target.hostname)) {
    throw new Error("Production-looking hostnames are not permitted in test/staging mode.");
  }
  return raw;
}
