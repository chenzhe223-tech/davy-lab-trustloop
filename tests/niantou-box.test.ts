import { describe, it, expect } from "vitest";
import { NIANBOX_CHECKS, loadNianBoxAdapterConfig, pendingNianBoxChecks } from "../src/adapters/niantou-box.js";
const baseEnv = {
  TRUSTLOOP_ENVIRONMENT:"staging", TARGET_URL:"https://niantou-staging.example.test",
  TRUSTLOOP_ALLOWED_HOSTS:"niantou-staging.example.test", TRUSTLOOP_TEST_ACCOUNT_LABEL:"trustloop-disposable-user-a"
} as NodeJS.ProcessEnv;
describe("NianBox adapter guardrails",()=>{
  it("defines the required security and functional checks",()=>{
    const ids=NIANBOX_CHECKS.map(c=>c.id);
    for(const id of ["auth.session-expiry","auth.logout-revocation","crypto.client-side-encryption","crypto.key-recovery","security.device-revocation","privacy.cloud-plaintext","sync.cross-device-integrity","storage.local-persistence"]) expect(ids).toContain(id);
  });
  it("keeps unimplemented checks BLOCKED",()=>{
    const checks=pendingNianBoxChecks();
    expect(checks).toHaveLength(NIANBOX_CHECKS.length);
    expect(checks.every(c=>c.status==="BLOCKED")).toBe(true);
    expect(checks.filter(c=>c.critical).every(c=>c.severity==="critical")).toBe(true);
  });
  it("rejects production or missing environment",()=>{
    expect(()=>loadNianBoxAdapterConfig({...baseEnv,TRUSTLOOP_ENVIRONMENT:"production"})).toThrow(/production is not permitted/i);
    expect(()=>loadNianBoxAdapterConfig({...baseEnv,TRUSTLOOP_ENVIRONMENT:undefined})).toThrow(/requires TRUSTLOOP_ENVIRONMENT/i);
  });
  it("requires allowlisted host and disposable account label",()=>{
    expect(()=>loadNianBoxAdapterConfig({...baseEnv,TRUSTLOOP_ALLOWED_HOSTS:"other.example.test"})).toThrow(/allowlisted/i);
    expect(()=>loadNianBoxAdapterConfig({...baseEnv,TRUSTLOOP_TEST_ACCOUNT_LABEL:""})).toThrow(/TEST_ACCOUNT_LABEL/i);
  });
  it("rejects production-looking hostnames",()=>{
    expect(()=>loadNianBoxAdapterConfig({...baseEnv,TARGET_URL:"https://prod.niantou.example",TRUSTLOOP_ALLOWED_HOSTS:"prod.niantou.example"})).toThrow(/Production-looking/i);
  });
  it("requires loopback for local environment",()=>{
    expect(()=>loadNianBoxAdapterConfig({...baseEnv,TRUSTLOOP_ENVIRONMENT:"local"})).toThrow(/loopback/i);
  });
});
