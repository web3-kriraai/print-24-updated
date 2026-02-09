import React, { useState, useEffect } from "react";
import { Package, ChevronRight, AlertCircle, Loader } from "lucide-react";

interface Department {
    _id: string;
    name: string;
    sequence?: number;
}

interface Sequence {
    _id: string;
    name: string;
    departments: Array<{
        department: Department;
        order: number;
    }>;
}

interface SequenceSelectorProps {
    selectedCategory?: string;
    selectedSubcategory?: string;
    selectedSequence?: string;
    onSequenceChange: (sequenceId: string) => void;
    apiBaseUrl: string;
    getAuthHeaders: () => Record<string, string>;
}

export const SequenceSelector: React.FC<SequenceSelectorProps> = ({
    selectedCategory,
    selectedSubcategory,
    selectedSequence,
    onSequenceChange,
    apiBaseUrl,
    getAuthHeaders,
}) => {
    const [sequences, setSequences] = useState<Sequence[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch all sequences (no filtering by category/subcategory)
    useEffect(() => {
        const fetchSequences = async () => {
            // Always fetch sequences if component is mounted
            setLoading(true);
            setError(null);

            try {
                // Fetch ALL sequences from the database
                const url = `${apiBaseUrl}/sequences`;

                const response = await fetch(url, {
                    headers: getAuthHeaders(),
                });

                if (!response.ok) {
                    throw new Error("Failed to fetch sequences");
                }

                const data = await response.json();
                setSequences(Array.isArray(data) ? data : (data.data || []));
            } catch (err) {
                console.error("Error fetching sequences:", err);
                setError(err instanceof Error ? err.message : "Failed to load sequences");
                setSequences([]);
            } finally {
                setLoading(false);
            }
        };

        fetchSequences();
    }, [apiBaseUrl]);

    // Find the currently selected sequence
    const currentSequence = sequences.find(s => s._id === selectedSequence);

    return (
        <div className="space-y-3">
            <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Production Sequence (Optional)
                </label>

                {loading ? (
                    <div className="flex items-center gap-2 text-sm text-slate-500 p-3 bg-slate-50 rounded-lg">
                        <Loader className="w-4 h-4 animate-spin" />
                        Loading sequences...
                    </div>
                ) : error ? (
                    <div className="flex items-center gap-2 text-sm text-red-600 p-3 bg-red-50 rounded-lg">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                    </div>
                ) : sequences.length === 0 ? (
                    <div className="text-sm text-slate-500 p-3 bg-slate-50 rounded-lg">
                        No sequences have been created yet
                    </div>
                ) : (
                    <select
                        value={selectedSequence || ""}
                        onChange={(e) => onSequenceChange(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all text-slate-700"
                    >
                        <option value="">-- No Sequence (Manual Department Assignment) --</option>
                        {sequences.map((seq) => (
                            <option key={seq._id} value={seq._id}>
                                {seq.name} ({seq.departments.length} departments)
                            </option>
                        ))}
                    </select>
                )}
            </div>

            {/* Department Flow Preview */}
            {currentSequence && (
                <div className="p-4 bg-gradient-to-br from-sky-50 to-blue-50 border border-sky-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                        <Package className="w-4 h-4 text-sky-600" />
                        <h4 className="text-sm font-semibold text-slate-800">
                            Department Workflow Preview
                        </h4>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {currentSequence.departments
                            .sort((a, b) => a.order - b.order)
                            .map((dept, index) => (
                                <React.Fragment key={dept.department._id}>
                                    <div className="px-3 py-1.5 bg-white border border-sky-300 rounded-md text-xs font-medium text-slate-700 shadow-sm">
                                        {index + 1}. {dept.department.name}
                                    </div>
                                    {index < currentSequence.departments.length - 1 && (
                                        <ChevronRight className="w-4 h-4 text-sky-400" />
                                    )}
                                </React.Fragment>
                            ))}
                    </div>
                    <p className="text-xs text-slate-600 mt-3">
                        Orders will flow through these departments in sequence. Each department must approve before moving to the next.
                    </p>
                </div>
            )}
        </div>
    );
};
