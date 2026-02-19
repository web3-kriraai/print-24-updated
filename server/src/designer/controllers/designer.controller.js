import { User } from "../../models/User.js";

/**
 * GET SESSION SETTINGS
 * GET /api/session/settings
 */
export const getSessionSettings = async (req, res) => {
    try {
        const designer = await User.findById(req.user.id);
        if (!designer) {
            return res.status(404).json({ error: "Designer not found" });
        }

        res.json({
            success: true,
            isOnline: designer.isOnline || false,
            settings: designer.sessionSettings || {
                baseDuration: 900,
                basePrice: 500,
                extensionDuration: 900,
                extensionPrice: 300
            },
            mobileNumber: designer.mobileNumber || '',
            address: designer.address || ''
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * UPDATE ONLINE STATUS
 * PATCH /api/session/settings/status
 */
export const updateOnlineStatus = async (req, res) => {
    try {
        const { isOnline } = req.body;
        console.log(`[DesignerController] Updating online status for ${req.user.id}:`, isOnline);

        const designer = await User.findById(req.user.id);
        if (!designer) {
            return res.status(404).json({ error: "Designer not found" });
        }

        designer.isOnline = !!isOnline;
        await designer.save();

        res.json({
            success: true,
            isOnline: designer.isOnline,
            message: `Designer is now ${designer.isOnline ? 'Online' : 'Offline'}`
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * UPDATE SESSION SETTINGS
 * PATCH /api/session/settings
 */
export const updateSessionSettings = async (req, res) => {
    try {
        const { baseDuration, basePrice, extensionDuration, extensionPrice } = req.body;
        console.log(`[DesignerController] Updating settings for ${req.user.id}:`, { baseDuration, basePrice, extensionDuration, extensionPrice });

        const designer = await User.findById(req.user.id);
        if (!designer) {
            return res.status(404).json({ error: "Designer not found" });
        }

        designer.sessionSettings = {
            baseDuration: !isNaN(Number(baseDuration)) ? Number(baseDuration) : (designer.sessionSettings?.baseDuration || 900),
            basePrice: !isNaN(Number(basePrice)) ? Number(basePrice) : (designer.sessionSettings?.basePrice || 500),
            extensionDuration: !isNaN(Number(extensionDuration)) ? Number(extensionDuration) : (designer.sessionSettings?.extensionDuration || 900),
            extensionPrice: !isNaN(Number(extensionPrice)) ? Number(extensionPrice) : (designer.sessionSettings?.extensionPrice || 300)
        };

        console.log(`[DesignerController] New Settings saved in object:`, designer.sessionSettings);

        await designer.save();

        res.json({
            success: true,
            message: "Session settings updated successfully",
            settings: designer.sessionSettings
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * GET PUBLIC DESIGNER LIST
 * GET /api/session/settings/designers
 */
export const getPublicDesigners = async (req, res) => {
    try {
        const designers = await User.find({ role: "designer" })
            .select("name sessionSettings mobileNumber address")
            .lean();

        // Ensure default settings if not explicitly set
        const designersWithSettings = designers.map(d => ({
            ...d,
            sessionSettings: d.sessionSettings || {
                baseDuration: 900,
                basePrice: 500,
                extensionDuration: 900,
                extensionPrice: 300
            }
        }));

        res.json({
            success: true,
            designers: designersWithSettings
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * UPDATE DESIGNER PROFILE (mobile number + address)
 * PATCH /api/session/settings/profile
 */
export const updateDesignerProfile = async (req, res) => {
    try {
        const { mobileNumber, address } = req.body;

        const designer = await User.findById(req.user.id);
        if (!designer) {
            return res.status(404).json({ error: "Designer not found" });
        }

        if (mobileNumber !== undefined) designer.mobileNumber = mobileNumber.trim();
        if (address !== undefined) designer.address = address.trim();

        await designer.save();

        res.json({
            success: true,
            message: "Profile updated successfully",
            profile: {
                mobileNumber: designer.mobileNumber,
                address: designer.address
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
