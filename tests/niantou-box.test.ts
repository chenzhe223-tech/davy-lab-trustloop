import { afterEach, describe, it, expect, vi } from "vitest";
import { NIANBOX_CHECKS, loadNianBoxAdapterConfig, pendingNianBoxChecks, runNianBoxStagingChecks } from "../src/adapters/niantou-box.js";
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
  TRUSTLOOP_NIANBOX_TEST_PASSWORD:"synthetic-test-password-123",
  TRUSTLOOP_NIANBOX_TEST_EMAIL_B:"trustloop-test-b@example.test",
  TRUSTLOOP_NIANBOX_TEST_PASSWORD_B:"synthetic-test-password-456"
} as NodeJS.ProcessEnv;
describe("NianBox adapter guardrails",()=>{
  it("defines the required security and functional checks",()=>{
    const ids=NIANBOX_CHECKS.map(c=>c.id);
    for(const id of ["auth.session-expiry","auth.logout-revocation","crypto.client-side-encryption","crypto.key-recovery","security.device-revocation","privacy.cloud-plaintext","sync.cross-device-integrity","storage.local-persistence","security.account-isolation"]) expect(ids).toContain(id);
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
    expect(config.testEmailB).toBe("trustloop-test-b@example.test");
    expect(()=>loadNianBoxAdapterConfig({...statefulEnv,TRUSTLOOP_ALLOWED_HOSTS:"niantou-staging.example.test"}))
      .toThrow(/allowlisted/i);
    expect(()=>loadNianBoxAdapterConfig({...statefulEnv,TRUSTLOOP_NIANBOX_CLOUD_URL:"https://cloud.example.com"}))
      .toThrow(/allowlisted/i);
    expect(()=>loadNianBoxAdapterConfig({...statefulEnv,TRUSTLOOP_NIANBOX_TEST_PASSWORD:"short"}))
      .toThrow(/8–200 characters/i);
    expect(()=>loadNianBoxAdapterConfig({...statefulEnv,TRUSTLOOP_NIANBOX_TEST_EMAIL_B:"trustloop-test@example.test"}))
      .toThrow(/two different test account emails/i);
  });
  it("rejects a non-staging app or cloud host before any integration request",()=>{
    expect(()=>loadNianBoxAdapterConfig({...statefulEnv,TARGET_URL:"https://app.example.com",TRUSTLOOP_ALLOWED_HOSTS:"app.example.com,niantou-cloud-staging.example.test"}))
      .toThrow(/clearly marked staging\/test\/preview/i);
    expect(()=>loadNianBoxAdapterConfig({...statefulEnv,TRUSTLOOP_NIANBOX_CLOUD_URL:"https://cloud.example.com",TRUSTLOOP_ALLOWED_HOSTS:"niantou-staging.example.test,cloud.example.com"}))
      .toThrow(/clearly marked staging\/test\/preview/i);
  });

  it.each([false,true])("runs the staging flow and enforces account isolation (leak=%s)",async(leakRecord)=>{
    const records = new Map<string, Record<string, unknown>>();
    const invalidated = new Set<string>();
    const seenUrls: string[] = [];
    let loginCount = 0;
    vi.stubGlobal("fetch", async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
      const method = init?.method || "GET";
      const token = new Headers(init?.headers).get("authorization")?.replace(/^Bearer\s+/i,"") || "";
      seenUrls.push(url.pathname + url.search);
      const send = (status:number, body:Record<string,unknown>) => new Response(JSON.stringify(body),{
        status,headers:{"content-type":"application/json"}
      });
      if (url.pathname === "/auth/login" && method === "POST") {
        loginCount += 1;
        const token = loginCount === 1 ? "mock-token-a" : loginCount === 2 ? "mock-token-b" : "mock-token-other";
        return send(200,{token,cursor:10});
      }
      if (url.pathname === "/sync/push" && method === "POST") {
        const body = JSON.parse(String(init?.body || "{}")) as {ops?:Array<Record<string,unknown>>};
        const ops = body.ops || [];
        const results = ops.map(op => {
          const id = String(op.id || "");
          if (op.op === "purge") records.delete(id);
          else if (op.doc && typeof op.doc === "object") records.set(id,{...(op.doc as Record<string,unknown>),seq:11,serverUpdatedAt:(op.doc as Record<string,unknown>).updatedAt});
          return {id,status:"applied",seq:11};
        });
        return send(200,{cursor:11,results});
      }
      if (url.pathname === "/sync/pull" && method === "GET") {
        if (invalidated.has(token)) return send(401,{error:"unauthenticated"});
        const ideas = token === "mock-token-other" && !leakRecord ? [] : [...records.values()];
        return send(200,{full:false,cursor:11,ideas});
      }
      if (url.pathname === "/auth/logout" && method === "POST") {
        invalidated.add(token);
        return send(200,{ok:true});
      }
      if (url.pathname === "/auth/me" && method === "GET") {
        return invalidated.has(token) ? send(401,{error:"unauthenticated"}) : send(200,{user:{id:"synthetic"},devices:[]});
      }
      return send(404,{error:"unexpected mocked route"});
    });
    try {
      const checks=await runNianBoxStagingChecks(loadNianBoxAdapterConfig(statefulEnv));
      expect(checks.find(c=>c.id==="nianbox.sync.cross-device-integrity")?.status).toBe("PASS");
      expect(checks.find(c=>c.id==="nianbox.auth.logout-revocation")?.status).toBe("PASS");
      expect(checks.find(c=>c.id==="nianbox.security.account-isolation")?.status).toBe(leakRecord ? "FAIL" : "PASS");
      expect(seenUrls).toContain("/auth/logout");
      expect(checks.map(c=>c.details).join(" ")).not.toContain("mock-token");
      expect(records.size).toBe(0);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
