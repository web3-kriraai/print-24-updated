import multer from 'multer';
import cloudinary from '../config/cloudinary.js';
import Service from '../models/serviceModal.js';
import Product from '../models/productModal.js';
import Category from '../models/categoryModal.js';
import Subcategory from '../models/subcategoryModal.js';

// Configure multer for memory storage (Cloudinary upload)
const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        // Accept any file with an image mimetype
        if (file.mimetype.startsWith('image/')) {
            return cb(null, true);
        }

        // Fallback: check extension
        const allowedTypes = /jpeg|jpg|png|gif|webp|bmp|tiff/;
        const extname = file.originalname.match(/\.(jpeg|jpg|png|gif|webp|bmp|tiff)$/i);
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            console.error('File Upload Blocked:', {
                name: file.originalname,
                type: file.mimetype
            });
            cb(new Error(`Only image files are allowed! Got: ${file.mimetype}`));
        }
    }
}).single('bannerImage');

// Get all services
export const getAllServices = async (req, res) => {
    try {
        const { activeOnly } = req.query;

        let query = {};
        if (activeOnly === 'true') {
            query.isActive = true;
        }

        const services = await Service.find(query)
            .sort({ sortOrder: 1, createdAt: -1 })
            .lean();

        res.status(200).json(services);
    } catch (error) {
        console.error('Error fetching services:', error);
        res.status(500).json({
            message: 'Error fetching services',
            error: error.message
        });
    }
};

// Get service by ID with populated references
export const getServiceById = async (req, res) => {
    try {
        const { id } = req.params;
        const service = await Service.findById(id).lean();

        if (!service) {
            return res.status(404).json({ message: 'Service not found' });
        }

        // Populate items based on their type
        for (let title of service.titles) {
            for (let item of title.items) {
                let populatedData = null;

                try {
                    if (item.type === 'product') {
                        populatedData = await Product.findById(item.id).select('name image description category subcategory').lean();
                    } else if (item.type === 'category') {
                        populatedData = await Category.findById(item.id).select('name image description').lean();
                    } else if (item.type === 'subcategory') {
                        populatedData = await Subcategory.findById(item.id).select('name image description category parent').lean();
                    }

                    item.data = populatedData;
                } catch (err) {
                    console.warn(`Failed to populate ${item.type} with id ${item.id}:`, err.message);
                    item.data = null;
                }
            }
        }

        res.status(200).json(service);
    } catch (error) {
        console.error('Error fetching service:', error);
        res.status(500).json({
            message: 'Error fetching service',
            error: error.message
        });
    }
};

// Create new service
export const createService = async (req, res) => {
    try {
        const { name, description, color, sortOrder, bannerImage, titles } = req.body;

        // Check if service with same name exists
        const existingService = await Service.findOne({ name });
        if (existingService) {
            return res.status(400).json({ message: 'Service with this name already exists' });
        }

        const service = new Service({
            name,
            description,
            color: color || '#93357c',
            sortOrder: sortOrder || 0,
            bannerImage: bannerImage || '',
            titles: titles || []
        });

        await service.save();

        res.status(201).json({
            message: 'Service created successfully',
            service
        });
    } catch (error) {
        console.error('Error creating service:', error);
        res.status(500).json({
            message: 'Error creating service',
            error: error.message
        });
    }
};

// Update service
export const updateService = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // Don't allow updating _id or timestamps
        delete updateData._id;
        delete updateData.createdAt;
        delete updateData.updatedAt;

        const service = await Service.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!service) {
            return res.status(404).json({ message: 'Service not found' });
        }

        res.status(200).json({
            message: 'Service updated successfully',
            service
        });
    } catch (error) {
        console.error('Error updating service:', error);
        res.status(500).json({
            message: 'Error updating service',
            error: error.message
        });
    }
};

// Delete service
export const deleteService = async (req, res) => {
    try {
        const { id } = req.params;

        const service = await Service.findByIdAndDelete(id);

        if (!service) {
            return res.status(404).json({ message: 'Service not found' });
        }

        // Delete banner image from Cloudinary if exists
        if (service.bannerImage) {
            try {
                // Extract public_id from the URL
                const urlParts = service.bannerImage.split('/');
                const publicIdWithExt = urlParts.slice(-2).join('/'); // folder/filename.ext
                const publicId = publicIdWithExt.replace(/\.[^/.]+$/, ''); // Remove extension

                await cloudinary.uploader.destroy(publicId);
            } catch (err) {
                console.warn('Failed to delete banner image from Cloudinary:', err.message);
            }
        }

        res.status(200).json({
            message: 'Service deleted successfully',
            service
        });
    } catch (error) {
        console.error('Error deleting service:', error);
        res.status(500).json({
            message: 'Error deleting service',
            error: error.message
        });
    }
};

// Bulk update sort orders
export const updateServiceOrder = async (req, res) => {
    try {
        const { orders } = req.body; // Array of { id, sortOrder }

        if (!Array.isArray(orders)) {
            return res.status(400).json({ message: 'Orders must be an array' });
        }

        const updatePromises = orders.map(({ id, sortOrder }) =>
            Service.findByIdAndUpdate(id, { sortOrder }, { new: true })
        );

        await Promise.all(updatePromises);

        const services = await Service.find().sort({ sortOrder: 1 });

        res.status(200).json({
            message: 'Service order updated successfully',
            services
        });
    } catch (error) {
        console.error('Error updating service order:', error);
        res.status(500).json({
            message: 'Error updating service order',
            error: error.message
        });
    }
};

// Upload banner image
export const uploadBannerImage = (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            console.error('Multer upload error:', err);
            return res.status(400).json({
                message: 'Error uploading image: ' + err.message,
                error: err.message
            });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        try {
            const { id } = req.params;

            const service = await Service.findById(id);

            if (!service) {
                return res.status(404).json({ message: 'Service not found' });
            }

            // Upload to Cloudinary using stream
            const uploadPromise = new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    {
                        folder: 'service-banners',
                        resource_type: 'image',
                        transformation: [
                            { width: 1200, height: 350, crop: 'fill' }
                        ]
                    },
                    (error, result) => {
                        if (error) {
                            console.error('Cloudinary upload error:', error);
                            reject(error);
                        } else {
                            resolve(result);
                        }
                    }
                );

                stream.end(req.file.buffer);
            });

            const result = await uploadPromise;

            // Delete old banner image from Cloudinary if exists
            if (service.bannerImage) {
                try {
                    // Extract public_id from the URL
                    const urlParts = service.bannerImage.split('/');
                    const publicIdWithExt = urlParts.slice(-2).join('/'); // folder/filename.ext
                    const publicId = publicIdWithExt.replace(/\.[^/.]+$/, ''); // Remove extension

                    await cloudinary.uploader.destroy(publicId);
                } catch (err) {
                    console.warn('Failed to delete old banner image from Cloudinary:', err.message);
                }
            }

            service.bannerImage = result.secure_url;
            await service.save();

            res.status(200).json({
                message: 'Banner image uploaded successfully',
                bannerImage: result.secure_url,
                service
            });
        } catch (error) {
            console.error('Error updating service with banner:', error);
            res.status(500).json({
                message: 'Error updating service with banner',
                error: error.message
            });
        }
    });
};

// Toggle service active status
export const toggleServiceStatus = async (req, res) => {
    try {
        const { id } = req.params;

        const service = await Service.findById(id);

        if (!service) {
            return res.status(404).json({ message: 'Service not found' });
        }

        service.isActive = !service.isActive;
        await service.save();

        res.status(200).json({
            message: `Service ${service.isActive ? 'activated' : 'deactivated'} successfully`,
            service
        });
    } catch (error) {
        console.error('Error toggling service status:', error);
        res.status(500).json({
            message: 'Error toggling service status',
            error: error.message
        });
    }
};
