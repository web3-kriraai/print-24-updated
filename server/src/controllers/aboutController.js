import About from "../models/aboutModal.js";

// Get About Data
export const getAbout = async (req, res) => {
    try {
        let about = await About.findOne();
        if (!about) {
            // Create default if not exists
            about = await About.create({
                title: "About Prints24",
                description: "Prints24 is a modern, fast-growing Digital & Offset Printing Company, whose aim is to provide Fast, Creative, and High-Quality printing solutions to customers.",
                vision: {
                    title: "Vision",
                    description: "To make Affordable, Stylish, and Premium Quality Printing easily accessible to every individual and every business.",
                    icon: "V"
                },
                mission: {
                    title: "Mission",
                    items: [
                        "To make Modern Printing easy and accessible to everyone.",
                        "To provide smart solutions with Quick Delivery + High Quality.",
                        "To make better options available according to every budget."
                    ],
                    icon: "M"
                }
            });
        }
        res.status(200).json(about);
    } catch (error) {
        res.status(500).json({ message: "Error fetching About data", error: error.message });
    }
};

// Update About Data
export const updateAbout = async (req, res) => {
    try {
        const { title, description, vision, mission } = req.body;

        let about = await About.findOne();
        if (!about) {
            about = new About();
        }

        about.title = title;
        about.description = description;
        about.vision = vision;
        about.mission = mission;

        await about.save();
        res.status(200).json(about);
    } catch (error) {
        res.status(500).json({ message: "Error updating About data", error: error.message });
    }
};
