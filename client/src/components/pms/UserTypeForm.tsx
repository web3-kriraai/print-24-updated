import React from 'react';
import { UserType } from '../../types/pms.types';

interface UserTypeFormProps {
    userType?: UserType | null;
    onSubmit: (data: Partial<UserType>) => void;
    onCancel: () => void;
}

export const UserTypeForm: React.FC<UserTypeFormProps> = ({
    userType,
    onSubmit,
    onCancel,
}) => {
    const [formData, setFormData] = React.useState<Partial<UserType>>(
        userType || {
            name: '',
            code: '',
            displayName: '',
            description: '',
            pricingTier: 1,
            parentType: '',
            inheritFromParent: true,
            privilegeBundleIds: [],
            permissions: [],
            limits: {},
            territoryRestrictions: [],
            productCategoryRestrictions: [],
            autoApproveSignup: false,
            maxUsersAllowed: null,
            isActive: true,
        }
    );

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Name *
                    </label>
                    <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Code *
                    </label>
                    <input
                        type="text"
                        required
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Display Name
                </label>
                <input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                </label>
                <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pricing Tier
                </label>
                <input
                    type="number"
                    min="1"
                    value={formData.pricingTier}
                    onChange={(e) =>
                        setFormData({ ...formData, pricingTier: parseInt(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
            </div>

            <div className="flex items-center gap-4">
                <label className="flex items-center">
                    <input
                        type="checkbox"
                        checked={formData.inheritFromParent}
                        onChange={(e) =>
                            setFormData({ ...formData, inheritFromParent: e.target.checked })
                        }
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-900">Inherit from parent</span>
                </label>

                <label className="flex items-center">
                    <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-900">Active</span>
                </label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    {userType ? 'Update' : 'Create'}
                </button>
            </div>
        </form>
    );
};
