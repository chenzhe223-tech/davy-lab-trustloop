import {describe,it,expect} from "vitest";
import {validateTarget,shouldBlockRequest,redactHeaders,safeUrl,isAllowedRequestUrl,redactDiagnostic} from "../src/policy.js";
import {makeReport} from "../src/report.js";
import type {CheckResult} from "../src/types.js";
describe("target allowlist",()=>{
 it("rejects hosts not allowlisted",()=>expect(()=>validateTarget("https://prod.example.com",["staging.example.com"])).toThrow(/allowlisted/));
 it("rejects embedded credentials",()=>expect(()=>validateTarget("https://u:p@staging.example.com",["staging.example.com"])).toThrow(/Credentials/));
 it("accepts allowlisted test host",()=>expect(validateTarget("https://staging.example.com",["staging.example.com"]).hostname).toBe("staging.example.com"));
 it("blocks redirects and resources to hosts outside the allowlist",()=>{
  expect(isAllowedRequestUrl("https://staging.example.com/app.js",["staging.example.com"])).toBe(true);
  expect(isAllowedRequestUrl("https://evil.example.org/collect",["staging.example.com"])).toBe(false);
  expect(isAllowedRequestUrl("file:///etc/passwd",["staging.example.com"])).toBe(false);
 });
});
describe("safe defaults",()=>{
 it.each(["POST","PUT","PATCH","DELETE"])("blocks %s",m=>expect(shouldBlockRequest(m)).toBe(true));
 it("allows GET",()=>expect(shouldBlockRequest("GET")).toBe(false));
 it("redacts sensitive headers",()=>expect(redactHeaders({Authorization:"Bearer x",Cookie:"sid=x","Content-Type":"application/json"})).toEqual({Authorization:"[REDACTED]",Cookie:"[REDACTED]","Content-Type":"application/json"}));
 it("redacts secret-like query params",()=>expect(safeUrl("https://test.example.com/?token=abc&view=home")).toContain("token=%5BREDACTED%5D"));
 it("redacts secret-bearing URLs in diagnostics",()=>expect(redactDiagnostic("failed https://test.example.com/?token=supersecret")).not.toContain("supersecret"));
});
it("blocks release if a critical check is unverified",()=>{
 const c:CheckResult={id:"security.e2ee",category:"security",severity:"critical",status:"BLOCKED",title:"E2EE",details:"Unverified",critical:true};
 expect(makeReport("https://staging.example.com",[c],new Date().toISOString()).status).toBe("BLOCKED");
});
