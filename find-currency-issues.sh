#!/bin/bash

# Currency Migration Helper Script
# Finds all hardcoded ₹ symbols in TypeScript/TSX files

echo "🔍 Scanning for hardcoded currency symbols..."
echo "=============================================="
echo ""

# Find all files with hardcoded ₹
grep -r "₹{" client/ --include="*.tsx" --include="*.ts" | grep -v node_modules | while IFS=: read -r file line; do
    # Extract the line number from grep output
    echo "📄 File: $file"
    echo "   Line: $line"
    echo ""
done

echo "=============================================="
echo "💡 To fix these:"
echo ""
echo "1. Add import:"
echo "   import { formatPrice } from '../src/utils/currencyUtils';"
echo ""
echo "2. Replace pattern:"
echo "   Before: ₹{price.toFixed(2)}"
echo "   After:  {formatPrice(price, currency)}"
echo ""
echo "3. If you have pricing object from API:"
echo "   import { formatPricingField } from '../utils/currencyUtils';"
echo "   {formatPricingField(pricing, 'totalPayable')}"
echo ""
echo "=============================================="

# Count total instances
total=$(grep -r "₹{" client/ --include="*.tsx" --include="*.ts" | grep -v node_modules | wc -l)
echo "📊 Total instances found: $total"
echo ""
echo "✅ Already migrated: ProductPriceBox.tsx, LivePricePreview.tsx, MyOrders.tsx"
