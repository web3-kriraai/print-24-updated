import multer from 'multer';
import cloudinary from '../config/cloudinary.js';
import SiteSettings from '../models/siteSettingsModal.js';

// Configure multer for memory storage (Cloudinary upload)
const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        // Accept images and SVG
        const allowedTypes = /jpeg|jpg|png|gif|webp|svg\+xml|svg/;
        const mimetype = allowedTypes.test(file.mimetype);
        const extname = file.originalname.match(/\.(jpeg|jpg|png|gif|webp|svg)$/i);
        
        if (mimetype || extname) {
            return cb(null, true);
        } else {
            console.error('Logo Upload Blocked:', {
                name: file.originalname,
                type: file.mimetype
            });
            cb(new Error(`Only image files (PNG, JPG, SVG, etc.) are allowed! Got: ${file.mimetype}`));
        }
    }
}).single('logo');

// Get site settings (public)
export const getSiteSettings = async (req, res) => {
    try {
        const settings = await SiteSettings.getSettings();
        res.status(200).json(settings);
    } catch (error) {
        console.error('Error fetching site settings:', error);
        res.status(500).json({
            message: 'Error fetching site settings',
            error: error.message
        });
    }
};

// Update site settings (admin only)
export const updateSiteSettings = async (req, res) => {
    try {
        const { siteName, tagline, logo } = req.body;
        
        let settings = await SiteSettings.findOne();
        if (!settings) {
            settings = new SiteSettings({});
        }
        
        if (siteName !== undefined) settings.siteName = siteName;
        if (tagline !== undefined) settings.tagline = tagline;
        if (logo !== undefined) settings.logo = logo;
        
        await settings.save();
        
        res.status(200).json({
            message: 'Site settings updated successfully',
            settings
        });
    } catch (error) {
        console.error('Error updating site settings:', error);
        res.status(500).json({
            message: 'Error updating site settings',
            error: error.message
        });
    }
};

// Upload logo (admin only)
export const uploadLogo = (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            console.error('Multer upload error:', err);
            return res.status(400).json({
                message: 'Error uploading logo: ' + err.message,
                error: err.message
            });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        try {
            let settings = await SiteSettings.findOne();
            if (!settings) {
                settings = new SiteSettings({});
            }

            // Check if it's an SVG file
            const isSvg = req.file.mimetype.includes('svg') || 
                         req.file.originalname.toLowerCase().endsWith('.svg');

            // Upload to Cloudinary
            const uploadPromise = new Promise((resolve, reject) => {
                const uploadOptions = {
                    folder: 'site-logos',
                    resource_type: 'image',
                    public_id: `logo_${Date.now()}`
                };

                // For SVG files, keep them as SVG format
                if (isSvg) {
                    uploadOptions.format = 'svg';
                } else {
                    // Add transformation for non-SVG images
                    uploadOptions.transformation = [
                        { width: 400, height: 100, crop: 'fit' }
                    ];
                }

                const stream = cloudinary.uploader.upload_stream(
                    uploadOptions,
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

            // Delete old logo from Cloudinary if it's a Cloudinary URL
            if (settings.logo && settings.logo.includes('cloudinary')) {
                try {
                    const urlParts = settings.logo.split('/');
                    const publicIdWithExt = urlParts.slice(-2).join('/');
                    const publicId = publicIdWithExt.replace(/\.[^/.]+$/, '');
                    await cloudinary.uploader.destroy(publicId);
                } catch (err) {
                    console.warn('Failed to delete old logo from Cloudinary:', err.message);
                }
            }

            settings.logo = result.secure_url;
            await settings.save();

            res.status(200).json({
                message: 'Logo uploaded successfully',
                logo: result.secure_url,
                settings
            });
        } catch (error) {
            console.error('Error uploading logo:', error);
            res.status(500).json({
                message: 'Error uploading logo',
                error: error.message
            });
        }
    });
};
