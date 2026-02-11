import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Plus, Trash2, Save, X, Edit2, Check, 
  ChevronDown, ChevronUp, Copy, Settings, FileText, 
  Type, Mail, Phone, Hash, Calendar, Upload, List, 
  CheckSquare, Link, Shield, AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import DynamicFormRenderer from '../../DynamicFormRenderer';

const DEFAULT_FIELDS: FormField[] = [
  {
    fieldId: 'full_name',
    label: 'Full Name',
    fieldType: 'text',
    order: 0,
    placeholder: 'Enter your full name',
    validation: { required: true }
  },
  {
    fieldId: 'email',
    label: 'Email Address',
    fieldType: 'email',
    order: 1,
    placeholder: 'you@example.com',
    validation: { required: true }
  },
  {
    fieldId: 'password',
    label: 'Password',
    fieldType: 'password',
    order: 2,
    placeholder: 'Create a password',
    validation: { required: true, minLength: 8 }
  },
  {
    fieldId: 'confirmPassword',
    label: 'Confirm Password',
    fieldType: 'password',
    order: 3,
    placeholder: 'Confirm your password',
    validation: { required: true }
  }
];

interface FormField {
  fieldId: string;
  label: string;
  fieldType: 'text' | 'textarea' | 'email' | 'phone' | 'number' | 'date' | 'select' | 'radio' | 'checkbox' | 'file' | 'url' | 'password';
  placeholder?: string;
  helpText?: string;
  validation?: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: string;
    customErrorMessage?: string;
  };
  options?: Array<{ label: string; value: string }>;
  fileSettings?: {
    acceptedTypes?: string[];
    maxSizeBytes?: number;
    multiple?: boolean;
  };
  order: number;
}

interface SignupForm {
  _id: string;
  name: string;
  code: string;
  description?: string;
  instructions?: string;
  fields: FormField[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const FormBuilder = () => {
  const [forms, setForms] = useState<SignupForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedForm, setSelectedForm] = useState<SignupForm | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Form Editor State
  const [formData, setFormData] = useState<Partial<SignupForm>>({
    name: '',
    code: '',
    description: '',
    instructions: '',
    fields: [],
    isActive: true
  });

  const [activeTab, setActiveTab] = useState<'settings' | 'fields' | 'preview'>('settings');
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);

  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/admin/forms', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setForms(response.data.forms);
      }
    } catch (error) {
      console.error('Error fetching forms:', error);
      toast.error('Failed to load forms');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    setSelectedForm(null);
    setFormData({
      name: '',
      code: '',
      description: '',
      instructions: '',
      fields: [...DEFAULT_FIELDS],
      isActive: true
    });
    setIsEditing(true);
    setActiveTab('settings');
  };

  const handleEdit = (form: SignupForm) => {
    setSelectedForm(form);
    setFormData({ ...form });
    setIsEditing(true);
    setActiveTab('fields');
  };

  const handleDelete = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/admin/forms/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Form deleted successfully');
      setForms(forms.filter(f => f._id !== id));
      setShowDeleteConfirm(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete form');
    }
  };

  const isDefaultField = (fieldId: string) => {
    return DEFAULT_FIELDS.some(f => f.fieldId === fieldId);
  };

  const handleDuplicate = async (id: string) => {
    try {
      const formToDuplicate = forms.find(f => f._id === id);
      if (!formToDuplicate) return;

      const newCode = `${formToDuplicate.code}_COPY_${Date.now().toString().slice(-4)}`;
      
      const token = localStorage.getItem('token');
      const response = await axios.post(`/api/admin/forms/${id}/duplicate`, {
        name: `${formToDuplicate.name} (Copy)`,
        code: newCode
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        toast.success('Form duplicated successfully');
        fetchForms();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to duplicate form');
    }
  };

  const handleSaveForm = async () => {
    try {
      if (!formData.name || !formData.code) {
        toast.error('Name and Code are required');
        return;
      }

      const payload = {
        ...formData,
        code: formData.code.toUpperCase().replace(/\s+/g, '_')
      };

      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      if (selectedForm) {
        // Update existing
        const response = await axios.put(`/api/admin/forms/${selectedForm._id}`, payload, config);
        if (response.data.success) {
          toast.success('Form updated successfully');
          setForms(forms.map(f => f._id === selectedForm._id ? response.data.form : f));
          setIsEditing(false);
        }
      } else {
        // Create new
        const response = await axios.post('/api/admin/forms', payload, config);
        if (response.data.success) {
          toast.success('Form created successfully');
          setForms([response.data.form, ...forms]);
          setIsEditing(false);
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save form');
    }
  };

  const addField = (type: FormField['fieldType']) => {
    const newField: FormField = {
      fieldId: `field_${Date.now()}`,
      label: 'New Field',
      fieldType: type,
      order: (formData.fields?.length || 0),
      validation: { required: false }
    };

    // Add default options for select/radio
    if (['select', 'radio'].includes(type)) {
      newField.options = [
        { label: 'Option 1', value: 'option1' },
        { label: 'Option 2', value: 'option2' }
      ];
    }

    setFormData({
      ...formData,
      fields: [...(formData.fields || []), newField]
    });
    setEditingFieldId(newField.fieldId);
  };

  const updateField = (index: number, updates: Partial<FormField>) => {
    const updatedFields = [...(formData.fields || [])];
    const field = updatedFields[index];
    
    // Prevent changing critical properties of default fields
    if (isDefaultField(field.fieldId)) {
      delete updates.fieldId;
      delete updates.fieldType;
      // Allow updating label, placeholder, validation
    }
    
    updatedFields[index] = { ...updatedFields[index], ...updates };
    setFormData({ ...formData, fields: updatedFields });
  };

  const removeField = (index: number) => {
    const updatedFields = [...(formData.fields || [])];
    const field = updatedFields[index];

    if (isDefaultField(field.fieldId)) {
      toast.error('Cannot remove default system fields');
      return;
    }

    updatedFields.splice(index, 1);
    setFormData({ ...formData, fields: updatedFields });
    if (editingFieldId === updatedFields[index]?.fieldId) {
      setEditingFieldId(null);
    }
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    const fields = [...(formData.fields || [])];
    if (direction === 'up' && index > 0) {
      [fields[index], fields[index - 1]] = [fields[index - 1], fields[index]];
    } else if (direction === 'down' && index < fields.length - 1) {
      [fields[index], fields[index + 1]] = [fields[index + 1], fields[index]];
    }
    
    // Update order property
    const updatedFields = fields.map((field, idx) => ({
      ...field,
      order: idx
    }));
    
    setFormData({ ...formData, fields: updatedFields });
  };

  if (loading && !forms.length) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 min-h-[600px]">
      {!isEditing ? (
        // List View
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Signup Forms</h2>
              <p className="text-sm text-gray-500 mt-1">Create and manage dynamic signup forms for user segments</p>
            </div>
            <button
              onClick={handleCreateNew}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={18} />
              Create Form
            </button>
          </div>

          <div className="grid gap-4">
            {forms.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-900">No forms yet</h3>
                <p className="text-gray-500 mt-1 max-w-sm mx-auto">
                  Create your first signup form to start collecting user information.
                </p>
                <button
                  onClick={handleCreateNew}
                  className="mt-4 px-4 py-2 text-blue-600 font-medium hover:bg-blue-50 rounded-lg transition-colors"
                >
                  Create New Form
                </button>
              </div>
            ) : (
              forms.map(form => (
                <div key={form._id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${form.isActive ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                      <FileText size={24} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">{form.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-xs">{form.code}</span>
                        <span>•</span>
                        <span>{form.fields.length} fields</span>
                        <span>•</span>
                        <span className={form.isActive ? 'text-green-600' : 'text-gray-400'}>
                          {form.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDuplicate(form._id)}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Duplicate"
                    >
                      <Copy size={18} />
                    </button>
                    <button
                      onClick={() => handleEdit(form)}
                      className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 size={18} />
                    </button>
                    {showDeleteConfirm === form._id ? (
                      <div className="flex items-center gap-2 bg-red-50 p-1 rounded-lg animate-fadeIn">
                        <button
                          onClick={() => handleDelete(form._id)}
                          className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(null)}
                          className="p-1 text-gray-500 hover:text-gray-700"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowDeleteConfirm(form._id)}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        // Editor View
        <div className="flex flex-col h-[calc(100vh-200px)]">
          {/* Editor Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsEditing(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
              <div>
                <h2 className="text-lg font-bold text-gray-800">
                  {selectedForm ? 'Edit Form' : 'New Form'}
                </h2>
                <p className="text-xs text-gray-500">
                  {formData.name || 'Untitled Form'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                    activeTab === 'settings' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Settings
                </button>
                <button
                  onClick={() => setActiveTab('fields')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                    activeTab === 'fields' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Fields ({formData.fields?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab('preview')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                    activeTab === 'preview' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Preview
                </button>
              </div>
              <button
                onClick={handleSaveForm}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
              >
                <Save size={18} />
                Save Form
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden flex">
            {activeTab === 'settings' && (
              <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-2xl mx-auto space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Form Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g. Retail Customer Signup"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unique Code (Uppercase)</label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                      placeholder="e.g. RETAIL_SIGNUP"
                    />
                    <p className="text-xs text-gray-500 mt-1">Used to identify this form in the system API</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={3}
                      placeholder="Internal description for admins"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Instructions for Users</label>
                    <textarea
                      value={formData.instructions}
                      onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={3}
                      placeholder="Displayed at the top of the form"
                    />
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <div>
                      <label htmlFor="isActive" className="font-medium text-gray-700">Form is Active</label>
                      <p className="text-xs text-gray-500">Inactive forms cannot be used for signups</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'fields' && (
              <div className="flex w-full h-full">
                {/* Field Toolbox */}
                <div className="w-64 bg-gray-50 border-r border-gray-200 p-4 overflow-y-auto">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Add Fields</h3>
                  <div className="grid gap-2">
                    {[
                      { type: 'text', label: 'Text Input', icon: Type },
                      { type: 'email', label: 'Email', icon: Mail },
                      { type: 'phone', label: 'Phone', icon: Phone },
                      { type: 'password', label: 'Password', icon: Shield },
                      { type: 'textarea', label: 'Text Area', icon: FileText },
                      { type: 'select', label: 'Dropdown', icon: List },
                      { type: 'file', label: 'File Upload', icon: Upload },
                      { type: 'date', label: 'Date', icon: Calendar },
                      { type: 'radio', label: 'Radio Group', icon: List },
                      { type: 'checkbox', label: 'Checkbox', icon: CheckSquare },
                      { type: 'url', label: 'Website URL', icon: Link },
                      { type: 'number', label: 'Number', icon: Hash },
                    ].map((item) => (
                      <button
                        key={item.type}
                        onClick={() => addField(item.type as any)}
                        className="flex items-center gap-3 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:border-blue-400 hover:shadow-sm transition-all text-left group"
                      >
                        <item.icon size={16} className="text-gray-400 group-hover:text-blue-500" />
                        <span className="text-sm font-medium text-gray-700">{item.label}</span>
                        <Plus size={14} className="ml-auto text-gray-300 group-hover:text-blue-500 opacity-0 group-hover:opacity-100" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Field List & Editor */}
                <div className="flex-1 flex flex-col bg-gray-100">
                  <div className="flex-1 overflow-y-auto p-6">
                    <div className="max-w-3xl mx-auto space-y-3">
                      {(formData.fields || []).map((field, index) => (
                        <div
                          key={field.fieldId}
                          className={`bg-white rounded-lg border transition-all ${
                            editingFieldId === field.fieldId ? 'border-blue-500 ring-1 ring-blue-500 shadow-md' : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {/* Field Header / Summary */}
                          <div 
                            className="flex items-center gap-3 p-3 cursor-pointer"
                            onClick={() => setEditingFieldId(field.fieldId === editingFieldId ? null : field.fieldId)}
                          >
                            <div className="flex flex-col gap-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); moveField(index, 'up'); }}
                                disabled={index === 0}
                                className="text-gray-400 hover:text-blue-600 disabled:opacity-30 disabled:hover:text-gray-400"
                              >
                                <ChevronUp size={14} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); moveField(index, 'down'); }}
                                disabled={index === (formData.fields?.length || 0) - 1}
                                className="text-gray-400 hover:text-blue-600 disabled:opacity-30 disabled:hover:text-gray-400"
                              >
                                <ChevronDown size={14} />
                              </button>
                            </div>
                            
                            <div className={`flex items-center justify-center w-8 h-8 rounded ${isDefaultField(field.fieldId) ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                              {field.fieldType === 'email' ? <Mail size={16} /> :
                               field.fieldType === 'text' ? <Type size={16} /> :
                               field.fieldType === 'file' ? <Upload size={16} /> :
                               field.fieldType === 'password' ? <Shield size={16} /> :
                               <Settings size={16} />}
                            </div>

                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-gray-800 truncate">
                                {field.label}
                                {isDefaultField(field.fieldId) && <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Default</span>}
                              </h4>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span className="uppercase">{field.fieldType}</span>
                                {field.validation?.required && <span className="text-red-500 font-medium">• Required</span>}
                                <span className="text-gray-300">|</span>
                                <span className="font-mono">{field.fieldId}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              {isDefaultField(field.fieldId) ? (
                                <div className="p-2 text-gray-300 cursor-not-allowed" title="Default fields cannot be removed">
                                  <Shield size={16} />
                                </div>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeField(index);
                                  }}
                                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                              <button
                                className={`p-2 transition-transform ${editingFieldId === field.fieldId ? 'rotate-180 text-blue-500' : 'text-gray-400'}`}
                              >
                                <ChevronDown size={16} />
                              </button>
                            </div>
                          </div>

                          {/* Expanded Field Editor */}
                          {editingFieldId === field.fieldId && (
                            <div className="p-4 border-t border-gray-100 bg-gray-50/50 rounded-b-lg">
                              <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2 sm:col-span-1">
                                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Label</label>
                                  <input
                                    type="text"
                                    value={field.label}
                                    onChange={(e) => updateField(index, { label: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                  />
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Field ID</label>
                                  <input
                                    type="text"
                                    value={field.fieldId}
                                    onChange={(e) => updateField(index, { fieldId: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') })}
                                    className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${isDefaultField(field.fieldId) ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                                    disabled={isDefaultField(field.fieldId)}
                                  />
                                </div>

                                <div className="col-span-2">
                                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Placeholder</label>
                                  <input
                                    type="text"
                                    value={field.placeholder || ''}
                                    onChange={(e) => updateField(index, { placeholder: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                  />
                                </div>

                                <div className="col-span-2">

                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={field.validation?.required || false}
                                      onChange={(e) => updateField(index, { 
                                        validation: { ...field.validation, required: e.target.checked } 
                                      })}
                                      disabled={isDefaultField(field.fieldId)}
                                      className={`w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 ${isDefaultField(field.fieldId) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    />
                                    <span className="text-sm font-medium text-gray-700">Required Field {isDefaultField(field.fieldId) && '(Default fields must be required)'}</span>
                                  </label>
                                </div>

                                {/* Options Editor for Select/Radio */}
                                {['select', 'radio'].includes(field.fieldType) && (
                                  <div className="col-span-2 mt-2">
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Options</label>
                                    <div className="space-y-2">
                                      {(field.options || []).map((option, optIndex) => (
                                        <div key={optIndex} className="flex gap-2">
                                          <input
                                            type="text"
                                            placeholder="Label"
                                            value={option.label}
                                            onChange={(e) => {
                                              const newOptions = [...(field.options || [])];
                                              newOptions[optIndex].label = e.target.value;
                                              newOptions[optIndex].value = e.target.value.toLowerCase().replace(/\s+/g, '_');
                                              updateField(index, { options: newOptions });
                                            }}
                                            className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                                          />
                                          <button
                                            onClick={() => {
                                              const newOptions = [...(field.options || [])];
                                              newOptions.splice(optIndex, 1);
                                              updateField(index, { options: newOptions });
                                            }}
                                            className="p-1.5 text-red-400 hover:text-red-500 hover:bg-red-50 rounded"
                                          >
                                            <Trash2 size={16} />
                                          </button>
                                        </div>
                                      ))}
                                      <button
                                        onClick={() => {
                                          const newOptions = [...(field.options || []), { label: 'New Option', value: 'new_option' }];
                                          updateField(index, { options: newOptions });
                                        }}
                                        className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 mt-1"
                                      >
                                        <Plus size={12} /> Add Option
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {/* File Settings */}
                                {field.fieldType === 'file' && (
                                  <div className="col-span-2 mt-2 space-y-3">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={field.fileSettings?.multiple || false}
                                        onChange={(e) => updateField(index, { 
                                          fileSettings: { ...field.fileSettings, multiple: e.target.checked } 
                                        })}
                                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                      />
                                      <span className="text-sm font-medium text-gray-700">Allow Multiple Files</span>
                                    </label>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}

                      {(formData.fields || []).length === 0 && (
                        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                          <p className="text-gray-500">Drag fields from the toolbox on the left to add them here</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'preview' && (
              <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                <div className="max-w-xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="mb-6 pb-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-800">{formData.name || 'Form Preview'}</h2>
                    {formData.instructions && (
                      <p className="text-gray-600 mt-2 text-sm">{formData.instructions}</p>
                    )}
                  </div>
                  
                  <DynamicFormRenderer
                    formSchema={formData as any}
                    userSegmentCode={formData.code || 'PREVIEW'}
                    onSuccess={(data) => toast.success('Form submitted successfully (Preview Mode)')}
                    onError={(err) => toast.error(err)}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FormBuilder;
