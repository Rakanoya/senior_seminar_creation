const generateBtn = document.getElementById('generateBtn');
const breedSelect = document.getElementById('breedSelect');
const loading = document.getElementById('loading');
const resultSection = document.getElementById('resultSection');
const resultImage = document.getElementById('resultImage');
const errorDiv = document.getElementById('error');

// Load breeds on page load
document.addEventListener('DOMContentLoaded', loadBreeds);
generateBtn.addEventListener('click', generateDogImage);

async function loadBreeds() {
    try {
        const response = await fetch('https://dog.ceo/api/breeds/list/all');
        const data = await response.json();
        
        if (data.status === 'success') {
            const breeds = Object.keys(data.message).sort();
            
            breedSelect.innerHTML = '<option value="">Select a breed...</option>';
            breeds.forEach(breed => {
                const option = document.createElement('option');
                option.value = breed;
                option.textContent = breed.charAt(0).toUpperCase() + breed.slice(1);
                breedSelect.appendChild(option);
            });
        }
    } catch (error) {
        showError('Failed to load dog breeds. Please refresh the page.');
    }
}

async function generateDogImage() {
    const breed = breedSelect.value;
    
    if (!breed) {
        showError('Please select a dog breed!');
        return;
    }

    // Clear previous results
    errorDiv.style.display = 'none';
    resultSection.style.display = 'none';
    
    // Show loading state
    loading.style.display = 'block';
    generateBtn.disabled = true;

    try {
        const response = await fetch(`https://dog.ceo/api/breed/${breed}/images/random`);
        const data = await response.json();
        
        if (data.status === 'success') {
            resultImage.src = data.message;
            resultSection.style.display = 'block';
            loading.style.display = 'none';
        } else {
            throw new Error('Failed to fetch dog image');
        }
        
    } catch (error) {
        showError('Error fetching dog image. Please try again.');
        loading.style.display = 'none';
    } finally {
        generateBtn.disabled = false;
    }
}

function showError(message) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}
