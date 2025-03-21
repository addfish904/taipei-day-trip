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
            <div class="attraction_title">
                <img src="${attraction.images[0]}" alt="${attraction.name}"></img>
                <p>${attraction.name}</p>
            </div>
            <div class="attraction_info">
                <p>${attraction.mrt}</p>
                <p>${attraction.category}</p>
            </div>
            `
        attractionsContainer.append(div);
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