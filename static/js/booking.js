// booking.js
const API_URL = "http://13.237.251.22:8000/api";

export function initBookingPage() {
  checkBookingAuth();

  async function checkBookingAuth() {
    const token = localStorage.getItem("token");
    const response = await fetch(`${API_URL}/user/auth`, {
      method: "GET",
      headers: { "Authorization": `Bearer ${token}` }
    });
    const result = await response.json();

    if (result.data === null) {
      window.location.href = "/";
    } else {
      loadBookingsPage(token, result.data.name);
    }
  }

  async function loadBookingsPage(token, userName) {
    const response = await fetch(`${API_URL}/booking`, {
      method: "GET",
      headers: { "Authorization": `Bearer ${token}` }
    });
    const result = await response.json();

    const orderSection = document.querySelector(".order-section");
    const inforSection = document.querySelector(".infor-section");
    orderSection.innerHTML = `<h2 style="margin-bottom: 30px;">您好，${userName}，待預訂的行程如下：</h2>`;

    if (result.data === null) {
      orderSection.innerHTML += `<p>目前沒有任何待預訂的行程</p>`;
      inforSection.innerHTML = " ";
    } else {
      orderSection.innerHTML += `
        <div class="order-box">
          <div class="order-delete"></div>
          <img src="${result.data.attraction.image}" class="order-pic"></img>
          <div class="order-infor">
            <h3>台北一日遊：${result.data.attraction.name}</h3>
            <ul>
              <li><span style="font-weight: 700">日期：</span><p>${result.data.date}</p></li>
              <li><span style="font-weight: 700">時間：</span><p>${result.data.time === 'morning' ? '早上 9 點到下午 4 點' : '下午 2 點到晚上 9 點'}</p></li>
              <li><span style="font-weight: 700">費用：</span><p>新台幣 ${result.data.price} 元</p></li>
              <li><span style="font-weight: 700">地點：</span><p>${result.data.attraction.address}</p></li>
            </ul>
          </div>
        </div>`;

      inforSection.innerHTML += `
        <hr>
        <div class="contact-form">
          <form class="booking-info">
            <h2>您的聯絡資料</h2>
            <label>聯絡姓名：<input type="text" name="name"></label>
            <label>連絡信箱：<input type="email" name="email"></label>
            <label>手機號碼：<input type="tel" name="tel"></label>
            <p>請保持手機暢通，準時到達，導覽人員將用手機與您聯繫，務必留下正確的聯絡方式。</p>
          </form>
        </div>
        <hr>
        <div class="payment">
          <form class="booking-info">
            <h2>信用卡付款資訊</h2>
            <label>卡片號碼：<input type="text" placeholder="**** **** **** ****" name="card-number"></label>
            <label>過期時間：<input type="text" placeholder="MM / YY" name="expiry_date"></label>
            <label>驗證密碼：<input type="password" placeholder="CVV" name="cvv"></label>
          </form>
        </div>
        <hr>
        <div id="confirm">
          <p class="account"></p>
          <button type="submit">確認訂購並付款</button>
        </div>`;

      const account = document.querySelector(".account");
      account.textContent = `總價：新台幣${result.data.price}元`;

      const bookingDeleteBtn = document.querySelector(".order-delete");
      bookingDeleteBtn.addEventListener("click", async () => {
        const response = await fetch(`${API_URL}/booking`, {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${token}` }
        });
        const result = await response.json();

        if (result.ok) {
          loadBookingsPage(token, userName);
        } else {
          alert("發生錯誤，請稍後再試");
        }
      });
    }
  }
}
