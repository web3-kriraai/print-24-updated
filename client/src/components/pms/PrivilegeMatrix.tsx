import React, { useState, useEffect } from 'react';
import { resourceApi } from '../../services/pmsApi';
import { ResourceRegistry, Permission } from '../../types/pms.types';

interface PrivilegeMatrixProps {
    selectedPrivileges: Permission[];
    onChange: (privileges: Permission[]) => void;
}

export const PrivilegeMatrix: React.FC<PrivilegeMatrixProps> = ({
    selectedPrivileges,
    onChange,
}) => {
    const [resources, setResources] = useState<ResourceRegistry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchResources = async () => {
            try {
                const response = await resourceApi.list();
                setResources(response.data.data);
            } catch (error) {
                console.error('Error fetching resources:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchResources();
    }, []);

    const isSelected = (resource: string, action: string): boolean => {
        const priv = selectedPrivileges.find(p => p.resource === resource);
        return priv?.actions.includes(action) || false;
    };

    const togglePrivilege = (resource: string, action: string) => {
        const updatedPrivileges = [...selectedPrivileges];
        const existingIndex = updatedPrivileges.findIndex(p => p.resource === resource);

        if (existingIndex >= 0) {
            const existingPriv = updatedPrivileges[existingIndex];
            const actionIndex = existingPriv.actions.indexOf(action);

            if (actionIndex >= 0) {
                // Remove action
                existingPriv.actions.splice(actionIndex, 1);
                if (existingPriv.actions.length === 0) {
                    // Remove privilege entirely if no actions left
                    updatedPrivileges.splice(existingIndex, 1);
                }
            } else {
                // Add action
                existingPriv.actions.push(action);
            }
        } else {
            // Add new privilege
            updatedPrivileges.push({ resource, actions: [action] });
        }

        onChange(updatedPrivileges);
    };

    if (loading) {
        return <div className="text-center py-8">Loading resources...</div>;
    }

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Resource
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" colSpan={5}>
                            Actions
                        </th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {resources.map((resource) => (
                        <tr key={resource.resource}>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                    {resource.displayName}
                                </div>
                                <div className="text-sm text-gray-500">{resource.resource}</div>
                            </td>
                            <td className="px-6 py-4 text-center" colSpan={5}>
                                <div className="flex justify-center gap-4">
                                    {resource.actions.map((action) => (
                                        <label key={action} className="inline-flex items-center">
                                            <input
                                                type="checkbox"
                                                className="form-checkbox h-5 w-5 text-blue-600"
                                                checked={isSelected(resource.resource, action)}
                                                onChange={() => togglePrivilege(resource.resource, action)}
                                            />
                                            <span className="ml-2 text-sm text-gray-700 capitalize">{action}</span>
                                        </label>
                                    ))}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
