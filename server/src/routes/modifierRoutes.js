import express from 'express';
import {
    createModifier,
    getAllModifiers,
    getModifierById,
    updateModifier,
    deleteModifier,
    toggleModifier,
    validateModifier,
    previewModifier
} from '../controllers/modifierController.js';

const router = express.Router();

/**
 * =========================================================================
 * MODIFIER ADMIN ROUTES
 * =========================================================================
 * 
 * All routes require admin authentication.
 * 
 * IMPORTANT: /validate and /preview MUST be before /:id
 * Otherwise Express will treat them as :id parameters.
 */

// Special endpoints (MUST be first)
router.post('/validate', validateModifier);
router.post('/preview', previewModifier);

// CRUD operations
router.post('/', createModifier);
router.get('/', getAllModifiers);
router.get('/:id', getModifierById);
router.put('/:id', updateModifier);
router.delete('/:id', deleteModifier);

// Additional operations
router.post('/:id/toggle', toggleModifier);

export default router;
