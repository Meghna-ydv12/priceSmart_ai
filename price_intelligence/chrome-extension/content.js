// content.js - PriceSmart AI Chrome Extension
(function() {
    'use strict';
    
    // Check if we're on a supported product page
    function isProductPage() {
        const url = window.location.href;
        const amazonPattern = /amazon\.in\/(dp|gp\/product)\//;
        const flipkartPattern = /flipkart\.com\/[^\/]+\/p\//;
        
        return amazonPattern.test(url) || flipkartPattern.test(url);
    }
    
    // Extract product info
    function extractProductInfo() {
        const url = window.location.href;
        let product = {
            name: '',
            price: 0,
            platform: '',
            url: url,
            image: ''
        };
        
        try {
            if (url.includes('amazon.in')) {
                // Amazon India
                const titleElem = document.querySelector('#productTitle') || 
                                 document.querySelector('h1') ||
                                 document.querySelector('.a-size-large');
                
                const priceElem = document.querySelector('.a-price-whole') ||
                                 document.querySelector('.a-offscreen') ||
                                 document.querySelector('.priceBlockBuyingPriceString');
                
                const imageElem = document.querySelector('#landingImage') ||
                                 document.querySelector('#imgBlkFront') ||
                                 document.querySelector('.a-dynamic-image');
                
                if (titleElem) {
                    product.name = titleElem.textContent.trim().substring(0, 150);
                }
                
                if (priceElem) {
                    const priceText = priceElem.textContent.replace(/[^0-9]/g, '');
                    if (priceText) {
                        product.price = parseInt(priceText);
                    }
                }
                
                if (imageElem) {
                    product.image = imageElem.src || '';
                }
                
                product.platform = 'Amazon';
                
            } else if (url.includes('flipkart.com')) {
                // Flipkart
                const titleElem = document.querySelector('.B_NuCI') ||
                                 document.querySelector('h1') ||
                                 document.querySelector('span[class*="product-title"]');
                
                const priceElem = document.querySelector('._30jeq3') ||
                                 document.querySelector('.dyC4hf') ||
                                 document.querySelector('div[class*="price"]');
                
                const imageElem = document.querySelector('._396cs4') ||
                                 document.querySelector('img[class*="product-image"]') ||
                                 document.querySelector('img[src*="flipkart"]');
                
                if (titleElem) {
                    product.name = titleElem.textContent.trim().substring(0, 150);
                }
                
                if (priceElem) {
                    const priceText = priceElem.textContent.replace(/[^0-9]/g, '');
                    if (priceText) {
                        product.price = parseInt(priceText);
                    }
                }
                
                if (imageElem) {
                    product.image = imageElem.src || '';
                }
                
                product.platform = 'Flipkart';
            }
            
        } catch (error) {
            console.error('Error extracting product info:', error);
        }
        
        return product;
    }
    
    // Create PriceSmart AI button
    function createPriceSmartButton(product) {
        // Remove existing button if any
        const existingBtn = document.querySelector('.pricesmart-ai-button');
        if (existingBtn) existingBtn.remove();
        
        const button = document.createElement('button');
        button.className = 'pricesmart-ai-button';
        button.innerHTML = '🤖 Compare Price';
        
        // Style the button
        button.style.cssText = `
            position: fixed;
            bottom: 30px;
            right: 30px;
            background: linear-gradient(135deg, #c026d3, #3b82f6);
            color: white;
            padding: 14px 28px;
            border-radius: 30px;
            border: none;
            cursor: pointer;
            z-index: 9999;
            font-weight: bold;
            font-size: 16px;
            box-shadow: 0 8px 32px rgba(192, 38, 211, 0.4);
            font-family: 'Inter', -apple-system, sans-serif;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 10px;
        `;
        
        // Add hover effects
        button.onmouseenter = () => {
            button.style.transform = 'translateY(-4px) scale(1.05)';
            button.style.boxShadow = '0 12px 40px rgba(192, 38, 211, 0.6)';
        };
        
        button.onmouseleave = () => {
            button.style.transform = 'translateY(0) scale(1)';
            button.style.boxShadow = '0 8px 32px rgba(192, 38, 211, 0.4)';
        };
        
        // Click handler
        button.onclick = () => {
            if (product.name && product.price > 0) {
                // Store product for popup
                chrome.storage.local.set({ currentProduct: product });
                
                // Open PriceSmart AI website
                const searchParams = new URLSearchParams({
                    product: product.name,
                    price: product.price,
                    platform: product.platform,
                    url: window.location.href
                });
                
                window.open(`http://localhost:5000/?${searchParams.toString()}`, '_blank');
            } else {
                alert('⚠️ Could not extract product information. Please try again.');
            }
        };
        
        // Add to page
        document.body.appendChild(button);
        
        return button;
    }
    
    // Create floating notification
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = 'pricesmart-notification';
        notification.textContent = message;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            padding: 15px 25px;
            border-radius: 12px;
            font-weight: 600;
            z-index: 10000;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            animation: slideIn 0.3s ease;
            max-width: 350px;
            font-family: 'Inter', sans-serif;
        `;
        
        // Add animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    // Main initialization
    function init() {
        if (!isProductPage()) return;
        
        // Wait for page to fully load
        const checkInterval = setInterval(() => {
            const product = extractProductInfo();
            
            if (product.name && product.price > 0) {
                clearInterval(checkInterval);
                
                // Create button
                const button = createPriceSmartButton(product);
                
                // Store product in extension storage
                chrome.storage.local.set({ currentProduct: product });
                
                // Send message to background script
                chrome.runtime.sendMessage({
                    action: 'productDetected',
                    product: product
                });
                
                // Show notification
                showNotification(`🎯 ${product.name} detected! Click to compare prices.`, 'success');
                
                // Add auto-update when price changes (for SPA)
                observePriceChanges(product);
            }
        }, 1000);
        
        // Stop checking after 10 seconds
        setTimeout(() => clearInterval(checkInterval), 10000);
    }
    
    // Observe price changes (for single-page applications)
    function observePriceChanges(initialProduct) {
        const observer = new MutationObserver(() => {
            const updatedProduct = extractProductInfo();
            if (updatedProduct.price !== initialProduct.price) {
                initialProduct = updatedProduct;
                chrome.storage.local.set({ currentProduct: updatedProduct });
                
                // Update button
                const button = document.querySelector('.pricesmart-ai-button');
                if (button) {
                    button.innerHTML = `🤖 Compare: ₹${updatedProduct.price.toLocaleString('en-IN')}`;
                }
                
                showNotification(`💰 Price updated: ₹${updatedProduct.price.toLocaleString('en-IN')}`, 'info');
            }
        });
        
        // Observe the whole document for changes
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }
    
    // Start when page loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'getProductInfo') {
            const product = extractProductInfo();
            sendResponse({ product: product });
        }
        return true;
    });
    
    console.log('✅ PriceSmart AI content script loaded');
})();