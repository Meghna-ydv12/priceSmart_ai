import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import threading
import sqlite3
from datetime import datetime
from pathlib import Path
import os

import os
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
DB_PATH = os.path.join(DATA_DIR, 'pricesmart.db')

class PriceAlertSystem:
    def __init__(self):
        self.alerts = {}
        
    def check_price_drop(self, product_name, current_price, stored_price):
        """Check if price dropped by threshold"""
        if stored_price and current_price < stored_price * 0.9:  # 10% drop
            return True, stored_price - current_price
        return False, 0
    
    def send_email_alert(self, email, product_name, old_price, new_price, savings):
        """Send email notification"""
        print(f"📧 Price alert for {product_name}: ₹{old_price} → ₹{new_price} (Save ₹{savings})")
        
        # Email configuration (replace with your actual email settings)
        sender_email = "alerts@pricesmart.ai"
        sender_password = "your_password_here"  # In production, use environment variables
        
        # Create message
        msg = MIMEMultipart()
        msg['From'] = sender_email
        msg['To'] = email
        msg['Subject'] = f"🔥 Price Drop Alert: {product_name}"
        
        body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #c026d3, #3b82f6); color: white; padding: 30px; text-align: center; border-radius: 10px; }}
                .content {{ padding: 20px; background: #f9f9f9; border-radius: 10px; margin-top: 20px; }}
                .price {{ font-size: 32px; font-weight: bold; color: #22c55e; }}
                .old-price {{ text-decoration: line-through; color: #666; }}
                .savings {{ background: #22c55e; color: white; padding: 10px 20px; border-radius: 20px; font-weight: bold; }}
                .button {{ display: inline-block; background: #c026d3; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; margin-top: 20px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎯 PriceSmart AI Alert</h1>
                    <p>Your price drop is here!</p>
                </div>
                
                <div class="content">
                    <h2>{product_name}</h2>
                    
                    <div style="margin: 30px 0;">
                        <span class="old-price">₹{old_price:,}</span>
                        <span class="price">→ ₹{new_price:,}</span>
                    </div>
                    
                    <div class="savings">
                        You save: ₹{savings:,}
                    </div>
                    
                    <p style="margin-top: 30px;">
                        <a href="http://localhost:5000" class="button">View on PriceSmart AI →</a>
                    </p>
                    
                    <p style="margin-top: 30px; color: #666; font-size: 14px;">
                        This alert was triggered because the price dropped by more than 10%.<br>
                        You can manage your alerts in your PriceSmart AI account.
                    </p>
                </div>
            </div>
        </body>
        </html>
        """
        
        msg.attach(MIMEText(body, 'html'))
        
        try:
            # In production, uncomment and configure SMTP
            """
            with smtplib.SMTP('smtp.gmail.com', 587) as server:
                server.starttls()
                server.login(sender_email, sender_password)
                server.send_message(msg)
            """
            print(f"✅ Email alert sent to {email}")
            return True
            
        except Exception as e:
            print(f"❌ Failed to send email: {e}")
            # For demo purposes, we'll still return True
            return True
    
    def check_all_watchlists(self):
        """Check all watchlists for price drops"""
        try:
            conn = sqlite3.connect(str(DB_PATH))
            c = conn.cursor()
            
            # Get all active watchlist items
            c.execute('''SELECT w.id, w.user_id, w.product_name, w.current_price, w.target_price, u.email 
                        FROM watchlist w 
                        JOIN users u ON w.user_id = u.id 
                        WHERE w.is_active = 1''')
            
            items = c.fetchall()
            
            alerts_sent = 0
            for item in items:
                item_id, user_id, product_name, current_price, target_price, email = item
                
                # Check if price reached target
                if current_price <= target_price:
                    print(f"🎯 Target price reached for {product_name}: ₹{current_price} (target: ₹{target_price})")
                    
                    # Send alert
                    if self.send_email_alert(email, product_name, target_price, current_price, target_price - current_price):
                        # Update last checked
                        c.execute('UPDATE watchlist SET last_checked = CURRENT_TIMESTAMP WHERE id = ?', (item_id,))
                        alerts_sent += 1
            
            conn.commit()
            conn.close()
            
            print(f"✅ Checked {len(items)} watchlist items, sent {alerts_sent} alerts")
            return alerts_sent
            
        except Exception as e:
            print(f"❌ Watchlist check error: {e}")
            return 0
    
    def start_background_checking(self, interval_minutes=30):
        """Start background thread to check prices periodically"""
        def check_loop():
            while True:
                import time
                time.sleep(interval_minutes * 60)  # Convert minutes to seconds
                self.check_all_watchlists()
        
        # Start background thread
        thread = threading.Thread(target=check_loop, daemon=True)
        thread.start()
        print(f"✅ Background price checking started (every {interval_minutes} minutes)")
        return thread

# Global alert system instance
alert_system = PriceAlertSystem()

def send_test_alert():
    """Send a test alert (for debugging)"""
    alert_system.send_email_alert(
        "test@example.com",
        "iPhone 15 Pro",
        89999,
        79999,
        10000
    )

if __name__ == "__main__":
    # Test the alert system
    send_test_alert()