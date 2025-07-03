#!/bin/bash

echo "🎨 Setting up Amsterdam Street Art Map with Database Integration"
echo "=============================================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "📦 Installing dependencies..."

# Install main project dependencies
echo "Installing main project dependencies..."
npm install

# Install API dependencies
echo "Installing API dependencies..."
cd api && npm install && cd ..

echo "✅ Dependencies installed successfully!"

echo ""
echo "🗃️  Database Setup Instructions:"
echo "================================"
echo "1. Go to your Supabase dashboard: https://supabase.com"
echo "2. Open the SQL Editor"
echo "3. Copy and paste the contents of 'setup-database.sql' into the editor"
echo "4. Run the SQL to create the necessary tables and policies"
echo ""

echo "🔧 Environment Variables:"
echo "========================="
echo "Make sure these environment variables are set in your .env file:"
echo ""
echo "Backend (.env):"
echo "- SUPABASE_URL"
echo "- SUPABASE_SERVICE_KEY (for backend operations)"
echo "- STRIPE_SECRET_KEY"
echo "- STRIPE_WEBHOOK_SECRET"
echo "- SENDGRID_API_KEY"
echo ""
echo "Frontend (.env.local):"
echo "- VITE_SUPABASE_URL" 
echo "- VITE_SUPABASE_ANON_KEY (for frontend operations)"
echo ""

echo "🚀 Next Steps:"
echo "=============="
echo "1. Set up your database using setup-database.sql"
echo "2. Configure your Stripe webhook endpoint:"
echo "   - URL: https://your-domain.com/api/stripe/webhook"
echo "   - Events: checkout.session.completed"
echo "3. Test a purchase with your email to verify the full flow"
echo "4. Run 'npm run dev' to start the development server"
echo ""

echo "💡 Testing the Flow:"
echo "==================="
echo "1. Make a test purchase using Stripe"
echo "2. Check your email for the purchase confirmation"
echo "3. Click the magic link in the email"
echo "4. Verify you get access to the purchased regions"
echo ""

echo "🎉 Setup complete! Your database-integrated authentication system is ready."
