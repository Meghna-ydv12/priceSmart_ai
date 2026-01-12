// ==================== CONFIGURATION ====================
const API_BASE_URL = 'http://localhost:5000/api';
let currentUser = null;
let authToken = null;
let currentSearchData = null;
let voiceRecognition = null;
let isListening = false;

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 PriceSmart AI Initializing...');
    
    // Setup all event listeners
    setupEventListeners();
    
    // Check if user is logged in
    checkExistingSession();
    
    // Load trending products
    loadTrendingProducts();
    
    console.log('✅ Initialization complete');
    
    // Show welcome notification
    setTimeout(() => {
        showNotification('✅ PriceSmart AI Ready! Start searching for products.', 'success');
    }, 500);
});

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
    console.log('🔧 Setting up event listeners...');
    
    // Search button
    const analyzeBtn = document.getElementById('analyzeBtn');
    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', performSearch);
        console.log('✅ Search button listener added');
    }
    
    // Enter key in search input
    const productInput = document.getElementById('productInput');
    if (productInput) {
        productInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }
    
    // Voice button
    const voiceBtn = document.getElementById('voiceBtn');
    if (voiceBtn) {
        voiceBtn.addEventListener('click', toggleVoiceSearch);
        console.log('✅ Voice button listener added');
    }
    
    // Login button
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', openLoginModal);
    }
    
    // CTA login button
    const ctaLoginBtn = document.getElementById('ctaLoginBtn');
    if (ctaLoginBtn) {
        ctaLoginBtn.addEventListener('click', openLoginModal);
    }
    
    // CTA signup button
    const ctaSignUpBtn = document.getElementById('ctaSignUpBtn');
    if (ctaSignUpBtn) {
        ctaSignUpBtn.addEventListener('click', openRegisterModal);
    }
    
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLoginSubmit);
    }
    
    // Register form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegisterSubmit);
    }
    
    // Return to dashboard button
    const returnBtn = document.getElementById('returnToDashboard');
    if (returnBtn) {
        returnBtn.addEventListener('click', closeLoginModal);
    }
    
    // Login instead button
    const loginInsteadBtn = document.getElementById('loginInsteadBtn');
    if (loginInsteadBtn) {
        loginInsteadBtn.addEventListener('click', () => {
            closeRegisterModal();
            openLoginModal();
        });
    }
    
    // Google login button
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', handleGoogleLogin);
    }
    
    // GitHub login button
    const githubLoginBtn = document.getElementById('githubLoginBtn');
    if (githubLoginBtn) {
        githubLoginBtn.addEventListener('click', handleGitHubLogin);
    }
    
    // Home logo
    const homeLogo = document.getElementById('homeLogo');
    if (homeLogo) {
        homeLogo.addEventListener('click', showHomeScreen);
    }
    
    // Nav home
    const navHome = document.getElementById('nav-home');
    if (navHome) {
        navHome.addEventListener('click', showHomeScreen);
    }
    
    // New search button
    const newSearchBtn = document.getElementById('newSearchBtn');
    if (newSearchBtn) {
        newSearchBtn.addEventListener('click', showHomeScreen);
    }
    
    // Add to watchlist button
    const addToWatchlistBtn = document.getElementById('addToWatchlistBtn');
    if (addToWatchlistBtn) {
        addToWatchlistBtn.addEventListener('click', addToWatchlist);
    }
    
    // Share results button
    const shareResultsBtn = document.getElementById('shareResultsBtn');
    if (shareResultsBtn) {
        shareResultsBtn.addEventListener('click', shareResults);
    }
    
    // Watchlist link
    const watchlistLink = document.getElementById('watchlistLink');
    if (watchlistLink) {
        watchlistLink.addEventListener('click', showWatchlistModal);
    }
    
    // Close watchlist button
    const closeWatchlistBtn = document.getElementById('closeWatchlistBtn');
    if (closeWatchlistBtn) {
        closeWatchlistBtn.addEventListener('click', closeWatchlistModal);
    }
    
    // Close profile button
    const closeProfileBtn = document.getElementById('closeProfileBtn');
    if (closeProfileBtn) {
        closeProfileBtn.addEventListener('click', closeProfileModal);
    }
    
    // Setup modal close on background click
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.add('hidden');
            }
        });
    });
    
    console.log('✅ All event listeners added');
}

// ==================== SEARCH FUNCTION ====================
async function performSearch() {
    console.log('🔍 Starting search...');
    
    const input = document.getElementById('productInput');
    const query = input.value.trim();
    
    if (!query || query.length < 2) {
        showNotification('⚠️ Please enter at least 2 characters', 'warning');
        input.focus();
        return;
    }
    
    console.log(`Searching for: "${query}"`);
    
    // Stop voice if active
    if (isListening) {
        stopVoiceSearch();
    }
    
    // Show analysis screen
    showScreen('analysis-screen');
    document.getElementById('currentProduct').textContent = query;
    
    // Show loader
    const loader = document.getElementById('loader');
    const resultsGrid = document.getElementById('resultsGrid');
    
    if (loader) loader.classList.remove('hidden');
    if (resultsGrid) resultsGrid.innerHTML = '';
    
    // Hide other sections
    const chartContainer = document.getElementById('chartContainer');
    const comparisonTable = document.getElementById('comparisonTable');
    
    if (chartContainer) chartContainer.style.display = 'none';
    if (comparisonTable) comparisonTable.style.display = 'none';
    
    try {
        // For demo - use local data
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Hide loader
        if (loader) loader.classList.add('hidden');
        
        // Generate demo data
        useDemoData(query);
        
        showNotification(`✅ Found 6 deals for "${query}"!`, 'success');
        
    } catch (error) {
        console.error('❌ Search error:', error);
        
        // Hide loader
        if (loader) loader.classList.add('hidden');
        
        // Show demo data
        useDemoData(query);
        showNotification('⚠️ Using demo data', 'info');
    }
}

// ==================== VOICE SEARCH ====================
function toggleVoiceSearch() {
    if (isListening) {
        stopVoiceSearch();
    } else {
        startVoiceSearch();
    }
}

function startVoiceSearch() {
    console.log('🎤 Starting voice search...');
    
    // Check browser support
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        showNotification('❌ Voice search not supported in this browser', 'error');
        return;
    }
    
    // Show status
    const voiceStatus = document.getElementById('voiceStatus');
    const voiceBtn = document.getElementById('voiceBtn');
    const transcriptEl = document.getElementById('voiceTranscript');
    
    if (voiceStatus) {
        voiceStatus.style.display = 'block';
        document.getElementById('voiceStatusText').textContent = '🎤 Speak now...';
    }
    
    if (voiceBtn) {
        voiceBtn.classList.add('listening');
        voiceBtn.innerHTML = '⏹️';
        voiceBtn.title = 'Click to stop listening';
    }
    
    if (transcriptEl) {
        transcriptEl.textContent = 'Listening... Speak clearly about the product you want';
        transcriptEl.style.color = '#c026d3';
    }
    
    // Initialize speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    voiceRecognition = new SpeechRecognition();
    
    // Configure for better voice recognition
    voiceRecognition.lang = 'en-IN'; // Indian English
    voiceRecognition.continuous = false;
    voiceRecognition.interimResults = true;
    voiceRecognition.maxAlternatives = 3;
    
    // Start listening
    voiceRecognition.start();
    isListening = true;
    
    // Real-time feedback
    voiceRecognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            
            if (event.results[i].isFinal) {
                finalTranscript += transcript;
            } else {
                interimTranscript += transcript;
            }
        }
        
        // Update transcript display
        if (transcriptEl) {
            if (finalTranscript) {
                transcriptEl.textContent = `✅ " ${finalTranscript} "`;
                transcriptEl.style.color = '#22c55e';
                
                // Process and search
                processVoiceResult(finalTranscript);
            } else if (interimTranscript) {
                transcriptEl.textContent = `🎤 " ${interimTranscript} "`;
                transcriptEl.style.color = '#c026d3';
            }
        }
    };
    
    voiceRecognition.onerror = (event) => {
        console.error('Voice recognition error:', event.error);
        isListening = false;
        
        // Reset UI
        if (voiceBtn) {
            voiceBtn.classList.remove('listening');
            voiceBtn.innerHTML = '🎤';
            voiceBtn.title = 'Click for voice search';
        }
        
        // Show error message
        let errorMessage = '❌ Voice recognition error. Try again.';
        switch(event.error) {
            case 'no-speech':
                errorMessage = '❌ No speech detected. Please speak louder and clearly.';
                break;
            case 'audio-capture':
                errorMessage = '❌ No microphone found. Please check your microphone.';
                break;
            case 'not-allowed':
                errorMessage = '❌ Microphone access denied. Please allow microphone permissions.';
                break;
        }
        
        showNotification(errorMessage, 'error');
        
        // Hide status after delay
        setTimeout(() => {
            if (voiceStatus) voiceStatus.style.display = 'none';
        }, 3000);
    };
    
    voiceRecognition.onend = () => {
        console.log('Voice recognition ended');
        isListening = false;
        
        // Reset UI after a delay if no final result
        setTimeout(() => {
            if (!isListening && voiceBtn) {
                voiceBtn.classList.remove('listening');
                voiceBtn.innerHTML = '🎤';
                voiceBtn.title = 'Click for voice search';
                
                // Hide status if still visible
                if (voiceStatus && voiceStatus.style.display !== 'none') {
                    voiceStatus.style.display = 'none';
                }
            }
        }, 2000);
    };
}

function stopVoiceSearch() {
    if (voiceRecognition && isListening) {
        voiceRecognition.stop();
        isListening = false;
        
        // Reset UI
        const voiceBtn = document.getElementById('voiceBtn');
        const voiceStatus = document.getElementById('voiceStatus');
        
        if (voiceBtn) {
            voiceBtn.classList.remove('listening');
            voiceBtn.innerHTML = '🎤';
            voiceBtn.title = 'Click for voice search';
        }
        
        if (voiceStatus) {
            voiceStatus.style.display = 'none';
        }
        
        showNotification('⏹️ Voice search stopped', 'info');
    }
}

function processVoiceResult(transcript) {
    console.log('🎯 Processing voice transcript:', transcript);
    
    // Process the transcript
    let cleanedText = processProductName(transcript);
    
    // Update input field
    const productInput = document.getElementById('productInput');
    if (productInput) {
        productInput.value = cleanedText;
        productInput.focus();
    }
    
    // Auto-search after a brief delay
    setTimeout(() => {
        // Stop listening
        stopVoiceSearch();
        
        // Perform search
        performSearch();
    }, 1000);
}

function processProductName(transcript) {
    console.log('🔧 Processing product name:', transcript);
    
    let text = transcript.trim();
    
    // COMMON MISPRONUNCIATIONS FIXES
    const fixes = {
        'iphone': 'iPhone',
        'iphone 15': 'iPhone 15',
        'iphone 15 pro': 'iPhone 15 Pro',
        'macbook': 'MacBook',
        'macbook air': 'MacBook Air',
        'nike': 'Nike',
        'nike air': 'Nike Air',
        'samsung': 'Samsung',
        'samsung galaxy': 'Samsung Galaxy',
        'airpods': 'AirPods',
        'apple watch': 'Apple Watch',
        'sony': 'Sony',
        'headphones': 'Headphones'
    };
    
    // Apply fixes (case insensitive)
    Object.keys(fixes).forEach(wrong => {
        const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
        text = text.replace(regex, fixes[wrong]);
    });
    
    // Remove common filler words
    const fillerWords = ['search for', 'find', 'look for', 'show me', 'please'];
    fillerWords.forEach(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        text = text.replace(regex, '');
    });
    
    // Clean up
    text = text.replace(/\s+/g, ' ').trim();
    
    // Capitalize first letter
    if (text.length > 0) {
        text = text.charAt(0).toUpperCase() + text.slice(1);
    }
    
    console.log('✅ Processed product name:', text);
    return text;
}

// ==================== DEMO DATA ====================
function useDemoData(query) {
    console.log('📊 Using demo data for:', query);
    
    // Realistic price ranges based on product category
    const getPriceRange = (productName) => {
        const name = productName.toLowerCase();
        
        if (name.includes('iphone') || name.includes('samsung galaxy') || name.includes('pixel')) {
            return { min: 45000, max: 120000 }; // Premium phones
        } else if (name.includes('macbook') || name.includes('laptop')) {
            return { min: 60000, max: 200000 }; // Laptops
        } else if (name.includes('airpods') || name.includes('headphone') || name.includes('earbud')) {
            return { min: 2000, max: 25000 }; // Audio
        } else if (name.includes('nike') || name.includes('shoe') || name.includes('sneaker')) {
            return { min: 1500, max: 12000 }; // Shoes
        } else if (name.includes('watch') || name.includes('smartwatch')) {
            return { min: 3000, max: 45000 }; // Watches
        } else if (name.includes('tv') || name.includes('television')) {
            return { min: 15000, max: 120000 }; // TVs
        } else {
            return { min: 1000, max: 50000 }; // Default range
        }
    };
    
    const priceRange = getPriceRange(query);
    
    const platforms = [
        {name: 'Amazon', icon: '📦', base: priceRange.min + 2000},
        {name: 'Flipkart', icon: '🛒', base: priceRange.min + 1500},
        {name: 'Myntra', icon: '👕', base: priceRange.min + 3000},
        {name: 'Reliance Digital', icon: '🔷', base: priceRange.min + 2500},
        {name: 'Croma', icon: '🔴', base: priceRange.min + 2200},
        {name: 'Tata CLiQ', icon: '🛍️', base: priceRange.min + 2800}
    ];
    
    const results = [];
    for (let platform of platforms) {
        // Generate realistic price within range
        const basePrice = platform.base;
        const variance = Math.floor((priceRange.max - priceRange.min) * 0.15); // 15% variance
        const price = basePrice + Math.floor(Math.random() * variance);
        
        // Generate realistic discount (5-40%)
        const discount = Math.floor(Math.random() * 35) + 5;
        const originalPrice = Math.round(price * (1 + discount/100));
        
        // Generate realistic rating (3.0-4.8)
        const rating = (Math.random() * 1.8 + 3.0).toFixed(1);
        
        // Realistic review counts
        const reviewCounts = [125, 342, 567, 892, 1245, 2345, 4567, 7890, 12345];
        const reviews = reviewCounts[Math.floor(Math.random() * reviewCounts.length)];
        
        // Realistic delivery times
        const deliveryOptions = [
            '1-2 days',
            '2-3 days', 
            '3-4 days',
            '4-5 days',
            '5-7 days',
            '7-10 days'
        ];
        const delivery = deliveryOptions[Math.floor(Math.random() * deliveryOptions.length)];
        
        // Stock status (mostly in stock, sometimes limited)
        const stockOptions = ['In Stock', 'In Stock', 'In Stock', 'Only 2 left', 'Limited Stock'];
        const stockStatus = stockOptions[Math.floor(Math.random() * stockOptions.length)];

        // Seller names
        const sellerNames = {
            'Amazon': 'Cloudtail India',
            'Flipkart': 'RetailNet',
            'Myntra': 'Myntra Fashions',
            'Reliance Digital': 'Reliance Retail',
            'Croma': 'Croma Electronics',
            'Tata CLiQ': 'Tata Retail'
        };

        // Add this to each product object:
        results.push({
            platform: platform.name,
            platform_icon: platform.icon,
            title: getRealisticTitle(query, platform.name),
            price: price,
            original_price: originalPrice,
            discount_percent: discount,
            rating: rating,
            reviews_count: reviews,
            stock_status: stockStatus,
            delivery: delivery,
            seller: sellerNames[platform.name] || `${platform.name} Seller`,
            url: getProductURL(query, platform.name),
            is_best_price: false,
            query: query // ADD THIS LINE
        });
    }

    // Mark best price
    results.sort((a, b) => a.price - b.price);
    results[0].is_best_price = true;
    
    // Calculate stats
    const prices = results.map(p => p.price);
    const originalPrices = results.map(p => p.original_price);
    
    const statistics = {
        lowest_price: Math.min(...prices),
        highest_price: Math.max(...prices),
        average_price: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
        stores_compared: results.length,
        max_savings: Math.max(...originalPrices) - Math.min(...prices),
        average_discount: Math.round(results.reduce((sum, p) => sum + p.discount_percent, 0) / results.length),
        best_platform: results[0].platform
    };
    
    currentSearchData = {
        success: true,
        query: query,
        results: results,
        statistics: statistics,
        predictions: generateDemoPredictions(statistics.lowest_price)
    };
    
    renderProductCards(results);
    updateStatistics(statistics);
    displayPredictions(currentSearchData.predictions);
    
    const chartContainer = document.getElementById('chartContainer');
    const comparisonTable = document.getElementById('comparisonTable');
    
    if (chartContainer) chartContainer.style.display = 'block';
    renderComparisonTable(results);
    if (comparisonTable) comparisonTable.style.display = 'block';
}

function getRealisticTitle(query, platform) {
    const titles = {
        'Amazon': `${query} (Latest Model) - with 1 Year Warranty`,
        'Flipkart': `${query} - SuperCoin Offer Available`,
        'Myntra': `${query} | Fashion Edition`,
        'Reliance Digital': `${query} with Extended Warranty`,
        'Croma': `${query} - Croma Assured`,
        'Tata CLiQ': `${query} - Premium Edition`
    };
    
    return titles[platform] || `${query} - ${platform} Edition`;
}

function getProductURL(query, platform) {
    const baseURLs = {
        'Amazon': `https://www.amazon.in/s?k=${encodeURIComponent(query)}`,
        'Flipkart': `https://www.flipkart.com/search?q=${encodeURIComponent(query)}`,
        'Myntra': `https://www.myntra.com/${encodeURIComponent(query.toLowerCase().replace(/\s+/g, '-'))}`,
        'Reliance Digital': `https://www.reliancedigital.in/search?q=${encodeURIComponent(query)}`,
        'Croma': `https://www.croma.com/search/?q=${encodeURIComponent(query)}`,
        'Tata CLiQ': `https://www.tatacliq.com/search/?searchCategory=all&text=${encodeURIComponent(query)}`
    };
    
    return baseURLs[platform] || `#`;
}

// ==================== RENDERING FUNCTIONS ====================
function renderProductCards(products) {
    const grid = document.getElementById('resultsGrid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    if (!products || products.length === 0) {
        grid.innerHTML = `
            <div class="no-results">
                <div style="font-size: 4rem; margin-bottom: 20px;">🔍</div>
                <h3>No products found</h3>
                <p>Try searching for something else</p>
            </div>
        `;
        return;
    }
    
    const bestPrice = Math.min(...products.map(p => p.price));
    
    products.forEach((product, index) => {
        const card = createProductCard(product, product.price === bestPrice, index);
        if (card) {
            grid.appendChild(card);
            
            // Animate cards
            setTimeout(() => {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 100);
        }
    });
}

function createProductCard(product, isBestPrice, index) {
    if (!product) return null;
    
    const card = document.createElement('div');
    card.className = 'card';
    card.style.cssText = `
        opacity: 0;
        transform: translateY(20px);
        transition: opacity 0.5s ease, transform 0.5s ease;
        position: relative;
        border: ${isBestPrice ? '2px solid #22c55e' : '1px solid rgba(255,255,255,0.1)'};
    `;
    
    const discount = product.discount_percent || 0;
    const price = product.price || 0;
    const originalPrice = product.original_price || 0;
    const rating = product.rating || '4.0';
    const reviews = product.reviews_count || 1200;
    const delivery = product.delivery || '2-3 days';
    const stockStatus = product.stock_status || 'In Stock';
    const seller = product.seller || 'Verified Seller';
    
    card.innerHTML = `
        ${isBestPrice ? '<div class="best-price-badge">🏆 BEST PRICE</div>' : ''}
        ${discount > 0 ? `<div class="discount-badge">${discount}% OFF</div>` : ''}
        
        <div class="platform-icon">${product.platform_icon || '🛒'}</div>
        <div class="platform-name">${product.platform || 'Store'}</div>
        
        <div class="price" style="color: ${isBestPrice ? '#22c55e' : 'white'}; font-size: 2.5rem; margin: 15px 0;">
            ₹${price.toLocaleString('en-IN')}
        </div>
        
        ${originalPrice > price ? `
            <div style="color: #94a3b8; text-decoration: line-through; font-size: 1rem; margin-bottom: 10px;">
                ₹${originalPrice.toLocaleString('en-IN')}
            </div>
        ` : ''}
        
        <div class="product-title" style="font-size: 1.1rem; font-weight: 600; margin: 10px 0; color: #e2e8f0;">
           ${product.title || `${product.query || 'Product'} - ${product.platform}`}
        </div>
        
        <div class="stock-status ${stockStatus.includes('Stock') ? 'stock-in' : 'stock-out'}" style="margin: 10px 0;">
            ${stockStatus.includes('Stock') ? '✓' : '✗'} ${stockStatus}
        </div>
        
        <div style="color: #94a3b8; font-size: 0.9rem; margin: 8px 0;">
            Sold by: <span style="color: #cbd5e1; font-weight: 500;">${seller}</span>
        </div>
        
        <div class="price-details">
            <div class="price-detail">
                <div class="price-detail-label">Rating</div>
                <div class="price-detail-value">⭐ ${rating}</div>
            </div>
            <div class="price-detail">
                <div class="price-detail-label">Reviews</div>
                <div class="price-detail-value">${reviews.toLocaleString()}</div>
            </div>
            <div class="price-detail">
                <div class="price-detail-label">Delivery</div>
                <div class="price-detail-value">${delivery}</div>
            </div>
        </div>
        
        <button class="btn-view-deal" onclick="viewDeal('${product.platform || 'Store'}', ${price}, '${product.url || '#'}')">
            <span class="btn-icon">🛒</span> View on ${product.platform || 'Store'} →
        </button>
    `;
    
    return card;
}

function updateStatistics(stats) {
    if (!stats) return;
    
    const updates = {
        'lowestPriceStat': `₹${stats.lowest_price.toLocaleString('en-IN')}`,
        'avgPriceStat': `₹${stats.average_price.toLocaleString('en-IN')}`,
        'savingsStat': `₹${stats.max_savings.toLocaleString('en-IN')}`,
        'storesStat': stats.stores_compared
    };
    
    for (const [id, value] of Object.entries(updates)) {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = value;
            el.style.transform = 'scale(1.15)';
            setTimeout(() => {
                el.style.transform = 'scale(1)';
            }, 300);
        }
    }
}

function generateDemoPredictions(currentPrice) {
    const predictions = [];
    const days = ['Tomorrow', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    for (let i = 0; i < 7; i++) {
        const change = (Math.random() * 0.04 - 0.02);
        predictions.push({
            date: days[i],
            day: dayNames[i],
            predicted_price: Math.round(currentPrice * (1 + change)),
            change_percent: Math.round(change * 100 * 10) / 10,
            is_cheaper: change < 0,
            confidence: 0.7 + Math.random() * 0.2
        });
    }
    
    return {
        success: true,
        current_lowest_price: currentPrice,
        predictions: predictions,
        trend_analysis: {
            trend: 'decreasing',
            recommendation: 'Wait 2-3 days for best price'
        },
        model_confidence: 0.85
    };
}

function displayPredictions(predictionData) {
    const container = document.getElementById('predictions-content');
    if (!container) return;

    if (!predictionData || !predictionData.success) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #94a3b8;">
                <div style="font-size: 3rem; margin-bottom: 15px;">🤖</div>
                <p>AI predictions are currently unavailable</p>
            </div>
        `;
        return;
    }

    const { predictions, trend_analysis } = predictionData;
    
    container.innerHTML = `
        <div class="ai-predictions-container">
            <div class="ai-header">
                <div class="ai-icon">🤖</div>
                <div>
                    <h3 style="margin: 0; font-size: 1.5rem;">AI Price Predictions</h3>
                    <p style="margin: 5px 0 0 0; color: #94a3b8; font-size: 0.9rem;">Powered by ML Algorithms</p>
                </div>
            </div>
            
            <div class="recommendation-box">
                <div class="recommendation-icon">📢</div>
                <div class="recommendation-text">
                    <strong>Recommendation:</strong> ${trend_analysis.recommendation}
                </div>
            </div>
            
            <div class="forecast-header">
                <div class="forecast-title">📈 7-Day Price Forecast</div>
                <div class="confidence-badge">Confidence: 85%</div>
            </div>
            
            <div class="predictions-table">
                <table>
                    <thead>
                        <tr>
                            <th>Day</th>
                            <th>Date</th>
                            <th>Predicted Price</th>
                            <th>Change</th>
                            <th>Trend</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${predictions.map(pred => `
                            <tr class="${pred.is_cheaper ? 'trend-down' : 'trend-up'}">
                                <td class="day-cell">
                                    <div class="day-name">${pred.day}</div>
                                </td>
                                <td class="date-cell">${pred.date}</td>
                                <td class="price-cell">
                                    <div class="predicted-price">₹${pred.predicted_price.toLocaleString('en-IN')}</div>
                                </td>
                                <td class="change-cell">
                                    <span class="change-badge ${pred.change_percent < 0 ? 'negative' : 'positive'}">
                                        ${pred.change_percent < 0 ? '↓' : '↑'} ${Math.abs(pred.change_percent)}%
                                    </span>
                                </td>
                                <td class="trend-cell">
                                    ${pred.is_cheaper ? 
                                        '<span class="trend-down-icon">📉 Good to Buy</span>' : 
                                        '<span class="trend-up-icon">📈 Wait</span>'
                                    }
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            <div class="predictions-footer">
                <div class="legend">
                    <div class="legend-item">
                        <div class="legend-dot" style="background: #22c55e;"></div>
                        <span>Price dropping - Good time to buy</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-dot" style="background: #ef4444;"></div>
                        <span>Price rising - Wait for better time</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}
function renderComparisonTable(products) {
    const table = document.getElementById('comparisonTableData');
    if (!table || !products || products.length === 0) return;
    
    const sorted = [...products].sort((a, b) => (a.price || 0) - (b.price || 0));
    const bestPrice = sorted[0].price || 0;
    
    let html = `
        <thead>
            <tr>
                <th>Platform</th>
                <th>Price</th>
                <th>Original Price</th>
                <th>Discount</th>
                <th>Rating</th>
                <th>Stock</th>
                <th>Delivery</th>
            </tr>
        </thead>
        <tbody>
    `;
    
    sorted.forEach(p => {
        const isBest = p.price === bestPrice;
        const price = p.price || 0;
        const originalPrice = p.original_price || 0;
        const discount = p.discount_percent || 0;
        const rating = p.rating || '4.0';
        const stockStatus = p.stock_status || 'In Stock';
        const delivery = p.delivery || '2-3 days';
        
        html += `
            <tr style="background: ${isBest ? 'rgba(34, 197, 94, 0.05)' : 'transparent'};">
                <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 1.3rem;">${p.platform_icon || '🛒'}</span>
                        <span style="font-weight: 600;">${p.platform || 'Store'}</span>
                        ${isBest ? '<span style="color: #22c55e; font-size: 1.2rem;">🏆</span>' : ''}
                    </div>
                </td>
                <td style="font-weight: 800; font-size: 1.1rem; color: ${isBest ? '#22c55e' : 'white'};">
                    ₹${price.toLocaleString('en-IN')}
                </td>
                <td style="text-decoration: line-through; color: #94a3b8;">
                    ₹${originalPrice.toLocaleString('en-IN')}
                </td>
                <td>
                    ${discount > 0 ? `
                        <span style="background: #ef4444; color: white; padding: 4px 12px; border-radius: 12px; font-size: 0.85rem; font-weight: 700;">
                            ${discount}% OFF
                        </span>
                    ` : '<span style="color: #94a3b8;">No discount</span>'}
                </td>
                <td style="font-weight: 600;">⭐ ${rating}</td>
                <td style="color: #22c55e; font-weight: 600;">
                    ${stockStatus}
                </td>
                <td style="color: #94a3b8;">${delivery}</td>
            </tr>
        `;
    });
    
    html += '</tbody>';
    table.innerHTML = html;
}

async function loadTrendingProducts() {
    try {
        // Demo trending products
        const trending = [
            {name: 'iPhone 15 Pro', searches: 145, icon: '📱', category: 'Electronics'},
            {name: 'Nike Air Max', searches: 98, icon: '👟', category: 'Fashion'},
            {name: 'MacBook Air', searches: 87, icon: '💻', category: 'Electronics'},
            {name: 'AirPods Pro', searches: 76, icon: '🎧', category: 'Electronics'},
            {name: 'Samsung Galaxy S23', searches: 65, icon: '📱', category: 'Electronics'},
            {name: 'Sony Headphones', searches: 54, icon: '🎧', category: 'Electronics'}
        ];
        
        displayTrendingProducts(trending);
    } catch (error) {
        console.error('Trending load error:', error);
        // Show default trending
        displayTrendingProducts([
            {name: 'iPhone 15', searches: 120, icon: '📱'},
            {name: 'MacBook Pro', searches: 85, icon: '💻'},
            {name: 'Nike Shoes', searches: 72, icon: '👟'}
        ]);
    }
}

function displayTrendingProducts(trending) {
    const container = document.getElementById('trending-products');
    if (!container) return;
    
    // Clear container
    container.innerHTML = '';
    
    // Create trending items
    trending.forEach((item, index) => {
        const trendingItem = document.createElement('div');
        trendingItem.className = 'trending-item';
        trendingItem.style.cssText = `
            background: rgba(255, 255, 255, 0.05);
            border-radius: 12px;
            padding: 15px;
            margin: 8px;
            cursor: pointer;
            transition: all 0.3s ease;
            border: 1px solid rgba(255, 255, 255, 0.1);
        `;
        
        trendingItem.innerHTML = `
            <div style="display: flex; align-items: center; margin-bottom: 10px;">
                <div style="font-size: 1.8rem; margin-right: 12px;">${item.icon || '🛒'}</div>
                <div style="flex-grow: 1;">
                    <div style="font-weight: 600; font-size: 1rem; margin-bottom: 4px;">${item.name}</div>
                    <div style="font-size: 0.8rem; color: #94a3b8;">${item.category || 'Product'}</div>
                </div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="font-size: 0.8rem; color: #c026d3; font-weight: 600;">
                    🔥 ${item.searches || 50} searches
                </div>
                <button style="background: rgba(59, 130, 246, 0.2); color: #3b82f6; border: none; padding: 6px 12px; border-radius: 8px; font-size: 0.8rem; font-weight: 600; cursor: pointer;">
                    Search
                </button>
            </div>
        `;
        
        // Add click event
        trendingItem.addEventListener('click', (e) => {
            // Don't trigger if button was clicked
            if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
                return;
            }
            searchTrending(item.name);
        });
        
        // Add button click event
        const button = trendingItem.querySelector('button');
        if (button) {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                searchTrending(item.name);
            });
        }
        
        // Add hover effects
        trendingItem.addEventListener('mouseenter', () => {
            trendingItem.style.background = 'rgba(255, 255, 255, 0.1)';
            trendingItem.style.transform = 'translateY(-2px)';
            trendingItem.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.2)';
        });
        
        trendingItem.addEventListener('mouseleave', () => {
            trendingItem.style.background = 'rgba(255, 255, 255, 0.05)';
            trendingItem.style.transform = 'translateY(0)';
            trendingItem.style.boxShadow = 'none';
        });
        
        container.appendChild(trendingItem);
    });
}

function searchTrending(query) {
    if (!query) return;
    
    const productInput = document.getElementById('productInput');
    if (productInput) {
        productInput.value = query;
        productInput.focus();
        
        // Show notification
        showNotification(`🔍 Searching for: ${query}`, 'info');
        
        // Perform search after a short delay
        setTimeout(() => {
            performSearch();
        }, 500);
    }
}

// ==================== UI FUNCTIONS ====================
function showScreen(screenId) {
    // Hide all screens
    document.querySelectorAll('.view-section').forEach(s => s.classList.add('hidden'));
    
    // Show the requested screen
    const screen = document.getElementById(screenId);
    if (screen) {
        screen.classList.remove('hidden');
    }
    
    // Update navigation
    document.querySelectorAll('.nav-links a').forEach(l => l.classList.remove('active'));
    
    if (screenId === 'home-screen') {
        const navHome = document.getElementById('nav-home');
        if (navHome) navHome.classList.add('active');
        
        const navAnalysis = document.getElementById('nav-analysis');
        if (navAnalysis) navAnalysis.style.display = 'none';
    } else if (screenId === 'analysis-screen') {
        const navAnalysis = document.getElementById('nav-analysis');
        if (navAnalysis) {
            navAnalysis.classList.add('active');
            navAnalysis.style.display = 'inline-block';
        }
    }
}

function showHomeScreen() {
    showScreen('home-screen');
}

function openLoginModal() {
    closeRegisterModal();
    document.getElementById('login-screen').classList.remove('hidden');
}

function closeLoginModal() {
    document.getElementById('login-screen').classList.add('hidden');
}

function openRegisterModal() {
    closeLoginModal();
    document.getElementById('register-modal').classList.remove('hidden');
}

function closeRegisterModal() {
    document.getElementById('register-modal').classList.add('hidden');
}

function showProfileModal() {
    if (!currentUser) return;
    
    const content = document.getElementById('profile-content');
    if (content) {
        content.innerHTML = `
            <div style="text-align: left; padding: 20px 0;">
                <div style="margin-bottom: 20px; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 10px;">
                    <div style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 5px;">Name</div>
                    <div style="font-size: 1.1rem; font-weight: 600;">${currentUser.name}</div>
                </div>
                
                <div style="margin-bottom: 20px; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 10px;">
                    <div style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 5px;">Email</div>
                    <div style="font-size: 1.1rem; font-weight: 600;">${currentUser.email}</div>
                </div>
                
                <div style="margin-bottom: 20px; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 10px;">
                    <div style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 5px;">Member Since</div>
                    <div style="font-size: 1.1rem; font-weight: 600;">${new Date().toLocaleDateString()}</div>
                </div>
            </div>
            
            <button class="btn-primary" style="background: #ef4444; margin-bottom: 10px;" onclick="handleLogout()">
                Logout
            </button>
        `;
    }
    
    document.getElementById('profile-modal').classList.remove('hidden');
}

function closeProfileModal() {
    document.getElementById('profile-modal').classList.add('hidden');
}

function handleLogout() {
    authToken = null;
    currentUser = null;
    
    localStorage.removeItem('auth_token');
    localStorage.removeItem('current_user');
    
    updateUIForLoggedInUser();
    closeProfileModal();
    showNotification('✅ Logged out successfully', 'info');
}

function showWatchlistModal() {
    document.getElementById('watchlist-modal').classList.remove('hidden');
}

function closeWatchlistModal() {
    document.getElementById('watchlist-modal').classList.add('hidden');
}

// ==================== AUTHENTICATION ====================
function checkExistingSession() {
    const savedToken = localStorage.getItem('auth_token');
    if (savedToken) {
        authToken = savedToken;
        currentUser = JSON.parse(localStorage.getItem('current_user') || 'null');
        updateUIForLoggedInUser();
    }
}

async function handleLoginSubmit(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
        showNotification('⚠️ Please enter email and password', 'warning');
        return;
    }
    
    const btn = event.target.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.textContent = 'Authenticating...';
    btn.disabled = true;
    
    try {
        // Demo login
        setTimeout(() => {
            authToken = 'demo_token';
            currentUser = {
                name: email.split('@')[0],
                email: email
            };
            
            localStorage.setItem('auth_token', authToken);
            localStorage.setItem('current_user', JSON.stringify(currentUser));
            
            closeLoginModal();
            updateUIForLoggedInUser();
            showNotification(`✅ Welcome ${currentUser.name}!`, 'success');
            
            btn.textContent = originalText;
            btn.disabled = false;
        }, 1500);
        
    } catch (error) {
        console.error('Login error:', error);
        showNotification('❌ Login failed: ' + error.message, 'error');
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

async function handleRegisterSubmit(event) {
    event.preventDefault();
    
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    
    if (!name || name.length < 2) {
        showNotification('⚠️ Name must be at least 2 characters', 'warning');
        return;
    }
    
    if (!email.includes('@')) {
        showNotification('⚠️ Please enter a valid email', 'warning');
        return;
    }
    
    if (password.length < 8) {
        showNotification('⚠️ Password must be at least 8 characters', 'warning');
        return;
    }
    
    if (password !== confirmPassword) {
        showNotification('⚠️ Passwords do not match', 'warning');
        return;
    }
    
    const btn = event.target.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.textContent = 'Creating account...';
    btn.disabled = true;
    
    try {
        // Demo registration
        setTimeout(() => {
            authToken = 'demo_token';
            currentUser = {
                name: name,
                email: email
            };
            
            localStorage.setItem('auth_token', authToken);
            localStorage.setItem('current_user', JSON.stringify(currentUser));
            
            closeRegisterModal();
            updateUIForLoggedInUser();
            showNotification(`✅ Account created! Welcome ${currentUser.name}`, 'success');
            
            btn.textContent = originalText;
            btn.disabled = false;
        }, 1500);
        
    } catch (error) {
        console.error('Registration error:', error);
        showNotification('❌ Registration failed: ' + error.message, 'error');
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

function handleGoogleLogin() {
    showNotification('🔐 Connecting to Google...', 'info');
    
    // Demo Google login
    setTimeout(() => {
        authToken = 'demo_google_token';
        currentUser = {
            name: 'Google User',
            email: 'google@example.com'
        };
        
        localStorage.setItem('auth_token', authToken);
        localStorage.setItem('current_user', JSON.stringify(currentUser));
        
        closeLoginModal();
        updateUIForLoggedInUser();
        showNotification('✅ Google login successful!', 'success');
    }, 1500);
}

function handleGitHubLogin() {
    showNotification('🔐 Connecting to GitHub...', 'info');
    
    // Demo GitHub login
    setTimeout(() => {
        authToken = 'demo_github_token';
        currentUser = {
            name: 'GitHub User',
            email: 'github@example.com'
        };
        
        localStorage.setItem('auth_token', authToken);
        localStorage.setItem('current_user', JSON.stringify(currentUser));
        
        closeLoginModal();
        updateUIForLoggedInUser();
        showNotification('✅ GitHub login successful!', 'success');
    }, 1500);
}

function updateUIForLoggedInUser() {
    const loginBtn = document.getElementById('loginBtn');
    const authCTA = document.querySelector('.auth-cta');
    
    if (currentUser) {
        loginBtn.textContent = `👤 ${currentUser.name}`;
        loginBtn.classList.add('logged-in');
        loginBtn.onclick = showProfileModal;
        
        // Show user-only elements
        document.querySelectorAll('.user-only').forEach(el => {
            el.style.display = 'inline-block';
        });
        
        // TRANSFORM auth CTA for logged-in users
        if (authCTA) {
            authCTA.innerHTML = `
                <div class="cta-content">
                    <div class="cta-text">
                        <h3>🎯 Welcome Back, ${currentUser.name.split(' ')[0]}!</h3>
                        <p>Upgrade to Premium for advanced features and exclusive benefits!</p>
                        
                        <div class="feature-list">
                            <div class="feature-item">🚀 Priority price alerts</div>
                            <div class="feature-item">📈 Advanced analytics</div>
                            <div class="feature-item">🤖 Unlimited AI predictions</div>
                            <div class="feature-item">📊 Historical data access</div>
                            <div class="feature-item">⭐ Exclusive deals</div>
                            <div class="feature-item">🎯 Price prediction API</div>
                        </div>
                    </div>
                    
                    <div class="cta-buttons">
                        <button class="btn-premium" onclick="upgradeToPremium()">
                            ⚡ Upgrade to Premium - ₹299/month
                        </button>
                        <button class="btn-premium-secondary" onclick="showProfileModal()">
                            👤 View Profile
                        </button>
                        <div style="text-align: center; margin-top: 10px; font-size: 0.85rem; color: #94a3b8;">
                            7-day free trial • Cancel anytime
                        </div>
                    </div>
                </div>
            `;
        }
        
    } else {
        loginBtn.textContent = 'Login';
        loginBtn.classList.remove('logged-in');
        loginBtn.onclick = openLoginModal;
        
        // Hide user-only elements
        document.querySelectorAll('.user-only').forEach(el => {
            el.style.display = 'none';
        });
        
        // RESTORE original auth CTA for non-logged users
        if (authCTA) {
            authCTA.innerHTML = `
                <div class="cta-content">
                    <div class="cta-text">
                        <h3>🚀 Unlock Premium Features</h3>
                        <p>Create account to save searches, track price drops, and get AI recommendations. Join thousands of smart shoppers!</p>
                        
                        <div class="feature-list">
                            <div class="feature-item">Price drop alerts</div>
                            <div class="feature-item">Unlimited watchlists</div>
                            <div class="feature-item">Advanced AI predictions</div>
                            <div class="feature-item">Historical price charts</div>
                            <div class="feature-item">Multi-platform tracking</div>
                            <div class="feature-item">Priority support</div>
                        </div>
                    </div>
                    
                    <div class="cta-buttons">
                        <button class="btn-premium" id="ctaSignUpBtn">
                            ✨ Start Free Trial
                        </button>
                        <button class="btn-premium-secondary" id="ctaLoginBtn">
                            🔐 Existing Account
                        </button>
                        <div style="text-align: center; margin-top: 10px; font-size: 0.85rem; color: #94a3b8;">
                            No credit card required
                        </div>
                    </div>
                </div>
            `;
            
            // Re-attach event listeners
            setTimeout(() => {
                const ctaSignUpBtn = document.getElementById('ctaSignUpBtn');
                const ctaLoginBtn = document.getElementById('ctaLoginBtn');
                
                if (ctaSignUpBtn) {
                    ctaSignUpBtn.addEventListener('click', openRegisterModal);
                }
                if (ctaLoginBtn) {
                    ctaLoginBtn.addEventListener('click', openLoginModal);
                }
            }, 100);
        }
    }
}

function upgradeToPremium() {
    showNotification('🎉 Premium upgrade initiated!', 'success');

}
// ==================== HELPER FUNCTIONS ====================
function showNotification(message, type = 'info') {
    const colors = {
        'success': '#22c55e',
        'error': '#ef4444',
        'warning': '#f97316',
        'info': '#3b82f6'
    };
    
    const notif = document.createElement('div');
    notif.style.cssText = `
        position: fixed;
        top: 30px;
        right: 30px;
        padding: 16px 28px;
        background: ${colors[type]};
        color: white;
        border-radius: 12px;
        font-weight: 600;
        z-index: 10000;
        animation: slideIn 0.3s ease;
        box-shadow: 0 12px 40px rgba(0,0,0,0.4);
        max-width: 400px;
    `;
    
    notif.textContent = message;
    document.body.appendChild(notif);
    
    setTimeout(() => {
        notif.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notif.remove(), 300);
    }, 4000);
}

function addToWatchlist() {
    if (!currentSearchData) {
        showNotification('No search data available', 'error');
        return;
    }
    
    showNotification('✅ Added to watchlist!', 'success');
}

function shareResults() {
    if (!currentSearchData) return;
    
    const query = currentSearchData.query || 'products';
    const text = `I found ${currentSearchData.results.length} deals for "${query}" on PriceSmart AI!`;
    
    if (navigator.share) {
        navigator.share({
            title: 'PriceSmart AI Results',
            text: text,
            url: window.location.href
        });
    } else {
        navigator.clipboard.writeText(text);
        showNotification('📋 Results copied to clipboard!', 'success');
    }
}

function viewDeal(platform, price, url) {
    if (!platform || !price) return;
    
    // Show notification with platform-specific message
    const platformMessages = {
        'Amazon': 'Opening Amazon.in in new tab...',
        'Flipkart': 'Opening Flipkart.com in new tab...',
        'Myntra': 'Opening Myntra.com in new tab...',
        'Reliance Digital': 'Opening RelianceDigital.in in new tab...',
        'Croma': 'Opening Croma.com in new tab...',
        'Tata CLiQ': 'Opening TataCLiQ.com in new tab...'
    };
    
    const message = platformMessages[platform] || `Opening ${platform}...`;
    showNotification(`${message} - ₹${price.toLocaleString('en-IN')}`, 'info');
    
    // Open the actual website in new tab
    setTimeout(() => {
        if (url && url !== '#') {
            window.open(url, '_blank', 'noopener,noreferrer');
        } else {
            // Fallback to search page
            const query = document.getElementById('productInput').value || 'product';
            const searchUrls = {
                'Amazon': `https://www.amazon.in/s?k=${encodeURIComponent(query)}`,
                'Flipkart': `https://www.flipkart.com/search?q=${encodeURIComponent(query)}`,
                'Myntra': `https://www.myntra.com/${encodeURIComponent(query.toLowerCase().replace(/\s+/g, '-'))}`,
                'Reliance Digital': `https://www.reliancedigital.in/search?q=${encodeURIComponent(query)}`,
                'Croma': `https://www.croma.com/search/?q=${encodeURIComponent(query)}`,
                'Tata CLiQ': `https://www.tatacliq.com/search/?searchCategory=all&text=${encodeURIComponent(query)}`
            };
            
            const fallbackUrl = searchUrls[platform] || `https://www.google.com/search?q=${encodeURIComponent(query + ' ' + platform)}`;
            window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
        }
    }, 800);
}

// ==================== GLOBAL FUNCTIONS ====================
window.performSearch = performSearch;
window.startVoiceSearch = startVoiceSearch;
window.stopVoiceSearch = stopVoiceSearch;
window.toggleVoiceSearch = toggleVoiceSearch;
window.openLoginModal = openLoginModal;
window.openRegisterModal = openRegisterModal;
window.closeLoginModal = closeLoginModal;
window.closeRegisterModal = closeRegisterModal;
window.showProfileModal = showProfileModal;
window.closeProfileModal = closeProfileModal;
window.handleLogout = handleLogout;
window.showWatchlistModal = showWatchlistModal;
window.closeWatchlistModal = closeWatchlistModal;
window.addToWatchlist = addToWatchlist;
window.shareResults = shareResults;
window.searchTrending = searchTrending;
window.viewDeal = viewDeal;
window.showHomeScreen = showHomeScreen;
window.handleGoogleLogin = handleGoogleLogin;
window.handleGitHubLogin = handleGitHubLogin;

console.log('✅ PriceSmart AI JavaScript loaded successfully!');