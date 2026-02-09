import React from "react";
import { CheckCircle, Clock, Loader, Circle, ChevronRight, User, Calendar } from "lucide-react";

interface DepartmentStatus {
    department: {
        _id: string;
        name: string;
    } | string;
    status: string;
    whenAssigned?: string;
    startedAt?: string;
    pausedAt?: string;
    completedAt?: string;
    operator?: {
        _id: string;
        name: string;
    } | string;
    notes?: string;
}

interface DepartmentApprovalTimelineProps {
    departmentStatuses?: DepartmentStatus[];
    currentDepartmentIndex?: number;
}

export const DepartmentApprovalTimeline: React.FC<DepartmentApprovalTimelineProps> = ({
    departmentStatuses,
    currentDepartmentIndex = 0,
}) => {
    if (!departmentStatuses || departmentStatuses.length === 0) {
        return null;
    }

    // Helper to extract department info
    const getDepartmentInfo = (dept: DepartmentStatus["department"]) => {
        if (typeof dept === "string") {
            return { _id: dept, name: "Unknown Department" };
        }
        return dept;
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "completed":
                return "text-green-600 bg-green-50 border-green-200";
            case "in_progress":
                return "text-blue-600 bg-blue-50 border-blue-200";
            case "paused":
                return "text-yellow-600 bg-yellow-50 border-yellow-200";
            case "pending":
                return "text-slate-400 bg-slate-50 border-slate-200";
            default:
                return "text-slate-400 bg-slate-50 border-slate-200";
        }
    };

    const getStatusIcon = (status: string, isActive: boolean) => {
        switch (status) {
            case "completed":
                return <CheckCircle className="w-5 h-5 text-green-600" />;
            case "in_progress":
                return <Loader className="w-5 h-5 text-blue-600 animate-spin" />;
            case "paused":
                return <Clock className="w-5 h-5 text-yellow-600" />;
            case "pending":
                return isActive ? (
                    <Circle className="w-5 h-5 text-sky-600 fill-sky-100" />
                ) : (
                    <Circle className="w-5 h-5 text-slate-300" />
                );
            default:
                return <Circle className="w-5 h-5 text-slate-300" />;
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case "completed":
                return "Completed";
            case "in_progress":
                return "In Progress";
            case "paused":
                return "Paused";
            case "pending":
                return "Pending";
            default:
                return status;
        }
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return null;
        const date = new Date(dateString);
        return date.toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    return (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <ChevronRight className="w-5 h-5 text-sky-600" />
                Production Workflow
            </h3>

            <div className="space-y-4">
                {departmentStatuses.map((dept, index) => {
                    const isActive = index === currentDepartmentIndex;
                    const statusColor = getStatusColor(dept.status);
                    const departmentInfo = getDepartmentInfo(dept.department);

                    return (
                        <div key={departmentInfo._id} className="relative">
                            {/* Connector Line */}
                            {index < departmentStatuses.length - 1 && (
                                <div
                                    className={`absolute left-[23px] top-12 bottom-[-16px] w-0.5 ${dept.status === "completed"
                                        ? "bg-green-300"
                                        : "bg-slate-200"
                                        }`}
                                />
                            )}

                            {/* Department Card */}
                            <div
                                className={`relative flex items-start gap-4 p-4 rounded-lg border-2 transition-all ${isActive && dept.status !== "completed"
                                    ? "border-sky-400 bg-sky-50/50 shadow-md"
                                    : `border-transparent ${statusColor}`
                                    }`}
                            >
                                {/* Status Icon */}
                                <div className="flex-shrink-0 mt-0.5">
                                    {getStatusIcon(dept.status, isActive)}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1">
                                            <h4 className="font-semibold text-slate-800 text-sm">
                                                {index + 1}. {departmentInfo.name}
                                            </h4>
                                            <p className={`text-xs font-medium mt-1 ${dept.status === "completed"
                                                ? "text-green-600"
                                                : dept.status === "in_progress"
                                                    ? "text-blue-600"
                                                    : dept.status === "paused"
                                                        ? "text-yellow-600"
                                                        : "text-slate-500"
                                                }`}>
                                                {getStatusLabel(dept.status)}
                                            </p>
                                        </div>

                                        {/* Timestamps */}
                                        <div className="flex-shrink-0 text-right">
                                            {dept.completedAt && (
                                                <div className="flex items-center gap-1.5 text-xs text-green-600">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    <span>{formatDate(dept.completedAt)}</span>
                                                </div>
                                            )}
                                            {!dept.completedAt && dept.startedAt && (
                                                <div className="flex items-center gap-1.5 text-xs text-blue-600">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    <span>Started {formatDate(dept.startedAt)}</span>
                                                </div>
                                            )}
                                            {!dept.startedAt && dept.whenAssigned && (
                                                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    <span>Assigned {formatDate(dept.whenAssigned)}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Operator */}
                                    {dept.operator && (
                                        <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-600">
                                            <User className="w-3.5 h-3.5" />
                                            <span>
                                                {typeof dept.operator === "object"
                                                    ? dept.operator.name
                                                    : dept.operator}
                                            </span>
                                        </div>
                                    )}

                                    {/* Notes */}
                                    {dept.notes && (
                                        <p className="mt-2 text-xs text-slate-600 bg-white p-2 rounded border border-slate-200">
                                            {dept.notes}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Summary */}
            <div className="mt-6 pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">
                        Progress: {departmentStatuses.filter((d) => d.status === "completed").length} of{" "}
                        {departmentStatuses.length} departments completed
                    </span>
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-32 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-500"
                                style={{
                                    width: `${(departmentStatuses.filter((d) => d.status === "completed").length /
                                        departmentStatuses.length) *
                                        100
                                        }%`,
                                }}
                            />
                        </div>
                        <span className="text-xs font-semibold text-slate-700">
                            {Math.round(
                                (departmentStatuses.filter((d) => d.status === "completed").length /
                                    departmentStatuses.length) *
                                100
                            )}
                            %
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};
