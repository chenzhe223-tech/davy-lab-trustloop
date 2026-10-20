import { describe, it, expect } from "vitest";
import { NIANBOX_CHECKS, loadNianBoxAdapterConfig, pendingNianBoxChecks } from "../src/adapters/niantou-box.js";
const baseEnv = {
  TRUSTLOOP_ENVIRONMENT:"staging", TARGET_URL:"https://niantou-staging.example.test",
  TRUSTLOOP_ALLOWED_HOSTS:"niantou-staging.example.test", TRUSTLOOP_TEST_ACCOUNT_LABEL:"trustloop-disposable-user-a"
} as NodeJS.ProcessEnv;
const statefulEnv = {
  ...baseEnv,
  TRUSTLOOP_NIANBOX_STATEFUL_TESTS:"true",
  TRUSTLOOP_NIANBOX_STAGING_CONFIRMATION:"I_CONFIRM_STAGING_ONLY",
  TRUSTLOOP_NIANBOX_CLOUD_URL:"https://niantou-cloud-staging.example.test",
  TRUSTLOOP_ALLOWED_HOSTS:"niantou-staging.example.test,niantou-cloud-staging.example.test",
  TRUSTLOOP_NIANBOX_TEST_EMAIL:"trustloop-test@example.test",
  TRUSTLOOP_NIANBOX_TEST_PASSWORD:"synthetic-test-password-123"
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

  it("keeps state-changing integration tests disabled by default",()=>{
    const config=loadNianBoxAdapterConfig(baseEnv);
    expect(config.statefulTestsEnabled).toBe(false);
    expect(config.cloudUrl).toBeUndefined();
    expect(config.testPassword).toBeUndefined();
  });
  it("requires explicit staging confirmation and disposable account label before writes",()=>{
    expect(()=>loadNianBoxAdapterConfig({...statefulEnv,TRUSTLOOP_NIANBOX_STAGING_CONFIRMATION:undefined}))
      .toThrow(/explicit dispatch confirmation/i);
    expect(()=>loadNianBoxAdapterConfig({...statefulEnv,TRUSTLOOP_TEST_ACCOUNT_LABEL:"real-user"}))
      .toThrow(/disposable label/i);
    expect(()=>loadNianBoxAdapterConfig({...statefulEnv,TRUSTLOOP_ENVIRONMENT:"test"}))
      .toThrow(/require TRUSTLOOP_ENVIRONMENT=staging/i);
  });
  it("requires an allowlisted staging cloud origin and disposable credentials",()=>{
    const config=loadNianBoxAdapterConfig(statefulEnv);
    expect(config.statefulTestsEnabled).toBe(true);
    expect(config.cloudUrl).toBe("https://niantou-cloud-staging.example.test");
    expect(config.testEmail).toBe("trustloop-test@example.test");
    expect(()=>loadNianBoxAdapterConfig({...statefulEnv,TRUSTLOOP_ALLOWED_HOSTS:"niantou-staging.example.test"}))
      .toThrow(/allowlisted/i);
    expect(()=>loadNianBoxAdapterConfig({...statefulEnv,TRUSTLOOP_NIANBOX_CLOUD_URL:"https://cloud.example.com"}))
      .toThrow(/allowlisted/i);
    expect(()=>loadNianBoxAdapterConfig({...statefulEnv,TRUSTLOOP_NIANBOX_TEST_PASSWORD:"short"}))
      .toThrow(/8–200 characters/i);
  });
  it("rejects a non-staging app or cloud host before any integration request",()=>{
    expect(()=>loadNianBoxAdapterConfig({...statefulEnv,TARGET_URL:"https://app.example.com",TRUSTLOOP_ALLOWED_HOSTS:"app.example.com,niantou-cloud-staging.example.test"}))
      .toThrow(/clearly marked staging\/test\/preview/i);
    expect(()=>loadNianBoxAdapterConfig({...statefulEnv,TRUSTLOOP_NIANBOX_CLOUD_URL:"https://cloud.example.com",TRUSTLOOP_ALLOWED_HOSTS:"niantou-staging.example.test,cloud.example.com"}))
      .toThrow(/clearly marked staging\/test\/preview/i);
  });
});
