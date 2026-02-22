import React, { useState, useEffect } from "react";
import { Save, Plus, Trash2, Loader } from "lucide-react";
import toast from "react-hot-toast";
import { API_BASE_URL_WITH_API } from "../../../lib/apiConfig";

const AboutManagement: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        vision: {
            title: "",
            description: "",
            icon: "V"
        },
        mission: {
            title: "",
            items: [] as string[],
            icon: "M"
        }
    });

    useEffect(() => {
        fetchAboutData();
    }, []);

    const fetchAboutData = async () => {
        try {
            setFetching(true);
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_BASE_URL_WITH_API}/about`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setFormData({
                    title: data.title || "",
                    description: data.description || "",
                    vision: data.vision || { title: "", description: "", icon: "V" },
                    mission: data.mission || { title: "", items: [], icon: "M" }
                });
            } else {
                toast.error("Failed to load About data");
            }
        } catch (error) {
            console.error("Error fetching about data:", error);
            toast.error("Error loading data");
        } finally {
            setFetching(false);
        }
    };

    const handleSave = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_BASE_URL_WITH_API}/about`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                toast.success("About section updated successfully");
            } else {
                toast.error("Failed to update About section");
            }
        } catch (error) {
            console.error("Error updating about data:", error);
            toast.error("Error updating data");
        } finally {
            setLoading(false);
        }
    };

    const handleMissionItemAdd = () => {
        setFormData({
            ...formData,
            mission: {
                ...formData.mission,
                items: [...formData.mission.items, ""]
            }
        });
    };

    const handleMissionItemChange = (index: number, value: string) => {
        const newItems = [...formData.mission.items];
        newItems[index] = value;
        setFormData({
            ...formData,
            mission: {
                ...formData.mission,
                items: newItems
            }
        });
    };

    const handleMissionItemDelete = (index: number) => {
        const newItems = formData.mission.items.filter((_, i) => i !== index);
        setFormData({
            ...formData,
            mission: {
                ...formData.mission,
                items: newItems
            }
        });
    };

    if (fetching) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader className="animate-spin text-blue-600" size={32} />
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-4xl mx-auto pb-10">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">About Section Management</h2>
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                    {loading ? <Loader className="animate-spin" size={20} /> : <Save size={20} />}
                    Save Changes
                </button>
            </div>

            {/* Main Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
                <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">Main Content</h3>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={4}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
            </div>

            {/* Vision Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
                <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">Vision</h3>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vision Title</label>
                    <input
                        type="text"
                        value={formData.vision.title}
                        onChange={(e) => setFormData({ ...formData, vision: { ...formData.vision, title: e.target.value } })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vision Description</label>
                    <textarea
                        value={formData.vision.description}
                        onChange={(e) => setFormData({ ...formData, vision: { ...formData.vision, description: e.target.value } })}
                        rows={3}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
            </div>

            {/* Mission Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
                <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">Mission</h3>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mission Title</label>
                    <input
                        type="text"
                        value={formData.mission.title}
                        onChange={(e) => setFormData({ ...formData, mission: { ...formData.mission, title: e.target.value } })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Mission Items</label>
                    <div className="space-y-3">
                        {formData.mission.items.map((item, index) => (
                            <div key={index} className="flex gap-2">
                                <input
                                    type="text"
                                    value={item}
                                    onChange={(e) => handleMissionItemChange(index, e.target.value)}
                                    className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Enter mission item"
                                />
                                <button
                                    onClick={() => handleMissionItemDelete(index)}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        ))}
                    </div>
                    <button
                        onClick={handleMissionItemAdd}
                        className="mt-3 flex items-center gap-2 text-sm text-blue-600 font-medium hover:text-blue-700"
                    >
                        <Plus size={16} />
                        Add Mission Item
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AboutManagement;
