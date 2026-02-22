import React, { useState, useEffect } from 'react';
import { ReviewFilterDropdown } from '../../../../components/ReviewFilterDropdown';

interface Category {
    _id: string;
    name: string;
    type: string;
    parent?: string | { _id: string } | null;
    sortOrder?: number;
}

interface HierarchicalCategorySelectorProps {
    categories: Array<Category>;
    subCategories: Array<any>;
    selectedCategoryId: string;
    onCategorySelect: (categoryId: string) => void;
}

const HierarchicalCategorySelector: React.FC<HierarchicalCategorySelectorProps> = ({
    categories,
    subCategories,
    selectedCategoryId,
    onCategorySelect
}) => {
    const [selectedType, setSelectedType] = useState<string>("");
    const [selectedCategoryPath, setSelectedCategoryPath] = useState<string[]>([]);

    // Get top-level categories for selected type
    const topLevelCategories = categories.filter(
        (cat) => cat.type === selectedType && (!cat.parent || cat.parent === null || (typeof cat.parent === 'object' && !cat.parent._id))
    );

    // Get child categories for a given parent
    const getChildCategories = (parentId: string) => {
        return subCategories.filter((cat) => {
            const catParentId = typeof cat.category === 'object' ? cat.category._id : cat.category;
            // Also check 'parent' field for nested subcategories
            const nestedParentId = typeof cat.parent === 'object' ? cat.parent._id : cat.parent;

            // If checking for top-level subcategories (children of category)
            if (categories.some(c => c._id === parentId)) {
                return catParentId === parentId && !nestedParentId;
            }

            // If checking for nested subcategories
            return nestedParentId === parentId;
        });
    };

    // Note: The above logic is a bit complex because subCategories array might be mixed or flattened.
    // Let's refine based on AdminDashboard logic if possible, or stick to a simpler recursive approach if data allows.
    // In AdminDashboard, it seems they filter subCategories or categories based on relationships.
    // We'll trust the prop passed 'subCategories' contains all subcats.

    const getCategoriesByParent = (parentId: string) => {
        // Check in categories first (for top level)
        // Actually, typically Category -> SubCategory -> SubCategory(Nested)

        // If parentId is a Category, find SubCategories where category == parentId AND parent is empty
        const directSubcats = subCategories.filter(sc => {
            const scCategoryId = typeof sc.category === 'object' ? sc.category?._id : sc.category;
            const scParentId = typeof sc.parent === 'object' ? sc.parent?._id : sc.parent;
            return scCategoryId === parentId && !scParentId;
        });

        if (directSubcats.length > 0) return directSubcats;

        // If parentId is a SubCategory, find SubCategories where parent == parentId
        const nestedSubcats = subCategories.filter(sc => {
            const scParentId = typeof sc.parent === 'object' ? sc.parent?._id : sc.parent;
            return scParentId === parentId;
        });

        return nestedSubcats;
    };

    // Build category path from selected category
    const buildCategoryPath = (categoryId: string): string[] => {
        const path: string[] = [];
        // This is tricky without a full map, but we can try to walk up if we have all data
        // For now, let's rely on the user re-selecting if the path isn't perfectly reconstructed on load
        // Or simplify: just show the hierarchy if possible.
        return path;
    };

    // Initialize type
    useEffect(() => {
        if (selectedCategoryId) {
            // Find the category/subcategory
            let found = categories.find(c => c._id === selectedCategoryId);
            if (found) {
                setSelectedType(found.type);
                return;
            }

            // Try subcategories
            const foundSub = subCategories.find(sc => sc._id === selectedCategoryId);
            if (foundSub) {
                // Determine type from its category
                const catId = typeof foundSub.category === 'object' ? foundSub.category?._id : foundSub.category;
                const parentCat = categories.find(c => c._id === catId);
                if (parentCat) setSelectedType(parentCat.type);
            }
        }
    }, [selectedCategoryId, categories, subCategories]);

    const handleTypeChange = (type: string) => {
        setSelectedType(type);
        setSelectedCategoryPath([]);
        onCategorySelect("");
    };

    const handleCategorySelect = (categoryId: string, level: number) => {
        const newPath = selectedCategoryPath.slice(0, level);
        newPath.push(categoryId);
        setSelectedCategoryPath(newPath);
        onCategorySelect(categoryId);
    };

    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                    Type *
                </label>
                <ReviewFilterDropdown
                    label="Select Type"
                    value={selectedType}
                    onChange={handleTypeChange}
                    options={[
                        { value: "", label: "Select Type" },
                        { value: "Digital", label: "Digital" },
                        { value: "Bulk", label: "Bulk" },
                    ]}
                    className="w-full"
                />
            </div>

            {selectedType && (
                <>
                    {/* Level 0: Top Level Categories */}
                    <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">
                            Category *
                        </label>
                        <ReviewFilterDropdown
                            label="Select Category"
                            value={selectedCategoryPath[0] || ""}
                            onChange={(value) => {
                                if (value) {
                                    handleCategorySelect(String(value), 0);
                                } else {
                                    setSelectedCategoryPath([]);
                                    onCategorySelect("");
                                }
                            }}
                            options={[
                                { value: "", label: "Select Category" },
                                ...categories
                                    .filter(c => c.type === selectedType && (!c.parent || (typeof c.parent === 'object' && !c.parent._id)))
                                    .map((cat) => ({
                                        value: cat._id,
                                        label: cat.name,
                                    })),
                            ]}
                            className="w-full"
                        />
                    </div>

                    {/* Recursive Levels */}
                    {selectedCategoryPath.map((parentId, index) => {
                        const children = getCategoriesByParent(parentId);
                        if (children.length === 0) return null;

                        return (
                            <div key={parentId}>
                                <label className="block text-sm font-medium text-gray-900 mb-2">
                                    Subcategory (Level {index + 1})
                                </label>
                                <ReviewFilterDropdown
                                    label="Select Subcategory"
                                    value={selectedCategoryPath[index + 1] || ""}
                                    onChange={(value) => {
                                        if (value) {
                                            handleCategorySelect(String(value), index + 1);
                                        } else {
                                            // Deselect this level
                                            const newPath = selectedCategoryPath.slice(0, index + 1);
                                            setSelectedCategoryPath(newPath);
                                            onCategorySelect(parentId);
                                        }
                                    }}
                                    options={[
                                        { value: "", label: "Select Subcategory" },
                                        ...children
                                            .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
                                            .map((cat: any) => ({
                                                value: cat._id,
                                                label: cat.name,
                                            })),
                                    ]}
                                    className="w-full"
                                />
                            </div>
                        );
                    })}
                </>
            )}
        </div>
    );
};

export default HierarchicalCategorySelector;
