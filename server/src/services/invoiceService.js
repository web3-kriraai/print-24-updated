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
            .text('Delivery Date:', 45, detailY + lineH * 3)
            .fillColor('#111827')
            .font('Helvetica-Bold')
            .text(
                order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString('en-IN') : 'Not scheduled',
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
    }

    _addPriceBreakdown(doc, order) {
        // Calculate Y position dynamically
        let y = doc.y + 15;

        // Ensure we have some minimum spacing but not excessive
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
