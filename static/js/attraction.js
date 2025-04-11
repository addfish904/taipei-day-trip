// attraction.js
const API_URL = "http://13.237.251.22:8000/api";

export function initAttractionPage() {
  const mainSection = document.querySelector(".main_section");
  const infors = document.querySelector(".infors");

  // 取得景點內頁資料
  async function fetchAttractionById() {
    const attractionId = window.location.pathname.split("/").pop();
    try {
      const response = await fetch(`${API_URL}/attraction/${attractionId}`);
      const data = await response.json();
      renderAttractionsDetail(data.data);
    } catch (error) {
      console.error("Error fetching attraction details:", error);
    }
  }

  // 渲染景點內頁
  function renderAttractionsDetail(attr) {
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
              <input type="date" id="booking-date">
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
            <button type="submit" id="start-booking-btn">開始預約行程</button>
          </form>
        </div>
      </div>
    `;

    document.getElementById("morning").addEventListener("change", () => {
      document.querySelector(".form-item-price").textContent = "新台幣 2000 元";
    });
    document.getElementById("afternoon").addEventListener("change", () => {
      document.querySelector(".form-item-price").textContent = "新台幣 2500 元";
    });

    // 建立預定行程
    document.getElementById("start-booking-btn").addEventListener("click", async (event) => {
      event.preventDefault();
      const token = localStorage.getItem("token");
      if (!token) return showLoginPopup();

      const attractionId = location.pathname.split("/").pop();
      const date = document.getElementById("booking-date").value;
      const time = document.querySelector("input[name='time']:checked").value;
      const price = time === "morning" ? 2000 : 2500;

      if (!date) return alert("請選擇日期");

      try {
        const response = await fetch(`${API_URL}/booking`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ attractionId, date, time, price })
        });

        const result = await response.json();
        if (response.ok) {
          window.location.href = "/booking";
        } else if (response.status === 401) {
          alert("登入已過期，請重新登入");
          localStorage.removeItem("token");
          showLoginPopup();
        }
      } catch (error) {
        console.error("fetch 錯誤", error);
      }
    });

    // 輪播元件
    const carousel = document.querySelector(".carousel");
    attr.images.forEach(image => {
      const div = document.createElement("div");
      div.classList.add("carousel-slide");
      div.style.backgroundImage = `url(${image})`;
      carousel.appendChild(div);
    });

    function createCarousel() {
      const slides = document.querySelectorAll(".carousel-slide");
      let currentIndex = 0;

      // 建立圓點指示器
      const dotsContainer = document.createElement("div");
      dotsContainer.classList.add("carousel-dots");
      carousel.appendChild(dotsContainer);

      // 建立圓點
      let dots = [];
      slides.forEach((_, index) => {
        const dot = document.createElement("span");
        dot.classList.add("carousel-dot");
        dotsContainer.appendChild(dot);
        dots.push(dot);
        dot.addEventListener("click", () => goToSlide(index));
      });

      // 顯示當前圖片並更新圓點
      function showSlide(index) {
        slides.forEach(slide => slide.style.display = "none");
        slides[index].style.display = "block";
        updateDots(index);
      }

      // 圓點跳轉圖片
      function goToSlide(index) {
        currentIndex = index;
        showSlide(index);
      }

      // 改變圓點樣式
      function updateDots(index) {
        dots.forEach(dot => dot.classList.remove("active"));
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
      showSlide(currentIndex);
    }
    createCarousel();

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
    `;
  }

  fetchAttractionById();
}
