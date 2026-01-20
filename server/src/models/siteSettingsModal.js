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
        }
    },
    { timestamps: true }
);

// Ensure only one settings document exists
SiteSettingsSchema.statics.getSettings = async function() {
    let settings = await this.findOne();
    if (!settings) {
        settings = await this.create({});
    }
    return settings;
};

export default mongoose.model("SiteSettings", SiteSettingsSchema);
