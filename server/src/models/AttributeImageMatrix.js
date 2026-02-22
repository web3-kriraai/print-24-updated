import mongoose from "mongoose";

/**
 * AttributeImageMatrix Schema
 * 
 * Stores pre-rendered product images for all possible attribute combinations.
 * Uses the Matrix Strategy for O(1) image lookups based on user selections.
 * 
 * Optimizations:
 * - Compound index on product + combinationKey for instant lookups
 * - combinationKey is pre-computed for fast queries
 * - Caching-friendly structure (immutable combination keys)
 */
const AttributeImageMatrixSchema = new mongoose.Schema(
    {
        // Reference to the product
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true,
            index: true,
        },

        // Store the attribute combination as a map: { attributeId: selectedValue }
        // Example: { "attr123": "red", "attr456": "glossy", "attr789": "round" }
        attributeCombination: {
            type: Map,
            of: String,
            required: true,
        },

        // Human-readable labels for display in admin UI
        // Example: { "attr123": { name: "Color", value: "Red" }, ... }
        attributeLabels: {
            type: Map,
            of: {
                attributeName: String,
                valueLabel: String,
            },
        },

        // Computed lookup key for O(1) lookups
        // Format: "attrId1:value1|attrId2:value2|..." (sorted alphabetically by attribute ID)
        // This ensures consistent key generation regardless of selection order
        combinationKey: {
            type: String,
            required: true,
            index: true,
        },

        // Cloudinary image URL
        imageUrl: {
            type: String,
            default: null,
        },

        // Cloudinary public_id for image management/deletion
        cloudinaryPublicId: {
            type: String,
            default: null,
        },

        // Optimized thumbnail URL (for admin grid view)
        thumbnailUrl: {
            type: String,
            default: null,
        },

        // Status tracking
        status: {
            type: String,
            enum: ["MISSING", "UPLOADED"],
            default: "MISSING",
        },

        // Sort order for consistent display
        sortOrder: {
            type: Number,
            default: 0,
        },

        // Metadata
        uploadedAt: Date,
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },

        // File metadata for validation
        fileMetadata: {
            originalFilename: String,
            fileSize: Number,
            mimeType: String,
            width: Number,
            height: Number,
        },
    },
    {
        timestamps: true,
        // Enable virtuals for population
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// ========== INDEXES ==========

// Primary lookup index - most common query pattern
// Used when resolving image for specific product + attribute combination
AttributeImageMatrixSchema.index(
    { product: 1, combinationKey: 1 },
    { unique: true }
);

// Status-based queries for admin dashboard
// Used for: "Show all missing images for product X"
AttributeImageMatrixSchema.index({ product: 1, status: 1 });

// Sorting index for admin grid display
AttributeImageMatrixSchema.index({ product: 1, sortOrder: 1 });

// ========== STATICS ==========

/**
 * Generate a consistent combination key from attribute selections
 * @param {Object} attributeSelections - Map of attributeId -> value
 * @returns {string} Sorted, delimited combination key
 */
AttributeImageMatrixSchema.statics.generateCombinationKey = function (attributeSelections) {
    if (!attributeSelections || typeof attributeSelections !== 'object') {
        return '';
    }

    // Convert Map to object if needed
    const selections = attributeSelections instanceof Map
        ? Object.fromEntries(attributeSelections)
        : attributeSelections;

    // Sort by attribute ID for consistent ordering
    const sortedKeys = Object.keys(selections).sort();

    // Build key: "attrId1:value1|attrId2:value2|..."
    return sortedKeys
        .map(key => `${key}:${selections[key]}`)
        .join('|');
};

/**
 * Find image for a specific attribute combination
 * @param {string} productId - Product ID
 * @param {Object} attributeSelections - Current attribute selections
 * @returns {Promise<Object|null>} Matrix entry or null
 */
AttributeImageMatrixSchema.statics.findBySelection = async function (productId, attributeSelections) {
    const combinationKey = this.generateCombinationKey(attributeSelections);

    if (!combinationKey) return null;

    return this.findOne({
        product: productId,
        combinationKey: combinationKey,
        status: 'UPLOADED'
    }).select('imageUrl thumbnailUrl combinationKey').lean();
};

/**
 * Get matrix statistics for a product
 * @param {string} productId - Product ID
 * @returns {Promise<Object>} Statistics object
 */
AttributeImageMatrixSchema.statics.getProductStats = async function (productId) {
    const stats = await this.aggregate([
        { $match: { product: new mongoose.Types.ObjectId(productId) } },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 }
            }
        }
    ]);

    const result = {
        total: 0,
        uploaded: 0,
        missing: 0
    };

    stats.forEach(stat => {
        result.total += stat.count;
        if (stat._id === 'UPLOADED') result.uploaded = stat.count;
        if (stat._id === 'MISSING') result.missing = stat.count;
    });

    return result;
};

/**
 * Cartesian product generator for attribute combinations
 * @param {Array} arrays - Array of {id, name, values: []} objects
 * @returns {Array} Array of {key, map, labels} objects
 */
AttributeImageMatrixSchema.statics.generateCartesianProduct = function (attributes) {
    if (!attributes || attributes.length === 0) {
        return [];
    }

    // Start with first attribute's values
    let result = attributes[0].values.map(val => ({
        map: { [attributes[0].id]: val.value },
        labels: {
            [attributes[0].id]: {
                attributeName: attributes[0].name,
                valueLabel: val.label || val.value
            }
        }
    }));

    // Multiply with each subsequent attribute
    for (let i = 1; i < attributes.length; i++) {
        const attr = attributes[i];
        const newResult = [];

        for (const existing of result) {
            for (const val of attr.values) {
                newResult.push({
                    map: {
                        ...existing.map,
                        [attr.id]: val.value
                    },
                    labels: {
                        ...existing.labels,
                        [attr.id]: {
                            attributeName: attr.name,
                            valueLabel: val.label || val.value
                        }
                    }
                });
            }
        }

        result = newResult;
    }

    // Add combination keys
    return result.map((combo, index) => ({
        ...combo,
        key: this.generateCombinationKey(combo.map),
        sortOrder: index
    }));
};

/**
 * Bulk upsert matrix entries (optimized for large matrices)
 * @param {string} productId - Product ID
 * @param {Array} combinations - Array of {key, map, labels, sortOrder} objects
 * @returns {Promise<Object>} Result with counts
 */
AttributeImageMatrixSchema.statics.bulkUpsertCombinations = async function (productId, combinations) {
    if (!combinations || combinations.length === 0) {
        return { created: 0, existing: 0 };
    }

    const bulkOps = combinations.map(combo => ({
        updateOne: {
            filter: {
                product: new mongoose.Types.ObjectId(productId),
                combinationKey: combo.key
            },
            update: {
                $setOnInsert: {
                    product: new mongoose.Types.ObjectId(productId),
                    combinationKey: combo.key,
                    attributeCombination: combo.map,
                    status: 'MISSING',
                },
                // Always update labels and sortOrder (even for existing entries)
                $set: {
                    attributeLabels: combo.labels,
                    sortOrder: combo.sortOrder,
                }
            },
            upsert: true
        }
    }));

    // Execute in batches of 500 for memory efficiency
    const batchSize = 500;
    let created = 0;
    let existing = 0;

    for (let i = 0; i < bulkOps.length; i += batchSize) {
        const batch = bulkOps.slice(i, i + batchSize);
        const result = await this.bulkWrite(batch, { ordered: false });
        created += result.upsertedCount || 0;
        existing += result.matchedCount || 0;
    }

    return { created, existing, total: combinations.length };
};

export default mongoose.model("AttributeImageMatrix", AttributeImageMatrixSchema);
