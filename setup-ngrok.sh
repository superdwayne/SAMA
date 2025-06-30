#!/bin/bash

echo "🚀 Setting up ngrok for Amsterdam Street Art Map"
echo "================================================"

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
    echo "❌ Homebrew not found. Installing Homebrew first..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
else
    echo "✅ Homebrew is installed"
fi

# Install ngrok
echo "📦 Installing ngrok..."
brew install ngrok/ngrok/ngrok

# Check if ngrok is installed
if command -v ngrok &> /dev/null; then
    echo "✅ ngrok installed successfully!"
    echo ""
    echo "🔧 Next steps:"
    echo "1. Sign up for free ngrok account: https://ngrok.com/signup"
    echo "2. Get your auth token from: https://dashboard.ngrok.com/get-started/your-authtoken"
    echo "3. Run: ngrok config add-authtoken YOUR_TOKEN"
    echo "4. Start your server: cd server && npm run dev"
    echo "5. In new terminal, run: ngrok http 3001"
    echo ""
else
    echo "❌ ngrok installation failed"
    exit 1
fi
