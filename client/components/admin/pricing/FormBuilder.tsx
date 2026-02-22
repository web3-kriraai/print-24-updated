import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface FormField {
  fieldId: string;
  label: string;
  fieldType: string;
  placeholder?: string;
  helpText?: string;
  validation?: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    customErrorMessage?: string;
  };
  options?: Array<{ label: string; value: string }>;
  order: number;
  isSystemField?: boolean; // Protected fields that cannot be removed
}

interface SignupForm {
  _id?: string;
  name: string;
  code: string;
  description?: string;
  instructions?: string;
  fields: FormField[];
  submissionSettings?: {
    successMessage?: string;
    notifyAdmin?: boolean;
    notifyApplicant?: boolean;
  };
  isActive: boolean;
}

const FormBuilder: React.FC = () => {
  const [forms, setForms] = useState<SignupForm[]>([]);
  const [selectedForm, setSelectedForm] = useState<SignupForm | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [formData, setFormData] = useState<SignupForm>({
    name: '',
    code: '',
    description: '',
    instructions: '',
    fields: [],
    submissionSettings: {
      successMessage: 'Your application has been submitted successfully!',
      notifyAdmin: true,
      notifyApplicant: true,
    },
    isActive: true,
  });

  // Field state
  const [fieldData, setFieldData] = useState<FormField>({
    fieldId: '',
    label: '',
    fieldType: 'text',
    placeholder: '',
    helpText: '',
    validation: {
      required: false,
    },
    options: [],
    order: 0,
  });

  const fieldTypes = [
    { value: 'text', label: 'Text' },
    { value: 'email', label: 'Email' },
    { value: 'password', label: 'Password' },
    { value: 'phone', label: 'Phone' },
    { value: 'number', label: 'Number' },
    { value: 'textarea', label: 'TextArea' },
    { value: 'select', label: 'Select' },
    { value: 'radio', label: 'Radio' },
    { value: 'checkbox', label: 'Checkbox' },
    { value: 'file', label: 'File Upload' },
    { value: 'date', label: 'Date' },
  ];

  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/admin/forms', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      setForms(response.data.forms || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch forms');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateForm = () => {
    setSelectedForm(null);
    setFormData({
      name: '',
      code: '',
      description: '',
      instructions: '',
      fields: [
        {
          fieldId: 'email',
          label: 'Email Address',
          fieldType: 'email',
          placeholder: 'Enter your email',
          helpText: '',
          validation: { required: true },
          options: [],
          order: 0,
          isSystemField: true, // Cannot be removed
        },
        {
          fieldId: 'password',
          label: 'Password',
          fieldType: 'password',
          placeholder: 'Enter your password',
          helpText: 'Minimum 8 characters, must include uppercase, lowercase, number, and special character',
          validation: { 
            required: true, 
            minLength: 8,
            pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$',
            customErrorMessage: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character'
          },
          options: [],
          order: 1,
          isSystemField: true, // Cannot be removed
        },
        {
          fieldId: 'confirmPassword',
          label: 'Confirm Password',
          fieldType: 'password',
          placeholder: 'Re-enter your password',
          helpText: 'Must match the password above',
          validation: { required: true },
          options: [],
          order: 2,
          isSystemField: true, // Cannot be removed
        },
      ],
      submissionSettings: {
        successMessage: 'Your application has been submitted successfully!',
        notifyAdmin: true,
        notifyApplicant: true,
      },
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleEditForm = (form: SignupForm) => {
    setSelectedForm(form);
    setFormData(form);
    setIsModalOpen(true);
  };

  const handleSaveForm = async () => {
    try {
      setLoading(true);
      setError('');

      if (selectedForm) {
        // Update existing form
        await axios.put(`/api/admin/forms/${selectedForm._id}`, formData, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
      } else {
        // Create new form
        await axios.post('/api/admin/forms', formData, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
      }

      await fetchForms();
      setIsModalOpen(false);
      setSelectedForm(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save form');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteForm = async (formId: string) => {
    if (!confirm('Are you sure you want to delete this form?')) return;

    try {
      setLoading(true);
      await axios.delete(`/api/admin/forms/${formId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      await fetchForms();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete form');
    } finally {
      setLoading(false);
    }
  };

  const handleAddField = () => {
    setFieldData({
      fieldId: '',
      label: '',
      fieldType: 'text',
      placeholder: '',
      helpText: '',
      validation: { required: false },
      options: [],
      order: formData.fields.length,
    });
    setIsFieldModalOpen(true);
  };

  const handleSaveField = () => {
    if (!fieldData.fieldId || !fieldData.label) {
      alert('Field ID and Label are required');
      return;
    }

    const updatedFields = [...formData.fields, fieldData];
    setFormData({ ...formData, fields: updatedFields });
    setIsFieldModalOpen(false);
  };

  const handleRemoveField = (index: number) => {
    const field = formData.fields[index];
    
    // Prevent removal of system fields
    if (field.isSystemField) {
      alert('This is a required system field and cannot be removed.');
      return;
    }
    
    const updatedFields = formData.fields.filter((_, i) => i !== index);
    setFormData({ ...formData, fields: updatedFields });
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Form Builder</h1>
            <p className="text-gray-600 mt-1">Create and manage signup forms</p>
          </div>
          <button
            onClick={handleCreateForm}
            className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition"
          >
            + New Form
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Forms List */}
        {loading && forms.length === 0 ? (
          <div className="text-center py-12">Loading...</div>
        ) : forms.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No forms yet. Create your first form!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {forms.map((form) => (
              <div
                key={form._id}
                className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900">{form.name}</h3>
                    <p className="text-sm text-gray-500 font-mono mt-1">{form.code}</p>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      form.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {form.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {form.description || 'No description'}
                </p>

                <div className="text-sm text-gray-500 mb-4">
                  {form.fields.length} field{form.fields.length !== 1 ? 's' : ''}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditForm(form)}
                    className="flex-1 bg-purple-100 text-purple-700 px-4 py-2 rounded hover:bg-purple-200 transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteForm(form._id!)}
                    className="px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Form Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b sticky top-0 bg-white z-10">
                <h2 className="text-2xl font-bold">
                  {selectedForm ? 'Edit Form' : 'Create New Form'}
                </h2>
              </div>

              <div className="p-6 space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Form Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder="e.g., Premium Membership Form"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Form Code *
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) =>
                        setFormData({ ...formData, code: e.target.value.toUpperCase() })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder="e.g., VIP_FORM"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                    rows={2}
                    placeholder="Internal description for admins"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Instructions (shown to users)
                  </label>
                  <textarea
                    value={formData.instructions}
                    onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                    rows={2}
                    placeholder="Instructions displayed to users"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="mr-2"
                  />
                  <label className="text-sm font-medium text-gray-700">Active</label>
                </div>

                {/* Fields Section */}
                <div className="border-t pt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Form Fields</h3>
                    <button
                      onClick={handleAddField}
                      className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition text-sm"
                    >
                      + Add Field
                    </button>
                  </div>

                  {formData.fields.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No fields yet. Add your first field!</p>
                  ) : (
                    <div className="space-y-3">
                      {formData.fields.map((field, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{field.label}</div>
                            <div className="text-sm text-gray-500">
                              ID: {field.fieldId} | Type: {field.fieldType}
                              {field.validation?.required && ' | Required'}
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveField(index)}
                            className="text-red-600 hover:text-red-800 ml-4"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Success Message */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Success Message
                  </label>
                  <input
                    type="text"
                    value={formData.submissionSettings?.successMessage}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        submissionSettings: {
                          ...formData.submissionSettings,
                          successMessage: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="p-6 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2 border rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveForm}
                  disabled={loading}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Form'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Field Modal */}
        {isFieldModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b">
                <h3 className="text-xl font-bold">Add Form Field</h3>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Field ID *
                    </label>
                    <input
                      type="text"
                      value={fieldData.fieldId}
                      onChange={(e) => setFieldData({ ...fieldData, fieldId: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder="e.g., companyName"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Field Type *
                    </label>
                    <select
                      value={fieldData.fieldType}
                      onChange={(e) => setFieldData({ ...fieldData, fieldType: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                    >
                      {fieldTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Label *
                  </label>
                  <input
                    type="text"
                    value={fieldData.label}
                    onChange={(e) => setFieldData({ ...fieldData, label: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="e.g., Company Name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Placeholder
                  </label>
                  <input
                    type="text"
                    value={fieldData.placeholder}
                    onChange={(e) => setFieldData({ ...fieldData, placeholder: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="e.g., Enter your company name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Help Text
                  </label>
                  <input
                    type="text"
                    value={fieldData.helpText}
                    onChange={(e) => setFieldData({ ...fieldData, helpText: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="Additional help text"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={fieldData.validation?.required}
                    onChange={(e) =>
                      setFieldData({
                        ...fieldData,
                        validation: { ...fieldData.validation, required: e.target.checked },
                      })
                    }
                    className="mr-2"
                  />
                  <label className="text-sm font-medium text-gray-700">Required Field</label>
                </div>
              </div>

              <div className="p-6 border-t flex justify-end gap-3">
                <button
                  onClick={() => setIsFieldModalOpen(false)}
                  className="px-6 py-2 border rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveField}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  Add Field
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FormBuilder;
