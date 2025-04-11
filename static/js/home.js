const API_URL = "http://13.237.251.22:8000/api";

export function initHomePage() {
  const attractionsContainer = document.querySelector(".attractions");
  const mrt_ul = document.querySelector(".mrts-nav_list");
  const searchBtn = document.querySelector(".search-button");
  const searchInput = document.querySelector(".search-input");
  const loadMoreTrigger = document.querySelector("#loadMoreTrigger");
  const prevBtn = document.querySelector(".mrts-nav-arrow-left");
  const nextBtn = document.querySelector(".mrts-nav-arrow-right");

  let nextPage = 0;
  let isLoading = false;

  async function fetchAttractions(keyword = "", page = 0, clear = false) {
    if (nextPage === null || isLoading) return;
    isLoading = true;

    try{
      const response = await fetch(`${API_URL}/attractions?keyword=${keyword}&page=${page}`);
      const data = await response.json();

      if (clear) attractionsContainer.innerHTML = "";
      renderAttractions(data.data); 
      nextPage = data.nextPage;
    } catch (error) {
      console.error("Error fetching attractions:", error);
    } finally {
      isLoading = false;
    }
  }

  // 渲染景點資料
  function renderAttractions(attractions) {
    attractions.forEach(attraction => {
      const div = document.createElement("div");
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
        </a>`;
      attractionsContainer.appendChild(div);
    });
  }

  // 取得捷運站資料
  async function renderMrts() {
    try {
        let response = await fetch(`${API_URL}/mrts`);
        let data = await response.json();
        
        let mrts = data.data;
      mrts.forEach(mrt => {
        const li = document.createElement("li");
        li.textContent = mrt;
        li.addEventListener("click", () => {
          nextPage = 0;
          searchInput.value = mrt;
          fetchAttractions(mrt, nextPage, true);
        });
        mrt_ul.appendChild(li);
      });
    } catch (error) {
      console.error("Error fetching MRT stations:", error);
    }
  }

  // 點擊搜尋按鈕
  searchBtn.addEventListener("click", () => {
    nextPage = 0;
    fetchAttractions(searchInput.value.trim(), nextPage, true);
  });

  // 捷運導覽列左右滾動
  prevBtn.addEventListener("click", () => {
    mrt_ul.scrollBy({ left: -200, behavior: "smooth" });
  });
  nextBtn.addEventListener("click", () => {
    mrt_ul.scrollBy({ left: 200, behavior: "smooth" });
  });

  // 滾動加載
  const observer = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting && !isLoading) {
      fetchAttractions(searchInput.value.trim(), nextPage);
    }
  }, { threshold: 1.0 });

  fetchAttractions();
  renderMrts();
  observer.observe(loadMoreTrigger);
}