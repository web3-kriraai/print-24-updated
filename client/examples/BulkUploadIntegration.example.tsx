// ============================================================================
// BULK UPLOAD INTEGRATION EXAMPLE
// ============================================================================
// This file shows how to integrate the BulkOrderWizard into any product page
// Copy the relevant sections into your existing product pages
// ============================================================================

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Package } from 'lucide-react';
import BulkOrderWizard from '../components/BulkOrderWizard';
import { useBulkOrderPermission } from '../hooks/useBulkOrder';

// ============================================================================
// STEP 1: Add imports to your product page (e.g., GlossProductSelection.tsx)
// ============================================================================

/*
import { Upload } from 'lucide-react';
import BulkOrderWizard from '../components/BulkOrderWizard';
import { useBulkOrderPermission } from '../hooks/useBulkOrder';
*/

// ============================================================================
// STEP 2: Add state variables in your component
// ============================================================================

const ProductPageExample: React.FC = () => {
    const navigate = useNavigate();

    // Bulk upload state
    const [showBulkWizard, setShowBulkWizard] = useState(false);
    const { hasPermission, config, loading: permissionLoading } = useBulkOrderPermission();

    // Your existing state variables...
    const [selectedProduct, setSelectedProduct] = useState<any>(null);

    // ============================================================================
    // STEP 3: Add the Bulk Upload Button to your JSX (multiple placement options)
    // ============================================================================

    return (
        <div className="container mx-auto px-4 py-8">

            {/* OPTION A: Floating Action Button (Right Side of Page) */}
            {hasPermission && (
                <button
                    onClick={() => setShowBulkWizard(true)}
                    className="fixed right-8 bottom-24 z-40 px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center gap-3 shadow-2xl hover:shadow-3xl hover:scale-105"
                    title="Upload bulk orders (30-in-1 PDF)"
                >
                    <Upload className="w-6 h-6" />
                    <span className="hidden lg:inline">Bulk Upload</span>
                </button>
            )}

            {/* OPTION B: Header Button (Next to Product Title) */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold">Product Page</h1>

                {hasPermission && (
                    <button
                        onClick={() => setShowBulkWizard(true)}
                        className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center gap-2 shadow-md"
                    >
                        <Upload className="w-5 h-5" />
                        Bulk Upload (30-in-1)
                    </button>
                )}
            </div>

            {/* OPTION C: Banner Notice (Top of Page) */}
            {hasPermission && config && (
                <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-5">
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                            <Package className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-gray-900 mb-1">
                                Bulk Upload Available!
                            </h3>
                            <p className="text-gray-700 text-sm mb-3">
                                Upload a single PDF with up to <strong>{config.maxDesigns || 50}</strong> designs
                                and <strong>{(config.maxCopies || 100000).toLocaleString()}</strong> total copies.
                                We'll automatically split and create individual orders.
                            </p>
                            <button
                                onClick={() => setShowBulkWizard(true)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors inline-flex items-center gap-2 text-sm"
                            >
                                <Upload className="w-4 h-4" />
                                Start Bulk Upload
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* OPTION D: Card Style (In Product Grid) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {hasPermission && (
                    <div
                        onClick={() => setShowBulkWizard(true)}
                        className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl p-6 text-white cursor-pointer hover:scale-105 transition-transform shadow-xl"
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
                                <Upload className="w-7 h-7" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold">Bulk Upload</h3>
                                <p className="text-sm text-blue-100">30-in-1 PDF Processing</p>
                            </div>
                        </div>
                        <p className="text-sm text-blue-50 mb-4">
                            Upload composite PDFs with multiple designs. We'll split and process them automatically.
                        </p>
                        <div className="flex items-center gap-2 text-sm font-semibold text-white">
                            Start Upload
                            <Upload className="w-4 h-4" />
                        </div>
                    </div>
                )}

                {/* Your existing product cards... */}
            </div>

            {/* ============================================================================ */}
            {/* STEP 4: Add the BulkOrderWizard Modal Component (Required - Same for all)  */}
            {/* ============================================================================ */}

            <BulkOrderWizard
                isOpen={showBulkWizard}
                onClose={() => setShowBulkWizard(false)}
                productId={selectedProduct?._id} // Pass the current product ID
                productType="VISITING_CARD" // Product type: VISITING_CARD, FLYER, BROCHURE, etc.
                onSuccess={(bulkOrderId) => {
                    console.log('Bulk order created:', bulkOrderId);
                    // Option 1: Navigate to bulk orders page
                    navigate(`/bulk-orders/${bulkOrderId}`);

                    // Option 2: Navigate to bulk orders list
                    // navigate('/bulk-orders');

                    // Option 3: Show success message and stay on page
                    // setShowBulkWizard(false);
                    // alert('Bulk order submitted successfully!');
                }}
            />

            {/* Your existing JSX... */}
        </div>
    );
};

export default ProductPageExample;

// ============================================================================
// PERMISSION CHECK DETAILS
// ============================================================================

/*
The useBulkOrderPermission() hook checks:
1. If user is logged in (has auth token)
2. If user's UserType has the "bulk_order_upload" feature enabled
3. Returns the feature configuration (maxDesigns, maxCopies, maxFileSizeMB)

Example response:
{
  hasPermission: true,
  config: {
    maxDesigns: 50,
    maxCopies: 100000,
    maxFileSizeMB: 100
  },
  loading: false,
  error: null
}

If hasPermission is false, the bulk upload button will be hidden automatically.
*/

// ============================================================================
// WIZARD PROPS REFERENCE
// ============================================================================

/*
interface BulkOrderWizardProps {
  isOpen: boolean;              // Control modal visibility
  onClose: () => void;          // Close handler
  productId?: string;           // Optional: Pre-fill product selection
  productType?: string;         // Optional: Product category for context
  onSuccess?: (bulkOrderId: string) => void; // Success callback with created bulk order ID
}
*/

// ============================================================================
// TESTING CHECKLIST
// ============================================================================

/*
1. ✅ User without permission: Button should be HIDDEN
2. ✅ User with permission: Button should be VISIBLE
3. ✅ Click button: Wizard modal should open
4. ✅ Upload valid 60-page PDF (30 designs × 2 pages)
5. ✅ Enter config: 30,000 copies, 30 designs, 2 pages/design
6. ✅ Validation: Should pass (60 == 30 × 2)
7. ✅ Submit: Should upload and start processing
8. ✅ Status tracking: Should show real-time progress
9. ✅ Completion: Should navigate to bulk orders page with order details
10. ✅ View child orders: Should show 30 individual orders (1,000 copies each)
*/
