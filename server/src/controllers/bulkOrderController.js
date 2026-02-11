import bulkOrderService from "../services/bulkOrderService.js";
import BulkOrder from "../models/BulkOrder.js";
import cloudinary from "../config/cloudinary.js";
import streamifier from "streamifier";
import { extractPDFMetadata } from "../services/pdfSplitterService.js";

/**
 * Bulk Order Controller
 * HTTP endpoints for bulk order management
 */

/**
 * @desc    Upload and create bulk order
 * @route   POST /api/bulk-orders/upload
 * @access  Private + Feature: bulk_order_upload
 */
export const uploadBulkOrder = async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            totalCopies,
            distinctDesigns,
            pagesPerDesign,
            hireDesigner,
            productId,
            productType,
        } = req.body;

        // Validate required fields
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "PDF file is required",
            });
        }

        if (!totalCopies || !distinctDesigns || !pagesPerDesign || !productId) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: totalCopies, distinctDesigns, pagesPerDesign, productId",
            });
        }

        // Validate file type (PDF only)
        if (req.file.mimetype !== "application/pdf") {
            return res.status(400).json({
                success: false,
                message: "Only PDF files are allowed",
            });
        }

        // Check feature config limits
        const featureConfig = req.featureConfig || {};
        const maxFileSize = featureConfig.maxFileSize || 100 * 1024 * 1024; // 100MB default
        const maxDesigns = featureConfig.maxDesigns || 50;
        const maxTotalCopies = featureConfig.maxTotalCopies || 100000;

        // Validate against limits
        if (req.file.size > maxFileSize) {
            return res.status(400).json({
                success: false,
                message: `File too large. Maximum size: ${maxFileSize / (1024 * 1024)}MB`,
            });
        }

        if (parseInt(distinctDesigns) > maxDesigns) {
            return res.status(400).json({
                success: false,
                message: `Too many designs. Maximum allowed: ${maxDesigns}`,
            });
        }

        if (parseInt(totalCopies) > maxTotalCopies) {
            return res.status(400).json({
                success: false,
                message: `Too many copies. Maximum allowed: ${maxTotalCopies}`,
            });
        }

        // Extract PDF metadata
        const pdfMetadata = await extractPDFMetadata(req.file.buffer);
        const expectedPages = parseInt(distinctDesigns) * parseInt(pagesPerDesign);

        // Validate page count
        if (pdfMetadata.pageCount !== expectedPages) {
            return res.status(400).json({
                success: false,
                message: `Page count mismatch: Expected ${expectedPages} pages (${distinctDesigns} designs × ${pagesPerDesign} pages), but PDF has ${pdfMetadata.pageCount} pages`,
                expected: expectedPages,
                actual: pdfMetadata.pageCount,
            });
        }

        // Upload composite PDF to Cloudinary
        const uploadResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: "bulk-orders/composite",
                    resource_type: "auto",
                    public_id: `composite_${Date.now()}_${userId}`,
                    format: "pdf",
                },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );
            streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
        });

        console.log('📤 Cloudinary upload result:', {
            url: uploadResult.secure_url,
            publicId: uploadResult.public_id,
        });

        console.log('📋 Creating bulk order with params:', {
            userId,
            productId,
            totalCopies: parseInt(totalCopies),
            distinctDesigns: parseInt(distinctDesigns),
            pagesPerDesign: parseInt(pagesPerDesign),
        });

        // Create bulk order
        let bulkOrder;
        try {
            bulkOrder = await bulkOrderService.createBulkOrder({
                userId,
                config: {
                    totalCopies: parseInt(totalCopies),
                    distinctDesigns: parseInt(distinctDesigns),
                    pagesPerDesign: parseInt(pagesPerDesign),
                    hireDesigner: hireDesigner === "true" || hireDesigner === true,
                    productType: productType || "VISITING_CARD",
                },
                file: {
                    url: uploadResult.secure_url,
                    publicId: uploadResult.public_id,
                    filename: req.file.originalname,
                    size: req.file.size,
                    pageCount: pdfMetadata.pageCount,
                },
                productId,
            });
            console.log('✅ Bulk order created successfully:', bulkOrder._id);
        } catch (createError) {
            console.error('❌ Failed to create bulk order:', createError);
            console.error('Error details:', {
                message: createError.message,
                stack: createError.stack,
            });
            throw createError; // Re-throw to be caught by outer catch
        }

        // Start async processing (fire and forget)
        // In production, use a proper job queue like Bull or Agenda
        setImmediate(() => {
            bulkOrderService.processBulkOrder(bulkOrder._id.toString()).catch((error) => {
                console.error("Background processing error:", error);
            });
        });

        return res.status(201).json({
            success: true,
            message: "Bulk order uploaded successfully. Processing started.",
            data: {
                bulkOrderId: bulkOrder._id,
                orderNumber: bulkOrder.orderNumber,
                status: bulkOrder.status,
                distinctDesigns: bulkOrder.distinctDesigns,
                totalCopies: bulkOrder.totalCopies,
                estimatedCompletionTime: "30-60 seconds",
            },
        });
    } catch (error) {
        console.error("Upload bulk order error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to upload bulk order",
            error: error.message,
        });
    }
};

/**
 * @desc    Get bulk order status
 * @route   GET /api/bulk-orders/:id/status
 * @access  Private
 */
export const getBulkOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const bulkOrder = await bulkOrderService.getBulkOrder(id, userId);

        return res.json({
            success: true,
            data: {
                orderNumber: bulkOrder.orderNumber,
                status: bulkOrder.status,
                progress: bulkOrder.progress,
                distinctDesigns: bulkOrder.distinctDesigns,
                totalCopies: bulkOrder.totalCopies,
                createdAt: bulkOrder.createdAt,
                completedAt: bulkOrder.completedAt,
                failureReason: bulkOrder.failureReason,
                parentOrderId: bulkOrder.parentOrderId,
                childOrdersCount: bulkOrder.childOrderIds?.length || 0,
            },
        });
    } catch (error) {
        console.error("Get bulk order status error:", error);
        return res.status(error.message === "Unauthorized access" ? 403 : 500).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * @desc    Get bulk order details
 * @route   GET /api/bulk-orders/:id
 * @access  Private
 */
export const getBulkOrderDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const bulkOrder = await bulkOrderService.getBulkOrder(id, userId);

        return res.json({
            success: true,
            data: bulkOrder,
        });
    } catch (error) {
        console.error("Get bulk order details error:", error);
        return res.status(error.message === "Unauthorized access" ? 403 : 500).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * @desc    List user's bulk orders
 * @route   GET /api/bulk-orders
 * @access  Private
 */
export const listUserBulkOrders = async (req, res) => {
    try {
        const userId = req.user.id;
        const { limit = 20, skip = 0, status } = req.query;

        const bulkOrders = await bulkOrderService.listBulkOrders(userId, {
            limit: parseInt(limit),
            skip: parseInt(skip),
            status,
        });

        return res.json({
            success: true,
            data: bulkOrders,
            count: bulkOrders.length,
        });
    } catch (error) {
        console.error("List bulk orders error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to list bulk orders",
            error: error.message,
        });
    }
};

/**
 * @desc    Cancel bulk order
 * @route   DELETE /api/bulk-orders/:id
 * @access  Private
 */
export const cancelBulkOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const bulkOrder = await bulkOrderService.cancelBulkOrder(id, userId);

        return res.json({
            success: true,
            message: "Bulk order cancelled successfully",
            data: {
                orderNumber: bulkOrder.orderNumber,
                status: bulkOrder.status,
            },
        });
    } catch (error) {
        console.error("Cancel bulk order error:", error);
        return res.status(error.message === "Unauthorized access" ? 403 : 500).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * @desc    Get bulk order statistics (Admin)
 * @route   GET /api/admin/bulk-orders/stats
 * @access  Private + Admin
 */
export const getBulkOrderStats = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const filters = {};
        if (startDate || endDate) {
            filters.createdAt = {};
            if (startDate) filters.createdAt.$gte = new Date(startDate);
            if (endDate) filters.createdAt.$lte = new Date(endDate);
        }

        const stats = await BulkOrder.getStats(filters);

        return res.json({
            success: true,
            data: stats,
        });
    } catch (error) {
        console.error("Get bulk order stats error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to get statistics",
            error: error.message,
        });
    }
};

/**
 * @desc    Retry failed bulk order (Admin)
 * @route   POST /api/admin/bulk-orders/:id/retry
 * @access  Private + Admin
 */
export const retryBulkOrder = async (req, res) => {
    try {
        const { id } = req.params;

        const bulkOrder = await BulkOrder.findById(id);
        if (!bulkOrder) {
            return res.status(404).json({
                success: false,
                message: "Bulk order not found",
            });
        }

        if (bulkOrder.status !== "FAILED") {
            return res.status(400).json({
                success: false,
                message: "Can only retry failed bulk orders",
                currentStatus: bulkOrder.status,
            });
        }

        if (bulkOrder.retryCount >= 3) {
            return res.status(400).json({
                success: false,
                message: "Maximum retry attempts reached",
            });
        }

        // Reset status and retry
        bulkOrder.status = "UPLOADED";
        bulkOrder.retryCount += 1;
        bulkOrder.lastRetryAt = new Date();
        bulkOrder.failureReason = null;
        bulkOrder.addLog("RETRY", "INFO", `Retry attempt ${bulkOrder.retryCount}`);
        await bulkOrder.save();

        // Start processing
        setImmediate(() => {
            bulkOrderService.processBulkOrder(bulkOrder._id.toString()).catch((error) => {
                console.error("Retry processing error:", error);
            });
        });

        return res.json({
            success: true,
            message: "Bulk order retry initiated",
            data: {
                orderNumber: bulkOrder.orderNumber,
                status: bulkOrder.status,
                retryCount: bulkOrder.retryCount,
            },
        });
    } catch (error) {
        console.error("Retry bulk order error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to retry bulk order",
            error: error.message,
        });
    }
};

export default {
    uploadBulkOrder,
    getBulkOrderStatus,
    getBulkOrderDetails,
    listUserBulkOrders,
    cancelBulkOrder,
    getBulkOrderStats,
    retryBulkOrder,
};
