import BulkOrder from "../models/BulkOrder.js";
import Order from "../models/orderModal.js";
import { User } from "../models/User.js";
import { processBulkPDF, deleteBulkAssets } from "./pdfSplitterService.js";

/**
 * Bulk Order Service
 * Business logic for bulk order processing
 */

/**
 * Create bulk order record
 * @param {Object} params - Parameters
 * @param {string} params.userId - User ID
 * @param {Object} params.config - Configuration
 * @param {Object} params.file - Uploaded file info
 * @param {string} params.productId - Product ID
 * @returns {Promise<BulkOrder>}
 */
export const createBulkOrder = async ({ userId, config, file, productId }) => {
    try {
        // Get user details
        const user = await User.findById(userId).populate("userSegment");
        if (!user) {
            throw new Error("User not found");
        }

        const {
            totalCopies,
            distinctDesigns,
            pagesPerDesign,
            hireDesigner = false,
            productType,
        } = config;

        // Create bulk order
        const bulkOrder = new BulkOrder({
            user: userId,
            userSegment: user.userSegment?._id || null,
            totalCopies,
            distinctDesigns,
            pagesPerDesign,
            product: productId,
            productType: productType || "VISITING_CARD",
            price: {
                unitPrice: config.unitPrice || 0,
                totalPrice: config.totalPrice || 0,
                gstAmount: (config.totalPrice - (config.unitPrice * config.totalCopies)) || 0, // Approx
                netAmount: (config.unitPrice * config.totalCopies) || 0
            },
            compositeFile: {
                url: file.url,
                publicId: file.publicId,
                filename: file.filename,
                size: file.size,
                pageCount: file.pageCount,
            },
            hireDesigner,
            status: "UPLOADED",
        });

        // Set design fee if applicable
        if (hireDesigner) {
            bulkOrder.designFee = {
                basePerDesign: 500, // ₹500 per design
                totalFee: 500 * distinctDesigns,
            };
        }

        bulkOrder.addLog("CREATION", "SUCCESS", "Bulk order created");
        await bulkOrder.save();

        return bulkOrder;
    } catch (error) {
        throw new Error(`Failed to create bulk order: ${error.message}`);
    }
};

/**
 * Process bulk order (async background job)
 * @param {string} bulkOrderId - Bulk order ID
 * @returns {Promise<void>}
 */
export const processBulkOrder = async (bulkOrderId) => {
    let bulkOrder;

    try {
        bulkOrder = await BulkOrder.findById(bulkOrderId);
        if (!bulkOrder) {
            throw new Error("Bulk order not found");
        }

        // Update status to PROCESSING
        bulkOrder.status = "PROCESSING";
        bulkOrder.updateProgress(10, "PROCESSING", "Starting bulk order processing");
        bulkOrder.addLog("PROCESSING", "INFO", "Processing started");
        await bulkOrder.save();

        // This would typically fetch the file from Cloudinary
        // For now, we'll assume the processing happens with the uploaded file
        bulkOrder.updateProgress(30, "SPLITTING", "Splitting PDF into designs");
        await bulkOrder.save();

        // Note: In production, you'd download the file from Cloudinary here
        // const fileBuffer = await downloadFromCloudinary(bulkOrder.compositeFile.url);

        // Process PDF and split
        // const splitAssets = await processBulkPDF(fileBuffer, {
        //   totalCopies: bulkOrder.totalCopies,
        //   distinctDesigns: bulkOrder.distinctDesigns,
        //   pagesPerDesign: bulkOrder.pagesPerDesign,
        //   bulkOrderId: bulkOrder._id.toString(),
        // });

        // For now, we'll create mock split assets
        const splitAssets = createMockSplitAssets(bulkOrder);

        bulkOrder.splitAssets = splitAssets;
        bulkOrder.status = "SPLIT_COMPLETE";
        bulkOrder.updateProgress(60, "CREATING_ORDERS", "Creating individual orders");
        bulkOrder.addLog("SPLITTING", "SUCCESS", `Split into ${splitAssets.length} designs`);
        await bulkOrder.save();

        // Create order hierarchy
        await createOrderHierarchy(bulkOrder);

        // Mark as completed
        await bulkOrder.markCompleted();

        return bulkOrder;
    } catch (error) {
        console.error("Bulk order processing error:", error);

        if (bulkOrder) {
            await bulkOrder.markFailed(error.message);

            // Cleanup uploaded assets
            if (bulkOrder.splitAssets && bulkOrder.splitAssets.length > 0) {
                const publicIds = bulkOrder.splitAssets
                    .map((asset) => asset.publicId)
                    .filter(Boolean);
                await deleteBulkAssets(publicIds);
            }
        }

        throw error;
    }
};

/**
 * Create mock split assets (temporary - replace with actual PDF processing)
 */
const createMockSplitAssets = (bulkOrder) => {
    const baseCopies = Math.floor(bulkOrder.totalCopies / bulkOrder.distinctDesigns);
    const remainder = bulkOrder.totalCopies % bulkOrder.distinctDesigns;

    const splitAssets = [];

    for (let i = 0; i < bulkOrder.distinctDesigns; i++) {
        const designIndex = i + 1;
        const copiesAssigned = baseCopies + (i < remainder ? 1 : 0);

        splitAssets.push({
            designIndex,
            url: `${bulkOrder.compositeFile.url}/design_${designIndex}`, // Mock URL
            publicId: `bulk-orders/${bulkOrder._id}/design_${designIndex}`,
            thumbnail: `${bulkOrder.compositeFile.url}/thumb_${designIndex}`,
            pageRange: {
                start: i * bulkOrder.pagesPerDesign + 1,
                end: (i + 1) * bulkOrder.pagesPerDesign,
            },
            copiesAssigned,
        });
    }

    return splitAssets;
};

/**
 * Create order hierarchy (1 parent + N child orders)
 * @param {BulkOrder} bulkOrder - Bulk order document
 * @returns {Promise<{parent: Order, children: Order[]}>}
 */
export const createOrderHierarchy = async (bulkOrder) => {
    try {
        // Populate user and product
        await bulkOrder.populate("user product");

        // Step 1: Create parent order (tracking order)
        const parentOrder = new Order({
            user: bulkOrder.user._id,
            product: bulkOrder.product._id,
            quantity: bulkOrder.totalCopies,
            status: "REQUESTED",
            address: bulkOrder.user.address || "Pending",
            pincode: bulkOrder.user.pincode || "000000",
            mobileNumber: bulkOrder.user.mobileNumber || "0000000000",

            // Real price snapshot from Bulk Order
            priceSnapshot: {
                basePrice: bulkOrder.price.unitPrice || 0,  // Per-unit price
                unitPrice: bulkOrder.price.unitPrice || 0,
                quantity: bulkOrder.totalCopies,
                appliedModifiers: [],
                subtotal: bulkOrder.price.netAmount || 0,
                gstPercentage: 18, // Assuming 18% standard
                gstAmount: bulkOrder.price.gstAmount || 0,
                totalPayable: bulkOrder.price.totalPrice || 0,
                currency: "INR",
            },

            selectedDynamicAttributes: [],
            paymentStatus: bulkOrder.paymentStatus || "PENDING",

            // Mark as bulk parent
            childOrders: [],
            bulkOrderRef: bulkOrder._id,
        });

        parentOrder.orderNumber = `PARENT-${bulkOrder.orderNumber}`;
        await parentOrder.save();

        bulkOrder.addLog("ORDER_CREATION", "INFO", `Created parent order: ${parentOrder.orderNumber}`);

        // Step 2: Create child orders (one per design)
        const childOrders = [];
        const childOrderIds = [];

        for (const asset of bulkOrder.splitAssets) {
            const childOrder = new Order({
                user: bulkOrder.user._id,
                product: bulkOrder.product._id,
                quantity: asset.copiesAssigned,
                status: "REQUESTED",
                address: bulkOrder.user.address || "Pending",
                pincode: bulkOrder.user.pincode || "000000",
                mobileNumber: bulkOrder.user.mobileNumber || "0000000000",

                // Child order inherits payment status.
                // WE SET THE PRICE HERE so the user sees the value of this specific part of the order.
                // It does not imply they have to pay again because paymentStatus will be COMPLETED.
                priceSnapshot: {
                    basePrice: bulkOrder.price.unitPrice || 0,
                    unitPrice: bulkOrder.price.unitPrice || 0,
                    quantity: asset.copiesAssigned,
                    appliedModifiers: [],
                    subtotal: (bulkOrder.price.netAmount || 0) / bulkOrder.distinctDesigns,
                    gstPercentage: 18,
                    gstAmount: (bulkOrder.price.gstAmount || 0) / bulkOrder.distinctDesigns,
                    totalPayable: (bulkOrder.price.totalPrice || 0) / bulkOrder.distinctDesigns,
                    currency: "INR",
                },

                selectedDynamicAttributes: [],
                paymentStatus: bulkOrder.paymentStatus || "PENDING",

                // Bulk tracking
                isBulkChild: true,
                bulkParentOrderId: parentOrder._id,
                bulkOrderRef: bulkOrder._id,
                designSequence: asset.designIndex,
                parentOrderId: parentOrder._id,
                
                // Map split asset to uploadedDesign for display
                uploadedDesign: {
                    frontImage: {
                        data: asset.url, // Cloudinary URL
                        contentType: "application/pdf", // or image/png based on file
                        filename: `design_${asset.designIndex}.pdf`
                    }
                }
            });

            childOrder.orderNumber = `${parentOrder.orderNumber}-${String(asset.designIndex).padStart(3, "0")}`;
            await childOrder.save();

            childOrders.push(childOrder);
            childOrderIds.push(childOrder._id);

            bulkOrder.addLog(
                "ORDER_CREATION",
                "INFO",
                `Created child order ${asset.designIndex}/${bulkOrder.distinctDesigns}: ${childOrder.orderNumber}`
            );
        }

        // Step 3: Update parent with child IDs
        parentOrder.childOrders = childOrderIds;
        await parentOrder.save();

        // Step 4: Update bulk order with order IDs
        bulkOrder.parentOrderId = parentOrder._id;
        bulkOrder.childOrderIds = childOrderIds;
        await bulkOrder.save();

        bulkOrder.addLog(
            "ORDER_CREATION",
            "SUCCESS",
            `Created ${childOrders.length} child orders under parent ${parentOrder.orderNumber}`
        );

        return { parent: parentOrder, children: childOrders };
    } catch (error) {
        throw new Error(`Failed to create order hierarchy: ${error.message}`);
    }
};

/**
 * Get bulk order with populated data
 * @param {string} bulkOrderId - Bulk order ID
 * @param {string} userId - User ID (for authorization)
 * @returns {Promise<BulkOrder>}
 */
export const getBulkOrder = async (bulkOrderId, userId) => {
    const bulkOrder = await BulkOrder.findById(bulkOrderId)
        .populate("user", "name email")
        .populate("product", "name category")
        .populate("parentOrderId", "orderNumber status")
        .populate("childOrderIds", "orderNumber status quantity");

    if (!bulkOrder) {
        throw new Error("Bulk order not found");
    }

    // Check authorization
    if (bulkOrder.user._id.toString() !== userId) {
        throw new Error("Unauthorized access");
    }

    return bulkOrder;
};

/**
 * List user's bulk orders
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Array<BulkOrder>>}
 */
export const listBulkOrders = async (userId, options = {}) => {
    return await BulkOrder.getByUser(userId, options);
};

/**
 * Cancel bulk order
 * @param {string} bulkOrderId - Bulk order ID
 * @param {string} userId - User ID
 * @returns {Promise<BulkOrder>}
 */
export const cancelBulkOrder = async (bulkOrderId, userId) => {
    const bulkOrder = await BulkOrder.findById(bulkOrderId);

    if (!bulkOrder) {
        throw new Error("Bulk order not found");
    }

    if (bulkOrder.user.toString() !== userId) {
        throw new Error("Unauthorized access");
    }

    // Can only cancel if not yet processed
    if (["ORDER_CREATED", "SPLIT_COMPLETE"].includes(bulkOrder.status)) {
        throw new Error("Cannot cancel - orders already created");
    }

    bulkOrder.status = "CANCELLED";
    bulkOrder.addLog("CANCELLATION", "INFO", "Bulk order cancelled by user");
    await bulkOrder.save();

    // Cleanup assets
    if (bulkOrder.splitAssets && bulkOrder.splitAssets.length > 0) {
        const publicIds = bulkOrder.splitAssets
            .map((asset) => asset.publicId)
            .filter(Boolean);
        await deleteBulkAssets(publicIds);
    }

    return bulkOrder;
};

export default {
    createBulkOrder,
    processBulkOrder,
    createOrderHierarchy,
    getBulkOrder,
    listBulkOrders,
    cancelBulkOrder,
};
