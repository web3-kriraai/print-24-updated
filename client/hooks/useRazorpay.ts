/**
 * useRazorpay Hook
 * Handles Razorpay checkout integration
 */

declare global {
    interface Window {
        Razorpay: any;
    }
}

export interface RazorpayOptions {
    key: string;
    amount: number;
    currency: string;
    name: string;
    description: string;
    order_id: string;
    prefill: {
        name: string;
        email: string;
        contact: string;
    };
    notes?: Record<string, string>;
    theme?: {
        color: string;
    };
}

export interface RazorpayResponse {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
}

export const useRazorpay = () => {
    const isLoaded = () => {
        return typeof window !== 'undefined' && window.Razorpay;
    };

    const openCheckout = (
        options: RazorpayOptions,
        onSuccess: (response: RazorpayResponse) => void,
        onError: (error: any) => void
    ) => {
        if (!isLoaded()) {
            onError(new Error('Razorpay SDK not loaded'));
            return;
        }

        const rzp = new window.Razorpay({
            ...options,
            handler: (response: RazorpayResponse) => {
                onSuccess(response);
            },
            modal: {
                ondismiss: () => {
                    onError(new Error('Payment cancelled by user'));
                }
            }
        });

        rzp.on('payment.failed', (response: any) => {
            onError(response.error);
        });

        rzp.open();
    };

    return { openCheckout, isLoaded };
};

export default useRazorpay;
