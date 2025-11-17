// DOM 요소
const searchBtn = document.getElementById("searchBtn");
const searchInput = document.getElementById("searchInput");
const resultsDiv = document.getElementById("results");
const loadingSpinner = document.getElementById("loading");
const errorDiv = document.getElementById("error");
const resultsTitle = document.getElementById("resultsTitle");
const resultsHeader = document.getElementById("resultsHeader");
const showFavsBtn = document.getElementById("showFavsBtn");
const categoryFilterBtn = document.getElementById('categoryFilterBtn');
const categoryDropdown = document.getElementById('categoryDropdown');

// API URL
const API_URL_SEARCH = "https://www.themealdb.com/api/json/v1/1/search.php?s=";
const API_URL_LOOKUP = "https://www.themealdb.com/api/json/v1/1/lookup.php?i=";
const API_URL_FILTER_BY_CATEGORY = "https://www.themealdb.com/api/json/v1/1/filter.php?c=";
const API_URL_LIST_CATEGORIES = "https://www.themealdb.com/api/json/v1/1/list.php?c=list";

// 즐겨찾기 목록 (localStorage에서 불러오기)
let favorites = JSON.parse(localStorage.getItem('favoriteRecipes')) || [];
// 만약 데이터가 배열이 아니라면, 빈 배열로 초기화하여 오류를 방지합니다.
if (!Array.isArray(favorites)) favorites = [];
let selectedCategory = null; // 현재 선택된 카테고리
let allCategories = []; // 모든 카테고리를 저장하는 배열

// --- 메인 검색 로직 ---
async function searchRecipes() {
    showLoading(true);
    clearResults();
    clearError();
    
    // 제목 숨기기
    resultsHeader.classList.add('hidden');
    resultsTitle.textContent = ''; // 제목 초기화

    const searchTerm = searchInput.value.trim();
    
    try {
        let meals;
        if (selectedCategory) {
            // 1. 카테고리가 선택된 경우, 먼저 카테고리로 필터링
            const res = await fetch(`${API_URL_FILTER_BY_CATEGORY}${selectedCategory}`);
            const data = await res.json();
            meals = data.meals || [];
            
            // 2. 검색어가 있다면, 필터링된 결과 내에서 이름으로 다시 필터링
            if (searchTerm) {
                meals = meals.filter(meal => meal.strMeal.toLowerCase().includes(searchTerm.toLowerCase()));
            }
        } else {
            // 카테고리가 선택되지 않은 경우, 검색어로만 검색
            const res = await fetch(`${API_URL_SEARCH}${searchTerm}`);
            const data = await res.json();
            meals = data.meals;
        }

        if (!meals || meals.length === 0) {
            showError("No recipes found. Try a different search or category.");
        } else {
            // 현재 검색 조건에 따라 동적으로 제목 설정
            if (selectedCategory && searchTerm) {
                resultsTitle.textContent = `Results for '${searchTerm}' in ${selectedCategory}`;
            } else if (selectedCategory) {
                resultsTitle.textContent = `Category: ${selectedCategory}`;
            } else if (searchTerm) {
                resultsTitle.textContent = `Results for '${searchTerm}'`;
            }

            // 제목이 있으면 표시
            if (resultsTitle.textContent) resultsHeader.classList.remove('hidden');

            displayResults(meals);
        }
    } catch (e) {
        showError(e.message);
    } finally {
        showLoading(false);
    }
}

// --- 유틸 함수 ---
function showLoading(isLoading) {
    loadingSpinner.classList.toggle("hidden", !isLoading);
}

function showError(msg) {
    errorDiv.textContent = msg;
    errorDiv.classList.remove("hidden");
}

function clearError() {
    errorDiv.textContent = "";
    errorDiv.classList.add("hidden");
}

function clearResults() {
    resultsDiv.innerHTML = "";
}

/**
 * 화면의 모든 결과(레시피, 카테고리 목록)를 지우고 초기 상태로 만듭니다.
 */
function clearAll() {
    clearResults();
    clearError();
    resultsHeader.classList.add('hidden'); // 제목 컨테이너 숨기기
}

// --- 즐겨찾기 기능 ---

/**
 * 즐겨찾기 목록을 화면에 표시합니다.
 */
async function displayFavoriteRecipes() {
    showLoading(true);
    clearAll();

    if (favorites.length === 0) {
        showError("You have no favorite recipes yet.");
        showLoading(false);
        return;
    }

    try {
        const mealPromises = favorites.map(id => fetch(`${API_URL_LOOKUP}${id}`).then(res => res.json()));
        const mealDataArray = await Promise.all(mealPromises);
        const meals = mealDataArray.map(data => data.meals[0]).filter(Boolean); // null/undefined 제거
        
        if (meals.length > 0) {
            // 즐겨찾기 목록 제목 표시
            resultsTitle.textContent = "Favorite Recipes";
            resultsHeader.classList.remove('hidden');
            displayResults(meals);
        } else {
            showError("Could not load some favorite recipes.");
        }
    } catch (e) {
        showError("Error fetching favorite recipes.");
    } finally {
        showLoading(false);
    }
}

// --- 카테고리 기능 ---
async function populateCategories() {
    if (allCategories.length > 0) return; // 이미 로드되었다면 다시 실행하지 않음

    try {
        const res = await fetch(API_URL_LIST_CATEGORIES);
        const data = await res.json();
        if (data.meals) {
            allCategories = data.meals;
        }
    } catch (e) {
        console.error("Failed to populate categories:", e);
    }
}

function showCategoryList() {
    if (allCategories.length === 0) {
        showError("Could not load categories.");
        return;
    }

    categoryDropdown.innerHTML = ''; // 드롭다운 메뉴 초기화

    // 'All Categories' 옵션 추가
    const allCategoriesLink = document.createElement('a');
    allCategoriesLink.href = '#';
    allCategoriesLink.textContent = 'All Categories';
    allCategoriesLink.dataset.category = ''; // 빈 값으로 설정하여 필터 해제용으로 사용
    categoryDropdown.appendChild(allCategoriesLink);

    allCategories.forEach(category => {
        const categoryLink = document.createElement('a');
        categoryLink.href = '#';
        categoryLink.textContent = category.strCategory;
        categoryLink.dataset.category = category.strCategory;
        categoryDropdown.appendChild(categoryLink);
    });

    categoryDropdown.classList.toggle('hidden');
}

// --- DOM 출력 및 관리 ---
function displayResults(meals) {
    clearResults();
    meals.forEach(meal => {
        // 필터링 API는 전체 정보를 주지 않으므로, id로 다시 조회해야 할 수 있음
        // 여기서는 간소화를 위해 filter API가 주는 정보만으로 카드를 만듭니다.
        const card = document.createElement("div");
        card.classList.add("card");
        const isFavorited = favorites.includes(meal.idMeal);

        card.innerHTML = `
            <img src="${meal.strMealThumb}" alt="${meal.strMeal}">
            <div class="card-content">
                <div class="card-title">${meal.strMeal}</div>
                <div class="card-actions">
                    <a href="#" class="view-recipe-btn" data-id="${meal.idMeal}">View Recipe →</a>
                    <div class="card-buttons">
                        <button class="fav-btn" data-id="${meal.idMeal}" title="Add to Favorites">
                            <svg class="star-icon ${isFavorited ? 'favorited' : ''}" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                        </button>
                        <button class="share-btn icon-btn" data-id="${meal.idMeal}" title="Share Recipe">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.72"></path></svg>
                        </button> 
                    </div>
                </div>
            </div>
        `;
        resultsDiv.appendChild(card);
    });
}

// --- 이벤트 리스너 설정 ---
function setupEventListeners() {
    searchBtn.addEventListener("click", searchRecipes);
    searchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") searchRecipes();
    });

    // 검색창이 비워지면 결과 숨기기
    searchInput.addEventListener("input", () => {
        if (searchInput.value.trim() === "") {
            clearResults();
            clearError();
            resultsHeader.classList.add('hidden'); // 제목 컨테이너 숨기기
        }
    });
    showFavsBtn.addEventListener('click', displayFavoriteRecipes);

    // 카테고리 필터 버튼 클릭: 카테고리 목록 표시
    categoryFilterBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // 이벤트 전파 중단
        showCategoryList();
    });

    // 카테고리 드롭다운에서 항목 클릭: 해당 카테고리로 검색
    categoryDropdown.addEventListener('click', (e) => {
        e.preventDefault();
        if (e.target.tagName === 'A') {
            selectedCategory = e.target.dataset.category || null;
            categoryDropdown.classList.add('hidden');
            categoryFilterBtn.classList.toggle('active', !!selectedCategory);
            searchRecipes();
        }
    });

    // 화면의 다른 곳을 클릭하면 드롭다운을 닫습니다.
    window.addEventListener('click', () => {
        if (!categoryDropdown.classList.contains('hidden')) {
            categoryDropdown.classList.add('hidden');
        }
    });

    // 이벤트 위임: 결과 카드 내 버튼 클릭 처리
    resultsDiv.addEventListener("click", (e) => {
        const favBtn = e.target.closest('.fav-btn');
        if (favBtn) {
            const mealId = favBtn.dataset.id;
            toggleFavorite(mealId, favBtn);
        }
        const shareBtn = e.target.closest('.share-btn');
        if (shareBtn) {
            const mealId = shareBtn.dataset.id;
            shareRecipe(mealId);
        }
        if (e.target.classList.contains("view-recipe-btn")) {
            e.preventDefault();
            // 상세 보기 로직 필요
            alert(`상세보기 기능 구현 필요: ${e.target.dataset.id}`);
        }
    });
}

/**
 * 즐겨찾기 상태를 토글하고 UI를 업데이트합니다.
 * @param {string} mealId - 레시피 ID
 * @param {HTMLElement} btn - 클릭된 버튼 요소
 */
function toggleFavorite(mealId, btn) {
    const starIcon = btn.querySelector('.star-icon');
    const index = favorites.indexOf(mealId);

    if (index > -1) { // 이미 즐겨찾기 상태일 때 (제거 로직)
        // 현재 즐겨찾기 목록을 보고 있을 때만 확인 창을 띄움
        if (resultsTitle.textContent === "Favorite Recipes") {
            const confirmRemove = confirm("Are you sure you want to remove this from your favorites?");
            if (confirmRemove) {
                favorites.splice(index, 1);
                localStorage.setItem('favoriteRecipes', JSON.stringify(favorites));
                // 카드 요소를 즉시 DOM에서 제거
                btn.closest('.card').remove();
            }
        } else { // 일반 검색 결과에서는 확인 없이 바로 제거
            favorites.splice(index, 1);
            starIcon.classList.remove('favorited');
            localStorage.setItem('favoriteRecipes', JSON.stringify(favorites));
        }
    } else { // 즐겨찾기 상태가 아닐 때 (추가 로직)
        favorites.push(mealId);
        starIcon.classList.add('favorited');
        localStorage.setItem('favoriteRecipes', JSON.stringify(favorites));
    }
}

/**
 * 레시피 링크를 공유합니다.
 * @param {string} mealId - 레시피 ID
 */
async function shareRecipe(mealId) {
    try {
        const res = await fetch(`${API_URL_LOOKUP}${mealId}`);
        const data = await res.json();
        const meal = data.meals[0];

        if (!meal) throw new Error("Recipe details not found.");

        const link = meal.strSource || meal.strYoutube;
        const title = meal.strMeal;

        if (!link) {
            alert("No recipe link available to share.");
            return;
        }

        if (navigator.share) { // Web Share API (모바일)
            await navigator.share({
                title: `Recipe: ${title}`,
                text: `Check out this recipe for ${title}!`,
                url: link,
            });
        } else { // 클립보드 복사 (데스크톱)
            await navigator.clipboard.writeText(link);
            alert(`Recipe link copied to clipboard!\n${link}`);
        }
    } catch (error) {
        console.error('Error sharing:', error);
        alert("Failed to share recipe.");
    }
}

// --- 앱 초기화 ---
function init() {
    populateCategories();
    // searchRecipes(); // 페이지 로드 시 검색하지 않도록 주석 처리
    setupEventListeners();
}

init();