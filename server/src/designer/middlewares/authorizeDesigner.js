export const authorizeDesigner = (req, res, next) => {
    // Expects authMiddleware to have run first (populating req.user)
    if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const role = req.user.role;

    // Allow 'designer', 'admin', 'emp' (assuming employees might need access too)
    // Strictly, user asked for authorizeRole("designer")
    if (role === 'designer' || role === 'admin') {
        next();
    } else {
        return res.status(403).json({ error: "Access denied. Designer role required." });
    }
};
