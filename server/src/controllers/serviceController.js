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
        const { activeOnly, showAllTitles } = req.query;
        const userSegmentId = req.user?.userSegment?.toString();

        let query = {};
        if (activeOnly === 'true') {
            query.isActive = true;
        }

        const services = await Service.find(query)
            .sort({ sortOrder: 1, createdAt: -1 })
            .lean();

        // Filter titles based on user segment
        const filteredServices = services.map(service => {
            if (showAllTitles === 'true') return service;

            const filteredTitles = service.titles.filter(title => {
                // Show if no segments assigned (public) or if user is in one of the segments
                return !title.assignedSegments || 
                       title.assignedSegments.length === 0 || 
                       (userSegmentId && title.assignedSegments.some(s => s.toString() === userSegmentId));
            });

            return { ...service, titles: filteredTitles };
        });

        res.status(200).json(filteredServices);
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
        const { showAllTitles } = req.query;
        const userSegmentId = req.user?.userSegment?.toString();
        
        const service = await Service.findById(id).lean();

        if (!service) {
            return res.status(404).json({ message: 'Service not found' });
        }

        // Filter titles based on user segment
        if (showAllTitles !== 'true') {
            service.titles = service.titles.filter(title => {
                return !title.assignedSegments || 
                       title.assignedSegments.length === 0 || 
                       (userSegmentId && title.assignedSegments.some(s => s.toString() === userSegmentId));
            });
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
        const {
            name,
            navbarName,
            description,
            color,
            sortOrder,
            bannerImage,
            icon,
            navbarIcon,
            serviceHeading,
            serviceDescription,
            bannerConfig,
            titles
        } = req.body;

        // Check if service with same name exists
        const existingService = await Service.findOne({ name });
        if (existingService) {
            return res.status(400).json({ message: 'Service with this name already exists' });
        }

        const service = new Service({
            name,
            navbarName: navbarName || '',
            description,
            color: color || '#93357c',
            sortOrder: sortOrder || 0,
            bannerImage: bannerImage || '',
            icon: icon || 'Printer',
            navbarIcon: navbarIcon || '',
            serviceHeading: serviceHeading || '',
            serviceDescription: serviceDescription || '',
            bannerConfig: bannerConfig || {},
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
    }
};

// Configure multer for multiple banner uploads
const uploadMultipleBanners = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit per file
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            return cb(null, true);
        }
        const allowedTypes = /jpeg|jpg|png|gif|webp|bmp|tiff/;
        const extname = file.originalname.match(/\.(jpeg|jpg|png|gif|webp|bmp|tiff)$/i);
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error(`Only image files are allowed! Got: ${file.mimetype}`));
        }
    }
}).array('banners', 10); // Accept up to 10 files at once

// Upload multiple banners
export const uploadMultipleServiceBanners = (req, res) => {
    uploadMultipleBanners(req, res, async (err) => {
        if (err) {
            console.error('Multer upload error:', err);
            return res.status(400).json({
                message: 'Error uploading images: ' + err.message,
                error: err.message
            });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'No files uploaded' });
        }

        try {
            const { id } = req.params;
            const service = await Service.findById(id);

            if (!service) {
                return res.status(404).json({ message: 'Service not found' });
            }

            // Upload all files to Cloudinary
            const uploadPromises = req.files.map((file, index) => {
                return new Promise((resolve, reject) => {
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
                                resolve({
                                    imageUrl: result.secure_url,
                                    sortOrder: (service.banners?.length || 0) + index,
                                    altText: file.originalname.replace(/\.[^/.]+$/, '')
                                });
                            }
                        }
                    );
                    stream.end(file.buffer);
                });
            });

            const uploadedBanners = await Promise.all(uploadPromises);

            // Add new banners to existing ones
            if (!service.banners) {
                service.banners = [];
            }
            service.banners.push(...uploadedBanners);

            await service.save();

            res.status(200).json({
                message: 'Banners uploaded successfully',
                banners: uploadedBanners,
                service
            });
        } catch (error) {
            console.error('Error uploading service banners:', error);
            res.status(500).json({
                message: 'Error uploading service banners',
                error: error.message
            });
        }
    });
};

// Delete individual banner
export const deleteServiceBanner = async (req, res) => {
    try {
        const { id, bannerId } = req.params;

        const service = await Service.findById(id);

        if (!service) {
            return res.status(404).json({ message: 'Service not found' });
        }

        const bannerIndex = service.banners.findIndex(
            b => b._id.toString() === bannerId
        );

        if (bannerIndex === -1) {
            return res.status(404).json({ message: 'Banner not found' });
        }

        const banner = service.banners[bannerIndex];

        // Delete from Cloudinary
        if (banner.imageUrl) {
            try {
                const urlParts = banner.imageUrl.split('/');
                const publicIdWithExt = urlParts.slice(-2).join('/');
                const publicId = publicIdWithExt.replace(/\.[^/.]+$/, '');
                await cloudinary.uploader.destroy(publicId);
            } catch (err) {
                console.warn('Failed to delete banner from Cloudinary:', err.message);
            }
        }

        // Remove banner from array
        service.banners.splice(bannerIndex, 1);
        await service.save();

        res.status(200).json({
            message: 'Banner deleted successfully',
            service
        });
    } catch (error) {
        console.error('Error deleting service banner:', error);
        res.status(500).json({
            message: 'Error deleting service banner',
            error: error.message
        });
    }
};

// Reorder banners
export const reorderServiceBanners = async (req, res) => {
    try {
        const { id } = req.params;
        const { bannerOrders } = req.body; // Array of { bannerId, sortOrder }

        if (!Array.isArray(bannerOrders)) {
            return res.status(400).json({ message: 'bannerOrders must be an array' });
        }

        const service = await Service.findById(id);

        if (!service) {
            return res.status(404).json({ message: 'Service not found' });
        }

        // Update sort order for each banner
        bannerOrders.forEach(({ bannerId, sortOrder }) => {
            const banner = service.banners.find(b => b._id.toString() === bannerId);
            if (banner) {
                banner.sortOrder = sortOrder;
            }
        });

        // Sort banners by sortOrder
        service.banners.sort((a, b) => a.sortOrder - b.sortOrder);

        await service.save();

        res.status(200).json({
            message: 'Banners reordered successfully',
            service
        });
    } catch (error) {
        console.error('Error reordering service banners:', error);
        res.status(500).json({
            message: 'Error reordering service banners',
            error: error.message
        });
    }
};

// Update auto-slide duration
export const updateAutoSlideDuration = async (req, res) => {
    try {
        const { id } = req.params;
        const { duration } = req.body;

        if (!duration || duration < 1000 || duration > 30000) {
            return res.status(400).json({
                message: 'Duration must be between 1000 and 30000 milliseconds'
            });
        }

        const service = await Service.findByIdAndUpdate(
            id,
            { autoSlideDuration: duration },
            { new: true, runValidators: true }
        );

        if (!service) {
            return res.status(404).json({ message: 'Service not found' });
        }

        res.status(200).json({
            message: 'Auto-slide duration updated successfully',
            service
        });
    } catch (error) {
        console.error('Error updating auto-slide duration:', error);
        res.status(500).json({
            message: 'Error updating auto-slide duration',
            error: error.message
        });
    }
};

