import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../lib/apiConfig';
import { useUserContext } from '../lib/useUserContext';
import { formatPrice } from '../utils/currencyUtils';
import { Loader } from 'lucide-react';

interface FinalPriceDisplayProps {
    productId: string;
    selectedDynamicAttributes?: any[];
    quantity: number;
    numberOfDesigns?: number;
    preCalculatedTotal?: number;
}

const FinalPriceDisplay: React.FC<FinalPriceDisplayProps> = ({
    productId,
    selectedDynamicAttributes = [],
    quantity,
    numberOfDesigns = 1,
    preCalculatedTotal
}) => {
    const [total, setTotal] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { context: userContext, loading: contextLoading } = useUserContext();

    useEffect(() => {
        const fetchPricing = async () => {
            if (preCalculatedTotal !== undefined) {
                setTotal(preCalculatedTotal);
                setLoading(false);
                return;
            }

            if (contextLoading || !userContext || !productId) return;

            setLoading(true);
            setError(null);

            try {
                const token = localStorage.getItem('token');
                const headers: any = { 'Content-Type': 'application/json' };
                if (token) headers['Authorization'] = `Bearer ${token}`;

                const body = {
                    productId,
                    selectedDynamicAttributes: selectedDynamicAttributes.map(attr => ({
                        type: attr.attributeType || attr.type,
                        value: attr.value
                    })),
                    quantity,
                    numberOfDesigns,
                    pincode: userContext.location.pincode
                };

                const response = await fetch(`${API_BASE_URL}/api/pricing/quote`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(body),
                });

                const data = await response.json();
                if (data.success) {
                    setTotal(data.pricing.totalPayable * numberOfDesigns);
                } else {
                    setError(data.message || 'Error fetching price');
                }
            } catch (err) {
                setError('Network error');
            } finally {
                setLoading(false);
            }
        };

        fetchPricing();
    }, [productId, JSON.stringify(selectedDynamicAttributes), quantity, numberOfDesigns, userContext, contextLoading, preCalculatedTotal]);

    if (loading || contextLoading) {
        return (
            <div className="flex items-center gap-2 text-blue-600 font-bold">
                <Loader className="w-4 h-4 animate-spin" />
                <span>Calculating total...</span>
            </div>
        );
    }

    if (error) return <span className="text-red-500 text-xs font-medium">Price unavailable</span>;

    return (
        <div className="flex flex-col items-end">
            <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Total Payable</span>
            <span className="text-2xl font-black text-blue-600 tracking-tight">
                {formatPrice(total || 0, 'INR')}
            </span>
        </div>
    );
};

export default FinalPriceDisplay;
