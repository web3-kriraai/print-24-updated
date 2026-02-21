import express from 'express';
import { getShippingEstimate } from '../controllers/shiprocket.controller.js';

const router = express.Router();

// POST /api/shipping/estimate
// Body: { pincode, productId, quantity, strategy: 'cheapest' | 'fastest' | 'balanced' }
router.post('/estimate', getShippingEstimate);

export default router;
