import mongoose from "mongoose";

const AboutSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, default: "About Prints24" },
        description: { type: String, required: true },
        vision: {
            title: { type: String, default: "Vision" },
            description: { type: String },
            icon: { type: String, default: "V" }
        },
        mission: {
            title: { type: String, default: "Mission" },
            items: [{ type: String }],
            icon: { type: String, default: "M" }
        }
    },
    { timestamps: true }
);

export default mongoose.model("About", AboutSchema);
