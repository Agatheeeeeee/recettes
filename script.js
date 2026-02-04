let currentTab = 'all';
let currentCategory = 'tous';

// Initialisation au chargement
document.addEventListener('DOMContentLoaded', () => {
    displayRecipes();
});

async function fetchAndSave() {
    const url = document.getElementById('recipeUrl').value;
    const category = document.getElementById('category').value;
    const season = document.getElementById('season').value;
    const loader = document.getElementById('loader');

    if (!url) return alert("Collez un lien !");
    loader.classList.remove('hidden');

    try {
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);
        const json = await response.json();
        const html = json.contents;

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        let recipeData = {
            title: doc.title,
            image: "",
            ingredients: [],
            instructions: [],
            prepTime: "Non précisé"
        };

        // Extraction JSON-LD
        const jsonLdScripts = doc.querySelectorAll('script[type="application/ld+json"]');
        jsonLdScripts.forEach(script => {
            try {
                const data = JSON.parse(script.innerText);
                const recipe = Array.isArray(data) ? data.find(item => item['@type'] === 'Recipe') : (data['@type'] === 'Recipe' ? data : data['@graph']?.find(item => item['@type'] === 'Recipe'));
                
                if (recipe) {
                    recipeData.title = recipe.name || recipeData.title;
                    recipeData.image = Array.isArray(recipe.image) ? recipe.image[0] : (recipe.image?.url || recipe.image);
                    recipeData.ingredients = recipe.recipeIngredient || [];
                    recipeData.instructions = recipe.recipeInstructions?.map(step => step.text || step.name || step) || [];
                    recipeData.prepTime = recipe.totalTime ? recipe.totalTime.replace('PT', '').replace('M', ' min').replace('H', ' h ') : "Non précisé";
                }
            } catch (e) {}
        });

        const newRecipe = {
            id: Date.now(),
            title: recipeData.title,
            image: recipeData.image || 'https://via.placeholder.com/300x200?text=Cuisine',
            url: url,
            category: category,
            season: season,
            ingredients: recipeData.ingredients,
            instructions: recipeData.instructions,
            prepTime: recipeData.prepTime,
            isFavorite: false
        };

        let recipes = JSON.parse(localStorage.getItem('mesRecettes')) || [];
        recipes.unshift(newRecipe);
        localStorage.setItem('mesRecettes', JSON.stringify(recipes));

        document.getElementById('recipeUrl').value = "";
        displayRecipes();
    } catch (e) {
        alert("Erreur lors de l'extraction.");
    } finally {
        loader.classList.add('hidden');
    }
}

function switchTab(type) {
    currentTab = type;
    document.getElementById('tabAll').classList.toggle('active-tab', type === 'all');
    document.getElementById('tabFav').classList.toggle('active-tab', type === 'fav');
    displayRecipes();
}

function setCategoryFilter(category, btn) {
    currentCategory = category;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    displayRecipes();
}

function toggleFavorite(id, event) {
    event.stopPropagation();
    let recipes = JSON.parse(localStorage.getItem('mesRecettes')) || [];
    recipes = recipes.map(r => {
        if (r.id === id) r.isFavorite = !r.isFavorite;
        return r;
    });
    localStorage.setItem('mesRecettes', JSON.stringify(recipes));
    displayRecipes();
}

function displayRecipes() {
    const gallery = document.getElementById('recipeGallery');
    const recipes = JSON.parse(localStorage.getItem('mesRecettes')) || [];
    gallery.innerHTML = "";

    let filtered = recipes.filter(r => currentTab === 'all' || r.isFavorite);
    if (currentCategory !== 'tous') {
        filtered = filtered.filter(r => r.category === currentCategory);
    }

    filtered.forEach(recipe => {
        gallery.innerHTML += `
            <div class="recipe-card" onclick="showModal(${recipe.id})">
                <div class="fav-badge" onclick="toggleFavorite(${recipe.id}, event)">
                    ${recipe.isFavorite ? '❤️' : '🤍'}
                </div>
                <img src="${recipe.image}">
                <div class="card-body">
                    <small>${recipe.category} • ${recipe.season}</small>
                    <h3 style="margin:5px 0">${recipe.title}</h3>
                    <p style="font-size:0.8em">⏱️ ${recipe.prepTime}</p>
                </div>
            </div>
        `;
    });
}

function showModal(id) {
    const recipes = JSON.parse(localStorage.getItem('mesRecettes')) || [];
    const recipe = recipes.find(r => r.id === id);
    const modal = document.getElementById('recipeModal');
    const content = document.getElementById('modalData');
    
    content.innerHTML = `
        <img src="${recipe.image}" style="width:100%; border-radius:15px; height:200px; object-fit:cover;">
        <h2>${recipe.title}</h2>
        <p>⏱️ Temps total : ${recipe.prepTime} | 📂 ${recipe.category}</p>
        <div class="recipe-section">
            <h3>🛒 Ingrédients</h3>
            <ul>${recipe.ingredients.map(i => `<li>${i}</li>`).join('')}</ul>
        </div>
        <div class="recipe-section">
            <h3>👨‍🍳 Instructions</h3>
            <ol>${recipe.instructions.map(i => `<li>${i}</li>`).join('')}</ol>
        </div>
        <a href="${recipe.url}" target="_blank" style="display:block; margin-top:20px; color:var(--primary);">Voir source originale ↗️</a>
        <button onclick="deleteRecipe(${recipe.id})" style="margin-top:20px; color:red; border:none; background:none; cursor:pointer;">Supprimer la recette</button>
    `;
    modal.classList.remove('hidden');
}

function closeModal() { document.getElementById('recipeModal').classList.add('hidden'); }

function deleteRecipe(id) {
    if(confirm("Supprimer cette recette ?")) {
        let recipes = JSON.parse(localStorage.getItem('mesRecettes')) || [];
        recipes = recipes.filter(r => r.id !== id);
        localStorage.setItem('mesRecettes', JSON.stringify(recipes));
        closeModal();
        displayRecipes();
    }
}
