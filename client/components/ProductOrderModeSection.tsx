import React, { useState } from 'react';
import { Loader } from 'lucide-react';
import { useBulkOrderPermission } from '../hooks/useBulkOrder';
import BulkOrderToggle from './BulkOrderToggle';

const BulkOrderWizard = React.lazy(() => import('./BulkOrderWizard'));

interface ProductOrderModeSectionProps {
    productId: string;
    productType?: string;
    children: (orderMode: 'single' | 'bulk') => React.ReactNode;
}

/**
 * Component that handles order mode selection (single vs bulk)
 * and renders the appropriate UI based on user permissions
 */
const ProductOrderModeSection: React.FC<ProductOrderModeSectionProps> = ({
    productId,
    productType = 'VISITING_CARD',
    children,
}) => {
    const [orderMode, setOrderMode] = useState<'single' | 'bulk'>('single');
    const [showBulkWizard, setShowBulkWizard] = useState(false);
    const { hasPermission, loading: permissionLoading } = useBulkOrderPermission();

    // Show loading state while checking permissions
    if (permissionLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader className="w-8 h-8 text-blue-600 animate-spin" />
                <span className="ml-3 text-gray-600">Loading...</span>
            </div>
        );
    }

    return (
        <>
            {/* Order Mode Toggle - Only show if user has permission */}
            {hasPermission && (
                <BulkOrderToggle
                    orderMode={orderMode}
                    setOrderMode={setOrderMode}
                    setShowBulkWizard={setShowBulkWizard}
                />
            )}

            {/* Bulk Upload Wizard Modal */}
            {showBulkWizard && (
                <React.Suspense
                    fallback={
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                            <Loader className="w-12 h-12 text-white animate-spin" />
                        </div>
                    }
                >
                    <BulkOrderWizard
                        isOpen={showBulkWizard}
                        onClose={() => setShowBulkWizard(false)}
                        productId={productId}
                        productType={productType}
                        onSuccess={(bulkOrderId) => {
                            console.log('Bulk order created:', bulkOrderId);
                            setShowBulkWizard(false);

                            // Show success notification
                            const notification = document.createElement('div');
                            notification.className =
                                'fixed top-4 right-4 bg-green-500 text-white px-6 py-4 rounded-lg shadow-2xl z-50';
                            notification.style.animation = 'slideInRight 0.3s ease-out';
                            notification.innerHTML = `
                <div class="flex items-center gap-3">
                  <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                  </svg>
                  <div>
                    <p class="font-semibold">Bulk Order Submitted!</p>
                    <p class="text-sm opacity-90">Processing ${bulkOrderId}</p>
                  </div>
                </div>
              `;
                            document.body.appendChild(notification);
                            setTimeout(() => notification.remove(), 5000);

                            // Reset to single mode after successful submission
                            setOrderMode('single');
                        }}
                    />
                </React.Suspense>
            )}

            {/* Render children with current order mode */}
            {children(orderMode)}
        </>
    );
};

export default ProductOrderModeSection;
