import cloudinary from "../config/cloudinary.js";

/**
 * Upload a base64 image to Cloudinary
 * @param {string} base64Data - Base64 encoded image data (with or without data URL prefix)
 * @param {string} folder - Cloudinary folder path (e.g., "orders/12345")
 * @param {string} filename - Original filename for reference
 * @param {object} options - Additional options like transformation
 * @returns {Promise<{url: string, publicId: string, filename: string}>}
 */
export const uploadImageToCloudinary = async (base64Data, folder, filename, options = {}) => {
    try {
        // Handle data URL format - remove prefix if present
        let imageData = base64Data;
        if (typeof base64Data === 'string' && base64Data.includes(',')) {
            imageData = base64Data.split(',')[1];
        }

        // Validate base64 data
        if (!imageData || imageData.trim().length === 0) {
            throw new Error("Empty image data provided");
        }

        // Create data URL for Cloudinary upload
        const dataUrl = `data:image/jpeg;base64,${imageData}`;

        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(dataUrl, {
            folder: folder,
            resource_type: "image",
            public_id: filename.replace(/\.[^/.]+$/, ""), // Remove extension for public_id
            overwrite: true,
            ...options,
        });

        return {
            url: result.secure_url,
            publicId: result.public_id,
            filename: filename,
        };
    } catch (error) {
        console.error("Error uploading image to Cloudinary:", error);
        throw new Error(`Failed to upload image to Cloudinary: ${error.message}`);
    }
};

/**
 * Upload a base64 PDF to Cloudinary
 * @param {string} base64Data - Base64 encoded PDF data
 * @param {string} folder - Cloudinary folder path (e.g., "orders/12345/pdf")
 * @param {string} filename - Original filename
 * @returns {Promise<{url: string, publicId: string, filename: string}>}
 */
export const uploadPdfToCloudinary = async (base64Data, folder, filename) => {
    try {
        // Validate base64 data
        if (!base64Data || base64Data.trim().length === 0) {
            throw new Error("Empty PDF data provided");
        }

        // Convert base64 to Buffer and use stream upload to avoid data URL size limits
        const buffer = Buffer.from(base64Data, 'base64');
        return await uploadPdfBufferToCloudinary(buffer, folder, filename);
    } catch (error) {
        console.error("Error uploading PDF to Cloudinary:", error);
        throw new Error(`Failed to upload PDF to Cloudinary: ${error.message}`);
    }
};

/**
 * Upload a PDF Buffer directly to Cloudinary via upload_stream (no base64 overhead)
 * This bypasses the 10MB base64 data URL limit on the free plan.
 * @param {Buffer} buffer - PDF buffer
 * @param {string} folder - Cloudinary folder path
 * @param {string} filename - Original filename
 * @returns {Promise<{url: string, publicId: string, filename: string}>}
 */
export const uploadPdfBufferToCloudinary = async (buffer, folder, filename) => {
    return new Promise((resolve, reject) => {
        const publicId = filename.replace(/\.[^/.]+$/, "");
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: "raw",
                public_id: publicId,
                overwrite: true,
                format: "pdf",
            },
            (error, result) => {
                if (error) {
                    console.error("Error uploading PDF buffer to Cloudinary:", error);
                    reject(new Error(`Failed to upload PDF to Cloudinary: ${error.message}`));
                } else {
                    resolve({
                        url: result.secure_url,
                        publicId: result.public_id,
                        filename,
                    });
                }
            }
        );
        // Write buffer to stream
        uploadStream.end(buffer);
    });
};


/**
 * Upload a buffer (already processed image) to Cloudinary
 * @param {Buffer} buffer - Image buffer data
 * @param {string} folder - Cloudinary folder path
 * @param {string} filename - Original filename
 * @param {string} contentType - MIME type (e.g., "image/jpeg")
 * @returns {Promise<{url: string, publicId: string, filename: string}>}
 */
export const uploadBufferToCloudinary = async (buffer, folder, filename, contentType = "image/jpeg") => {
    try {
        if (!buffer || buffer.length === 0) {
            throw new Error("Empty buffer provided");
        }

        // Convert buffer to base64
        const base64Data = buffer.toString("base64");
        const mimeType = contentType || "image/jpeg";
        const dataUrl = `data:${mimeType};base64,${base64Data}`;

        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(dataUrl, {
            folder: folder,
            resource_type: "image",
            public_id: filename.replace(/\.[^/.]+$/, ""),
            overwrite: true,
        });

        return {
            url: result.secure_url,
            publicId: result.public_id,
            filename: filename,
        };
    } catch (error) {
        console.error("Error uploading buffer to Cloudinary:", error);
        throw new Error(`Failed to upload buffer to Cloudinary: ${error.message}`);
    }
};

/**
 * Delete a file from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @param {string} resourceType - Resource type ('image' or 'raw')
 * @returns {Promise<boolean>}
 */
export const deleteFromCloudinary = async (publicId, resourceType = "image") => {
    try {
        const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: resourceType,
        });
        return result.result === "ok";
    } catch (error) {
        console.error("Error deleting from Cloudinary:", error);
        return false;
    }
};

// Maximum file sizes (in bytes)
export const MAX_PDF_SIZE_MB = 50; // 50 MB
export const MAX_PDF_SIZE_BYTES = MAX_PDF_SIZE_MB * 1024 * 1024;
export const MAX_IMAGE_SIZE_MB = 10; // 10 MB
export const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;
