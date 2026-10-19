import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
import { validateTarget, shouldBlockRequest, isAllowedRequestUrl, safeUrl, redactDiagnostic } from "./policy.js";
import { makeReport, writeReports } from "./report.js";
import type { CheckResult } from "./types.js";
import { loadNianBoxAdapterConfig, pendingNianBoxChecks } from "./adapters/niantou-box.js";
function parseArgs(a:string[]){const o:Record<string,string>={};for(let i=0;i<a.length;i++)if(a[i]?.startsWith("--")){const k=a[i]!.slice(2);o[k]=a[i+1]&&!a[i+1]!.startsWith("--")?a[++i]!:"true";}return o;}
const args=parseArgs(process.argv.slice(2));
const target=args.url||process.env.TARGET_URL||"";
const out=args.out||process.env.TRUSTLOOP_OUT||"reports/latest";
const allow=(process.env.TRUSTLOOP_ALLOWED_HOSTS||"").split(",").map(x=>x.trim().toLowerCase()).filter(Boolean);
let url:URL;
try{url=validateTarget(target,allow);}catch(e){console.error(`TrustLoop config error: ${(e as Error).message}`);process.exit(2);}
const adapter = process.env.TRUSTLOOP_ADAPTER || "generic";
if (adapter !== "generic" && adapter !== "niantou-box") { console.error("Unknown TRUSTLOOP_ADAPTER. Supported: generic, niantou-box."); process.exit(2); }
if (adapter === "niantou-box") {
  try {
    const cfg = loadNianBoxAdapterConfig(process.env);
    if (new URL(cfg.targetUrl).hostname !== url.hostname) throw new Error("Adapter TARGET_URL must match CLI target host.");
  } catch(e) { console.error(`NianBox adapter config error: ${(e as Error).message}`); process.exit(2); }
}
const started=new Date().toISOString();const checks:CheckResult[]=[];const add=(c:CheckResult)=>checks.push(c);
const browser=await chromium.launch({headless:true});const page=await browser.newPage();const errors:string[]=[];
page.on("console",m=>{if(m.type()==="error")errors.push(redactDiagnostic(m.text()));});page.on("pageerror",e=>errors.push(redactDiagnostic(e.message)));
await page.route("**/*",async route=>{
 const requestUrl=route.request().url();
 if(!isAllowedRequestUrl(requestUrl,allow)||shouldBlockRequest(route.request().method())){await route.abort("blockedbyclient");return;}
 await route.continue();
});
try{
 const response=await page.goto(url.toString(),{waitUntil:"domcontentloaded",timeout:30000});
 add(response&&response.status()<400?{id:"site.reachable",category:"availability",severity:"high",status:"PASS",title:"Target is reachable",details:`HTTP ${response.status()}`,critical:false}:{id:"site.reachable",category:"availability",severity:"high",status:"FAIL",title:"Target is not reachable",details:`HTTP ${response?.status()??"no response"}`,critical:false,repairHint:"Check deployment health and test URL."});
 add(errors.length?{id:"page.no-console-errors",category:"runtime",severity:"medium",status:"FAIL",title:"Browser console errors detected",details:errors.slice(0,20).join("\n"),critical:false,repairHint:"Fix observed browser errors and add regression tests."}:{id:"page.no-console-errors",category:"runtime",severity:"medium",status:"PASS",title:"No browser console errors",details:"No console or uncaught page errors observed during initial load.",critical:false});
 await fs.mkdir(path.join(out,"evidence"),{recursive:true});try{await page.screenshot({path:path.join(out,"evidence","initial-load.png"),fullPage:true,timeout:10000});}catch{}
}catch(e){add({id:"site.reachable",category:"availability",severity:"high",status:"ERROR",title:"Navigation failed",details:redactDiagnostic((e as Error).message),critical:false});}finally{await browser.close();}
if (adapter === "niantou-box") {
  checks.push(...pendingNianBoxChecks());
} else {
for(const [id,title,details] of [
 ["security.authn.session-handling","Authentication and session handling","Target-specific authentication tests are not configured; unverified."],
 ["security.e2ee.client-encryption","End-to-end encryption","No cryptographic evidence adapter configured; unverified."],
 ["security.key-recovery","Encryption key recovery","Password reset does not prove encryption-key recovery; unverified."],
 ["security.device-revocation","Device revocation","No multi-session revocation test configured; unverified."],
 ["security.cloud-plaintext-readability","Cloud plaintext readability","No isolated backend/database inspection adapter configured; unverified."]
] as const)add({id,category:"security",severity:"critical",status:"BLOCKED",title,details,critical:true,repairHint:"Implement an isolated test with controlled test accounts and verifiable evidence before marking PASS."});
}
const report=makeReport(safeUrl(url.toString()),checks,started);await writeReports(report,out);
console.log(`TrustLoop: ${report.status}\nReports: ${path.resolve(out)}`);
if(report.status==="BLOCKED")process.exit(3);if(report.status==="FAIL")process.exit(1);
