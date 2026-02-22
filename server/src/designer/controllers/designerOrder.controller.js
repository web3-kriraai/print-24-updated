import Order from '../../models/orderModal.js';
import { createSession } from '../services/session.service.js';
import DesignerSession from '../models/DesignerSession.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to ensure secure upload dir exists
// We placed it in server/uploads/secure_designs
const UPLOAD_DIR = path.join(__dirname, '../../../uploads/secure_designs');

if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/**
 * SUBMIT VISUAL DESIGN FORM
 * POST /api/designer-orders/:orderId/design-form
 */
export const submitDesignForm = async (req, res) => {
    try {
        const { orderId } = req.params;
        const {
            designFor,
            designStyle,
            colorPreference,
            language,
            specialInstructions,
            logoAvailable,
            photoOnCard
        } = req.body;

        const order = await Order.findOne({
            $or: [{ _id: orderId }, { orderNumber: orderId }]
        });

        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        // Handle File Uploads (Logo / Photo) from Multer
        // We assume fields names: 'logo', 'photo'
        const logoFile = req.files?.logo?.[0];
        const photoFile = req.files?.photo?.[0];

        // Construct Design Form Object
        const designForm = {
            designFor,
            designStyle,
            colorPreference,
            language,
            specialInstructions,
            logoAvailable,
            photoOnCard,
            submittedAt: new Date(),
            files: {
                logo: logoFile ? logoFile.path : null, // Store local path or cloud URL if we used cloud storage. 
                // For now, let's assume local storage given constraints or the fact we are building independent.
                // Actually existing system uses cloud or buffer. 
                // The prompt asked for "Save uploaded logo/photo".
                // I will store the path relative to uploads.
                photo: photoFile ? photoFile.path : null
            }
        };

        // Update Order
        order.needDesigner = true;
        order.designerType = "visual";
        order.designForm = designForm;
        order.designStatus = "PendingDesign";

        await order.save();

        res.json({ success: true, message: "Design form submitted", orderId: order._id });

    } catch (error) {
        console.error("[DesignerPanel] Submit Form Error:", error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * GET DESIGNER ORDERS (FIFO)
 * GET /api/designer-orders
 */
export const getDesignerOrders = async (req, res) => {
    try {
        // Query: needDesigner=true AND type=visual AND status IN [PendingDesign, InDesign]
        const query = {
            needDesigner: true,
            designerType: "visual", // Strictly visual for this queue
            designStatus: { $in: ["PendingDesign", "InDesign"] }
        };

        console.log("[DEBUG] getDesignerOrders Query:", query);

        // Sort by createdAt ASC (Oldest First - FIFO)
        const orders = await Order.find(query)
            .sort({ createdAt: 1 })
            .select("orderNumber designForm designStatus createdAt user")
            .populate("user", "name email mobileNumber");

        console.log(`[DEBUG] getDesignerOrders Found ${orders.length} orders`);
        if (orders.length > 0) {
            console.log("[DEBUG] First Order Designer Info:", {
                orderNumber: orders[0].orderNumber,
                needDesigner: orders[0].needDesigner,
                designerType: orders[0].designerType,
                designStatus: orders[0].designStatus
            });
        }

        res.json(orders);

    } catch (error) {
        console.error("[DesignerPanel] Get Orders Error:", error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * UPLOAD FINAL PDF (STRICT VALIDATION)
 * POST /api/designer-orders/:orderId/upload-final
 */
export const uploadFinalPDF = async (req, res) => {
    try {
        const { orderId } = req.params;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const order = await Order.findOne({
            $or: [{ _id: orderId }, { orderNumber: orderId }]
        });

        if (!order) {
            // Cleanup file if order not found
            fs.unlinkSync(file.path);
            return res.status(404).json({ error: "Order not found" });
        }

        // STRICT VALIDATION
        // Filename must be EXACTLY: orderNumber + ".pdf"
        const expectedFilename = `${order.orderNumber}.pdf`;

        if (file.originalname !== expectedFilename) {
            // Delete the invalid file immediately
            fs.unlinkSync(file.path);

            return res.status(400).json({
                error: "Order Number Mismatch. Upload not allowed.",
                expected: expectedFilename,
                received: file.originalname
            });
        }

        // Valid
        order.finalPdfUrl = file.path; // Store secure local path
        order.designStatus = "FinalReady";
        order.productionStatus = "Queued";

        await order.save();

        res.json({ success: true, message: "Final PDF Accepted", path: order.finalPdfUrl });

    } catch (error) {
        console.error("[DesignerPanel] Upload Final PDF Error:", error);
        // Clean up file if error
        if (req.file && req.file.path && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: error.message });
    }
};

/**
 * SECURE FILE DOWNLOAD
 * GET /api/designer-orders/:orderId/file
 */
export const downloadSecureFile = async (req, res) => {
    try {
        const { orderId } = req.params;
        // Role check is done in middleware

        const order = await Order.findOne({
            $or: [{ _id: orderId }, { orderNumber: orderId }]
        });

        if (!order || !order.finalPdfUrl) {
            return res.status(404).json({ error: "File not found" });
        }

        const filePath = order.finalPdfUrl;

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: "File missing on disk" });
        }

        // Stream file
        res.download(filePath, `${order.orderNumber}.pdf`);

    } catch (error) {
        console.error("[DesignerPanel] Download Error:", error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * PICK UP ORDER
 * PATCH /api/designer-orders/:orderId/pickup
 */
export const pickupOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const designerId = req.user.id; // From auth middleware

        const order = await Order.findOne({
            $or: [{ _id: orderId }, { orderNumber: orderId }]
        }).populate('user', '_id name email');

        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        // Create or find existing session for this order
        let session = await DesignerSession.findOne({
            orderId: order._id,
            status: { $in: ['Scheduled', 'Active'] }
        });

        if (!session) {
            // Create new session using centralized service
            session = await createSession(order.user._id.toString(), designerId, order._id);
            console.log(`[PickupOrder] Created scheduled session ${session._id} for order ${order.orderNumber}`);
        }

        // Update order status
        order.designStatus = "InDesign";
        await order.save();

        res.json({
            success: true,
            message: "Order picked up",
            sessionId: session._id,
            order
        });

    } catch (error) {
        console.error("[DesignerPanel] Pick Up Error:", error);
        res.status(500).json({ error: error.message });
    }
};
