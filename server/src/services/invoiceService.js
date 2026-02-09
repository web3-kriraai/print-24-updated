import PDFDocument from 'pdfkit';

class InvoiceService {
    generateInvoice(order) {
        const doc = new PDFDocument({
            size: 'A4',
            margin: 40,
            info: {
                Title: `Invoice - ${order.orderNumber}`,
                Author: 'Prints24'
            }
        });

        this._addHeader(doc);
        this._addInvoiceDetails(doc, order);
        this._addCustomerDetails(doc, order);
        this._addOrderDetails(doc, order);
        this._addProductDetails(doc, order);
        this._addShipmentDetails(doc, order);
        this._addPriceBreakdown(doc, order);

        if (order.payment_details && order.paymentStatus === 'COMPLETED') {
            this._addPaymentDetails(doc, order);
        }

        this._addFooter(doc);
        doc.end();
        return doc;
    }

    _addHeader(doc) {
        doc
            .fontSize(22)
            .fillColor('#1e40af')
            .font('Helvetica-Bold')
            .text('PRINTS24', 40, 30);

        doc
            .fontSize(8)
            .fillColor('#666')
            .font('Helvetica')
            .text('Fastest • Smartest • Finest Printing Solutions', 40, 55);
    }

    _addInvoiceDetails(doc, order) {
        const y = 75;

        doc
            .fontSize(18)
            .fillColor('#000')
            .font('Helvetica-Bold')
            .text('INVOICE', 40, y);

        const date = new Date(order.createdAt).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });

        doc
            .fontSize(8)
            .fillColor('#666')
            .font('Helvetica')
            .text('Date:', 400, y)
            .fillColor('#000')
            .text(date, 450, y, { align: 'right' });

        doc
            .fontSize(8)
            .fillColor('#666')
            .text('Invoice #:', 400, y + 12)
            .fillColor('#000')
            .text(order.orderNumber, 450, y + 12, { align: 'right' });

        doc
            .fontSize(8)
            .fillColor('#666')
            .text('Status:', 400, y + 24)
            .fillColor(order.paymentStatus === 'COMPLETED' ? '#059669' : '#ea580c')
            .font('Helvetica-Bold')
            .text(order.paymentStatus || 'PENDING', 450, y + 24, { align: 'right' });
    }

    _addCustomerDetails(doc, order) {
        const y = 115;

        // Bill To (Left side)
        doc
            .fontSize(9)
            .fillColor('#000')
            .font('Helvetica-Bold')
            .text('Bill To:', 40, y);

        doc
            .fontSize(8)
            .fillColor('#333')
            .font('Helvetica')
            .text(order.user?.name || 'Customer', 40, y + 14);

        if (order.user?.email) {
            doc
                .fontSize(7)
                .fillColor('#666')
                .text(order.user.email, 40, y + 26);
        }

        // Ship To (Right side)
        // Use a safe X position (e.g., 300)
        const xRight = 300;

        doc
            .fontSize(9)
            .fillColor('#000')
            .font('Helvetica-Bold')
            .text('Ship To:', xRight, y);

        doc
            .fontSize(8)
            .fillColor('#333')
            .font('Helvetica');

        // We wrap the address if it's long, but for simplicity let's just print it.
        // PDFKit text wrapping might be needed if address is very long.
        // We'll give it a width.
        doc.text(order.address || 'N/A', xRight, y + 14, { width: 200 });

        // Pincode and Mobile
        // We need to calculate where the address ended. doc.y will be updated after the previous text call.
        const afterAddressY = doc.y;

        doc.text(`Pincode: ${order.pincode || 'N/A'}`, xRight, afterAddressY + 2);
        doc.text(`Mobile: ${order.mobileNumber || 'N/A'}`, xRight, afterAddressY + 12);
    }

    _addOrderDetails(doc, order) {
        const y = 158;

        // Section header
        doc
            .rect(40, y, 515, 20)
            .fill('#f3f4f6');

        doc
            .fillColor('#374151')
            .fontSize(9)
            .font('Helvetica-Bold')
            .text('Order Details', 45, y + 6);

        const detailY = y + 28;
        const lineH = 12;

        doc
            .fontSize(7)
            .fillColor('#6b7280')
            .font('Helvetica')
            .text('Order Number:', 45, detailY)
            .fillColor('#111827')
            .font('Helvetica-Bold')
            .text(order.orderNumber, 140, detailY);

        doc
            .fillColor('#6b7280')
            .font('Helvetica')
            .text('Order Date:', 45, detailY + lineH)
            .fillColor('#111827')
            .font('Helvetica-Bold')
            .text(new Date(order.createdAt).toLocaleDateString('en-IN'), 140, detailY + lineH);

        doc
            .fillColor('#6b7280')
            .font('Helvetica')
            .text('Quantity:', 45, detailY + lineH * 2)
            .fillColor('#111827')
            .font('Helvetica-Bold')
            .text(`${order.quantity.toLocaleString('en-IN')} units`, 140, detailY + lineH * 2);

        doc
            .fillColor('#6b7280')
            .font('Helvetica')
            .text('Est. Delivery:', 45, detailY + lineH * 3)
            .fillColor('#111827')
            .font('Helvetica-Bold')
            .text(
                order.estimatedDeliveryDate ? new Date(order.estimatedDeliveryDate).toLocaleDateString('en-IN') : 'Not calculated',
                140,
                detailY + lineH * 3
            );
    }

    _addProductDetails(doc, order) {
        const y = 245;

        // Section header
        doc
            .rect(40, y, 515, 20)
            .fill('#1e40af');

        doc
            .fillColor('#ffffff')
            .fontSize(9)
            .font('Helvetica-Bold')
            .text('Product Details', 45, y + 6);

        let currentY = y + 28;

        // Product name
        doc
            .fillColor('#111827')
            .fontSize(10)
            .font('Helvetica-Bold')
            .text(order.product?.name || 'Product', 45, currentY);

        currentY += 16;
        const lineH = 11;

        // Attributes
        if (order.selectedDynamicAttributes && order.selectedDynamicAttributes.length > 0) {
            doc.fontSize(7).fillColor('#6b7280').font('Helvetica');

            order.selectedDynamicAttributes.forEach(attr => {
                doc
                    .text(`${attr.attributeName}: `, 45, currentY, { continued: true })
                    .fillColor('#111827')
                    .font('Helvetica-Bold')
                    .text(attr.label);

                currentY += lineH;
                doc.fillColor('#6b7280').font('Helvetica');
            });
        }

        if (order.shape) {
            doc
                .text('Shape: ', 45, currentY, { continued: true })
                .fillColor('#111827')
                .font('Helvetica-Bold')
                .text(order.shape);
            currentY += lineH;
            doc.fillColor('#6b7280').font('Helvetica');
        }

        if (order.finish) {
            doc
                .text('Finish: ', 45, currentY, { continued: true })
                .fillColor('#111827')
                .font('Helvetica-Bold')
                .text(order.finish);
            currentY += lineH;
        }

        // Update doc.y so the next section knows where to start
        doc.y = currentY;
    }

    _addShipmentDetails(doc, order) {
        // Only show if we have shipment info
        if (!order.courierPartner && !order.awbCode) {
            return;
        }

        let y = doc.y + 15;

        // Ensure we don't overlap if previous section was short
        // Product details starts at 245. If it was short, y might be small.
        // Let's ensure a minimum Y to look balanced, similar to price breakdown logic
        // but price breakdown enforces 380. We can just flow naturally from product details
        // as long as product details sets doc.y correctly (which it does).

        // Section header
        doc
            .rect(40, y, 515, 20)
            .fill('#f3f4f6');

        doc
            .fillColor('#374151')
            .fontSize(9)
            .font('Helvetica-Bold')
            .text('Shipment Details', 45, y + 6);

        let currentY = y + 28;
        const lineH = 12;

        // Courier
        if (order.courierPartner) {
            doc
                .fontSize(7)
                .fillColor('#6b7280')
                .font('Helvetica')
                .text('Courier Partner:', 45, currentY)
                .fillColor('#111827')
                .font('Helvetica-Bold')
                .text(order.courierPartner, 140, currentY);
            currentY += lineH;
        }

        // AWB
        if (order.awbCode) {
            doc
                .fontSize(7)
                .fillColor('#6b7280')
                .font('Helvetica')
                .text('AWB / Tracking #:', 45, currentY)
                .fillColor('#111827')
                .font('Helvetica-Bold')
                .text(order.awbCode, 140, currentY);
            currentY += lineH;
        }

        // Scheduled Pickup Date (based on production completion)
        // Priority: pickupDetails.scheduledPickupTime > productionEndDate > dispatchedAt
        const pickupDate = order.pickupDetails?.scheduledPickupTime || order.productionEndDate || order.dispatchedAt;
        if (pickupDate) {
            doc
                .fontSize(7)
                .fillColor('#6b7280')
                .font('Helvetica')
                .text('Scheduled Pickup:', 45, currentY)
                .fillColor('#111827')
                .font('Helvetica-Bold')
                .text(new Date(pickupDate).toLocaleDateString('en-IN'), 140, currentY);
            currentY += lineH;
        }

        // Tracking Link
        if (order.courierTrackingUrl) {
            doc
                .fontSize(7)
                .fillColor('#2563eb')
                .font('Helvetica')
                .text('Track Shipment', 45, currentY, {
                    link: order.courierTrackingUrl,
                    underline: true
                });
            currentY += lineH;
        }

        doc.y = currentY;
    }

    _addPriceBreakdown(doc, order) {
        // Calculate Y position dynamically
        let y = doc.y + 15;

        // Ensure we have some minimum spacing but not excessive
        // If product details pushed Y down, use that. Otherwise use fixed position.
        if (y < 380) y = 380;

        // Section header
        doc
            .rect(40, y, 515, 20)
            .fill('#f3f4f6');

        doc
            .fillColor('#374151')
            .fontSize(9)
            .font('Helvetica-Bold')
            .text('Price Breakdown', 45, y + 6);

        const priceY = y + 32;

        // Use priceSnapshot
        const useSnapshot = Boolean(order.priceSnapshot);
        let subtotal, gstPercentage, gstAmount, total;

        if (useSnapshot) {
            subtotal = order.priceSnapshot.subtotal;
            gstPercentage = order.priceSnapshot.gstPercentage;
            gstAmount = order.priceSnapshot.gstAmount;
            total = order.priceSnapshot.totalPayable;
        } else {
            const gstPercent = order.product?.gstPercentage || 18;
            total = order.totalPrice;
            subtotal = total / (1 + gstPercent / 100);
            gstPercentage = gstPercent;
            gstAmount = total - subtotal;
        }

        // Subtotal
        doc
            .fontSize(8)
            .fillColor('#6b7280')
            .font('Helvetica')
            .text('Subtotal:', 45, priceY)
            .fillColor('#111827')
            .font('Helvetica-Bold')
            .text(`₹${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 480, priceY, { align: 'right' });

        // GST
        doc
            .fillColor('#6b7280')
            .font('Helvetica')
            .text(`GST (${gstPercentage}%):`, 45, priceY + 16)
            .fillColor('#7c3aed')
            .font('Helvetica-Bold')
            .text(`₹${gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 480, priceY + 16, { align: 'right' });

        // Divider
        doc
            .strokeColor('#d1d5db')
            .lineWidth(0.5)
            .moveTo(45, priceY + 34)
            .lineTo(555, priceY + 34)
            .stroke();

        // Total
        doc
            .fontSize(11)
            .fillColor('#111827')
            .font('Helvetica-Bold')
            .text('Total Amount:', 45, priceY + 42);

        doc
            .fontSize(13)
            .fillColor('#1e40af')
            .font('Helvetica-Bold')
            .text(`₹${total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 480, priceY + 40, { align: 'right' });

        // Update doc.y for next section
        doc.y = priceY + 70;
    }

    _addPaymentDetails(doc, order) {
        const y = doc.y + 10;

        // Payment badge
        doc
            .rect(40, y, 515, 50)
            .fillAndStroke('#d1fae5', '#10b981')
            .lineWidth(1.5);

        doc
            .fontSize(10)
            .fillColor('#065f46')
            .font('Helvetica-Bold')
            .text('✓ Payment Completed', 50, y + 8);

        doc
            .fontSize(7)
            .fillColor('#047857')
            .font('Helvetica')
            .text('Gateway:', 50, y + 26)
            .font('Helvetica-Bold')
            .text(order.payment_details.gateway_used || 'N/A', 50, y + 36);

        doc
            .font('Helvetica')
            .text('Method:', 180, y + 26)
            .font('Helvetica-Bold')
            .text(order.payment_details.payment_method || 'N/A', 180, y + 36);

        doc
            .font('Helvetica')
            .text('Amount Paid:', 310, y + 26)
            .font('Helvetica-Bold')
            .text(
                `₹${(order.payment_details.amount_paid || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                310,
                y + 36
            );

        doc.y = y + 60;
    }

    _addFooter(doc) {
        const bottomY = 750;

        doc
            .fontSize(7)
            .fillColor('#6b7280')
            .font('Helvetica')
            .text('Thank you for your business!', 40, bottomY, { align: 'center', width: 515 });

        doc
            .fontSize(6)
            .fillColor('#9ca3af')
            .text('For support, contact: support@prints24.com | +91-XXXXXXXXXX', 40, bottomY + 14, {
                align: 'center',
                width: 515
            });

        doc
            .fontSize(5)
            .fillColor('#d1d5db')
            .text('This is a computer-generated invoice and does not require a signature.', 40, bottomY + 26, {
                align: 'center',
                width: 515
            });

        doc
            .fontSize(5)
            .fillColor('#9ca3af')
            .text('GSTIN: [Your GST Number] | PAN: [Your PAN Number]', 40, bottomY + 36, {
                align: 'center',
                width: 515
            });
    }
}

export default new InvoiceService();
