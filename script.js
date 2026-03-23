const generateBtn = document.getElementById('generateBtn');
const anotherBtn = document.getElementById('anotherBtn');
const breedSelect = document.getElementById('breedSelect');
const loading = document.getElementById('loading');
const loadingText = document.getElementById('loadingText');
const resultSection = document.getElementById('resultSection');
const resultImage = document.getElementById('resultImage');
const favoriteBtn = document.getElementById('favoriteBtn');
const favoritesList = document.getElementById('favoritesList');
const clearFavoritesBtn = document.getElementById('clearFavoritesBtn');
const emptyFavorites = document.getElementById('emptyFavorites');
const errorDiv = document.getElementById('error');

const BREEDS_CACHE_KEY = 'dog-breeds-cache-v1';
const BREEDS_CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const FAVORITES_KEY = 'favorite-dog-images-v1';
const REQUEST_TIMEOUT_MS = 12000;

let currentBreed = '';
let currentImageUrl = '';
let favorites = loadFavorites();

// Load breeds on page load
document.addEventListener('DOMContentLoaded', loadBreeds);
generateBtn.addEventListener('click', () => generateDogImage(false));
anotherBtn.addEventListener('click', () => generateDogImage(true));
favoriteBtn.addEventListener('click', saveCurrentFavorite);
clearFavoritesBtn.addEventListener('click', clearFavorites);

async function loadBreeds() {
    try {
        setLoadingState(true, 'Loading breeds...');
        clearError();

        const cached = getCachedBreeds();
        if (cached.length) {
            populateBreeds(cached);
            setLoadingState(false);
            return;
        }

        const data = await fetchJson('https://dog.ceo/api/breeds/list/all');
        
        if (data.status === 'success') {
            const breeds = Object.keys(data.message).sort();
            setCachedBreeds(breeds);
            populateBreeds(breeds);
        } else {
            throw new Error('API_ERROR');
        }
    } catch (error) {
        showError(getUserFriendlyError(error, 'Failed to load dog breeds. Please refresh the page.'));
    } finally {
        setLoadingState(false);
    }
}

async function generateDogImage(useCurrentBreed = false) {
    const breed = useCurrentBreed ? currentBreed : breedSelect.value;
    
    if (!breed) {
        showError('Please select a dog breed!');
        return;
    }

    currentBreed = breed;
    clearError();
    resultSection.classList.add('hidden');
    
    setLoadingState(true, `Fetching a ${capitalize(breed)}...`);
    generateBtn.disabled = true;
    anotherBtn.disabled = true;
    favoriteBtn.disabled = true;

    try {
        const data = await fetchJson(`https://dog.ceo/api/breed/${breed}/images/random`);
        
        if (data.status === 'success' && typeof data.message === 'string' && data.message.length > 0) {
            currentImageUrl = data.message;
            resultImage.src = data.message;
            resultImage.alt = `Random ${capitalize(breed)} dog image`;
            resultSection.classList.remove('hidden');
            favoriteBtn.disabled = isFavorite(currentImageUrl);
        } else {
            throw new Error('API_ERROR');
        }
        
    } catch (error) {
        showError(getUserFriendlyError(error, 'Error fetching dog image. Please try again.'));
    } finally {
        setLoadingState(false);
        generateBtn.disabled = false;
        anotherBtn.disabled = !currentBreed;
    }
}

function showError(message) {
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
}

function clearError() {
    errorDiv.textContent = '';
    errorDiv.classList.add('hidden');
}

function setLoadingState(isLoading, message = 'Loading...') {
    if (isLoading) {
        loadingText.textContent = message;
        loading.classList.remove('hidden');
    } else {
        loading.classList.add('hidden');
    }
}

function populateBreeds(breeds) {
    breedSelect.innerHTML = '<option value="">Select a breed...</option>';
    breeds.forEach((breed) => {
        const option = document.createElement('option');
        option.value = breed;
        option.textContent = capitalize(breed);
        breedSelect.appendChild(option);
    });
}

async function fetchJson(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(url, { signal: controller.signal });

        if (!response.ok) {
            throw new Error(`HTTP_${response.status}`);
        }

        return await response.json();
    } finally {
        clearTimeout(timeout);
    }
}

function getUserFriendlyError(error, fallback) {
    if (error.name === 'AbortError') {
        return 'Request timed out. Please check your connection and try again.';
    }

    if (error.message && error.message.startsWith('HTTP_')) {
        return 'Service is temporarily unavailable. Please try again shortly.';
    }

    return navigator.onLine ? fallback : 'You appear to be offline. Please reconnect and try again.';
}

function getCachedBreeds() {
    try {
        const raw = localStorage.getItem(BREEDS_CACHE_KEY);
        if (!raw) {
            return [];
        }

        const parsed = JSON.parse(raw);
        const isFresh = Date.now() - parsed.savedAt < BREEDS_CACHE_TTL_MS;

        if (!Array.isArray(parsed.breeds) || !isFresh) {
            return [];
        }

        return parsed.breeds;
    } catch {
        return [];
    }
}

function setCachedBreeds(breeds) {
    try {
        localStorage.setItem(BREEDS_CACHE_KEY, JSON.stringify({
            savedAt: Date.now(),
            breeds
        }));
    } catch {
        // Ignore cache write errors (e.g., private browsing quota restrictions).
    }
}

function loadFavorites() {
    try {
        const raw = localStorage.getItem(FAVORITES_KEY);
        const parsed = raw ? JSON.parse(raw) : [];

        if (!Array.isArray(parsed)) {
            return [];
        }

        // Backward-compatible normalization: tolerate older string[] or malformed entries.
        return parsed
            .map((item) => {
                if (typeof item === 'string') {
                    return { url: item, breed: 'Unknown', savedAt: Date.now() };
                }

                if (!item || typeof item !== 'object' || typeof item.url !== 'string' || !item.url) {
                    return null;
                }

                return {
                    url: item.url,
                    breed: typeof item.breed === 'string' && item.breed ? item.breed : 'Unknown',
                    savedAt: typeof item.savedAt === 'number' ? item.savedAt : Date.now()
                };
            })
            .filter(Boolean);
    } catch {
        return [];
    }
}

function persistFavorites() {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
}

function saveCurrentFavorite() {
    if (!currentImageUrl || isFavorite(currentImageUrl)) {
        return;
    }

    favorites.unshift({
        url: currentImageUrl,
        breed: currentBreed,
        savedAt: Date.now()
    });

    favorites = favorites.slice(0, 20);
    persistFavorites();
    renderFavorites();
    favoriteBtn.disabled = true;
}

function removeFavorite(url) {
    favorites = favorites.filter((item) => item.url !== url);
    persistFavorites();
    renderFavorites();
    favoriteBtn.disabled = isFavorite(currentImageUrl);
}

function clearFavorites() {
    favorites = [];
    persistFavorites();
    renderFavorites();
    favoriteBtn.disabled = isFavorite(currentImageUrl);
}

function renderFavorites() {
    favoritesList.innerHTML = '';

    if (!favorites.length) {
        emptyFavorites.classList.remove('hidden');
        clearFavoritesBtn.disabled = true;
        return;
    }

    emptyFavorites.classList.add('hidden');
    clearFavoritesBtn.disabled = false;

    favorites.forEach((item) => {
        if (!item || typeof item.url !== 'string' || !item.url) {
            return;
        }

        const li = document.createElement('li');
        li.className = 'favorite-item';

        const image = document.createElement('img');
        image.src = item.url;
        image.alt = `${capitalize(item.breed)} favorite image`;

        const meta = document.createElement('div');
        meta.className = 'favorite-meta';

        const breed = document.createElement('p');
        breed.className = 'favorite-breed';
        breed.textContent = capitalize(item.breed);

        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'tertiary';
        removeButton.textContent = 'Remove';
        removeButton.addEventListener('click', () => removeFavorite(item.url));

        meta.appendChild(breed);
        meta.appendChild(removeButton);

        li.appendChild(image);
        li.appendChild(meta);
        favoritesList.appendChild(li);
    });
}

function isFavorite(url) {
    return favorites.some((item) => item.url === url);
}

function capitalize(value) {
    const normalized = typeof value === 'string' ? value : '';
    if (!normalized) {
        return 'Unknown';
    }

    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

renderFavorites();
