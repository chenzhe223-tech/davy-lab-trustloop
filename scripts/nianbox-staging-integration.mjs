import { randomBytes, randomUUID } from "node:crypto";

const API = "https://nianbox-cloud-trustloop-staging.chenzhe223.workers.dev";
const runLabel = (process.env.GITHUB_RUN_ID || "manual").replace(/[^a-zA-Z0-9-]/g, "").slice(0, 30);
const runSuffix = runLabel + "-" + randomBytes(6).toString("hex");
const emailA = "trustloop-auto-a-" + runSuffix + "@example.test";
const emailB = "trustloop-auto-b-" + runSuffix + "@example.test";
const passwordA = randomBytes(24).toString("base64url");
const passwordB = randomBytes(24).toString("base64url");
const fixtureId = "trustloop-" + randomUUID();
const fixtureContent = "Synthetic staging-only TrustLoop fixture " + randomUUID();
const updatedContent = fixtureContent + " / updated-by-second-session";
let tokenA;
let tokenA2;
let tokenB;
let writeAttempted = false;
let fixtureCleanupVerified = false;
let failed = false;
const results = [];

async function request(path, {method = "GET", token, body} = {}) {
  const headers = {accept: "application/json"};
  if (token) headers.authorization = "Bearer " + token;
  if (body !== undefined) headers["content-type"] = "application/json";
  const response = await fetch(new URL(path, API), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "error",
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  let payload = null;
  try { payload = await response.json(); } catch {}
  return {status: response.status, payload};
}
function check(name, pass, evidence) {
  results.push({name, status: pass ? "PASS" : "FAIL", evidence});
  console.log((pass ? "PASS " : "FAIL ") + name + " — " + evidence);
  if (!pass) failed = true;
}
function requireOk(result, expectedStatus, label) {
  if (result.status !== expectedStatus) {
    const safeMessage = typeof result.payload?.message === "string" ? result.payload.message.slice(0, 160) : "no JSON error detail";
    throw new Error(label + " returned HTTP " + result.status + " (expected " + expectedStatus + "): " + safeMessage);
  }
  return result.payload;
}
function assertApplied(payload, id, operation) {
  return Array.isArray(payload?.results) && payload.results.some(item => item?.id === id && item?.status === "applied" && (!operation || item.op === operation || item.status === "applied"));
}
async function logout(token) {
  if (!token) return;
  try { await request("/auth/logout", {method:"POST", token, body:{}}); } catch { /* credentials are deliberately never logged */ }
}
async function run() {
  console.log("NianBox staging API integration; account labels and credentials are kept out of logs.");
  const regA = requireOk(await request("/auth/register", {method:"POST", body:{
    email:emailA,password:passwordA,displayName:"TrustLoop disposable account A",deviceLabel:"trustloop-ci-a"
  }}), 200, "Register temporary account A");
  if (typeof regA.token !== "string" || typeof regA.user?.id !== "string" || typeof regA.cursor !== "number") throw new Error("Temporary account A registration response is incomplete.");
  tokenA = regA.token;
  const regB = requireOk(await request("/auth/register", {method:"POST", body:{
    email:emailB,password:passwordB,displayName:"TrustLoop disposable account B",deviceLabel:"trustloop-ci-b"
  }}), 200, "Register temporary account B");
  if (typeof regB.token !== "string" || typeof regB.user?.id !== "string" || typeof regB.cursor !== "number") throw new Error("Temporary account B registration response is incomplete.");
  tokenB = regB.token;
  const secondA = requireOk(await request("/auth/login", {method:"POST",body:{
    email:emailA,password:passwordA,deviceLabel:"trustloop-ci-a-second-session"
  }}),200,"Create second session for account A");
  if (typeof secondA.token !== "string" || typeof secondA.cursor !== "number") throw new Error("Second session response is incomplete.");
  tokenA2 = secondA.token;
  const baselineA = regA.cursor;
  const baselineA2 = secondA.cursor;
  const baselineB = regB.cursor;

  const now = Date.now();
  const doc = {
    id:fixtureId,title:"TrustLoop synthetic cross-session fixture",content:fixtureContent,
    category:"other",status:"inbox",tags:["trustloop-synthetic"],pinned:false,notes:"",
    problem:"",targetUsers:"",productForm:"other",projectUrl:"",projectId:null,
    createdAt:now,updatedAt:now,deletedAt:null,categorySource:"manual"
  };
  writeAttempted = true;
  const write = await request("/sync/push",{method:"POST",token:tokenA,body:{ops:[{entity:"idea",id:fixtureId,op:"upsert",doc}] }});
  const writePayload = requireOk(write,200,"Create synthetic record");
  if (!assertApplied(writePayload,fixtureId)) throw new Error("Cloud did not acknowledge the synthetic record.");
  check("cloud write acknowledged",true,"staging API returned applied for the generated synthetic record");

  const readA2 = requireOk(await request("/sync/pull?since="+encodeURIComponent(String(baselineA2)),{token:tokenA2}),200,"Read synthetic record through second session");
  const foundA2 = Array.isArray(readA2.ideas) ? readA2.ideas.find(item=>item?.id===fixtureId) : undefined;
  check("same-account cross-session read",foundA2?.content===fixtureContent,"second session read exact synthetic content");

  const otherRead = requireOk(await request("/sync/pull?since="+encodeURIComponent(String(baselineB)),{token:tokenB}),200,"Read snapshot as separate account");
  const otherIdeas = Array.isArray(otherRead.ideas) ? otherRead.ideas : [];
  const otherSeesFixture = otherIdeas.some(item=>item?.id===fixtureId || item?.content===fixtureContent);
  check("cross-account isolation",!otherSeesFixture,"different temporary account did not receive the synthetic record");

  const updatedDoc = {...foundA2,content:updatedContent,updatedAt:Date.now()+1000};
  const updatePayload = requireOk(await request("/sync/push",{method:"POST",token:tokenA2,body:{ops:[{entity:"idea",id:fixtureId,op:"upsert",doc:updatedDoc}]}}),200,"Update synthetic record through second session");
  if (!assertApplied(updatePayload,fixtureId)) throw new Error("Cloud did not acknowledge the synthetic update.");
  const readA1 = requireOk(await request("/sync/pull?since="+encodeURIComponent(String(baselineA)),{token:tokenA}),200,"Read updated record through first session");
  const foundA1 = Array.isArray(readA1.ideas) ? readA1.ideas.find(item=>item?.id===fixtureId) : undefined;
  check("cross-session update propagation",foundA1?.content===updatedContent,"first session read the exact update written by the second session");

  const logoutA = await request("/auth/logout",{method:"POST",token:tokenA,body:{}});
  const afterLogout = await request("/auth/me",{token:tokenA});
  check("logout revokes the same token",logoutA.status===200 && [401,403].includes(afterLogout.status),"same token rejected by /auth/me after logout");

  const purge = requireOk(await request("/sync/push",{method:"POST",token:tokenA2,body:{ops:[{entity:"idea",id:fixtureId,op:"purge"}]}}),200,"Purge synthetic record");
  const cleanupApplied = assertApplied(purge,fixtureId);
  check("synthetic record cleanup",cleanupApplied,"staging API acknowledged permanent deletion");
  const verifyGone = requireOk(await request("/sync/pull",{token:tokenA2}),200,"Verify cleanup");
  const fixtureRemains = (Array.isArray(verifyGone.ideas)?verifyGone.ideas:[]).some(item=>item?.id===fixtureId);
  check("cleanup verified by fresh snapshot",!fixtureRemains,"fresh full snapshot no longer contains the fixture");
  fixtureCleanupVerified = cleanupApplied && !fixtureRemains;
  if (fixtureRemains) failed = true;
}

try {
  await run();
} catch (error) {
  failed = true;
  console.error("INTEGRATION ERROR: " + (error instanceof Error ? error.message.slice(0,300) : "unknown error"));
} finally {
  if (writeAttempted && tokenA2 && !fixtureCleanupVerified) {
    try {
      const result = await request("/sync/push",{method:"POST",token:tokenA2,body:{ops:[{entity:"idea",id:fixtureId,op:"purge"}]}});
      const cleaned = result.status===200 && assertApplied(result.payload,fixtureId);
      if (!cleaned) {
        failed = true;
        console.error("FAIL fallback fixture cleanup; inspect only TrustLoop-generated staging data.");
      } else {
        const snapshot = await request("/sync/pull",{token:tokenA2});
        const remains = snapshot.status===200 && (Array.isArray(snapshot.payload?.ideas)?snapshot.payload.ideas:[]).some(item=>item?.id===fixtureId);
        if (remains) {
          failed = true;
          console.error("FAIL fallback cleanup verification; the generated fixture still appears in staging.");
        } else {
          fixtureCleanupVerified = true;
          console.log("PASS fallback cleanup verified.");
        }
      }
    } catch {
      failed = true;
      console.error("FAIL fallback cleanup request; inspect only TrustLoop-generated staging data.");
    }
  }
  await Promise.all([logout(tokenA),logout(tokenA2),logout(tokenB)]);
}
console.log("NianBox staging integration summary: " + results.filter(r=>r.status==="PASS").length + " PASS, " + results.filter(r=>r.status==="FAIL").length + " FAIL.");
if (failed) process.exitCode = 1;
