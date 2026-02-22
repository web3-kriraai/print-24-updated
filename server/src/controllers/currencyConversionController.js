import CurrencyConversionService from '../services/CurrencyConversionService.js';

/**
 * Currency Conversion Controller
 * 
 * Provides API endpoints for currency operations:
 * - Get exchange rates
 * - Convert prices
 * - Get supported currencies
 * - View cache stats (admin)
 */

/**
 * GET /api/currency/rates?from=USD&to=INR
 * Get exchange rate between two currencies
 */
export const getExchangeRate = async (req, res) => {
    try {
        const { from, to } = req.query;

        if (!from || !to) {
            return res.status(400).json({
                success: false,
                message: 'Both "from" and "to" currency codes are required'
            });
        }

        const rate = await CurrencyConversionService.getExchangeRate(
            from.toUpperCase(),
            to.toUpperCase()
        );

        res.json({
            success: true,
            data: {
                from: from.toUpperCase(),
                to: to.toUpperCase(),
                rate: rate,
                timestamp: new Date()
            }
        });
    } catch (error) {
        console.error('Error getting exchange rate:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get exchange rate',
            error: error.message
        });
    }
};

/**
 * POST /api/currency/convert
 * Convert an amount from one currency to another
 * Body: { amount, from, to }
 */
export const convertCurrency = async (req, res) => {
    try {
        const { amount, from, to } = req.body;

        if (!amount || !from || !to) {
            return res.status(400).json({
                success: false,
                message: 'amount, from, and to fields are required'
            });
        }

        const conversion = await CurrencyConversionService.convertPrice(
            parseFloat(amount),
            from.toUpperCase(),
            to.toUpperCase()
        );

        res.json({
            success: true,
            data: conversion
        });
    } catch (error) {
        console.error('Error converting currency:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to convert currency',
            error: error.message
        });
    }
};

/**
 * GET /api/currency/supported
 * Get list of supported currencies
 */
export const getSupportedCurrencies = async (req, res) => {
    try {
        const currencies = CurrencyConversionService.getSupportedCurrencies();

        res.json({
            success: true,
            data: currencies,
            count: currencies.length
        });
    } catch (error) {
        console.error('Error getting supported currencies:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get supported currencies',
            error: error.message
        });
    }
};

/**
 * GET /api/currency/cache-stats
 * Get cache statistics (admin only)
 */
export const getCacheStats = async (req, res) => {
    try {
        const stats = CurrencyConversionService.getCacheStats();

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Error getting cache stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get cache stats',
            error: error.message
        });
    }
};

/**
 * POST /api/currency/clear-cache
 * Clear currency conversion cache (admin only)
 */
export const clearCache = async (req, res) => {
    try {
        CurrencyConversionService.clearCache();

        res.json({
            success: true,
            message: 'Currency conversion cache cleared successfully'
        });
    } catch (error) {
        console.error('Error clearing cache:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to clear cache',
            error: error.message
        });
    }
};
