import type { CheckResult, TrustLoopReport } from "./types.js";

export interface CheckChange {
  id: string;
  title: string;
  before: CheckResult["status"] | "NEW";
  after: CheckResult["status"] | "REMOVED";
  change: "improved" | "regressed" | "unchanged" | "new" | "removed";
}
export interface ReportComparison {
  schemaVersion: "1.0.0";
  currentRunId: string;
  baselineRunId: string;
  targetMatches: boolean;
  summary: { improved: number; regressed: number; unchanged: number; new: number; removed: number };
  changes: CheckChange[];
}
const rank: Record<CheckResult["status"], number> = { PASS: 0, SKIP: 1, BLOCKED: 2, FAIL: 3, ERROR: 4 };
function classify(before: CheckResult["status"], after: CheckResult["status"]): CheckChange["change"] {
  if (before === after) return "unchanged";
  return rank[after] < rank[before] ? "improved" : "regressed";
}
export function compareReports(current: TrustLoopReport, baseline: TrustLoopReport): ReportComparison {
  const a = new Map(baseline.checks.map(c => [c.id, c]));
  const b = new Map(current.checks.map(c => [c.id, c]));
  const changes: CheckChange[] = [];
  for (const c of current.checks) {
    const prev = a.get(c.id);
    if (!prev) changes.push({ id:c.id, title:c.title, before:"NEW", after:c.status, change:"new" });
    else changes.push({ id:c.id, title:c.title, before:prev.status, after:c.status, change:classify(prev.status,c.status) });
  }
  for (const prev of baseline.checks) {
    if (!b.has(prev.id)) changes.push({ id:prev.id, title:prev.title, before:prev.status, after:"REMOVED", change:"removed" });
  }
  const summary = {
    improved: changes.filter(c=>c.change==="improved").length,
    regressed: changes.filter(c=>c.change==="regressed").length,
    unchanged: changes.filter(c=>c.change==="unchanged").length,
    new: changes.filter(c=>c.change==="new").length,
    removed: changes.filter(c=>c.change==="removed").length
  };
  return { schemaVersion:"1.0.0", currentRunId:current.runId, baselineRunId:baseline.runId,
    targetMatches: current.target.url === baseline.target.url, summary, changes };
}
export function renderComparisonMarkdown(c: ReportComparison): string {
  const rows = c.changes.map(x => `| ${x.id} | ${x.before} | ${x.after} | ${x.change} |`).join("\n");
  return `# TrustLoop report comparison

- Current run: \`${c.currentRunId}\`
- Baseline run: \`${c.baselineRunId}\`
- Same target URL: **${c.targetMatches ? "yes" : "no"}**

## Summary

- Improved: ${c.summary.improved}
- Regressed: ${c.summary.regressed}
- Unchanged: ${c.summary.unchanged}
- New checks: ${c.summary.new}
- Removed checks: ${c.summary.removed}

## Check-level changes

| Check ID | Baseline | Current | Change |
|---|---|---|---|
${rows}
`;
}
