const API = "https://nianbox-cloud-trustloop-staging.chenzhe223.workers.dev";

const HTML = String.raw`<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="color-scheme" content="light">
<meta name="referrer" content="no-referrer">
<title>NianBox · Staging Acceptance</title>
<style>
:root{font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;color:#17233b;background:#f3f5f9;font-synthesis:none;text-rendering:optimizeLegibility}
*{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(ellipse at 90% 0%,#e2eafb 0,transparent 38%),#f3f5f9}
main{max-width:880px;margin:0 auto;padding:28px 18px 56px}.top{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:20px}
.kicker{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#3f61ad;font-weight:800}.title{font-size:clamp(26px,5vw,38px);letter-spacing:-.04em;margin:7px 0 6px;line-height:1.12}.sub{color:#52627b;margin:0;font-size:14px;line-height:1.6;max-width:640px}
.chip{border:1px solid #ccd7ed;background:#f9fbff;border-radius:999px;padding:7px 10px;font-size:11px;font-weight:800;color:#2e4b86;white-space:nowrap}
.card{background:rgba(255,255,255,.92);border:1px solid #e0e5ee;border-radius:18px;padding:20px;margin:14px 0;box-shadow:0 8px 28px rgba(28,45,78,.045)}
h2{font-size:16px;margin:0 0 13px;letter-spacing:-.01em}.hint{font-size:12px;color:#65738a;line-height:1.6;margin-top:9px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.field{display:flex;flex-direction:column;gap:6px;font-size:12px;color:#50617a;font-weight:700}
input,textarea{width:100%;font:inherit;color:#17233b;background:#fbfcff;border:1px solid #cdd6e4;border-radius:10px;padding:11px 12px;outline:none}
input:focus,textarea:focus{border-color:#426ac2;box-shadow:0 0 0 3px #426ac21a}textarea{resize:vertical;min-height:86px;line-height:1.55}
button{font:inherit;cursor:pointer;border:1px solid #cbd5e3;border-radius:10px;background:#fff;color:#243650;padding:10px 13px;font-size:13px;font-weight:750;transition:transform .12s,border-color .12s}
button:hover{border-color:#7892c8}button:active{transform:translateY(1px)}button.primary{background:#244b9b;color:#fff;border-color:#244b9b}button.primary:hover{background:#173c86}button.danger{color:#a33232;border-color:#eccbcb;background:#fff8f8}
.actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:13px}.status{font-size:13px;line-height:1.6;padding:10px 12px;border-radius:10px;background:#f0f4fb;color:#3c5578;white-space:pre-wrap;overflow-wrap:anywhere;margin:12px 0 0}.status.error{background:#fff1f1;color:#9d2f2f}.status.good{background:#edf8f0;color:#22683b}
#workspace[hidden],#login[hidden]{display:none}.record{border:1px solid #e0e6ef;border-radius:13px;padding:14px;margin-top:10px;background:#fff}.recordhead{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px}.recordtitle{font-size:13px;font-weight:800}.meta{font-size:11px;color:#7b8798}.record textarea{min-height:78px;background:#fbfcff}.empty{padding:23px 12px;text-align:center;color:#7a879a;font-size:13px;border:1px dashed #ced7e5;border-radius:12px}
.footer{font-size:12px;color:#718097;line-height:1.7;padding:8px 4px}
@media(max-width:560px){main{padding:22px 12px 36px}.top{display:block}.chip{display:inline-block;margin-top:13px}.card{padding:16px;border-radius:15px}.grid{grid-template-columns:1fr}.actions button{flex:1 1 auto}.recordhead{align-items:flex-start}}
</style>
</head>
<body>
<main>
<header class="top">
 <div><div class="kicker">DAVYLAB · TRUSTLOOP</div><h1 class="title">NianBox Staging</h1><p class="sub">跨设备同步验收台。用独立测试账号验证真实 staging API，不连接生产数据。</p></div>
 <div class="chip">STAGING ONLY · SYNTHETIC DATA</div>
</header>
<section class="card">
 <h2>测试边界</h2>
 <p class="sub">只使用专门的测试邮箱和虚构念头。此页面是验收控制台，不是正式版 NianBox 界面；令牌仅保存在当前页面内存，刷新页面后需重新登录。</p>
</section>
<section id="login" class="card">
 <h2>登录或创建一次性测试账号</h2>
 <div class="grid">
  <label class="field">测试邮箱<input id="email" type="email" autocomplete="off" placeholder="trustloop-test@example.test" maxlength="200"></label>
  <label class="field">测试口令<input id="password" type="password" autocomplete="new-password" placeholder="至少 8 位" maxlength="200"></label>
 </div>
 <div class="actions"><button class="primary" id="loginBtn">登录</button><button id="registerBtn">创建测试账号</button></div>
 <div id="authStatus" class="status" role="status">尚未登录。请勿使用真实账号或重复使用个人密码。</div>
</section>
<section id="workspace" hidden>
 <section class="card">
  <div class="recordhead"><div><h2 style="margin:0 0 4px">跨设备记录</h2><div id="accountLabel" class="meta"></div></div><button id="logoutBtn">退出登录</button></div>
  <div class="actions"><button class="primary" id="refreshBtn">从云端重新读取</button><span id="count" class="chip">0 条</span></div>
  <div id="syncStatus" class="status" role="status">尚未读取。</div>
  <p class="hint">建议：电脑新增 → 手机上刷新读取 → 手机上修改并保存 → 电脑重新读取。每个设备都要独立登录同一测试账号。</p>
 </section>
 <section class="card">
  <h2>新增合成测试记录</h2>
  <label class="field">测试内容<textarea id="newContent" maxlength="4000" placeholder="例如：TrustLoop staging cross-device check — synthetic only"></textarea></label>
  <div class="actions"><button id="addBtn" class="primary">保存到云端</button></div>
  <div class="hint">本按钮会向 staging 数据库写入一条标记为 trustloop-synthetic 的记录。</div>
 </section>
 <section class="card"><h2>云端收件箱</h2><div id="records"><div class="empty">点击“从云端重新读取”</div></div></section>
</section>
<div class="footer">隐私提示：此验收台不安装第三方脚本、不做分析统计、不把口令或令牌保存到浏览器存储中。请只在 staging 使用合成数据，测试结束后删除带有 trustloop-synthetic 标记的记录。</div>
</main>
<script>
const API_ORIGIN = "https://nianbox-cloud-trustloop-staging.chenzhe223.workers.dev";
let token = "";
let user = null;
let notes = [];
const el = (id) => document.getElementById(id);
function status(id, message, kind) {
  const node = el(id); node.textContent = message; node.className = "status" + (kind ? " " + kind : "");
}
async function request(path, options) {
  const opts = options || {};
  const headers = {"accept":"application/json"};
  if (opts.body) headers["content-type"] = "application/json";
  if (token) headers.authorization = "Bearer " + token;
  const response = await fetch(API_ORIGIN + path, {method:opts.method || "GET",headers,body:opts.body ? JSON.stringify(opts.body) : undefined,cache:"no-store",redirect:"error"});
  let body = null;
  try { body = await response.json(); } catch {}
  if (!response.ok) throw new Error((body && (body.message || body.error)) || ("请求失败，HTTP " + response.status));
  return body;
}
function enter(account) {
  user = account || {};
  el("login").hidden = true; el("workspace").hidden = false;
  el("accountLabel").textContent = "当前测试账号：" + (user.email || "已验证会话");
  el("password").value = "";
  status("syncStatus","登录成功。请从云端读取记录。","good");
}
function leave(message) {
  token = ""; user = null; notes = [];
  el("login").hidden = false; el("workspace").hidden = true;
  el("records").replaceChildren();
  status("authStatus",message || "已退出。","good");
}
async function authenticate(mode) {
  const email = el("email").value.trim().toLowerCase();
  const password = el("password").value;
  if (!email || !password) { status("authStatus","请填写测试邮箱与口令。","error"); return; }
  el("loginBtn").disabled = true; el("registerBtn").disabled = true;
  try {
    const data = await request("/auth/" + mode,{method:"POST",body:{email,password,displayName:"TrustLoop disposable tester",deviceLabel:"trustloop-staging-ui"}});
    if (typeof data.token !== "string" || !data.user) throw new Error("服务器响应缺少会话信息。");
    token = data.token; enter(data.user); await pull();
  } catch (error) { status("authStatus",error instanceof Error ? error.message : "请求失败。","error"); }
  finally { el("loginBtn").disabled = false; el("registerBtn").disabled = false; }
}
function makeButton(label, handler, className) {
  const b = document.createElement("button"); b.textContent = label; if (className) b.className = className; b.addEventListener("click",handler); return b;
}
function renderRecords() {
  const root = el("records"); root.replaceChildren();
  const visible = notes.filter(n => !n.deletedAt);
  el("count").textContent = visible.length + " 条";
  if (!visible.length) { const empty=document.createElement("div"); empty.className="empty"; empty.textContent="当前云端没有记录；可以先新增一条合成测试记录。"; root.appendChild(empty); return; }
  for (const doc of visible) {
    const card=document.createElement("article"); card.className="record";
    const header=document.createElement("div"); header.className="recordhead";
    const title=document.createElement("div"); title.className="recordtitle"; title.textContent=doc.title || "未命名念头";
    const meta=document.createElement("div"); meta.className="meta"; meta.textContent=(doc.tags || []).includes("trustloop-synthetic") ? "SYNTHETIC TEST" : "Existing record";
    header.append(title,meta);
    const field=document.createElement("label"); field.className="field"; field.textContent="内容";
    const area=document.createElement("textarea"); area.maxLength=4000; area.value=String(doc.content || ""); field.appendChild(area);
    const actions=document.createElement("div"); actions.className="actions";
    actions.appendChild(makeButton("保存修改",async()=>{
      const next={...doc,content:area.value,updatedAt:Date.now()};
      try {
        const result=await request("/sync/push",{method:"POST",body:{ops:[{entity:"idea",id:doc.id,op:"upsert",doc:next}]}});
        if (!Array.isArray(result.results) || !result.results.some(x=>x.id===doc.id && x.status==="applied")) throw new Error("服务器没有确认保存。");
        status("syncStatus","修改已由云端确认；另一台设备请点击刷新验证。","good"); await pull();
      } catch(error) { status("syncStatus",error instanceof Error?error.message:"保存失败。","error"); }
    },"primary"));
    if ((doc.tags || []).includes("trustloop-synthetic")) actions.appendChild(makeButton("永久删除测试记录",async()=>{
      if (!window.confirm("只删除这条带有 trustloop-synthetic 标记的合成测试记录？")) return;
      try {
        const result=await request("/sync/push",{method:"POST",body:{ops:[{entity:"idea",id:doc.id,op:"purge"}]}});
        if (!Array.isArray(result.results) || !result.results.some(x=>x.id===doc.id && x.status==="applied")) throw new Error("服务器没有确认删除。");
        status("syncStatus","已请求永久删除此合成测试记录。","good"); await pull();
      } catch(error) { status("syncStatus",error instanceof Error?error.message:"删除失败。","error"); }
    },"danger"));
    actions.appendChild(makeButton("复制记录 ID",async()=>{try{await navigator.clipboard.writeText(String(doc.id));status("syncStatus","记录 ID 已复制。","good");}catch{status("syncStatus","浏览器未允许复制。");}}));
    card.append(header,field,actions); root.appendChild(card);
  }
}
async function pull() {
  el("refreshBtn").disabled=true;
  try {
    const result=await request("/sync/pull");
    notes=Array.isArray(result.ideas)?result.ideas:[];
    renderRecords();
    status("syncStatus","云端快照读取成功 · " + notes.filter(n=>!n.deletedAt).length + " 条可见记录 · " + new Date().toLocaleTimeString(),"good");
  } catch(error) { status("syncStatus",error instanceof Error?error.message:"读取失败。","error"); }
  finally { el("refreshBtn").disabled=false; }
}
async function addNote() {
  const content=el("newContent").value.trim();
  if (!content) { status("syncStatus","先写一段合成测试内容。","error"); return; }
  const now=Date.now(), id="trustloop-" + crypto.randomUUID();
  const doc={id,title:content.slice(0,80),content,category:"other",status:"inbox",tags:["trustloop-synthetic"],pinned:false,notes:"",problem:"",targetUsers:"",productForm:"other",projectUrl:"",projectId:null,createdAt:now,updatedAt:now,deletedAt:null,categorySource:"manual"};
  el("addBtn").disabled=true;
  try {
    const result=await request("/sync/push",{method:"POST",body:{ops:[{entity:"idea",id,op:"upsert",doc}]}});
    if (!Array.isArray(result.results) || !result.results.some(x=>x.id===id && x.status==="applied")) throw new Error("服务器没有确认保存。");
    el("newContent").value=""; status("syncStatus","云端已确认保存。请在另一设备登录同一测试账号并刷新。","good"); await pull();
  } catch(error) { status("syncStatus",error instanceof Error?error.message:"保存失败。","error"); }
  finally { el("addBtn").disabled=false; }
}
el("loginBtn").addEventListener("click",()=>authenticate("login"));
el("registerBtn").addEventListener("click",()=>authenticate("register"));
el("refreshBtn").addEventListener("click",pull);
el("addBtn").addEventListener("click",addNote);
el("logoutBtn").addEventListener("click",async()=>{
 try { await request("/auth/logout",{method:"POST",body:{}}); leave("已退出当前 staging 会话。"); }
 catch(error) { status("syncStatus",error instanceof Error?error.message:"退出失败。","error"); }
});
</script>
</body>
</html>`;

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method !== "GET" && request.method !== "HEAD") return new Response("Method not allowed", {status:405,headers:securityHeaders()});
    if (url.pathname !== "/" && url.pathname !== "/index.html") return new Response("Not found", {status:404,headers:securityHeaders()});
    return new Response(request.method === "HEAD" ? null : HTML, {
      status:200,
      headers:{...securityHeaders(),"content-type":"text/html; charset=utf-8","cache-control":"no-store"}
    });
  }
};
function securityHeaders() {
  return {
    "x-content-type-options":"nosniff",
    "referrer-policy":"no-referrer",
    "permissions-policy":"camera=(), microphone=(), geolocation=()",
    "content-security-policy":"default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src https://nianbox-cloud-trustloop-staging.chenzhe223.workers.dev; form-action 'none'; base-uri 'none'; frame-ancestors 'none'",
    "x-frame-options":"DENY"
  };
}
