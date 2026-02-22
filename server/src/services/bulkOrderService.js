import Order from "../models/orderModal.js";

/**
 * Bulk Order Service (Simplified — Direct Child Order Creation)
 * 
 * Creates child orders immediately and synchronously from the parent order.
 * No PDF splitting, no background jobs. Each child order shares the same
 * composite PDF URL but represents a distinct design slot.
 */

/**
 * Create child orders for a bulk parent order.
 * Called immediately after parent order is saved.
 *
 * @param {Object} parentOrder - The saved parent Order mongoose document
 * @returns {Promise<Order[]>} - Array of created child orders
 */
export const createChildOrders = async (parentOrder) => {
  const numberOfDesigns = parentOrder.distinctDesigns || 1;
  const perDesignQuantity = Math.ceil(parentOrder.quantity / numberOfDesigns);
  const childOrders = [];
  const childOrderIds = [];

  console.log(`🧩 [BulkOrderService] Creating ${numberOfDesigns} child orders for parent: ${parentOrder.orderNumber}`);

  for (let i = 1; i <= numberOfDesigns; i++) {
    const childOrderNumber = `${parentOrder.orderNumber.replace('PARENT-', '')}-${String(i).padStart(3, '0')}`;

    const childOrder = new Order({
      user: parentOrder.user,
      product: parentOrder.product,
      orderNumber: childOrderNumber,
      quantity: perDesignQuantity,
      finish: parentOrder.finish || 'Standard',
      shape: parentOrder.shape || 'Standard',
      status: 'request',
      address: parentOrder.address,
      pincode: parentOrder.pincode,
      mobileNumber: parentOrder.mobileNumber,
      totalPrice: parseFloat((parentOrder.totalPrice / numberOfDesigns).toFixed(2)),
      selectedOptions: parentOrder.selectedOptions || {},
      selectedDynamicAttributes: parentOrder.selectedDynamicAttributes || [],
      notes: parentOrder.notes || '',
      paymentStatus: parentOrder.paymentStatus || 'pending',

      // Bulk child flags
      isBulkChild: true,
      parentOrderId: parentOrder._id,
      bulkOrderRef: parentOrder.bulkOrderRef || null,
      designSequence: i,

      // Inherit the composite PDF — each child has access to the full design file
      uploadedDesign: parentOrder.uploadedDesign
        ? {
            pdfFile: parentOrder.uploadedDesign.pdfFile
              ? {
                  url: parentOrder.uploadedDesign.pdfFile.url,
                  publicId: parentOrder.uploadedDesign.pdfFile.publicId,
                  filename: parentOrder.uploadedDesign.pdfFile.filename,
                  pageCount: parentOrder.uploadedDesign.pdfFile.pageCount,
                }
              : undefined,
            frontImage: parentOrder.uploadedDesign.frontImage
              ? {
                  url: parentOrder.uploadedDesign.frontImage.url,
                  publicId: parentOrder.uploadedDesign.frontImage.publicId,
                  filename: parentOrder.uploadedDesign.frontImage.filename,
                }
              : undefined,
          }
        : undefined,

      // Proportional price snapshot
      priceSnapshot: parentOrder.priceSnapshot
        ? {
            ...parentOrder.priceSnapshot,
            quantity: perDesignQuantity,
            subtotal: parseFloat(((parentOrder.priceSnapshot.subtotal || 0) / numberOfDesigns).toFixed(2)),
            gstAmount: parseFloat(((parentOrder.priceSnapshot.gstAmount || 0) / numberOfDesigns).toFixed(2)),
            shippingCost: parseFloat(((parentOrder.priceSnapshot.shippingCost || parentOrder.shippingCost || 0) / numberOfDesigns).toFixed(2)),
            totalPayable: parseFloat(((parentOrder.priceSnapshot.totalPayable || 0) / numberOfDesigns).toFixed(2)),
          }
        : undefined,
      shippingCost: parseFloat(((parentOrder.shippingCost || 0) / numberOfDesigns).toFixed(2)),
    });

    await childOrder.save();
    childOrders.push(childOrder);
    childOrderIds.push(childOrder._id);

    console.log(`   ✅ Child order ${i}/${numberOfDesigns}: ${childOrderNumber}`);
  }

  // Update parent order with child IDs
  await Order.findByIdAndUpdate(parentOrder._id, {
    childOrders: childOrderIds,
  });

  console.log(`✅ [BulkOrderService] All ${childOrders.length} child orders created for ${parentOrder.orderNumber}`);

  return childOrders;
};

/**
 * Get a single bulk order with protection
 */
export const getBulkOrder = async (id, userId) => {
  const bulkOrder = await BulkOrder.findById(id).lean();
  if (!bulkOrder) throw new Error("Bulk order not found");
  if (userId && bulkOrder.userId?.toString() !== userId.toString()) {
    throw new Error("Unauthorized access");
  }
  return bulkOrder;
};

/**
 * List bulk orders for a user
 */
export const listBulkOrders = async (userId, options = {}) => {
  const { limit = 20, skip = 0, status } = options;
  const query = { userId };
  if (status) query.status = status;

  return await BulkOrder.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

/**
 * List all bulk orders for admin
 */
export const listAllBulkOrders = async (options = {}) => {
  const { limit = 20, skip = 0, status, search } = options;
  const query = {};
  if (status) query.status = status;
  if (search) {
    query.$or = [{ orderNumber: { $regex: search, $options: 'i' } }];
  }

  return await BulkOrder.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

/**
 * Cancel a bulk order
 */
export const cancelBulkOrder = async (id, userId) => {
  const bulkOrder = await BulkOrder.findById(id);
  if (!bulkOrder) throw new Error("Bulk order not found");
  if (userId && bulkOrder.userId?.toString() !== userId.toString()) {
    throw new Error("Unauthorized access");
  }

  if (['COMPLETED', 'CANCELLED'].includes(bulkOrder.status)) {
    throw new Error(`Cannot cancel order in ${bulkOrder.status} status`);
  }

  bulkOrder.status = 'CANCELLED';
  await bulkOrder.save();
  return bulkOrder;
};

export default {
  createChildOrders,
  getBulkOrder,
  listBulkOrders,
  listAllBulkOrders,
  cancelBulkOrder,
};
