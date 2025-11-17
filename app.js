// ========= CẤU HÌNH =========

// Email nhận thông tin RSVP
const OWNER_EMAIL = "phanthu27112002@gmail.com";

// DÁN URL Web App của Google Apps Script vào đây (dạng .../exec)
const EMAIL_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbxwGGVPIQ05DjcW-KGpX-Gb4OH53RZLbf1YeQ7ks2wtScnZS7rMoY0wcnhKws51fA_C/exec";

// Chuỗi bí mật phải trùng với ADMIN_KEY trong Apps Script
const ADMIN_KEY = "29090302";

// Thông tin sự kiện
const EVENT = {
  name: "Sinh nhật Phan Ánh Ngọc Thư",
  timeText: "Dự kiến 28/11/2025",
  addressText: "Chưa chốt (từ từ đi mấy bé)"
};

// Tài khoản dùng cho 1 sự kiện (không cần bảo mật cao)
// role: "owner" => xem được Thống kê, "guest" => khách bình thường
const USERS = {
  "bethucute":  { pw: "29090302", role: "owner", name: "Chủ sở hữu" },
  "ethreal": { pw: "29092003",     role: "guest", name: "Anh Quỳnh" },
  "yellowperson": { pw: "07102002",     role: "guest", name: "Hồng Nhung" },
  "cogaitamlinh": { pw: "11102002",     role: "guest", name: "Nguyễn Ngọc" },
  "dangthu": { pw: "15122003",     role: "guest", name: "Đặng Thư" },
  "cholongnach": { pw: "02032002",     role: "guest", name: "Linh Nhi" },
  "nguyenthu": { pw: "12062002",     role: "guest", name: "Minh Thư" },
  "nhuy": { pw: "29012004",     role: "guest", name: "Như Ý" },
  "baodepgai": { pw: "02052003",     role: "guest", name: "Huỳnh Như" },
  "chidep": { pw: "08112001",     role: "guest", name: "Tường Di" },
  "cotbao": { pw: "22122002",     role: "guest", name: "Bùi Ngọc Tiến" },
  "xuanmai": { pw: "16062003",     role: "guest", name: "Xuân Mai" },
  "tramkelly": { pw: "23032001",     role: "guest", name: "Trâm Kelly" },
  "thuyhiencocuocgoikhac":{ pw: "23032001", role: "guest", name: "Thúy Hiền" },
  "lovisong2":{ pw: "22052000", role: "guest", name: "Như Ngọc" },
 "baisau": { pw: "07052002",     role: "guest", name: "Thảo chó" },
};

// ========= STATE =========

const state = {
  user: null,
  role: null,
  displayName: null,
  rsvp: null,
  food: null,
  freeDate: null,
  freeTime: null,
  notes: null,
  group: null,   // 👈 thêm
  email: null
};

const $  = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

// ========= KHỞI TẠO =========

document.addEventListener("DOMContentLoaded", init);

function init(){
  // Set thông tin event ra UI
  const timeEl = $("#eventTime");
  const addrEl = $("#eventAddress");
  if(timeEl) timeEl.textContent = EVENT.timeText;
  if(addrEl) addrEl.textContent = EVENT.addressText;

  bindNav();
  bindLogin();
  bindHomeFlow();
  bindStats();
  bindLogout();

  // Tự đăng nhập nếu còn session
  const saved = localStorage.getItem("sessionUser");
  if(saved && USERS[saved]){
    const user = USERS[saved];
    state.user = saved;
    state.role = user.role;
    state.displayName = user.name || saved;
    enableNav();
    showView("#home");
    setTimeout(launchWelcomeCard, 200);
  }else{
    showView("#login");
  }
}

// ========= NAVIGATION =========

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

  // Ẩn nav "Lựa chọn quán ăn" & "Lựa chọn thời gian" vì đã gom vào Home
  document.querySelectorAll('[data-nav="#food"],[data-nav="#time"]').forEach(btn=>{
    btn.style.display = "none";
  });

  // Chỉ owner mới thấy Thống kê
  const statsNav = $("#statsNav");
  if(statsNav){
    if(state.role === "owner"){
      statsNav.disabled = false;
      statsNav.style.display = "inline-flex";
    }else{
      statsNav.disabled = true;
      statsNav.style.display = "none";
    }
  }
}

function disableNavExceptLogin(){
  $$(".nav-link").forEach(b => {
    b.disabled = true;
  });
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

    if(id === "stats"){
      loadStats();
    }
  }
}

// ========= ĐĂNG NHẬP / ĐĂNG XUẤT =========

function bindLogin(){
  $("#loginForm")?.addEventListener("submit", (e)=>{
    e.preventDefault();
    const username = $("#username").value.trim();
    const password = $("#password").value;
    const msg = $("#loginMsg");

    const u = USERS[username];
    if(u && u.pw === password){
      state.user = username;
      state.role = u.role;
      state.displayName = u.name || username;
      if($("#rememberMe").checked){
        localStorage.setItem("sessionUser", username);
      }
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
  $("#logoutBtn")?.addEventListener("click", ()=>{
    state.user = null;
    state.role = null;
    state.displayName = null;
    state.rsvp = state.food = state.freeDate = state.freeTime = state.notes = null;

    localStorage.removeItem("sessionUser");

    $$("#loginForm input").forEach(i=>i.value="");
    $$("#details input[type=radio]").forEach(i=>i.checked=false);
    $("#homeFreeDate") && ( $("#homeFreeDate").value = "" );
    $("#homeFreeTime") && ( $("#homeFreeTime").value = "" );
    $("#homeNotes") && ( $("#homeNotes").value = "" );

    disableNavExceptLogin();
    showView("#login");
  });
}

// ========= HOME: THIỆP & FORM TỔNG =========

function bindHomeFlow(){
  // Hiện card details
  $("#seeMoreBtn")?.addEventListener("click", ()=>{
    $("#details")?.classList.remove("hidden");
    $("#details")?.scrollIntoView({behavior:"smooth", block:"start"});
  });

  // Nút Hoàn thành – gom tất cả lựa chọn
  $("#homeCompleteBtn")?.addEventListener("click", async ()=>{
    ensureLogged();
    const msg = $("#submitMsg");
    msg.textContent = "";

    // 1. RSVP
    const rsvpInput = $$("#details input[name='rsvp']").find(i => i.checked);
    if(!rsvpInput){
      msg.textContent = "Hãy chọn bạn có đi hay không nhé.";
      return;
    }
    const rsvpVal = rsvpInput.value;

    // 2. Quán ăn (chỉ bắt buộc nếu Đi)
    let foodInput = null;
    if (rsvpVal === "Đi") {
      foodInput = $$("#details input[name='foodHome']").find(i => i.checked);
      if(!foodInput){
        msg.textContent = "Hãy chọn một quán ăn bạn thích.";
        return;
      }
    }

    // 2.5 Nhóm (chỉ bắt buộc nếu Đi)
    let groupInput = null;
    if (rsvpVal === "Đi") {
      groupInput = $$("#details input[name='group']").find(i => i.checked);
      if(!groupInput){
        msg.textContent = "Hãy chọn nhóm bạn muốn đi chung nhé.";
        return;
      }
    }

    // 3. Khung giờ (chỉ bắt buộc nếu Đi)
    let timeInput = null;
    if (rsvpVal === "Đi") {
      timeInput = $$("#details input[name='timeSlot']").find(i => i.checked);
      if(!timeInput){
        msg.textContent = "T bận lắm, hãy chọn 1 trong 4 khung giờ nhé 😆.";
        return;
      }
    }

    // 3.5 Gmail (luôn yêu cầu)
    const email = $("#homeEmail")?.value.trim();
    if(!email){
      msg.textContent = "Hãy nhập Gmail để mình gửi thiệp cho bạn.";
      return;
    }

    // 4. Ghi chú
    const notes = ($("#homeNotes")?.value || "").trim();

    // Gán vào state
    state.rsvp     = rsvpVal;
    state.food     = foodInput ? foodInput.value : null;
    state.group    = groupInput ? groupInput.value : null;
    // Lưu nguyên chuỗi khung giờ vào freeTime, freeDate để trống
    state.freeDate = null;
    state.freeTime = timeInput ? timeInput.value : null;
    state.email    = email;
    state.notes    = notes || null;

    msg.textContent = "Đang lưu thông tin...";

    try{
      await sendAll();
      msg.textContent = "Đã lưu! Cảm ơn bạn 💖";
      try{ window.confetti && window.confetti({particleCount:120, spread:80}); }catch(e){}
      setTimeout(()=> showView("#thanks"), 700);
    }catch(err){
      console.error(err);
      msg.textContent = "Lưu chưa thành công, bạn thử lại nhé.";
    }
  });
}


// Confetti + chữ gõ
function launchWelcomeCard(){
  try{
    if(window.confetti){
      const duration = 1200;
      const end = Date.now() + duration;
      (function frame(){
        window.confetti({ particleCount: 4, spread: 70, origin: { y: 0.6 }});
        if(Date.now() < end) requestAnimationFrame(frame);
      })();
    }
  }catch(e){}

  animateTypeLine("#cardLine1", 24);
  setTimeout(()=>animateTypeLine("#cardLine2", 24), 600);
}

function animateTypeLine(sel, speed=22){
  const el = $(sel);
  if(!el) return;
  const text = el.textContent;
  el.textContent = "";
  let i = 0;
  const timer = setInterval(()=>{
    el.textContent += text.charAt(i++);
    if(i >= text.length) clearInterval(timer);
  }, speed);
}

// ========= THỐNG KÊ (OWNER) =========
function bindStats(){
  $("#reloadStatsBtn")?.addEventListener("click", loadStats);

  $("#sendGroupCap3")?.addEventListener("click", () => sendGroupInvites("cap3"));
  $("#sendGroupNhau")?.addEventListener("click", () => sendGroupInvites("nhau"));
  $("#sendGroupRieng")?.addEventListener("click", () => sendGroupInvites("rieng"));
}

async function loadStats(){
  const msg = $("#statsMsg");

  if(!EMAIL_WEBAPP_URL || EMAIL_WEBAPP_URL.startsWith("PASTE_")){
    msg.textContent = "Chưa cấu hình EMAIL_WEBAPP_URL.";
    return;
  }

  msg.textContent = "Đang tải thống kê...";

  // JSONP callback
  const cb = "__stats_cb_" + Math.random().toString(36).slice(2);
  const url = EMAIL_WEBAPP_URL
    + "?action=stats"
    + "&adminKey=" + encodeURIComponent(ADMIN_KEY)
    + "&callback=" + cb;

  const s = document.createElement("script");
  s.src = url;
  s.async = true;

  window[cb] = function(data){
    try{
      if(!data || !data.ok){
        throw new Error(data && data.error || "stats_failed");
      }

      // tổng số
      $("#statTotal").textContent = data.summary?.total ?? 0;
      $("#statYes").textContent   = data.summary?.rsvp?.["Đi"] ?? 0;
      $("#statNo").textContent    = data.summary?.rsvp?.["Không đi"] ?? 0;
      $("#statMaybe").textContent = data.summary?.rsvp?.["Chưa chắc"] ?? 0;

      const tb = $("#statsTable tbody");
      tb.innerHTML = "";
      (data.rows || []).forEach(r=>{
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${escapeHtml(r.displayName || r.username || "")}</td>
          <td>${escapeHtml(r.rsvp || "")}</td>
          <td>${escapeHtml(r.food || "")}</td>
          <td>${escapeHtml(r.group || "")}</td>      <!-- Nhóm -->
          <td>${escapeHtml(r.freeDate || "")}</td>
          <td>${escapeHtml(r.freeTime || "")}</td>
          <td>${escapeHtml(r.email || "")}</td>      <!-- Gmail -->
          <td>${escapeHtml(r.notes || "")}</td>
          <td>${escapeHtml(r.updatedAt || "")}</td>`;
        tb.appendChild(tr);
      });

      msg.textContent = "";
    }catch(err){
      console.error(err);
      msg.textContent = "Không tải được thống kê. Kiểm tra Apps Script & ADMIN_KEY.";
    }finally{
      cleanup();
    }
  };

  s.onerror = function(){
    msg.textContent = "Không tải được thống kê (lỗi mạng).";
    cleanup();
  };

  document.body.appendChild(s);

  function cleanup(){
    try{ delete window[cb]; }catch(e){}
    try{ s.remove(); }catch(e){}
  }
}


// ========= GỬI DỮ LIỆU LÊN APPS SCRIPT =========

function ensureLogged(){
  if(!state.user){
    throw new Error("Chưa đăng nhập");
  }
}

function payloadBase(){
  return {
    to: OWNER_EMAIL,
    eventName: EVENT.name,
    username: state.user,
    displayName: state.displayName,
    timestamp: new Date().toISOString()
  };
}

// Gửi tạm từng phần (hiện tại không còn dùng nhiều, nhưng giữ cho tương thích)
async function sendPartial(type){
  if(!EMAIL_WEBAPP_URL || EMAIL_WEBAPP_URL.startsWith("PASTE_")) return;

  const data = payloadBase();
  data.type = type;
  data.rsvp = state.rsvp;
  data.food = state.food;
  data.freeDate = state.freeDate;
  data.freeTime = state.freeTime;
  data.notes = state.notes;
  data.group = state.group;   // 👈
  data.email = state.email;

  try{
    await fetch(EMAIL_WEBAPP_URL, {
      method: "POST",
      mode: "no-cors",
      headers: {"Content-Type": "text/plain;charset=utf-8"},
      body: JSON.stringify(data)
    });
  }catch(err){
    console.warn("sendPartial error (ignored):", err);
  }
}

// Gửi bản tổng cuối cùng
async function sendAll(){
  if(!EMAIL_WEBAPP_URL || EMAIL_WEBAPP_URL.startsWith("PASTE_")) return;

  const data = payloadBase();
  data.type = "final";
  data.rsvp = state.rsvp;
  data.food = state.food;
  data.freeDate = state.freeDate;
  data.freeTime = state.freeTime;
  data.notes = state.notes;
  data.group = state.group;   // 👈
  data.email = state.email; 

  try{
    await fetch(EMAIL_WEBAPP_URL, {
      method: "POST",
      mode: "no-cors",
      headers: {"Content-Type": "text/plain;charset=utf-8"},
      body: JSON.stringify(data)
    });
  }catch(err){
    console.warn("sendAll error (ignored):", err);
    // vẫn cho flow tiếp tục, user không bị kẹt
  }
}

// ========= TIỆN ÍCH =========

function escapeHtml(s){
  return String(s || "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"
  }[c]));
}
