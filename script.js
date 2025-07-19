document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const viewAllBtn = document.getElementById('viewAllBtn');
    const resultsContainer = document.getElementById('results');
    const movieModal = document.getElementById('movieModal');
    const modalContent = document.getElementById('modalContent');
   
    // Data
    let movies = [];
    let filteredMovies = [];
    let lastRequestTime = 0;

    // Valid Studio Ghibli movie titles
    const validGhibliTitles = [
        "Spirited Away", "My Neighbor Totoro", "Princess Mononoke",
        "Howl's Moving Castle", "Ponyo", "The Wind Rises",
        "Kiki's Delivery Service", "Castle in the Sky", "Grave of the Fireflies",
        "When Marnie Was There", "The Tale of the Princess Kaguya",
        "From Up on Poppy Hill", "Arrietty", "The Cat Returns",
        "Porco Rosso", "Only Yesterday", "The Red Turtle",
        "Earwig and the Witch", "Ocean Waves", "Whisper of the Heart"
    ];

    // Initialize the app
    init();

    async function init() {
        showLoading();
        try {
            const response = await fetch('https://api.jikan.moe/v4/anime?producer=21'); // Studio Ghibli's producer ID
            if (!response.ok) throw new Error('Failed to fetch movies');
            const data = await response.json();
            movies = transformJikanData(data.data);
            filteredMovies = [...movies];
            displayMovies(movies.slice(0, 6)); // Show first 6 movies initially
        } catch (error) {
            showError('Failed to load movies. Please try again later.');
            console.error('Error fetching movies:', error);
        } finally {
            hideLoading();
        }
    }

    // Event listeners
    searchBtn.addEventListener('click', handleSearch);
    viewAllBtn.addEventListener('click', () => displayMovies(movies));
    searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') handleSearch();
    });

    async function handleSearch() {
        const searchTerm = searchInput.value.trim();
        resultsContainer.innerHTML = '';
       
        // Validation 1: Empty input
        if (!searchTerm) {
            showError('Please enter a movie title');
            return;
        }

        // Validation 2: Check against known Ghibli titles
        const isKnownGhibliTitle = validGhibliTitles.some(title =>
            title.toLowerCase().includes(searchTerm.toLowerCase())
        );

        if (!isKnownGhibliTitle) {
            showError(`"${searchTerm}" is not a valid Studio Ghibli film. Try: "Spirited Away", "Totoro", etc.`);
            return;
        }

        showLoading();
       
        try {
            // Rate limiting
            const now = Date.now();
            if (now - lastRequestTime < 350) {
                await new Promise(resolve => setTimeout(resolve, 350 - (now - lastRequestTime)));
            }
            lastRequestTime = Date.now();
           
            const response = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(searchTerm)}&producer=21`);
            if (!response.ok) throw new Error(`API error: ${response.status}`);
           
            const data = await response.json();
           
            // Validation 3: Verify the response is actually a Ghibli film
            const ghibliFilms = data.data.filter(film =>
                film.studios?.some(studio => studio.name.includes("Ghibli"))
            );
           
            if (ghibliFilms.length === 0) {
                showError(`No Ghibli movies found for "${searchTerm}". Try an exact title match.`);
            } else {
                filteredMovies = transformJikanData(ghibliFilms);
                displayMovies(filteredMovies);
            }
        } catch (error) {
            showError(`Search failed: ${error.message}`);
            console.error('Search error:', error);
        } finally {
            hideLoading();
        }
    }

    function transformJikanData(jikanData) {
        return jikanData.map(anime => ({
            id: anime.mal_id,
            title: anime.title_english || anime.title,
            original_title: anime.title,
            director: anime.authors?.[0]?.name || "Unknown",
            producer: anime.studios?.[0]?.name || "Unknown",
            release_date: anime.year || "Unknown",
            rt_score: anime.score ? Math.round(anime.score * 10) : "N/A",
            description: anime.synopsis || "No description available",
            image: anime.images?.jpg?.large_image_url || 'https://via.placeholder.com/300x400?text=No+Image'
        }));
    }

    function displayMovies(moviesToDisplay) {
        resultsContainer.innerHTML = '';
       
        if (moviesToDisplay.length === 0) {
            showEmptyState();
            return;
        }
       
        moviesToDisplay.forEach(movie => {
            const movieCard = document.createElement('div');
            movieCard.className = 'movie-card';
            movieCard.innerHTML = `
                <img src="${movie.image}" alt="${movie.title}" class="movie-poster">
                <div class="movie-info">
                    <h3 class="movie-title">${movie.title}</h3>
                    <div class="movie-meta">
                        <span class="movie-director">${movie.director}</span>
                        <span class="movie-score">${movie.rt_score}%</span>
                    </div>
                    <p class="movie-description">${truncateDescription(movie.description)}</p>
                    <button class="read-more" data-id="${movie.id}">Read More</button>
                </div>
            `;
            resultsContainer.appendChild(movieCard);
        });
       
        // Add event listeners to all "Read More" buttons
        document.querySelectorAll('.read-more').forEach(button => {
            button.addEventListener('click', (e) => {
                const movieId = e.target.getAttribute('data-id');
                const movie = movies.find(m => m.id == movieId);
                if (movie) showMovieModal(movie);
            });
        });
    }

    function truncateDescription(description, maxLength = 150) {
        return description.length > maxLength
            ? `${description.substring(0, maxLength)}...`
            : description;
    }

    function showMovieModal(movie) {
        modalContent.innerHTML = `
            <div class="modal-header">
                <h3 class="modal-title">${movie.title}</h3>
                <button class="close-btn">&times;</button>
            </div>
            <div class="modal-body">
                <img src="${movie.image}" alt="${movie.title}" class="modal-poster">
                <div class="modal-meta">
                    <div class="modal-meta-item">
                        <p class="modal-meta-label">Original Title</p>
                        <p>${movie.original_title}</p>
                    </div>
                    <div class="modal-meta-item">
                        <p class="modal-meta-label">Director</p>
                        <p>${movie.director}</p>
                    </div>
                    <div class="modal-meta-item">
                        <p class="modal-meta-label">Release Year</p>
                        <p>${movie.release_date}</p>
                    </div>
                    <div class="modal-meta-item">
                        <p class="modal-meta-label">Score</p>
                        <p>${movie.rt_score}%</p>
                    </div>
                    <div class="modal-meta-item">
                        <p class="modal-meta-label">Producer</p>
                        <p>${movie.producer}</p>
                    </div>
                </div>
                <div>
                    <p class="modal-meta-label">Description</p>
                    <p>${movie.description}</p>
                </div>
            </div>
        `;
       
        // Add event listener to close button
        modalContent.querySelector('.close-btn').addEventListener('click', () => {
            movieModal.style.display = 'none';
        });
       
        // Show modal
        movieModal.style.display = 'block';
       
        // Close modal when clicking outside content
        movieModal.addEventListener('click', (e) => {
            if (e.target === movieModal) {
                movieModal.style.display = 'none';
            }
        });
    }

    function showLoading() {
        resultsContainer.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
            </div>
        `;
    }

    function hideLoading() {
        const loadingElement = document.querySelector('.loading');
        if (loadingElement) loadingElement.remove();
    }

    function showError(message) {
        resultsContainer.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <p>${message}</p>
            </div>
        `;
    }

    function showEmptyState() {
        resultsContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-film"></i>
                <p>No movies found. Try a different search term.</p>
                <p>Valid Ghibli films include: ${validGhibliTitles.slice(0, 5).join(', ')}...</p>
            </div>
        `;
    }
});
