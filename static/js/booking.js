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
        let bookingData = null;

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
            bookingData = result.data;

            orderSection.innerHTML += `
                <div class="order-box">
                <div class="order-delete"></div>
                <img src="${bookingData.attraction.image}" class="order-pic"></img>
                <div class="order-infor">
                    <h3>台北一日遊：${bookingData.attraction.name}</h3>
                    <ul>
                    <li><span style="font-weight: 700">日期：</span><p>${bookingData.date}</p></li>
                    <li><span style="font-weight: 700">時間：</span><p>${bookingData.time === 'morning' ? '早上 9 點到下午 4 點' : '下午 2 點到晚上 9 點'}</p></li>
                    <li><span style="font-weight: 700">費用：</span><p>新台幣 ${bookingData.price} 元</p></li>
                    <li><span style="font-weight: 700">地點：</span><p>${bookingData.attraction.address}</p></li>
                    </ul>
                </div>
                </div>
            `;
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
                    <div class="tp-container">
                        <label>卡片號碼：</label>
                        <div class="tpfield" id="card-number"></div>
                    </div>
                    <div class="tp-container">
                        <label>過期時間：</label>
                        <div class="tpfield" id="card-expiration-date"></div>
                    </div>
                    <div class="tp-container">
                        <label>驗證密碼：</label>
                        <div class="tpfield" id="card-ccv"></div>
                    </div>
                </form>
                </div>
                <hr>
                <div id="confirm">
                <p class="account"></p>
                <button type="submit" id="submit-button">確認訂購並付款</button>
                </div>
            `;
            const account = document.querySelector(".account");
            account.textContent = `總價：新台幣${bookingData.price}元`;

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
                    alert(result.message);
                }
            });
        }
        // 初始化 TapPay
        TPDirect.setupSDK(
            159886,
            'app_rRt9WwYbSTDRL1HuE50SDykBxuJk6aLzRGBIPda2atI5CvLuaOZrMYGwpbjy',
            'sandbox'
        );
  
        // 設定卡片欄位
        TPDirect.card.setup({
            fields: {
            number: {
                element: '#card-number',
                placeholder: '**** **** **** ****'
            },
            expirationDate: {
                element: '#card-expiration-date',
                placeholder: 'MM / YY'
            },
            ccv: {
                element: '#card-ccv',
                placeholder: 'CVV'
            }
            },
            styles: {
            'input': { 'color': '#333', 'font-size': '16px' },
            ':focus': { 'color': 'black' },
            }
        });
        
        // 點擊付款按鈕
        document.getElementById("submit-button").addEventListener("click", async () => {
            // 確認表單是否可以取得 Prime
            const tappayStatus = TPDirect.card.getTappayFieldsStatus();
            if (!tappayStatus.canGetPrime) {
                alert("信用卡資訊錯誤，請重新確認！");
                return;
            }
        
            TPDirect.card.getPrime(async (result) => {
            if (result.status !== 0) {
                alert("取得 Prime 失敗！");
                return;
            }
        
            const prime = result.card.prime;
        
            // 取得聯絡資訊
            const contactForm = document.querySelector(".contact-form form");
            const name = contactForm.querySelector("input[name='name']").value;
            const email = contactForm.querySelector("input[name='email']").value;
            const phone = contactForm.querySelector("input[name='tel']").value;
        
            if (!name || !email || !phone) {
                alert("請完整填寫聯絡資料！");
                return;
            }

            // 傳送至後端建立訂單
            const orderResponse = await fetch(`${API_URL}/orders`, {
                method: "POST",
                headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                prime: prime,
                order: {
                    price: bookingData.price,
                    trip: {
                        attraction: {
                            id: bookingData.attraction.id,
                            name: bookingData.attraction.name,
                            address: bookingData.attraction.address,
                            image: bookingData.attraction.image,
                        },
                        date: bookingData.date,
                        time: bookingData.time
                    },
                    contact: {
                        name: name,
                        email: email,
                        phone: phone
                    }
                }
                })
            });
            const orderResult = await orderResponse.json();
        
            if (orderResult.data && orderResult.data.number) {
                alert("付款成功");
                window.location.href = `/thankyou?number=${orderResult.data.number}`;
            } else {
                alert(orderResult.message);
            }
            });
        });
    }
}
