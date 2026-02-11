import Feature from '../models/featureModal.js';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import { Readable } from 'stream';

// Configure multer for memory storage
const storage = multer.memoryStorage();
export const upload = multer({ storage });

// Get all features
export const getAllFeatures = async (req, res) => {
    try {
        const features = await Feature.find().sort({ displayOrder: 1 });
        res.json(features);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching features', error: error.message });
    }
};

// Get single feature
export const getFeatureById = async (req, res) => {
    try {
        const feature = await Feature.findById(req.params.id);
        if (!feature) {
            return res.status(404).json({ message: 'Feature not found' });
        }
        res.json(feature);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching feature', error: error.message });
    }
};

// Create feature with optional image upload
export const createFeature = async (req, res) => {
    try {
        const { icon, title, description, color, displayOrder, isVisible, iconShape, iconBackgroundColor } = req.body;

        let iconImage = '';

        // Handle image upload if provided
        if (req.file) {
            const uploadStream = cloudinary.uploader.upload_stream(
                { folder: 'feature-icons' },
                (error, result) => {
                    if (error) {
                        console.error('Cloudinary upload error:', error);
                        return res.status(500).json({ message: 'Error uploading image' });
                    }

                    iconImage = result.secure_url;

                    // Create feature after image upload
                    const feature = new Feature({
                        icon,
                        iconImage,
                        iconShape,
                        iconBackgroundColor,
                        title,
                        description,
                        color,
                        displayOrder,
                        isVisible: isVisible === 'true' || isVisible === true,
                    });

                    feature.save()
                        .then(savedFeature => res.status(201).json(savedFeature))
                        .catch(err => res.status(500).json({ message: 'Error creating feature', error: err.message }));
                }
            );

            const bufferStream = Readable.from(req.file.buffer);
            bufferStream.pipe(uploadStream);
        } else {
            // No image, create feature directly
            const feature = new Feature({
                icon,
                iconImage: '',
                iconShape,
                iconBackgroundColor,
                title,
                description,
                color,
                displayOrder,
                isVisible: isVisible === 'true' || isVisible === true,
            });

            const savedFeature = await feature.save();
            res.status(201).json(savedFeature);
        }
    } catch (error) {
        res.status(500).json({ message: 'Error creating feature', error: error.message });
    }
};

// Update feature with optional image upload
export const updateFeature = async (req, res) => {
    try {
        console.log('Update Feature Request Body:', req.body);
        console.log('Update Feature Request File:', req.file);
        const { icon, title, description, color, displayOrder, isVisible, iconShape, iconBackgroundColor } = req.body;

        const updateData = {
            icon,
            title,
            description,
            color,
            displayOrder,
            isVisible: isVisible === 'true' || isVisible === true,
        };

        if (iconShape !== undefined) updateData.iconShape = iconShape;
        if (iconBackgroundColor !== undefined) updateData.iconBackgroundColor = iconBackgroundColor;

        // Check if iconImage is explicitly sent as empty string (to clear it)
        if (req.body.iconImage === '') {
            updateData.iconImage = '';
        }

        // Handle image upload if provided
        if (req.file) {
            const uploadStream = cloudinary.uploader.upload_stream(
                { folder: 'feature-icons' },
                async (error, result) => {
                    if (error) {
                        console.error('Cloudinary upload error:', error);
                        return res.status(500).json({ message: 'Error uploading image' });
                    }

                    updateData.iconImage = result.secure_url;

                    const feature = await Feature.findByIdAndUpdate(
                        req.params.id,
                        updateData,
                        { new: true, runValidators: true }
                    );

                    if (!feature) {
                        return res.status(404).json({ message: 'Feature not found' });
                    }

                    res.json(feature);
                }
            );

            const bufferStream = Readable.from(req.file.buffer);
            bufferStream.pipe(uploadStream);
        } else {
            // No new image, update other fields
            console.log('Update Data Payload:', updateData);
            const feature = await Feature.findByIdAndUpdate(
                req.params.id,
                updateData,
                { new: true, runValidators: true }
            );

            console.log('Updated Feature from DB:', feature);

            if (!feature) {
                return res.status(404).json({ message: 'Feature not found' });
            }

            res.json(feature);
        }
    } catch (error) {
        res.status(500).json({ message: 'Error updating feature', error: error.message });
    }
};

// Delete feature
export const deleteFeature = async (req, res) => {
    try {
        const feature = await Feature.findByIdAndDelete(req.params.id);

        if (!feature) {
            return res.status(404).json({ message: 'Feature not found' });
        }

        res.json({ message: 'Feature deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting feature', error: error.message });
    }
};

// Reorder features
export const reorderFeatures = async (req, res) => {
    try {
        const { features } = req.body; // Array of { id, displayOrder }

        const updatePromises = features.map((item) =>
            Feature.findByIdAndUpdate(item.id, { displayOrder: item.displayOrder })
        );

        await Promise.all(updatePromises);

        const updatedFeatures = await Feature.find().sort({ displayOrder: 1 });
        res.json(updatedFeatures);
    } catch (error) {
        res.status(500).json({ message: 'Error reordering features', error: error.message });
    }
};
