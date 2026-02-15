import { User } from "../models/User.js";
import Order from "../models/orderModal.js";

/**
 * Agent Client Management Controller
 * 
 * Handles CRUD operations for agent-client relationships
 * and provides agent dashboard statistics.
 * 
 * All endpoints require the 'client_management' feature to be enabled
 * for the user's segment (enforced via requireFeature middleware in routes).
 */

// =============================================
// GET /api/agent/my-clients
// List all clients managed by the authenticated agent
// =============================================
export const getMyClients = async (req, res) => {
    try {
        const agentId = req.user.id;

        const agent = await User.findById(agentId)
            .populate({
                path: "clients",
                select: "name firstName lastName email mobileNumber userSegment approvalStatus createdAt",
                populate: {
                    path: "userSegment",
                    select: "name code pricingTier",
                },
            });

        if (!agent) {
            return res.status(404).json({ success: false, message: "Agent not found" });
        }

        // Enrich each client with their order count and total revenue
        const clientsWithStats = await Promise.all(
            (agent.clients || []).map(async (client) => {
                const orderStats = await Order.aggregate([
                    { $match: { user: client._id, placedByAgent: agent._id } },
                    {
                        $group: {
                            _id: null,
                            totalOrders: { $sum: 1 },
                            totalRevenue: { $sum: "$priceSnapshot.totalPayable" },
                        },
                    },
                ]);

                const stats = orderStats[0] || { totalOrders: 0, totalRevenue: 0 };

                return {
                    ...client.toObject(),
                    orderCount: stats.totalOrders,
                    totalRevenue: stats.totalRevenue,
                };
            })
        );

        res.json({
            success: true,
            clients: clientsWithStats,
            totalClients: clientsWithStats.length,
        });
    } catch (error) {
        console.error("Get my clients error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// =============================================
// POST /api/agent/add-client
// Add an existing user as a client (by email)
// =============================================
export const addClient = async (req, res) => {
    try {
        const agentId = req.user.id;
        const { email, userId } = req.body;

        if (!email && !userId) {
            return res.status(400).json({
                success: false,
                message: "Either email or userId is required",
            });
        }

        // Find the client user
        let client;
        if (userId) {
            client = await User.findById(userId);
        } else {
            client = await User.findOne({ email: email.toLowerCase().trim() });
        }

        if (!client) {
            return res.status(404).json({
                success: false,
                message: "User not found. Please check the email or create a new client.",
            });
        }

        // Prevent self-assignment
        if (client._id.toString() === agentId) {
            return res.status(400).json({
                success: false,
                message: "You cannot add yourself as a client",
            });
        }

        // Check if client is already assigned to this agent
        const agent = await User.findById(agentId);
        if (!agent) {
            return res.status(404).json({ success: false, message: "Agent not found" });
        }

        const alreadyAdded = agent.clients?.some(
            (c) => c.toString() === client._id.toString()
        );

        if (alreadyAdded) {
            return res.status(409).json({
                success: false,
                message: "This user is already your client",
            });
        }

        // Check max clients limit from feature config
        const maxClients = req.featureConfig?.maxClients || 50;
        if ((agent.clients?.length || 0) >= maxClients) {
            return res.status(400).json({
                success: false,
                message: `Maximum client limit (${maxClients}) reached`,
            });
        }

        // Add client to agent's clients array
        agent.clients.push(client._id);
        await agent.save();

        // Populate client info for response
        const populatedClient = await User.findById(client._id)
            .select("name firstName lastName email mobileNumber userSegment createdAt")
            .populate("userSegment", "name code pricingTier");

        res.json({
            success: true,
            message: "Client added successfully",
            client: populatedClient,
        });
    } catch (error) {
        console.error("Add client error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// =============================================
// POST /api/agent/create-client
// Create a brand new user and add as client
// =============================================
export const createClient = async (req, res) => {
    try {
        const agentId = req.user.id;
        const { name, firstName, lastName, email, mobileNumber, countryCode } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required to create a client",
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "A user with this email already exists. Use 'Add Client' instead.",
                existingUserId: existingUser._id,
            });
        }

        // Get default user segment
        const UserSegment = (await import("../models/UserSegment.js")).default;
        const defaultSegment = await UserSegment.findOne({ isDefault: true });

        // Create the new user
        const newUser = await User.create({
            name: name || `${firstName || ""} ${lastName || ""}`.trim(),
            firstName: firstName || "",
            lastName: lastName || "",
            email: email.toLowerCase().trim(),
            mobileNumber: mobileNumber || "",
            countryCode: countryCode || "+91",
            role: "user",
            approvalStatus: "approved", // Auto-approve agent-created clients
            userSegment: defaultSegment?._id || null,
        });

        // Add to agent's clients
        const agent = await User.findById(agentId);
        if (!agent) {
            return res.status(404).json({ success: false, message: "Agent not found" });
        }

        const maxClients = req.featureConfig?.maxClients || 50;
        if ((agent.clients?.length || 0) >= maxClients) {
            // Clean up - remove the user we just created
            await User.findByIdAndDelete(newUser._id);
            return res.status(400).json({
                success: false,
                message: `Maximum client limit (${maxClients}) reached`,
            });
        }

        agent.clients.push(newUser._id);
        await agent.save();

        // Populate for response
        const populatedClient = await User.findById(newUser._id)
            .select("name firstName lastName email mobileNumber userSegment createdAt")
            .populate("userSegment", "name code pricingTier");

        res.status(201).json({
            success: true,
            message: "Client created and added successfully",
            client: populatedClient,
        });
    } catch (error) {
        console.error("Create client error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// =============================================
// DELETE /api/agent/remove-client/:clientId
// Remove a client from agent's list
// =============================================
export const removeClient = async (req, res) => {
    try {
        const agentId = req.user.id;
        const { clientId } = req.params;

        if (!clientId) {
            return res.status(400).json({
                success: false,
                message: "Client ID is required",
            });
        }

        const agent = await User.findById(agentId);
        if (!agent) {
            return res.status(404).json({ success: false, message: "Agent not found" });
        }

        const clientIndex = agent.clients?.findIndex(
            (c) => c.toString() === clientId
        );

        if (clientIndex === -1 || clientIndex === undefined) {
            return res.status(404).json({
                success: false,
                message: "Client not found in your client list",
            });
        }

        agent.clients.splice(clientIndex, 1);
        await agent.save();

        res.json({
            success: true,
            message: "Client removed successfully",
        });
    } catch (error) {
        console.error("Remove client error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// =============================================
// GET /api/agent/client/:clientId/orders
// Get orders for a specific client placed by this agent
// =============================================
export const getClientOrders = async (req, res) => {
    try {
        const agentId = req.user.id;
        const { clientId } = req.params;
        const { page = 1, limit = 20, status } = req.query;

        // Verify client belongs to this agent
        const agent = await User.findById(agentId);
        if (!agent) {
            return res.status(404).json({ success: false, message: "Agent not found" });
        }

        const isMyClient = agent.clients?.some(
            (c) => c.toString() === clientId
        );

        if (!isMyClient) {
            return res.status(403).json({
                success: false,
                message: "This user is not your client",
            });
        }

        // Build query
        const query = { user: clientId, placedByAgent: agentId };
        if (status) {
            query.status = status.toUpperCase();
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [orders, total] = await Promise.all([
            Order.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .populate("product", "name image")
                .populate("user", "name email")
                .select("orderNumber product quantity status priceSnapshot createdAt paymentStatus"),
            Order.countDocuments(query),
        ]);

        res.json({
            success: true,
            orders,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (error) {
        console.error("Get client orders error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// =============================================
// GET /api/agent/dashboard-stats
// Agent dashboard statistics
// =============================================
export const getDashboardStats = async (req, res) => {
    try {
        const agentId = req.user.id;

        const agent = await User.findById(agentId);
        if (!agent) {
            return res.status(404).json({ success: false, message: "Agent not found" });
        }

        const commissionRate = agent.commissionRate || 0;
        const totalClients = agent.clients?.length || 0;

        // Get order stats for all agent-placed orders
        const orderStats = await Order.aggregate([
            { $match: { placedByAgent: agent._id } },
            {
                $group: {
                    _id: null,
                    totalOrders: { $sum: 1 },
                    totalRevenue: { $sum: "$priceSnapshot.totalPayable" },
                    pendingOrders: {
                        $sum: { $cond: [{ $eq: ["$status", "REQUESTED"] }, 1, 0] },
                    },
                    completedOrders: {
                        $sum: { $cond: [{ $eq: ["$status", "DELIVERED"] }, 1, 0] },
                    },
                },
            },
        ]);

        const stats = orderStats[0] || {
            totalOrders: 0,
            totalRevenue: 0,
            pendingOrders: 0,
            completedOrders: 0,
        };

        // Calculate commission
        const totalCommission = (stats.totalRevenue * commissionRate) / 100;

        // Recent orders (last 10)
        const recentOrders = await Order.find({ placedByAgent: agent._id })
            .sort({ createdAt: -1 })
            .limit(10)
            .populate("product", "name image")
            .populate("user", "name email")
            .select("orderNumber product user quantity status priceSnapshot createdAt");

        // Monthly revenue breakdown (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const monthlyRevenue = await Order.aggregate([
            {
                $match: {
                    placedByAgent: agent._id,
                    createdAt: { $gte: sixMonthsAgo },
                },
            },
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" },
                    },
                    revenue: { $sum: "$priceSnapshot.totalPayable" },
                    orders: { $sum: 1 },
                },
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } },
        ]);

        res.json({
            success: true,
            stats: {
                totalClients,
                totalOrders: stats.totalOrders,
                totalRevenue: stats.totalRevenue,
                pendingOrders: stats.pendingOrders,
                completedOrders: stats.completedOrders,
                commissionRate,
                totalCommission,
                walletBalance: agent.walletBalance || 0,
                creditLimit: agent.creditLimit || 0,
            },
            recentOrders,
            monthlyRevenue,
        });
    } catch (error) {
        console.error("Get dashboard stats error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// =============================================
// GET /api/agent/search-users
// Search users to add as clients
// =============================================
export const searchUsers = async (req, res) => {
    try {
        const agentId = req.user.id;
        const { q } = req.query;

        if (!q || q.length < 2) {
            return res.status(400).json({
                success: false,
                message: "Search query must be at least 2 characters",
            });
        }

        // Get agent's existing clients to exclude them
        const agent = await User.findById(agentId);
        const existingClientIds = agent?.clients || [];

        // Search by name or email
        const users = await User.find({
            $and: [
                { _id: { $nin: [...existingClientIds, agentId] } },
                { role: "user" },
                {
                    $or: [
                        { name: { $regex: q, $options: "i" } },
                        { firstName: { $regex: q, $options: "i" } },
                        { lastName: { $regex: q, $options: "i" } },
                        { email: { $regex: q, $options: "i" } },
                    ],
                },
            ],
        })
            .select("name firstName lastName email mobileNumber")
            .limit(10);

        res.json({ success: true, users });
    } catch (error) {
        console.error("Search users error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
