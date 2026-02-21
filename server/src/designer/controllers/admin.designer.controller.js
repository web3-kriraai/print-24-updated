/**
 * ADMIN DESIGNER CONTROLLER
 * Location: server/src/designer/controllers/admin.designer.controller.js
 * 
 * Purpose: Specific administrative tasks for designers that aren't 
 * covered by general user management.
 */

import { User } from "../../models/User.js";
import DesignerSession from "../models/DesignerSession.js";

/**
 * GET DESIGNER STATS
 * Shows performance metrics for a specific designer
 */
export const getDesignerStats = async (req, res) => {
    try {
        const { designerId } = req.params;

        const sessions = await DesignerSession.find({ designerId });

        const stats = {
            totalSessions: sessions.length,
            totalRevenue: sessions.reduce((sum, s) => sum + (s.totalAmount || 0), 0),
            completedSessions: sessions.filter(s => s.status === 'Completed').length,
            // Add more metrics as needed
        };

        res.json({ success: true, stats });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * TOGGLE DESIGNER STATUS
 * Manually set a designer status for administrative reasons
 */
export const toggleDesignerStatus = async (req, res) => {
    // Logic for overriding designer status if needed
};
