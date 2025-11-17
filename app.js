// ====== Cấu hình sự kiện & email ======
const OWNER_EMAIL = "phanthu27112002@gmail.com";

// Thay bằng URL Web App của Google Apps Script (bạn triển khai ở bước 4)
const EMAIL_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbyVnA6kslty5yETC62mOvJd8puc2F3EHZav6FCjZlgL8B-_ropc-H_yciS6sbRNZgay/exec";

// Thông tin sự kiện - sửa lại cho đúng lịch & địa điểm thực tế
const EVENT = {
  name: "Sinh nhật Phan Ánh Ngọc Thư",
  timeText: "19:00, 27/11/2025",
  addressText: "Nhà hàng ABC, 123 Đường XYZ, Quận 1, TP.HCM"
};

// Tài khoản demo (để test). DÙNG THẬT: hãy chuyển sang “mã mời” hoặc xác thực qua Apps Script.
const ALLOWED_USERS = {
  "khach1": "1234",
  "khach2": "5678"
};

// ====== State ======
const state = {
  user: null,
  rsvp: null,
  food: null,
  freeDate: null,
  freeTime: null,
  notes: null
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

document.addEventListener("DOMContentLoaded", init);

function init(){
  // Khởi tạo nội dung sự kiện
  $("#eventTime").textContent = EVENT.timeText;
  $("#eventAddress").textContent = EVENT.addressText;

  bindNav();
  bindLogin();
  bindHomeFlow();
  bindFoodForm();
  bindTimeForm();
  bindLogout();

  // Tự đăng nhập nếu nhớ phiên
  const savedUser = localStorage.getItem("sessionUser");
  if(savedUser){
    state.user = savedUser;
    enableNav();
    showView("#home");
    launchWelcomeCard();
  } else {
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
}

function showView(hash){
  // Ẩn tất cả view
  $$(".view").forEach(v => v.classList.remove("show"));
  // Lấy id từ hash
  const id = hash.startsWith("#") ? hash.slice(1) : hash;
  const el = document.getElementById(id);
  if(el){
    el.classList.add("show");
    // Đồng bộ hash cho UX
    if(location.hash !== hash) location.hash = hash;
  }
}

// ====== Đăng nhập ======
function bindLogin(){
  $("#loginForm").addEventListener("submit", (e)=>{
    e.preventDefault();
    const username = $("#username").value.trim();
    const password = $("#password").value;

    const ok = ALLOWED_USERS[username] && ALLOWED_USERS[username] === password;
    const msg = $("#loginMsg");

    if(ok){
      state.user = username;
      if($("#rememberMe").checked){
        localStorage.setItem("sessionUser", username);
      }
      msg.textContent = "Đăng nhập thành công! Đang mở thiệp...";
      enableNav();
      showView("#home");
      setTimeout(launchWelcomeCard, 250);
    }else{
      msg.textContent = "Sai tên đăng nhập hoặc mật khẩu.";
    }
  });
}

function bindLogout(){
  $("#logoutBtn").addEventListener("click", ()=>{
    state.user = null;
    localStorage.removeItem("sessionUser");
    // Reset các lựa chọn
    state.rsvp = state.food = state.freeDate = state.freeTime = state.notes = null;
    $$("#loginForm input").forEach(i=>i.value="");
    $$("#foodForm input[type=radio]").forEach(i=>i.checked=false);
    $$("#timeForm input, #timeForm textarea").forEach(i=>i.value="");
    $$("#details input[name=rsvp]").forEach(i=>i.checked=false);
    disableNavExceptLogin();
    showView("#login");
  });
}

function disableNavExceptLogin(){
  $$(".nav-link").forEach(b => {
    b.disabled = true;
    if(b.id === "logoutBtn") b.disabled = true;
  });
}

// ====== Home: Thiệp & Thông tin ======
function bindHomeFlow(){
  $("#seeMoreBtn").addEventListener("click", ()=>{
    $("#details").classList.remove("hidden");
    $("#details").scrollIntoView({behavior:"smooth", block:"start"});
  });

  $("#completeBtn").addEventListener("click", onComplete);
}

function launchWelcomeCard(){
  try {
    // Pháo giấy
    if(window.confetti){
      const duration = 1400;
      const end = Date.now() + duration;
      (function frame(){
        confetti({ particleCount: 4, spread: 70, origin: { y: 0.6 }});
        if(Date.now() < end) requestAnimationFrame(frame);
      })();
    }
  } catch(e) {}

  // Hiệu ứng chữ (nhẹ)
  animateTypeLine("#cardLine1", 24);
  setTimeout(()=>animateTypeLine("#cardLine2", 24), 600);
}

function animateTypeLine(sel, speed=22){
  const el = $(sel);
  if(!el) return;
  const text = el.textContent;
  el.textContent = "";
  let i=0;
  const timer = setInterval(()=>{
    el.textContent += text.charAt(i++);
    if(i >= text.length) clearInterval(timer);
  }, speed);
}

// ====== Food form ======
function bindFoodForm(){
  $("#foodForm").addEventListener("submit", async (e)=>{
    e.preventDefault();
    ensureLogged();
    const choice = $("#foodForm input[name=food]:checked");
    const msg = $("#foodMsg");
    if(!choice){
      msg.textContent = "Hãy chọn một tuỳ chọn trước.";
      return;
    }
    state.food = choice.value;
    msg.textContent = "Đã lưu lựa chọn.";
    await sendPartial("food");
  });
}

// ====== Time form ======
function bindTimeForm(){
  $("#timeForm").addEventListener("submit", async (e)=>{
    e.preventDefault();
    ensureLogged();
    const d = $("#freeDate").value;
    const t = $("#freeTime").value;
    const notes = $("#notes").value.trim();
    const msg = $("#timeMsg");
    if(!d || !t){
      msg.textContent = "Hãy chọn đầy đủ ngày và giờ.";
      return;
    }
    state.freeDate = d;
    state.freeTime = t;
    state.notes = notes || null;
    msg.textContent = "Đã lưu thời gian.";
    await sendPartial("time");
  });
}

// ====== Hoàn thành ======
async function onComplete(){
  ensureLogged();
  const selected = $$("#details input[name=rsvp]").find(i=>i.checked);
  const msg = $("#submitMsg");
  if(!selected){
    msg.textContent = "Hãy chọn bạn có đi hay không nhé.";
    return;
  }
  state.rsvp = selected.value;

  msg.textContent = "Đang gửi thông tin...";
  try{
    await sendAll();
    msg.textContent = "Đã gửi! Cảm ơn bạn.";
    // Hiệu ứng confetti lần nữa
    try{ window.confetti && window.confetti({particleCount:120, spread:80}); }catch(e){}
    setTimeout(()=> showView("#thanks"), 500);
  }catch(err){
    console.error(err);
    msg.textContent = "Không gửi được thông tin. Bạn hãy thử lại sau.";
  }
}

// ====== Gửi dữ liệu ======
function ensureLogged(){
  if(!state.user) throw new Error("Chưa đăng nhập");
}

function payloadBase(){
  return {
    to: OWNER_EMAIL,
    eventName: EVENT.name,
    username: state.user,
    timestamp: new Date().toISOString()
  };
}

async function sendPartial(type){
  if(!EMAIL_WEBAPP_URL || EMAIL_WEBAPP_URL.startsWith("PASTE_")){
    console.warn("Chưa cấu hình EMAIL_WEBAPP_URL, bỏ qua gửi email.");
    return;
  }
  const data = payloadBase();
  data.type = type;
  data.rsvp = state.rsvp;
  data.food = state.food;
  data.freeDate = state.freeDate;
  data.freeTime = state.freeTime;
  data.notes = state.notes;

  await fetch(EMAIL_WEBAPP_URL, {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify(data)
  }).then(r=>r.json());
}

async function sendAll(){
  if(!EMAIL_WEBAPP_URL || EMAIL_WEBAPP_URL.startsWith("PASTE_")){
    // Không có endpoint: vẫn cho flow tiếp tục (demo offline)
    return;
  }
  const data = payloadBase();
  data.type = "final";
  data.rsvp = state.rsvp;
  data.food = state.food;
  data.freeDate = state.freeDate;
  data.freeTime = state.freeTime;
  data.notes = state.notes;

  const res = await fetch(EMAIL_WEBAPP_URL, {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify(data)
  });
  if(!res.ok) throw new Error("Email API error");
  await res.json();
}
