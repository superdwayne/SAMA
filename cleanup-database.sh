#!/bin/bash

echo "🧹 Amsterdam Street Art Map - Database Cleanup"
echo "=============================================="
echo ""

# Check if we're cleaning production or development
if [[ "$1" == "prod" ]]; then
    echo "🌐 Cleaning PRODUCTION database..."
    BASE_URL="https://www.streetartmapamsterdam.nl"
else
    echo "🏠 Cleaning LOCAL database..."
    BASE_URL="http://localhost:3001"
    
    # Check if local server is running
    curl -s "$BASE_URL/api/health" > /dev/null
    if [ $? -ne 0 ]; then
        echo "❌ Local server is NOT responding"
        echo "Please start your server first"
        exit 1
    fi
fi

echo ""
echo "🧹 Running database cleanup..."
echo "------------------------------"

response=$(curl -s -X POST "$BASE_URL/api/cleanup-database" \
  -H "Content-Type: application/json" \
  -w "HTTP_STATUS:%{http_code}")

# Extract HTTP status
http_status=$(echo "$response" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)

# Extract response body
response_body=$(echo "$response" | sed 's/HTTP_STATUS:[0-9]*$//')

if [ "$http_status" = "200" ]; then
    echo "✅ Cleanup completed successfully!"
    echo "$response_body" | jq '.' 2>/dev/null || echo "$response_body"
else
    echo "❌ Cleanup failed (HTTP $http_status)"
    echo "$response_body"
fi

echo ""
echo "💡 TIP: Run this script regularly to keep your database clean"
echo "   Production: ./cleanup-database.sh prod"
echo "   Local: ./cleanup-database.sh"
