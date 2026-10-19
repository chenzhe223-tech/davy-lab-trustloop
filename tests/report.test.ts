import { describe, it, expect } from "vitest";
import { makeReport, renderHtml, renderRepair } from "../src/report.js";
import type { CheckResult } from "../src/types.js";

const result = (overrides: Partial<CheckResult> = {}): CheckResult => ({
  id:"runtime.console", category:"runtime", severity:"medium", status:"PASS",
  title:"No console errors", details:"No errors found", critical:false, ...overrides
});
describe("report contract",()=>{
  it("counts statuses and blocks release for unverified critical controls",()=>{
    const r=makeReport("https://staging.example.test",[
      result({id:"a",status:"PASS"}),
      result({id:"b",status:"FAIL"}),
      result({id:"c",status:"BLOCKED",critical:true,severity:"critical"})
    ],new Date().toISOString());
    expect(r.summary).toEqual({total:3,passed:1,failed:1,blocked:1,skipped:0});
    expect(r.status).toBe("BLOCKED");
  });
  it("escapes untrusted text in HTML output",()=>{
    const r=makeReport("https://staging.example.test",[
      result({title:"<script>alert(1)</script>",details:"<img src=x onerror=alert(1)>"})
    ],new Date().toISOString());
    const html=renderHtml(r);
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&lt;img");
  });
  it("includes only actionable findings in repair instructions",()=>{
    const r=makeReport("https://staging.example.test",[
      result({id:"ok",status:"PASS"}),
      result({id:"blocked",status:"BLOCKED",critical:true,severity:"critical",title:"E2EE evidence missing"})
    ],new Date().toISOString());
    const md=renderRepair(r);
    expect(md).toContain("E2EE evidence missing");
    expect(md).not.toContain("### 1. [MEDIUM] No console errors");
  });
});
