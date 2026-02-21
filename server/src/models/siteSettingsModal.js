import mongoose from "mongoose";

const SiteSettingsSchema = new mongoose.Schema(
    {
        logo: {
            type: String,
            default: '/logo.svg'
        },
        siteName: {
            type: String,
            default: 'Prints24'
        },
        tagline: {
            type: String,
            default: 'Premium Gifting, Printing & Packaging Solutions'
        },
        // Scroll Behavior Settings
        scrollSettings: {
            autoScrollEnabled: {
                type: Boolean,
                default: true
            },
            autoScrollInterval: {
                type: Number,
                default: 3000 // milliseconds
            },
            inactivityTimeout: {
                type: Number,
                default: 6000 // milliseconds before auto-scroll starts
            },
            smoothScrollEnabled: {
                type: Boolean,
                default: true
            },
            stickyNavEnabled: {
                type: Boolean,
                default: true
            },
            scrollToTopOnNavClick: {
                type: Boolean,
                default: true
            },
            // Page Auto-Scroll Settings (scroll down when homepage loads)
            pageAutoScrollEnabled: {
                type: Boolean,
                default: true
            },
            pageAutoScrollDelay: {
                type: Number,
                default: 2000 // milliseconds before auto-scroll triggers
            },
            pageAutoScrollAmount: {
                type: Number,
                default: 250 // pixels to scroll down
            }
        },
        // Global Font Settings for all services
        fontSettings: {
            // Navbar font controls
            navbarNameFontSize: {
                type: String,
                default: '14px'
            },
            navbarNameFontWeight: {
                type: String,
                default: '600'
            },
            // Card intro font controls
            cardIntroFontSize: {
                type: String,
                default: '12px'
            },
            cardIntroFontWeight: {
                type: String,
                default: '400'
            },
            // Card title font controls
            cardTitleFontSize: {
                type: String,
                default: '24px'
            },
            cardTitleFontWeight: {
                type: String,
                default: '700'
            },
            // Card description font controls
            cardDescFontSize: {
                type: String,
                default: '14px'
            },
            cardDescFontWeight: {
                type: String,
                default: '400'
            }
        },
        // Global Navbar Layout Settings for all services
        navbarSettings: {
            // Width of each service navbar item
            itemWidth: {
                type: String,
                default: '150px'
            },
            // Gap between service navbar items
            itemGap: {
                type: String,
                default: '8px'
            }
        },
        // Designer Feature Settings
        designerSettings: {
            visualDesignerEnabled: {
                type: Boolean,
                default: true
            },
            physicalDesignerEnabled: {
                type: Boolean,
                default: true
            }
        }
    },
    { timestamps: true }
);

// Ensure only one settings document exists
SiteSettingsSchema.statics.getSettings = async function () {
    let settings = await this.findOne();
    if (!settings) {
        settings = await this.create({});
    }
    return settings;
};

export default mongoose.model("SiteSettings", SiteSettingsSchema);
