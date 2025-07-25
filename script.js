// ========== CHAVES DAS APIS ========== 
const accessKeys = {
  unsplash: "xkTwoh10bhJJ8oiF0kytmOGBO5W1lgq87q1wDig-iDA",
  pexels: "Cq3ubmCP0npF56bhKZt7RE8pRg7gvYPr5Mvmk08l4jJ9MaHy0kCn6WyN",
};

// ========== ELEMENTOS DOM ========== 
const gallery = document.getElementById("gallery");
const loader = document.getElementById("loader");
const categoryButtons = document.querySelectorAll(".filter-buttons button:not(#favorites-btn)");
const favoritesBtn = document.getElementById("favorites-btn");
const apiButtons = document.querySelectorAll(".api-buttons button");
const searchInput = document.getElementById("search-input");
const orientationFilter = document.getElementById("orientation-filter");
const colorFilter = document.getElementById("color-filter");
const orderFilter = document.getElementById("order-filter");
const themeToggle = document.getElementById("toggle-theme");

let currentCategory = "nature";
let currentAPI = "unsplash";
let page = 1;
let isLoading = false;
let showingFavorites = false;
let searchTerm = "";

// ========== FAVORITOS ========== 
function getFavorites() {
  const favs = localStorage.getItem("favorites");
  return favs ? JSON.parse(favs) : [];
}

function saveFavorites(favorites) {
  localStorage.setItem("favorites", JSON.stringify(favorites));
}

function isFavorited(url) {
  return getFavorites().includes(url);
}

function toggleFavorite(url, iconElement) {
  let favs = getFavorites();
  if (favs.includes(url)) {
    favs = favs.filter(f => f !== url);
    iconElement.classList.remove("favorited");
  } else {
    favs.push(url);
    iconElement.classList.add("favorited");
  }
  saveFavorites(favs);
}

// ========== RENDER ========== 
function renderImages(images, orientation = "") {
  if (page === 1 && !showingFavorites) gallery.innerHTML = "";

  images.forEach(url => {
    const item = document.createElement("div");
    item.className = "item";

    if (orientation === "landscape") item.classList.add("landscape");
    else if (orientation === "portrait") item.classList.add("portrait");

    const img = document.createElement("img");
    img.src = url;
    img.alt = "Imagem";
    img.loading = "lazy";
    img.onerror = () => item.remove();

    const favIcon = document.createElement("span");
    favIcon.className = `favorite-icon ${isFavorited(url) ? "favorited" : ""}`;
    favIcon.innerHTML = "&#10084;";
    favIcon.addEventListener("click", e => toggleFavorite(url, e.target));

    const actionIcons = document.createElement("div");
    actionIcons.className = "action-icons";
    actionIcons.innerHTML = `
      <a href="${url}" download class="download-icon" title="Baixar imagem">
        <i class="fas fa-download"></i>
      </a>
      <span class="share-icon" title="Compartilhar">&#128257;</span>
    `;

    const sharePopup = document.createElement("div");
    sharePopup.className = "share-popup";
    sharePopup.innerHTML = `
      <a href="#" class="share-facebook" target="_blank" rel="noopener noreferrer"><i class="fab fa-facebook-f"></i></a>
      <a href="#" class="share-twitter" target="_blank" rel="noopener noreferrer"><i class="fab fa-twitter"></i></a>
      <a href="#" class="share-whatsapp" target="_blank" rel="noopener noreferrer"><i class="fab fa-whatsapp"></i></a>
    `;

    const encodedUrl = encodeURIComponent(url);
    const encodedText = encodeURIComponent("Olha essa imagem incrível!");
    sharePopup.querySelector(".share-facebook").href = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    sharePopup.querySelector(".share-twitter").href = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`;
    sharePopup.querySelector(".share-whatsapp").href = `https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`;

    actionIcons.querySelector(".share-icon").addEventListener("click", () => {
      document.querySelectorAll(".share-popup.visible").forEach(p => {
        if (p !== sharePopup) p.classList.remove("visible");
      });
      sharePopup.classList.toggle("visible");
    });

    item.appendChild(img);
    item.appendChild(favIcon);
    item.appendChild(actionIcons);
    item.appendChild(sharePopup);
    gallery.appendChild(item);
  });
}

function showLoader() { loader.style.display = "block"; }
function hideLoader() { loader.style.display = "none"; }


// ========== API ==========
async function fetchImages(api, query, pageNumber = 1) {
  if (isLoading || showingFavorites) return;
  isLoading = true;
  showLoader();

  try {
    let response, data;
    const orientation = orientationFilter.value;
    const color = colorFilter.value;
    const order = orderFilter.value;

    switch (api) {
      case "unsplash":
        let urlU = `https://api.unsplash.com/search/photos?query=${query}&per_page=9&page=${pageNumber}&client_id=${accessKeys.unsplash}`;
        if (orientation) urlU += `&orientation=${orientation}`;
        if (color) urlU += `&color=${color}`;
        if (order) urlU += `&order_by=${order}`;
        response = await fetch(urlU);
        data = await response.json();
        renderImages(data.results.map(img => img.urls.regular), orientation);
        break;

      case "pexels":
        let urlP = `https://api.pexels.com/v1/search?query=${query}&per_page=9&page=${pageNumber}`;
        if (orientation) urlP += `&orientation=${orientation}`;
        response = await fetch(urlP, {
          headers: { Authorization: accessKeys.pexels }
        });
        data = await response.json();
        renderImages(data.photos.map(img => img.src.medium), orientation);
        break;

      case "pixabay":
        let urlX = `https://pixabay.com/api/?key=${accessKeys.pixabay}&q=${query}&image_type=photo&per_page=9&page=${pageNumber}`;
        if (orientation === "landscape") urlX += `&orientation=horizontal`;
        else if (orientation === "portrait") urlX += `&orientation=vertical`;
        if (order) urlX += `&order=${order}`;
        response = await fetch(urlX);
        data = await response.json();
        renderImages(data.hits.map(img => img.webformatURL), orientation);
        break;
    }
  } catch (err) {
    console.error(err);
    gallery.innerHTML = "<p>Erro ao carregar imagens.</p>";
  } finally {
    hideLoader();
    isLoading = false;

    // Corrige problema quando não tem scroll suficiente para ativar carregamento infinito
    if (document.body.offsetHeight < window.innerHeight && !showingFavorites) {
      page++;
      fetchImages(currentAPI, searchTerm || currentCategory, page);
    }
  }
}

function fetchFavorites() {
  const favs = getFavorites();
  gallery.innerHTML = "";
  if (favs.length === 0) {
    gallery.innerHTML = "<p>Você ainda não tem favoritos.</p>";
    return;
  }
  renderImages(favs);
}

// ========== EVENTOS ==========
categoryButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    showingFavorites = false;
    favoritesBtn.classList.remove("active");
    searchTerm = "";
    searchInput.value = "";
    categoryButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentCategory = btn.dataset.category;
    page = 1;
    gallery.innerHTML = "";
    fetchImages(currentAPI, currentCategory, page);
  });
});

favoritesBtn.addEventListener("click", () => {
  showingFavorites = !showingFavorites;
  favoritesBtn.classList.toggle("active");
  categoryButtons.forEach(b => b.classList.remove("active"));
  searchInput.value = "";
  searchTerm = "";
  gallery.innerHTML = "";
  if (showingFavorites) fetchFavorites();
  else fetchImages(currentAPI, currentCategory, (page = 1));
});

apiButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    if (showingFavorites) return;
    apiButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentAPI = btn.dataset.api;
    page = 1;
    gallery.innerHTML = "";
    fetchImages(currentAPI, searchTerm || currentCategory, page);
  });
});

let searchTimeout;
searchInput.addEventListener("input", () => {
  clearTimeout(searchTimeout);
  searchTerm = searchInput.value.trim();
  if (showingFavorites) return;
  page = 1;
  searchTimeout = setTimeout(() => {
    gallery.innerHTML = "";
    fetchImages(currentAPI, searchTerm || currentCategory, page);
  }, 500);
});

[orientationFilter, colorFilter, orderFilter].forEach(filter => {
  filter.addEventListener("change", () => {
    if (showingFavorites) return;
    page = 1;
    gallery.innerHTML = "";
    fetchImages(currentAPI, searchTerm || currentCategory, page);
  });
});

window.addEventListener("scroll", () => {
  if (showingFavorites) return;
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 100) {
    page++;
    fetchImages(currentAPI, searchTerm || currentCategory, page);
  }
});

themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
  const darkMode = document.body.classList.contains("dark-mode");
  themeToggle.textContent = darkMode ? "☀️ Tema Claro" : "🌙 Tema Escuro";
  localStorage.setItem("darkMode", darkMode);
});

window.addEventListener("DOMContentLoaded", () => {
  const darkMode = localStorage.getItem("darkMode") === "true";
  if (darkMode) {
    document.body.classList.add("dark-mode");
    themeToggle.textContent = "☀️ Tema Claro";
  }
  fetchImages(currentAPI, currentCategory, page);
});
