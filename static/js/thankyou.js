const API_URL = "http://13.237.251.22:8000/api";

export function initThankyouPage() {
    checkThankyouAuth();

    async function checkThankyouAuth() {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_URL}/user/auth`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` }
        });
        const result = await response.json();
        console.log("Token:", token);
        console.log("Auth result:", result);

        if (result.data === null) {
            window.location.href = "/";
        } else {
            loadThankyouPage(token);
        }
    }
    async function loadThankyouPage(token) {
        const urlParams = new URLSearchParams(window.location.search);
        const orderNumber = urlParams.get("number");

        if (!orderNumber) {
            console.error("沒有訂單編號，導回首頁");
            window.location.href = "/";
            return;
        }

        const response = await fetch(`${API_URL}/order/${orderNumber}`, {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${token}`,
        },
        });
        const result = await response.json();
        console.log("Order number:", orderNumber);
        console.log("Order response:", result);


        if (result.data) {
            document.getElementById("order-number").textContent = result.data.number;
        } else {
            console.error("找不到訂單資料");
        }
    }
    
}

const path = window.location.pathname;
if (path.includes("/thankyou")) {
    initThankyouPage();
}