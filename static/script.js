const isHomePage = window.location.pathname.includes("index.html") || window.location.pathname === "/";
const isAttractionPage = window.location.pathname.includes("/attraction");


if (isHomePage){
    const attractionsContainer = document.querySelector(".attractions");
    const mrt_ul = document.querySelector(".mrts-nav_list");
    const searchBtn = document.querySelector(".search-button");
    const searchInput = document.querySelector(".search-input")
    const loadMoreTrigger = document.querySelector("#loadMoreTrigger")

    let nextPage = 0;
    let isLoading = false;

    // 取得景點資料
    async function fetchAttractions(keyword="", page = 0, clear = false) {
        if (nextPage === null || isLoading) return;
        isLoading = true;

        try{
            const response = await fetch(`http://13.237.251.22:8000/api/attractions?keyword=${keyword}&page=${page}`);
            const data = await response.json();

            if (clear) attractionsContainer.innerHTML = "";
            renderAttractions(data.data); 
            nextPage = data.nextPage;
        } catch(error) {
            console.error("Error fetching attractions:", error);
        } finally {
            isLoading = false;
        }
    }

    // 渲染景點資料
    function renderAttractions(attractions){
        attractions.forEach( (attraction) => {
            let div = document.createElement("div")
            div.classList.add("attraction_card");
            div.innerHTML = `
                <a href="/attraction/${attraction.id}">
                    <div class="attraction_title">
                        <img src="${attraction.images[0]}" alt="${attraction.name}"></img>
                        <p>${attraction.name}</p>
                    </div>
                    <div class="attraction_info">
                        <p>${attraction.mrt}</p>
                        <p>${attraction.category}</p>
                    </div>
                </a>
                `
            attractionsContainer.appendChild(div);
        });
    }

    // 取得捷運站資料
    async function fetchMrts(){
        try{
            let response = await fetch(`http://13.237.251.22:8000/api/mrts`);
            let data = await response.json();
        
            let mrts = data.data;
            mrts.forEach((mrt) => {
                const li = document.createElement("li");
                li.textContent = mrt;
                li.addEventListener("click",()=>{
                    nextPage = 0;
                    searchInput.value = mrt
                    fetchAttractions(searchInput.value, nextPage, true);
                })
                mrt_ul.appendChild(li);
            })
        } catch (error) {
            console.error("Error fetching MRT stations:", error);
        }
    }

    // 捷運導覽列左右滾動
    const prevBtn = document.querySelector(".mrts-nav-arrow-left")
    const nextBtn = document.querySelector(".mrts-nav-arrow-right")

    prevBtn.addEventListener("click",() => {
        mrt_ul.scrollBy({ left: -200, behavior: "smooth" })
    })
    nextBtn.addEventListener("click",() => {
        mrt_ul.scrollBy({ left: 200, behavior: "smooth" })
    })

    // 滾動加載
    const observer = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting && !isLoading) {
            fetchAttractions(searchInput.value.trim(), nextPage, false);
        }
    }, { threshold: 1.0 });

    // 點擊搜尋按鈕
    searchBtn.addEventListener("click", () => {
        nextPage = 0;
        fetchAttractions(searchInput.value.trim(), nextPage, true);
    })

    fetchAttractions()
    fetchMrts()
    observer.observe(loadMoreTrigger)
}

if (isAttractionPage){
    const mainSection = document.querySelector(".main_section");
    const infors = document.querySelector(".infors");

    // 取得景點內頁資料
    async function fetchAttractionById() {
        const attractionId = window.location.pathname.split("/").pop();
        
        try {
            const response = await fetch(`http://13.237.251.22:8000/api/attraction/${attractionId}`);
            const data = await response.json();
            renderAttractionsDetail(data.data)
        } catch (error) {
            console.error("Error fetching attraction details:", error);
        }
    }

    // 渲染景點內頁
    function renderAttractionsDetail(attr){
        mainSection.innerHTML = `
            <div class="carousel">
                <button class="carousel-prev"></button>
                <button class="carousel-next"></button>
            </div>
            <div class="profile">
                <h1>${attr.name}</h1>
                <p>${attr.category} at ${attr.mrt}</p>
                <div class="booking-form">
                    <p class="form-title">訂購導覽行程</p>
                    <p>以此景點為中心的一日行程，帶您探索城市角落故事</p>
                    <form>
                        <div class="form-item">
                            <label>選擇日期：</label>
                            <input type="date">
                        </div>
                        <div class="form-item">
                            <label>選擇時間：</label>
                            <span class="radio">
                                <input type="radio" name="time" value="morning" id="morning" checked><span style="margin-right:15px;">上半天</span>
                                <input type="radio" name="time" value="afternoon" id="afternoon"><span>下半天</span>
                            </span>
                        </div>
                        <div class="form-item">
                            <label>導覽費用：</label>
                            <p class="form-item-price">新台幣 2000 元</p>
                        </div>
                        <button type="submit">開始預約行程</button>
                    </form>
                </div>
            </div>
        `
        const radioMorning = document.getElementById("morning");
        const radioAfternoon = document.getElementById("afternoon");
        const priceText = document.querySelector(".form-item-price");

        radioMorning.addEventListener("change",()=>{
            priceText.textContent = "新台幣 2000 元"
        })
        radioAfternoon.addEventListener("change",()=>{
            priceText.textContent = "新台幣 2500 元"
        })
        
        // 輪播元件
        const carousel = document.querySelector(".carousel")
        attr.images.forEach(image => {
            let div = document.createElement("div");
            div.classList.add("carousel-slide")
            div.style.backgroundImage = `url(${image})`
            carousel.appendChild(div);
        });

        function createCarousel(){
            const slides = document.querySelectorAll(".carousel-slide");
            let currentIndex = 0;

            // 建立圓點指示器
            const dotsContainer = document.createElement("div");
            dotsContainer.classList.add("carousel-dots");
            carousel.appendChild(dotsContainer);

            // 建立圓點
            let dots = []
            slides.forEach((_, index)=>{
                const dot = document.createElement("span");
                dot.classList.add("carousel-dot");
                dotsContainer.appendChild(dot);
                dots.push(dot)
                dot.addEventListener("click",() => goToSlide(index))
            })
            // 顯示當前圖片並更新圓點
            function showSlide(index){
                slides.forEach(slide => {slide.style.display = "none"});
                slides[index].style.display = "block";
                updateDots(index)
            }
            // 圓點跳轉圖片
            function goToSlide(index){
                currentIndex = index;
                showSlide(index);
            }
            // 改變圓點樣式
            function updateDots(index){
                dots.forEach(dot => {dot.classList.remove("active");})
                dots[index].classList.add("active");
            }
            // 上一張
            function prevSlide(){
                currentIndex--;
                if (currentIndex < 0) currentIndex = slides.length - 1;
                showSlide(currentIndex);
            }
            // 下一張
            function nextSlide(){
                currentIndex++;
                if (currentIndex >= slides.length) currentIndex = 0;
                showSlide(currentIndex);
            }
            // 監聽左右按鈕
            const prevBtn = document.querySelector(".carousel-prev")
            const nextBtn = document.querySelector(".carousel-next")
            prevBtn.addEventListener("click",() => prevSlide())
            nextBtn.addEventListener("click",() => nextSlide())

            // 初始化
            showSlide(currentIndex)
        }
        createCarousel()
        
        // 景點描述
        infors.innerHTML = `
            <p>${attr.description}</p>
            <div class="infors-item">
                <h4 style="margin-bottom: 5px;">景點地址：</h4>
                <p>${attr.address}</p>
            </div>
                <div class="infors-item">
                <h4 style="margin-bottom: 5px;">交通方式：</h4>
                <p>${attr.transport}</p>
            </div>
        `
    }

    fetchAttractionById();
}

const login = document.querySelector(".nav_login a")
const overlay = document.querySelector(".overlay")
const loginForm = document.querySelector(".login-form")
const signupForm = document.querySelector(".signup-form")
const popupCloseBtns = document.querySelectorAll(".popup-close")
const showSignup = document.getElementById("showSignup")
const showLogin = document.getElementById("showLogin")
const loginNotice = document.querySelector(".login-form_notice");
const signupNotice = document.querySelector(".signup-form_notice");

// 開啟登入彈窗
function showLoginPopup(){
    overlay.style.display = "block";
    loginForm.classList.add("show");
    loginForm.style.visibility = "visible"
    document.body.style.overflow = "hidden";
    signupForm.style.display = "none";
    loginNotice.textContent = " ";
}

// 切換註冊彈窗
showSignup.addEventListener("click", ()=>{
    signupForm.style.display = "block";
    loginForm.classList.remove("show");
    document.body.style.overflow = "hidden";
    signupNotice.textContent = " ";
})

// 切回登入彈窗
showLogin.addEventListener("click", () => showLoginPopup());

// 關閉彈窗
popupCloseBtns.forEach((popupCloseBtn)=>{
    popupCloseBtn.addEventListener("click",()=>{
        overlay.style.display = "none";
        loginForm.classList.remove("show");
        loginForm.style.visibility = "hidden"
        signupForm.style.display = "none";
        document.body.style.overflow = "";
    })
})

const API_URL = "http://13.237.251.22:8000/api/user";

// 註冊會員
document.getElementById("signup").addEventListener("click",
    async function userSignup(event) {
        event.preventDefault();

        let name = document.querySelector('.signup-form input[name="name"]').value.trim();
        let email = document.querySelector('.signup-form input[name="email"]').value.trim();
        let password = document.querySelector('.signup-form input[name="password"]').value.trim();

        let missingFields = [];

        if (!name) missingFields.push("姓名");
        if (!email) missingFields.push("電子信箱");
        if (!password) missingFields.push("密碼");

        if (missingFields.length > 0) {
            signupNotice.innerHTML = `請輸入${missingFields.join("、")}`;
            signupNotice.style.color = "red";
            return;
        }

        const response = await fetch(API_URL, {
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
    }
)

// 取得登入會員資訊
async function getUserInfo() {
    try{
        const token = localStorage.getItem("token");

        const response = await fetch(`${API_URL}/auth`, {
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
    }catch (error){
        console.error("無法獲取使用者登入狀態：", error);
    }
}
getUserInfo()

// 登入會員
document.getElementById("login").addEventListener("click", 
    async function userLogin(event) {
        event.preventDefault();

        let email = document.querySelector('.login-form input[name="email"]').value.trim();
        let password = document.querySelector('.login-form input[name="password"]').value.trim();

        // 驗證輸入欄位
        if (!email || !password) {
            loginNotice.innerHTML = `請輸入電子信箱和密碼`;
            loginNotice.style.color = "red";
            return;
        }

        try {
            const response = await fetch(`${API_URL}/auth`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email, password: password })
            })
            const result = await response.json();

            if (response.ok) {
                localStorage.setItem("token", result.token);
                loginNotice.innerHTML = `登入成功`;
                loginNotice.style.color = "green";
                setTimeout(() => {
                    location.reload();
                }, 500);
                
            } else {
                loginNotice.innerHTML = `${result.message}`;
                loginNotice.style.color = "red";
            }
        } catch (error) {
            console.error("發生錯誤:", error);
            alert("發生錯誤，請稍後再試");
        }
    }
);

// 登出（清除token）
async function logout() {
    localStorage.removeItem("token");
    location.reload();
    login.textContent = "登入/註冊";
    login.onclick = () => showLoginPopup();
}
