import DeliverySettings from '../models/deliverySettingsModal.js';
import Product from '../models/productModal.js';
import Sequence from '../models/sequenceModal.js';

/**
 * EDD Calculator Utility
 * 
 * Formula: EDD = Tcurrent + max(Tproduction) + Tlogistics + Tbuffer
 * 
 * @param {Object} params - Calculation parameters
 * @param {Array} params.products - Array of product objects with productionDays
 * @param {String} params.pincode - Delivery pincode
 * @param {Number} params.courierDays - Optional: Days from courier API
 * @returns {Object} - { edd: Date, breakdown: {...} }
 */
export async function calculateEDD(params) {
    const { products, pincode, courierDays = null } = params;

    try {
        // Get delivery settings
        const settings = await DeliverySettings.getSettings();

        // Tcurrent - Current date/time
        const tcurrent = new Date();

        // max(Tproduction) - Longest production time among products
        let maxProductionDays = 0;

        for (const product of products) {
            let productionDays = 0;

            // Try to get from product.productionDays field
            if (product.productionDays && typeof product.productionDays === 'number') {
                productionDays = product.productionDays;
            }
            // Otherwise, calculate from assigned sequence
            else if (product.assignedSequence || product.productionSequence) {
                const sequenceId = product.assignedSequence || product.productionSequence;

                // Fetch sequence with departments
                const sequence = await Sequence.findById(sequenceId)
                    .populate('departments.department');

                if (sequence && sequence.departments) {
                    // Sum up estimated time for all departments
                    productionDays = sequence.departments.reduce((sum, dept) => {
                        return sum + (dept.estimatedDays || 1); // Default 1 day if not specified
                    }, 0);
                }
            }

            // Use default if still 0
            if (productionDays === 0) {
                productionDays = 2; // Default fallback
            }

            maxProductionDays = Math.max(maxProductionDays, productionDays);
        }

        // Tlogistics - Shipping/delivery time
        let logisticsDays = 0;

        if (courierDays !== null && typeof courierDays === 'number') {
            // Use courier API provided days (external)
            logisticsDays = courierDays;
        } else if (settings.courierPreference === 'internal' || settings.courierPreference === 'hybrid') {
            // Use geo-zone mapping
            const zoneMatch = settings.geoZoneMappings.find(zone => {
                if (!zone.isActive) return false;
                return zone.pincodes.some(pc => {
                    // Support exact match or range patterns
                    if (pc === pincode) return true;
                    // Support wildcard patterns like "110*" for 110000-110099
                    if (pc.includes('*')) {
                        const pattern = pc.replace(/\*/g, '.*');
                        return new RegExp(`^${pattern}$`).test(pincode);
                    }
                    return false;
                });
            });

            logisticsDays = zoneMatch ? zoneMatch.deliveryDays : settings.defaultLogisticsDays;
        } else {
            // External but no courier days provided - use default
            logisticsDays = settings.defaultLogisticsDays;
        }

        // Tbuffer - Safety margin
        const bufferDays = settings.bufferDays || 0;

        // Calculate total days
        const totalDays = maxProductionDays + logisticsDays + bufferDays;

        // Calculate EDD date, skipping weekends and holidays if configured
        let eddDate = new Date(tcurrent);
        let daysAdded = 0;

        while (daysAdded < totalDays) {
            eddDate.setDate(eddDate.getDate() + 1);

            // Skip weekends if configured
            if (settings.skipWeekends) {
                const dayOfWeek = eddDate.getDay();
                if (dayOfWeek === 0 || dayOfWeek === 6) {
                    // Sunday (0) or Saturday (6) - skip
                    continue;
                }
            }

            // Skip holidays
            const isHoliday = settings.holidays.some(holiday => {
                const holidayDate = new Date(holiday.date);
                if (holiday.recurring) {
                    // Check month and day only
                    return holidayDate.getMonth() === eddDate.getMonth() &&
                        holidayDate.getDate() === eddDate.getDate();
                } else {
                    // Check exact date
                    return holidayDate.toDateString() === eddDate.toDateString();
                }
            });

            if (isHoliday) {
                continue;
            }

            // Valid working day
            daysAdded++;
        }

        return {
            edd: eddDate,
            breakdown: {
                tcurrent,
                maxProductionDays,
                logisticsDays,
                bufferDays,
                totalDays,
                skipWeekends: settings.skipWeekends,
                holidaysSkipped: totalDays - daysAdded, // Days skipped due to weekends/holidays
            },
        };
    } catch (error) {
        console.error('❌ EDD calculation error:', error);
        // Fallback to simple calculation
        const fallbackDays = 7; // Default 7 days
        const eddDate = new Date();
        eddDate.setDate(eddDate.getDate() + fallbackDays);

        return {
            edd: eddDate,
            breakdown: {
                tcurrent: new Date(),
                maxProductionDays: 3,
                logisticsDays: 3,
                bufferDays: 1,
                totalDays: fallbackDays,
                error: error.message,
            },
        };
    }
}

/**
 * Get estimated logistics days from Shiprocket API
 * @param {String} pincode - Delivery pincode
 * @returns {Number} - Estimated delivery days
 */
export async function getLogisticsDaysFromCourier(pincode) {
    try {
        // This would integrate with Shiprocket serviceability API
        // For now, return default
        // TODO: Implement actual Shiprocket API call
        return 3; // Default
    } catch (error) {
        console.error('Error fetching courier logistics days:', error);
        return 3; // Fallback
    }
}

export default {
    calculateEDD,
    getLogisticsDaysFromCourier,
};
