import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { CheckResult, TrustLoopReport, ReportStatus } from "./types.js";
export function makeReport(url: string, checks: CheckResult[], startedAt: string, declaredEnvironment?: TrustLoopReport["target"]["environment"]): TrustLoopReport {
  const passed=checks.filter(c=>c.status==="PASS").length;
  const failed=checks.filter(c=>c.status==="FAIL"||c.status==="ERROR").length;
  const blocked=checks.filter(c=>c.status==="BLOCKED").length;
  const skipped=checks.filter(c=>c.status==="SKIP").length;
  const critical=checks.some(c=>c.critical&&c.status!=="PASS");
  const status: ReportStatus=critical?"BLOCKED":failed?"FAIL":"PASS";
  const environment: TrustLoopReport["target"]["environment"] = declaredEnvironment || (/localhost|127\.0\.0\.1|\[::1\]/i.test(url) ? "local" : "unknown");
  return {schemaVersion:"1.0.0",runId:randomUUID(),target:{url,environment},startedAt,finishedAt:new Date().toISOString(),status,
    summary:{total:checks.length,passed,failed,blocked,skipped},checks,evidencePolicy:{redacted:true,productionWritesBlocked:true}};
}
const esc=(s:string)=>s.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
export function renderHtml(r:TrustLoopReport):string {
  const rows=r.checks.map(c=>`<tr><td>${esc(c.status)}</td><td>${esc(c.severity)}</td><td>${esc(c.title)}</td><td>${esc(c.details)}</td></tr>`).join("");
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>TrustLoop Report</title><style>body{font:16px/1.5 system-ui;max-width:1100px;margin:40px auto;padding:0 20px;color:#172033}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:12px;border-bottom:1px solid #dbe1e8}th{background:#f3f5f8}code{overflow-wrap:anywhere}</style><h1>TrustLoop quality report</h1><p>Run ${esc(r.runId)} · ${esc(r.startedAt)}</p><h2>Overall: ${esc(r.status)}</h2><p>Target: <code>${esc(r.target.url)}</code></p><p>Total ${r.summary.total} · Passed ${r.summary.passed} · Failed ${r.summary.failed} · Blocked ${r.summary.blocked}</p><table><thead><tr><th>Status</th><th>Severity</th><th>Check</th><th>Details</th></tr></thead><tbody>${rows}</tbody></table><p>A BLOCKED status means at least one critical security control failed or is unverified. This is not a security certification.</p></html>`;
}
export function renderRepair(r:TrustLoopReport):string {
 const issues=r.checks.filter(c=>c.status!=="PASS"&&c.status!=="SKIP");
 return `# TrustLoop repair instructions

- Run: \`${r.runId}\`
- Target: \`${r.target.url}\`
- Status: **${r.status}**

## Rules

1. Fix only evidence-backed issues.
2. Preserve behavior and data compatibility.
3. Never weaken security controls to make tests pass.
4. Do not modify production data.
5. Add regression tests for repairs.

## Findings

${issues.length?issues.map((c,i)=>`### ${i+1}. [${c.severity.toUpperCase()}] ${c.title}

- ID: \`${c.id}\`
- Status: **${c.status}**
- Details: ${c.details}
- Suggested direction: ${c.repairHint||"Inspect implementation and add a reproducible regression test."}
`).join("\n"):"No actionable findings."}`;
}
export async function writeReports(r:TrustLoopReport,out:string):Promise<void>{
 await fs.mkdir(path.join(out,"evidence"),{recursive:true});
 await fs.writeFile(path.join(out,"report.json"),JSON.stringify(r,null,2)+"\n");
 await fs.writeFile(path.join(out,"report.html"),renderHtml(r));
 await fs.writeFile(path.join(out,"codex-repair.md"),renderRepair(r));
}
