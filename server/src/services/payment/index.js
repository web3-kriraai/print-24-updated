/**
 * Payment Providers Index
 * Registers all payment providers with the PaymentRouter
 * @module services/payment/index
 */

import paymentRouter from './PaymentRouter.js';
import RazorpayProvider from './providers/RazorpayProvider.js';
import PhonePeProvider from './providers/PhonePeProvider.js';
import StripeProvider from './providers/StripeProvider.js';
import PayUProvider from './providers/PayUProvider.js';

// Register providers
paymentRouter.registerProvider('RAZORPAY', RazorpayProvider);
paymentRouter.registerProvider('PHONEPE', PhonePeProvider);
paymentRouter.registerProvider('STRIPE', StripeProvider);
paymentRouter.registerProvider('PAYU', PayUProvider);

console.log('💳 Payment providers registered: RAZORPAY, PHONEPE, STRIPE, PAYU');

export { paymentRouter };
export { default as IPaymentProvider } from './IPaymentProvider.js';
export { default as RazorpayProvider } from './providers/RazorpayProvider.js';
export { default as PhonePeProvider } from './providers/PhonePeProvider.js';
export { default as StripeProvider } from './providers/StripeProvider.js';
export { default as PayUProvider } from './providers/PayUProvider.js';
