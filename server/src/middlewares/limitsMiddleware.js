import UserType from "../models/UserType.js";
// import Order from "../models/Order.js"; // Needed for order limit checks

export const checkDailyOrderLimit = async (req, res, next) => {
    if (!req.user.userTypeId) return next(); // No limits for users without type? Or default limit?

    try {
        const userType = await UserType.findById(req.user.userTypeId);
        if (!userType || !userType.limits || userType.limits.maxOrdersPerDay === null) {
            return next();
        }

        const limit = userType.limits.maxOrdersPerDay;

        // Count orders for today
        // const startOfDay = new Date();
        // startOfDay.setHours(0,0,0,0);
        // const count = await Order.countDocuments({ 
        //   user: req.user._id, 
        //   createdAt: { $gte: startOfDay } 
        // });

        // Placeholder logic
        const count = 0; // Replace with actual DB query

        if (count >= limit) {
            return res.status(403).json({
                error: `Daily order limit reached (${limit}). Please try again tomorrow.`
            });
        }

        next();
    } catch (error) {
        next(error);
    }
};

export const checkCreditLimit = async (req, res, next) => {
    if (!req.user.userTypeId) return next();

    try {
        const userType = await UserType.findById(req.user.userTypeId);
        if (!userType || !userType.limits || userType.limits.maxCreditLimit === null) {
            return next();
        }

        const limit = userType.limits.maxCreditLimit;
        const orderAmount = req.body.totalAmount || 0; // Assuming body has totalAmount

        // Plus current outstanding balance?
        // const balance = await UserService.getBalance(req.user._id);
        const balance = 0; // Placeholder

        if (balance + orderAmount > limit) {
            return res.status(403).json({
                error: `Credit limit exceeded. Limit: ${limit}, Current Balance: ${balance}, This Order: ${orderAmount}`
            });
        }

        next();
    } catch (error) {
        next(error);
    }
};

export const checkTerritoryAccess = async (req, res, next) => {
    // Check if pincode in body is allowed
    const pincode = req.body.shippingAddress?.pincode;
    if (!pincode) return next();

    if (!req.user.userTypeId) return next();

    try {
        const userType = await UserType.findById(req.user.userTypeId);
        if (!userType || !userType.territoryRestrictions || userType.territoryRestrictions.length === 0) {
            return next();
        }

        if (!userType.territoryRestrictions.includes(pincode)) {
            return res.status(403).json({
                error: `Territory restriction: Service not available in pincode ${pincode}`
            });
        }

        next();
    } catch (error) {
        next(error);
    }
};
