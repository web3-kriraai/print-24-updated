/**
 * authorizePhysicalDesigner Middleware
 * 
 * Strictly allows only 'designer' role for physical visit operations.
 * Unlike authorizeDesigner.js, admins cannot act as designers here —
 * visit start/end must be performed by the actual assigned designer.
 * 
 * Requires authMiddleware to have run first (populates req.user).
 */
export const authorizePhysicalDesigner = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: 'Unauthorized. Please log in.'
        });
    }

    if (req.user.role !== 'designer') {
        return res.status(403).json({
            success: false,
            error: 'Access denied. Designer role required for physical visit operations.'
        });
    }

    next();
};
