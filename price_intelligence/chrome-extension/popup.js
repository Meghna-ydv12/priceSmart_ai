// popup.js - PriceSmart AI Chrome Extension Popup
document.addEventListener('DOMContentLoaded', function() {
    const API_BASE_URL = 'http://localhost:5000/api';
    
    // Elements
    const productInfo = document.getElementById('productInfo');
    const productName = document.getElementById('productName');
    const productPrice = document.getElementById('productPrice');
    const productPlatform = document.getElementById('productPlatform');
    const openDashboardBtn = document.getElementById('openDashboard');
    const compareCurrentBtn = document.getElementById('compareCurrent');
    const addToWatchlistBtn = document.getElementById('addToWatchlist');
    const authSection = document.getElementById('authSection');
    const loginBtn = document.getElementById('loginBtn');
    const statusDiv = document.getElementById('status');
    
    // State
    let currentProduct = null;
    let isAuthenticated = false;
    let user = null;
    
    // Initialize
    init();
    
    async function init() {
        // Check authentication
        await checkAuth();
        
        // Load current product
        await loadCurrentProduct();
        
        // Update UI
        updateUI();
    }
    
    async function checkAuth() {
        try {
            const result = await chrome.storage.local.get(['authToken', 'user']);
            
            if (result.authToken && result.user) {
                // Verify token with backend
                const response = await fetch(`${API_BASE_URL}/auth/me`, {
                    headers: {
                        'Authorization': `Bearer ${result.authToken}`
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        isAuthenticated = true;
                        user = data.user;
                        return;
                    }
                }
            }
        } catch (error) {
            console.error('Auth check error:', error);
        }
        
        // Not authenticated
        isAuthenticated = false;
        user = null;
        chrome.storage.local.remove(['authToken', 'user']);
    }
    
    async function loadCurrentProduct() {
        try {
            const result = await chrome.storage.local.get(['currentProduct']);
            
            if (result.currentProduct && result.currentProduct.name) {
                currentProduct = result.currentProduct;
                
                // Show product info
                productInfo.classList.add('show');
                productName.textContent = currentProduct.name;
                productPrice.textContent = `₹${currentProduct.price.toLocaleString('en-IN')}`;
                productPlatform.textContent = currentProduct.platform || 'Unknown Platform';
            } else {
                // Try to get product from active tab
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                
                if (tab && (tab.url.includes('amazon.in') || tab.url.includes('flipkart.com'))) {
                    // Request product info from content script
                    const response = await chrome.tabs.sendMessage(tab.id, { action: 'getProductInfo' });
                    
                    if (response && response.product) {
                        currentProduct = response.product;
                        await chrome.storage.local.set({ currentProduct: currentProduct });
                        
                        productInfo.classList.add('show');
                        productName.textContent = currentProduct.name;
                        productPrice.textContent = `₹${currentProduct.price.toLocaleString('en-IN')}`;
                        productPlatform.textContent = currentProduct.platform || 'Unknown Platform';
                    } else {
                        showStatus('⚠️ No product detected on this page', 'error');
                        productInfo.classList.remove('show');
                    }
                } else {
                    showStatus('🌐 Visit Amazon.in or Flipkart.com', 'info');
                    productInfo.classList.remove('show');
                }
            }
        } catch (error) {
            console.error('Load product error:', error);
            showStatus('❌ Error loading product', 'error');
            productInfo.classList.remove('show');
        }
    }
    
    function updateUI() {
        // Show/hide auth section
        if (isAuthenticated) {
            authSection.classList.remove('show');
            addToWatchlistBtn.disabled = false;
            addToWatchlistBtn.textContent = '⭐ Add to Watchlist';
        } else {
            authSection.classList.add('show');
            addToWatchlistBtn.disabled = true;
            addToWatchlistBtn.textContent = '🔒 Login Required';
        }
        
        // Enable/disable compare button
        compareCurrentBtn.disabled = !currentProduct;
    }
    
    function showStatus(message, type = 'info') {
        statusDiv.textContent = message;
        statusDiv.className = `status ${type}`;
        
        // Clear status after 3 seconds
        setTimeout(() => {
            statusDiv.textContent = '';
            statusDiv.className = 'status';
        }, 3000);
    }
    
    // Event Listeners
    
    openDashboardBtn.addEventListener('click', () => {
        chrome.tabs.create({ url: 'http://localhost:5000' });
    });
    
    compareCurrentBtn.addEventListener('click', async () => {
        if (!currentProduct) {
            showStatus('⚠️ No product to compare', 'error');
            return;
        }
        
        const params = new URLSearchParams({
            product: currentProduct.name,
            price: currentProduct.price,
            platform: currentProduct.platform || 'Unknown',
            url: currentProduct.url || window.location.href
        });
        
        chrome.tabs.create({ 
            url: `http://localhost:5000/?${params.toString()}` 
        });
    });
    
    addToWatchlistBtn.addEventListener('click', async () => {
        if (!isAuthenticated) {
            showStatus('🔐 Please login first', 'error');
            return;
        }
        
        if (!currentProduct) {
            showStatus('⚠️ No product to add', 'error');
            return;
        }
        
        try {
            const { authToken } = await chrome.storage.local.get(['authToken']);
            
            const response = await fetch(`${API_BASE_URL}/watchlist/add`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    product_name: currentProduct.name,
                    current_price: currentProduct.price,
                    url: currentProduct.url,
                    platform: currentProduct.platform
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                showStatus('✅ Added to watchlist!', 'success');
                
                // Also store locally
                const { watchlist } = await chrome.storage.local.get(['watchlist']);
                const newWatchlist = [...(watchlist || []), {
                    ...currentProduct,
                    addedAt: new Date().toISOString()
                }];
                
                await chrome.storage.local.set({ watchlist: newWatchlist });
            } else {
                showStatus(`❌ ${data.error}`, 'error');
            }
        } catch (error) {
            console.error('Add to watchlist error:', error);
            showStatus('❌ Failed to add to watchlist', 'error');
        }
    });
    
    loginBtn.addEventListener('click', () => {
        chrome.tabs.create({ 
            url: 'http://localhost:5000#login' 
        });
    });
    
    // Listen for storage changes
    chrome.storage.onChanged.addListener((changes) => {
        if (changes.currentProduct) {
            currentProduct = changes.currentProduct.newValue;
            updateUI();
            
            if (currentProduct) {
                productInfo.classList.add('show');
                productName.textContent = currentProduct.name;
                productPrice.textContent = `₹${currentProduct.price.toLocaleString('en-IN')}`;
                productPlatform.textContent = currentProduct.platform || 'Unknown Platform';
            }
        }
        
        if (changes.authToken || changes.user) {
            checkAuth().then(() => updateUI());
        }
    });
    
    // Refresh product info every 2 seconds
    setInterval(async () => {
        await loadCurrentProduct();
        updateUI();
    }, 2000);
    
    console.log('✅ PriceSmart AI popup loaded');
});