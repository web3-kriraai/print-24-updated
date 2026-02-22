import { isWithinOfficeHours } from '../services/office.service.js';

export const checkOfficeHours = async (req, res, next) => {
    try {
        const check = await isWithinOfficeHours();

        if (!check.isAllowed) {
            return res.status(400).json({
                success: false,
                message: check.message
            });
        }

        next();
    } catch (error) {
        console.error("[OfficeHours] Middleware Error:", error.message);
        res.status(500).json({ message: "Internal Server Error checking office hours." });
    }
};
