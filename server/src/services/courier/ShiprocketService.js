/**
 * Shiprocket Service
 * 
 * Handles all Shiprocket API interactions:
 * - Authentication (JWT token generation with caching)
 * - Order/Shipment creation
 * - Pincode serviceability check
 * - Tracking
 * - Order cancellation
 * 
 * @module services/courier/ShiprocketService
 */

import axios from 'axios';

class ShiprocketService {
    constructor() {
        this.baseUrl = 'https://apiv2.shiprocket.in/v1/external';
        this.token = null;
        this.tokenExpiry = null;
        this.tokenValidDays = 10; // Shiprocket tokens are valid for 10 days
        this.email = null; // Override email from DB
        this.password = null; // Override password from DB
        this.useMockAWB = process.env.USE_MOCK_AWB === 'true'; // Enable mock AWB for non-KYC testing
    }

    /**
     * Set credentials from database (overrides env vars)
     * @param {string} email - Shiprocket email
     * @param {string} password - Shiprocket password/API key
     */
    setCredentials(email, password) {
        this.email = email;
        this.password = password;
        // Clear cached token when credentials change
        this.token = null;
        this.tokenExpiry = null;
    }

    /**
     * Generate or return cached authentication token
     * @returns {Promise<string>} JWT token
     */
    async authenticate() {
        // Use override credentials if set, otherwise fall back to env vars
        const email = this.email || (process.env.SHIPROCKET_EMAIL || '').replace(/['"]/g, '').trim();
        const password = this.password || (process.env.SHIPROCKET_API || '').replace(/['"]/g, '').trim();

        // Check if we have a valid cached token
        if (this.token && this.tokenExpiry && new Date() < this.tokenExpiry) {
            return this.token;
        }

        try {
            console.log('[Shiprocket] Generating new authentication token...');

            const response = await axios.post(`${this.baseUrl}/auth/login`, {
                email: email,
                password: password
            });

            if (response.data && response.data.token) {
                this.token = response.data.token;
                // Set expiry to 9 days from now (safety margin)
                this.tokenExpiry = new Date(Date.now() + (this.tokenValidDays - 1) * 24 * 60 * 60 * 1000);
                console.log('[Shiprocket] Token generated successfully, expires:', this.tokenExpiry);
                return this.token;
            }

            throw new Error('No token received from Shiprocket');
        } catch (error) {
            console.error('[Shiprocket] Authentication failed:', error.response?.data || error.message);
            throw new Error(`Shiprocket authentication failed: ${error.response?.data?.message || error.message}`);
        }
    }

    /**
     * Get axios instance with auth headers
     * @returns {Promise<import('axios').AxiosInstance>}
     */
    async getClient() {
        const token = await this.authenticate();
        return axios.create({
            baseURL: this.baseUrl,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
    }

    /**
     * Check if a pincode is serviceable
     * @param {string} pickupPincode - Origin pincode
     * @param {string} deliveryPincode - Destination pincode
     * @param {number} weight - Package weight in kg (default 0.5)
     * @param {string} paymentMode - COD or PREPAID (default PREPAID)
     * @returns {Promise<Object>} Serviceability info with courier options
     */
    async checkServiceability(pickupPincode, deliveryPincode, weight = 0.5, paymentMode = 'PREPAID') {
        try {
            const client = await this.getClient();

            const response = await client.get('/courier/serviceability/', {
                params: {
                    pickup_postcode: pickupPincode,
                    delivery_postcode: deliveryPincode,
                    weight: weight,
                    cod: paymentMode === 'COD' ? 1 : 0
                }
            });

            const data = response.data;

            if (data.status === 200 && data.data?.available_courier_companies?.length > 0) {
                const couriers = data.data.available_courier_companies;
                // Sort by estimated delivery days, then by rate
                couriers.sort((a, b) => {
                    if (a.estimated_delivery_days !== b.estimated_delivery_days) {
                        return a.estimated_delivery_days - b.estimated_delivery_days;
                    }
                    return a.rate - b.rate;
                });

                return {
                    available: true,
                    couriers: couriers.map(c => ({
                        courierId: c.courier_company_id,
                        courierName: c.courier_name,
                        estimatedDays: c.estimated_delivery_days,
                        rate: c.rate,
                        codCharges: c.cod_charges,
                        freightCharge: c.freight_charge,
                        etd: c.etd // Estimated time of delivery
                    })),
                    recommendedCourier: {
                        courierId: couriers[0].courier_company_id,
                        courierName: couriers[0].courier_name,
                        estimatedDays: couriers[0].estimated_delivery_days,
                        rate: couriers[0].rate
                    }
                };
            }

            return {
                available: false,
                couriers: [],
                message: 'No courier available for this route'
            };
        } catch (error) {
            console.error('[Shiprocket] Serviceability check failed:', error.response?.data || error.message);
            throw new Error(`Serviceability check failed: ${error.response?.data?.message || error.message}`);
        }
    }

    /**
     * Create an order on Shiprocket
     * @param {Object} orderData - Order details
     * @returns {Promise<Object>} Created order info with order_id and shipment_id
     */
    async createOrder(orderData) {
        try {
            const client = await this.getClient();

            // Format order data for Shiprocket API
            const shiprocketOrder = {
                order_id: orderData.orderNumber,
                order_date: new Date(orderData.createdAt).toISOString().split('T')[0],
                pickup_location: orderData.pickupLocation || 'Primary',
                channel_id: '', // Uses default channel
                comment: orderData.notes || '',
                billing_customer_name: orderData.customerName,
                billing_last_name: orderData.customerLastName || '',
                billing_address: orderData.billingAddress || orderData.address,
                billing_address_2: orderData.billingAddress2 || '',
                billing_city: orderData.city,
                billing_pincode: orderData.billingPincode || orderData.pincode,
                billing_state: orderData.state,
                billing_country: orderData.country || 'India',
                billing_email: orderData.email,
                billing_phone: orderData.mobileNumber,
                shipping_is_billing: orderData.shippingIsBilling !== false,
                shipping_customer_name: orderData.shippingCustomerName || orderData.customerName,
                shipping_last_name: orderData.shippingLastName || orderData.customerLastName || '',
                shipping_address: orderData.shippingAddress || orderData.address,
                shipping_address_2: orderData.shippingAddress2 || '',
                shipping_city: orderData.shippingCity || orderData.city,
                shipping_pincode: orderData.pincode,
                shipping_country: orderData.shippingCountry || 'India',
                shipping_state: orderData.shippingState || orderData.state,
                shipping_email: orderData.shippingEmail || orderData.email,
                shipping_phone: orderData.shippingPhone || orderData.mobileNumber,
                order_items: orderData.items || [{
                    name: orderData.productName || 'Print Order',
                    sku: orderData.productSku || orderData.orderNumber,
                    units: orderData.quantity || 1,
                    selling_price: orderData.itemPrice || orderData.totalPrice,
                    discount: 0,
                    tax: 0,
                    hsn: orderData.hsn || '4911' // HSN for printed materials
                }],
                payment_method: orderData.paymentMethod === 'COD' ? 'COD' : 'Prepaid',
                shipping_charges: orderData.shippingCharges || 0,
                giftwrap_charges: 0,
                transaction_charges: 0,
                total_discount: orderData.discount || 0,
                sub_total: orderData.totalPrice,
                length: orderData.length || 20, // cm
                breadth: orderData.breadth || 15, // cm
                height: orderData.height || 5, // cm
                weight: orderData.weight || 0.5 // kg
            };

            // If not shipping_is_billing, add shipping details
            if (!shiprocketOrder.shipping_is_billing) {
                shiprocketOrder.shipping_customer_name = orderData.shippingCustomerName;
                shiprocketOrder.shipping_address = orderData.shippingAddress;
                shiprocketOrder.shipping_city = orderData.shippingCity;
                shiprocketOrder.shipping_state = orderData.shippingState;
            }

            console.log('[Shiprocket] Creating order:', orderData.orderNumber);
            console.log('[Shiprocket] Payload:', JSON.stringify({
                order_id: shiprocketOrder.order_id,
                billing_city: shiprocketOrder.billing_city,
                billing_state: shiprocketOrder.billing_state,
                billing_pincode: shiprocketOrder.billing_pincode,
                billing_phone: shiprocketOrder.billing_phone,
                billing_email: shiprocketOrder.billing_email,
                pickup_location: shiprocketOrder.pickup_location,
                weight: shiprocketOrder.weight,
                sub_total: shiprocketOrder.sub_total
            }, null, 2));

            const response = await client.post('/orders/create/adhoc', shiprocketOrder);

            if (response.data && response.data.order_id) {
                console.log('[Shiprocket] Order created successfully:', response.data.order_id);
                return {
                    success: true,
                    shiprocketOrderId: response.data.order_id,
                    shiprocketShipmentId: response.data.shipment_id,
                    channelOrderId: response.data.channel_order_id,
                    message: 'Order created successfully'
                };
            }

            const apiMessage = response.data?.message || 'no order_id in response';
            console.warn('[Shiprocket] ⚠️  Order creation response missing order_id:', JSON.stringify(response.data, null, 2));
            const logicError = new Error(`Order creation failed - ${apiMessage}`);
            logicError.response = response; // Attach response for fallback detection
            throw logicError;
        } catch (error) {
            console.error('[Shiprocket] Order creation failed:', error.response?.data || error.message);
            // Preserve original error response for upstream inspection
            const wrappedError = new Error(`Order creation failed: ${error.response?.data?.message || error.message}`);
            wrappedError.response = error.response;
            throw wrappedError;
        }
    }

    /**
     * Generate mock AWB code (for testing without KYC)
     * Uses REAL courier data from Shiprocket API while only mocking the AWB code
     * @param {string} shipmentId - Shiprocket shipment ID
     * @param {number} courierId - Courier company ID from Shiprocket API
     * @param {string} courierName - Courier name from Shiprocket API
     * @returns {Object} Mock AWB info with real courier data
     */
    generateMockAWB(shipmentId, courierId = null, courierName = null) {
        // Generate realistic AWB code format (similar to actual courier AWBs)
        const timestamp = Date.now().toString().slice(-8);
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        const awbCode = `MOCK${timestamp}${random}`;

        console.log(`[Shiprocket] 🧪 MOCK AWB Generated: ${awbCode} (KYC not required)`);
        console.log(`[Shiprocket] 🚛 Using REAL courier from API: ${courierName || 'Auto'} (ID: ${courierId || 'Auto'})`);

        return {
            success: true,
            awbCode: awbCode,
            courierId: courierId || null,
            courierName: courierName || null,
            assignedDate: new Date().toISOString(),
            isMock: true
        };
    }

    /**
     * Generate AWB (Air Way Bill) for a shipment
     * @param {string} shipmentId - Shiprocket shipment ID
     * @param {number} courierId - Courier company ID (optional, auto-assigns if not provided)
     * @param {string} courierName - Courier name from Shiprocket serviceability API
     * @returns {Promise<Object>} AWB info
     */
    async generateAWB(shipmentId, courierId = null, courierName = null) {
        // If mock mode is enabled, use mock AWB with real courier data from API
        if (this.useMockAWB) {
            console.log('[Shiprocket] Mock AWB mode enabled, generating mock AWB with real courier data...');
            return this.generateMockAWB(shipmentId, courierId, courierName);
        }

        try {
            const client = await this.getClient();

            const payload = {
                shipment_id: shipmentId
            };

            if (courierId) {
                payload.courier_id = courierId;
            }

            console.log('[Shiprocket] Generating AWB for shipment:', shipmentId);

            const response = await client.post('/courier/assign/awb', payload);

            if (response.data && response.data.response?.data?.awb_code) {
                const awbData = response.data.response.data;
                console.log('[Shiprocket] AWB generated:', awbData.awb_code);
                return {
                    success: true,
                    awbCode: awbData.awb_code,
                    courierId: awbData.courier_company_id,
                    courierName: awbData.courier_name,
                    assignedDate: awbData.assigned_date_sk,
                    isMock: false
                };
            }

            // Check if AWB already assigned
            if (response.data.awb_assign_status === 1) {
                return {
                    success: true,
                    awbCode: response.data.response?.data?.awb_code,
                    message: 'AWB already assigned',
                    isMock: false
                };
            }

            throw new Error('AWB generation failed');
        } catch (error) {
            const errorMessage = error.response?.data?.message || error.message;
            console.error('[Shiprocket] AWB generation failed:', error.response?.data || errorMessage);

            // Check if error is KYC-related
            const kycErrors = ['kyc', 'verification', 'document', 'not verified', 'pending approval'];
            const isKYCError = kycErrors.some(keyword =>
                errorMessage.toLowerCase().includes(keyword)
            );

            if (isKYCError) {
                console.warn('[Shiprocket] ⚠️  KYC-related error detected, falling back to mock AWB');
                return this.generateMockAWB(shipmentId, courierId, courierName);
            }

            throw new Error(`AWB generation failed: ${errorMessage}`);
        }
    }

    /**
     * Generate mock pickup response (for testing without real AWB)
     * @param {string} shipmentId - Shiprocket shipment ID
     * @param {Date} productionEndDate - Optional production end date for pickup scheduling
     * @returns {Object} Mock pickup info
     */
    generateMockPickup(shipmentId, productionEndDate = null) {
        // Use production end date if provided, otherwise use tomorrow
        const pickupDate = productionEndDate
            ? new Date(productionEndDate)
            : new Date(Date.now() + 24 * 60 * 60 * 1000);

        // Set pickup time to 12:05 for consistency
        pickupDate.setHours(12, 5, 0, 0);

        console.log(`[Shiprocket] 🧪 MOCK Pickup scheduled for shipment: ${shipmentId}`);
        console.log(`[Shiprocket] 📅 Pickup Date: ${pickupDate.toISOString()} (Based on: ${productionEndDate ? 'Production End Date' : 'Tomorrow'})`);

        return {
            success: true,
            pickupStatus: 1,
            pickupScheduledDate: pickupDate.toISOString(),
            pickupTime: '12:05',
            message: 'Mock pickup scheduled successfully',
            isMock: true
        };
    }

    /**
     * Request pickup for a shipment
     * @param {string} shipmentId - Shiprocket shipment ID
     * @param {boolean} isMockAWB - Whether the AWB is mocked
     * @param {Date} productionEndDate - Optional production end date for pickup scheduling
     * @returns {Promise<Object>} Pickup request info
     */
    async requestPickup(shipmentId, isMockAWB = false, productionEndDate = null) {
        // If using mock AWB, return mock pickup (real API will fail without real AWB)
        if (isMockAWB || this.useMockAWB) {
            return this.generateMockPickup(shipmentId, productionEndDate);
        }

        try {
            const client = await this.getClient();

            console.log('[Shiprocket] Requesting pickup for shipment:', shipmentId);

            const response = await client.post('/courier/generate/pickup', {
                shipment_id: [shipmentId]
            });

            if (response.data) {
                console.log('[Shiprocket] Pickup requested successfully');
                console.log('[Shiprocket] 📋 Complete pickup response:', JSON.stringify(response.data, null, 2));
                return {
                    success: true,
                    pickupStatus: response.data.pickup_status,
                    pickupScheduledDate: response.data.pickup_scheduled_date,
                    pickupTokenNumber: response.data.pickup_token_number,
                    message: 'Pickup requested successfully',
                    isMock: false
                };
            }

            throw new Error('Pickup request failed');
        } catch (error) {
            console.error('[Shiprocket] Pickup request failed:', error.response?.data || error.message);

            // If AWB not assigned error, return mock pickup for test mode
            const errorMessage = error.response?.data?.message || error.message;
            if (errorMessage.toLowerCase().includes('awb not assigned') ||
                errorMessage.toLowerCase().includes('awb not generated')) {
                console.warn('[Shiprocket] ⚠️  AWB not assigned, falling back to mock pickup');
                return this.generateMockPickup(shipmentId, productionEndDate);
            }

            throw new Error(`Pickup request failed: ${errorMessage}`);
        }
    }

    /**
     * Get tracking information by AWB code
     * @param {string} awbCode - AWB number
     * @returns {Promise<Object>} Tracking info
     */
    async getTracking(awbCode) {
        try {
            const client = await this.getClient();

            const response = await client.get(`/courier/track/awb/${awbCode}`);

            if (response.data && response.data.tracking_data) {
                const tracking = response.data.tracking_data;
                return {
                    success: true,
                    currentStatus: tracking.shipment_track?.[0]?.current_status,
                    currentStatusId: tracking.shipment_track?.[0]?.current_status_id,
                    originCity: tracking.shipment_track?.[0]?.origin,
                    destinationCity: tracking.shipment_track?.[0]?.destination,
                    etd: tracking.shipment_track?.[0]?.etd,
                    courierName: tracking.shipment_track?.[0]?.courier_name,
                    activities: tracking.shipment_track_activities?.map(activity => ({
                        status: activity.activity,
                        location: activity.location,
                        date: activity.date,
                        srStatus: activity['sr-status'],
                        srStatusLabel: activity['sr-status-label']
                    })) || []
                };
            }

            return {
                success: false,
                message: 'No tracking data found'
            };
        } catch (error) {
            console.error('[Shiprocket] Tracking fetch failed:', error.response?.data || error.message);
            throw new Error(`Tracking fetch failed: ${error.response?.data?.message || error.message}`);
        }
    }

    /**
     * Get tracking by Shiprocket order ID
     * @param {string} orderId - Shiprocket order ID
     * @returns {Promise<Object>} Tracking info
     */
    async getTrackingByOrderId(orderId) {
        try {
            const client = await this.getClient();

            const response = await client.get(`/courier/track`, {
                params: { order_id: orderId }
            });

            if (response.data && response.data.length > 0) {
                const tracking = response.data[0];
                return {
                    success: true,
                    awbCode: tracking.awb_code,
                    courierName: tracking.courier_name,
                    currentStatus: tracking.current_status,
                    deliveredDate: tracking.delivered_date,
                    etd: tracking.etd,
                    activities: tracking.scans?.map(scan => ({
                        status: scan.activity,
                        location: scan.location,
                        date: scan.date,
                        time: scan.time
                    })) || []
                };
            }

            return {
                success: false,
                message: 'No tracking data found'
            };
        } catch (error) {
            console.error('[Shiprocket] Tracking by order ID failed:', error.response?.data || error.message);
            throw new Error(`Tracking fetch failed: ${error.response?.data?.message || error.message}`);
        }
    }

    /**
     * Cancel a Shiprocket order
     * @param {string|string[]} orderIds - Shiprocket order ID(s)
     * @returns {Promise<Object>} Cancellation result
     */
    async cancelOrder(orderIds) {
        try {
            const client = await this.getClient();

            const ids = Array.isArray(orderIds) ? orderIds : [orderIds];

            console.log('[Shiprocket] Cancelling orders:', ids);

            const response = await client.post('/orders/cancel', {
                ids: ids
            });

            if (response.data) {
                console.log('[Shiprocket] Orders cancelled successfully');
                return {
                    success: true,
                    message: 'Orders cancelled successfully'
                };
            }

            throw new Error('Cancellation failed');
        } catch (error) {
            console.error('[Shiprocket] Order cancellation failed:', error.response?.data || error.message);
            throw new Error(`Order cancellation failed: ${error.response?.data?.message || error.message}`);
        }
    }

    /**
     * Get all pickup locations/warehouses
     * @returns {Promise<Object>} List of pickup locations
     */
    async getPickupLocations() {
        try {
            const client = await this.getClient();

            const response = await client.get('/settings/company/pickup');

            if (response.data && response.data.data?.shipping_address) {
                return {
                    success: true,
                    locations: response.data.data.shipping_address.map(loc => ({
                        id: loc.id,
                        name: loc.pickup_location,
                        address: loc.address,
                        city: loc.city,
                        state: loc.state,
                        pincode: loc.pin_code,
                        phone: loc.phone,
                        isPrimary: loc.is_primary_location === 1
                    }))
                };
            }

            return {
                success: false,
                locations: [],
                message: 'No pickup locations found'
            };
        } catch (error) {
            console.error('[Shiprocket] Get pickup locations failed:', error.response?.data || error.message);
            throw new Error(`Failed to get pickup locations: ${error.response?.data?.message || error.message}`);
        }
    }

    /**
     * Create complete shipment flow (order + AWB + pickup)
     * @param {Object} orderData - Order details
     * @param {number} courierId - Optional courier ID from Shiprocket serviceability API
     * @param {string} courierName - Optional courier name from Shiprocket serviceability API
     * @param {Date} productionEndDate - Optional production end date for pickup scheduling
     * @returns {Promise<Object>} Complete shipment info
     */
    async createCompleteShipment(orderData, courierId = null, courierName = null, productionEndDate = null) {
        try {
            console.log('[Shiprocket] ═══════════════════════════════════════════════════════════════');
            console.log('[Shiprocket] 📦 CREATING COMPLETE SHIPMENT');
            console.log('[Shiprocket] ═══════════════════════════════════════════════════════════════');
            console.log('[Shiprocket] Order Number:', orderData.orderNumber);
            console.log('[Shiprocket] Customer:', orderData.customerName);
            console.log('[Shiprocket] Delivery Pincode:', orderData.pincode);
            console.log('[Shiprocket] Courier ID:', courierId || 'Auto');
            console.log('[Shiprocket] Courier Name:', courierName || 'Auto');
            console.log('[Shiprocket] Production End Date:', productionEndDate ? new Date(productionEndDate).toISOString() : 'Not provided');

            // Step 1: Create order
            console.log('[Shiprocket] Step 1/3: Creating order on Shiprocket...');
            let orderResult;
            try {
                orderResult = await this.createOrder(orderData);
            } catch (err) {
                // If the error looks like a pickup location mismatch, fallback to 'Primary'
                const errorMsg = err.message || '';
                const isPickupError = errorMsg.toLowerCase().includes('pickup') ||
                    (err.response?.data?.message && err.response.data.message.toLowerCase().includes('pickup'));

                if (isPickupError && orderData.pickupLocation !== 'Primary') {
                    console.warn(`[Shiprocket] ⚠️  Initial order creation failed for pickup "${orderData.pickupLocation}". Retrying with "Primary"...`);
                    orderData.pickupLocation = 'Primary';
                    orderResult = await this.createOrder(orderData); // Retry with Primary
                    console.log('[Shiprocket] ✅ Retry successful with "Primary" pickup location.');
                } else {
                    // Not a pickup error or already tried Primary, re-throw
                    throw err;
                }
            }

            if (!orderResult.success || !orderResult.shiprocketShipmentId) {
                throw new Error('Order creation failed');
            }
            console.log('[Shiprocket] ✅ Order created:', orderResult.shiprocketOrderId);
            console.log('[Shiprocket]    Shipment ID:', orderResult.shiprocketShipmentId);

            // Step 2: Generate AWB with real courier data from API
            console.log('[Shiprocket] Step 2/3: Generating AWB...');
            const awbResult = await this.generateAWB(orderResult.shiprocketShipmentId, courierId, courierName);

            if (!awbResult.success) {
                throw new Error('AWB generation failed');
            }
            console.log('[Shiprocket] ✅ AWB generated:', awbResult.awbCode, awbResult.isMock ? '(MOCK)' : '');
            console.log('[Shiprocket]    Courier:', awbResult.courierName || courierName);

            // Step 3: Request pickup (pass isMock flag and productionEndDate for scheduling)
            console.log('[Shiprocket] Step 3/3: Requesting pickup...');
            const pickupResult = await this.requestPickup(orderResult.shiprocketShipmentId, awbResult.isMock, productionEndDate);
            console.log('[Shiprocket] ✅ Pickup scheduled:', pickupResult.isMock ? '(MOCK)' : 'Real pickup');
            console.log('[Shiprocket]    Scheduled Date:', pickupResult.pickupScheduledDate);

            const isMockShipment = awbResult.isMock || pickupResult.isMock;

            console.log('[Shiprocket] ═══════════════════════════════════════════════════════════════');
            console.log('[Shiprocket] 🎉 SHIPMENT CREATED SUCCESSFULLY');
            console.log('[Shiprocket] ═══════════════════════════════════════════════════════════════');

            return {
                success: true,
                shiprocketOrderId: orderResult.shiprocketOrderId,
                shiprocketShipmentId: orderResult.shiprocketShipmentId,
                awbCode: awbResult.awbCode,
                // Use AWB result first, then fallback to passed values from serviceability API
                courierName: awbResult.courierName || courierName,
                courierId: awbResult.courierId || courierId,
                pickupStatus: pickupResult.pickupStatus,
                pickupScheduledDate: pickupResult.pickupScheduledDate,
                pickupTokenNumber: pickupResult.pickupTokenNumber,
                isMock: isMockShipment,
                message: isMockShipment ? 'Shipment created (TEST MODE)' : 'Shipment created successfully'
            };
        } catch (error) {
            console.error('[Shiprocket] Complete shipment creation failed:', error.message);
            throw error;
        }
    }
}

// Export singleton instance
const shiprocketService = new ShiprocketService();
export default shiprocketService;
export { ShiprocketService };
