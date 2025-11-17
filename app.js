// ====== Cấu hình ======
const OWNER_EMAIL = "phanthu27112002@gmail.com";

// Dán URL Web App của Apps Script (bước 4)
const EMAIL_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbws_1ip_rdyj5tq1EYWqiLngTDivE6hxx4c6XPP4XLunbjT9I3cRKwnDxmyxAH2pvmD/exec";

// Khóa quản trị để xem thống kê (đặt giống trong Apps Script)
const ADMIN_KEY = "29090302";

// Sự kiện (đã đổi theo yêu cầu)
const EVENT = {
  name: "Sinh nhật Phan Ánh Ngọc Thư",
  timeText: "Dự kiến 28/11/2025",
  addressText: "Chưa chốt (từ từ đi mấy bé)"
};

// ====== Tài khoản hard-code (cho 1 sự kiện) ======
// role: owner -> có quyền xem Thống kê; guest -> khách
const USERS = {
  "bethucute":  { pw: "290903", role: "owner", name: "Chủ sở hữu" },
  "khach1": { pw: "1234", role: "guest", name: "Khách 1" },
  "khach2": { pw: "5678", role: "guest", name: "Khách 2" }
};

// ====== State ======
const state = {
  user: null,
  role: null,
  displayName: null,
  rsvp: null,
  food: null,
  freeDate: null,
  freeTime: null,
  notes: null
};

const $  = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

document.addEventListener("DOMContentLoaded", init);

function init(){
  // Gắn thông tin sự kiện
  $("#eventTime").textContent = EVENT.timeText;
  $("#eventAddress").textContent = EVENT.addressText;

  bindNav();
  bindLogin();
  bindHomeFlow();
  bindFoodForm();
  bindTimeForm();
  bindStats();
  bindLogout();

  // Tự đăng nhập nếu có
  const saved = localStorage.getItem("sessionUser");
  if(saved && USERS[saved]){
    state.user = saved;
    state.role = USERS[saved].role;
    state.displayName = USERS[saved].name || saved;
    enableNav();
    showView("#home");
    setTimeout(launchWelcomeCard, 200);
  }else{
    showView("#login");
  }
}

// ====== Router + Nav ======
function bindNav(){
  $$(".nav-link[data-nav]").forEach(btn=>{
    btn.addEventListener("click", (e)=>{
      const to = e.currentTarget.getAttribute("data-nav");
      if(!e.currentTarget.disabled) showView(to);
    });
  });
  window.addEventListener("hashchange", ()=>{
    const hash = location.hash || "#login";
    showView(hash);
  });
}
function enableNav(){
  $$(".nav-link").forEach(b => b.disabled = false);
  // Chỉ owner mới thấy Thống kê
  const statsNav = $("#statsNav");
  if(state.role === "owner"){
    statsNav.disabled = false;
    statsNav.style.display = "inline-flex";
  }else{
    statsNav.disabled = true;
    statsNav.style.display = "none";
  }
}
function disableNavExceptLogin(){
  $$(".nav-link").forEach(b => { b.disabled = true; if(b.id === "logoutBtn") b.disabled = true; });
}
function showView(hash){
  $$(".view").forEach(v => v.classList.remove("show"));
  const id = hash.startsWith("#") ? hash.slice(1) : hash;
  // Chặn vào #stats nếu không phải owner
  if(id === "stats" && state.role !== "owner"){
    alert("Chỉ chủ sở hữu mới xem được Thống kê.");
    return showView("#home");
  }
  const el = document.getElementById(id);
  if(el){
    el.classList.add("show");
    if(location.hash !== hash) location.hash = hash;
    if(id === "stats") loadStats();
  }
}

// ====== Đăng nhập ======
function bindLogin(){
  $("#loginForm").addEventListener("submit", (e)=>{
    e.preventDefault();
    const username = $("#username").value.trim();
    const password = $("#password").value;
    const msg = $("#loginMsg");

    const user = USERS[username];
    if(user && user.pw === password){
      state.user = username;
      state.role = user.role;
      state.displayName = user.name || username;
      if($("#rememberMe").checked) localStorage.setItem("sessionUser", username);
      msg.textContent = "Đăng nhập thành công! Đang mở thiệp...";
      enableNav();
      showView("#home");
      setTimeout(launchWelcomeCard, 200);
    }else{
      msg.textContent = "Sai tên đăng nhập hoặc mật khẩu.";
    }
  });
}
function bindLogout(){
  $("#logoutBtn").addEventListener("click", ()=>{
    state.user = null; state.role = null; state.displayName = null;
    localStorage.removeItem("sessionUser");
    state.rsvp = state.food = state.freeDate = state.freeTime = state.notes = null;
    $$("#loginForm input").forEach(i=>i.value="");
    $$("#foodForm input[type=radio]").forEach(i=>i.checked=false);
    $$("#timeForm input, #timeForm textarea").forEach(i=>i.value="");
    $$("#details input[name=rsvp]").forEach(i=>i.checked=false);
    $("#finalizeSection") && $("#finalizeSection").classList.add("hidden");
    disableNavExceptLogin();
    showView("#login");
  });
}

// ====== Home (thiệp & chi tiết) ======
function bindHomeFlow(){
  $("#seeMoreBtn").addEventListener("click", ()=>{
    $("#details").classList.remove("hidden");
    $("#details").scrollIntoView({behavior:"smooth", block:"start"});
  });

  // Lưu RSVP -> chuyển qua chọn quán
  $("#saveRsvpBtn").addEventListener("click", onSaveRsvp);
}
async function onSaveRsvp(){
  ensureLogged();
  const selected = $$("#details input[name=rsvp]").find(i=>i.checked);
  const msg = $("#submitMsg");
  if(!selected){ msg.textContent = "Hãy chọn bạn có đi hay không nhé."; return; }
  state.rsvp = selected.value;
  msg.textContent = "Đang lưu...";
  try{
    await sendPartial("rsvp");
    msg.textContent = "Đã lưu! Chuyển tới lựa chọn quán ăn...";
    setTimeout(()=> showView("#food"), 450);
  }catch(err){
    console.error(err); msg.textContent = "Lưu chưa thành công, bạn thử lại nhé.";
  }
}

function launchWelcomeCard(){
  try{
    if(window.confetti){
      const duration = 1200; const end = Date.now() + duration;
      (function frame(){ confetti({ particleCount: 4, spread: 70, origin: { y: 0.6 }});
        if(Date.now() < end) requestAnimationFrame(frame);
      })();
    }
  }catch(e){}
  animateTypeLine("#cardLine1", 24);
  setTimeout(()=>animateTypeLine("#cardLine2", 24), 600);
}
function animateTypeLine(sel, speed=22){
  const el = $(sel); if(!el) return;
  const text = el.textContent; el.textContent = "";
  let i=0; const timer = setInterval(()=>{ el.textContent += text.charAt(i++); if(i>=text.length) clearInterval(timer); }, speed);
}

// ====== Lựa chọn quán ăn ======
function bindFoodForm(){
  $("#foodForm").addEventListener("submit", async (e)=>{
    e.preventDefault();
    ensureLogged();
    const choice = $("#foodForm input[name=food]:checked");
    const msg = $("#foodMsg");
    if(!choice){ msg.textContent = "Hãy chọn một tuỳ chọn trước."; return; }
    state.food = choice.value;
    msg.textContent = "Đang lưu...";
    try{
      await sendPartial("food");
      msg.textContent = "Đã lưu! Chuyển tới lựa chọn thời gian...";
      setTimeout(()=> showView("#time"), 450);
    }catch(err){
      console.error(err); msg.textContent = "Lưu chưa thành công, bạn thử lại nhé.";
    }
  });
}

// ====== Lựa chọn thời gian ======
function bindTimeForm(){
  $("#timeForm").addEventListener("submit", async (e)=>{
    e.preventDefault();
    ensureLogged();
    const d = $("#freeDate").value;
    const t = $("#freeTime").value;
    const notes = $("#notes").value.trim();
    const msg = $("#timeMsg");
    if(!d || !t){ msg.textContent = "Hãy chọn đầy đủ ngày và giờ."; return; }
    state.freeDate = d; state.freeTime = t; state.notes = notes || null;
    msg.textContent = "Đang lưu...";
    try{
      await sendPartial("time");
      msg.textContent = "Đã lưu! Bạn có thể bấm Hoàn thành.";
      $("#finalizeSection").classList.remove("hidden");
      $("#finalizeSection").scrollIntoView({behavior:"smooth", block:"center"});
    }catch(err){
      console.error(err); msg.textContent = "Lưu chưa thành công, bạn thử lại nhé.";
    }
  });

  $("#finalizeBtn")?.addEventListener("click", onComplete);
}

// ====== Hoàn thành ======
async function onComplete(){
  ensureLogged();
  const msg = $("#finalizeMsg"); msg.textContent = "Đang gửi tổng hợp...";
  try{
    await sendAll();
    msg.textContent = "Đã gửi! Cảm ơn bạn.";
    try{ window.confetti && window.confetti({particleCount:120, spread:80}); }catch(e){}
    setTimeout(()=> showView("#thanks"), 500);
  }catch(err){
    console.error(err); msg.textContent = "Không gửi được thông tin. Bạn hãy thử lại sau.";
  }
}

// ====== Thống kê (owner only) ======
function bindStats(){
  $("#reloadStatsBtn").addEventListener("click", loadStats);
}
async function loadStats(){
  if(!EMAIL_WEBAPP_URL || EMAIL_WEBAPP_URL.startsWith("PASTE_")){
    $("#statsMsg").textContent = "Chưa cấu hình EMAIL_WEBAPP_URL (Apps Script).";
    return;
  }
  const msg = $("#statsMsg"); msg.textContent = "Đang tải thống kê...";
  try{
    const res = await fetch(EMAIL_WEBAPP_URL, {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ action:"stats", adminKey: ADMIN_KEY })
    });
    const data = await res.json();
    if(!data.ok) throw new Error(data.error || "stats_failed");

    $("#statTotal").textContent = data.summary?.total ?? 0;
    $("#statYes").textContent   = data.summary?.rsvp?.["Đi"] ?? 0;
    $("#statNo").textContent    = data.summary?.rsvp?.["Không đi"] ?? 0;
    $("#statMaybe").textContent = data.summary?.rsvp?.["Chưa chắc"] ?? 0;

    const tb = $("#statsTable tbody"); tb.innerHTML = "";
    (data.rows || []).forEach(r=>{
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(r.displayName || r.username || "")}</td>
        <td>${escapeHtml(r.rsvp || "")}</td>
        <td>${escapeHtml(r.food || "")}</td>
        <td>${escapeHtml(r.freeDate || "")}</td>
        <td>${escapeHtml(r.freeTime || "")}</td>
        <td>${escapeHtml(r.notes || "")}</td>
        <td>${escapeHtml(r.updatedAt || "")}</td>`;
      tb.appendChild(tr);
    });
    msg.textContent = "";
  }catch(err){
    console.error(err); msg.textContent = "Không tải được thống kê. Kiểm tra Apps Script & ADMIN_KEY.";
  }
}

// ====== Gửi dữ liệu tới Apps Script ======
function ensureLogged(){ if(!state.user) throw new Error("Chưa đăng nhập"); }
function payloadBase(){
  return {
    to: OWNER_EMAIL,
    eventName: EVENT.name,
    username: state.user,
    displayName: state.displayName,
    timestamp: new Date().toISOString()
  };
}
async function sendPartial(type){
  if(!EMAIL_WEBAPP_URL || EMAIL_WEBAPP_URL.startsWith("PASTE_")) return; // demo offline
  const data = payloadBase();
  data.type = type;
  data.rsvp = state.rsvp;
  data.food = state.food;
  data.freeDate = state.freeDate;
  data.freeTime = state.freeTime;
  data.notes = state.notes;
  await fetch(EMAIL_WEBAPP_URL, {
    method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(data)
  }).then(r=>r.json());
}
async function sendAll(){
  if(!EMAIL_WEBAPP_URL || EMAIL_WEBAPP_URL.startsWith("PASTE_")) return; // demo offline
  const data = payloadBase();
  data.type = "final";
  data.rsvp = state.rsvp;
  data.food = state.food;
  data.freeDate = state.freeDate;
  data.freeTime = state.freeTime;
  data.notes = state.notes;
  const res = await fetch(EMAIL_WEBAPP_URL, {
    method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(data)
  });
  if(!res.ok) throw new Error("Email API error");
  await res.json();
}

// ====== Utils ======
function escapeHtml(s){
  return String(s||"").replace(/[&<>"']/g, (c)=>({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;" }[c]));
}
