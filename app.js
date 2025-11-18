// ========= CẤU HÌNH =========

const OWNER_EMAIL = "phanthu27112002@gmail.com";
const EMAIL_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbzzPmgVCCMeoxVw926K-OazUrJjFAyKI6Qc-1WyV-GRk33e5npVR0xqHZmropgOECU/exec";
const ADMIN_KEY = "29090302";

const EVENT = {
  name: "Sinh nhật Phan Ánh Ngọc Thư",
  timeText: "Chưa chốt (chọn đi)",
  addressText: "Chưa chốt (từ từ đi mấy bé)"
};

const USERS = {
  "bethucute":  { pw: "29090302", role: "owner", name: "Chủ sở hữu" },
  "ethereal": { pw: "29092003", role: "guest", name: "Anh Quỳnh" },
  "yellowperson": { pw: "07102002", role: "guest", name: "Hồng Nhung" },
  "cogaitamlinh": { pw: "11102002", role: "guest", name: "Nguyễn Ngọc" },
  "dangthu": { pw: "15122003", role: "guest", name: "Đặng Thư" },
  "cholongnach": { pw: "02032002", role: "guest", name: "Linh Nhi" },
  "nguyenthu": { pw: "12062002", role: "guest", name: "Minh Thư" },
  "nhuy": { pw: "28012004", role: "guest", name: "Như Ý" },
  "baodepgai": { pw: "02052003", role: "guest", name: "Huỳnh Như" },
  "chidep": { pw: "08112001", role: "guest", name: "Tường Di" },
  "cotbao": { pw: "22122002", role: "guest", name: "Bùi Ngọc Tiến" },
  "xuanmai": { pw: "16062003", role: "guest", name: "Xuân Mai" },
  "tramkelly": { pw: "23032001", role: "guest", name: "Trâm Kelly" },
  "thuyhiencocuocgoikhac":{ pw: "18122002", role: "guest", name: "Thúy Hiền" },
  "lovisong2":{ pw: "22052000", role: "guest", name: "Như Ngọc" },
  "baisau": { pw: "07052002", role: "guest", name: "Thảo chó" },
  "chanhiu": { pw: "02072002", role: "guest", name: "Châu Anh" },
  "congai": { pw: "18092006", role: "guest", name: "Minh Thư" },
  "sapdautrunghi": { pw: "13072002", role: "guest", name: "Cát Tường" },
  "lemon": { pw: "21062002", role: "guest", name: "Mỹ Anh" },
  "giaquy": { pw: "26092002", role: "guest", name: "Gia Quý" }
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
  group: null,
  email: null
};

const $  = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

// ======== Nhạc nền (file tĩnh) ========
let musicInited = false;

// Gọi hàm này để phát 1 lần (đến hết bài, không lặp)
function playMusicOnce(){
  const audio = document.getElementById("bg-music");
  if (!audio) {
    console.warn("Không tìm thấy #bg-music");
    return;
  }
  if (musicInited) return; // chỉ play 1 lần

  musicInited = true;
  audio.currentTime = 0;
  audio.play().catch(err => {
    console.warn("Không phát được nhạc:", err);
    // nếu bị chặn, lần sau user tương tác lại vẫn cho thử
    musicInited = false;
  });
}

// ========= KHỞI TẠO =========

document.addEventListener("DOMContentLoaded", init);

function init(){
  const timeEl = $("#eventTime");
  const addrEl = $("#eventAddress");
  if(timeEl) timeEl.textContent = EVENT.timeText;
  if(addrEl) addrEl.textContent = EVENT.addressText;

  bindNav();
  bindLogin();
  bindHomeFlow();
  bindStats();
  bindLogout();

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
  $$("[data-nav]").forEach(btn=>{
    btn.addEventListener("click", (e)=>{
      const to = e.currentTarget.getAttribute("data-nav");
      if (e.currentTarget.classList.contains("nav-link") && e.currentTarget.disabled) {
        return;
      }
      showView(to);
    });
  });

  window.addEventListener("hashchange", ()=>{
    const hash = location.hash || "#login";
    showView(hash);
  });
}

function enableNav(){
  $$(".nav-link").forEach(b => b.disabled = false);

  document.querySelectorAll('[data-nav="#food"],[data-nav="#time"]').forEach(btn=>{
    btn.style.display = "none";
  });

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
  $$(".nav-link").forEach(b => { b.disabled = true; });
}

function showView(hash){
  $$(".view").forEach(v => v.classList.remove("show"));

  const id = hash.startsWith("#") ? hash.slice(1) : hash;

  if(id === "stats" && state.role !== "owner"){
    alert("Chỉ chủ sở hữu mới xem được Thống kê.");
    return showView("#home");
  }

  if ((id === "home" || id === "thanks") && !state.user){
    alert("Bạn cần đăng nhập trước.");
    return showView("#login");
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
  const form = $("#loginForm");
  if (!form) return;

  const passInput = $("#password");
  const toggleBtn = $("#togglePassword");
  if (passInput && toggleBtn){
    toggleBtn.addEventListener("click", ()=>{
      const isHidden = passInput.type === "password";
      passInput.type = isHidden ? "text" : "password";
      toggleBtn.textContent = isHidden ? "🙈" : "👁";
    });
  }

  form.addEventListener("submit", (e)=>{
    e.preventDefault();

    const username = $("#username")?.value?.trim() || "";
    const password = $("#password")?.value?.trim() || "";
    const msg = $("#loginMsg");

    const u = USERS[username];
    if (u && u.pw === password){
      state.user = username;
      state.role = u.role;
      state.displayName = u.name || username;

      const rememberEl = $("#rememberMe");
      if (rememberEl?.checked){
        localStorage.setItem("sessionUser", username);
      }

      if (msg) msg.textContent = "Đăng nhập thành công! Đang mở thiệp...";

      // 🔊 phát nhạc tại đây
      playMusicOnce();

      enableNav();
      showView("#home");
      setTimeout(launchWelcomeCard, 200);
    } else {
      if (msg) msg.textContent = "Sai tên đăng nhập hoặc mật khẩu.";
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

    $$("#loginForm input").forEach(i => i.value = "");
    $$("#details input[type=radio]").forEach(i => i.checked = false);
    if ($("#homeFreeDate"))  $("#homeFreeDate").value  = "";
    if ($("#homeFreeTime"))  $("#homeFreeTime").value  = "";
    if ($("#homeNotes"))     $("#homeNotes").value     = "";

    disableNavExceptLogin();
    showView("#login");
  });
}

// ========= HOME =========

function bindHomeFlow(){
  $("#seeMoreBtn")?.addEventListener("click", ()=>{
    $("#details")?.classList.remove("hidden");
    $("#details")?.scrollIntoView({behavior:"smooth", block:"start"});
  });

  $("#homeCompleteBtn")?.addEventListener("click", async ()=>{
    const msg = $("#submitMsg");
    if (msg) msg.textContent = "";

    try{
      ensureLogged();
    }catch(e){
      if (msg) msg.textContent = "Bạn cần đăng nhập trước.";
      showView("#login");
      return;
    }

    const rsvpInput = $$("#details input[name='rsvp']").find(i => i.checked);
    if(!rsvpInput){
      if (msg) msg.textContent = "Hãy chọn bạn có đi hay không nhé.";
      return;
    }
    const rsvpVal = rsvpInput.value;

    let foodInput = null;
    let groupInput = null;
    let timeInput = null;

    if (rsvpVal === "Đi") {
      foodInput = $$("#details input[name='foodHome']").find(i => i.checked);
      if(!foodInput){
        if (msg) msg.textContent = "Hãy chọn một quán ăn bạn thích.";
        return;
      }

      groupInput = $$("#details input[name='group']").find(i => i.checked);
      if(!groupInput){
        if (msg) msg.textContent = "Hãy chọn nhóm bạn muốn đi chung nhé.";
        return;
      }

      timeInput = $$("#details input[name='timeSlot']").find(i => i.checked);
      if(!timeInput){
        if (msg) msg.textContent = "T bận lắm, hãy chọn 1 trong 4 khung giờ nhé 😆.";
        return;
      }
    }

    const email = $("#homeEmail")?.value?.trim() || "";
    if(!email){
      if (msg) msg.textContent = "Hãy nhập Gmail để mình gửi thiệp cho bạn.";
      return;
    }

    const notes = ($("#homeNotes")?.value || "").trim();

    state.rsvp     = rsvpVal;
    state.food     = foodInput ? foodInput.value : null;
    state.group    = groupInput ? groupInput.value : null;
    state.freeDate = null;
    state.freeTime = timeInput ? timeInput.value : null;
    state.email    = email;
    state.notes    = notes || null;

    if(!EMAIL_WEBAPP_URL || EMAIL_WEBAPP_URL.startsWith("PASTE_")){
      if (msg) msg.textContent = "Chưa cấu hình Web App – không thể lưu.";
      return;
    }

    if (msg) msg.textContent = "Đang lưu thông tin...";

    try{
      await sendAll();
      if (msg) msg.textContent = "Đã lưu! Cảm ơn bạn 💖";
      try{ window.confetti && window.confetti({particleCount:120, spread:80}); }catch(e){}
      setTimeout(()=> showView("#thanks"), 700);
    }catch(err){
      console.error(err);
      if (msg) msg.textContent = "Lưu chưa thành công, bạn thử lại nhé.";
    }
  });
}

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

// ========= THỐNG KÊ =========

function bindStats(){
  $("#reloadStatsBtn")?.addEventListener("click", loadStats);
  $("#sendGroupCap3")?.addEventListener("click", () => sendGroupInvites("cap3"));
  $("#sendGroupNhau")?.addEventListener("click", () => sendGroupInvites("nhau"));
  $("#sendGroupRieng")?.addEventListener("click", () => sendGroupInvites("rieng"));
}

async function sendGroupInvites(group){
  alert("(demo) Gửi lời mời cho nhóm: " + group + "\nTính năng này chưa được triển khai server-side.");
}

async function loadStats(){
  const msg = $("#statsMsg");

  if(!EMAIL_WEBAPP_URL || EMAIL_WEBAPP_URL.startsWith("PASTE_")){
    if (msg) msg.textContent = "Chưa cấu hình EMAIL_WEBAPP_URL.";
    return;
  }

  if (msg) msg.textContent = "Đang tải thống kê...";

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

      const totalEl = $("#statTotal");
      const yesEl   = $("#statYes");
      const noEl    = $("#statNo");
      const maybeEl = $("#statMaybe");

      if (totalEl) totalEl.textContent = data.summary?.total ?? 0;
      if (yesEl)   yesEl.textContent   = data.summary?.rsvp?.["Đi"] ?? 0;
      if (noEl)    noEl.textContent    = data.summary?.rsvp?.["Không đi"] ?? 0;
      if (maybeEl) maybeEl.textContent = data.summary?.rsvp?.["Chưa chắc"] ?? 0;

      const tb = $("#statsTable tbody");
      if (!tb){
        if (msg) msg.textContent = "Thiếu bảng thống kê trong HTML.";
        return;
      }
      tb.innerHTML = "";
      (data.rows || []).forEach(r=>{
        let slot = "";
        if (r.freeTime && r.freeDate) {
          slot = r.freeDate + " – " + r.freeTime;
        } else if (r.freeTime) {
          slot = r.freeTime;
        } else if (r.freeDate) {
          slot = r.freeDate;
        }

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${escapeHtml(r.displayName || r.username || "")}</td>
          <td>${escapeHtml(r.rsvp || "")}</td>
          <td>${escapeHtml(r.food || "")}</td>
          <td>${escapeHtml(r.group || "")}</td>
          <td>${escapeHtml(slot)}</td>
          <td>${escapeHtml(r.email || "")}</td>
          <td>${escapeHtml(r.notes || "")}</td>
          <td>${escapeHtml(r.updatedAt || "")}</td>
          <td><button type="button" class="btn btn-secondary btn-delete">Xóa</button></td>`;
        tb.appendChild(tr);

        const btn = tr.querySelector(".btn-delete");
        if (btn) {
          btn.addEventListener("click", () => {
            deleteRsvp(r.username);
          });
        }
      });

      if (msg) msg.textContent = "";
    }catch(err){
      console.error(err);
      if (msg) msg.textContent = "Không tải được thống kê. Kiểm tra Apps Script & ADMIN_KEY.";
    }finally{
      cleanup();
    }
  };

  s.onerror = function(){
    if (msg) msg.textContent = "Không tải được thống kê (lỗi mạng).";
    cleanup();
  };

  document.body.appendChild(s);

  function cleanup(){
    try{ delete window[cb]; }catch(e){}
    try{ s.remove(); }catch(e){}
  }
}

// XÓA DỮ LIỆU MỘT TÀI KHOẢN (CHỈ CHỦ SỞ HỮU)
async function deleteRsvp(username){
  const msg = $("#statsMsg");
  if (msg) msg.textContent = "";

  if (!EMAIL_WEBAPP_URL || EMAIL_WEBAPP_URL.startsWith("PASTE_")){
    if (msg) msg.textContent = "Chưa cấu hình EMAIL_WEBAPP_URL.";
    return;
  }

  if (state.role !== "owner"){
    alert("Chỉ chủ sở hữu mới được xóa dữ liệu.");
    return;
  }

  if (!username){
    alert("Không xác định được tài khoản để xóa.");
    return;
  }

  if (!confirm("Bạn chắc chắn muốn xóa dữ liệu của tài khoản '" + username + "'?")){
    return;
  }

  if (msg) msg.textContent = "Đang xóa dữ liệu của " + username + "...";

  const cb  = "__del_cb_" + Math.random().toString(36).slice(2);
  const url = EMAIL_WEBAPP_URL
    + "?action=delete"
    + "&adminKey=" + encodeURIComponent(ADMIN_KEY)
    + "&username=" + encodeURIComponent(username)
    + "&callback=" + cb;

  const s = document.createElement("script");
  s.src = url;
  s.async = true;

  window[cb] = function(data){
    try{
      if (!data || !data.ok){
        throw new Error(data && data.error || "delete_failed");
      }
      if (msg) msg.textContent = "Đã xóa " + (data.username || username)
        + " (" + (data.deleted || 1) + " dòng).";
      // tải lại bảng sau khi xóa
      loadStats();
    }catch(err){
      console.error(err);
      if (msg) msg.textContent = "Không xóa được (lỗi: " + err.message + ").";
    }finally{
      cleanup();
    }
  };

  s.onerror = function(){
    if (msg) msg.textContent = "Không xóa được (lỗi mạng).";
    cleanup();
  };

  document.body.appendChild(s);

  function cleanup(){
    try{ delete window[cb]; }catch(e){}
    try{ s.remove(); }catch(e){}
  }
}

// ========= GỬI DỮ LIỆU =========

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

async function sendPartial(type){
  if(!EMAIL_WEBAPP_URL || EMAIL_WEBAPP_URL.startsWith("PASTE_")) return;

  const data = payloadBase();
  data.type = type;
  data.rsvp = state.rsvp;
  data.food = state.food;
  data.freeDate = state.freeDate;
  data.freeTime = state.freeTime;
  data.notes = state.notes;
  data.group = state.group;
  data.email = state.email;

  try{
    await fetch(EMAIL_WEBAPP_URL, {
      method: "POST",
      mode: "no-cors",
      headers: {"Content-Type": "text/plain"},
      body: JSON.stringify(data)
    });
  }catch(err){
    console.warn("sendPartial error (ignored):", err);
  }
}

async function sendAll(){
  if(!EMAIL_WEBAPP_URL || EMAIL_WEBAPP_URL.startsWith("PASTE_")) return;

  const data = payloadBase();
  data.type = "final";
  data.rsvp = state.rsvp;
  data.food = state.food;
  data.freeDate = state.freeDate;
  data.freeTime = state.freeTime;
  data.notes = state.notes;
  data.group = state.group;
  data.email = state.email;

  try{
    await fetch(EMAIL_WEBAPP_URL, {
      method: "POST",
      mode: "no-cors",
      headers: {"Content-Type": "text/plain"},
      body: JSON.stringify(data)
    });
  }catch(err){
    console.warn("sendAll error (ignored):", err);
  }
}

// ========= TIỆN ÍCH =========

function escapeHtml(s){
  return String(s || "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"
  }[c]));
}
