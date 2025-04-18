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
// Maximum image size (in pixels) for storage
const MAX_IMAGE_WIDTH = 800;
const MAX_IMAGE_HEIGHT = 800;
// JPEG Quality (0-1)
const IMAGE_QUALITY = 0.7;
// Maximum number of high-res images per recipe
const MAX_IMAGES_PER_RECIPE = 3;

let recipes = [];
let currentPage = 1;
const recipesPerPage = 6;

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    loadRecipes();
    
    // Setup event listeners based on the current page
    if (window.location.pathname.includes('index.html') || window.location.pathname.endsWith('/') || window.location.pathname === '') {
        setupHomePageEvents();
    } else if (window.location.pathname.includes('add-recipe.html')) {
        setupAddRecipeEvents();
        
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

// Load recipes from localStorage
function loadRecipes() {
    try {
        const storedRecipes = localStorage.getItem(STORAGE_KEY);
        recipes = storedRecipes ? JSON.parse(storedRecipes) : [];
    } catch (error) {
        console.error('Error loading recipes:', error);
        recipes = [];
    }
}

// Save recipes to localStorage
function saveRecipes() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
        return true;
    } catch (error) {
        console.error('Error saving recipes:', error);
        alert('Error saving recipe: ' + error.message);
        return false;
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
                <p>${searchText ? 'No recipes match your search.' : 'Retsepte pole veel lisatud. Esimese sissekande loomiseks klõpsake "Lisa uus retsept"!'}</p>
            </div>
        `;
    } else {
        recipesList.innerHTML = paginatedRecipes.map(recipe => {
            // Convert stored base64 images to usable format
            const firstImage = recipe.images && recipe.images.length > 0 ? recipe.images[0] : null;
            const imageHtml = firstImage ? 
                `<img src="${firstImage}" alt="${recipe.title}">` : 
                `<div class="no-image">No Image</div>`;
            
            // Generate star rating HTML
            const stars = generateStarRating(recipe.rating);
            
            // Create recipe preview (first 100 characters)
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
                        <a href="recipe-details.html?id=${recipe.id}" class="btn primary-btn">View Recipe</a>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // Update pagination controls
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
}

// Handle image uploads
function handleImageUpload(e) {
    const files = e.target.files;
    const imagePreviewArea = document.getElementById('imagePreviewArea');
    
    if (!files || files.length === 0) return;
    
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
    
    // Process each selected file
    Array.from(files).forEach(file => {
        // Check file size
        if (file.size > 5 * 1024 * 1024) { // 5MB max
            alert('Image too large (max 5MB): ' + file.name);
            processedFiles++;
            if (processedFiles === files.length) {
                loadingEl.remove();
            }
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = function(event) {
            const imageUrl = event.target.result;
            
            // Check if the image preview area still exists
            const currentImagePreviewArea = document.getElementById('imagePreviewArea');
            if (!currentImagePreviewArea) return;
            
            // Create preview element
            const previewElement = document.createElement('div');
            previewElement.classList.add('image-preview');
            previewElement.innerHTML = `
                <img src="${imageUrl}" alt="Recipe image preview">
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
            
            // Count processed files and remove loading indicator when done
            processedFiles++;
            if (processedFiles === files.length) {
                const loadingElement = currentImagePreviewArea.querySelector('.upload-loading');
                if (loadingElement) loadingElement.remove();
            }
        };
        
        reader.onerror = function() {
            console.error('Error reading file', file.name);
            processedFiles++;
            if (processedFiles === files.length) {
                loadingEl.remove();
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
        
        const savedSuccessfully = saveRecipes();
        
        if (savedSuccessfully) {
            // Redirect to the recipe details page
            window.location.href = 'recipe-details.html?id=' + recipe.id;
        } else {
            // Re-enable the save button if there was an error
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
    
    // Generate star rating HTML
    const stars = generateStarRating(recipe.rating);
    
    // Generate images gallery
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
            <div class="recipe-date">Made on ${formatDate(recipe.date)}</div>
            <div class="recipe-rating-large">${stars}</div>
        </div>
        
        ${imagesHtml}
        
        <div class="recipe-content">
            <div class="recipe-section">
                <h3>Juhised</h3>
                <div class="recipe-instructions">${recipe.instructions}</div>
            </div>
            
            ${recipe.notes ? `
                <div class="recipe-section">
                    <h3>Isiklikud märkmed</h3>
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
    if (!dateString) return 'Unknown date';
    
    try {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    } catch (error) {
        console.error('Error formatting date:', error);
        return dateString; // Return the original string if parsing fails
    }
} 
