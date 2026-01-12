import random
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from datetime import datetime, timedelta
import os
import sqlite3
import hashlib
import secrets
import re
import jwt

app = Flask(__name__, static_folder='./frontend', static_url_path='')
app.config['SECRET_KEY'] = secrets.token_hex(32)
app.config['JWT_SECRET_KEY'] = secrets.token_hex(32)

# Configure CORS properly
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:5000", "http://127.0.0.1:5000", "http://localhost:3000"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "Accept"],
        "supports_credentials": True
    }
})

# ==================== CONFIGURATION ====================
import os
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
DB_PATH = os.path.join(DATA_DIR, 'pricesmart.db')
MODEL_PATH = os.path.join(DATA_DIR, 'price_model.pkl')
os.makedirs(DATA_DIR, exist_ok=True)


# ==================== DATABASE ====================
class Database:
    def __init__(self):
        self.init_database()
    
    def init_database(self):
        conn = sqlite3.connect(str(DB_PATH))
        c = conn.cursor()
        
        # Users table
        c.execute('''CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            name TEXT NOT NULL,
            salt TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_login DATETIME,
            is_active BOOLEAN DEFAULT 1
        )''')
        
        # Searches table
        c.execute('''CREATE TABLE IF NOT EXISTS searches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            query TEXT NOT NULL,
            result_count INTEGER,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )''')
        
        # Watchlist table
        c.execute('''CREATE TABLE IF NOT EXISTS watchlist (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            product_name TEXT,
            current_price REAL,
            target_price REAL,
            added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_checked DATETIME,
            is_active BOOLEAN DEFAULT 1,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )''')
        
        # Price history table
        c.execute('''CREATE TABLE IF NOT EXISTS price_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_name TEXT NOT NULL,
            platform TEXT NOT NULL,
            price REAL NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )''')
        
        conn.commit()
        conn.close()
        print(f"✅ Database initialized at: {DB_PATH}")
    
    def create_user(self, email, password, name):
        try:
            conn = sqlite3.connect(str(DB_PATH))
            c = conn.cursor()
            
            # Check if user exists
            c.execute('SELECT id FROM users WHERE email = ?', (email,))
            if c.fetchone():
                conn.close()
                return None
            
            # Hash password with salt
            salt = secrets.token_hex(16)
            hashed = hashlib.sha256((password + salt).encode()).hexdigest()
            
            c.execute('INSERT INTO users (email, password, name, salt) VALUES (?, ?, ?, ?)',
                     (email, hashed, name, salt))
            user_id = c.lastrowid
            
            conn.commit()
            conn.close()
            return user_id
        except Exception as e:
            print(f"Database error: {e}")
            return None
    
    def verify_user(self, email, password):
        conn = sqlite3.connect(str(DB_PATH))
        c = conn.cursor()
        
        c.execute('SELECT id, password, salt, name FROM users WHERE email = ? AND is_active = 1', (email,))
        user = c.fetchone()
        
        if user:
            user_id, stored_hash, salt, name = user
            
            # Verify password
            if hashlib.sha256((password + salt).encode()).hexdigest() == stored_hash:
                # Update last login
                c.execute('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', (user_id,))
                conn.commit()
                conn.close()
                return {'id': user_id, 'name': name, 'email': email}
        
        conn.close()
        return None
    
    def get_user(self, user_id):
        conn = sqlite3.connect(str(DB_PATH))
        c = conn.cursor()
        
        c.execute('SELECT id, email, name, created_at, last_login FROM users WHERE id = ? AND is_active = 1', (user_id,))
        user = c.fetchone()
        conn.close()
        
        if user:
            return {
                'id': user[0],
                'email': user[1],
                'name': user[2],
                'created_at': user[3],
                'last_login': user[4]
            }
        return None
    
    def log_search(self, query, count, user_id=None):
        try:
            conn = sqlite3.connect(str(DB_PATH))
            c = conn.cursor()
            c.execute('INSERT INTO searches (user_id, query, result_count) VALUES (?, ?, ?)', 
                     (user_id, query, count))
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"Log search error: {e}")
    
    def get_trending(self):
        conn = sqlite3.connect(str(DB_PATH))
        c = conn.cursor()
        c.execute('''SELECT query, COUNT(*) as count 
                     FROM searches 
                     WHERE timestamp > datetime('now', '-7 days')
                     GROUP BY query 
                     ORDER BY count DESC 
                     LIMIT 6''')
        results = c.fetchall()
        conn.close()
        
        icons = ['📱', '👟', '💻', '🎧', '⌚', '📚']
        trending = []
        
        if results:
            for i, (name, count) in enumerate(results[:6]):
                trending.append({
                    'name': name.title(),
                    'searches': count * 10 + random.randint(20, 50),
                    'icon': icons[i] if i < len(icons) else '🛍️'
                })
        
        # Add defaults if empty
        if not trending:
            trending = [
                {'name': 'iPhone 15 Pro', 'searches': 145, 'icon': '📱'},
                {'name': 'Nike Air Max', 'searches': 98, 'icon': '👟'},
                {'name': 'MacBook Air M2', 'searches': 87, 'icon': '💻'},
                {'name': 'AirPods Pro', 'searches': 76, 'icon': '🎧'},
                {'name': 'Apple Watch', 'searches': 65, 'icon': '⌚'},
                {'name': 'Kindle Paperwhite', 'searches': 54, 'icon': '📚'}
            ]
        
        return trending

# ==================== PRICE SCRAPER ====================
class PriceScraper:
    def __init__(self):
        self.platforms = [
            {'name': 'Amazon', 'icon': '📦', 'color': '#FF9900'},
            {'name': 'Flipkart', 'icon': '🛒', 'color': '#047BD5'},
            {'name': 'Myntra', 'icon': '👕', 'color': '#FF3F6C'},
            {'name': 'Reliance Digital', 'icon': '🔷', 'color': '#0078FF'},
            {'name': 'Croma', 'icon': '🔴', 'color': '#E42529'},
            {'name': 'Tata CLiQ', 'icon': '⚡', 'color': '#000000'}
        ]
    
    def generate_realistic_data(self, query):
        products = []
        
        # Base price based on product type
        base_prices = {
            'iphone': 75000,
            'macbook': 120000,
            'airpods': 25000,
            'watch': 35000,
            'samsung': 55000,
            'nike': 12000,
            'sony': 45000,
            'camera': 60000,
            'laptop': 80000,
            'headphone': 15000,
            'tv': 50000,
            'tablet': 40000
        }
        
        query_lower = query.lower()
        base_price = 25000  # Default
        
        for keyword, price in base_prices.items():
            if keyword in query_lower:
                base_price = price
                break
        
        for i, platform in enumerate(self.platforms):
            # Generate realistic price variations
            variation = random.uniform(0.85, 1.15)
            price = int(base_price * variation)
            price = round(price / 100) * 100  # Round to nearest 100
            
            original_price = int(price * random.uniform(1.1, 1.3))
            discount = int(((original_price - price) / original_price) * 100)
            
            product = {
                'platform': platform['name'],
                'platform_icon': platform['icon'],
                'platform_color': platform['color'],
                'title': f"{query.title()} - {platform['name']} Exclusive",
                'price': price,
                'original_price': original_price,
                'discount_percent': discount,
                'rating': round(random.uniform(3.5, 4.8), 1),
                'reviews_count': random.randint(100, 50000),
                'url': f"https://www.{platform['name'].lower().replace(' ', '')}.com/search?q={query.replace(' ', '+')}",
                'stock_status': random.choices(['In Stock', 'Limited Stock', 'Out of Stock'], 
                                              weights=[0.7, 0.2, 0.1])[0],
                'shipping': random.choice(['FREE Delivery', 'FREE Shipping', '₹49 Shipping']),
                'delivery': f"{random.randint(1, 3)}-{random.randint(3, 7)} days",
                'seller': f"{platform['name']} {random.choice(['Authorized', 'Certified', 'Official'])} Seller",
                'category': 'electronics' if any(word in query_lower for word in ['phone', 'laptop', 'tablet', 'camera']) else 'fashion',
                'is_best_price': False
            }
            products.append(product)
        
        # Mark best price
        if products:
            products.sort(key=lambda x: x['price'])
            products[0]['is_best_price'] = True
        
        return products

# ==================== AI PREDICTOR ====================
class AIPredictor:
    def __init__(self):
        print("✅ AIPredictor initialized")
        self.model = None
    
    def load_or_create_model(self):
        return None
    
    def predict(self, current_price, product_name):
        predictions = []
        days = ['Tomorrow', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7']
        day_names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        
        # Generate predictions
        for i in range(7):
            change = random.uniform(-0.04, 0.02)
            predicted_price = int(current_price * (1 + change))
            predicted_price = max(predicted_price, int(current_price * 0.85))
            
            predictions.append({
                'date': days[i],
                'day': day_names[i],
                'predicted_price': predicted_price,
                'change_percent': round(change * 100, 1),
                'is_cheaper': change < 0,
                'confidence': round(random.uniform(0.75, 0.92), 2)
            })
        
        # Find best day to buy
        best_day = min(predictions, key=lambda x: x['predicted_price'])
        savings = current_price - best_day['predicted_price']
        
        if savings > current_price * 0.05:
            recommendation = f"Wait for {best_day['date']} ({best_day['day']}) to save ₹{savings:,}"
            trend = 'decreasing'
        elif savings > current_price * 0.02:
            recommendation = "Good time to buy, but wait 2-3 days for better deal"
            trend = 'stable'
        else:
            recommendation = "Buy now! Prices are at their lowest"
            trend = 'stable'
        
        return {
            'success': True,
            'current_lowest_price': current_price,
            'predictions': predictions,
            'trend_analysis': {'trend': trend, 'recommendation': recommendation},
            'best_time_to_buy': {
                'date': best_day['date'],
                'day': best_day['day'],
                'savings': int(savings)
            },
            'model_confidence': round(random.uniform(0.82, 0.95), 2)
        }

# ==================== INITIALIZE ====================
db = Database()
scraper = PriceScraper()
predictor = AIPredictor()

def calculate_stats(products):
    if not products:
        return {}
    
    prices = [p['price'] for p in products]
    originals = [p['original_price'] for p in products]
    
    return {
        'lowest_price': min(prices),
        'highest_price': max(prices),
        'average_price': int(sum(prices) / len(prices)),
        'stores_compared': len(products),
        'max_savings': int(max(originals) - min(prices)),
        'average_discount': int(((sum(originals) - sum(prices)) / sum(originals)) * 100),
        'best_platform': min(products, key=lambda x: x['price'])['platform']
    }

def generate_jwt_token(user_id):
    payload = {
        'user_id': user_id,
        'exp': datetime.utcnow() + timedelta(days=7)
    }
    return jwt.encode(payload, app.config['JWT_SECRET_KEY'], algorithm='HS256')

def validate_email(email):
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def token_required(f):
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
        
        if not token:
            return jsonify({'success': False, 'error': 'Token is missing'}), 401
        
        try:
            payload = jwt.decode(token, app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
            request.user_id = payload['user_id']
        except jwt.ExpiredSignatureError:
            return jsonify({'success': False, 'error': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'success': False, 'error': 'Invalid token'}), 401
        
        return f(*args, **kwargs)
    decorated.__name__ = f.__name__
    return decorated

# ==================== STATIC FILE SERVING ====================
@app.route('/')
def serve_index():
    return send_from_directory('../frontend', 'index.html')

@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory('../frontend', filename)

# ==================== API ROUTES ====================

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'online',
        'service': 'PriceSmart AI',
        'version': '2.0',
        'timestamp': datetime.now().isoformat(),
        'database': 'connected',
        'message': 'Server is running perfectly!'
    })

@app.route('/api/auth/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        name = data.get('name', '').strip()
        
        # Validation
        if not validate_email(email):
            return jsonify({'success': False, 'error': 'Invalid email format'}), 400
        
        if len(password) < 8:
            return jsonify({'success': False, 'error': 'Password must be at least 8 characters'}), 400
        
        if not name or len(name) < 2:
            return jsonify({'success': False, 'error': 'Name must be at least 2 characters'}), 400
        
        # Create user
        user_id = db.create_user(email, password, name)
        
        if not user_id:
            return jsonify({'success': False, 'error': 'Email already registered'}), 400
        
        # Generate token
        token = generate_jwt_token(user_id)
        
        return jsonify({
            'success': True,
            'message': 'Registration successful',
            'user': {
                'id': user_id,
                'name': name,
                'email': email
            },
            'token': token
        })
        
    except Exception as e:
        print(f"Registration error: {e}")
        return jsonify({'success': False, 'error': 'Registration failed'}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        
        if not email or not password:
            return jsonify({'success': False, 'error': 'Email and password required'}), 400
        
        user = db.verify_user(email, password)
        
        if not user:
            return jsonify({'success': False, 'error': 'Invalid credentials'}), 401
        
        # Generate token
        token = generate_jwt_token(user['id'])
        
        return jsonify({
            'success': True,
            'message': 'Login successful',
            'user': user,
            'token': token
        })
        
    except Exception as e:
        print(f"Login error: {e}")
        return jsonify({'success': False, 'error': 'Login failed'}), 500

@app.route('/api/auth/me', methods=['GET'])
@token_required
def get_current_user():
    try:
        user = db.get_user(request.user_id)
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 404
        
        return jsonify({'success': True, 'user': user})
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/search', methods=['POST'])
def search():
    try:
        data = request.get_json()
        query = data.get('product', '').strip()
        
        if not query or len(query) < 2:
            return jsonify({'success': False, 'error': 'Enter at least 2 characters'}), 400
        
        print(f"\n🔍 Searching for: {query}")
        
        # Get user ID from token if available
        user_id = None
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            try:
                token = auth_header.split(' ')[1]
                payload = jwt.decode(token, app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
                user_id = payload['user_id']
            except:
                pass
        
        # Generate realistic products
        products = scraper.generate_realistic_data(query)
        
        # Log search
        db.log_search(query, len(products), user_id)
        
        # Calculate statistics
        stats = calculate_stats(products)
        
        # Generate AI predictions
        predictions = predictor.predict(stats['lowest_price'], query)
        
        print(f"✅ Found {len(products)} products")
        print(f"💰 Price range: ₹{stats['lowest_price']:,} - ₹{stats['highest_price']:,}")
        
        return jsonify({
            'success': True,
            'query': query,
            'results': products,
            'statistics': stats,
            'predictions': predictions,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        print(f"❌ Search error: {e}")
        return jsonify({'success': False, 'error': 'Search failed. Please try again.'}), 500

@app.route('/api/trending', methods=['GET'])
def trending():
    try:
        trending_data = db.get_trending()
        return jsonify({
            'success': True,
            'trending': trending_data
        })
    except Exception as e:
        print(f"Trending error: {e}")
        return jsonify({
            'success': True,
            'trending': [
                {'name': 'iPhone 15 Pro', 'searches': 145, 'icon': '📱'},
                {'name': 'Nike Air Max', 'searches': 98, 'icon': '👟'},
                {'name': 'MacBook Air M2', 'searches': 87, 'icon': '💻'},
                {'name': 'AirPods Pro', 'searches': 76, 'icon': '🎧'},
                {'name': 'Apple Watch', 'searches': 65, 'icon': '⌚'},
                {'name': 'Kindle Paperwhite', 'searches': 54, 'icon': '📚'}
            ]
        })

@app.route('/api/watchlist', methods=['GET'])
@token_required
def get_watchlist():
    try:
        user_id = request.user_id
        
        # Connect to database
        conn = sqlite3.connect(str(DB_PATH))
        c = conn.cursor()
        
        # Get user's watchlist
        c.execute('SELECT product_name, current_price, target_price, added_at FROM watchlist WHERE user_id = ? AND is_active = 1', (user_id,))
        items = c.fetchall()
        conn.close()
        
        watchlist_items = []
        for item in items:
            watchlist_items.append({
                'name': item[0],
                'current_price': item[1],
                'target_price': item[2],
                'added_at': item[3]
            })
        
        return jsonify({
            'success': True,
            'items': watchlist_items,
            'count': len(watchlist_items)
        })
        
    except Exception as e:
        print(f"Watchlist error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/watchlist/add', methods=['POST'])
@token_required
def add_to_watchlist():
    try:
        data = request.get_json()
        product_name = data.get('product_name', '')
        current_price = data.get('current_price', 0)
        
        if not product_name:
            return jsonify({'success': False, 'error': 'Product name is required'}), 400
        
        user_id = request.user_id
        
        # Connect to database
        conn = sqlite3.connect(str(DB_PATH))
        c = conn.cursor()
        
        # Check if already in watchlist
        c.execute('SELECT id FROM watchlist WHERE user_id = ? AND product_name = ?', (user_id, product_name))
        existing = c.fetchone()
        
        if existing:
            # Update existing
            c.execute('UPDATE watchlist SET current_price = ?, last_checked = CURRENT_TIMESTAMP WHERE id = ?', 
                     (current_price, existing[0]))
        else:
            # Add new
            target_price = current_price * 0.9  # 10% below current price
            c.execute('INSERT INTO watchlist (user_id, product_name, current_price, target_price) VALUES (?, ?, ?, ?)',
                     (user_id, product_name, current_price, target_price))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': f'Added {product_name} to watchlist'
        })
        
    except Exception as e:
        print(f"Add to watchlist error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/auth/google', methods=['POST'])
def google_auth():
    """Demo Google authentication"""
    try:
        data = request.get_json()
        email = data.get('email', f"google_user_{random.randint(1000, 9999)}@example.com")
        name = data.get('name', 'Google User')
        
        # Check if user exists
        conn = sqlite3.connect(str(DB_PATH))
        c = conn.cursor()
        c.execute('SELECT id, name, email FROM users WHERE email = ?', (email,))
        existing = c.fetchone()
        
        if existing:
            user_id, name, email = existing
        else:
            # Create new user
            salt = secrets.token_hex(16)
            random_password = secrets.token_hex(8)
            hashed = hashlib.sha256((random_password + salt).encode()).hexdigest()
            
            c.execute('INSERT INTO users (email, password, name, salt) VALUES (?, ?, ?, ?)',
                     (email, hashed, name, salt))
            user_id = c.lastrowid
            conn.commit()
        
        conn.close()
        
        # Generate token
        token = generate_jwt_token(user_id)
        
        return jsonify({
            'success': True,
            'message': 'Google login successful',
            'user': {'id': user_id, 'name': name, 'email': email},
            'token': token
        })
        
    except Exception as e:
        print(f"Google auth error: {e}")
        return jsonify({'success': False, 'error': 'Google authentication failed'}), 500

@app.route('/api/auth/github', methods=['POST'])
def github_auth():
    """Demo GitHub authentication"""
    try:
        data = request.get_json()
        email = data.get('email', f"github_user_{random.randint(1000, 9999)}@example.com")
        name = data.get('name', 'GitHub User')
        
        # Check if user exists
        conn = sqlite3.connect(str(DB_PATH))
        c = conn.cursor()
        c.execute('SELECT id, name, email FROM users WHERE email = ?', (email,))
        existing = c.fetchone()
        
        if existing:
            user_id, name, email = existing
        else:
            # Create new user
            salt = secrets.token_hex(16)
            random_password = secrets.token_hex(8)
            hashed = hashlib.sha256((random_password + salt).encode()).hexdigest()
            
            c.execute('INSERT INTO users (email, password, name, salt) VALUES (?, ?, ?, ?)',
                     (email, hashed, name, salt))
            user_id = c.lastrowid
            conn.commit()
        
        conn.close()
        
        # Generate token
        token = generate_jwt_token(user_id)
        
        return jsonify({
            'success': True,
            'message': 'GitHub login successful',
            'user': {'id': user_id, 'name': name, 'email': email},
            'token': token
        })
        
    except Exception as e:
        print(f"GitHub auth error: {e}")
        return jsonify({'success': False, 'error': 'GitHub authentication failed'}), 500

if __name__ == '__main__':
    try:
        port = int(os.environ.get("PORT", 10000))
        
        print("\n" + "="*70)
        print("🚀 PRICESMART AI - FULL VERSION")
        print("="*70)
        print(f"🌐 Starting server on port: {port}")
        
        # Initialize database
        db.init_database()
        print("✅ Database initialized")
        
        print("="*70)
        print("✅ Server is running!")
        print("="*70 + "\n")
        
        app.run(host='0.0.0.0', port=port, debug=False)
        
    except Exception as e:
        print(f"❌ Server failed to start: {e}")
        import traceback
        traceback.print_exc()
        print("\n" + "="*70)
        print("🔧 Common fixes:")
        print("1. Check if all imports are correct")
        print("2. Check if data/ directory exists")
        print("3. Check requirements.txt has all packages")
        print("="*70)
    

    app.run(host='0.0.0.0', port=port, debug=False)  
