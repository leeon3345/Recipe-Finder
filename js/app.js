// DOM 요소
const searchBtn = document.getElementById("searchBtn");
const searchInput = document.getElementById("searchInput");
const results = document.getElementById("results");
const loading = document.getElementById("loading");
const errorBox = document.getElementById("error");
const showFavsBtn = document.getElementById("showFavsBtn");

// API URL
const API_URL_SEARCH = "https://www.themealdb.com/api/json/v1/1/search.php?s=";
const API_URL_LOOKUP = "https://www.themealdb.com/api/json/v1/1/lookup.php?i=";

// 즐겨찾기 목록 (localStorage에서 불러오기)
let favorites = JSON.parse(localStorage.getItem('favorites')) || [];

// --- 메인 검색 함수 ---
async function searchRecipe() {
    const query = searchInput.value.trim();
    if (!query) {
        showError("Please enter an ingredient.");
        return;
    }

    showLoading(true);
    clearResults();
    clearError();

    try {
        const res = await fetch(`${API_URL_SEARCH}${query}`);
        if (!res.ok) throw new Error("Network connection error.");

        const data = await res.json();

        if (!data.meals) {
            showError("No recipes found.");
            return;
        }

        displayResults(data.meals);

    } catch (e) {
        showError(e.message);
    } finally {
        showLoading(false);
    }
}

// --- 즐겨찾기 목록 보여주기 ---
async function displayFavoriteRecipes() {
    if (favorites.length === 0) {
        showError("You have no favorite recipes yet.");
        clearResults();
        return;
    }

    showLoading(true);
    clearResults();
    clearError();

    try {
        // Promise.all을 사용해 모든 즐겨찾기 API를 병렬로 호출
        const mealPromises = favorites.map(id => 
            fetch(`${API_URL_LOOKUP}${id}`).then(res => res.json())
        );
        
        const mealDataArray = await Promise.all(mealPromises);
        
        // API 결과가 data.meals[0]에 담겨 있으므로, 이를 추출
        const meals = mealDataArray.map(data => data.meals[0]);
        displayResults(meals);

    } catch (e) {
        showError("Error fetching favorites.");
    } finally {
        showLoading(false);
    }
}

// --- DOM 출력 ---
function displayResults(meals) {
    meals.forEach(meal => {
        const card = document.createElement("div");
        card.classList.add("card");

        // 현재 레시피가 즐겨찾기에 있는지 확인
        const isFavorited = favorites.includes(meal.idMeal);

        const recipeLink = meal.strSource || meal.strYoutube;

        card.innerHTML = `
            <img src="${meal.strMealThumb}" alt="${meal.strMeal}">
            <div class="card-content">
                <div class="card-title">${meal.strMeal}</div>
                <div class="card-actions">
                    ${recipeLink ?
                        `<a href="${recipeLink}" target="_blank">View Recipe →</a>` :
                        '<span></span>'
                    }
                    <div class="card-buttons">
                        <button class="share-btn" data-link="${recipeLink || ''}" data-title="${meal.strMeal}" title="Share Recipe">🔗</button>
                        <button 
                            class="fav-btn ${isFavorited ? 'favorited' : ''}" 
                            data-id="${meal.idMeal}"
                            title="Add to Favorites"
                        >
                            ${isFavorited ? '⭐' : '☆'}
                        </button>
                    </div>
                </div>
            </div>
        `;

        results.appendChild(card);
    });
}

// --- 즐겨찾기 토글 ---
function toggleFavorite(mealId, btn) {
    if (favorites.includes(mealId)) {
        // 즐겨찾기에서 제거
        favorites = favorites.filter(id => id !== mealId);
        btn.classList.remove("favorited");
        btn.textContent = '☆'; // 빈 별로 변경
    } else {
        // 즐겨찾기에 추가
        favorites.push(mealId);
        btn.classList.add("favorited");
        btn.textContent = '⭐'; // 채워진 별로 변경
    }
    // localStorage 업데이트
    localStorage.setItem('favorites', JSON.stringify(favorites));
}

// --- 링크 공유 ---
async function shareRecipe(btn) {
    const link = btn.dataset.link;
    const title = btn.dataset.title;

    if (!link) {
        alert("No recipe link available to share.");
        return;
    }

    if (navigator.share) {
        // Web Share API 사용 (모바일 등 지원 환경)
        try {
            await navigator.share({
                title: `Recipe: ${title}`,
                text: `Check out this recipe for ${title}!`,
                url: link,
            });
        } catch (error) {
            console.error('Error sharing:', error);
        }
    } else {
        // 클립보드에 복사 (데스크톱 등 미지원 환경)
        navigator.clipboard.writeText(link).then(() => {
            alert(`Recipe link copied to clipboard!\n${link}`);
        }).catch(err => {
            console.error('Failed to copy:', err);
            alert("Failed to copy link.");
        });
    }
}

// --- 유틸 함수 ---
function showLoading(isLoading) {
    loading.classList.toggle("hidden", !isLoading);
}

function showError(msg) {
    errorBox.textContent = msg;
    errorBox.classList.remove("hidden");
}

function clearError() {
    errorBox.textContent = "";
    errorBox.classList.add("hidden");
}

function clearResults() {
    results.innerHTML = "";
}

// --- 이벤트 리스너 ---
searchBtn.addEventListener("click", searchRecipe);
searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") searchRecipe();
});

showFavsBtn.addEventListener("click", displayFavoriteRecipes);

// 이벤트 위임 (Event Delegation)
// .results 컨테이너에 이벤트 리스너를 달아 하위의 .fav-btn 클릭을 감지
results.addEventListener("click", (e) => {
    // 클릭된 요소가 .fav-btn 클래스를 가지고 있는지 확인
    if (e.target.classList.contains("fav-btn")) {
        const mealId = e.target.dataset.id;
        toggleFavorite(mealId, e.target);
    }
    // .share-btn 클릭 감지
    if (e.target.classList.contains("share-btn")) {
        shareRecipe(e.target);
    }
});

// 검색창이 비워지면 결과 숨기기
searchInput.addEventListener("input", () => {
    if (searchInput.value.trim() === "") {
        clearResults();
        clearError();
    }
});
