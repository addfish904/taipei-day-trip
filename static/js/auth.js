// auth.js
const API_URL = "http://13.237.251.22:8000/api";

const login = document.querySelector(".nav_login a");
const overlay = document.querySelector(".overlay");
const loginForm = document.querySelector(".login-form");
const signupForm = document.querySelector(".signup-form");
const popupCloseBtns = document.querySelectorAll(".popup-close");
const showSignup = document.getElementById("showSignup");
const showLogin = document.getElementById("showLogin");
const loginNotice = document.querySelector(".login-form_notice");
const signupNotice = document.querySelector(".signup-form_notice");

export function initAuthPopup() {
  // 切換註冊彈窗
  showSignup.addEventListener("click", () => {
    signupForm.style.display = "block";
    loginForm.classList.remove("show");
    document.body.style.overflow = "hidden";
    signupNotice.textContent = " ";
  });

  // 切回登入彈窗
  showLogin.addEventListener("click", () => showLoginPopup());

  // 關閉彈窗
  popupCloseBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      overlay.style.display = "none";
      loginForm.classList.remove("show");
      loginForm.style.visibility = "hidden";
      signupForm.style.display = "none";
      document.body.style.overflow = "";
    });
  });

  // 註冊會員
  document.getElementById("signup").addEventListener("click", async (e) => {
    e.preventDefault();

    const name = signupForm.querySelector('input[name="name"]').value.trim();
    const email = signupForm.querySelector('input[name="email"]').value.trim();
    const password = signupForm.querySelector('input[name="password"]').value.trim();

    const missing = [];
    if (!name) missing.push("姓名");
    if (!email) missing.push("電子信箱");
    if (!password) missing.push("密碼");

    if (missing.length > 0) {
      signupNotice.innerHTML = `請輸入${missing.join("、")}`;
      signupNotice.style.color = "red";
      return;
    }

    const response = await fetch(`${API_URL}/user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password })
    });

    const result = await response.json();
    if (response.ok) {
        signupNotice.textContent = `註冊成功，請登入系統`;
        signupNotice.style.color = "green";
    } else {
        signupNotice.textContent = result.message;
        signupNotice.style.color = "red";
    }
  });

  // 登入會員
  document.getElementById("login").addEventListener("click", async (e) => {
    e.preventDefault();
    const email = loginForm.querySelector('input[name="email"]').value.trim();
    const password = loginForm.querySelector('input[name="password"]').value.trim();

    // 驗證輸入欄位
    if (!email || !password) {
      loginNotice.textContent = "請輸入電子信箱和密碼";
      loginNotice.style.color = "red";
      return;
    }

    try {
      const response = await fetch(`${API_URL}/user/auth`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const result = await response.json();
      if (response.ok) {
        localStorage.setItem("token", result.token);
        loginNotice.textContent = "登入成功";
        loginNotice.style.color = "green";
        setTimeout(() => location.reload(), 500);
      } else {
        loginNotice.textContent = result.message;
        loginNotice.style.color = "red";
      }
    } catch (error) {
      console.error("登入錯誤", error);
      alert("發生錯誤，請稍後再試");
    }
  });

  // 導覽列 >「預定行程」
  document.querySelector(".nav_booking").addEventListener("click", async (event) => {
    event.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/user/auth`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.data === null) showLoginPopup();
      else window.location.href = "/booking";
    } catch (error) {
      console.error("無法驗證登入狀態：", error);
    }
  });
}

export function initAuthStatus() {
  getUserInfo();
}

// 取得登入會員資訊
async function getUserInfo() {
  try {
    const token = localStorage.getItem("token");
    const response = await fetch(`${API_URL}/user/auth`, {
      method: "GET",
      headers: { "Authorization": `Bearer ${token}` }
    });
    const result = await response.json();

    if (result.data === null) {
        login.textContent = "登入/註冊"
        login.onclick = () => showLoginPopup();
    } else {
        login.textContent = "登出系統"
        login.onclick = () => logout();
    }
  } catch (error) {
    console.error("無法獲取使用者登入狀態：", error);
  }
}

// 開啟登入彈窗
export function showLoginPopup() {
  overlay.style.display = "block";
  loginForm.classList.add("show");
  loginForm.style.visibility = "visible";
  document.body.style.overflow = "hidden";
  signupForm.style.display = "none";
  loginNotice.textContent = " ";
}

// 登出（清除token）
async function logout() {
  localStorage.removeItem("token");
  location.reload();
}
