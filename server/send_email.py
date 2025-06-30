#!/usr/bin/env python3
"""
Simple Python Email Service for Amsterdam Street Art Map
Sends beautifully formatted emails with access tokens
"""

import smtplib
import sys
import json
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta

def send_token_email(email, token, region):
    """Send access token email using Gmail SMTP"""
    
    # Gmail SMTP configuration (free)
    smtp_server = "smtp.gmail.com"
    smtp_port = 587
    
    # Get credentials from environment variables
    sender_email = os.environ.get("GMAIL_EMAIL")
    sender_password = os.environ.get("GMAIL_APP_PASSWORD")
    
    # Validate environment variables
    if not sender_email or not sender_password:
        return {
            "success": False,
            "error": "Missing environment variables. Please set GMAIL_EMAIL and GMAIL_APP_PASSWORD",
            "method": "python_gmail"
        }
    
    # Calculate expiration date (30 days from now)
    expiration_date = datetime.now() + timedelta(days=30)
    
    # Create message
    message = MIMEMultipart("alternative")
    message["Subject"] = f"🎨 Your Amsterdam Street Art Map Access Token - {region}"
    message["From"] = f"Street Art Museum Amsterdam <{sender_email}>"
    message["To"] = email
    
    # Create plain text version
    text_content = f"""
🎨 AMSTERDAM STREET ART MAP
===========================

Thank you for your purchase!

Your access token for the {region} district is:
{token}

This token is valid until {expiration_date.strftime('%B %d, %Y')}.

To activate your access:
1. Go to http://localhost:3000/token
2. Enter your email address: {email}
3. Enter the token above
4. Start exploring Amsterdam's street art!

Important: Keep this token safe. You'll need it to access the map.

Questions? Contact: info@streetartmuseumamsterdam.com

Best regards,
Amsterdam Street Art Map Team
    """
    
    # Create HTML version
    html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; color: #333; line-height: 1.6; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ 
            background: linear-gradient(135deg, #FFFF00 0%, #FF6B6B 100%); 
            color: #000; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; 
        }}
        .content {{ background: #f5f5f5; padding: 30px; border-radius: 0 0 10px 10px; }}
        .token-box {{ 
            background: white; border: 3px solid #000; padding: 20px; margin: 20px 0; 
            text-align: center; border-radius: 8px; box-shadow: 5px 5px 0px #000; 
        }}
        .token {{ 
            font-family: 'Courier New', monospace; font-size: 24px; color: #000; 
            font-weight: bold; background: #FFFF00; padding: 10px; border-radius: 5px; 
        }}
        .button {{ 
            display: inline-block; background: #0066FF; color: white; padding: 15px 30px; 
            text-decoration: none; border-radius: 5px; margin-top: 20px; font-weight: bold; 
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Street Art Museum Amsterdam</h1>
            <p>Your Access Token</p>
        </div>
        <div class="content">
            <h2>🎨 Thank you for your purchase!</h2>
            <p>Your access token for <strong>{region}</strong> is:</p>
            
            <div class="token-box">
                <div class="token">{token}</div>
            </div>
            
            <p><strong>Valid until:</strong> {expiration_date.strftime('%B %d, %Y')}</p>
            
            <center>
                <a href="http://localhost:3000/token" class="button">🗝️ Activate Your Access</a>
            </center>
            
            <p>🎯 Start your street art adventure in {region}!</p>
        </div>
    </div>
</body>
</html>
    """
    
    # Attach parts
    text_part = MIMEText(text_content, "plain")
    html_part = MIMEText(html_content, "html")
    message.attach(text_part)
    message.attach(html_part)
    
    try:
        # Connect to Gmail SMTP
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(sender_email, sender_password)
        
        # Send email
        server.sendmail(sender_email, email, message.as_string())
        server.quit()
        
        return {
            "success": True,
            "message": f"Email sent successfully to {email}",
            "method": "python_gmail"
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "method": "python_gmail"
        }

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print(json.dumps({
            "success": False,
            "error": "Usage: python3 send_email.py <email> <token> <region>"
        }))
        sys.exit(1)
    
    email = sys.argv[1]
    token = sys.argv[2]
    region = sys.argv[3]
    
    result = send_token_email(email, token, region)
    print(json.dumps(result))
