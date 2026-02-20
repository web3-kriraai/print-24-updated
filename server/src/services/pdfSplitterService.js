import { PDFDocument } from "pdf-lib";
import cloudinary from "../config/cloudinary.js";
import streamifier from "streamifier";

/**
 * PDF Splitter Service
 * Handles validation and splitting of composite PDFs for bulk orders
 */

/**
 * Validate PDF file
 * @param {Buffer} buffer - PDF file buffer
 * @param {number} expectedPages - Expected number of pages
 * @returns {Promise<{valid: boolean, pageCount: number, error?: string}>}
 */
export const validatePDF = async (buffer, expectedPages = null) => {
    try {
        // Load PDF document
        const pdfDoc = await PDFDocument.load(buffer);
        const pageCount = pdfDoc.getPageCount();

        // Check if page count matches expected
        if (expectedPages !== null && pageCount !== expectedPages) {
            return {
                valid: false,
                pageCount,
                error: `Page count mismatch: Expected ${expectedPages} pages, found ${pageCount} pages`,
            };
        }

        // Check minimum page count
        if (pageCount < 1) {
            return {
                valid: false,
                pageCount: 0,
                error: "PDF has no pages",
            };
        }

        return {
            valid: true,
            pageCount,
        };
    } catch (error) {
        return {
            valid: false,
            pageCount: 0,
            error: `Invalid PDF file: ${error.message}`,
        };
    }
};

/**
 * Split PDF into separate files
 * @param {Buffer} buffer - Original PDF buffer
 * @param {number} pagesPerDesign - Pages per design (1, 2, or 4)
 * @param {number} distinctDesigns - Number of designs
 * @returns {Promise<Array<{designIndex, buffer, pageRange}>>}
 */
export const splitPDF = async (buffer, pagesPerDesign, distinctDesigns) => {
    try {
        // Load the original PDF
        const pdfDoc = await PDFDocument.load(buffer);
        const totalPages = pdfDoc.getPageCount();

        // Validate page count
        const expectedPages = distinctDesigns * pagesPerDesign;
        if (totalPages !== expectedPages) {
            throw new Error(
                `Page count mismatch: Expected ${expectedPages} pages (${distinctDesigns} designs × ${pagesPerDesign} pages), found ${totalPages} pages`
            );
        }

        const splitResults = [];

        // Split into individual design PDFs
        for (let i = 0; i < distinctDesigns; i++) {
            // Create new PDF for this design
            const newPdf = await PDFDocument.create();

            // Calculate page range
            const startPage = i * pagesPerDesign;
            const endPage = startPage + pagesPerDesign - 1;

            // Copy pages to new PDF
            const pageIndices = [];
            for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
                pageIndices.push(pageNum);
            }

            const copiedPages = await newPdf.copyPages(pdfDoc, pageIndices);
            copiedPages.forEach((page) => {
                newPdf.addPage(page);
            });

            // Save to buffer
            const pdfBytes = await newPdf.save();
            const pdfBuffer = Buffer.from(pdfBytes);

            splitResults.push({
                designIndex: i + 1,
                buffer: pdfBuffer,
                pageRange: {
                    start: startPage + 1, // 1-indexed for display
                    end: endPage + 1,
                },
            });
        }

        return splitResults;
    } catch (error) {
        throw new Error(`PDF splitting failed: ${error.message}`);
    }
};

/**
 * Upload design PDF to Cloudinary
 * @param {Buffer} pdfBuffer - PDF buffer
 * @param {number} designIndex - Design index (1-indexed)
 * @param {string} bulkOrderId - Bulk order ID for folder organization
 * @returns {Promise<{url: string, publicId: string, thumbnail?: string}>}
 */
export const uploadDesignToCloudinary = (pdfBuffer, designIndex, bulkOrderId) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: `bulk-orders/${bulkOrderId}`,
                resource_type: "auto",
                public_id: `design_${designIndex}_${Date.now()}`,
                format: "pdf",
            },
            (error, result) => {
                if (error) {
                    reject(new Error(`Cloudinary upload failed: ${error.message}`));
                } else {
                    resolve({
                        url: result.secure_url,
                        publicId: result.public_id,
                        thumbnail: result.thumbnail_url || null,
                    });
                }
            }
        );

        streamifier.createReadStream(pdfBuffer).pipe(uploadStream);
    });
};

/**
 * Generate thumbnail from PDF (first page)
 * Uses Cloudinary's built-in PDF to image conversion
 * @param {string} pdfPublicId - Cloudinary public ID of the PDF
 * @returns {string} - Thumbnail URL
 */
export const generateThumbnail = (pdfPublicId) => {
    // Cloudinary transformation to get first page as image
    return cloudinary.url(pdfPublicId, {
        format: "jpg",
        page: 1,
        width: 300,
        height: 300,
        crop: "fit",
        quality: "auto",
    });
};

/**
 * Extract metadata from PDF
 * @param {Buffer} buffer - PDF buffer
 * @returns {Promise<{pageCount: number, fileSize: number}>}
 */
export const extractPDFMetadata = async (buffer) => {
    try {
        const pdfDoc = await PDFDocument.load(buffer);
        return {
            pageCount: pdfDoc.getPageCount(),
            fileSize: buffer.length,
        };
    } catch (error) {
        throw new Error(`Failed to extract PDF metadata: ${error.message}`);
    }
};

/**
 * Process bulk PDF upload
 * Complete workflow: validate, split, upload
 * @param {Buffer} buffer - Original PDF buffer
 * @param {Object} config - Configuration
 * @param {number} config.totalCopies - Total copies
 * @param {number} config.distinctDesigns - Distinct designs
 * @param {number} config.pagesPerDesign - Pages per design
 * @param {string} config.bulkOrderId - Bulk order ID
 * @returns {Promise<Array>} - Array of split assets with URLs
 */
export const processBulkPDF = async (buffer, config) => {
    const { totalCopies, distinctDesigns, pagesPerDesign, bulkOrderId } = config;

    // Step 1: Validate PDF
    const expectedPages = distinctDesigns * pagesPerDesign;
    const validation = await validatePDF(buffer, expectedPages);

    if (!validation.valid) {
        throw new Error(validation.error);
    }

    // Step 2: Split PDF
    const splitResults = await splitPDF(buffer, pagesPerDesign, distinctDesigns);

    // Step 3: Calculate copies per design
    const baseCopies = Math.floor(totalCopies / distinctDesigns);
    const remainder = totalCopies % distinctDesigns;

    // Step 4: Upload each design and prepare results
    const uploadPromises = splitResults.map(async (split, index) => {
        // Upload to Cloudinary
        const uploadResult = await uploadDesignToCloudinary(
            split.buffer,
            split.designIndex,
            bulkOrderId
        );

        // Generate thumbnail
        const thumbnail = generateThumbnail(uploadResult.publicId);

        // Assign copies (distribute remainder to first N designs)
        const copiesAssigned = baseCopies + (index < remainder ? 1 : 0);

        return {
            designIndex: split.designIndex,
            url: uploadResult.url,
            publicId: uploadResult.publicId,
            thumbnail,
            pageRange: split.pageRange,
            copiesAssigned,
        };
    });

    const splitAssets = await Promise.all(uploadPromises);

    return splitAssets;
};

/**
 * Delete uploaded design files from Cloudinary
 * Used when bulk order is cancelled or failed
 * @param {Array<string>} publicIds - Array of Cloudinary public IDs
 * @returns {Promise<void>}
 */
export const deleteBulkAssets = async (publicIds) => {
    try {
        if (!publicIds || publicIds.length === 0) return;

        await cloudinary.api.delete_resources(publicIds, {
            resource_type: "image",
        });

        console.log(`Deleted ${publicIds.length} bulk order assets from Cloudinary`);
    } catch (error) {
        console.error("Error deleting bulk assets:", error.message);
        // Don't throw - cleanup failure shouldn't block the main operation
    }
};

export default {
    validatePDF,
    splitPDF,
    uploadDesignToCloudinary,
    generateThumbnail,
    extractPDFMetadata,
    processBulkPDF,
    deleteBulkAssets,
};
