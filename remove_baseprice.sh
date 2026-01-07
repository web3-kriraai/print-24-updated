#!/bin/bash

# Script to remove basePrice field from AdminDashboard.tsx
# This script will comment out the basePrice input field and add a dynamic pricing message

FILE="/home/narendra/Desktop/KriraAi/print-24 (2)/print-24/client/pages/AdminDashboard.tsx"

echo "🔧 Updating AdminDashboard.tsx to remove basePrice field..."

# Create backup
cp "$FILE" "$FILE.backup"
echo "✅ Backup created: $FILE.backup"

# Use sed to comment out basePrice related lines (lines 7293-7337)
# This is safer than trying to replace the content
sed -i '7293,7337 s/^/\/\/ REMOVED FOR DYNAMIC PRICING: /' "$FILE"

echo "✅ BasePrice field commented out (lines 7293-7337)"
echo ""
echo "📝 Next steps:"
echo "1. Open AdminDashboard.tsx"
echo "2. Find line 7293 (search for 'REMOVED FOR DYNAMIC PRICING')"
echo "3. Replace the commented section with the dynamic pricing info box"
echo "4. Copy the replacement code from ADMIN_DASHBOARD_UPDATES.md"
echo ""
echo "Or I can create a patch file for you to apply manually."

read -p "Do you want me to create a patch file? (y/n): " CREATE_PATCH

if [ "$CREATE_PATCH" = "y" ]; then
  echo "Creating patch file..."
  cat > /tmp/admin_dashboard_baseprice.patch << 'EOF'
--- a/client/pages/AdminDashboard.tsx
+++ b/client/pages/AdminDashboard.tsx
@@ -7290,48 +7290,38 @@
                   Pricing & Category
                 </h3>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
-                  <div>
-                    <label className="block text-sm font-medium text-cream-900 mb-2 flex items-center gap-2">
-                      Base Price (INR per unit) *
-                      <div className="group relative">
-                        <Info size={14} className="text-cream-500 cursor-help" />
-                        <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-10 w-64 p-2 bg-cream-900 text-white text-xs rounded-lg shadow-lg">
-                          The base price per unit before any options, discounts, or taxes are applied.
+                  {/* Dynamic Pricing Info - Prices managed in Price Books */}
+                  <div className="col-span-2">
+                    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
+                      <div className="flex items-start gap-3">
+                        <DollarSign className="w-6 h-6 text-blue-600 mt-0.5 flex-shrink-0" />
+                        <div className="flex-1">
+                          <h4 className="font-semibold text-blue-900 mb-1 flex items-center gap-2">
+                            💰 Dynamic Pricing Enabled
+                          </h4>
+                          <p className="text-sm text-blue-700 mb-3">
+                            Prices for this product are managed through <strong>Price Books</strong> and <strong>Modifiers</strong>.
+                            After creating the product, set up different prices for different user segments (Retail, VIP, Corporate) and locations.
+                          </p>
+                          <div className="flex gap-2">
+                            <button
+                              type="button"
+                              onClick={() => {
+                                setActiveTab('price-books');
+                                toast.success('Navigate to Price Books after saving this product');
+                              }}
+                              className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
+                            >
+                              Go to Price Books →
+                            </button>
+                            <button
+                              type="button"
+                              onClick={() => {
+                                setActiveTab('modifiers');
+                                toast.success('Navigate to Modifiers after saving this product');
+                              }}
+                              className="text-sm bg-white text-blue-600 border border-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors"
+                            >
+                              View Modifiers
+                            </button>
+                          </div>
                         </div>
                       </div>
-                    </label>
-                    <div className="relative">
-                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cream-600">₹</span>
-                      <input
-                        id="product-basePrice"
-                        name="basePrice"
-                        type="number"
-                        required
-                        step="0.00001"
-                        min="0"
-                        value={productForm.basePrice}
-                        onChange={(e) => {
-                          setProductForm({
-                            ...productForm,
-                            basePrice: e.target.value,
-                          });
-                          // Clear error when user starts typing
-                          if (productFormErrors.basePrice) {
-                            setProductFormErrors({ ...productFormErrors, basePrice: undefined });
-                          }
-                        }}
-                        className={`w-full pl-8 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-cream-500 focus:border-cream-500 ${productFormErrors.basePrice ? 'border-red-300 bg-red-50' : 'border-cream-300'
-                          }`}
-                        placeholder="0.00000"
-                      />
-                      {productFormErrors.basePrice && (
-                        <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
-                          <AlertCircle size={12} />
-                          {productFormErrors.basePrice}
-                        </p>
-                      )}
-                    </div>
-                    {productForm.basePrice && parseFloat(productForm.basePrice) < 0 && !productFormErrors.basePrice && (
-                      <p className="text-xs text-red-600 mt-1">Price cannot be negative</p>
-                    )}
+                    </div>
                   </div>
 
                 </div>
EOF
  
  echo "✅ Patch file created: /tmp/admin_dashboard_baseprice.patch"
  echo ""
  echo "To apply the patch:"
  echo "cd /home/narendra/Desktop/KriraAi/print-24\ \(2\)/print-24"
  echo "patch -p1 < /tmp/admin_dashboard_baseprice.patch"
fi
