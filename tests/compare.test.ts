import { describe, it, expect } from "vitest";
import { compareReports } from "../src/compare.js";
import { makeReport } from "../src/report.js";
import type { CheckResult } from "../src/types.js";
const check=(id:string,status:CheckResult["status"]):CheckResult=>({id,category:"security",severity:"critical",status,title:id,details:"fixture",critical:true});
const report=(checks:CheckResult[],runId:string)=>({...makeReport("https://staging.example.test",checks,new Date().toISOString()),runId});
describe("stable-ID report comparison",()=>{
 it("recognizes an improvement and a regression",()=>{
  const before=report([check("auth", "BLOCKED"),check("e2ee","PASS")],"before");
  const after=report([check("auth","PASS"),check("e2ee","FAIL")],"after");
  const c=compareReports(after,before);
  expect(c.summary.improved).toBe(1);
  expect(c.summary.regressed).toBe(1);
  expect(c.targetMatches).toBe(true);
 });
 it("does not count a failing check becoming blocked as a fix",()=>{
  const c=compareReports(report([check("auth","BLOCKED")],"after"),report([check("auth","FAIL")],"before"));
  expect(c.summary.improved).toBe(0);
  expect(c.summary.regressed).toBe(1);
 });
 it("reports new and removed checks",()=>{
  const c=compareReports(report([check("new","BLOCKED")],"b"),report([check("old","PASS")],"a"));
  expect(c.summary.new).toBe(1);
  expect(c.summary.removed).toBe(1);
 });
 it("marks target mismatch rather than implying an apples-to-apples comparison",()=>{
  const current={...report([check("auth","PASS")],"b"),target:{url:"https://other.example.test",environment:"staging" as const}};
  const baseline=report([check("auth","PASS")],"a");
  expect(compareReports(current,baseline).targetMatches).toBe(false);
 });
});
