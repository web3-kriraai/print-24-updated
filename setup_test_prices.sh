#!/bin/bash

# Quick script to add test prices via API
# This will create price entries for a product

echo "🔧 Setting up test prices..."

# Get your auth token from localStorage
# You'll need to replace TOKEN with your actual token

TOKEN="YOUR_AUTH_TOKEN_HERE"
PRODUCT_ID="6946786e881195cf874387c4"  # Replace with actual product ID

# First, get user segments
echo "📊 Fetching user segments..."
curl -X GET "http://localhost:5000/api/admin/pricing/user-segments" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

echo ""
echo ""

# Create price book entry for RETAIL
echo "💰 Creating RETAIL price entry..."
curl -X POST "http://localhost:5000/api/admin/price-books" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "product": "'$PRODUCT_ID'",
    "userSegment": "RETAIL_SEGMENT_ID",
    "basePrice": 5000,
    "isActive": true
  }'

echo ""
echo "✅ Done! Refresh your product page to see prices."
