import express from 'express';
import * as currencyController from '../controllers/currencyConversionController.js';

const router = express.Router();

/**
 * @route   GET /api/currency/rates
 * @desc    Get exchange rate between two currencies
 * @access  Public
 * @query   from, to - Currency codes (e.g., USD, INR)
 */
router.get('/rates', currencyController.getExchangeRate);

/**
 * @route   POST /api/currency/convert
 * @desc    Convert amount from one currency to another
 * @access  Public
 * @body    { amount: number, from: string, to: string }
 */
router.post('/convert', currencyController.convertCurrency);

/**
 * @route   GET /api/currency/supported
 * @desc    Get list of all supported currencies
 * @access  Public
 */
router.get('/supported', currencyController.getSupportedCurrencies);

/**
 * @route   GET /api/currency/cache-stats
 * @desc    Get currency conversion cache statistics
 * @access  Admin only (could add auth middleware)
 */
router.get('/cache-stats', currencyController.getCacheStats);

/**
 * @route   POST /api/currency/clear-cache
 * @desc    Clear currency conversion cache
 * @access  Admin only (could add auth middleware)
 */
router.post('/clear-cache', currencyController.clearCache);

export default router;
