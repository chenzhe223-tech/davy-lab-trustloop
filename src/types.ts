export type CheckStatus = "PASS" | "FAIL" | "BLOCKED" | "SKIP" | "ERROR";
export type ReportStatus = "PASS" | "FAIL" | "BLOCKED" | "ERROR";
export type Severity = "low" | "medium" | "high" | "critical";
export type Category = "availability" | "runtime" | "functional" | "accessibility" | "performance" | "security" | "privacy";
export interface CheckResult {
  id: string; category: Category; severity: Severity; status: CheckStatus;
  title: string; details: string; critical: boolean; repairHint?: string;
  evidence?: { kind: string; path?: string; sha256?: string }[];
}
export interface TrustLoopReport {
  schemaVersion: "1.0.0"; runId: string;
  target: { url: string; environment: "local" | "test" | "staging" | "production" | "unknown" };
  startedAt: string; finishedAt: string; status: ReportStatus;
  summary: { total: number; passed: number; failed: number; blocked: number; skipped: number };
  checks: CheckResult[];
  evidencePolicy: { redacted: boolean; productionWritesBlocked: boolean };
}
