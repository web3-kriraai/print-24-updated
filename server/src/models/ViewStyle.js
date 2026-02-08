import mongoose from "mongoose";

/**
 * ViewStyle Schema
 * 
 * UI configuration templates that define how components should look and behave
 * for different user types.
 */

const ViewStyleSchema = new mongoose.Schema(
    {
        /* =====================
           STYLE INFO
        ====================== */
        name: {
            type: String,
            required: true,
            trim: true,
            // e.g., "Corporate View", "Agent Dashboard", "Hub Operations"
        },

        code: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true,
            index: true,
            // e.g., "CORPORATE_VIEW", "AGENT_DASHBOARD"
        },

        description: {
            type: String,
            trim: true,
            // Detailed description of this view style
        },

        previewUrl: {
            type: String,
            trim: true,
            // URL to preview image/screenshot of this style
        },

        /* =====================
           COMPONENT CONFIGURATIONS
        ====================== */
        componentConfigs: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
            // Nested object structure for each component:
            // {
            //   DASHBOARD: {
            //     layout: 'grid',
            //     showCharts: true,
            //     widgets: ['orders', 'revenue'],
            //     theme: 'light'
            //   },
            //   ORDERS: {
            //     layout: 'table',
            //     columns: ['id', 'customer', 'amount'],
            //     showExport: true
            //   },
            //   ...
            // }
        },

        /* =====================
           THEME OVERRIDES
        ====================== */
        themeOverrides: {
            colors: {
                primary: {
                    type: String,
                    default: "#3b82f6",
                },
                secondary: {
                    type: String,
                    default: "#10b981",
                },
                accent: {
                    type: String,
                    default: "#f59e0b",
                },
                background: {
                    type: String,
                    default: "#ffffff",
                },
                text: {
                    type: String,
                    default: "#1f2937",
                },
            },
            typography: {
                fontFamily: {
                    type: String,
                    default: "Inter, system-ui, sans-serif",
                },
                fontSize: {
                    type: String,
                    default: "16px",
                },
            },
            layout: {
                borderRadius: {
                    type: String,
                    default: "0.5rem",
                },
                spacing: {
                    type: String,
                    default: "1rem",
                },
            },
            customCSS: {
                type: String,
                default: "",
                // Custom CSS for advanced customization
            },
        },

        /* =====================
           DEFAULT FLAG
        ====================== */
        isDefault: {
            type: Boolean,
            default: false,
            index: true,
            // Default view style used when no specific assignment exists
        },

        /* =====================
           STATUS
        ====================== */
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },

        /* =====================
           AUDIT FIELDS
        ====================== */
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
    },
    { timestamps: true }
);

/* =====================
   INDEXES
====================== */
ViewStyleSchema.index({ code: 1, isActive: 1 });
ViewStyleSchema.index({ isDefault: 1, isActive: 1 });

/* =====================
   METHODS
====================== */

/**
 * Get configuration for a specific component
 */
ViewStyleSchema.methods.getComponentConfig = function (componentName) {
    return this.componentConfigs[componentName.toUpperCase()] || null;
};

/**
 * Set configuration for a specific component
 */
ViewStyleSchema.methods.setComponentConfig = async function (componentName, config) {
    this.componentConfigs[componentName.toUpperCase()] = config;
    await this.save();
    return this;
};

/**
 * Get preview data for frontend rendering
 */
ViewStyleSchema.methods.generatePreview = function () {
    return {
        name: this.name,
        code: this.code,
        previewUrl: this.previewUrl,
        themeOverrides: this.themeOverrides,
        componentConfigs: this.componentConfigs,
    };
};

/* =====================
   STATICS
====================== */

/**
 * Get default view style
 */
ViewStyleSchema.statics.getDefault = async function () {
    return await this.findOne({ isDefault: true, isActive: true });
};

/**
 * Clone/duplicate a view style
 */
ViewStyleSchema.statics.cloneStyle = async function (sourceId, newName, newCode, adminUser) {
    const source = await this.findById(sourceId);
    if (!source) {
        throw new Error("Source view style not found");
    }

    const clone = new this({
        name: newName,
        code: newCode,
        description: `Cloned from ${source.name}`,
        componentConfigs: JSON.parse(JSON.stringify(source.componentConfigs)),
        themeOverrides: JSON.parse(JSON.stringify(source.themeOverrides)),
        isDefault: false,
        createdBy: adminUser,
    });

    await clone.save();
    return clone;
};

export default mongoose.model("ViewStyle", ViewStyleSchema);
