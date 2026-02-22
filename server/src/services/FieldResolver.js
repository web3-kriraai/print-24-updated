/**
 * Field Resolver Service
 * Maps field names from conditions to actual values in context
 * 
 * Used by JSONRuleEvaluator to resolve field values during condition evaluation
 */

class FieldResolver {
    /**
     * Resolve a field name to its value in context
     */
    resolve(fieldName, context) {
        const resolver = this.getResolver(fieldName);

        if (!resolver) {
            console.warn(`⚠️ No resolver found for field: ${fieldName}`);
            return null;
        }

        try {
            return resolver(context);
        } catch (error) {
            console.error(`❌ Error resolving field ${fieldName}:`, error);
            return null;
        }
    }

    /**
     * Get resolver function for field
     */
    getResolver(fieldName) {
        const fieldResolvers = {
            // Geo-location fields
            'geo_zone': (ctx) => ctx.geoZoneId,
            'country': (ctx) => ctx.country,
            'state': (ctx) => ctx.state,
            'city': (ctx) => ctx.city,
            'pincode': (ctx) => ctx.pincode,
            'zip_code': (ctx) => ctx.pincode,

            // User fields
            'user_id': (ctx) => ctx.userId,
            'user_segment': (ctx) => ctx.userSegmentId,
            'user_role': (ctx) => ctx.userRole,
            'user_type': (ctx) => ctx.userType,

            // Product fields
            'product_id': (ctx) => ctx.productId,
            'product_type': (ctx) => ctx.productType,
            'product_category': (ctx) => ctx.productCategory,
            'category': (ctx) => ctx.categoryId,
            'sub_category': (ctx) => ctx.subCategoryId,
            'sku': (ctx) => ctx.sku,

            // Cart/Order fields
            'quantity': (ctx) => ctx.quantity,
            'subtotal': (ctx) => ctx.subtotal,
            'cart_total': (ctx) => ctx.cartTotal,
            'order_value': (ctx) => ctx.orderValue,

            // Time-based fields
            'day_of_week': () => new Date().getDay(), // 0=Sunday, 1=Monday...
            'hour_of_day': () => new Date().getHours(),
            'month': () => new Date().getMonth() + 1,
            'year': () => new Date().getFullYear(),
            'is_weekend': () => {
                const day = new Date().getDay();
                return day === 0 || day === 6;
            },

            // Custom attribute fields
            'attribute.paper_type': (ctx) => this.getAttributeValue(ctx, 'paper_type'),
            'attribute.size': (ctx) => this.getAttributeValue(ctx, 'size'),
            'attribute.finish': (ctx) => this.getAttributeValue(ctx, 'finish'),
            'attribute.color': (ctx) => this.getAttributeValue(ctx, 'color'),

            // Shipping fields
            'shipping_method': (ctx) => ctx.shippingMethod,
            'delivery_type': (ctx) => ctx.deliveryType,

            // Payment fields
            'payment_method': (ctx) => ctx.paymentMethod,
            'is_cod': (ctx) => ctx.paymentMethod === 'COD',
            'is_prepaid': (ctx) => ctx.paymentMethod !== 'COD',
        };

        // Check for exact match
        if (fieldResolvers[fieldName]) {
            return fieldResolvers[fieldName];
        }

        // Check for wildcard attribute pattern
        if (fieldName.startsWith('attribute.')) {
            return (ctx) => {
                const attributeName = fieldName.replace('attribute.', '');
                return this.getAttributeValue(ctx, attributeName);
            };
        }

        return null;
    }

    /**
     * Get attribute value from selectedAttributes
     */
    getAttributeValue(context, attributeName) {
        if (!context.selectedAttributes || !Array.isArray(context.selectedAttributes)) {
            return null;
        }

        const attribute = context.selectedAttributes.find(
            attr => attr.attributeType === attributeName || attr.name === attributeName
        );

        return attribute ? attribute.value : null;
    }

    /**
     * Get all available fields (for admin UI dropdown)
     */
    getAvailableFields() {
        return [
            // Geo-location
            { value: 'geo_zone', label: 'Geo Zone', category: 'Location' },
            { value: 'country', label: 'Country', category: 'Location' },
            { value: 'state', label: 'State', category: 'Location' },
            { value: 'city', label: 'City', category: 'Location' },
            { value: 'pincode', label: 'Pincode', category: 'Location' },

            // User
            { value: 'user_id', label: 'User ID', category: 'User' },
            { value: 'user_segment', label: 'User Segment', category: 'User' },
            { value: 'user_role', label: 'User Role', category: 'User' },

            // Product
            { value: 'product_id', label: 'Product ID', category: 'Product' },
            { value: 'product_type', label: 'Product Type', category: 'Product' },
            { value: 'category', label: 'Category', category: 'Product' },
            { value: 'sub_category', label: 'Sub-Category', category: 'Product' },
            { value: 'sku', label: 'SKU', category: 'Product' },

            // Cart/Order
            { value: 'quantity', label: 'Quantity', category: 'Order' },
            { value: 'subtotal', label: 'Subtotal', category: 'Order' },
            { value: 'cart_total', label: 'Cart Total', category: 'Order' },

            // Time
            { value: 'day_of_week', label: 'Day of Week', category: 'Time' },
            { value: 'hour_of_day', label: 'Hour of Day', category: 'Time' },
            { value: 'is_weekend', label: 'Is Weekend', category: 'Time' },

            // Attributes
            { value: 'attribute.paper_type', label: 'Paper Type', category: 'Attribute' },
            { value: 'attribute.size', label: 'Size', category: 'Attribute' },
            { value: 'attribute.finish', label: 'Finish', category: 'Attribute' },
        ];
    }
}

export default FieldResolver;
