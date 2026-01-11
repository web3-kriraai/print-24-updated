import express from 'express';
import * as geolocationController from '../controllers/geolocationController.js';

const router = express.Router();

/**
 * @route   POST /api/geolocation/from-ip
 * @desc    Get location (pincode, city, state) from IP address
 * @access  Public
 * @body    { ip?: string } - Optional, auto-detects if not provided
 */
router.post('/from-ip', geolocationController.getLocationFromIP);

/**
 * @route   POST /api/geolocation/from-gps
 * @desc    Get location (pincode, city, state) from GPS coordinates
 * @access  Public
 * @body    { lat: number, lng: number }
 */
router.post('/from-gps', geolocationController.getLocationFromGPS);

/**
 * @route   POST /api/geolocation/detect
 * @desc    Smart location detection - tries GPS → IP → manual
 * @access  Public
 * @body    { lat?: number, lng?: number, pincode?: string }
 */
router.post('/detect', geolocationController.getLocation);

/**
 * @route   POST /api/geolocation/clear-cache
 * @desc    Clear geolocation cache (admin only)
 * @access  Private
 */
router.post('/clear-cache', geolocationController.clearCache);

export default router;
