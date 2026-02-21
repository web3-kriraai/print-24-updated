import axios from 'axios';

class ShiprocketService {
    constructor() {
        this.email = process.env.SHIPROCKET_EMAIL;
        this.password = process.env.SHIPROCKET_API;
        this.token = null;
        this.tokenExpiry = null;
        this.baseUrl = 'https://apiv2.shiprocket.in/v1/payload';
    }

    async authenticate() {
        // Simple caching mechanism for token (lasts 10 days, we'll refresh after 9 days)
        if (this.token && this.tokenExpiry && new Date() < this.tokenExpiry) {
            return this.token;
        }

        try {
            const response = await axios.post(`${this.baseUrl}/user/login`, {
                email: this.email,
                password: this.password
            });

            this.token = response.data.token;
            // Token is valid for 10 days, refresh after 9
            this.tokenExpiry = new Date(new Date().getTime() + 9 * 24 * 60 * 60 * 1000);
            return this.token;
        } catch (error) {
            console.error('Shiprocket Auth Error:', error.response?.data || error.message);
            throw new Error('Failed to authenticate with Shiprocket');
        }
    }

    async getServiceability(pickupPostcode, deliveryPostcode, weight, cod = 1) {
        try {
            const token = await this.authenticate();
            const response = await axios.get(`${this.baseUrl}/courier/serviceability/`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                params: {
                    pickup_postcode: pickupPostcode,
                    delivery_postcode: deliveryPostcode,
                    weight: weight,
                    cod: cod
                }
            });

            if (response.data.status === 200 && response.data.data.available_courier_companies.length > 0) {
                return response.data.data.available_courier_companies;
            } else {
                return [];
            }
        } catch (error) {
            console.error('Shiprocket Serviceability Error:', error.response?.data || error.message);
            throw new Error('Failed to check serviceability');
        }
    }

    getBestCourierRates(couriers, strategy = 'balanced') {
        if (!couriers || couriers.length === 0) return null;

        const parseDays = (days) => {
            if (typeof days === 'number') return days;
            // E.g., "5", "3-5", "E"
            const num = parseInt(days);
            return isNaN(num) ? 99 : num;
        };

        if (strategy === 'cheapest') {
            return couriers.reduce((prev, curr) => (prev.rate < curr.rate ? prev : curr));
        } else if (strategy === 'fastest') {
            return couriers.reduce((prev, curr) => (parseDays(prev.estimated_delivery_days) < parseDays(curr.estimated_delivery_days) ? prev : curr));
        } else {
            // Balanced: Score by cost and speed (lower score is better)
            // Weight standard delivery days slightly more if the cost is close
            const scored = couriers.map(c => {
                const days = parseDays(c.estimated_delivery_days);
                const cost = c.rate;
                // Simple heuristic: Rate + (Days * 50) 
                return { ...c, _score: cost + (days * 50) };
            });

            return scored.reduce((prev, curr) => (prev._score < curr._score ? prev : curr));
        }
    }
}

export default new ShiprocketService();
