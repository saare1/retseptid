// DOM Elements
const recipesList = document.getElementById('recipesList');
const searchBox = document.getElementById('searchBox');
const sortOptions = document.getElementById('sortOptions');
const pagination = document.getElementById('pagination');
const currentYear = document.getElementById('current-year');

// Set current year in footer
currentYear.textContent = new Date().getFullYear();

// Recipe data will be stored in localStorage
const STORAGE_KEY = 'mom_recipes';
const BACKUP_STORAGE_KEY = 'mom_recipes_backup';
// Maximum image size (in pixels) for storage
const MAX_IMAGE_WIDTH = 600;
const MAX_IMAGE_HEIGHT = 600;
// JPEG Quality (0-1)
const IMAGE_QUALITY = 0.5;
// Maximum number of high-res images per recipe
const MAX_IMAGES_PER_RECIPE = 3;
// Maximum file size in bytes (3MB)
const MAX_FILE_SIZE = 3 * 1024 * 1024;
// Auto-save interval (in milliseconds)
const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

let recipes = [];
let currentPage = 1;
const recipesPerPage = 6;
let autoSaveTimer = null;
let isDirty = false;

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    loadRecipes();
    
    // Setup event listeners based on the current page
    if (window.location.pathname.includes('index.html') || window.location.pathname.endsWith('/') || window.location.pathname === '') {
        setupHomePageEvents();
    } else if (window.location.pathname.includes('add-recipe.html')) {
        setupAddRecipeEvents();
        setupAutoSave();
        
        // Pre-fill the form if we're in edit mode
        const urlParams = new URLSearchParams(window.location.search);
        const recipeId = urlParams.get('edit');
        if (recipeId) {
            fillFormForEditing(recipeId);
        } else {
            // Set today's date as default for new recipes
            const today = new Date();
            const formattedDate = today.toISOString().split('T')[0];
            document.getElementById('recipeDate').value = formattedDate;
        }
    } else if (window.location.pathname.includes('recipe-details.html')) {
        const urlParams = new URLSearchParams(window.location.search);
        const recipeId = urlParams.get('id');
        if (recipeId) {
            displayRecipeDetails(recipeId);
            setupRecipeDetailsEvents(recipeId);
        } else {
            window.location.href = 'index.html';
        }
    }
});

// Check available storage space
function checkStorageSpace() {
    let totalSize = 0;
    for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
            totalSize += localStorage[key].length * 2; // in bytes
        }
    }
    const remainingSpace = 5 * 1024 * 1024 - totalSize; // Estimate 5MB limit
    return {
        used: totalSize / (1024 * 1024), // in MB
        remaining: remainingSpace / (1024 * 1024), // in MB
        total: 5, // estimated total in MB
        hasEnoughSpace: remainingSpace > 100 * 1024 // at least 100KB remaining
    };
}

// Load recipes from localStorage
function loadRecipes() {
    try {
        // Try loading from primary storage
        const storedRecipes = localStorage.getItem(STORAGE_KEY);
        if (storedRecipes) {
            recipes = JSON.parse(storedRecipes);
            // Create backup after successful load
            localStorage.setItem(BACKUP_STORAGE_KEY, storedRecipes);
            return;
        }

        // If primary storage fails, try loading from backup
        const backupRecipes = localStorage.getItem(BACKUP_STORAGE_KEY);
        if (backupRecipes) {
            recipes = JSON.parse(backupRecipes);
            // Restore primary storage from backup
            localStorage.setItem(STORAGE_KEY, backupRecipes);
            return;
        }

        // If no storage exists, start with empty array
        recipes = [];
    } catch (error) {
        console.error('Error loading recipes:', error);
        // Try loading from backup if primary load fails
        try {
            const backupRecipes = localStorage.getItem(BACKUP_STORAGE_KEY);
            if (backupRecipes) {
                recipes = JSON.parse(backupRecipes);
                return;
            }
        } catch (backupError) {
            console.error('Error loading backup recipes:', backupError);
        }
        recipes = [];
    }
}

// Save recipes to localStorage
function saveRecipes() {
    try {
        const recipesJSON = JSON.stringify(recipes);
        
        // Save to primary storage
        localStorage.setItem(STORAGE_KEY, recipesJSON);
        
        // Create backup
        localStorage.setItem(BACKUP_STORAGE_KEY, recipesJSON);
        
        // Clear any existing draft
        localStorage.removeItem('recipe_draft');
        
        return { success: true };
    } catch (error) {
        console.error('Error saving recipes:', error);
        
        // Handle storage quota exceeded
        if (error.name === 'QuotaExceededError' || error.message.includes('quota')) {
            return { 
                success: false, 
                error: 'storage_full',
                message: 'Mäluruum on täis. Proovi kustutada mõned vanad retseptid või kasuta vähem pilte.'
            };
        }
        
        return { 
            success: false, 
            error: 'general',
            message: error.message
        };
    }
}

// Home page event setup
function setupHomePageEvents() {
    displayRecipes();
    
    // Search functionality
    if (searchBox) {
        searchBox.addEventListener('input', function() {
            currentPage = 1;
            displayRecipes();
        });
    }
    
    // Sorting functionality
    if (sortOptions) {
        sortOptions.addEventListener('change', function() {
            currentPage = 1;
            displayRecipes();
        });
    }
}

// Display recipes with filtering, sorting and pagination
function displayRecipes() {
    if (!recipesList) return;
    
    // Filter recipes if search text exists
    let filteredRecipes = recipes;
    const searchText = searchBox ? searchBox.value.toLowerCase() : '';
    
    if (searchText) {
        filteredRecipes = recipes.filter(recipe => 
            recipe.title.toLowerCase().includes(searchText) || 
            recipe.instructions.toLowerCase().includes(searchText) ||
            recipe.notes.toLowerCase().includes(searchText)
        );
    }
    
    // Sort recipes based on selected option
    const sortOption = sortOptions ? sortOptions.value : 'date-desc';
    
    switch (sortOption) {
        case 'date-desc':
            filteredRecipes.sort((a, b) => new Date(b.date) - new Date(a.date));
            break;
        case 'date-asc':
            filteredRecipes.sort((a, b) => new Date(a.date) - new Date(b.date));
            break;
        case 'rating-desc':
            filteredRecipes.sort((a, b) => b.rating - a.rating);
            break;
        case 'rating-asc':
            filteredRecipes.sort((a, b) => a.rating - b.rating);
            break;
    }
    
    // Calculate pagination
    const totalPages = Math.ceil(filteredRecipes.length / recipesPerPage);
    const startIndex = (currentPage - 1) * recipesPerPage;
    const paginatedRecipes = filteredRecipes.slice(startIndex, startIndex + recipesPerPage);
    
    // Generate HTML for recipes
    if (filteredRecipes.length === 0) {
        recipesList.innerHTML = `
            <div class="recipe-card empty-state">
                <p>${searchText ? 'Otsingu tulemusi ei leitud.' : 'Retsepte pole veel lisatud. Vajuta "Lisa Uus Retsept" oma esimese retsepti lisamiseks!'}</p>
            </div>
        `;
    } else {
        recipesList.innerHTML = paginatedRecipes.map(recipe => {
            const firstImage = recipe.images && recipe.images.length > 0 ? recipe.images[0] : null;
            const imageHtml = firstImage ? 
                `<img src="${firstImage}" alt="${recipe.title}" loading="lazy">` : 
                `<div class="no-image">Pilt puudub</div>`;
            
            const stars = generateStarRating(recipe.rating);
            
            const preview = recipe.instructions.length > 100 ? 
                recipe.instructions.substring(0, 100) + '...' : 
                recipe.instructions;
            
            return `
                <div class="recipe-card">
                    ${imageHtml}
                    <div class="recipe-card-content">
                        <h3>${recipe.title}</h3>
                        <div class="recipe-meta">${formatDate(recipe.date)}</div>
                        <div class="recipe-rating">${stars}</div>
                        <div class="recipe-preview">${preview}</div>
                        <a href="recipe-details.html?id=${recipe.id}" class="btn primary-btn">Vaata Retsepti</a>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    updatePagination(totalPages);
}

// Generate pagination controls
function updatePagination(totalPages) {
    if (!pagination) return;
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let paginationHtml = '';
    
    // Previous button
    paginationHtml += `
        <button class="pagination-btn prev-btn" ${currentPage === 1 ? 'disabled' : ''}>
            <i class="fas fa-chevron-left"></i>
        </button>
    `;
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        paginationHtml += `
            <button class="pagination-btn page-number ${currentPage === i ? 'active' : ''}" data-page="${i}">
                ${i}
            </button>
        `;
    }
    
    // Next button
    paginationHtml += `
        <button class="pagination-btn next-btn" ${currentPage === totalPages ? 'disabled' : ''}>
            <i class="fas fa-chevron-right"></i>
        </button>
    `;
    
    pagination.innerHTML = paginationHtml;
    
    // Add event listeners to pagination buttons
    const pageButtons = pagination.querySelectorAll('.page-number');
    pageButtons.forEach(button => {
        button.addEventListener('click', function() {
            currentPage = parseInt(this.dataset.page);
            displayRecipes();
            window.scrollTo(0, 0);
        });
    });
    
    const prevButton = pagination.querySelector('.prev-btn');
    if (prevButton) {
        prevButton.addEventListener('click', function() {
            if (currentPage > 1) {
                currentPage--;
                displayRecipes();
                window.scrollTo(0, 0);
            }
        });
    }
    
    const nextButton = pagination.querySelector('.next-btn');
    if (nextButton) {
        nextButton.addEventListener('click', function() {
            if (currentPage < totalPages) {
                currentPage++;
                displayRecipes();
                window.scrollTo(0, 0);
            }
        });
    }
}

// Add Recipe page event setup
function setupAddRecipeEvents() {
    const recipeForm = document.getElementById('recipeForm');
    const starRating = document.querySelector('.star-rating');
    const imagePreviewArea = document.getElementById('imagePreviewArea');
    const recipeImages = document.getElementById('recipeImages');
    const cancelBtn = document.getElementById('cancelBtn');
    const saveBtn = document.querySelector('button[type="submit"]');
    
    // Star rating functionality
    if (starRating) {
        const stars = starRating.querySelectorAll('i');
        stars.forEach(star => {
            star.addEventListener('click', function() {
                const rating = parseInt(this.dataset.rating);
                document.getElementById('recipeRating').value = rating;
                
                // Update star display
                stars.forEach(s => {
                    const starRating = parseInt(s.dataset.rating);
                    if (starRating <= rating) {
                        s.classList.remove('far');
                        s.classList.add('fas');
                    } else {
                        s.classList.remove('fas');
                        s.classList.add('far');
                    }
                });
            });
        });
    }
    
    // Image upload functionality
    if (imagePreviewArea && recipeImages) {
        imagePreviewArea.addEventListener('click', function() {
            recipeImages.click();
        });
        
        recipeImages.addEventListener('change', handleImageUpload);
    }
    
    // Add iOS-specific save button click handler
    if (saveBtn) {
        saveBtn.addEventListener('click', function(e) {
            e.preventDefault();
            saveRecipe();
        });
    }
    
    // Form submission
    if (recipeForm) {
        recipeForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveRecipe();
        });
    }
    
    // Cancel button
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function() {
            window.location.href = 'index.html';
        });
    }
    
    // Show storage usage warning if running low on space
    const storageInfo = checkStorageSpace();
    if (storageInfo.remaining < 1) { // Less than 1MB remaining
        const warningHTML = `
            <div class="storage-warning">
                <p><i class="fas fa-exclamation-triangle"></i> Mäluruumi on vähe järel (${storageInfo.remaining.toFixed(1)}MB). 
                Kustuta vanad retseptid või kasuta vähem pilte.</p>
            </div>
        `;
        document.querySelector('.recipe-form-section').insertAdjacentHTML('afterbegin', warningHTML);
    }
}

// Resize and compress an image
function resizeAndCompressImage(imageUrl, callback) {
    const img = new Image();
    img.onload = function() {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Calculate new dimensions while maintaining aspect ratio
        const aspectRatio = width / height;
        
        // More aggressive resizing for larger images
        if (width > MAX_IMAGE_WIDTH || height > MAX_IMAGE_HEIGHT) {
            if (aspectRatio > 1) {
                width = MAX_IMAGE_WIDTH;
                height = Math.round(width / aspectRatio);
            } else {
                height = MAX_IMAGE_HEIGHT;
                width = Math.round(height * aspectRatio);
            }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        // Use better image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        
        // Try progressive compression until size is acceptable
        let quality = IMAGE_QUALITY;
        let compressedImageUrl;
        
        do {
            compressedImageUrl = canvas.toDataURL('image/jpeg', quality);
            // If still too large, reduce quality further
            quality *= 0.8;
        } while (compressedImageUrl.length > MAX_FILE_SIZE && quality > 0.1);
        
        if (compressedImageUrl.length > MAX_FILE_SIZE) {
            callback(null, 'Image too large even after compression');
        } else {
            callback(compressedImageUrl);
        }
    };
    
    img.onerror = function() {
        console.error('Error loading image for compression');
        callback(null, 'Error loading image');
    };
    
    img.src = imageUrl;
}

// Handle image uploads
function handleImageUpload(e) {
    const files = e.target.files;
    const imagePreviewArea = document.getElementById('imagePreviewArea');
    
    if (!files || files.length === 0) return;
    
    // Check if adding these would exceed the max
    const currentImages = imagePreviewArea.querySelectorAll('.image-preview').length;
    if (currentImages + files.length > MAX_IMAGES_PER_RECIPE) {
        alert(`You can only add a maximum of ${MAX_IMAGES_PER_RECIPE} images per recipe. Please select fewer images.`);
        return;
    }
    
    // Clear upload instruction if present
    const uploadInstruction = imagePreviewArea.querySelector('.upload-instruction');
    if (uploadInstruction) {
        uploadInstruction.remove();
    }
    
    // Show loading indicator
    const loadingEl = document.createElement('div');
    loadingEl.classList.add('upload-loading');
    loadingEl.innerHTML = 'Processing images...';
    imagePreviewArea.appendChild(loadingEl);
    
    // Number of processed files
    let processedFiles = 0;
    let errorCount = 0;
    
    // Process each selected file
    Array.from(files).forEach(file => {
        // Check initial file size
        if (file.size > MAX_FILE_SIZE * 2) { // Allow for twice the final size initially
            alert(`Image too large (max ${Math.round(MAX_FILE_SIZE/1024/1024)}MB): ${file.name}`);
            processedFiles++;
            errorCount++;
            if (processedFiles === files.length) {
                loadingEl.remove();
                if (errorCount === files.length) {
                    imagePreviewArea.innerHTML = `
                        <p class="upload-instruction">Tap to add photos</p>
                    `;
                }
            }
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = function(event) {
            const imageUrl = event.target.result;
            
            // Check if the image preview area still exists
            const currentImagePreviewArea = document.getElementById('imagePreviewArea');
            if (!currentImagePreviewArea) return;
            
            // Resize and compress the image
            resizeAndCompressImage(imageUrl, function(compressedImageUrl, error) {
                if (error || !compressedImageUrl) {
                    alert(`Error processing image ${file.name}: ${error || 'Unknown error'}`);
                    errorCount++;
                } else {
                    // Create preview element
                    const previewElement = document.createElement('div');
                    previewElement.classList.add('image-preview');
                    previewElement.innerHTML = `
                        <img src="${compressedImageUrl}" alt="Recipe image preview">
                        <div class="remove-image">
                            <i class="fas fa-times"></i>
                        </div>
                    `;
                    
                    currentImagePreviewArea.appendChild(previewElement);
                    
                    // Add remove functionality
                    const removeBtn = previewElement.querySelector('.remove-image');
                    if (removeBtn) {
                        removeBtn.addEventListener('click', function(e) {
                            e.stopPropagation();
                            previewElement.remove();
                            
                            // If no previews left, add back the upload instruction
                            if (currentImagePreviewArea.querySelectorAll('.image-preview').length === 0) {
                                currentImagePreviewArea.innerHTML = `
                                    <p class="upload-instruction">Tap to add photos</p>
                                `;
                            }
                        });
                    }
                }
                
                // Count processed files and remove loading indicator when done
                processedFiles++;
                if (processedFiles === files.length) {
                    const loadingElement = currentImagePreviewArea.querySelector('.upload-loading');
                    if (loadingElement) loadingElement.remove();
                    
                    // If all files failed, show upload instruction again
                    if (errorCount === files.length) {
                        currentImagePreviewArea.innerHTML = `
                            <p class="upload-instruction">Tap to add photos</p>
                        `;
                    }
                }
            });
        };
        
        reader.onerror = function() {
            console.error('Error reading file', file.name);
            errorCount++;
            processedFiles++;
            if (processedFiles === files.length) {
                loadingEl.remove();
                if (errorCount === files.length) {
                    imagePreviewArea.innerHTML = `
                        <p class="upload-instruction">Tap to add photos</p>
                    `;
                }
            }
        };
        
        reader.readAsDataURL(file);
    });
}

// Save a new recipe or update existing one
function saveRecipe() {
    try {
        const saveBtn = document.querySelector('button[type="submit"]');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';
        }
        
        const recipeId = new URLSearchParams(window.location.search).get('edit');
        const title = document.getElementById('recipeTitle').value.trim();
        const date = document.getElementById('recipeDate').value;
        const rating = parseInt(document.getElementById('recipeRating').value) || 0;
        const instructions = document.getElementById('recipeInstructions').value.trim();
        const notes = document.getElementById('recipeNotes').value.trim();
        
        // Validation
        if (!title) {
            alert('Please enter a recipe title');
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = 'Save Recipe';
            }
            return;
        }
        
        if (!date) {
            alert('Please select a date');
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = 'Save Recipe';
            }
            return;
        }
        
        if (!instructions) {
            alert('Please enter recipe instructions');
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = 'Save Recipe';
            }
            return;
        }
        
        // Get all preview images
        const imagePreviews = document.querySelectorAll('.image-preview img');
        const images = Array.from(imagePreviews).map(img => img.src);
        
        // Create or update recipe object
        const recipe = {
            id: recipeId || Date.now().toString(),
            title,
            date,
            rating,
            instructions,
            notes,
            images,
            created: recipeId ? (recipes.find(r => r.id === recipeId)?.created || new Date().toISOString()) : new Date().toISOString(),
            modified: new Date().toISOString()
        };
        
        loadRecipes();
        
        if (recipeId) {
            // Update existing recipe
            const index = recipes.findIndex(r => r.id === recipeId);
            if (index !== -1) {
                recipes[index] = recipe;
            } else {
                recipes.push(recipe); // Fallback if recipe not found
            }
        } else {
            // Add new recipe
            recipes.push(recipe);
        }
        
        const saveResult = saveRecipes();
        
        if (saveResult.success) {
            // Redirect to the recipe details page
            window.location.href = 'recipe-details.html?id=' + recipe.id;
        } else {
            // Handle specific storage quota exceeded error
            if (saveResult.error === 'storage_full') {
                const confirmDownsize = confirm(
                    'Mäluruum on täis. Kas soovid salvestada vähemate piltidega? ' +
                    'Ainult esimene pilt säilitatakse.'
                );
                
                if (confirmDownsize) {
                    // Keep only the first image
                    recipe.images = images.length > 0 ? [images[0]] : [];
                    
                    // Try again with only one image
                    if (recipeId) {
                        const index = recipes.findIndex(r => r.id === recipeId);
                        if (index !== -1) {
                            recipes[index] = recipe;
                        } else {
                            recipes.push(recipe);
                        }
                    } else {
                        recipes.push(recipe);
                    }
                    
                    const retryResult = saveRecipes();
                    
                    if (retryResult.success) {
                        window.location.href = 'recipe-details.html?id=' + recipe.id;
                        return;
                    } else {
                        // Still failed, try with no images
                        recipe.images = [];
                        
                        if (recipeId) {
                            const index = recipes.findIndex(r => r.id === recipeId);
                            if (index !== -1) {
                                recipes[index] = recipe;
                            } else {
                                recipes.push(recipe);
                            }
                        } else {
                            recipes.push(recipe);
                        }
                        
                        const finalAttempt = saveRecipes();
                        
                        if (finalAttempt.success) {
                            alert('Retsept salvestati ilma piltideta mäluruumi piirangute tõttu.');
                            window.location.href = 'recipe-details.html?id=' + recipe.id;
                            return;
                        } else {
                            alert('Retsepti ei saanud salvestada mäluruumi piirangute tõttu. Proovi kustutada mõned vanad retseptid.');
                        }
                    }
                }
            } else {
                alert('Viga retsepti salvestamisel: ' + saveResult.message);
            }
            
            // Re-enable the save button
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = 'Save Recipe';
            }
        }
    } catch (error) {
        console.error('Error saving recipe:', error);
        alert('Error saving recipe: ' + error.message);
        
        // Re-enable the save button
        const saveBtn = document.querySelector('button[type="submit"]');
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Recipe';
        }
    }
}

// Pre-fill form for editing
function fillFormForEditing(recipeId) {
    loadRecipes();
    const recipe = recipes.find(r => r.id === recipeId);
    
    if (!recipe) {
        window.location.href = 'index.html';
        return;
    }
    
    // Update page title
    document.querySelector('h2').textContent = 'Edit Recipe';
    
    // Fill form fields
    document.getElementById('recipeTitle').value = recipe.title || '';
    document.getElementById('recipeDate').value = recipe.date || '';
    document.getElementById('recipeRating').value = recipe.rating || 0;
    document.getElementById('recipeInstructions').value = recipe.instructions || '';
    document.getElementById('recipeNotes').value = recipe.notes || '';
    
    // Update star display
    const stars = document.querySelectorAll('.star-rating i');
    stars.forEach(star => {
        const starRating = parseInt(star.dataset.rating);
        if (starRating <= recipe.rating) {
            star.classList.remove('far');
            star.classList.add('fas');
        }
    });
    
    // Display images
    const imagePreviewArea = document.getElementById('imagePreviewArea');
    if (imagePreviewArea) {
        imagePreviewArea.innerHTML = '';
        
        if (recipe.images && recipe.images.length > 0) {
            recipe.images.forEach(imageUrl => {
                const previewElement = document.createElement('div');
                previewElement.classList.add('image-preview');
                previewElement.innerHTML = `
                    <img src="${imageUrl}" alt="Recipe image preview">
                    <div class="remove-image">
                        <i class="fas fa-times"></i>
                    </div>
                `;
                
                imagePreviewArea.appendChild(previewElement);
                
                // Add remove functionality
                const removeBtn = previewElement.querySelector('.remove-image');
                removeBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    previewElement.remove();
                    
                    // If no previews left, add back the upload instruction
                    if (imagePreviewArea.querySelectorAll('.image-preview').length === 0) {
                        imagePreviewArea.innerHTML = `
                            <p class="upload-instruction">Tap to add photos</p>
                        `;
                    }
                });
            });
        } else {
            imagePreviewArea.innerHTML = `
                <p class="upload-instruction">Tap to add photos</p>
            `;
        }
    }
}

// Display recipe details
function displayRecipeDetails(recipeId) {
    loadRecipes();
    const recipe = recipes.find(r => r.id === recipeId);
    
    if (!recipe) {
        window.location.href = 'index.html';
        return;
    }
    
    const container = document.getElementById('recipeDetailsContainer');
    if (!container) return;
    
    const stars = generateStarRating(recipe.rating);
    
    let imagesHtml = '';
    if (recipe.images && recipe.images.length > 0) {
        imagesHtml = `
            <div class="recipe-images">
                <div class="image-gallery">
                    ${recipe.images.map(img => `
                        <div class="gallery-image">
                            <img src="${img}" alt="${recipe.title}" loading="lazy">
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    container.innerHTML = `
        <h1 class="recipe-title">${recipe.title}</h1>
        
        <div class="recipe-meta-info">
            <div class="recipe-date">Valmistatud: ${formatDate(recipe.date)}</div>
            <div class="recipe-rating-large">${stars}</div>
        </div>
        
        ${imagesHtml}
        
        <div class="recipe-content">
            <div class="recipe-section">
                <h3>Valmistamise Juhend</h3>
                <div class="recipe-instructions">${recipe.instructions}</div>
            </div>
            
            ${recipe.notes ? `
                <div class="recipe-section">
                    <h3>Märkused</h3>
                    <div class="recipe-notes">${recipe.notes}</div>
                </div>
            ` : ''}
        </div>
    `;
}

// Setup recipe details page events
function setupRecipeDetailsEvents(recipeId) {
    const editBtn = document.getElementById('editRecipeBtn');
    const deleteBtn = document.getElementById('deleteRecipeBtn');
    const confirmDeleteModal = document.getElementById('confirmDeleteModal');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    
    if (editBtn) {
        editBtn.addEventListener('click', function() {
            window.location.href = `add-recipe.html?edit=${recipeId}`;
        });
    }
    
    if (deleteBtn && confirmDeleteModal) {
        deleteBtn.addEventListener('click', function() {
            confirmDeleteModal.classList.add('active');
        });
    }
    
    if (cancelDeleteBtn) {
        cancelDeleteBtn.addEventListener('click', function() {
            confirmDeleteModal.classList.remove('active');
        });
    }
    
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', function() {
            deleteRecipe(recipeId);
            window.location.href = 'index.html';
        });
    }
    
    // Make gallery images clickable to view larger
    const galleryImages = document.querySelectorAll('.gallery-image img');
    galleryImages.forEach(img => {
        img.addEventListener('click', function() {
            // Open image in new tab/window
            window.open(this.src, '_blank');
        });
    });
}

// Delete a recipe
function deleteRecipe(recipeId) {
    loadRecipes();
    recipes = recipes.filter(recipe => recipe.id !== recipeId);
    saveRecipes();
}

// Helper function to generate star rating HTML
function generateStarRating(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= rating) {
            stars += '<i class="fas fa-star"></i>';
        } else {
            stars += '<i class="far fa-star"></i>';
        }
    }
    return stars;
}

// Format date for display
function formatDate(dateString) {
    if (!dateString) return 'Kuupäev teadmata';
    
    try {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('et-EE', options);
    } catch (error) {
        console.error('Error formatting date:', error);
        return dateString;
    }
}

// Add this new function for auto-save setup
function setupAutoSave() {
    const form = document.getElementById('recipeForm');
    if (!form) return;

    // Mark form as dirty when changes occur
    const formInputs = form.querySelectorAll('input, textarea, select');
    formInputs.forEach(input => {
        input.addEventListener('change', () => {
            isDirty = true;
        });
        input.addEventListener('keyup', () => {
            isDirty = true;
        });
    });

    // Setup auto-save timer
    autoSaveTimer = setInterval(() => {
        if (isDirty) {
            const draftSave = saveRecipeAsDraft();
            if (draftSave.success) {
                isDirty = false;
                console.log('Draft auto-saved successfully');
            }
        }
    }, AUTO_SAVE_INTERVAL);

    // Save draft when leaving page
    window.addEventListener('beforeunload', (e) => {
        if (isDirty) {
            saveRecipeAsDraft();
        }
    });
}

// Add this new function for saving drafts
function saveRecipeAsDraft() {
    try {
        const recipeId = new URLSearchParams(window.location.search).get('edit');
        const formData = {
            id: recipeId || 'draft_' + Date.now().toString(),
            title: document.getElementById('recipeTitle').value.trim(),
            date: document.getElementById('recipeDate').value,
            rating: parseInt(document.getElementById('recipeRating').value) || 0,
            instructions: document.getElementById('recipeInstructions').value.trim(),
            notes: document.getElementById('recipeNotes').value.trim(),
            images: Array.from(document.querySelectorAll('.image-preview img')).map(img => img.src),
            isDraft: true,
            lastModified: new Date().toISOString()
        };

        localStorage.setItem('recipe_draft', JSON.stringify(formData));
        return { success: true };
    } catch (error) {
        console.error('Error saving draft:', error);
        return { success: false, error: error.message };
    }
}

// Add cleanup for auto-save when leaving the page
window.addEventListener('unload', () => {
    if (autoSaveTimer) {
        clearInterval(autoSaveTimer);
    }
}); 