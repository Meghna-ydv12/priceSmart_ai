// background.js - PriceSmart AI Chrome Extension
const API_BASE_URL = 'http://localhost:5000/api';

chrome.runtime.onInstalled.addListener(() => {
    console.log('PriceSmart AI Extension Installed');
    chrome.storage.local.set({
        watchlist: [],
        authToken: null,
        user: null,
        currentProduct: null
    });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case 'productDetected':
            handleProductDetected(request.product);
            sendResponse({ success: true });
            break;
            
        case 'addToWatchlist':
            addToWatchlist(request.product)
                .then(response => sendResponse(response))
                .catch(error => sendResponse({ success: false, error: error.message }));
            break;
            
        case 'checkAuth':
            checkAuthStatus().then(status => sendResponse(status));
            break;
            
        case 'getCurrentProduct':
            chrome.storage.local.get(['currentProduct'], (result) => {
                sendResponse({ product: result.currentProduct });
            });
            break;
    }
    return true;
});

async function handleProductDetected(product) {
    await chrome.storage.local.set({ currentProduct: product });
    
    const { watchlist } = await chrome.storage.local.get('watchlist');
    const inWatchlist = watchlist.some(item => item.url === product.url);
    
    if (inWatchlist) {
        const updatedWatchlist = watchlist.map(item => {
            if (item.url === product.url) {
                return { ...item, currentPrice: product.price, lastChecked: new Date().toISOString() };
            }
            return item;
        });
        await chrome.storage.local.set({ watchlist: updatedWatchlist });
    }
}

async function addToWatchlist(product) {
    try {
        const { authToken, user } = await chrome.storage.local.get(['authToken', 'user']);
        
        if (!authToken || !user) {
            return { 
                success: false, 
                requiresAuth: true,
                message: 'Please login to use watchlist' 
            };
        }
        
        // Send to backend API
        const response = await fetch(`${API_BASE_URL}/watchlist/add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                product_name: product.name,
                current_price: product.price,
                url: product.url,
                platform: product.platform
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Store locally
            const { watchlist } = await chrome.storage.local.get('watchlist');
            const newItem = {
                ...product,
                addedAt: new Date().toISOString(),
                targetPrice: Math.round(product.price * 0.9)
            };
            
            await chrome.storage.local.set({ 
                watchlist: [...watchlist, newItem] 
            });
            
            // Show notification
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icon.png',
                title: 'PriceSmart AI',
                message: `Added "${product.name}" to watchlist`
            });
            
            return { success: true, message: 'Added to watchlist' };
        } else {
            return { success: false, error: data.error };
        }
        
    } catch (error) {
        console.error('Watchlist error:', error);
        return { success: false, error: error.message };
    }
}

async function checkAuthStatus() {
    const { authToken, user } = await chrome.storage.local.get(['authToken', 'user']);
    
    if (authToken && user) {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            
            if (response.ok) {
                return { authenticated: true, user: user };
            }
        } catch (error) {
            console.error('Auth check failed:', error);
        }
    }
    
    return { authenticated: false, user: null };
}

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        // Check if it's a supported e-commerce site
        if (tab.url.includes('amazon.in') || tab.url.includes('flipkart.com')) {
            // Inject content script
            chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ['content.js']
            });
        }
    }
});