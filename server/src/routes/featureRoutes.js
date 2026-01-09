import express from 'express';
import {
    getAllFeatures,
    getFeatureById,
    createFeature,
    updateFeature,
    deleteFeature,
    reorderFeatures,
    upload,
} from '../controllers/featureController.js';

const router = express.Router();

// Public routes
router.get('/', getAllFeatures);
router.get('/:id', getFeatureById);

// Admin routes (add authentication middleware if needed)
router.post('/', upload.single('iconImage'), createFeature);
router.put('/:id', upload.single('iconImage'), updateFeature);
router.delete('/:id', deleteFeature);
router.post('/reorder', reorderFeatures);

export default router;
